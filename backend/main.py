import base64
import hashlib
import hmac
import json
import os
import sys
import tempfile
from datetime import datetime
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

app = FastAPI(title="VitalAI API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHOL_NEUTRAL_DEFAULT = 200
RESTECG_TO_SLOPE = {0: 2, 1: 1, 2: 0}
security = HTTPBearer(auto_error=False)
TOKEN_SECRET = os.getenv("VITALAI_TOKEN_SECRET", "vitalai-demo-secret-change-me")


def is_writable_dir(path: str) -> bool:
    try:
        os.makedirs(path, exist_ok=True)
        probe = os.path.join(path, ".write_test")
        with open(probe, "w", encoding="utf-8") as f:
            f.write("ok")
        os.remove(probe)
        return True
    except OSError:
        return False


def resolve_data_dir() -> str:
    candidates = [
        os.getenv("VITALAI_DATA_DIR"),
        os.path.join(BASE_DIR, "..", "data"),
        os.path.join(tempfile.gettempdir(), "vitalai-data"),
    ]
    for candidate in candidates:
        if candidate and is_writable_dir(candidate):
            return candidate
    return os.path.join(tempfile.gettempdir(), "vitalai-data")


DATA_DIR = resolve_data_dir()
USERS_FILE = os.path.join(DATA_DIR, "users.json")


def hash_pw(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def load_users():
    if not os.path.exists(USERS_FILE):
        initial = {"admin": {"password": hash_pw("admin123"), "name": "Admin", "history": []}}
        save_users(initial)
        return initial
    with open(USERS_FILE, encoding="utf-8") as f:
        return json.load(f)


def save_users(users):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2)


def make_token(username: str, name: str) -> str:
    payload = {"username": username, "name": name}
    body = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    signature = hmac.new(TOKEN_SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()
    return f"{body}.{signature}"


def parse_token(token: str) -> Optional[dict[str, str]]:
    try:
        body, signature = token.rsplit(".", 1)
    except ValueError:
        return None
    expected = hmac.new(TOKEN_SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        return None
    try:
        padded = body + "=" * (-len(body) % 4)
        return json.loads(base64.urlsafe_b64decode(padded.encode()).decode())
    except (ValueError, json.JSONDecodeError):
        return None


def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds:
        raise HTTPException(401, "Not authenticated")
    payload = parse_token(creds.credentials)
    if not payload or not payload.get("username"):
        raise HTTPException(401, "Invalid or expired token")
    return payload["username"]


def derive_st_slope(restecg: int) -> int:
    return RESTECG_TO_SLOPE.get(restecg, 1)


try:
    from predict import FEATURES, predict, predict_from_csv, predict_patient

    _models_loaded = True
except ImportError:
    _models_loaded = False
    FEATURES = ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"]


class RegisterIn(BaseModel):
    username: str
    password: str
    name: str


class LoginIn(BaseModel):
    username: str
    password: str


class DoctorPredictIn(BaseModel):
    age: float
    sex: float
    cp: float
    trestbps: float
    chol: float
    fbs: float
    restecg: float
    thalach: float
    exang: float
    oldpeak: float
    slope: float
    ca: float
    thal: float


class PQRSTIn(BaseModel):
    pr_interval: Optional[float] = None
    qrs_duration: Optional[float] = None
    qt_interval: Optional[float] = None


class PatientPredictIn(BaseModel):
    age: int
    sex: int
    cp: int
    exang: int
    fbs: int
    restecg: int
    trestbps: int
    diastolic: int
    resting_hr: int
    oldpeak: float
    chol_input: float
    spo2: float
    temperature: float
    pqrst: PQRSTIn


class BatchRowIn(BaseModel):
    data: list[dict]


@app.post("/auth/register")
def register(req: RegisterIn):
    users = load_users()
    if req.username in users:
        raise HTTPException(400, "Username already taken")
    if not all([req.name, req.username, req.password]):
        raise HTTPException(400, "Fill all fields")
    users[req.username] = {"password": hash_pw(req.password), "name": req.name, "history": []}
    save_users(users)
    return {"message": "Account created"}


@app.post("/auth/login")
def login(req: LoginIn):
    users = load_users()
    user = users.get(req.username)
    if not user or user["password"] != hash_pw(req.password):
        raise HTTPException(401, "Invalid username or password")
    token = make_token(req.username, user["name"])
    return {"token": token, "username": req.username, "name": user["name"]}


@app.post("/auth/logout")
def logout():
    return {"message": "Logged out"}


@app.get("/auth/me")
def me(username: str = Depends(get_current_user)):
    users = load_users()
    user = users.get(username, {})
    return {"username": username, "name": user.get("name", username)}


def save_record(username, inp, res, extra=None):
    users = load_users()
    if username not in users:
        return
    entry = {
        "timestamp": datetime.now().strftime("%d %b %Y, %I:%M %p"),
        "inputs": inp,
        "diagnosis": res["label"],
        "confidence": res["confidence"],
        "severity": res["severity"],
        "extra": extra or {},
    }
    users[username].setdefault("history", []).insert(0, entry)
    users[username]["history"] = users[username]["history"][:20]
    save_users(users)


@app.get("/history")
def get_history(username: str = Depends(get_current_user)):
    users = load_users()
    return {"history": users.get(username, {}).get("history", [])}


@app.delete("/history")
def clear_history(username: str = Depends(get_current_user)):
    users = load_users()
    if username in users:
        users[username]["history"] = []
        save_users(users)
    return {"message": "History cleared"}


@app.post("/predict/doctor")
def predict_doctor(req: DoctorPredictIn, username: str = Depends(get_current_user)):
    if not _models_loaded:
        raise HTTPException(503, "Models not loaded - place .pkl files in /model/")
    inp = req.model_dump()
    res = predict(inp)
    save_record(username, inp, res)
    return {"result": res, "inputs": inp}


@app.post("/predict/patient")
def predict_patient_route(req: PatientPredictIn, username: str = Depends(get_current_user)):
    if not _models_loaded:
        raise HTTPException(503, "Models not loaded - place .pkl files in /model/")

    est_max_hr = max(60, min(220, 220 - req.age))
    rr_calc = round(60000 / req.resting_hr) if req.resting_hr > 0 else 800
    chol_final = int(req.chol_input) if req.chol_input > 0 else CHOL_NEUTRAL_DEFAULT

    inp = {
        "Age": req.age,
        "Sex": req.sex,
        "ChestPainType": req.cp,
        "RestingBP": req.trestbps,
        "Cholesterol": chol_final,
        "FastingBS": req.fbs,
        "RestingECG": req.restecg,
        "MaxHR": est_max_hr,
        "ExerciseAngina": req.exang,
        "Oldpeak": float(req.oldpeak),
        "ST_Slope": derive_st_slope(req.restecg),
    }
    extra = {
        "diastolic": req.diastolic,
        "resting_hr": req.resting_hr,
        "est_max_hr": est_max_hr,
        "rr_interval": rr_calc,
        "spo2": req.spo2 if req.spo2 != 98 else None,
        "temperature": req.temperature if req.temperature != 36.8 else None,
        "chol_entered": req.chol_input > 0,
        "pqrst": {
            "pr_interval": req.pqrst.pr_interval if req.pqrst.pr_interval else None,
            "qrs_duration": req.pqrst.qrs_duration if req.pqrst.qrs_duration else None,
            "qt_interval": req.pqrst.qt_interval if req.pqrst.qt_interval else None,
        },
    }
    res = predict_patient(inp, chol_entered=req.chol_input > 0)

    pqrst = extra["pqrst"]
    adj = 0
    if pqrst.get("qt_interval") and pqrst["qt_interval"] > 440:
        adj += 5
    if pqrst.get("qrs_duration") and pqrst["qrs_duration"] > 120:
        adj += 3
    if pqrst.get("pr_interval") and pqrst["pr_interval"] > 200:
        adj += 2
    if adj > 0:
        if res["prediction"] == 1:
            nc = min(res["confidence"] + adj, 99.0)
        else:
            nc = max(res["confidence"] - adj, 1.0)
        res["confidence"] = round(nc, 1)
        res["all_proba"] = (
            [round(100 - nc, 1), round(nc, 1)]
            if res["prediction"] == 1
            else [round(nc, 1), round(100 - nc, 1)]
        )

    save_record(username, inp, res, extra)
    return {"result": res, "inputs": inp, "extra": extra}


@app.post("/predict/batch")
def predict_batch(req: BatchRowIn, username: str = Depends(get_current_user)):
    if not _models_loaded:
        raise HTTPException(503, "Models not loaded")
    import pandas as pd

    df = pd.DataFrame(req.data)
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w", encoding="utf-8") as f:
        df.to_csv(f, index=False)
        tmp_path = f.name
    results = predict_from_csv(tmp_path)
    os.remove(tmp_path)
    return {"results": results, "total": len(results)}


@app.get("/features")
def features():
    return {"features": FEATURES}


@app.get("/health")
def health_check():
    return {"status": "ok", "models_loaded": _models_loaded, "data_dir": DATA_DIR}
