import { motion } from "framer-motion";
import { useState } from "react";

const INIT = {
  age: 45,
  sex: 1,
  cp: 0,
  exang: 0,
  fbs: 0,
  restecg: 0,
  trestbps: "",
  diastolic: "",
  resting_hr: "",
  oldpeak: "",
  chol_input: "",
  spo2: "",
  temperature: "",
  pqrst: { pr_interval: "", qrs_duration: "", qt_interval: "" },
};

const CP_OPTS = ["No chest pain", "Only during exercise", "Sometimes, not during exercise", "Yes, frequently"];
const ECG_OPTS = ["No / Not sure", "Yes, mild abnormality", "Yes, significant issue"];
const sectionMotion = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
};

function getRangeStyle(value, min, max) {
  return {
    "--range-fill-percent": `${((value - min) / (max - min)) * 100}%`,
  };
}

function parseNumber(value, fallback) {
  if (value === "") return fallback;
  return Number(value);
}

function ManualNumberField({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = "1",
  placeholder,
  required = false,
}) {
  return (
    <motion.div className="form-field metric-input-card" whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.18 }}>
      <div className="metric-input-top">
        <div className="pq">{label}</div>
        <span className="metric-input-bounds">{min}-{max}</span>
      </div>
      <div className="ph">{hint}</div>
      <input
        className="manual-input"
        type="number"
        inputMode={step === "1" ? "numeric" : "decimal"}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
      />
    </motion.div>
  );
}

