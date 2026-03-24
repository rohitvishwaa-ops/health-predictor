from pathlib import Path

import joblib
import numpy as np
import pandas as pd

ROOT_DIR = Path(__file__).resolve().parent
MODEL_DIR = ROOT_DIR / "model"

# ── Load both models on startup ───────────────────────────────────────────────
# Doctor Mode — UCI dataset (13 features)
model_doctor = joblib.load(MODEL_DIR / "heart_model.pkl")
scaler_doctor = joblib.load(MODEL_DIR / "scaler.pkl")

# Patient Mode — fedesoriano dataset (11 features)
model_patient = joblib.load(MODEL_DIR / "heart_model_v2.pkl")
scaler_patient = joblib.load(MODEL_DIR / "scaler_v2.pkl")

# ── Feature definitions ───────────────────────────────────────────────────────

# Doctor Mode features (UCI) — 13 features
FEATURES_DOCTOR = [
    'age', 'sex', 'cp', 'trestbps', 'chol',
    'fbs', 'restecg', 'thalach', 'exang',
    'oldpeak', 'slope', 'ca', 'thal'
]

# Patient Mode features (fedesoriano) — 11 features
FEATURES_PATIENT = [
    'Age', 'Sex', 'ChestPainType', 'RestingBP', 'Cholesterol',
    'FastingBS', 'RestingECG', 'MaxHR', 'ExerciseAngina',
    'Oldpeak', 'ST_Slope'
]

# Human readable labels for both feature sets
FEATURE_LABELS_DOCTOR = {
    'age':      'Age (years)',
    'sex':      'Sex',
    'cp':       'Chest pain type',
    'trestbps': 'Resting blood pressure (mmHg)',
    'chol':     'Cholesterol (mg/dl)',
    'fbs':      'Fasting blood sugar >120',
    'restecg':  'Resting ECG result',
    'thalach':  'Max heart rate achieved',
    'exang':    'Exercise induced angina',
    'oldpeak':  'ST depression (oldpeak)',
    'slope':    'Slope of ST segment',
    'ca':       'Number of major vessels (0–3)',
    'thal':     'Thalassemia type'
}

FEATURE_LABELS_PATIENT = {
    'Age':             'Age (years)',
    'Sex':             'Sex',
    'ChestPainType':   'Chest pain type',
    'RestingBP':       'Resting blood pressure (mmHg)',
    'Cholesterol':     'Cholesterol (mg/dl)',
    'FastingBS':       'Fasting blood sugar >120',
    'RestingECG':      'Resting ECG result',
    'MaxHR':           'Max heart rate achieved',
    'ExerciseAngina':  'Exercise induced angina',
    'Oldpeak':         'ST depression (oldpeak)',
    'ST_Slope':        'Slope of ST segment'
}

# Keep FEATURE_LABELS as alias for backward compatibility with dashboard
FEATURE_LABELS = FEATURE_LABELS_DOCTOR
FEATURES       = FEATURES_DOCTOR

# ── Normal ranges for alert logic ─────────────────────────────────────────────
NORMAL_RANGES = {
    'trestbps':  (90,  120),
    'RestingBP': (90,  120),
    'chol':      (0,   200),
    'Cholesterol':(0,  200),
    'thalach':   (100, 180),
    'MaxHR':     (100, 180),
    'oldpeak':   (0,   2),
    'Oldpeak':   (0,   2),
}

SEVERITY_LABELS = {
    0: ('No Heart Disease', 'normal'),
    1: ('Heart Disease Detected', 'danger')
}


# ══════════════════════════════════════════════════════════════════════════════
# DOCTOR MODE PREDICTION (UCI model)
# ══════════════════════════════════════════════════════════════════════════════
def predict(input_dict: dict) -> dict:
    """
    Doctor Mode prediction using UCI model (13 features).

    Input keys: age, sex, cp, trestbps, chol, fbs, restecg,
                thalach, exang, oldpeak, slope, ca, thal
    """
    df     = pd.DataFrame([input_dict], columns=FEATURES_DOCTOR)
    scaled = scaler_doctor.transform(df)
    pred   = int(model_doctor.predict(scaled)[0])
    proba  = model_doctor.predict_proba(scaled)[0]
    conf   = round(float(proba[pred]) * 100, 1)

    label, severity = SEVERITY_LABELS[pred]

    # Alerts
    alerts = []
    for feat, (lo, hi) in NORMAL_RANGES.items():
        if feat in input_dict:
            val = input_dict[feat]
            if val is not None:
                if val > hi: alerts.append(f"{FEATURE_LABELS_DOCTOR.get(feat, feat)}: {val} (above normal)")
                elif val < lo and lo > 0: alerts.append(f"{FEATURE_LABELS_DOCTOR.get(feat, feat)}: {val} (below normal)")

    # Top 5 features
    importances = model_doctor.feature_importances_
    top_factors = sorted(zip(FEATURES_DOCTOR, importances), key=lambda x: x[1], reverse=True)[:5]

    return {
        'prediction':  pred,
        'label':       label,
        'severity':    severity,
        'confidence':  conf,
        'all_proba':   [round(float(p) * 100, 1) for p in proba],
        'alerts':      alerts,
        'top_factors': [(f, round(float(i) * 100, 1)) for f, i in top_factors],
        'model_used':  'doctor'
    }


