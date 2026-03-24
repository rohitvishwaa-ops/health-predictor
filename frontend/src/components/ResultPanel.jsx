import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { checkStressTestNeeded, buildAlerts, getBoundaryWarnings } from "../hooks/useAnalysis";

function CountUp({ value, suffix = "", decimals = 0, duration = 900, className, style }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    let rafId = 0;
    let startTime = 0;

    const tick = timestamp => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(target * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, duration]);

  return (
    <span className={className} style={style}>
      {displayValue.toFixed(decimals)}{suffix}
    </span>
  );
}

function Gauge({ value, color }) {
  const gaugeRef = useRef(null);
  const gaugeInView = useInView(gaugeRef, { amount: 0.5 });
  const [replayKey, setReplayKey] = useState(0);
  const pct = Math.min(Math.max(value, 0), 100) / 100;
  const r = 70;
  const cx = 90;
  const cy = 78;
  const startAngle = Math.PI * 0.75;
  const sweep = Math.PI * 1.5 * pct;
  const endAngle = startAngle + sweep;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const large = sweep > Math.PI ? 1 : 0;

  useEffect(() => {
    if (gaugeInView) {
      setReplayKey(key => key + 1);
    }
  }, [gaugeInView]);

  return (
    <motion.svg
      ref={gaugeRef}
      viewBox="0 0 180 132"
      className="gauge-svg"
      onHoverStart={() => setReplayKey(key => key + 1)}
    >
      <path
        d={`M ${cx + r * Math.cos(startAngle)} ${cy + r * Math.sin(startAngle)} A ${r} ${r} 0 1 1 ${cx + r * Math.cos(startAngle + Math.PI * 1.5)} ${cy + r * Math.sin(startAngle + Math.PI * 1.5)}`}
        fill="none"
        stroke="#203145"
        strokeWidth="14"
        strokeLinecap="round"
      />
      {value > 0 && (
        <motion.path
          key={`gauge-arc-${replayKey}`}
          d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        />
      )}
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#f7fbff" fontSize="22" fontWeight="700">{value}%</text>
      <text x={cx} y={cy + 32} textAnchor="middle" fill="#7e92aa" fontSize="10">Confidence Score</text>
    </motion.svg>
  );
}

