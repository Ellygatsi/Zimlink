import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await register(email, password, name);
      toast.success("Account created! You got a $100 starter bonus.");
      navigate("/");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Registration failed";
      toast.error(typeof msg === "string" ? msg : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black tracking-tighter">ZIM<span className="text-[#FFC900]">·</span>LINK</h1>
          <p className="overline text-neutral-500 mt-2">JOIN THE DIASPORA NETWORK</p>
        </div>
        <form onSubmit={submit} className="nb-card p-8 space-y-5" data-testid="register-form">
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
          <button type="submit" disabled={busy} className="nb-btn w-full bg-[#00E59B] text-black text-base h-12" data-testid="register-submit-button">
            {busy ? "Creating…" : "Create Account"}
          </button>
          <p className="text-sm text-center">
            Have an account?{" "}
            <Link to="/login" className="font-black underline" data-testid="go-to-login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
