import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import logo from "@/Assets/logo.png";
import logoDark from "@/Assets/logo-dark.png";

import TermsModal from "@/components/TermsModal";

export default function Register() {
  const { refresh } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState("details");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");

  const [busy, setBusy] = useState(false);

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const requestCode = async (e) => {
    e.preventDefault();

    if (!agreedToTerms) {
      toast.error("You must accept the Terms & Conditions to continue.");
      return;
    }

    setBusy(true);
    try {
      await api.post("/auth/register/request-code", {
        name,
        email,
        password,
        phone,
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
        phone,
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
    <div className="min-h-screen flex items-center justify-center p-5 bg-white dark:bg-black transition-colors">
      <div className="w-full max-w-md">

        {/* LOGO */}
        <div className="mb-8 text-center flex flex-col items-center">
          <img
            src={logo}
            alt="ZimLink"
            className="w-64 md:w-80 mx-auto object-contain -mb-10 dark:hidden"
          />
          <img
            src={logoDark}
            alt="ZimLink"
            className="w-64 md:w-80 mx-auto object-contain -mb-10 hidden dark:block"
          />
          <p className="text-[11px] tracking-[0.2em] text-neutral-500 mt-0 uppercase">
            Connecting Zimbabwe. Connecting you.
          </p>
        </div>

        {/* STEP 1 - DETAILS */}
        {step === "details" ? (
          <form
            onSubmit={requestCode}
            className="rounded-2xl p-8 space-y-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
          >
            <h2 className="text-2xl font-medium text-black dark:text-white">
              Create account.
            </h2>

            {/* NAME */}
            <div>
              <label className="text-xs uppercase text-neutral-500">
                Name
              </label>
              <input
                className="w-full mt-2 h-11 rounded-lg px-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="text-xs uppercase text-neutral-500">
                Email
              </label>
              <input
                type="email"
                className="w-full mt-2 h-11 rounded-lg px-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* PHONE */}
            <div>
              <label className="text-xs uppercase text-neutral-500">
                Phone number
              </label>
              <input
                type="tel"
                className="w-full mt-2 h-11 rounded-lg px-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+263..."
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="text-xs uppercase text-neutral-500">
                Password
              </label>
              <input
                type="password"
                minLength={6}
                className="w-full mt-2 h-11 rounded-lg px-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* TERMS */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 accent-green-600"
              />

              <span className="text-[11px] text-neutral-500 leading-relaxed">
                I have read and agree to the{" "}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-green-600 underline font-medium"
                >
                  Terms & Conditions
                </button>
              </span>
            </label>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={busy || !agreedToTerms}
              className="w-full h-12 rounded-xl bg-green-600 text-black font-medium disabled:opacity-50"
            >
              {busy ? "Sending code..." : "Send 6-digit code"}
            </button>

            <p className="text-sm text-center text-neutral-500">
              Have an account?{" "}
              <Link
                to="/login"
                className="text-green-600 font-medium"
              >
                Sign in
              </Link>
            </p>
          </form>
        ) : (
          /* STEP 2 - VERIFY */
          <form
            onSubmit={verifyCode}
            className="rounded-2xl p-8 space-y-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
          >
            <h2 className="text-2xl font-medium text-black dark:text-white">
              Verify email.
            </h2>

            <p className="text-sm text-neutral-500">
              Enter code sent to{" "}
              <span className="text-black dark:text-white font-medium">
                {email}
              </span>
            </p>

            <input
              inputMode="numeric"
              maxLength={6}
              className="w-full h-14 text-center text-2xl tracking-[0.4em] rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />

            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full h-12 rounded-xl bg-green-600 text-black font-medium disabled:opacity-50"
            >
              {busy ? "Verifying..." : "Verify & create account"}
            </button>

            <div className="flex justify-between text-sm">
              <button
                type="button"
                onClick={() => setStep("details")}
                className="text-green-600 font-medium"
              >
                Change details
              </button>

              <button
                type="button"
                onClick={resendCode}
                className="text-green-600 font-medium"
              >
                Resend code
              </button>
            </div>
          </form>
        )}

        {/* TERMS MODAL */}
        <TermsModal
          open={showTerms}
          onClose={() => setShowTerms(false)}
          onAccept={() => {
            setAgreedToTerms(true);
          }}
        />
      </div>
    </div>
  );
}