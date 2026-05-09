"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    // Check if we have a valid recovery session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setValidSession(!!session);
    });
  }, []);

  async function handleReset() {
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      // Redirect after 3 seconds
      setTimeout(() => { window.location.href = "/"; }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset password");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-white text-2xl font-bold">Password Updated!</h1>
          <p className="text-gray-400 mt-2">Redirecting to app...</p>
        </div>
      </div>
    );
  }

  if (!validSession) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-white text-xl font-bold">Invalid or expired link</h1>
          <p className="text-gray-400 mt-2">Please request a new password reset.</p>
          <a href="/" className="mt-4 inline-block text-teal-400 hover:text-teal-300">
            ← Back to app
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="text-4xl mb-3">🔑</div>
          <h1 className="text-white text-2xl font-bold">New Password</h1>
          <p className="text-gray-400 text-sm mt-1">Choose a strong password for your account</p>
        </div>

        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="New password (min 6 chars)"
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500"
        />
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3.5 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-teal-500"
          onKeyDown={e => e.key === "Enter" && handleReset()}
        />

        {error && (
          <div className="bg-red-950 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 transition-all"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>

        <div className="text-center">
          <a href="/" className="text-gray-500 text-sm hover:text-gray-300">
            ← Back to app
          </a>
        </div>
      </div>
    </div>
  );
}
