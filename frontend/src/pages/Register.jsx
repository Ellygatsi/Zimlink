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
    <div className="min-h-screen flex items-center justify-center p-5 relative bg-white dark:bg-black transition-colors">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center flex flex-col items-center">
          <img src={logo} alt="ZimLink" className="w-64 md:w-80 mx-auto object-contain -mb-10" />
          <p className="text-[11px] tracking-[0.2em] text-neutral-500 mt-0 uppercase">
            Connecting Zimbabwe. Connecting you.
          </p>
        </div>

        {step === "details" ? (
          <form
            onSubmit={requestCode}
            className="rounded-2xl p-8 space-y-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
            data-testid="register-form"
          >
            <h2 className="text-2xl font-medium text-black dark:text-white">Create account.</h2>

            <div>
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Name</label>
              <input
                className="w-full mt-2 h-11 rounded-lg px-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="register-name-input"
              />
            </div>

            <div>
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Email</label>
              <input
                type="email"
                className="w-full mt-2 h-11 rounded-lg px-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="register-email-input"
              />
            </div>

            <div>
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">Password</label>
              <input
                type="password"
                minLength={6}
                className="w-full mt-2 h-11 rounded-lg px-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="register-password-input"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-xl bg-green-600 text-black font-medium disabled:opacity-50"
              data-testid="register-submit-button"
            >
              {busy ? "Sending code…" : "Send 6-digit code"}
            </button>

            <p className="text-sm text-center text-neutral-500">
              Have an account?{" "}
              <Link to="/login" className="font-medium text-green-600 dark:text-green-500" data-testid="go-to-login">
                Sign in
              </Link>
            </p>
          </form>
        ) : (
          <form
            onSubmit={verifyCode}
            className="rounded-2xl p-8 space-y-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
            data-testid="verify-register-form"
          >
            <h2 className="text-2xl font-medium text-black dark:text-white">Verify email.</h2>
            <p className="text-sm text-neutral-500">
              Enter the 6-digit code sent to <span className="font-medium text-black dark:text-white">{email}</span>.
            </p>

            <div>
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">6-digit code</label>
              <input
                inputMode="numeric"
                maxLength={6}
                className="w-full mt-2 h-14 rounded-lg text-center text-2xl font-medium tracking-[0.4em] bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                data-testid="register-code-input"
              />
            </div>

            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full h-12 rounded-xl bg-green-600 text-black font-medium disabled:opacity-50"
              data-testid="verify-register-button"
            >
              {busy ? "Verifying…" : "Verify & create account"}
            </button>

            <div className="flex justify-between text-sm">
              <button type="button" onClick={() => setStep("details")} className="font-medium text-green-600 dark:text-green-500">
                Change details
              </button>
              <button type="button" onClick={resendCode} disabled={busy} className="font-medium text-green-600 dark:text-green-500">
                Resend code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}