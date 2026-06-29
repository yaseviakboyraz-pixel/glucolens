"use client";
import { useState } from "react";
import { signIn, signUp, signInWithMagicLink, signInWithGoogle, signInWithApple } from "@/lib/auth";
import { getT, type Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  onSuccess: () => void;
}

export function AuthScreen({ lang, onSuccess }: Props) {
  const tx = getT(lang);
  const [mode, setMode] = useState<"login" | "register" | "magic" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email) { setError(tx.au_err_email); return; }
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "login") {
        if (!password) { setError(tx.au_err_pw); setLoading(false); return; }
        await signIn(email, password);
        onSuccess();
      } else if (mode === "register") {
        if (!password || password.length < 6) { setError(tx.au_err_pw_min); setLoading(false); return; }
        await signUp(email, password, name);
        setSuccess(tx.au_ok_confirm);
      } else if (mode === "magic") {
        await signInWithMagicLink(email);
        setSuccess(tx.au_ok_magic);
      } else if (mode === "forgot") {
        const { resetPassword } = await import("@/lib/auth");
        await resetPassword(email);
        setSuccess(tx.au_ok_reset);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : tx.au_err_generic);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : tx.au_err_google);
      setLoading(false);
    }
  };

  const handleApple = async () => {
    try {
      setLoading(true);
      await signInWithApple();
    } catch (e) {
      setError(e instanceof Error ? e.message : tx.au_err_apple);
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
        <p className="text-gray-500 text-sm mt-1">{tx.au_subtitle}</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm space-y-4">

        {/* Social auth */}
        {(mode === "login" || mode === "register") && (
          <div className="space-y-2">
            <button onClick={handleApple} disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-white text-black font-semibold flex items-center justify-center gap-3 hover:bg-gray-100 transition-all disabled:opacity-50">
              <span className="text-xl">🍎</span>
              {tx.au_continue_apple}
            </button>
            <button onClick={handleGoogle} disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gray-900 border border-gray-700 text-white font-semibold flex items-center justify-center gap-3 hover:bg-gray-800 transition-all disabled:opacity-50">
              <span className="text-xl">G</span>
              {tx.au_continue_google}
            </button>

            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-gray-600 text-xs">{tx.au_or}</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>
          </div>
        )}

        {/* Mode tabs */}
        {(mode === "login" || mode === "register") && (
          <div className="grid grid-cols-2 gap-1 bg-gray-900 p-1 rounded-xl">
            <button onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${mode === "login" ? "bg-teal-600 text-white" : "text-gray-400"}`}>
              {tx.au_signin}
            </button>
            <button onClick={() => { setMode("register"); setError(null); setSuccess(null); }}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${mode === "register" ? "bg-teal-600 text-white" : "text-gray-400"}`}>
              {tx.au_create}
            </button>
          </div>
        )}

        {/* Magic link / forgot title */}
        {mode === "magic" && (
          <div>
            <h2 className="text-white font-semibold text-lg">{tx.au_magic_title}</h2>
            <p className="text-gray-500 text-sm mt-1">{tx.au_magic_sub}</p>
          </div>
        )}
        {mode === "forgot" && (
          <div>
            <h2 className="text-white font-semibold text-lg">{tx.au_reset_title}</h2>
            <p className="text-gray-500 text-sm mt-1">{tx.au_reset_sub}</p>
          </div>
        )}

        {/* Form */}
        <div className="space-y-3">
          {mode === "register" && (
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder={tx.ob_name_label}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500" />
          )}

          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder={tx.au_email_ph}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500" />

          {(mode === "login" || mode === "register") && (
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder={mode === "register" ? tx.au_pw_ph_min : tx.au_pw_ph}
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
            {loading ? "..." : mode === "login" ? tx.au_signin : mode === "register" ? tx.au_create : mode === "magic" ? tx.au_send_magic : tx.au_send_reset}
          </button>
        </div>

        {/* Links */}
        <div className="space-y-2 text-center">
          {mode === "login" && (
            <>
              <button onClick={() => { setMode("forgot"); setError(null); setSuccess(null); }}
                className="text-gray-500 text-sm hover:text-gray-300 transition-colors block w-full">
                {tx.au_forgot}
              </button>
              <button onClick={() => { setMode("magic"); setError(null); setSuccess(null); }}
                className="text-teal-500 text-sm hover:text-teal-400 transition-colors block w-full">
                {tx.au_magic_instead}
              </button>
            </>
          )}

          {(mode === "magic" || mode === "forgot") && (
            <button onClick={() => { setMode("login"); setError(null); setSuccess(null); }}
              className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
              {tx.au_back_signin}
            </button>
          )}
        </div>

        <p className="text-center text-gray-700 text-xs pt-2">
          {tx.au_terms_notice}
        </p>
      </div>
    </div>
  );
}
