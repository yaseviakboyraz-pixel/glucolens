"use client";
import { useState, useEffect } from "react";
import { PLANS, RC_PRODUCT_IDS, getCurrentPlan, purchasePlan, restorePurchases, type PlanId } from "@/lib/subscriptions";

interface Props {
  onClose: () => void;
  onUpgrade: (plan: PlanId) => void;
}

export function Paywall({ onClose, onUpgrade }: Props) {
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
      const productId = planId === "premium"
        ? (billing === "yearly" ? RC_PRODUCT_IDS.premium_yearly : RC_PRODUCT_IDS.premium_monthly)
        : (billing === "yearly" ? RC_PRODUCT_IDS.pro_yearly : RC_PRODUCT_IDS.pro_monthly);

      const success = await purchasePlan(productId);
      if (success) {
        setCurrentPlan(planId);
        onUpgrade(planId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purchase failed");
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

  const proPrice = billing === "yearly" ? "$39.99/yr" : "$4.99/mo";
  const premiumPrice = billing === "yearly" ? "$79.99/yr" : "$9.99/mo";
  const proPriceNote = billing === "yearly" ? "~$3.33/mo — save 33%" : "";
  const premiumPriceNote = billing === "yearly" ? "~$6.67/mo — save 33%" : "";

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-950 border border-gray-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-white text-2xl font-bold">Upgrade GlucoLens</h2>
              <p className="text-gray-500 text-sm mt-1">Unlock all features for better glucose control</p>
            </div>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-400 text-2xl leading-none">×</button>
          </div>

          {/* Billing toggle */}
          <div className="flex bg-gray-900 rounded-xl p-1 gap-1">
            <button onClick={() => setBilling("monthly")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${billing === "monthly" ? "bg-gray-700 text-white" : "text-gray-500"}`}>
              Monthly
            </button>
            <button onClick={() => setBilling("yearly")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${billing === "yearly" ? "bg-teal-600 text-white" : "text-gray-500"}`}>
              Yearly 🏷️ -33%
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="px-6 pb-6 space-y-3">

          {/* Pro Plan */}
          <div className={`rounded-2xl border-2 p-5 transition-all ${
            currentPlan === "pro" ? "border-teal-500 bg-teal-950/30" : "border-gray-800 bg-gray-900"
          }`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-lg">Pro</span>
                  {currentPlan === "pro" && (
                    <span className="text-xs bg-teal-600 text-white px-2 py-0.5 rounded-full">Current</span>
                  )}
                  <span className="text-xs bg-teal-900 text-teal-300 px-2 py-0.5 rounded-full">Most Popular</span>
                </div>
                <div className="text-teal-400 font-bold text-xl mt-1">{proPrice}</div>
                {proPriceNote && <p className="text-gray-500 text-xs">{proPriceNote}</p>}
              </div>
            </div>

            <div className="space-y-1.5 mb-4">
              {PLANS.pro.features.map((f, i) => (
                <div key={i} className="flex gap-2 text-sm text-gray-300">
                  <span className="text-teal-400 shrink-0">✓</span>{f}
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
              {loading === "pro" ? "Processing..." : currentPlan === "pro" ? "Current Plan" : "Get Pro"}
            </button>
          </div>

          {/* Premium Plan */}
          <div className={`rounded-2xl border-2 p-5 transition-all ${
            currentPlan === "premium" ? "border-purple-500 bg-purple-950/30" : "border-gray-800 bg-gray-900"
          }`}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-lg">Premium</span>
                  {currentPlan === "premium" && (
                    <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">Current</span>
                  )}
                </div>
                <div className="text-purple-400 font-bold text-xl mt-1">{premiumPrice}</div>
                {premiumPriceNote && <p className="text-gray-500 text-xs">{premiumPriceNote}</p>}
              </div>
            </div>

            <div className="space-y-1.5 mb-4">
              {PLANS.premium.features.map((f, i) => (
                <div key={i} className="flex gap-2 text-sm text-gray-300">
                  <span className="text-purple-400 shrink-0">✓</span>{f}
                </div>
              ))}
            </div>

            <button onClick={() => handlePurchase("premium")}
              disabled={currentPlan === "premium" || loading !== null}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                currentPlan === "premium"
                  ? "bg-gray-800 text-gray-500 cursor-default"
                  : "bg-purple-600 hover:bg-purple-500 text-white"
              } disabled:opacity-50`}>
              {loading === "premium" ? "Processing..." : currentPlan === "premium" ? "Current Plan" : "Get Premium"}
            </button>
          </div>

          {/* Free plan note */}
          <div className="text-center text-gray-600 text-xs py-1">
            Free plan: 5 analyses/day · Basic features
          </div>

          {error && (
            <div className="bg-red-950 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm text-center">
              {error}
            </div>
          )}

          {/* Restore */}
          <button onClick={handleRestore} disabled={loading !== null}
            className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors">
            {loading === "restore" ? "Restoring..." : "Restore purchases"}
          </button>

          <p className="text-center text-gray-700 text-xs">
            Subscriptions auto-renew. Cancel anytime in App Store settings.
          </p>
        </div>
      </div>
    </div>
  );
}
