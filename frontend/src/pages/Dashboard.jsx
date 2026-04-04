import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import DoctorMode from "../components/DoctorMode";
import PatientMode from "../components/PatientMode";
import ResultPanel from "../components/ResultPanel";
import { generateClinicalReport } from "../utils/pdfReport";
import BatchTab from "../components/BatchTab";
import HistoryTab from "../components/HistoryTab";

const TABS = [
  { id: "predict", icon: "◌", label: "Predict", blurb: "Run a guided heart health assessment" },
  { id: "batch", icon: "▣", label: "Batch Upload", blurb: "Process multiple patient records quickly" },
  { id: "history", icon: "◷", label: "History", blurb: "Review saved results and past assessments" },
];

const pageMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
};

const staggerShell = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const revealBlock = {
  initial: { opacity: 0, y: 18, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
};

export default function Dashboard({ themeToggle }) {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState("predict");
  const [mode, setMode] = useState("doctor");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const switchMode = nextMode => {
    setMode(nextMode);
    setResult(null);
  };

  const onResult = (res, inputs, extra, modelUsed) => {
    setResult({ res, inputs, extra, modelUsed });
    setTimeout(() => document.getElementById("result-anchor")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <div className="app-root">
      <nav className="navbar">
        <div className="nav-brand-wrap">
          <div className="nav-brand-mark">VA</div>
          <div>
            <div className="nav-brand" style={{ display: "flex", gap: "1px" }}>
              {"Vital".split("").map((char, index) => (
                <motion.span key={`v-${index}`} animate={{ y: [0, -4, 0] }} transition={{ duration: 1.8, repeat: Infinity, delay: index * 0.12, ease: "easeInOut" }}>{char}</motion.span>
              ))}
              <span style={{ display: "flex", gap: "1px" }}>
                {"AI".split("").map((char, index) => (
                  <motion.span key={`a-${index}`} animate={{ y: [0, -4, 0] }} transition={{ duration: 1.8, repeat: Infinity, delay: ("Vital".length + index) * 0.12, ease: "easeInOut" }}>{char}</motion.span>
                ))}
              </span>
            </div>
            <div className="nav-brand-sub">Clinical-grade heart risk screening workspace</div>
          </div>
        </div>
        <div className="nav-actions">
          {themeToggle}
          <div className="nav-user-card">
            <span className="nav-user-kicker">Logged in as</span>
            <strong>{user?.name}</strong>
          </div>
        </div>
      </nav>

      <div className="app-body">
        <aside className="sidebar">
          <div className="sidebar-panel">
            <div className="sidebar-greeting">Welcome back</div>
            <div className="sidebar-user">{user?.name}</div>
            <div className="sidebar-copy">
              Move between prediction, batch review, and history from one clean workspace.
            </div>
          </div>

          <div className="sidebar-nav">
            {TABS.map(({ id, icon, label, blurb }) => (
              <button
                key={id}
                className={`sidebar-btn ${tab === id ? "active" : ""}`}
                onClick={() => setTab(id)}
              >
                <span className="sidebar-btn-icon">{icon}</span>
                <span>
                  <span className="sidebar-btn-label">{label}</span>
                  <span className="sidebar-btn-copy">{blurb}</span>
                </span>
              </button>
            ))}
          </div>

          <hr className="sidebar-divider" />

          <button className="sidebar-btn sidebar-btn-ghost" onClick={logout}>
            <span className="sidebar-btn-icon">↗</span>
            <span>
              <span className="sidebar-btn-label">Logout</span>
              <span className="sidebar-btn-copy">Sign out of your account securely</span>
            </span>
          </button>
        </aside>

        <main className="main-content">
          <AnimatePresence mode="wait">
            {tab === "predict" && (
              <motion.section key="predict" className="page-shell" {...pageMotion} variants={staggerShell} initial="initial" animate="animate">
                <motion.div className="page-hero" variants={revealBlock}>
                  <div>
                    <div className="page-eyebrow">Cardiac Intelligence</div>
                    <h2 className="tab-title">Patient Vital Analysis</h2>
                    <p className="tab-caption">
                      Switch between a clinical workflow and a guided common-user flow with the same polished review experience.
                    </p>
                  </div>

                  <div className="page-hero-card">
                    <span className="page-hero-kicker">Active workspace</span>
                    <strong>{mode === "doctor" ? "Doctor Mode" : "Common Mode"}</strong>
                    <span>
                      {mode === "doctor"
                        ? "High-precision diagnostic entry"
                        : "Simple guided self-reporting experience"}
                    </span>
                  </div>
                </motion.div>

                <motion.div className="mode-panel" variants={revealBlock}>
                  <div className="sec-title">Select Mode</div>
                  <div className="mode-toggle">
                    {[["doctor", "Doctor Mode"], ["patient", "Common Mode"]].map(([id, label]) => (
                      <button
                        key={id}
                        className={`mode-btn ${mode === id ? "active" : ""}`}
                        onClick={() => switchMode(id)}
                      >
                        <span className="mode-btn-title">{label}</span>
                        <span className="mode-btn-copy">
                          {id === "doctor"
                            ? "For clinicians and precise parameter input"
                            : "For clear guided answers and report-based entry"}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>

                {loading && (
                  <motion.div className="loading-overlay glass-card" variants={revealBlock}>
                    <span className="spin-lg" />
                    <span>Analysing patient data and preparing the report...</span>
                  </motion.div>
                )}

                <motion.div className="content-card" variants={revealBlock}>
                  {mode === "doctor"
                    ? <DoctorMode onResult={onResult} onLoading={setLoading} hasResult={!!result} onDownload={(e) => { e.preventDefault(); generateClinicalReport(result.res, result.inputs, result.extra, user); }} />
                    : <PatientMode onResult={onResult} onLoading={setLoading} hasResult={!!result} onDownload={(e) => { e.preventDefault(); generateClinicalReport(result.res, result.inputs, result.extra, user); }} />}
                </motion.div>

                <div id="result-anchor" />
                {result ? (
                  <ResultPanel
                    result={result.res}
                    inputs={result.inputs}
                    extra={result.extra}
                    modelUsed={result.modelUsed}
                  />
                ) : (
                  <motion.div className="workspace-prompt glass-card" variants={revealBlock}>
                    <div className="workspace-prompt-badge">Ready For Review</div>
                    <div className="workspace-prompt-title">Run a prediction to unlock the full clinical dashboard.</div>
                    <div className="workspace-prompt-copy">
                      Your result summary, animated confidence visuals, ECG reconstruction, and reviewer-friendly risk breakdown will appear here after analysis.
                    </div>
                  </motion.div>
                )}
              </motion.section>
            )}

            {tab === "batch" && (
              <motion.section key="batch" className="page-shell" {...pageMotion}>
                <BatchTab />
              </motion.section>
            )}

            {tab === "history" && (
              <motion.section key="history" className="page-shell" {...pageMotion}>
                <HistoryTab />
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
