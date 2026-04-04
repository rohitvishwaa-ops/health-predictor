import { useState } from "react";

const INIT = {
  age: 55, sex: 1, cp: 0, trestbps: 120, chol: 200,
  fbs: 0, restecg: 0, thalach: 150, exang: 0,
  oldpeak: 1.0, slope: 1, ca: 0, thal: 2,
};

function getRangeStyle(value, min, max) {
  return {
    "--range-fill-percent": `${((value - min) / (max - min)) * 100}%`,
  };
}

export default function DoctorMode({ onResult, onLoading, hasResult, onDownload }) {
  const [f, setF] = useState(INIT);
  const set = (key, value) => setF(prev => ({ ...prev, [key]: value }));

  const submit = async e => {
    e.preventDefault();
    onLoading(true);
    try {
      const { api } = await import("../services/api");
      const res = await api.predictDoctor(f);
      onResult(res.result, res.inputs, {}, "doctor");
    } catch (err) {
      alert(err.message);
    } finally {
      onLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="form-doctor">
      <p className="mode-caption">Clinical interface - enter precise diagnostic values.</p>
      <div className="sec-title">Clinical Parameters</div>

      <div className="doctor-grid">
        <div className="form-col">
          <div className="col-head">Demographics &amp; Symptoms</div>

          <div className="form-field">
            <label>Age <span className="range-hint">18-80</span></label>
            <input
              type="range"
              min={18}
              max={80}
              value={f.age}
              onChange={e => set("age", +e.target.value)}
              style={getRangeStyle(f.age, 18, 80)}
            />
            <span className="range-val">{f.age} yrs</span>
          </div>

          <div className="form-field">
            <label>Sex</label>
            <select value={f.sex} onChange={e => set("sex", +e.target.value)}>
              <option value={1}>Male</option>
              <option value={0}>Female</option>
            </select>
          </div>

          <div className="form-field">
            <label>Chest Pain Type</label>
            <select value={f.cp} onChange={e => set("cp", +e.target.value)}>
              <option value={0}>Typical Angina</option>
              <option value={1}>Atypical Angina</option>
              <option value={2}>Non-anginal Pain</option>
              <option value={3}>Asymptomatic</option>
            </select>
          </div>

          <div className="form-field">
            <label>Exercise Induced Angina</label>
            <select value={f.exang} onChange={e => set("exang", +e.target.value)}>
              <option value={0}>No</option>
              <option value={1}>Yes</option>
            </select>
          </div>
        </div>

        <div className="form-col">
          <div className="col-head">Blood &amp; Pressure</div>

          <div className="form-field">
            <label>Resting BP (mmHg) <span className="range-hint">80-200</span></label>
            <input
              type="range"
              min={80}
              max={200}
              value={f.trestbps}
              onChange={e => set("trestbps", +e.target.value)}
              style={getRangeStyle(f.trestbps, 80, 200)}
            />
            <span className="range-val">{f.trestbps} mmHg</span>
          </div>

          <div className="form-field">
            <label>Cholesterol (mg/dl) <span className="range-hint">100-600</span></label>
            <input
              type="range"
              min={100}
              max={600}
              value={f.chol}
              onChange={e => set("chol", +e.target.value)}
              style={getRangeStyle(f.chol, 100, 600)}
            />
            <span className="range-val">{f.chol} mg/dl</span>
          </div>

          <div className="form-field">
            <label>Fasting Blood Sugar &gt;120</label>
            <select value={f.fbs} onChange={e => set("fbs", +e.target.value)}>
              <option value={0}>No</option>
              <option value={1}>Yes</option>
            </select>
          </div>

          <div className="form-field">
            <label>Max Heart Rate (bpm) <span className="range-hint">60-210</span></label>
            <input
              type="range"
              min={60}
              max={210}
              value={f.thalach}
              onChange={e => set("thalach", +e.target.value)}
              style={getRangeStyle(f.thalach, 60, 210)}
            />
            <span className="range-val">{f.thalach} bpm</span>
          </div>
        </div>

        <div className="form-col">
          <div className="col-head">ECG &amp; Advanced</div>

          <div className="form-field">
            <label>Resting ECG</label>
            <select value={f.restecg} onChange={e => set("restecg", +e.target.value)}>
              <option value={0}>Normal</option>
              <option value={1}>ST-T Abnormality</option>
              <option value={2}>LV Hypertrophy</option>
            </select>
          </div>

          <div className="form-field">
            <label>ST Depression (Oldpeak) <span className="range-hint">0-6.5</span></label>
            <input
              type="range"
              min={0}
              max={6.5}
              step={0.1}
              value={f.oldpeak}
              onChange={e => set("oldpeak", +e.target.value)}
              style={getRangeStyle(f.oldpeak, 0, 6.5)}
            />
            <span className="range-val">{f.oldpeak}</span>
          </div>

          <div className="form-field">
            <label>ST Slope</label>
            <select value={f.slope} onChange={e => set("slope", +e.target.value)}>
              <option value={0}>Upsloping</option>
              <option value={1}>Flat</option>
              <option value={2}>Downsloping</option>
            </select>
          </div>

          <div className="form-field">
            <label>Major Vessels (Fluoroscopy)</label>
            <select value={f.ca} onChange={e => set("ca", +e.target.value)}>
              {[0, 1, 2, 3].map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>

          <div className="form-field">
            <label>Thalassemia</label>
            <select value={f.thal} onChange={e => set("thal", +e.target.value)}>
              <option value={0}>Normal</option>
              <option value={1}>Fixed Defect</option>
              <option value={2}>Reversible Defect</option>
              <option value={3}>Unknown</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
        <button type="submit" className="submit-btn" style={{ flex: 1 }}>Run Prediction</button>
        {hasResult && (
          <button type="button" className="submit-btn" style={{ flex: 1 }} onClick={(e) => onDownload(e)}>
            Download Report ↓
          </button>
        )}
      </div>
    </form>
  );
}
