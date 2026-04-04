import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import GridScanBackground from "../components/GridScanBackground";
import { FallingPattern } from "../components/ui/falling-pattern";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import CycleStatusButton from "../components/ui/status-cycle-button";

export default function AuthPage({ themeToggle }) {
  const { login } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", name: "", confirm: "" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const set = key => e => setForm(prev => ({ ...prev, [key]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setErr("");
    setOk("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login(form.username, form.password);
      } else {
        if (!form.name || !form.username || !form.password) {
          setErr("Fill all fields.");
          return;
        }
        if (form.password !== form.confirm) {
          setErr("Passwords do not match.");
          return;
        }
        await api.register(form.username, form.password, form.name);
        setOk("Account created. Please sign in.");
        setMode("login");
        setForm(prev => ({ ...prev, password: "", confirm: "" }));
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div className="auth-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
      <div className="auth-pattern-layer" aria-hidden="true">
        <FallingPattern
          className="auth-pattern"
          color="rgba(127, 200, 255, 0.82)"
          backgroundColor="transparent"
          duration={170}
          blurIntensity="0.8em"
          density={1.1}
        />
      </div>
      <GridScanBackground />
      <div className="auth-glow g1" />
      <div className="auth-glow g2" />
      <div className="auth-theme-toggle-wrap">
        {themeToggle}
      </div>

      <motion.div
        className={`auth-card ${mode === "register" ? "auth-card-register" : ""}`}
        initial={{ opacity: 0, y: 60, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <div className="auth-card-sheen" />
        <div className="auth-logo">
          <div className="auth-eyebrow">Cardiac Intelligence Workspace</div>
          <span className="logo-heart">VA</span>
          <h1>VitalAI</h1>
          <p>AI-powered vital analysis and health prediction</p>
          <div className="auth-meta-row">
            <span className="auth-meta-chip">Fast review flow</span>
            <span className="auth-meta-chip">Clean clinical UI</span>
            <span className="auth-meta-chip">Secure local access</span>
          </div>
        </div>

        <div className="auth-tabs">
          {["login", "register"].map(nextMode => (
            <button
              key={nextMode}
              className={mode === nextMode ? "active" : ""}
              onClick={() => {
                setMode(nextMode);
                setErr("");
                setOk("");
              }}
            >
              {mode === nextMode && <motion.span layoutId="auth-tab-pill" className="auth-tab-pill" transition={{ type: "spring", stiffness: 360, damping: 28 }} />}
              <span className="auth-tab-label">{nextMode === "login" ? "Sign In" : "Register"}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            className="auth-mode-copy"
          >
            <strong>{mode === "login" ? "Welcome back." : "Create your workspace access."}</strong>
            <span>
              {mode === "login"
                ? "Sign in to continue with predictions, batch review, and saved history."
                : "Register a new account to access the full VitalAI review workspace."}
            </span>
          </motion.div>
        </AnimatePresence>

        <form onSubmit={submit} className="auth-form">
          {err && <div className="msg err">{err}</div>}
          {ok && <div className="msg ok">{ok}</div>}

          <AnimatePresence initial={false}>
            {mode === "register" && (
              <motion.div
                className="field"
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <label>Full Name</label>
                <input value={form.name} onChange={set("name")} placeholder="Your full name" required />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="field">
            <label>Username</label>
            <input value={form.username} onChange={set("username")} placeholder="Enter username" required autoComplete="username" />
          </div>

          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder="Enter password"
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          <AnimatePresence initial={false}>
            {mode === "register" && (
              <motion.div
                className="field"
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                transition={{ duration: 0.22, delay: 0.03 }}
              >
                <label>Confirm Password</label>
                <input type="password" value={form.confirm} onChange={set("confirm")} placeholder="Re-enter password" required />
              </motion.div>
            )}
          </AnimatePresence>

          <CycleStatusButton
            type="submit"
            className="auth-btn auth-btn-premium"
            disabled={busy}
            cycleInterval={3500}
            statuses={
              busy
                ? mode === "login"
                  ? ["Authenticating", "Verifying Info", "Securing Session"]
                  : ["Creating Profile", "Allocating Space", "Finalizing"]
                : mode === "login"
                  ? ["Sign In", "Secure Access", "Enter Workspace"]
                  : ["Create Account", "Join VitalAI", "Start Analysis"]
            }
          >
            <span className="auth-btn-sheen" />
            <span className="auth-btn-text">
              {mode === "login" ? "Secure Access" : "Create Account"}
            </span>
            {busy && (
              <span className="spin" style={{ position: "absolute", left: "20px" }} />
            )}
          </CycleStatusButton>
        </form>

        {mode === "login" && (
          <p className="auth-hint">Default credentials: admin / admin123</p>
        )}
      </motion.div>
    </motion.div>
  );
}
