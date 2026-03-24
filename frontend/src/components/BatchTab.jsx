import { motion } from "framer-motion";
import { useState } from "react";
import { api } from "../services/api";

const FEATURES = ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"];

const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
};

export default function BatchTab() {
  const [rows, setRows] = useState([]);
  const [preview, setPreview] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    setErr("");
    setResults(null);
    const reader = new FileReader();
    reader.onload = ev => {
      const lines = ev.target.result.trim().split("\n");
      const headers = lines[0].split(",").map(header => header.trim());
      const parsed = lines.slice(1).map(line => {
        const values = line.split(",");
        return Object.fromEntries(headers.map((header, index) => [header, parseFloat(values[index])]));
      });
      setRows(parsed);
      setPreview(parsed.slice(0, 5));
    };
    reader.readAsText(file);
  };

  const run = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api.predictBatch(rows);
      setResults(res.results);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  const disease = results ? results.filter(result => result.prediction === 1).length : 0;
  const healthy = results ? results.length - disease : 0;
  const avgConf = results ? (results.reduce((sum, result) => sum + result.confidence, 0) / results.length).toFixed(1) : 0;

  return (
    <div className="batch-tab">
      <div className="page-hero">
        <div>
          <div className="page-eyebrow">Bulk Processing</div>
          <h2 className="tab-title">Batch Patient Analysis</h2>
          <p className="tab-caption">Upload a CSV, validate the structure, then review multi-patient predictions in a cleaner reporting dashboard.</p>
        </div>
        <div className="page-hero-card">
          <span className="page-hero-kicker">Workflow</span>
          <strong>Upload, preview, analyse</strong>
          <span>Built for fast review without sacrificing clarity.</span>
        </div>
      </div>

      <motion.section className="content-card" {...reveal}>
        <div className="sec-title">Required Columns</div>
        <code className="feat-code">{FEATURES.join(", ")}</code>

        <div className="upload-area upload-card">
          <input type="file" accept=".csv" id="csv-upload" onChange={onFile} hidden />
          <label htmlFor="csv-upload" className="upload-label">
            <span className="upload-icon">⇪</span>
            <span>
              <strong>Choose CSV file</strong>
              <span className="upload-subcopy">Drag-and-drop style upload card with instant preview support</span>
            </span>
          </label>
        </div>

        {!preview.length && !results && !loading && !err && (
          <div className="empty-state empty-state-batch">
            <div className="empty-state-icon">CSV</div>
            <div className="empty-state-title">Drop in a batch file to build an instant review dashboard.</div>
            <div className="empty-state-copy">
              After upload, VitalAI will preview the structure, summarise patient counts, and surface risk distribution in a presentation-ready format.
            </div>
            <div className="empty-state-points">
              <span>Preview first five rows</span>
              <span>Summarise flagged vs healthy cases</span>
              <span>Visualise confidence spread for reviewers</span>
            </div>
          </div>
        )}

        {err && <div className="msg err">{err}</div>}

        {preview.length > 0 && (
          <>
            <div className="preview-count"><strong>{rows.length} patients found.</strong> Previewing the first five rows.</div>
            <div className="table-shell">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>{Object.keys(preview[0]).map(key => <th key={key}>{key}</th>)}</tr>
                  </thead>
                  <tbody>
                    {preview.map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value, cellIndex) => <td key={cellIndex}>{value}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <button className="submit-btn" onClick={run} disabled={loading} style={{ marginTop: "1rem" }}>
              {loading ? <><span className="spin" /> Analysing...</> : "Run Predictions on All Patients"}
            </button>
          </>
        )}
      </motion.section>

      {results && (
        <motion.section className="result-root" {...reveal}>
          <div className="sec-title" style={{ marginTop: "1.4rem" }}>Summary</div>
          <div className="batch-pills">
            {[
              ["Total Patients", rows.length, "#f4f7fb"],
              ["Disease Detected", `${disease} (${((disease / rows.length) * 100).toFixed(1)}%)`, "#ff7b72"],
              ["Healthy", `${healthy} (${((healthy / rows.length) * 100).toFixed(1)}%)`, "#63d7ab"],
              ["Avg Confidence", `${avgConf}%`, "#7fc8ff"],
            ].map(([label, value, color]) => (
              <motion.div key={label} className="metric-pill metric-pill-elevated" whileHover={{ y: -4 }} transition={{ duration: 0.18 }}>
                <div className="mp-label">{label}</div>
                <div className="mp-value" style={{ color }}>{value}</div>
              </motion.div>
            ))}
          </div>

          <div className="table-shell" style={{ marginTop: "1rem" }}>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {["age", "trestbps", "chol", "thalach", "Diagnosis", "Confidence", "Status"].map(header => <th key={header}>{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const result = results[index];
                    return (
                      <tr key={index}>
                        <td>{row.age}</td>
                        <td>{row.trestbps}</td>
                        <td>{row.chol}</td>
                        <td>{row.thalach}</td>
                        <td style={{ color: result.prediction === 1 ? "#ff7b72" : "#63d7ab" }}>{result.label}</td>
                        <td>{result.confidence}%</td>
                        <td>{result.prediction === 1 ? "High Risk" : "Low Risk"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="batch-charts">
            <PieChart disease={disease} healthy={healthy} />
            <ConfHistogram results={results} />
          </div>
        </motion.section>
      )}
    </div>
  );
}

function PieChart({ disease, healthy }) {
  const total = disease + healthy;
  if (!total) return null;
  const pct = disease / total;
  const circumference = 2 * Math.PI * 60;
  const diseaseLength = pct * circumference;
  const healthyLength = circumference - diseaseLength;

  return (
    <div className="chart-wrap chart-wrap-elevated">
      <div className="chart-title">Disease Distribution</div>
      <svg viewBox="0 0 160 160" className="pie-svg">
        <g transform="translate(80 80) rotate(-90)">
          <circle r="60" fill="none" stroke="#173627" strokeWidth="26" />
          <circle
            r="60"
            fill="none"
            stroke="#63d7ab"
            strokeWidth="26"
            strokeDasharray={`${healthyLength} ${circumference}`}
            strokeLinecap="round"
          />
          <circle
            r="60"
            fill="none"
            stroke="#ff7b72"
            strokeWidth="26"
            strokeDasharray={`${diseaseLength} ${circumference}`}
            strokeDashoffset={-healthyLength}
            strokeLinecap="round"
          />
        </g>
        <circle cx="80" cy="80" r="38" fill="#0d1725" />
        <text x="80" y="76" textAnchor="middle" fill="#f4f7fb" fontSize="16" fontWeight="700">{(pct * 100).toFixed(0)}%</text>
        <text x="80" y="94" textAnchor="middle" fill="#7e92aa" fontSize="10">Flagged</text>
        <text x="20" y="148" fill="#ff7b72" fontSize="9">High risk: {disease}</text>
        <text x="92" y="148" fill="#63d7ab" fontSize="9">Low risk: {healthy}</text>
      </svg>
    </div>
  );
}

function ConfHistogram({ results }) {
  const bins = Array(10).fill(0);
  results.forEach(result => {
    const bin = Math.min(Math.floor(result.confidence / 10), 9);
    bins[bin] += 1;
  });
  const max = Math.max(...bins) || 1;

  return (
    <div className="chart-wrap chart-wrap-elevated">
      <div className="chart-title">Confidence Distribution</div>
      <svg viewBox="0 0 200 120" className="hist-svg">
        {bins.map((count, index) => {
          const height = (count / max) * 80;
          const x = 10 + index * 18;
          return (
            <g key={index}>
              <rect x={x} y={90 - height} width={14} height={height} fill="#7fc8ff" opacity="0.9" rx={3} />
              <text x={x + 7} y={105} textAnchor="middle" fill="#7e92aa" fontSize="7">{index * 10}</text>
              {count > 0 && <text x={x + 7} y={83 - height} textAnchor="middle" fill="#d9e4ef" fontSize="7">{count}</text>}
            </g>
          );
        })}
        <text x="100" y="118" textAnchor="middle" fill="#5f738d" fontSize="8">Confidence %</text>
      </svg>
    </div>
  );
}