export default function PatientMode({ onResult, onLoading }) {
  const [f, setF] = useState(INIT);

  const set = (key, value) => setF(prev => ({ ...prev, [key]: value }));
  const setPQ = (key, value) => setF(prev => ({ ...prev, pqrst: { ...prev.pqrst, [key]: value } }));

  const submit = async e => {
    e.preventDefault();
    onLoading(true);
    try {
      const { api } = await import("../services/api");
      const payload = {
        ...f,
        trestbps: parseNumber(f.trestbps, 0),
        diastolic: parseNumber(f.diastolic, 0),
        resting_hr: parseNumber(f.resting_hr, 0),
        oldpeak: parseNumber(f.oldpeak, 0),
        chol_input: parseNumber(f.chol_input, 0),
        spo2: parseNumber(f.spo2, 98),
        temperature: parseNumber(f.temperature, 36.8),
        pqrst: {
          pr_interval: f.pqrst.pr_interval === "" ? null : Number(f.pqrst.pr_interval),
          qrs_duration: f.pqrst.qrs_duration === "" ? null : Number(f.pqrst.qrs_duration),
          qt_interval: f.pqrst.qt_interval === "" ? null : Number(f.pqrst.qt_interval),
        },
      };
      const res = await api.predictPatient(payload);
      onResult(res.result, res.inputs, res.extra, "patient");
    } catch (err) {
      alert(err.message);
    } finally {
      onLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="form-patient">
      <div className="mode-copy-block">
        <p className="mode-caption">Simple health check with a cleaner guided flow. You can answer normally and type report values directly.</p>
        <div className="form-note-card">
          <strong>Tip</strong>
          <span>These boxes now start empty and show entry guidance, so users can type values directly instead of replacing prefilled numbers.</span>
        </div>
      </div>

      <motion.section className="form-section" {...sectionMotion}>
        <div className="sec-title">About You</div>
        <div className="patient-grid-2">
          <div className="glass-card form-panel">
            <div className="pq">How old are you?</div>
            <input
              type="range"
              min={20}
              max={80}
              value={f.age}
              onChange={e => set("age", +e.target.value)}
              className="full-range"
              style={getRangeStyle(f.age, 20, 80)}
            />
            <span className="range-val">{f.age} years old</span>

            <div className="pq field-spacer">What is your sex?</div>
            <div className="radio-group">
              {["Male", "Female"].map(option => {
                const numeric = option === "Male" ? 1 : 0;
                return (
                  <label key={option} className={`radio-chip ${numeric === f.sex ? "active" : ""}`}>
                    <input
                      type="radio"
                      name="sex"
                      value={numeric}
                      checked={numeric === f.sex}
                      onChange={() => set("sex", numeric)}
                    />
                    {option}
                  </label>
                );
              })}
            </div>

            <div className="pq field-spacer">Do you experience chest pain?</div>
            <div className="radio-stack">
              {CP_OPTS.map((option, index) => (
                <label key={option} className={`radio-chip ${f.cp === index ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="cp"
                    value={index}
                    checked={f.cp === index}
                    onChange={() => set("cp", index)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>

          <div className="glass-card form-panel">
            <div className="pq">Breathless or chest pain during exercise?</div>
            <div className="radio-group">
              {["No", "Yes"].map((option, index) => (
                <label key={option} className={`radio-chip ${f.exang === index ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="exang"
                    value={index}
                    checked={f.exang === index}
                    onChange={() => set("exang", index)}
                  />
                  {option}
                </label>
              ))}
            </div>

            <div className="pq field-spacer">Do you have diabetes or high blood sugar?</div>
            <div className="radio-group">
              {["No", "Yes"].map((option, index) => (
                <label key={option} className={`radio-chip ${f.fbs === index ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="fbs"
                    value={index}
                    checked={f.fbs === index}
                    onChange={() => set("fbs", index)}
                  />
                  {option}
                </label>
              ))}
            </div>

            <div className="pq field-spacer">Has your doctor mentioned an irregular ECG?</div>
            <div className="radio-stack">
              {ECG_OPTS.map((option, index) => (
                <label key={option} className={`radio-chip ${f.restecg === index ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="restecg"
                    value={index}
                    checked={f.restecg === index}
                    onChange={() => set("restecg", index)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section className="form-section" {...sectionMotion}>
        <div className="sec-title">Measurements from Your Last Clinic Visit</div>
        <p className="sec-caption">Check your prescription slip or latest health report for these values.</p>
        <div className="patient-grid-4">
          <ManualNumberField
            label="Systolic BP"
            hint="Top number, e.g. 120"
            min={80}
            max={200}
            placeholder="Enter systolic BP"
            value={f.trestbps}
            onChange={value => set("trestbps", value)}
            required
          />
          <ManualNumberField
            label="Diastolic BP"
            hint="Bottom number, e.g. 80"
            min={40}
            max={130}
            placeholder="Enter diastolic BP"
            value={f.diastolic}
            onChange={value => set("diastolic", value)}
            required
          />
          <ManualNumberField
            label="Resting Heart Rate"
            hint="BPM at rest from ECG report"
            min={30}
            max={150}
            placeholder="Enter resting HR"
            value={f.resting_hr}
            onChange={value => set("resting_hr", value)}
            required
          />
          <ManualNumberField
            label="ST Depression (Oldpeak)"
            hint="From ECG report. Leave blank if unsure."
            min={0}
            max={6.5}
            step="0.1"
            placeholder="Enter oldpeak"
            value={f.oldpeak}
            onChange={value => set("oldpeak", value)}
          />
        </div>

        <div className="patient-single-metric">
          <ManualNumberField
            label="Cholesterol level (optional)"
            hint="From blood test (mg/dl). Leave blank if unknown."
            min={0}
            max={600}
            placeholder="Enter cholesterol"
            value={f.chol_input}
            onChange={value => set("chol_input", value)}
          />
        </div>
      </motion.section>

      <motion.section className="form-section" {...sectionMotion}>
        <div className="sec-title">Extra Vitals <span className="opt-tag">(optional but recommended)</span></div>
        <div className="patient-grid-2 patient-vitals-grid">
          <ManualNumberField
            label="SpO2 - Blood oxygen (%)"
            hint="From pulse oximeter. Normal: 95-100%"
            min={70}
            max={100}
            placeholder="Enter SpO2"
            value={f.spo2}
            onChange={value => set("spo2", value)}
          />
          <ManualNumberField
            label="Body temperature (°C)"
            hint="Normal: 36.1-37.2°C"
            min={34}
            max={42}
            step="0.1"
            placeholder="Enter temperature"
            value={f.temperature}
            onChange={value => set("temperature", value)}
          />
        </div>
      </motion.section>

      <motion.section className="form-section" {...sectionMotion}>
        <div className="sec-title">ECG Values <span className="opt-tag">(optional - from your ECG report printout)</span></div>
        <div className="ecg-info-box">
          <div className="ecg-info-title">Where to find these values</div>
          <div className="ecg-info-body">
            These are printed on your ECG report in the measurements table near the top. Leave them blank if you do not have the report. The prediction still works without them.
          </div>
          <div className="ecg-info-normal">
            <strong>PR interval</strong> - normal: 120-200 ms
            {"  •  "}
            <strong>QRS duration</strong> - normal: 60-120 ms
            {"  •  "}
            <strong>QT interval</strong> - normal: 350-440 ms
          </div>
        </div>

        <div className="patient-grid-3">
          {[
            ["pr_interval", "PR interval (ms)", "Enter PR interval"],
            ["qrs_duration", "QRS duration (ms)", "Enter QRS duration"],
            ["qt_interval", "QT interval (ms)", "Enter QT interval"],
          ].map(([key, label, placeholder]) => (
            <ManualNumberField
              key={key}
              label={label}
              hint="Type the printed ECG value directly"
              min={0}
              max={600}
              placeholder={placeholder}
              value={f.pqrst[key]}
              onChange={value => setPQ(key, value)}
            />
          ))}
        </div>
      </motion.section>

      <button type="submit" className="submit-btn">Check My Heart Health</button>
    </form>
  );
}
