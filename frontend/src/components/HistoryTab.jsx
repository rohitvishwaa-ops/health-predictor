import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { api } from "../services/api";

export default function HistoryTab() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getHistory();
      setHistory(data.history || []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const flaggedCount = history.filter(entry => entry.severity === "danger").length;
  const lowRiskCount = history.length - flaggedCount;
  const avgConfidence = history.length
    ? Math.round(history.reduce((sum, entry) => sum + Number(entry.confidence || 0), 0) / history.length)
    : 0;

  const clear = async () => {
    await api.clearHistory();
    setHistory([]);
  };

  return (
    <div className="history-tab">
      <div className="page-hero">
        <div>
          <div className="page-eyebrow">Saved Activity</div>
          <h2 className="tab-title">Prediction History</h2>
          <p className="tab-caption">A cleaner record stream for reviewing previous assessments, confidence scores, and risk labels.</p>
        </div>
        <div className="page-hero-card">
          <span className="page-hero-kicker">Records</span>
          <strong>{loading ? "Loading" : `${history.length} saved`}</strong>
          <span>Everything tied to the current account and available across sessions.</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-row glass-card"><span className="spin" /> Loading history...</div>
      ) : history.length === 0 ? (
        <div className="empty-history glass-card">
          <div className="empty-state-icon">H</div>
          <div className="empty-state-title">Your review history will appear here as soon as predictions are saved.</div>
          <div className="empty-state-copy">
            Use Predict mode to generate cases, then come back here for a cleaner audit trail with confidence, diagnosis, and risk labeling in one place.
          </div>
          <div className="empty-state-points">
            <span>Saved per account session</span>
            <span>Designed for quick reviewer scanning</span>
            <span>Clear separation of low and high risk outcomes</span>
          </div>
        </div>
      ) : (
        <>
          <div className="batch-pills history-pills">
            {[
              ["Saved Cases", history.length, "#f4f7fb"],
              ["High Risk", flaggedCount, "#ff7b72"],
              ["Low Risk", lowRiskCount, "#63d7ab"],
              ["Avg Confidence", `${avgConfidence}%`, "#7fc8ff"],
            ].map(([label, value, color]) => (
              <motion.div key={label} className="metric-pill metric-pill-elevated" whileHover={{ y: -4 }} transition={{ duration: 0.18 }}>
                <div className="mp-label">{label}</div>
                <div className="mp-value" style={{ color }}>{value}</div>
              </motion.div>
            ))}
          </div>

          <div className="history-actions">
            <div className="sec-title">{history.length} saved records</div>
            <button className="btn-secondary" onClick={clear}>Clear History</button>
          </div>
          <div className="hist-list">
            {history.map((entry, index) => {
              const danger = entry.severity === "danger";
              return (
                <motion.div
                  key={`${entry.timestamp}-${index}`}
                  className={`hist-item ${danger ? "hist-item-danger" : "hist-item-safe"}`}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.22 }}
                  whileHover={{ y: -3 }}
                >
                  <div>
                    <div className="hist-diag" style={{ color: danger ? "#ff7b72" : "#63d7ab" }}>
                      {entry.diagnosis}
                    </div>
                    <div className="hist-meta">{entry.timestamp} · {entry.confidence}% confidence</div>
                  </div>
                  <span className={danger ? "badge-danger" : "badge-safe"}>
                    {danger ? "High Risk" : "Low Risk"}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