function BarChart({ factors, labelMap, color }) {
  if (!factors?.length) return null;
  const max = Math.max(...factors.map(factor => factor[1]));

  return (
    <div className="chart-wrap chart-wrap-elevated">
      <div className="chart-title">Top Risk Factors</div>
      <div className="bar-list">
        {[...factors].reverse().map(([key, value]) => (
          <div className="bar-row" key={key}>
            <span className="bar-label">{labelMap?.[key] || key}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
            </div>
            <span className="bar-pct">{value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RadarChart({ inp, color }) {
  const [replayKey, setReplayKey] = useState(0);
  const cx = 120;
  const cy = 120;
  const r = 74;
  const categories = ["BP", "Cholesterol", "Heart Rate", "Age", "ST Dep."];
  const bp = inp.trestbps || inp.RestingBP || 120;
  const chol = inp.chol || inp.Cholesterol || 200;
  const hr = inp.thalach || inp.MaxHR || 150;
  const age = inp.age || inp.Age || 50;
  const oldpeak = inp.oldpeak || inp.Oldpeak || 0;
  const values = [
    Math.min((bp / 200) * 100, 100),
    Math.min((chol / 600) * 100, 100),
    Math.min((hr / 210) * 100, 100),
    Math.min((age / 80) * 100, 100),
    Math.min((oldpeak / 6.5) * 100, 100),
  ];
  const count = categories.length;
  const toXY = (index, pct) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return [cx + ((r * pct) / 100) * Math.cos(angle), cy + ((r * pct) / 100) * Math.sin(angle)];
  };
  const points = values.map((value, index) => toXY(index, value));
  const polygon = points.map(([x, y]) => `${x},${y}`).join(" ");
  const centerPolygon = Array.from({ length: count }, () => `${cx},${cy}`).join(" ");
  const gridLines = [20, 40, 60, 80, 100].map(pct =>
    Array.from({ length: count }, (_, index) => toXY(index, pct)).map(([x, y]) => `${x},${y}`).join(" ")
  );
  const rgb = color === "#ff7b72" ? "255,123,114" : "99,215,171";

  return (
    <motion.div
      className="chart-wrap chart-wrap-elevated"
      onHoverStart={() => setReplayKey(key => key + 1)}
    >
      <div className="chart-title">Vitals Radar</div>
      <svg viewBox="0 0 240 240" className="radar-svg radar-svg-padded">
        {gridLines.map((line, index) => <polygon key={index} points={line} fill="none" stroke="#203145" strokeWidth="0.8" />)}
        {Array.from({ length: count }, (_, index) => {
          const [x, y] = toXY(index, 100);
          return <line key={index} x1={cx} y1={cy} x2={x} y2={y} stroke="#203145" strokeWidth="0.8" />;
        })}
        <motion.polygon
          key={`radar-fill-${replayKey}`}
          initial={{ points: centerPolygon, opacity: 0.12 }}
          whileInView={{ points: polygon, opacity: 1 }}
          viewport={{ once: false, amount: 0.45 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          points={polygon}
          fill={`rgba(${rgb},0.18)`}
          stroke={color}
          strokeWidth="2.5"
        />
        {points.map(([x, y], index) => (
          <motion.circle
            key={`${index}-${replayKey}`}
            initial={{ cx, cy, r: 0 }}
            whileInView={{ cx: x, cy: y, r: 4.5 }}
            viewport={{ once: false, amount: 0.45 }}
            transition={{ duration: 0.55, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
            fill={color}
          />
        ))}
        {Array.from({ length: count }, (_, index) => {
          const [x, y] = toXY(index, 118);
          return (
            <text
              key={index}
              x={x}
              y={y}
              textAnchor="middle"
              fill="#90a5bd"
              fontSize="9"
              dominantBaseline="middle"
            >
              {categories[index]}
            </text>
          );
        })}
      </svg>
    </motion.div>
  );
}

function ECGWaveform({ pqrst, extra, inputs, result }) {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { amount: 0.45 });
  const rhr = extra?.resting_hr || 72;
  const rr = Math.round(60000 / rhr);
  const pr = pqrst?.pr_interval || 160;
  const qrs = pqrst?.qrs_duration || 90;
  const qt = pqrst?.qt_interval || 380;
  const oldpeak = Number(inputs?.oldpeak ?? inputs?.Oldpeak ?? 0);
  const restecg = Number(inputs?.restecg ?? inputs?.RestingECG ?? 0);
  const prediction = Number(result?.prediction ?? 0);
  const confidence = Number(result?.confidence ?? 0);
  const stLevel = Math.min(oldpeak / 6.5, 1) * (prediction === 1 ? -0.24 : -0.12);
  const pWaveAmp = restecg === 2 ? 0.1 : 0.15;
  const tWaveAmp = restecg === 1 ? 0.12 : restecg === 2 ? 0.2 : 0.25;
  const rWaveAmp = prediction === 1 && confidence > 70 ? 0.9 : 1.0;
  const qWaveAmp = prediction === 1 ? -0.2 : -0.15;
  const sWaveAmp = prediction === 1 ? -0.28 : -0.2;
  const postWaveOvershoot = prediction === 1 ? -0.05 : 0;
  const isAbnormal = (pqrst?.pr_interval > 200) || (pqrst?.qrs_duration > 120) || (pqrst?.qt_interval > 440);
  const waveColor = isAbnormal ? "#ff7b72" : "#5fffd2";
  const waveGlow = isAbnormal ? "rgba(255, 123, 114, 0.65)" : "rgba(95, 255, 210, 0.7)";
  const width = 320;
  const height = 104;
  const offsetY = 58;
  const scaleY = 36;
  const beatSpan = Math.max(136, Math.min(220, rr * 0.18 + 20));
  const beatCount = 4;
  const loopWidth = beatSpan * beatCount;
  const cycleDuration = Math.max(2.3, Math.min(4.8, (60 / rhr) * 3.2));
  const sampleCount = 240;
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const gauss = (x, mu, sigma, amp) => amp * Math.exp(-0.5 * Math.pow((x - mu) / sigma, 2));
  const msToX = beatSpan / Math.max(rr, 520);
  const pCenter = 18;
  const pSigma = 4.8;
  const qrsStart = clamp(pr * msToX + 12, 28, beatSpan * 0.48);
  const qrsWidth = clamp(qrs * msToX, 10, beatSpan * 0.22);
  const qCenter = qrsStart + qrsWidth * 0.18;
  const rCenter = qrsStart + qrsWidth * 0.48;
  const sCenter = qrsStart + qrsWidth * 0.82;
  const tCenter = clamp(qt * msToX + 10, qrsStart + qrsWidth + 16, beatSpan * 0.86);
  const tSigma = clamp((qt * msToX) * 0.075, 6, 14);

  const signalAt = x => {
    const phase = x % beatSpan;
    const baselineWander = Math.sin((x / loopWidth) * Math.PI * 4) * 0.008;
    const p = gauss(phase, pCenter, pSigma, pWaveAmp);
    const q = gauss(phase, qCenter, Math.max(1.4, qrsWidth * 0.09), qWaveAmp);
    const r = gauss(phase, rCenter, Math.max(1.8, qrsWidth * 0.08), rWaveAmp);
    const s = gauss(phase, sCenter, Math.max(1.8, qrsWidth * 0.1), sWaveAmp);
    const t = gauss(phase, tCenter, tSigma, tWaveAmp);
    const st =
      phase > sCenter && phase < tCenter - tSigma
        ? stLevel * (1 - Math.abs(((phase - (sCenter + tCenter - tSigma) / 2) / (tCenter - tSigma - sCenter || 1)) * 0.35))
        : 0;
    const overshoot = gauss(phase, sCenter + 5, 2.8, postWaveOvershoot);
    return baselineWander + p + q + r + s + overshoot + st + t;
  };

  const points = Array.from({ length: sampleCount }, (_, index) => {
    const x = (index / (sampleCount - 1)) * loopWidth;
    return [x, signalAt(x)];
  });

  const pathData = points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${offsetY - y * scaleY}`)
    .join(" ");

  return (
    <motion.div
      ref={containerRef}
      className="chart-wrap chart-wrap-elevated"
    >
      <div className="chart-title">Live ECG Stream</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="ecg-svg">
        <defs>
          <filter id="ecg-neon-glow" x="-30%" y="-80%" width="160%" height="260%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 1 0"
              result="glow"
            />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="ecg-scan-fill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="45%" stopColor={waveGlow} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        {Array.from({ length: 15 }, (_, index) => (
          <line
            key={`grid-v-${index}`}
            x1={(index / 14) * width}
            y1="0"
            x2={(index / 14) * width}
            y2={height}
            stroke={index % 5 === 0 ? "#274159" : "#1a2c3e"}
            strokeWidth={index % 5 === 0 ? "0.75" : "0.4"}
          />
        ))}
        {Array.from({ length: 9 }, (_, index) => (
          <line
            key={`grid-h-${index}`}
            x1="0"
            y1={(index / 8) * height}
            x2={width}
            y2={(index / 8) * height}
            stroke={index === 4 ? "#33506a" : "#1a2c3e"}
            strokeWidth={index === 4 ? "0.85" : "0.4"}
          />
        ))}
        <motion.g
          initial={{ x: 0 }}
          animate={isInView ? { x: [0, -beatSpan] } : { x: 0 }}
          transition={isInView ? { duration: cycleDuration, ease: "linear", repeat: Infinity } : { duration: 0 }}
        >
          {[0, loopWidth].map(offset => (
            <g key={offset} transform={`translate(${offset} 0)`}>
              <path
                d={pathData}
                fill="none"
                stroke={waveGlow}
                strokeWidth="9"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.22"
                filter="url(#ecg-neon-glow)"
              />
              <path
                d={pathData}
                fill="none"
                stroke={waveColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#ecg-neon-glow)"
              />
            </g>
          ))}
        </motion.g>
        <motion.rect
          x="-54"
          y="0"
          width="54"
          height={height}
          fill="url(#ecg-scan-fill)"
          opacity="0.42"
          animate={isInView ? { x: [-54, width + 10] } : { x: -54 }}
          transition={isInView ? { duration: cycleDuration, ease: "linear", repeat: Infinity } : { duration: 0 }}
        />
      </svg>
      <p className="ecg-footer">HR: {rhr} bpm · RR: {rr} ms · Animated live-style reconstruction from your entered ECG timings, vitals, and model outcome</p>
    </motion.div>
  );
}

function ECGIntervalChart({ pqrst }) {
  const checks = [
    ["pr_interval", "PR Interval", 120, 200],
    ["qrs_duration", "QRS Duration", 60, 120],
    ["qt_interval", "QT Interval", 350, 440],
  ].filter(([key]) => pqrst?.[key]);

  if (!checks.length) return null;
  const maxValue = Math.max(...checks.map(([key, , , high]) => Math.max(pqrst[key], high))) * 1.2;

  return (
    <div className="chart-wrap chart-wrap-elevated">
      <div className="chart-title">ECG Intervals vs Normal</div>
      <div className="interval-list">
        {checks.map(([key, label, low, high]) => {
          const value = pqrst[key];
          const ok = value >= low && value <= high;
          const color = ok ? "#63d7ab" : "#ff7b72";
          return (
            <div key={key} className="interval-row">
              <span className="int-label">{label}</span>
              <div className="int-track">
                <div className="int-normal" style={{ width: `${(high / maxValue) * 100}%` }} />
                <div className="int-value" style={{ width: `${(value / maxValue) * 100}%`, background: color }} />
              </div>
              <span className="int-val" style={{ color }}>{value} ms</span>
            </div>
          );
        })}
        <p className="int-legend"><span className="leg-normal" /> Normal range <span className="legend-gap" /><span className="leg-val" /> Your value</p>
      </div>
    </div>
  );
}

const FEATURE_LABELS = {
  age: "Age", sex: "Sex", cp: "Chest Pain", trestbps: "Resting BP", chol: "Cholesterol",
  fbs: "Fasting BS", restecg: "Resting ECG", thalach: "Max HR", exang: "Exercise Angina",
  oldpeak: "ST Depression", slope: "ST Slope", ca: "Major Vessels", thal: "Thalassemia",
};

const FEATURE_LABELS_PATIENT = {
  Age: "Age", Sex: "Sex", ChestPainType: "Chest Pain", RestingBP: "Resting BP", Cholesterol: "Cholesterol",
  FastingBS: "Fasting BS", RestingECG: "Resting ECG", MaxHR: "Max HR", ExerciseAngina: "Exercise Angina",
  Oldpeak: "ST Depression", ST_Slope: "ST Slope",
};

const SEVERITY_CONFIG = {
  mild: { color: "#7fc8ff", label: "Mild" },
  moderate: { color: "#ffcf5a", label: "Moderate" },
  significant: { color: "#ff7b72", label: "Significant" },
};

export default function ResultPanel({ result, inputs, extra, modelUsed }) {
  if (!result) return null;

  const danger = result.prediction === 1;
  const color = danger ? "#ff7b72" : "#63d7ab";
  const confidence = result.confidence;
  const pqrst = extra?.pqrst || {};
  const labels = modelUsed === "patient" ? FEATURE_LABELS_PATIENT : FEATURE_LABELS;
  const stressFlags = checkStressTestNeeded(pqrst, inputs, result, extra);
  const alerts = buildAlerts(result, extra, pqrst);
  const boundaryWarnings = getBoundaryWarnings(inputs);
  const levels = stressFlags.map(([, severity]) => severity);
  const topLevel = levels.includes("significant") ? "significant" : levels.includes("moderate") ? "moderate" : "mild";
  const stressConfig = stressFlags.length ? SEVERITY_CONFIG[topLevel] : null;
  const leadFactor = result.top_factors?.[0]?.[0];
  const leadFactorLabel = (leadFactor && (labels[leadFactor] || leadFactor)) || (danger ? "Predicted cardiac risk" : "Protective vital pattern");
  const summaryTone = danger ? "High Review Attention" : "Favorable Screening Pattern";
  const summaryNote = stressConfig
    ? `Follow-up advised: ${stressConfig.label} stress-test review`
    : confidence >= 70
      ? "Stable model confidence from the submitted profile"
      : "Near-boundary output, interpret with added caution";

  const ageValue = inputs.age || inputs.Age;
  const bpValue = inputs.trestbps || inputs.RestingBP;
  const cholValue = inputs.chol || inputs.Cholesterol;
  const hrValue = inputs.thalach || inputs.MaxHR;
  const oldpeakValue = inputs.oldpeak || inputs.Oldpeak || 0;
  const diastolic = extra?.diastolic;
  const bpDisplay = diastolic ? `${bpValue}/${diastolic}` : String(bpValue);

  const pills = [
    { label: "Age", val: ageValue, unit: "yrs", warn: false },
    { label: "Blood Pressure", val: bpDisplay, unit: "mmHg", warn: bpValue > 120 || (diastolic && diastolic > 90) },
    { label: "Cholesterol", val: cholValue, unit: "mg/dl", warn: cholValue > 200 },
    { label: "Max Heart Rate", val: hrValue, unit: "bpm", warn: hrValue < 100 },
    { label: "ST Depression", val: oldpeakValue, unit: "", warn: oldpeakValue > 2 },
    ...(extra?.spo2 ? [{ label: "SpO2", val: extra.spo2, unit: "%", warn: extra.spo2 < 95 }] : []),
    ...(extra?.temperature ? [{ label: "Temperature", val: extra.temperature, unit: "°C", warn: extra.temperature > 37.5 }] : []),
  ];

  const hasPQRST = pqrst && Object.values(pqrst).some(Boolean);

  return (
    <motion.div className="result-root" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.34 }}>
      <div className="sec-title">Prediction Result</div>
      <motion.div
        className="result-review-strip glass-card"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.36 }}
      >
        <div className="result-review-main">
          <div className="result-review-badge">Generated by VitalAI Review Workspace</div>
          <div className="result-review-title">{summaryTone}</div>
          <div className="result-review-copy">{summaryNote}</div>
        </div>
        <div className="result-review-tags">
          <div className="result-review-tag">
            <span>Risk Level</span>
            <strong>{danger ? "Elevated" : "Low"}</strong>
          </div>
          <div className="result-review-tag">
            <span>Confidence</span>
            <strong><CountUp value={confidence} suffix="%" /></strong>
          </div>
          <div className="result-review-tag">
            <span>Key Driver</span>
            <strong>{leadFactorLabel}</strong>
          </div>
        </div>
      </motion.div>

      <div className="result-grid">
        <div className="result-left">
          <motion.div className={`result-card ${danger ? "danger" : "safe"}`} whileHover={{ y: -4 }} transition={{ duration: 0.18 }}>
            <div className="result-kicker">{danger ? "Elevated risk" : "Lower risk"}</div>
            <div className="result-label" style={{ color }}>{result.label}</div>
            <div className="result-conf">Confidence <strong><CountUp value={confidence} suffix="%" /></strong></div>
            <div className="result-proba">No disease {result.all_proba?.[0]}% · Disease {result.all_proba?.[1]}%</div>
          </motion.div>

          {confidence >= 50 && confidence <= 65 && (
            <div className="borderline-card">
              <div className="borderline-title">Borderline Result</div>
              <div className="borderline-body">
                The model confidence is <strong>{confidence}%</strong>, which means this case sits near the decision boundary and should not be treated as definitive without clinical review.
              </div>
            </div>
          )}

          {stressConfig && (
            <div className="stress-card" style={{ borderColor: stressConfig.color }}>
              <div className="stress-title" style={{ color: stressConfig.color }}>
                Stress Test Recommended - {stressConfig.label}
              </div>
              <div className="stress-body">
                <ul>
                  {stressFlags.map(([reason, severity], index) => (
                    <li key={index}>
                      <span style={{ color: SEVERITY_CONFIG[severity].color, fontSize: "11px", fontWeight: 700 }}>
                        {SEVERITY_CONFIG[severity].label}
                      </span>
                      {"  "}{reason}
                    </li>
                  ))}
                </ul>
                A cardiac stress test can provide a more accurate assessment for this case. Please review with a cardiologist.
              </div>
            </div>
          )}

          <div className="disclaimer-card">
            <div className="disclaimer-body">
              <strong>This is not a clinical diagnosis.</strong> VitalAI is an AI-assisted screening tool that supports, but never replaces, medical judgment and professional evaluation.
            </div>
          </div>

          <div className="sec-title" style={{ marginTop: "1.2rem" }}>Alerts</div>
          {alerts.length ? alerts.map((alert, index) => (
            <div key={index} className="alert-item">Attention: {alert}</div>
          )) : (
            <div className="ok-item">All monitored vitals are within the normal range.</div>
          )}
        </div>

        <div className="result-right">
          <div className="glass-card gauge-card">
            <Gauge value={confidence} color={color} />
          </div>

          {extra?.resting_hr && (
            <div className="ecg-box" style={{ marginTop: "12px" }}>
              <div className="ecg-box-title">Auto-calculated values</div>
              <div className="ecg-box-body">
                Resting heart rate {"->"} <strong>{extra.resting_hr} bpm</strong><br />
                Max heart rate estimate {"->"} <strong>{extra.est_max_hr} bpm</strong><br />
                RR interval {"->"} <strong>{extra.rr_interval} ms</strong>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="sec-title">Vitals Summary</div>
      <div className="pills-row">
        {pills.map(({ label, val, unit, warn }) => (
          <motion.div key={label} className="metric-pill metric-pill-elevated" whileHover={{ y: -4 }} transition={{ duration: 0.18 }}>
            <div className="mp-label">{label}</div>
            <div className="mp-value">
              {typeof val === "number" ? <CountUp value={val} decimals={Number.isInteger(val) ? 0 : 1} /> : val}
              <span className="mp-unit"> {unit}</span>
            </div>
            {warn !== false && (
              <div className="metric-state" style={{ color: warn ? "#ff7b72" : "#63d7ab" }}>
                {warn ? "Needs attention" : "Normal"}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="sec-title">Analysis Charts</div>
      <div className="charts-grid">
        <BarChart factors={result.top_factors} labelMap={labels} color={color} />
        <RadarChart inp={inputs} color={color} />
      </div>

      {boundaryWarnings.length > 0 && (
        <>
          <div className="sec-title">Boundary Warnings</div>
          {boundaryWarnings.map((warning, index) => (
            <div key={index} className="alert-item danger-alert">Attention: {warning}</div>
          ))}
        </>
      )}

      {hasPQRST && (
        <>
          <div className="sec-title">ECG Analysis</div>
          <div className="charts-grid">
            <ECGWaveform pqrst={pqrst} extra={extra} inputs={inputs} result={result} />
            <ECGIntervalChart pqrst={pqrst} />
          </div>
        </>
      )}
    </motion.div>
  );
}
