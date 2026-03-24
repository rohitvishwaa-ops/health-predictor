# VitalAI — Heart Health Predictor (React + FastAPI)

Original Streamlit app converted to React 18 + FastAPI.
All ML models, prediction logic, and features are preserved exactly.

---

## Project Structure

```
health-predictor/
├── backend/
│   ├── main.py              # FastAPI — auth, predict/doctor, predict/patient, predict/batch, history
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx       # Login + Register
│   │   │   └── Dashboard.jsx      # Navbar + Sidebar + tab routing
│   │   ├── components/
│   │   │   ├── DoctorMode.jsx     # 3-column clinical form with sliders
│   │   │   ├── PatientMode.jsx    # Plain-English patient form + PQRST
│   │   │   ├── ResultPanel.jsx    # Full result: gauge, charts, ECG, alerts, stress test
│   │   │   ├── BatchTab.jsx       # CSV upload + batch results + pie/histogram
│   │   │   └── HistoryTab.jsx     # Prediction history per user
│   │   ├── hooks/useAnalysis.js   # checkStressTestNeeded, buildAlerts, getBoundaryWarnings
│   │   ├── services/api.js        # All API calls
│   │   └── styles/global.css      # Full VitalAI dark theme
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── model/                   # ← YOUR .pkl FILES GO HERE
│   ├── heart_model.pkl
│   ├── heart_model_v2.pkl
│   ├── scaler.pkl
│   ├── scaler_v2.pkl
│   └── features_v2.pkl
├── data/
│   └── users.json           # auto-created on first run
├── predict.py               # ← COPY FROM YOUR ORIGINAL PROJECT
├── train.py                 # ← COPY FROM YOUR ORIGINAL PROJECT
├── train_v2.py              # ← COPY FROM YOUR ORIGINAL PROJECT
└── README.md
```

---

## Setup (3 steps)

### 1. Copy your original files

From your original project, copy these into the root of this folder:
```
predict.py
train.py
train_v2.py
check.py          (optional)
test.py           (optional)
model/*.pkl       → model/
data/heart.csv    → data/
data/heart_v2.csv → data/
```

### 2. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API runs at **http://localhost:8000**
Swagger docs at **http://localhost:8000/docs**

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

App opens at **http://localhost:3000**

Default login: **admin / admin123**

---

## Feature Parity

| Streamlit Feature                    | React Equivalent                        |
|--------------------------------------|-----------------------------------------|
| Login / Register page                | AuthPage.jsx                            |
| Navbar with username                 | navbar in Dashboard.jsx                 |
| Sidebar: Predict / Batch / History   | sidebar buttons in Dashboard.jsx        |
| Doctor Mode — 3-column clinical form | DoctorMode.jsx                          |
| Patient Mode — plain-English form    | PatientMode.jsx                         |
| PQRST ECG section with info box      | PatientMode.jsx (Section 4)             |
| Confidence gauge chart               | SVG Gauge in ResultPanel.jsx            |
| Top Risk Factors bar chart           | SVG BarChart in ResultPanel.jsx         |
| Vitals Radar chart                   | SVG RadarChart in ResultPanel.jsx       |
| Reconstructed ECG waveform           | SVG ECGWaveform in ResultPanel.jsx      |
| ECG interval vs normal bar chart     | ECGIntervalChart in ResultPanel.jsx     |
| Borderline result card               | ResultPanel.jsx                         |
| Stress test recommendation           | checkStressTestNeeded() in useAnalysis  |
| Alerts (BP, SpO2, temp, PQRST)       | buildAlerts() in useAnalysis.js         |
| Boundary warnings                    | getBoundaryWarnings() in useAnalysis.js |
| Auto-calculated HR / RR values       | ResultPanel.jsx (extra.resting_hr)      |
| Vitals summary pills                 | ResultPanel.jsx                         |
| Batch CSV upload                     | BatchTab.jsx                            |
| Batch summary + pie + histogram      | BatchTab.jsx                            |
| Prediction history (saved to JSON)   | HistoryTab.jsx + /history API           |
| PQRST confidence adjustment          | backend/main.py predict_patient_route   |

---

## API Endpoints

| Method | Path               | Auth | Description                    |
|--------|--------------------|------|--------------------------------|
| POST   | /auth/register     | No   | Register (username+password+name) |
| POST   | /auth/login        | No   | Login → Bearer token           |
| POST   | /auth/logout       | Yes  | Invalidate token               |
| GET    | /auth/me           | Yes  | Current user info              |
| POST   | /predict/doctor    | Yes  | Doctor mode (13 UCI features)  |
| POST   | /predict/patient   | Yes  | Patient mode (fedesoriano model) |
| POST   | /predict/batch     | Yes  | Batch CSV rows → results array |
| GET    | /history           | Yes  | Get prediction history         |
| DELETE | /history           | Yes  | Clear prediction history       |
| GET    | /health            | No   | API + model status             |
