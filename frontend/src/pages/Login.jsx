import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("admin@superapp.com");
  const [password, setPassword] = useState("admin123");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate(location.state?.from?.pathname || "/");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Login failed";
      toast.error(typeof msg === "string" ? msg : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 relative">
      {/* Flag stripe */}
      <div className="fixed top-0 left-0 right-0 z-50 flex h-[4px]">
        <div className="flex-1" style={{ background: "#009639" }} />
        <div className="flex-1" style={{ background: "#FFCD00" }} />
        <div className="flex-1" style={{ background: "#DE2010" }} />
        <div className="flex-1" style={{ background: "#0A0A0A" }} />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black tracking-tighter">ZIM<span className="text-[#FFCD00]">·</span>LINK</h1>
          <p className="overline text-neutral-700 mt-2">CALL HOME TO ZIMBABWE</p>
        </div>
        <form onSubmit={submit} className="nb-card p-8 space-y-5 bg-white/95 backdrop-blur-sm" data-testid="login-form">
          <h2 className="text-3xl font-black">Welcome back.</h2>
          <div>
            <label className="overline">Email</label>
            <input
              type="email"
              className="nb-input mt-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="login-email-input"
            />
          </div>
          <div>
            <label className="overline">Password</label>
            <input
              type="password"
              className="nb-input mt-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="login-password-input"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="nb-btn w-full bg-[#009639] text-white text-base h-12"
            data-testid="login-submit-button"
          >
            {busy ? "Signing in…" : "Sign In"}
          </button>
          <p className="text-sm text-center">
            New here?{" "}
            <Link to="/register" className="font-black underline" data-testid="go-to-register">
              Create an account
            </Link>
          </p>
        </form>
        <div className="mt-4 nb-card p-4 bg-[#FFCD00]/40 backdrop-blur-sm">
          <p className="overline">DEMO CREDENTIALS</p>
          <p className="text-xs mt-1 mono">admin@superapp.com / admin123</p>
          <p className="text-xs mono">user@superapp.com / user123</p>
        </div>
      </div>
    </div>
  );
}
