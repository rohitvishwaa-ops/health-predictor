const BASE = import.meta.env.VITE_API_URL || "";

function token() { return localStorage.getItem("vitalai_token"); }

async function req(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token()) headers["Authorization"] = `Bearer ${token()}`;
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...headers, ...opts.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export const api = {
  // auth
  register: (username, password, name) =>
    req("/auth/register", { method: "POST", body: JSON.stringify({ username, password, name }) }),

  login: async (username, password) => {
    const d = await req("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
    localStorage.setItem("vitalai_token", d.token);
    localStorage.setItem("vitalai_user", JSON.stringify({ username: d.username, name: d.name }));
    return d;
  },

  logout: async () => {
    await req("/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem("vitalai_token");
    localStorage.removeItem("vitalai_user");
  },

  me: () => req("/auth/me"),
  isLoggedIn: () => !!token(),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem("vitalai_user") || "null"); }
    catch { return null; }
  },

  // predictions
  predictDoctor:  (payload)  => req("/predict/doctor",  { method: "POST", body: JSON.stringify(payload) }),
  predictPatient: (payload)  => req("/predict/patient", { method: "POST", body: JSON.stringify(payload) }),
  predictBatch:   (rows)     => req("/predict/batch",   { method: "POST", body: JSON.stringify({ data: rows }) }),

  // history
  getHistory:   () => req("/history"),
  clearHistory: () => req("/history", { method: "DELETE" }),
};
