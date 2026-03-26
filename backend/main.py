import sys, os, json, hashlib, secrets
from datetime import datetime
from typing import Optional, Any
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_DIR   = os.path.join(BASE_DIR, "..", "data")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
CHOL_NEUTRAL_DEFAULT = 200
RESTECG_TO_SLOPE = {0: 2, 1: 1, 2: 0}

_tokens: dict[str, str] = {}
security = HTTPBearer(auto_error=False)


def load_users():
    if not os.path.exists(USERS_FILE):
        d = {"admin": {"password": hash_pw("admin123"), "name": "Admin", "history": []}}
        save_users(d)
        return d
    with open(USERS_FILE) as f:
        return json.load(f)


def save_users(u):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(USERS_FILE, "w") as f:
        json.dump(u, f, indent=2)


def hash_pw(p: str) -> str:
    return hashlib.sha256(p.encode()).hexdigest()


def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds:
        raise HTTPException(401, "Not authenticated")
    username = _tokens.get(creds.credentials)
    if not username:
        raise HTTPException(401, "Invalid or expired token")
    return username


def derive_st_slope(restecg: int) -> int:
    return RESTECG_TO_SLOPE.get(restecg, 1)


try:
    from predict import predict, predict_patient, predict_from_csv, FEATURES
    _models_loaded = True
except ImportError:
    _models_loaded = False
    FEATURES = ["age","sex","cp","trestbps","chol","fbs","restecg","thalach","exang","oldpeak","slope","ca","thal"]


class RegisterIn(BaseModel):
    username: str
    password: str
    name: str


class LoginIn(BaseModel):
    username: str
    password: str


class DoctorPredictIn(BaseModel):
    age: float; sex: float; cp: float; trestbps: float; chol: float
    fbs: float; restecg: float; thalach: float; exang: float
    oldpeak: float; slope: float; ca: float; thal: float


class PQRSTIn(BaseModel):
    pr_interval: Optional[float] = None
    qrs_duration: Optional[float] = None
    qt_interval: Optional[float] = None


class PatientPredictIn(BaseModel):
    age: int; sex: int; cp: int; exang: int; fbs: int; restecg: int
    trestbps: int; diastolic: int; resting_hr: int
    oldpeak: float; chol_input: float
    spo2: float; temperature: float
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
    token = secrets.token_hex(32)
    _tokens[token] = req.username
    return {"token": token, "username": req.username, "name": user["name"]}


@app.post("/auth/logout")
def logout(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if creds and creds.credentials in _tokens:
        del _tokens[creds.credentials]
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
        "extra": extra or {}
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
        raise HTTPException(503, "Models not loaded — place .pkl files in /model/")
    inp = req.model_dump()
    res = predict(inp)
    save_record(username, inp, res)
    return {"result": res, "inputs": inp}


@app.post("/predict/patient")
def predict_patient_route(req: PatientPredictIn, username: str = Depends(get_current_user)):
    if not _models_loaded:
        raise HTTPException(503, "Models not loaded — place .pkl files in /model/")

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
        }
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
    import tempfile, pandas as pd

    df = pd.DataFrame(req.data)
    with tempfile.NamedTemporaryFile(suffix=".csv", delete=False, mode="w") as f:
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
    return {"status": "ok", "models_loaded": _models_loaded}
