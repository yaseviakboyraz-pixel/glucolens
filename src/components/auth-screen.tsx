"use client";
import { useState } from "react";
import { signIn, signUp, signInWithMagicLink, signInWithGoogle, signInWithApple } from "@/lib/auth";

type AuthMode = "login" | "register" | "magic" | "forgot";

interface Props {
  onSuccess: () => void;
}

export function AuthScreen({ onSuccess }: Props) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email) { setError("Email is required"); return; }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "login") {
        if (!password) { setError("Password is required"); setLoading(false); return; }
        await signIn(email, password);
        onSuccess();
      } else if (mode === "register") {
        if (!password || password.length < 6) { setError("Password must be at least 6 characters"); setLoading(false); return; }
        await signUp(email, password, name);
        setSuccess("Check your email to confirm your account!");
      } else if (mode === "magic") {
        await signInWithMagicLink(email);
        setSuccess("Magic link sent! Check your email.");
      } else if (mode === "forgot") {
        const { resetPassword } = await import("@/lib/auth");
        await resetPassword(email);
        setSuccess("Password reset email sent!");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Google sign in failed");
      setLoading(false);
    }
  };

  const handleApple = async () => {
    try {
      setLoading(true);
      await signInWithApple();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apple sign in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="text-4xl mb-3">🔬</div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
          GlucoLens
        </h1>
        <p className="text-gray-500 text-sm mt-1">AI-powered glucose tracking</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm space-y-4">

        {/* Social auth */}
        {(mode === "login" || mode === "register") && (
          <div className="space-y-2">
            <button onClick={handleApple} disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-white text-black font-semibold flex items-center justify-center gap-3 hover:bg-gray-100 transition-all disabled:opacity-50">
              <span className="text-xl">🍎</span>
              Continue with Apple
            </button>
            <button onClick={handleGoogle} disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gray-900 border border-gray-700 text-white font-semibold flex items-center justify-center gap-3 hover:bg-gray-800 transition-all disabled:opacity-50">
              <span className="text-xl">G</span>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-gray-600 text-xs">or</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
          </div>
        )}

        {/* Mode tabs */}
        {(mode === "login" || mode === "register") && (
          <div className="grid grid-cols-2 gap-1 bg-gray-900 p-1 rounded-xl">
            <button onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${mode === "login" ? "bg-teal-600 text-white" : "text-gray-400"}`}>
              Sign In
            </button>
            <button onClick={() => { setMode("register"); setError(null); setSuccess(null); }}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${mode === "register" ? "bg-teal-600 text-white" : "text-gray-400"}`}>
              Create Account
            </button>
          </div>
        )}

        {/* Magic link / forgot title */}
        {mode === "magic" && (
          <div>
            <h2 className="text-white font-semibold text-lg">✨ Magic Link</h2>
            <p className="text-gray-500 text-sm mt-1">We'll send you a login link — no password needed</p>
          </div>
        )}
        {mode === "forgot" && (
          <div>
            <h2 className="text-white font-semibold text-lg">Reset Password</h2>
            <p className="text-gray-500 text-sm mt-1">Enter your email to receive reset instructions</p>
          </div>
        )}

        {/* Form */}
        <div className="space-y-3">
          {mode === "register" && (
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name (optional)"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500" />
          )}

          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500" />

          {(mode === "login" || mode === "register") && (
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={mode === "register" ? "Password (min 6 chars)" : "Password"}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500"
              onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          )}

          {error && (
            <div className="bg-red-950 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-950 border border-green-500/30 rounded-xl px-4 py-3 text-green-300 text-sm">
              {success}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-4 rounded-2xl font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 transition-all text-lg">
            {loading ? "..." : mode === "login" ? "Sign In" : mode === "register" ? "Create Account" : mode === "magic" ? "Send Magic Link" : "Send Reset Email"}
          </button>
        </div>

        {/* Links */}
        <div className="space-y-2 text-center">
          {mode === "login" && (
            <>
              <button onClick={() => { setMode("forgot"); setError(null); setSuccess(null); }}
                className="text-gray-500 text-sm hover:text-gray-300 transition-colors block w-full">
                Forgot password?
              </button>
              <button onClick={() => { setMode("magic"); setError(null); setSuccess(null); }}
                className="text-teal-500 text-sm hover:text-teal-400 transition-colors block w-full">
                ✨ Sign in with magic link instead
              </button>
            </>
          )}

          {(mode === "magic" || mode === "forgot") && (
            <button onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
              className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
              ← Back to sign in
            </button>
          )}
        </div>

        <p className="text-center text-gray-700 text-xs pt-2">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
