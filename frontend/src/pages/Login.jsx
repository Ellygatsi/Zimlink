import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import logo from "@/Assets/logo.png";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reason = new URLSearchParams(location.search).get("reason");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetStep, setResetStep] = useState("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      const destination = location.state?.from?.pathname || "/home";
      navigate(destination === "/" ? "/home" : destination, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || "Login failed";
      toast.error(typeof msg === "string" ? msg : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const openReset = () => {
    setResetEmail(email || "");
    setResetCode("");
    setNewPassword("");
    setResetStep("email");
    setShowReset(true);
  };

  const requestResetCode = async (e) => {
    e.preventDefault();
    setResetBusy(true);
    try {
      await api.post("/auth/password-reset/request-code", { email: resetEmail });
      toast.success("If that email exists, a reset code has been sent");
      setResetStep("code");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Could not send reset code";
      toast.error(typeof msg === "string" ? msg : "Could not send reset code");
    } finally {
      setResetBusy(false);
    }
  };

  const confirmReset = async (e) => {
    e.preventDefault();
    setResetBusy(true);
    try {
      await api.post("/auth/password-reset/confirm", {
        email: resetEmail,
        code: resetCode,
        new_password: newPassword,
      });
      toast.success("Password reset successful. You can sign in now.");
      setEmail(resetEmail);
      setPassword("");
      setShowReset(false);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Password reset failed";
      toast.error(typeof msg === "string" ? msg : "Password reset failed");
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-white dark:bg-black transition-colors">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center flex flex-col items-center">
          <img src={logo} alt="ZimLink" className="w-64 md:w-80 mx-auto object-contain -mb-10" />
          <p className="text-[11px] tracking-[0.2em] text-neutral-500 mt-0 uppercase">
            Connecting Zimbabwe. Connecting you.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl p-8 space-y-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
          data-testid="login-form"
        >
          <h2 className="text-2xl font-medium text-black dark:text-white">Welcome back.</h2>

          {reason === "inactive" && (
            <div className="rounded-lg px-4 py-3 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700">
              <p className="text-xs text-amber-800 dark:text-amber-300 text-center">
                You were signed out due to inactivity.
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Email</label>
            <input
              type="email"
              className="w-full mt-2 h-11 rounded-lg px-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="login-email-input"
            />
          </div>

          <div>
            <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Password</label>
            <input
              type="password"
              className="w-full mt-2 h-11 rounded-lg px-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="login-password-input"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full h-12 rounded-xl bg-green-600 text-black font-medium disabled:opacity-50"
            data-testid="login-submit-button"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <button
            type="button"
            onClick={openReset}
            className="w-full text-sm font-medium text-green-600 dark:text-green-500"
            data-testid="forgot-password-button"
          >
            Forgot password?
          </button>

          <p className="text-sm text-center text-neutral-500">
            New here?{" "}
            <Link to="/register" className="font-medium text-green-600 dark:text-green-500" data-testid="go-to-register">
              Create an account
            </Link>
          </p>
        </form>
      </div>

      {showReset && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setShowReset(false)}>
          <form
            onSubmit={resetStep === "email" ? requestResetCode : confirmReset}
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl p-6 w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4"
            data-testid="password-reset-modal"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium text-black dark:text-white">Reset password</h2>
              <button type="button" className="text-xl text-neutral-500" onClick={() => setShowReset(false)}>×</button>
            </div>

            {resetStep === "email" ? (
              <>
                <p className="text-sm text-neutral-500">Enter your email and we will send a 6-digit reset code.</p>
                <div>
                  <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Email</label>
                  <input
                    type="email"
                    className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    data-testid="reset-email-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetBusy}
                  className="w-full h-12 rounded-xl bg-green-600 text-black font-medium disabled:opacity-50"
                  data-testid="send-reset-code-button"
                >
                  {resetBusy ? "Sending…" : "Send reset code"}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-neutral-500">
                  Enter the code sent to <span className="font-medium text-black dark:text-white">{resetEmail}</span>, then choose a new password.
                </p>
                <div>
                  <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">6-digit code</label>
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    className="w-full mt-2 h-14 rounded-lg text-center text-2xl font-medium tracking-[0.4em] bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    data-testid="reset-code-input"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">New password</label>
                  <input
                    type="password"
                    minLength={6}
                    className="w-full mt-2 h-11 rounded-lg px-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    data-testid="new-password-input"
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetBusy || resetCode.length !== 6}
                  className="w-full h-12 rounded-xl bg-green-600 text-black font-medium disabled:opacity-50"
                  data-testid="confirm-reset-button"
                >
                  {resetBusy ? "Resetting…" : "Reset password"}
                </button>
                <button
                  type="button"
                  onClick={requestResetCode}
                  disabled={resetBusy}
                  className="w-full text-sm font-medium text-green-600 dark:text-green-500"
                >
                  Resend code
                </button>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
}