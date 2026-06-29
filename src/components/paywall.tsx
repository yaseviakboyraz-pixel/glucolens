"use client";
import { useState, useEffect } from "react";
import { RC_PRODUCT_IDS, getCurrentPlan, purchasePlan, restorePurchases, type PlanId } from "@/lib/subscriptions";
import { getT, type Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  onClose: () => void;
  onUpgrade: (plan: PlanId) => void;
}

const FREE_FEATURE_KEYS = ["pf_free_1", "pf_free_2", "pf_free_3", "pf_free_4"];
const PRO_FEATURE_KEYS = [
  "pf_pro_1", "pf_pro_2", "pf_pro_3", "pf_pro_4", "pf_pro_5", "pf_pro_6",
  "pf_pro_7", "pf_pro_8", "pf_pro_9", "pf_pro_10", "pf_pro_11", "pf_pro_12",
];

export function Paywall({ lang, onClose, onUpgrade }: Props) {
  const tx = getT(lang);
  const [currentPlan, setCurrentPlan] = useState<PlanId>("free");
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentPlan().then(setCurrentPlan);
  }, []);

  async function handlePurchase(planId: PlanId) {
    if (planId === "free" || planId === currentPlan) return;
    setLoading(planId);
    setError(null);
    try {
      const productId = billing === "yearly"
        ? RC_PRODUCT_IDS.pro_yearly
        : RC_PRODUCT_IDS.pro_monthly;
      const success = await purchasePlan(productId);
      if (success) {
        setCurrentPlan(planId);
        onUpgrade(planId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : tx.pw_purchase_failed);
    } finally {
      setLoading(null);
    }
  }

  async function handleRestore() {
    setLoading("restore");
    const plan = await restorePurchases();
    setCurrentPlan(plan);
    setLoading(null);
    if (plan !== "free") onUpgrade(plan);
  }

  const proPrice = billing === "yearly" ? `$49.99${tx.pw_per_yr}` : `$5.99${tx.pw_per_mo}`;
  const proPriceNote = billing === "yearly" ? `~$4.17${tx.pw_per_mo} — ${tx.pw_save30}` : "";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-white text-2xl font-bold">GlucoLens Pro</h2>
              <p className="text-gray-500 text-sm mt-1">{tx.pw_subtitle}</p>
            </div>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-400 text-2xl leading-none">×</button>
          </div>

          {/* Billing toggle */}
          <div className="flex bg-gray-900 rounded-xl p-1 gap-1">
            <button onClick={() => setBilling("monthly")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${billing === "monthly" ? "bg-gray-700 text-white" : "text-gray-500"}`}>
              {tx.pw_monthly}
            </button>
            <button onClick={() => setBilling("yearly")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${billing === "yearly" ? "bg-teal-600 text-white" : "text-gray-500"}`}>
              {tx.pw_yearly}
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="px-6 pb-6 space-y-4">

          {/* Free Plan */}
          <div className={`rounded-2xl border p-4 ${currentPlan === "free" ? "border-gray-600 bg-gray-900" : "border-gray-800 bg-gray-900/50"}`}>
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold">{tx.pw_free}</span>
                  {currentPlan === "free" && (
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{tx.pw_current}</span>
                  )}
                </div>
                <div className="text-gray-400 font-medium mt-0.5">$0</div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {FREE_FEATURE_KEYS.map((k) => (
                <div key={k} className="flex gap-2 text-sm text-gray-400">
                  <span className="text-gray-600 shrink-0">✓</span>{tx[k]}
                </div>
              ))}
            </div>
          </div>

          {/* Pro Plan */}
          <div className={`rounded-2xl border-2 p-5 transition-all ${
            currentPlan === "pro" ? "border-teal-500 bg-teal-950/30" : "border-teal-700/50 bg-gray-900"
          }`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-lg">Pro</span>
                  {currentPlan === "pro" && (
                    <span className="text-xs bg-teal-600 text-white px-2 py-0.5 rounded-full">{tx.pw_current}</span>
                  )}
                  <span className="text-xs bg-teal-900 text-teal-300 px-2 py-0.5 rounded-full">{tx.pw_most_popular}</span>
                </div>
                <div className="text-teal-400 font-bold text-xl mt-1">{proPrice}</div>
                {proPriceNote && <p className="text-gray-500 text-xs">{proPriceNote}</p>}
              </div>
            </div>

            <div className="space-y-1.5 mb-4">
              {PRO_FEATURE_KEYS.map((k) => (
                <div key={k} className="flex gap-2 text-sm text-gray-300">
                  <span className="text-teal-400 shrink-0">✓</span>{tx[k]}
                </div>
              ))}
            </div>

            <button onClick={() => handlePurchase("pro")}
              disabled={currentPlan === "pro" || loading !== null}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                currentPlan === "pro"
                  ? "bg-gray-800 text-gray-500 cursor-default"
                  : "bg-teal-600 hover:bg-teal-500 text-white"
              } disabled:opacity-50`}>
              {loading === "pro" ? tx.pw_processing : currentPlan === "pro" ? tx.pw_current_plan : billing === "yearly" ? tx.pw_start_trial : tx.pw_go_pro}
            </button>
          </div>

          {error && (
            <div className="bg-red-950 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          <button onClick={handleRestore} disabled={loading !== null}
            className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors">
            {loading === "restore" ? tx.pw_restoring : tx.pw_restore}
          </button>

          <p className="text-center text-gray-700 text-xs">
            {tx.pw_footer}
          </p>
        </div>
      </div>
    </div>
  );
}
