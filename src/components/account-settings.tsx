"use client";
import { useState } from "react";
import { supabase, getDeviceId } from "@/lib/supabase";
import { signOut, type User } from "@/lib/auth";
import { getT, type Lang } from "@/lib/i18n";

interface Props {
  user: User | null;
  onClose: () => void;
  lang: Lang;
}

export function AccountSettings({ user, onClose, lang }: Props) {
  const tx = getT(lang);
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
      if (!res.ok) throw new Error(data.error || tx.as_delete_fail);

      // Sign out and wipe all local GlucoLens data
      try { await signOut(); } catch { /* ignore */ }
      Object.keys(localStorage)
        .filter((k) => k.startsWith("glucolens_"))
        .forEach((k) => localStorage.removeItem(k));

      // Hard reload to a fresh state
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : tx.as_delete_fail);
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 pb-4 flex justify-between items-start">
          <div>
            <h2 className="text-white text-2xl font-bold">{tx.as_title}</h2>
            <p className="text-gray-500 text-sm mt-1">
              {user?.email ? user.email : tx.as_guest}
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
              {tx.as_sign_out}
            </button>
          )}

          {/* Danger zone */}
          <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-4">
            <h3 className="text-red-400 font-semibold text-sm mb-1">{tx.as_delete_title}</h3>
            <p className="text-gray-400 text-xs leading-relaxed mb-3">
              {tx.as_delete_body.replace("{acct}", user ? tx.as_acct_prefix : "")}
            </p>

            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white bg-red-600 hover:bg-red-500 transition-all"
              >
                {tx.as_delete_btn}
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-red-300 text-xs font-medium">
                  {tx.as_confirm_q}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={deleting}
                    className="flex-1 py-3 rounded-xl text-gray-300 bg-gray-800 hover:bg-gray-700 text-sm transition-all disabled:opacity-50"
                  >
                    {tx.ua_cancel}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 py-3 rounded-xl text-white bg-red-600 hover:bg-red-500 font-semibold text-sm transition-all disabled:opacity-50"
                  >
                    {deleting ? tx.as_deleting : tx.as_yes_delete}
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
            {tx.as_data_q}
          </p>
        </div>
      </div>
    </div>
  );
}
