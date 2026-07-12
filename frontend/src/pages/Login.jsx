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

  // A returning user is someone who has successfully logged in on this device before.
  const isReturningUser = localStorage.getItem("zimlink_has_logged_in") === "true";

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
              className="w-full mt-2 h-11 rounded-lg px-3 bg-white border border-neutral-200 outline-none focus:border-green-600 text-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="login-email-input"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-green-600 hover:underline"
                data-testid="forgot-password-link"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
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

          <p className="text-sm text-center text-neutral-500">
            New here?{" "}
            <Link
              to="/register"
              className="font-medium text-green-600"
              data-testid="go-to-register"
            >
              Create an account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
