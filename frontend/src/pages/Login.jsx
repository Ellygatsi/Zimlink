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
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetStep, setResetStep] = useState("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const isReturningUser =
    localStorage.getItem("zimlink_has_logged_in") === "true";

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      await login(email, password);
      localStorage.setItem("zimlink_has_logged_in", "true");
      toast.success("Welcome back!");
      navigate("/home", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || "Login failed";
      toast.error(typeof msg === "string" ? msg : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const resetForgotPasswordState = () => {
    setResetStep("email");
    setResetEmail("");
    setResetCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setShowNewPassword(false);
    setResetBusy(false);
  };

  const openForgotPassword = () => {
    resetForgotPasswordState();
    setResetEmail(email.trim());
    setShowForgotPassword(true);
  };

  const closeForgotPassword = () => {
    if (resetBusy) return;
    setShowForgotPassword(false);
    resetForgotPasswordState();
  };

  const requestResetCode = async (e) => {
    e.preventDefault();

    const normalizedEmail = resetEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error("Enter your email address.");
      return;
    }

    setResetBusy(true);

    try {
      await api.post("/auth/password-reset/request-code", {
        email: normalizedEmail,
      });

      setResetEmail(normalizedEmail);
      setResetStep("code");
      toast.success("A 6-digit code has been sent to your email.");
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "Could not send the verification code.";

      toast.error(
        typeof msg === "string"
          ? msg
          : "Could not send the verification code."
      );
    } finally {
      setResetBusy(false);
    }
  };

  const continueFromCode = (e) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(resetCode)) {
      toast.error("Enter the 6-digit code sent to your email.");
      return;
    }

    setResetStep("password");
  };

  const updatePassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("Your new password must contain at least 6 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("The passwords do not match.");
      return;
    }

    setResetBusy(true);

    try {
      await api.post("/auth/password-reset/confirm", {
        email: resetEmail.trim().toLowerCase(),
        code: resetCode,
        new_password: newPassword,
      });

      setResetStep("success");
      toast.success("Your password has been updated.");
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "The verification code is invalid or has expired.";

      toast.error(
        typeof msg === "string"
          ? msg
          : "The verification code is invalid or has expired."
      );

      if (
        typeof msg === "string" &&
        (msg.toLowerCase().includes("code") ||
          msg.toLowerCase().includes("expired"))
      ) {
        setResetStep("code");
      }
    } finally {
      setResetBusy(false);
    }
  };

  const resendCode = async () => {
    setResetBusy(true);

    try {
      await api.post("/auth/password-reset/request-code", {
        email: resetEmail.trim().toLowerCase(),
      });

      setResetCode("");
      toast.success("A new 6-digit code has been sent.");
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "Could not resend the verification code.";

      toast.error(
        typeof msg === "string"
          ? msg
          : "Could not resend the verification code."
      );
    } finally {
      setResetBusy(false);
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

        <form
          onSubmit={submit}
          className="rounded-2xl p-8 space-y-5 bg-neutral-100 border border-neutral-200 shadow-sm"
          data-testid="login-form"
        >
          <h2 className="text-2xl font-medium text-black">
            {isReturningUser ? "Welcome back." : "Sign in to continue."}
          </h2>

          {reason === "inactive" && (
            <div className="rounded-lg px-4 py-3 bg-amber-100 border border-amber-300">
              <p className="text-xs text-amber-800 text-center">
                You were signed out due to inactivity.
              </p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
              Email
            </label>

            <input
              type="email"
              autoComplete="email"
              className="w-full mt-2 h-11 rounded-lg px-3 bg-white border border-neutral-200 outline-none focus:border-green-600 text-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="login-email-input"
            />
          </div>

          <div>
            <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
              Password
            </label>

            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="w-full h-11 rounded-lg px-3 pr-11 bg-white border border-neutral-200 outline-none focus:border-green-600 text-black"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="login-password-input"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-neutral-500 hover:text-neutral-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
                data-testid="toggle-password-visibility"
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a10.94 10.94 0 012.83-4.13M6.1 6.1A9.98 9.98 0 0112 5c5 0 9.27 3.11 11 7.5a10.97 10.97 0 01-4.29 5.13M6.1 6.1L3 3m3.1 3.1l14.8 14.8M9.9 9.9a3 3 0 104.2 4.2"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full h-12 rounded-xl bg-green-600 text-white font-medium disabled:opacity-50"
            data-testid="login-submit-button"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-neutral-500">
            <span>New here?</span>

            <Link
              to="/register"
              className="font-medium text-green-600 hover:underline"
              data-testid="go-to-register"
            >
              Create an account
            </Link>

            <span className="text-neutral-300">•</span>

            <button
              type="button"
              onClick={openForgotPassword}
              className="font-medium text-green-600 hover:underline"
              data-testid="forgot-password-button"
            >
              Forgot password?
            </button>
          </div>
        </form>
      </div>

      {showForgotPassword && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeForgotPassword();
            }
          }}
          data-testid="forgot-password-modal"
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-neutral-200 shadow-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold tracking-widest text-green-600 uppercase">
                  Password recovery
                </p>

                <h2 className="mt-1 text-xl font-semibold text-black">
                  {resetStep === "email" && "Reset your password"}
                  {resetStep === "code" && "Enter your verification code"}
                  {resetStep === "password" && "Create a new password"}
                  {resetStep === "success" && "Password updated"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForgotPassword}
                disabled={resetBusy}
                className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 disabled:opacity-50"
                aria-label="Close password reset"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-5 flex items-center gap-2">
              {["email", "code", "password"].map((step, index) => {
                const steps = ["email", "code", "password", "success"];
                const activeIndex = steps.indexOf(resetStep);
                const completed = activeIndex > index;
                const active = activeIndex === index;

                return (
                  <div
                    key={step}
                    className={`h-1.5 flex-1 rounded-full ${
                      completed || active ? "bg-green-600" : "bg-neutral-200"
                    }`}
                  />
                );
              })}
            </div>

            {resetStep === "email" && (
              <form onSubmit={requestResetCode} className="mt-6 space-y-5">
                <p className="text-sm leading-6 text-neutral-500">
                  Enter the email address connected to your ZimLink account.
                  We will send you a six-digit verification code.
                </p>

                <div>
                  <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                    Email
                  </label>

                  <input
                    type="email"
                    autoComplete="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full mt-2 h-11 rounded-lg px-3 bg-white border border-neutral-200 outline-none focus:border-green-600 text-black"
                    data-testid="forgot-password-email-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetBusy}
                  className="w-full h-12 rounded-xl bg-green-600 text-white font-medium disabled:opacity-50"
                  data-testid="send-reset-code-button"
                >
                  {resetBusy ? "Sending code…" : "Send verification code"}
                </button>
              </form>
            )}

            {resetStep === "code" && (
              <form onSubmit={continueFromCode} className="mt-6 space-y-5">
                <p className="text-sm leading-6 text-neutral-500">
                  Enter the six-digit code sent to{" "}
                  <strong className="text-black">{resetEmail}</strong>. The code
                  expires in 15 minutes.
                </p>

                <div>
                  <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                    Verification code
                  </label>

                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) =>
                      setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                    autoFocus
                    placeholder="000000"
                    className="w-full mt-2 h-14 rounded-xl px-4 bg-white border border-neutral-200 outline-none focus:border-green-600 text-black text-center text-2xl font-semibold tracking-[0.45em]"
                    data-testid="password-reset-code-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetCode.length !== 6}
                  className="w-full h-12 rounded-xl bg-green-600 text-white font-medium disabled:opacity-50"
                  data-testid="continue-reset-code-button"
                >
                  Continue
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setResetCode("");
                      setResetStep("email");
                    }}
                    className="font-medium text-neutral-500 hover:text-black"
                  >
                    Change email
                  </button>

                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={resetBusy}
                    className="font-medium text-green-600 hover:underline disabled:opacity-50"
                  >
                    {resetBusy ? "Sending…" : "Resend code"}
                  </button>
                </div>
              </form>
            )}

            {resetStep === "password" && (
              <form onSubmit={updatePassword} className="mt-6 space-y-5">
                <p className="text-sm leading-6 text-neutral-500">
                  Enter your new password twice to make sure it was typed
                  correctly.
                </p>

                <div>
                  <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                    New password
                  </label>

                  <div className="relative mt-2">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={6}
                      required
                      autoFocus
                      className="w-full h-11 rounded-lg px-3 pr-16 bg-white border border-neutral-200 outline-none focus:border-green-600 text-black"
                      data-testid="new-password-input"
                    />

                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-green-600"
                    >
                      {showNewPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                    Confirm new password
                  </label>

                  <input
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    minLength={6}
                    required
                    className={`w-full mt-2 h-11 rounded-lg px-3 bg-white border outline-none text-black ${
                      confirmNewPassword &&
                      newPassword !== confirmNewPassword
                        ? "border-red-400 focus:border-red-500"
                        : "border-neutral-200 focus:border-green-600"
                    }`}
                    data-testid="confirm-new-password-input"
                  />

                  {confirmNewPassword &&
                    newPassword !== confirmNewPassword && (
                      <p className="mt-2 text-xs text-red-600">
                        The passwords do not match.
                      </p>
                    )}
                </div>

                <button
                  type="submit"
                  disabled={
                    resetBusy ||
                    newPassword.length < 6 ||
                    newPassword !== confirmNewPassword
                  }
                  className="w-full h-12 rounded-xl bg-green-600 text-white font-medium disabled:opacity-50"
                  data-testid="update-password-button"
                >
                  {resetBusy ? "Updating password…" : "Update password"}
                </button>

                <button
                  type="button"
                  onClick={() => setResetStep("code")}
                  disabled={resetBusy}
                  className="w-full text-sm font-medium text-neutral-500 hover:text-black disabled:opacity-50"
                >
                  Back to verification code
                </button>
              </form>
            )}

            {resetStep === "success" && (
              <div className="mt-6 text-center">
                <div className="mx-auto h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>

                <p className="mt-4 text-sm leading-6 text-neutral-500">
                  Your password was changed successfully. You can now sign in
                  using your new password.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setEmail(resetEmail);
                    closeForgotPassword();
                  }}
                  className="mt-6 w-full h-12 rounded-xl bg-green-600 text-white font-medium"
                  data-testid="return-to-login-button"
                >
                  Return to sign in
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
