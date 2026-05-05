// GlucoLens Subscription System
// Uses RevenueCat on native (iOS/Android)
// Falls back to localStorage mock on web

import { Capacitor } from "@capacitor/core";

export type PlanId = "free" | "pro" | "premium";

export interface Plan {
  id: PlanId;
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  features: string[];
  glLimit: number; // analyses per day, -1 = unlimited
  color: string;
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    monthlyPrice: "$0",
    yearlyPrice: "$0",
    glLimit: 5,
    color: "gray",
    features: [
      "5 meal analyses per day",
      "Basic GL tracking",
      "7-day history",
      "Single ingredient search",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    monthlyPrice: "$4.99/mo",
    yearlyPrice: "$39.99/yr",
    glLimit: -1,
    color: "teal",
    features: [
      "Unlimited meal analyses",
      "Full history & trends",
      "AI Coach",
      "QR menu analyzer",
      "Drink analyzer",
      "Meal plan generator",
      "Glucose curve predictions",
      "Timing nudges",
      "Cloud sync",
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    monthlyPrice: "$9.99/mo",
    yearlyPrice: "$79.99/yr",
    glLimit: -1,
    color: "purple",
    features: [
      "Everything in Pro",
      "Priority support",
      "Early access to new features",
      "HealthKit integration",
      "Advanced analytics",
      "Export data (CSV/PDF)",
    ],
  },
};

// RevenueCat Product IDs (must match App Store Connect)
export const RC_PRODUCT_IDS = {
  pro_monthly: "glucolens_pro_monthly",
  pro_yearly: "glucolens_pro_yearly",
  premium_monthly: "glucolens_premium_monthly",
  premium_yearly: "glucolens_premium_yearly",
};

// ── Web Mock (for development/web use) ───────────

function getMockPlan(): PlanId {
  if (typeof window === "undefined") return "free";
  return (localStorage.getItem("glucolens_plan") as PlanId) || "free";
}

function setMockPlan(plan: PlanId): void {
  localStorage.setItem("glucolens_plan", plan);
}

// ── Native RevenueCat ─────────────────────────────

async function initRevenueCat(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const apiKey = Capacitor.getPlatform() === "ios"
      ? process.env.NEXT_PUBLIC_RC_IOS_KEY || ""
      : process.env.NEXT_PUBLIC_RC_ANDROID_KEY || "";
    if (!apiKey) return;
    await Purchases.configure({ apiKey });
  } catch (err) {
    console.error("RevenueCat init failed:", err);
  }
}

async function getNativePlan(): Promise<PlanId> {
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const { customerInfo } = await Purchases.getCustomerInfo();
    const active = customerInfo.activeSubscriptions;
    if (active.includes(RC_PRODUCT_IDS.premium_monthly) || active.includes(RC_PRODUCT_IDS.premium_yearly)) {
      return "premium";
    }
    if (active.includes(RC_PRODUCT_IDS.pro_monthly) || active.includes(RC_PRODUCT_IDS.pro_yearly)) {
      return "pro";
    }
    return "free";
  } catch {
    return "free";
  }
}

// ── Public API ────────────────────────────────────

export async function initSubscriptions(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await initRevenueCat();
  }
}

export async function getCurrentPlan(): Promise<PlanId> {
  if (Capacitor.isNativePlatform()) {
    return getNativePlan();
  }
  return getMockPlan();
}

export async function purchasePlan(productId: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Web mock — simulate purchase
    if (productId.includes("premium")) setMockPlan("premium");
    else if (productId.includes("pro")) setMockPlan("pro");
    return true;
  }
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const { customerInfo } = await Purchases.purchaseStoreProduct({ product: { productIdentifier: productId } as never });
    const active = customerInfo.activeSubscriptions;
    if (active.includes(productId)) return true;
    return false;
  } catch (err: unknown) {
    if ((err as { code?: string }).code === "PURCHASE_CANCELLED") return false;
    throw err;
  }
}

export async function restorePurchases(): Promise<PlanId> {
  if (!Capacitor.isNativePlatform()) {
    return getMockPlan();
  }
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const { customerInfo } = await Purchases.restorePurchases();
    const active = customerInfo.activeSubscriptions;
    if (active.some(id => id.includes("premium"))) return "premium";
    if (active.some(id => id.includes("pro"))) return "pro";
    return "free";
  } catch {
    return "free";
  }
}

export async function canAnalyze(): Promise<{ allowed: boolean; remaining: number; plan: PlanId }> {
  const plan = await getCurrentPlan();
  const planConfig = PLANS[plan];

  if (planConfig.glLimit === -1) {
    return { allowed: true, remaining: -1, plan };
  }

  // Count today's analyses
  const today = new Date().toDateString();
  const counts = JSON.parse(localStorage.getItem("glucolens_daily_count") || "{}");
  const todayCount = counts[today] || 0;
  const remaining = Math.max(0, planConfig.glLimit - todayCount);

  return { allowed: remaining > 0, remaining, plan };
}

export function recordAnalysis(): void {
  const today = new Date().toDateString();
  const counts = JSON.parse(localStorage.getItem("glucolens_daily_count") || "{}");
  counts[today] = (counts[today] || 0) + 1;
  localStorage.setItem("glucolens_daily_count", JSON.stringify(counts));
}
