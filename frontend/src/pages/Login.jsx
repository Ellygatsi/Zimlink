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

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);

    try {
      await login(email, password);
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
            Welcome back.
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
            <label className="text-xs font-medium tracking-widest text-neutral-500 uppercase">
              Password
            </label>
            <input
              type="password"
              className="w-full mt-2 h-11 rounded-lg px-3 bg-white border border-neutral-200 outline-none focus:border-green-600 text-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="login-password-input"
            />
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