import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);   // { username, name }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (api.isLoggedIn()) {
      api.me()
        .then(d => setUser({ username: d.username, name: d.name }))
        .catch(() => { api.logout(); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const d = await api.login(username, password);
    setUser({ username: d.username, name: d.name });
    return d;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, login, logout, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
