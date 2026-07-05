import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import logo from "@/Assets/logo.png";
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
    <div className="min-h-screen flex items-center justify-center p-5 bg-white">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center flex flex-col items-center">
          <img
            src={logo}
            alt="ZimLink"
            className="w-64 md:w-80 mx-auto object-contain"
          />
        </div>

        {step === "details" ? (
          <form
            onSubmit={requestCode}
            className="rounded-2xl p-8 space-y-5 bg-neutral-100 border border-neutral-200 shadow-sm"
          >
            <h2 className="text-2xl font-medium text-black">
              Create account.
            </h2>

            <div>
              <label className="text-xs uppercase text-neutral-500">
                Name
              </label>
              <input
                className="w-full mt-2 h-11 rounded-lg px-3 bg-white border border-neutral-200 text-black outline-none focus:border-green-600"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs uppercase text-neutral-500">
                Email
              </label>
              <input
                type="email"
                className="w-full mt-2 h-11 rounded-lg px-3 bg-white border border-neutral-200 text-black outline-none focus:border-green-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="text-xs uppercase text-neutral-500">
                Phone number
              </label>
              <input
                type="tel"
                className="w-full mt-2 h-11 rounded-lg px-3 bg-white border border-neutral-200 text-black outline-none focus:border-green-600"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+263..."
              />
            </div>

            <div>
              <label className="text-xs uppercase text-neutral-500">
                Password
              </label>
              <input
                type="password"
                minLength={6}
                className="w-full mt-2 h-11 rounded-lg px-3 bg-white border border-neutral-200 text-black outline-none focus:border-green-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

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

            <button
              type="submit"
              disabled={busy || !agreedToTerms}
              className="w-full h-12 rounded-xl bg-green-600 text-white font-medium disabled:opacity-50"
            >
              {busy ? "Sending code..." : "Send 6-digit code"}
            </button>

            <p className="text-sm text-center text-neutral-500">
              Have an account?{" "}
              <Link to="/login" className="text-green-600 font-medium">
                Sign in
              </Link>
            </p>
          </form>
        ) : (
          <form
            onSubmit={verifyCode}
            className="rounded-2xl p-8 space-y-5 bg-neutral-100 border border-neutral-200 shadow-sm"
          >
            <h2 className="text-2xl font-medium text-black">
              Verify email.
            </h2>

            <p className="text-sm text-neutral-500">
              Enter code sent to{" "}
              <span className="text-black font-medium">{email}</span>
            </p>

            <input
              inputMode="numeric"
              maxLength={6}
              className="w-full h-14 text-center text-2xl tracking-[0.4em] rounded-lg bg-white border border-neutral-200 text-black outline-none focus:border-green-600"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              required
            />

            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full h-12 rounded-xl bg-green-600 text-white font-medium disabled:opacity-50"
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

        <TermsModal
          open={showTerms}
          onClose={() => setShowTerms(false)}
          onAccept={() => {
            setAgreedToTerms(true);
            setShowTerms(false);
          }}
        />
      </div>
    </div>
  );
}