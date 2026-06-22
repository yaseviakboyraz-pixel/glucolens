"use client";
import { useState } from "react";
import { supabase, getDeviceId } from "@/lib/supabase";
import { signOut, type User } from "@/lib/auth";

interface Props {
  user: User | null;
  onClose: () => void;
}

export function AccountSettings({ user, onClose }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ deviceId: getDeviceId() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Deletion failed");

      // Sign out and wipe all local GlucoLens data
      try { await signOut(); } catch { /* ignore */ }
      Object.keys(localStorage)
        .filter((k) => k.startsWith("glucolens_"))
        .forEach((k) => localStorage.removeItem(k));

      // Hard reload to a fresh state
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deletion failed. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 pb-4 flex justify-between items-start">
          <div>
            <h2 className="text-white text-2xl font-bold">Account & Data</h2>
            <p className="text-gray-500 text-sm mt-1">
              {user?.email ? user.email : "Guest — data stored on this device"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 text-2xl leading-none">×</button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Sign out (authenticated only) */}
          {user && (
            <button
              onClick={() => signOut().then(() => (window.location.href = "/")).catch(() => {})}
              className="w-full py-3 rounded-xl font-medium text-sm text-gray-300 bg-gray-900 hover:bg-gray-800 border border-gray-800 transition-all"
            >
              Sign out
            </button>
          )}

          {/* Danger zone */}
          <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4">
            <h3 className="text-red-400 font-semibold text-sm mb-1">Delete account & all data</h3>
            <p className="text-gray-400 text-xs leading-relaxed mb-3">
              This permanently deletes your {user ? "account, " : ""}meal history, photos, and all
              wellness logs from both this device and our servers. This cannot be undone.
            </p>

            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-red-600 hover:bg-red-500 transition-all"
              >
                Delete everything
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-red-300 text-xs font-medium">
                  Are you absolutely sure? This is permanent.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={deleting}
                    className="flex-1 py-3 rounded-xl text-gray-300 bg-gray-800 hover:bg-gray-700 text-sm transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 py-3 rounded-xl text-white bg-red-600 hover:bg-red-500 font-semibold text-sm transition-all disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Yes, delete"}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-3 bg-red-950 border border-red-500/30 rounded-xl px-3 py-2 text-red-300 text-xs">
                {error}
              </div>
            )}
          </div>

          <p className="text-center text-gray-700 text-xs">
            Questions about your data? privacy@glucolens.app
          </p>
        </div>
      </div>
    </div>
  );
}
