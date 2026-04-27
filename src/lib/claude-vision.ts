import Anthropic from "@anthropic-ai/sdk";
import { lookupGI } from "./turkish-gi-data";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are GlucoLens AI — a precise glucose and glycemic analysis assistant with expertise in global cuisines including Turkish, Mediterranean, Asian, Middle Eastern, and Western foods.

Analyze the food in the photo. Return ONLY valid JSON, no markdown, no extra text.

Rules:
- Identify each food item separately, estimate portion in grams based on visual cues
- Detect cooking method (boiling lowers GI ~10%, frying raises GI ~10-15%)
- Estimate hidden ingredients (oil, sauce, sugar, breading)
- net_carb_g = carbohydrate_g - fiber_g
- glycemic_load = (glycemic_index * net_carb_g) / 100
- glucose_risk: "low" GL<10, "medium" GL 10-20, "high" GL>20
- For pure proteins/fats (meat, fish, eggs, cheese, oil), set glycemic_index to 0
- gi_confidence: 0.9+ for well-known items, 0.7-0.9 for estimated

For timing_actions, provide SPECIFIC and ACTIONABLE nudges:
- pre_meal: 2-3 actions user can do RIGHT NOW before eating (e.g. "Walk briskly for 10 minutes — reduces glucose peak by ~20%")
- post_meal: 2-3 actions for AFTER eating (e.g. "Take a 15-minute walk within 30 minutes of finishing")
- meal_mods: 2-3 meal modifications (e.g. "Squeeze lemon on rice — lowers GI by 10-15%")
- swap_suggestion: ONE specific lower-GL alternative dish

For glucose_curve, provide realistic peak timing based on total GL:
- low GL (<10): gentle_rise, peak ~45min, baseline ~90min
- medium GL (10-20): moderate_rise, peak ~60-75min, baseline ~2h
- high GL (>20): sharp_rise, peak ~30-45min, baseline ~2.5-3h

