import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

// Normal inactivity timeout: 30 minutes
const INACTIVITY_LIMIT = 30 * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // This should be true while a call is ringing, connecting, or active.
  const [callInProgress, setCallInProgress] = useState(false);

  const timerRef = useRef(null);
  const callInProgressRef = useRef(false);

  useEffect(() => {
    callInProgressRef.current = callInProgress;
  }, [callInProgress]);

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
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    try {
      await api.post("/auth/logout");
    } catch (_e) {
      // Ignore backend logout failure and clear the local session.
    }

    localStorage.removeItem("token");
    setUser(null);
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!localStorage.getItem("token")) {
      return;
    }

    // Do not run an inactivity logout timer while a call is in progress.
    if (callInProgressRef.current) {
      return;
    }

    timerRef.current = setTimeout(() => {
      // Check again before logging out in case a call started
      // after the timer was created.
      if (callInProgressRef.current) {
        resetTimer();
        return;
      }

      logout();
      window.location.href = "/login?reason=inactive";
    }, INACTIVITY_LIMIT);
  }, [logout]);

  useEffect(() => {
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    const handleActivity = () => {
      resetTimer();
    };

    events.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, {
        passive: true,
      });
    });

    resetTimer();

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [resetTimer]);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // While a call is active, leave the timer disabled.
    // Once the call ends, begin a fresh inactivity period.
    if (!callInProgress) {
      resetTimer();
    }
  }, [callInProgress, resetTimer]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", {
      email,
      password,
    });

    localStorage.setItem("token", data.token);
    setUser(data.user);
    resetTimer();

    return data.user;
  };

  const register = async (email, password, name) => {
    const { data } = await api.post("/auth/register", {
      email,
      password,
      name,
    });

    localStorage.setItem("token", data.token);
    setUser(data.user);
    resetTimer();

    return data.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refresh,
        setUser,
        callInProgress,
        setCallInProgress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);