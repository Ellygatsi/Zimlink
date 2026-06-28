import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import logo from "@/Assets/logo.png";

export default function Register() {
  const { refresh } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const requestCode = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      await api.post("/auth/register/request-code", {
        name,
        email,
        password,
      });

      toast.success("Verification code sent to your email");
      setStep("code");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Could not send code";
      toast.error(typeof msg === "string" ? msg : "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      const { data } = await api.post("/auth/register/verify", {
        email,
        code,
      });

      localStorage.setItem("token", data.token);
      await refresh();
      toast.success("Account verified and created!");
      navigate("/home", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || "Verification failed";
      toast.error(typeof msg === "string" ? msg : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setBusy(true);

    try {
      await api.post("/auth/register/request-code", {
        name,
        email,
        password,
      });

      toast.success("New code sent");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Could not resend code";
      toast.error(typeof msg === "string" ? msg : "Could not resend code");
    } finally {
      setBusy(false);
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

        {step === "details" ? (
          <form onSubmit={requestCode} className="nb-card p-8 space-y-5 bg-white/95 backdrop-blur-sm" data-testid="register-form">
            <h2 className="text-3xl font-black">Create account.</h2>

            <div>
              <label className="overline">Name</label>
              <input className="nb-input mt-2" value={name} onChange={(e) => setName(e.target.value)} required data-testid="register-name-input" />
            </div>

            <div>
              <label className="overline">Email</label>
              <input type="email" className="nb-input mt-2" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="register-email-input" />
            </div>

            <div>
              <label className="overline">Password</label>
              <input type="password" minLength={6} className="nb-input mt-2" value={password} onChange={(e) => setPassword(e.target.value)} required data-testid="register-password-input" />
            </div>

            <button type="submit" disabled={busy} className="nb-btn w-full bg-[#22C55E] text-white text-base h-12" data-testid="register-submit-button">
              {busy ? "Sending code…" : "Send 6-Digit Code"}
            </button>

            <p className="text-sm text-center">
              Have an account? <Link to="/login" className="font-black underline" data-testid="go-to-login">Sign in</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="nb-card p-8 space-y-5 bg-white/95 backdrop-blur-sm" data-testid="verify-register-form">
            <h2 className="text-3xl font-black">Verify email.</h2>
            <p className="text-sm text-neutral-600">
              Enter the 6-digit code sent to <span className="font-bold">{email}</span>.
            </p>

            <div>
              <label className="overline">6-digit code</label>
              <input
                inputMode="numeric"
                maxLength={6}
                className="nb-input mt-2 text-center text-2xl font-black tracking-[0.4em] mono"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                data-testid="register-code-input"
              />
            </div>

            <button type="submit" disabled={busy || code.length !== 6} className="nb-btn w-full bg-[#22C55E] text-white text-base h-12" data-testid="verify-register-button">
              {busy ? "Verifying…" : "Verify & Create Account"}
            </button>

            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => setStep("details")} className="font-black underline">
                Change details
              </button>
              <button type="button" onClick={resendCode} disabled={busy} className="font-black underline">
                Resend code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}