Return exactly this JSON structure:
{
  "food_items": [{
    "name": "English name",
    "name_tr": "Turkish name if applicable",
    "portion_g": 150,
    "total_sugar_g": 5.2,
    "added_sugar_g": 0.5,
    "carbohydrate_g": 28.0,
    "fiber_g": 3.0,
    "net_carb_g": 25.0,
    "protein_g": 12.0,
    "fat_g": 8.0,
    "calories": 235,
    "glycemic_index": 52,
    "glycemic_load": 13.0,
    "gi_confidence": 0.85,
    "cooking_method": "grilled"
  }],
  "total_sugar_g": 12.4,
  "total_added_sugar_g": 1.5,
  "total_net_carb_g": 45.0,
  "total_fiber_g": 6.0,
  "total_protein_g": 28.0,
  "total_fat_g": 14.0,
  "total_calories": 420,
  "avg_glycemic_index": 55,
  "total_glycemic_load": 24.8,
  "glucose_risk": "medium",
  "glucose_peak_estimate": "Blood sugar may peak at ~140-160 mg/dL within 1-1.5 hours",
  "glucose_curve_description": "Moderate rise, returning to baseline within 2 hours",
  "glucose_curve": {
    "shape": "moderate_rise",
    "peak_minutes": 70,
    "baseline_minutes": 120,
    "peak_level": "moderate",
    "points": [
      {"minutes": 0, "level": 0},
      {"minutes": 20, "level": 25},
      {"minutes": 45, "level": 65},
      {"minutes": 70, "level": 100},
      {"minutes": 100, "level": 60},
      {"minutes": 120, "level": 20},
      {"minutes": 150, "level": 0}
    ]
  },
  "timing_actions": {
    "pre_meal": [
      "Walk briskly for 10 minutes — reduces glucose peak by ~20%",
      "Eat a small salad or vegetables first — slows carb absorption by ~30%"
    ],
    "post_meal": [
      "Take a 15-minute walk within 30 minutes of finishing — lowers peak by ~25-30%",
      "Avoid sitting for at least 20 minutes after eating"
    ],
    "meal_mods": [
      "Squeeze lemon juice on the rice — lowers GI by 10-15%",
      "Add a side of yogurt — protein slows glucose absorption"
    ],
    "swap_suggestion": "Replace white rice with bulgur — reduces GL by ~35%"
  },
  "recommendations": ["Adding lemon juice or vinegar can lower GI by 10-15%"],
  "warnings": [],
  "confidence_score": 0.82,
  "hidden_ingredients_note": null
}`;

export interface GlucoseCurvePoint {
  minutes: number;
  level: number;
}

export interface GlucoseCurve {
  shape: "gentle_rise" | "moderate_rise" | "sharp_rise";
  peak_minutes: number;
  baseline_minutes: number;
  peak_level: "low" | "moderate" | "high";
  points: GlucoseCurvePoint[];
}

export interface TimingActions {
  pre_meal: string[];
  post_meal: string[];
  meal_mods: string[];
  swap_suggestion: string;
}

export interface FoodItem {
  name: string;
  name_tr: string;
  portion_g: number;
  total_sugar_g: number;
  added_sugar_g: number;
  carbohydrate_g: number;
  fiber_g: number;
  net_carb_g: number;
  protein_g: number;
  fat_g: number;
  calories: number;
  glycemic_index: number;
  glycemic_load: number;
  gi_confidence: number;
  cooking_method?: string;
}

export interface MealAnalysis {
  food_items: FoodItem[];
  total_sugar_g: number;
  total_added_sugar_g: number;
  total_net_carb_g: number;
  total_fiber_g: number;
  total_protein_g: number;
  total_fat_g: number;
  total_calories: number;
  avg_glycemic_index: number;
  total_glycemic_load: number;
  glucose_risk: "low" | "medium" | "high";
  glucose_peak_estimate: string;
  glucose_curve_description: string;
  glucose_curve?: GlucoseCurve;
  timing_actions?: TimingActions;
  recommendations: string[];
  warnings: string[];
  confidence_score: number;
  hidden_ingredients_note?: string;
}

function detectMediaType(base64: string): "image/jpeg" | "image/png" | "image/webp" | "image/gif" {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBOR")) return "image/png";
  if (base64.startsWith("UklGR")) return "image/webp";
  if (base64.startsWith("R0lGO")) return "image/gif";
  return "image/jpeg";
}

// Generate fallback curve if Claude doesn't return one
function generateFallbackCurve(gl: number): GlucoseCurve {
  if (gl < 10) {
    return {
      shape: "gentle_rise", peak_minutes: 45, baseline_minutes: 90, peak_level: "low",
      points: [
        { minutes: 0, level: 0 }, { minutes: 15, level: 20 }, { minutes: 30, level: 55 },
        { minutes: 45, level: 100 }, { minutes: 60, level: 75 }, { minutes: 75, level: 45 },
        { minutes: 90, level: 10 }, { minutes: 105, level: 0 },
      ],
    };
  } else if (gl <= 20) {
    return {
      shape: "moderate_rise", peak_minutes: 70, baseline_minutes: 130, peak_level: "moderate",
      points: [
        { minutes: 0, level: 0 }, { minutes: 15, level: 20 }, { minutes: 35, level: 60 },
        { minutes: 70, level: 100 }, { minutes: 90, level: 70 }, { minutes: 110, level: 35 },
        { minutes: 130, level: 10 }, { minutes: 150, level: 0 },
      ],
    };
  } else {
    return {
      shape: "sharp_rise", peak_minutes: 40, baseline_minutes: 170, peak_level: "high",
      points: [
        { minutes: 0, level: 0 }, { minutes: 15, level: 45 }, { minutes: 30, level: 85 },
        { minutes: 40, level: 100 }, { minutes: 60, level: 80 }, { minutes: 90, level: 50 },
        { minutes: 130, level: 25 }, { minutes: 170, level: 0 },
      ],
    };
  }
}

export async function analyzeMealImage(
  imageBase64: string,
  userType = "healthy",
  mealContext?: string
): Promise<MealAnalysis> {
  const profileNote =
    userType === "diabetic"
      ? "\n\nUSER PROFILE: Diabetic patient. Warn clearly for GL > 15. Emphasize high-risk items. Make timing_actions more urgent."
      : userType === "pre_diabetic"
      ? "\n\nUSER PROFILE: Pre-diabetic. Warn for GL > 18. Suggest lower-GI alternatives in timing_actions."
      : "\n\nUSER PROFILE: Healthy individual. Provide general wellness guidance in timing_actions.";

  const mediaType = detectMediaType(imageBase64);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2500,
    system: SYSTEM_PROMPT + profileNote,
    messages: [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: mediaType, data: imageBase64 },
        },
        {
          type: "text",
          text: `Analyze this meal and return JSON only.${mealContext ? ` Context: ${mealContext}` : ""}`,
        },
      ],
    }],
  });

  let raw = (response.content[0] as { type: string; text: string }).text.trim();

  if (raw.startsWith("```")) {
    const parts = raw.split("```");
    raw = parts[1] || parts[0];
    if (raw.startsWith("json")) raw = raw.slice(4);
  }

  let data: MealAnalysis;
  try {
    data = JSON.parse(raw.trim());
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  if (!data.food_items || !Array.isArray(data.food_items)) {
    throw new Error("AI response missing food items. Please try again.");
  }

  // Enrich with GI database
  for (const item of data.food_items) {
    const db = lookupGI(item.name_tr || item.name);
    if (db && item.gi_confidence < 0.9) {
      item.glycemic_index = db.gi;
      item.gi_confidence = db.confidence;
      if (db.fiber_per_100g && item.portion_g) {
        const dbFiber = parseFloat(((db.fiber_per_100g * item.portion_g) / 100).toFixed(1));
        if (Math.abs(dbFiber - item.fiber_g) > 2) {
          item.fiber_g = dbFiber;
          item.net_carb_g = parseFloat((item.carbohydrate_g - item.fiber_g).toFixed(1));
        }
      }
      item.glycemic_load = parseFloat(((db.gi * item.net_carb_g) / 100).toFixed(1));
    }
  }

  // Recalculate totals
  data.total_glycemic_load = parseFloat(
    data.food_items.reduce((s, i) => s + (i.glycemic_load || 0), 0).toFixed(1)
  );
  data.total_fiber_g = parseFloat(
    data.food_items.reduce((s, i) => s + (i.fiber_g || 0), 0).toFixed(1)
  );
  data.total_net_carb_g = parseFloat(
    data.food_items.reduce((s, i) => s + (i.net_carb_g || 0), 0).toFixed(1)
  );
  data.total_protein_g = parseFloat(
    data.food_items.reduce((s, i) => s + (i.protein_g || 0), 0).toFixed(1)
  );
  data.total_fat_g = parseFloat(
    data.food_items.reduce((s, i) => s + (i.fat_g || 0), 0).toFixed(1)
  );
  data.total_calories = parseFloat(
    data.food_items.reduce((s, i) => s + (i.calories || 0), 0).toFixed(0)
  );
  data.glucose_risk =
    data.total_glycemic_load < 10 ? "low" :
    data.total_glycemic_load <= 20 ? "medium" : "high";

  // Ensure curve exists
  if (!data.glucose_curve) {
    data.glucose_curve = generateFallbackCurve(data.total_glycemic_load);
  }

  return data;
}
