// GlucoLens — Local Storage Manager
// Meal history, user profile, streaks, insights

import type { MealAnalysis } from "./claude-vision";

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserType = "healthy" | "pre_diabetic" | "diabetic";

export interface UserProfile {
  name?: string;
  userType: UserType;
  dailyGLTarget: number;
  setupComplete: boolean;
  createdAt: string;
}

export interface MealRecord {
  id: string;
  timestamp: string;
  analysis: MealAnalysis;
  thumbnail?: string;
  note?: string;
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";
}

export interface DailyStats {
  date: string;
  totalGL: number;
  mealCount: number;
  avgGL: number;
  highRiskCount: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const KEYS = {
  PROFILE: "glucolens_profile",
  MEALS: "glucolens_meals",
};

const MAX_MEALS = 90;

// ─── GL Targets by user type ─────────────────────────────────────────────────

export function getGLTargets(userType: UserType) {
  switch (userType) {
    case "diabetic":     return { daily: 60, mealMax: 15 };
    case "pre_diabetic": return { daily: 80, mealMax: 18 };
    default:             return { daily: 100, mealMax: 25 };
  }
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEYS.PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

export function getDefaultProfile(): UserProfile {
  return {
    userType: "healthy",
    dailyGLTarget: 100,
    setupComplete: false,
    createdAt: new Date().toISOString(),
  };
}

// ─── Meal History ─────────────────────────────────────────────────────────────

export function getMeals(): MealRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.MEALS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveMeal(
  analysis: MealAnalysis,
  thumbnail?: string,
  mealType?: MealRecord["mealType"]
): MealRecord {
  const meals = getMeals();
  const record: MealRecord = {
    id: `meal_${Date.now()}`,
    timestamp: new Date().toISOString(),
    analysis,
    thumbnail,
    mealType,
  };
  const updated = [record, ...meals].slice(0, MAX_MEALS);
  localStorage.setItem(KEYS.MEALS, JSON.stringify(updated));
  return record;
}

export function deleteMeal(id: string): void {
  if (typeof window === "undefined") return;
  const meals = getMeals().filter((m) => m.id !== id);
  localStorage.setItem(KEYS.MEALS, JSON.stringify(meals));
}

// ─── Statistics ───────────────────────────────────────────────────────────────

export function getTodayStats(): DailyStats {
  const meals = getMeals();
  const today = new Date().toISOString().slice(0, 10);
  const todayMeals = meals.filter((m) => m.timestamp.slice(0, 10) === today);
  const totalGL = todayMeals.reduce((s, m) => s + m.analysis.total_glycemic_load, 0);
  return {
    date: today,
    totalGL: parseFloat(totalGL.toFixed(1)),
    mealCount: todayMeals.length,
    avgGL: todayMeals.length > 0 ? parseFloat((totalGL / todayMeals.length).toFixed(1)) : 0,
    highRiskCount: todayMeals.filter((m) => m.analysis.glucose_risk === "high").length,
  };
}

export function getLast7DaysStats(): DailyStats[] {
  const meals = getMeals();
  const result: DailyStats[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().slice(0, 10);
    const dayMeals = meals.filter((m) => m.timestamp.slice(0, 10) === dateStr);
    const totalGL = dayMeals.reduce((s, m) => s + m.analysis.total_glycemic_load, 0);
    result.push({
      date: dateStr,
      totalGL: parseFloat(totalGL.toFixed(1)),
      mealCount: dayMeals.length,
      avgGL: dayMeals.length > 0 ? parseFloat((totalGL / dayMeals.length).toFixed(1)) : 0,
      highRiskCount: dayMeals.filter((m) => m.analysis.glucose_risk === "high").length,
    });
  }
  return result;
}

export function getStreak(dailyGLTarget: number): number {
  const stats = getLast7DaysStats().reverse();
  let streak = 0;
  for (const day of stats) {
    if (day.mealCount === 0) break;
    if (day.totalGL <= dailyGLTarget) streak++;
    else break;
  }
  return streak;
}

export function getWeeklyAvgGL(): number {
  const stats = getLast7DaysStats();
  const activeDays = stats.filter((d) => d.mealCount > 0);
  if (activeDays.length === 0) return 0;
  const total = activeDays.reduce((s, d) => s + d.totalGL, 0);
  return parseFloat((total / activeDays.length).toFixed(1));
}

export function getRecentMeals(limit = 10): MealRecord[] {
  return getMeals().slice(0, limit);
}

// ─── Insights ─────────────────────────────────────────────────────────────────

export interface GLInsight {
  type: "warning" | "success" | "info";
  message: string;
}

export function generateInsights(todayStats: DailyStats, profile: UserProfile): GLInsight[] {
  const insights: GLInsight[] = [];
  const targets = getGLTargets(profile.userType);

  if (todayStats.mealCount === 0) {
    insights.push({ type: "info", message: "No meals logged today. Analyze your first meal to start tracking." });
    return insights;
  }

  if (todayStats.totalGL > targets.daily) {
    insights.push({
      type: "warning",
      message: `Today's GL (${todayStats.totalGL}) exceeds your daily target of ${targets.daily}. Try lighter meals.`,
    });
  } else {
    const remaining = targets.daily - todayStats.totalGL;
    insights.push({
      type: "success",
      message: `On track! ${remaining.toFixed(0)} GL remaining for today.`,
    });
  }

  if (todayStats.highRiskCount >= 2) {
    insights.push({
      type: "warning",
      message: `${todayStats.highRiskCount} high-risk meals today. Try swapping one for a low-GI option.`,
    });
  }

  return insights;
}
