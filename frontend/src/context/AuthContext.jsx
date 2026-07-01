import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);
const INACTIVITY_LIMIT = 5 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch (_e) {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch (_e) {}
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!localStorage.getItem("token")) return;
    timerRef.current = setTimeout(() => {
      logout();
      window.location.href = "/login?reason=inactive";
    }, INACTIVITY_LIMIT);
  }, [logout]);

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    setUser(data.user);
    resetTimer();
    return data.user;
  };

  const register = async (email, password, name) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    localStorage.setItem("token", data.token);
    setUser(data.user);
    resetTimer();
    return data.user;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);