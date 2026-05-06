// Claude Fallback — tüm sekmelerde DB'de olmayan gıdalar için gerçek zamanlı AI tahmini

export interface ClaudeFallbackResult {
  name: string;
  gi: number;
  gl: number;
  confidence: number;
  carb_g: number;
  fiber_g: number;
  net_carb_g: number;
  protein_g: number;
  fat_g: number;
  calories: number;
  sugar_g: number;
  glucose_risk: "low" | "medium" | "high";
  notes: string;
  category: string;
  source: string;
  ai_generated: true;
}

export async function claudeGIEstimate(
  food: string,
  portion_g = 100,
  context = ""
): Promise<ClaudeFallbackResult | null> {
  try {
    const res = await fetch("/api/gi-estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ food, portion_g, context }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.success || !data.estimate) return null;

    return { ...data.estimate, ai_generated: true };
  } catch {
    return null;
  }
}

// DB sonucunu ClaudeFallbackResult formatına dönüştür
export function dbResultToFallback(
  name: string,
  dbEntry: { gi: number; confidence: number; carb_per_100g?: number; fiber_per_100g?: number; protein_per_100g?: number; fat_per_100g?: number; cal_per_100g?: number; category?: string; source?: string },
  portion_g: number
): ClaudeFallbackResult {
  const ratio = portion_g / 100;
  const carb = (dbEntry.carb_per_100g || 0) * ratio;
  const fiber = (dbEntry.fiber_per_100g || 0) * ratio;
  const netCarb = Math.max(0, carb - fiber);
  const gl = parseFloat(((dbEntry.gi * netCarb) / 100).toFixed(1));

  return {
    name,
    gi: dbEntry.gi,
    gl,
    confidence: dbEntry.confidence,
    carb_g: parseFloat(carb.toFixed(1)),
    fiber_g: parseFloat(fiber.toFixed(1)),
    net_carb_g: parseFloat(netCarb.toFixed(1)),
    protein_g: parseFloat(((dbEntry.protein_per_100g || 0) * ratio).toFixed(1)),
    fat_g: parseFloat(((dbEntry.fat_per_100g || 0) * ratio).toFixed(1)),
    calories: parseFloat(((dbEntry.cal_per_100g || 0) * ratio).toFixed(0)),
    sugar_g: 0,
    glucose_risk: gl < 10 ? "low" : gl <= 20 ? "medium" : "high",
    notes: "",
    category: dbEntry.category || "general",
    source: dbEntry.source || "GI Database",
    ai_generated: true,
  };
}
