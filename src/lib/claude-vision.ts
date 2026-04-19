import Anthropic from "@anthropic-ai/sdk";
import { lookupGI } from "./turkish-gi-data";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are GlucoLens AI — a precise glucose and glycemic analysis assistant with expertise in global cuisines including Turkish, Mediterranean, Asian, Middle Eastern, and Western foods.

Analyze the food in the photo. Return ONLY valid JSON, no markdown, no extra text.

Rules:
- Identify each food item separately, estimate portion in grams based on visual cues (plate size, serving vessel, portion relative to known objects)
- Detect cooking method (boiling lowers GI ~10%, frying raises GI ~10-15%)
- Estimate hidden ingredients (oil, sauce, sugar, breading)
- net_carb_g = carbohydrate_g - fiber_g
- glycemic_load = (glycemic_index * net_carb_g) / 100
- glucose_risk: "low" GL<10, "medium" GL 10-20, "high" GL>20
- For pure proteins/fats (meat, fish, eggs, cheese, oil), set glycemic_index to 0
- gi_confidence: 0.9+ for well-known items, 0.7-0.9 for estimated

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
    "glycemic_index": 52,
    "glycemic_load": 13.0,
    "gi_confidence": 0.85,
    "cooking_method": "grilled"
  }],
  "total_sugar_g": 12.4,
  "total_added_sugar_g": 1.5,
  "total_net_carb_g": 45.0,
  "total_fiber_g": 6.0,
  "avg_glycemic_index": 55,
  "total_glycemic_load": 24.8,
  "glucose_risk": "medium",
  "glucose_peak_estimate": "Blood sugar may peak at ~140-160 mg/dL within 1-1.5 hours",
  "glucose_curve_description": "Moderate rise, returning to baseline within 2 hours",
  "recommendations": [
    "Adding lemon juice or vinegar can lower GI by 10-15%",
    "Eating protein and vegetables before carbs slows glucose absorption"
  ],
  "warnings": [],
  "confidence_score": 0.82,
  "hidden_ingredients_note": null
}`;

export interface FoodItem {
  name: string;
  name_tr: string;
  portion_g: number;
  total_sugar_g: number;
  added_sugar_g: number;
  carbohydrate_g: number;
  fiber_g: number;
  net_carb_g: number;
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
  avg_glycemic_index: number;
  total_glycemic_load: number;
  glucose_risk: "low" | "medium" | "high";
  glucose_peak_estimate: string;
  glucose_curve_description: string;
  recommendations: string[];
  warnings: string[];
  confidence_score: number;
  hidden_ingredients_note?: string;
}

export async function analyzeMealImage(
  imageBase64: string,
  userType = "healthy",
  mealContext?: string
): Promise<MealAnalysis> {
  const profileNote =
    userType === "diabetic"
      ? "\n\nUSER PROFILE: Diabetic patient. Warn clearly for GL > 15. Emphasize high-risk items and suggest alternatives."
      : userType === "pre_diabetic"
      ? "\n\nUSER PROFILE: Pre-diabetic. Warn for GL > 18. Suggest lower-GI alternatives where possible."
      : "\n\nUSER PROFILE: Healthy individual. Provide general wellness guidance.";

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: SYSTEM_PROMPT + profileNote,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: `Analyze this meal and return JSON only.${mealContext ? ` Additional context from user: ${mealContext}` : ""}`,
          },
        ],
      },
    ],
  });

  let raw = (response.content[0] as { type: string; text: string }).text.trim();

  // Strip markdown code fences if present
  if (raw.startsWith("```")) {
    const parts = raw.split("```");
    raw = parts[1] || parts[0];
    if (raw.startsWith("json")) raw = raw.slice(4);
  }

  const data: MealAnalysis = JSON.parse(raw.trim());

  // Enrich with GI database — 500+ foods, multi-language
  for (const item of data.food_items) {
    const db = lookupGI(item.name_tr || item.name);
    if (db && item.gi_confidence < 0.9) {
      item.glycemic_index = db.gi;
      item.gi_confidence = db.confidence;

      // Use database fiber/carb data if available and more precise
      if (db.fiber_per_100g && item.portion_g) {
        const dbFiber = parseFloat(((db.fiber_per_100g * item.portion_g) / 100).toFixed(1));
        if (Math.abs(dbFiber - item.fiber_g) > 2) {
          item.fiber_g = dbFiber;
          item.net_carb_g = parseFloat((item.carbohydrate_g - item.fiber_g).toFixed(1));
        }
      }

      item.glycemic_load = parseFloat(
        ((db.gi * item.net_carb_g) / 100).toFixed(1)
      );
    }
  }

  // Recalculate totals from enriched items
  data.total_glycemic_load = parseFloat(
    data.food_items
      .reduce((s, i) => s + (i.glycemic_load || 0), 0)
      .toFixed(1)
  );
  data.total_fiber_g = parseFloat(
    data.food_items.reduce((s, i) => s + (i.fiber_g || 0), 0).toFixed(1)
  );
  data.total_net_carb_g = parseFloat(
    data.food_items.reduce((s, i) => s + (i.net_carb_g || 0), 0).toFixed(1)
  );

  data.glucose_risk =
    data.total_glycemic_load < 10
      ? "low"
      : data.total_glycemic_load <= 20
      ? "medium"
      : "high";

  return data;
}
