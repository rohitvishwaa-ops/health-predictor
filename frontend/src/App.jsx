import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import "./styles/global.css";

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("vitalai-theme") || "dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("vitalai-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(current => current === "dark" ? "light" : "dark");
  const themeToggle = (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-pressed={theme === "light"}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-icon theme-toggle-sun">☼</span>
        <span className="theme-toggle-icon theme-toggle-moon">☾</span>
        <span className="theme-toggle-thumb" />
      </span>
      <span className="theme-toggle-text" aria-hidden="true">
        {theme === "dark" ? "Dark mode" : "Light mode"}
      </span>
    </button>
  );

  return (
    <AuthProvider>
      <ThemedApp themeToggle={themeToggle} />
    </AuthProvider>
  );
}

function ThemedApp({ themeToggle }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="splash">
        <div className="splash-heart">VA</div>
      </div>
    );
  }

  return user ? <Dashboard themeToggle={themeToggle} /> : <AuthPage themeToggle={themeToggle} />;
}