# ══════════════════════════════════════════════════════════════════════════════
# PATIENT MODE PREDICTION (fedesoriano model)
# ══════════════════════════════════════════════════════════════════════════════
def predict_patient(input_dict: dict, chol_entered: bool = True) -> dict:
    """
    Patient Mode prediction using fedesoriano model (11 features).

    Input keys: Age, Sex, ChestPainType, RestingBP, Cholesterol,
                FastingBS, RestingECG, MaxHR, ExerciseAngina,
                Oldpeak, ST_Slope

    chol_entered: False if patient left cholesterol blank (suppress alert)
    """
    df     = pd.DataFrame([input_dict], columns=FEATURES_PATIENT)
    scaled = scaler_patient.transform(df)
    pred   = int(model_patient.predict(scaled)[0])
    proba  = model_patient.predict_proba(scaled)[0]
    conf   = round(float(proba[pred]) * 100, 1)

    label, severity = SEVERITY_LABELS[pred]

    # Alerts — skip cholesterol if patient didn't enter it
    alerts = []
    for feat, (lo, hi) in NORMAL_RANGES.items():
        if feat in input_dict:
            # Skip cholesterol alert if patient left it blank
            if feat == 'Cholesterol' and not chol_entered:
                continue
            val = input_dict[feat]
            if val is not None:
                if val > hi: alerts.append(f"{FEATURE_LABELS_PATIENT.get(feat, feat)}: {val} (above normal)")
                elif val < lo and lo > 0: alerts.append(f"{FEATURE_LABELS_PATIENT.get(feat, feat)}: {val} (below normal)")

    # Top 5 features
    importances = model_patient.feature_importances_
    top_factors = sorted(zip(FEATURES_PATIENT, importances), key=lambda x: x[1], reverse=True)[:5]

    return {
        'prediction':  pred,
        'label':       label,
        'severity':    severity,
        'confidence':  conf,
        'all_proba':   [round(float(p) * 100, 1) for p in proba],
        'alerts':      alerts,
        'top_factors': [(f, round(float(i) * 100, 1)) for f, i in top_factors],
        'model_used':  'patient'
    }


# ══════════════════════════════════════════════════════════════════════════════
# BATCH PREDICTION (Doctor Mode / UCI)
# ══════════════════════════════════════════════════════════════════════════════
def predict_from_csv(filepath: str) -> list:
    """
    Batch prediction on a CSV file using Doctor Mode model.
    CSV must have the 13 UCI feature columns.
    """
    df = pd.read_csv(filepath)
    if 'target' in df.columns:
        df = df.drop('target', axis=1)
    df = df[FEATURES_DOCTOR]

    results = []
    for _, row in df.iterrows():
        results.append(predict(row.to_dict()))
    return results


# ══════════════════════════════════════════════════════════════════════════════
# QUICK TEST
# ══════════════════════════════════════════════════════════════════════════════
if __name__ == '__main__':
    print("── Doctor Mode Test (UCI model) ─────────────────")
    doctor_input = {
        'age': 63, 'sex': 1, 'cp': 3, 'trestbps': 145,
        'chol': 233, 'fbs': 1, 'restecg': 0, 'thalach': 150,
        'exang': 0, 'oldpeak': 2.3, 'slope': 0, 'ca': 0, 'thal': 1
    }
    r1 = predict(doctor_input)
    print(f"  Diagnosis  : {r1['label']}")
    print(f"  Confidence : {r1['confidence']}%")
    print(f"  Model used : {r1['model_used']}")
    if r1['alerts']:
        for a in r1['alerts']: print(f"  ⚠ {a}")

    print("\n── Patient Mode Test (fedesoriano model) ────────")
    patient_input = {
        'Age': 55, 'Sex': 1, 'ChestPainType': 3, 'RestingBP': 145,
        'Cholesterol': 233, 'FastingBS': 1, 'RestingECG': 0,
        'MaxHR': 165, 'ExerciseAngina': 1, 'Oldpeak': 2.3, 'ST_Slope': 1
    }
    r2 = predict_patient(patient_input)
    print(f"  Diagnosis  : {r2['label']}")
    print(f"  Confidence : {r2['confidence']}%")
    print(f"  Model used : {r2['model_used']}")
    if r2['alerts']:
        for a in r2['alerts']: print(f"  ⚠ {a}")

    print("\n✓ Both models working correctly.")
