import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const Auth = () => {
  const [tab, setTab] = useState<"signup" | "login">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async () => {
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      navigate("/whatsapp");
    }
  };

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      navigate("/whatsapp");
    }
  };

  const handleGoogle = async () => {
    setError("");
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      setError("Google sign-in is not available yet. Please use email to create an account.");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "signup") handleSignUp();
    else handleLogin();
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10 text-center">
        <span className="text-4xl font-bebas tracking-wide">
          <span className="text-[#F0F0F0]">FIN</span>
          <span className="text-[#B5FF3C]">WERSE</span>
        </span>
      </div>

      {/* Headline */}
      <h1 className="text-3xl md:text-5xl font-bebas tracking-wide text-center mb-8 text-[#F0F0F0]">
        TRADE <span className="text-[#B5FF3C]">SMARTER</span>. START HERE.
      </h1>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border border-[#1a1a1a] rounded-lg overflow-hidden">
        <button
          onClick={() => { setTab("signup"); setError(""); }}
          className={`px-8 py-2.5 text-sm font-bebas tracking-wider transition-colors ${
            tab === "signup"
              ? "bg-[#B5FF3C] text-[#0D0D0D]"
              : "bg-[#111111] text-[#666]"
          }`}
        >
          SIGN UP
        </button>
        <button
          onClick={() => { setTab("login"); setError(""); }}
          className={`px-8 py-2.5 text-sm font-bebas tracking-wider transition-colors ${
            tab === "login"
              ? "bg-[#B5FF3C] text-[#0D0D0D]"
              : "bg-[#111111] text-[#666]"
          }`}
        >
          LOG IN
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full h-12 px-4 rounded-lg bg-[#111111] border border-[#1a1a1a] text-[#F0F0F0] text-sm font-dm placeholder:text-[#666] focus:outline-none focus:border-[#B5FF3C] transition-colors"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full h-12 px-4 rounded-lg bg-[#111111] border border-[#1a1a1a] text-[#F0F0F0] text-sm font-dm placeholder:text-[#666] focus:outline-none focus:border-[#B5FF3C] transition-colors"
        />
        {tab === "signup" && (
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full h-12 px-4 rounded-lg bg-[#111111] border border-[#1a1a1a] text-[#F0F0F0] text-sm font-dm placeholder:text-[#666] focus:outline-none focus:border-[#B5FF3C] transition-colors"
          />
        )}

        {error && (
          <p className="text-[#FF5050] text-xs font-dm">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-lg bg-[#B5FF3C] text-[#0D0D0D] font-bebas tracking-wider text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "..." : tab === "signup" ? "CREATE ACCOUNT" : "LOG IN"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-[#1a1a1a]" />
          <span className="text-[#666] text-xs font-dm">or</span>
          <div className="flex-1 h-px bg-[#1a1a1a]" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          className="w-full h-12 rounded-lg bg-transparent border border-[#1a1a1a] text-[#F0F0F0] font-dm text-sm hover:border-[#666] transition-colors"
        >
          Continue with Google
        </button>

        {/* Switch */}
        <p className="text-center text-xs text-[#666] font-dm mt-2">
          {tab === "signup" ? (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => { setTab("login"); setError(""); }} className="text-[#B5FF3C] hover:underline">
                Log In
              </button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <button type="button" onClick={() => { setTab("signup"); setError(""); }} className="text-[#B5FF3C] hover:underline">
                Sign Up
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
};

export default Auth;
