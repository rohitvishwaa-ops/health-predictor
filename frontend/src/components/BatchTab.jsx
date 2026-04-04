import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { api } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { generateClinicalReport } from "../utils/pdfReport";

const FEATURES = ["age", "sex", "cp", "trestbps", "chol", "fbs", "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"];

const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
};

export default function BatchTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [preview, setPreview] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("all"); // all, high, safe
  const [sortBy, setSortBy] = useState("default"); // default, conf-desc

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

  const processedData = useMemo(() => {
    if (!results) return [];
    let combined = rows.map((row, i) => ({ ...row, ...results[i], originalIndex: i }));

    if (filter === "high") combined = combined.filter(d => d.prediction === 1);
    if (filter === "safe") combined = combined.filter(d => d.prediction === 0);

    if (sortBy === "conf-desc") combined.sort((a, b) => b.confidence - a.confidence);

    return combined;
  }, [rows, results, filter, sortBy]);

  const triageList = useMemo(() => {
    if (!results) return [];
    return rows
      .map((row, i) => ({ ...row, ...results[i] }))
      .filter(d => d.prediction === 1)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }, [rows, results]);

  const exportCSV = () => {
    if (!results) return;
    const headers = [...Object.keys(rows[0]), "AI_Risk", "AI_Confidence", "AI_Label"];
    const csvContent = [
      headers.join(","),
      ...rows.map((row, i) => {
        const res = results[i];
        return [...Object.values(row), res.prediction === 1 ? "High" : "Low", `${res.confidence}%`, res.label].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `VitalAI_Batch_Results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

            <div style={{ display: "flex", gap: "12px", marginTop: "1rem" }}>
              <button className="submit-btn" onClick={run} disabled={loading} style={{ flex: 1 }}>
                {loading ? <><span className="spin" /> Analysing...</> : "Run Predictions on All Patients"}
              </button>
              {results && (
                <button className="submit-btn" onClick={exportCSV} style={{ flex: 1 }}>
                  Export Results CSV ↓
                </button>
              )}
            </div>
          </>
        )}
      </motion.section>

      {results && (
        <motion.section className="result-root" {...reveal}>
          <div className="sec-title" style={{ marginTop: "1.4rem" }}>Summary</div>
          <div className="batch-pills">
            {[
              ["Total Patients", rows.length, "var(--text)"],
              ["Disease Detected", `${disease} (${((disease / rows.length) * 100).toFixed(1)}%)`, "var(--danger)"],
              ["Healthy", `${healthy} (${((healthy / rows.length) * 100).toFixed(1)}%)`, "var(--success)"],
              ["Avg Confidence", `${avgConf}%`, "var(--primary)"],
            ].map(([label, value, color]) => (
              <motion.div key={label} className="metric-pill metric-pill-elevated" whileHover={{ y: -4 }} transition={{ duration: 0.18 }}>
                <div className="mp-label">{label}</div>
                <div className="mp-value" style={{ color }}>{value}</div>
              </motion.div>
            ))}
          </div>

          {triageList.length > 0 && (
            <div className="triage-panel" style={{ marginTop: "1.5rem", padding: "1.2rem", background: "rgba(207, 79, 79, 0.08)", border: "1px solid rgba(207, 79, 79, 0.2)", borderRadius: "14px" }}>
              <div className="sec-title" style={{ color: "var(--danger)", marginBottom: "0.8rem", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>⚠</span> High-Risk Triage Priority (Top {triageList.length})
              </div>
              <div className="triage-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" }}>
                {triageList.map((p, i) => (
                  <div key={i} className="glass-card" style={{ padding: "10px", borderColor: "rgba(207, 79, 79, 0.3)" }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Patient Age: {p.age}</div>
                    <div style={{ fontWeight: 700, color: "var(--danger)", fontSize: "14px" }}>{p.confidence}% Confidence</div>
                    <div style={{ fontSize: "10px", marginTop: "4px" }}>{p.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: "12px", marginTop: "2rem", alignItems: "center" }}>
            <div className="sec-title" style={{ margin: 0 }}>Patient Ledger</div>
            <div className="filter-chips" style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
              {[
                ["all", "All Records"],
                ["high", "High Risk Only"],
                ["safe", "Normal Only"]
              ].map(([id, label]) => (
                <button 
                  key={id} 
                  className={`sidebar-btn ${filter === id ? "active" : ""}`} 
                  onClick={() => setFilter(id)}
                  style={{ padding: "6px 12px", fontSize: "11px" }}
                >
                  {label}
                </button>
              ))}
              <div style={{ width: "1px", background: "var(--border)", height: "20px", alignSelf: "center", margin: "0 4px" }} />
              <button 
                className={`sidebar-btn ${sortBy === "conf-desc" ? "active" : ""}`}
                onClick={() => setSortBy(sortBy === "default" ? "conf-desc" : "default")}
                style={{ padding: "6px 12px", fontSize: "11px" }}
              >
                Sort by Confidence ↓
              </button>
            </div>
          </div>

          <div className="table-shell" style={{ marginTop: "1rem" }}>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    {["Age", "BP", "Chol", "Max HR", "Diagnosis", "Confidence", "Status", "Report"].map(header => <th key={header}>{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {processedData.map((row, index) => {
                    return (
                      <tr key={index}>
                        <td>{row.age}</td>
                        <td>{row.trestbps}</td>
                        <td>{row.chol}</td>
                        <td>{row.thalach}</td>
                        <td style={{ color: row.prediction === 1 ? "var(--danger)" : "var(--success)" }}>{row.label}</td>
                        <td style={{ fontWeight: 700 }}>{row.confidence}%</td>
                        <td>
                          <span className={`workspace-prompt-badge ${row.prediction === 1 ? "danger" : "safe"}`} style={{ 
                            background: row.prediction === 1 ? "var(--danger-soft)" : "var(--success-soft)",
                            color: row.prediction === 1 ? "var(--danger)" : "var(--success)",
                            fontSize: "10px", padding: "2px 8px"
                          }}>
                            {row.prediction === 1 ? "High Risk" : "Low Risk"}
                          </span>
                        </td>
                        <td>
                          <button 
                            className="sidebar-btn" 
                            style={{ padding: "4px 8px", fontSize: "10px", minWidth: "auto" }}
                            onClick={() => generateClinicalReport(row, rows[row.originalIndex], { pqrst: {} }, user)}
                          >
                            Report ⭳
                          </button>
                        </td>
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
      <svg viewBox="0 0 160 170" className="pie-svg">
        <g transform="translate(80 74) rotate(-90)">
          <circle r="60" fill="none" stroke="#173627" strokeWidth="26" />
          <circle
            r="60"
            fill="none"
            stroke="var(--success)"
            strokeWidth="26"
            strokeDasharray={`${healthyLength} ${circumference}`}
            strokeLinecap="round"
          />
          <circle
            r="60"
            fill="none"
            stroke="var(--danger)"
            strokeWidth="26"
            strokeDasharray={`${diseaseLength} ${circumference}`}
            strokeDashoffset={-healthyLength}
            strokeLinecap="round"
          />
        </g>
        <circle cx="80" cy="74" r="38" className="pie-bg" />
        <text x="80" y="70" textAnchor="middle" fill="var(--text)" fontSize="16" fontWeight="700">{(pct * 100).toFixed(0)}%</text>
        <text x="80" y="88" textAnchor="middle" fill="var(--text-muted)" fontSize="10">Flagged</text>
        <text x="20" y="156" fill="var(--danger)" fontSize="9">High risk: {disease}</text>
        <text x="92" y="156" fill="var(--success)" fontSize="9">Low risk: {healthy}</text>
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
          const height = (count / max) * 66;
          const x = 10 + index * 18;
          return (
            <g key={index}>
              <rect x={x} y={90 - height} width={14} height={height} fill="var(--primary)" opacity="0.9" rx={3} />
              <text x={x + 7} y={105} textAnchor="middle" fill="var(--text-muted)" fontSize="7">{index * 10}</text>
              {count > 0 && <text x={x + 7} y={85 - height} textAnchor="middle" fill="var(--text)" fontSize="7">{count}</text>}
            </g>
          );
        })}
        <text x="100" y="118" textAnchor="middle" fill="var(--text-muted)" fontSize="8">Confidence %</text>
      </svg>
    </div>
  );
}
