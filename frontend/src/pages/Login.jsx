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
    <div className="min-h-screen flex items-center justify-center p-5 relative">
      <div className="fixed top-0 left-0 right-0 z-50 flex h-[4px]">
        <div className="flex-1" style={{ background: "#009639" }} />
        <div className="flex-1" style={{ background: "#FFCD00" }} />
        <div className="flex-1" style={{ background: "#DE2010" }} />
        <div className="flex-1" style={{ background: "#0A0A0A" }} />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 text-center flex flex-col items-center">
          <img
            src={logo}
            alt="ZimLink"
            className="w-80 md:w-[360px] mx-auto object-contain drop-shadow-lg -mb-18"
          />

          <p className="overline text-neutral-700 mt-0 tracking-[0.2em]">
            CONNECTING ZIMBABWE. CONNECTING YOU.
          </p>
        </div>

        <form onSubmit={submit} className="nb-card p-8 space-y-5 bg-white/95 backdrop-blur-sm" data-testid="login-form">
          <h2 className="text-3xl font-black">Welcome back.</h2>

          <div>
            <label className="overline">Email</label>
            <input type="email" className="nb-input mt-2" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="login-email-input" />
          </div>

          <div>
            <label className="overline">Password</label>
            <input type="password" className="nb-input mt-2" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="login-password-input" />
          </div>

          <button type="submit" disabled={busy} className="nb-btn w-full bg-[#22C55E] text-white text-base h-12" data-testid="login-submit-button">
            {busy ? "Signing in…" : "Sign In"}
          </button>

          <button type="button" onClick={openReset} className="w-full text-sm font-black underline" data-testid="forgot-password-button">
            Forgot password?
          </button>

          <p className="text-sm text-center">
            New here? <Link to="/register" className="font-black underline" data-testid="go-to-register">Create an account</Link>
          </p>
        </form>
      </div>

      {showReset && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setShowReset(false)}>
          <form
            onSubmit={resetStep === "email" ? requestResetCode : confirmReset}
            onClick={(e) => e.stopPropagation()}
            className="nb-card p-6 w-full max-w-md bg-white space-y-4"
            data-testid="password-reset-modal"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">Reset password</h2>
              <button type="button" className="font-black text-xl" onClick={() => setShowReset(false)}>×</button>
            </div>

            {resetStep === "email" ? (
              <>
                <p className="text-sm text-neutral-600">Enter your email and we will send a 6-digit reset code.</p>

                <div>
                  <label className="overline">Email</label>
                  <input type="email" className="nb-input mt-2" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required data-testid="reset-email-input" />
                </div>

                <button type="submit" disabled={resetBusy} className="nb-btn w-full bg-[#22C55E] text-white h-12" data-testid="send-reset-code-button">
                  {resetBusy ? "Sending…" : "Send Reset Code"}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-neutral-600">Enter the code sent to <span className="font-bold">{resetEmail}</span>, then choose a new password.</p>

                <div>
                  <label className="overline">6-digit code</label>
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    className="nb-input mt-2 text-center text-2xl font-black tracking-[0.4em] mono"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    data-testid="reset-code-input"
                  />
                </div>

                <div>
                  <label className="overline">New password</label>
                  <input type="password" minLength={6} className="nb-input mt-2" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required data-testid="new-password-input" />
                </div>

                <button type="submit" disabled={resetBusy || resetCode.length !== 6} className="nb-btn w-full bg-[#22C55E] text-white h-12" data-testid="confirm-reset-button">
                  {resetBusy ? "Resetting…" : "Reset Password"}
                </button>

                <button type="button" onClick={requestResetCode} disabled={resetBusy} className="w-full text-sm font-black underline">
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