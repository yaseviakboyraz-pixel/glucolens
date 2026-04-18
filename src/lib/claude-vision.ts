import Anthropic from "@anthropic-ai/sdk";
import { lookupGI } from "./turkish-gi-data";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Sen GlucoLens AI'sın. Türk mutfağı uzmanı glukoz analiz asistanısın.
Fotoğraftaki yiyecekleri analiz et. SADECE JSON döndür, başka hiçbir metin ekleme.

Kurallar:
- Her yiyeceği ayrı tespit et, porsiyon gramını tahmin et
- Pişirme yöntemini belirle (haşlama GI düşürür, kızartma artırır)
- Gizli yağ/sos/şekeri tahmin et
- net_carb_g = carbohydrate_g - fiber_g
- glycemic_load = (glycemic_index * net_carb_g) / 100
- glucose_risk: "low" GL<10, "medium" GL 10-20, "high" GL>20

JSON formatı:
{
  "food_items": [{
    "name": "English name",
    "name_tr": "Türkçe ad",
    "portion_g": 150,
    "total_sugar_g": 5.2,
    "added_sugar_g": 0.5,
    "carbohydrate_g": 28.0,
    "fiber_g": 3.0,
    "net_carb_g": 25.0,
    "glycemic_index": 52,
    "glycemic_load": 13.0,
    "gi_confidence": 0.85,
    "cooking_method": "haşlama"
  }],
  "total_sugar_g": 12.4,
  "total_added_sugar_g": 1.5,
  "total_net_carb_g": 45.0,
  "total_fiber_g": 6.0,
  "avg_glycemic_index": 55,
  "total_glycemic_load": 24.8,
  "glucose_risk": "medium",
  "glucose_peak_estimate": "1-1.5 saat içinde ~140-160 mg/dL",
  "glucose_curve_description": "Orta hızlı yükseliş, 2 saatte normale dönüş",
  "recommendations": ["Limon eklemek GI düşürür"],
  "warnings": [],
  "confidence_score": 0.82,
  "hidden_ingredients_note": null
}`;

export interface FoodItem {
  name: string; name_tr: string; portion_g: number;
  total_sugar_g: number; added_sugar_g: number; carbohydrate_g: number;
  fiber_g: number; net_carb_g: number; glycemic_index: number;
  glycemic_load: number; gi_confidence: number; cooking_method?: string;
}

export interface MealAnalysis {
  food_items: FoodItem[];
  total_sugar_g: number; total_added_sugar_g: number;
  total_net_carb_g: number; total_fiber_g: number;
  avg_glycemic_index: number; total_glycemic_load: number;
  glucose_risk: "low" | "medium" | "high";
  glucose_peak_estimate: string; glucose_curve_description: string;
  recommendations: string[]; warnings: string[];
  confidence_score: number; hidden_ingredients_note?: string;
}

export async function analyzeMealImage(
  imageBase64: string,
  userType = "healthy",
  mealContext?: string
): Promise<MealAnalysis> {
  const profileNote = userType === "diabetic"
    ? "\n\nKULLANICI: Diyabetik. GL>15 için kesin uyar."
    : userType === "pre_diabetic"
    ? "\n\nKULLANICI: Pre-diyabetik. GL>18 için uyar."
    : "\n\nKULLANICI: Sağlıklı.";

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: SYSTEM_PROMPT + profileNote,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
        { type: "text", text: `Bu yemeği analiz et.${mealContext ? ` Ek bilgi: ${mealContext}` : ""}` }
      ]
    }]
  });

  let raw = (response.content[0] as { type: string; text: string }).text.trim();
  if (raw.startsWith("```")) {
    raw = raw.split("```")[1];
    if (raw.startsWith("json")) raw = raw.slice(4);
  }
  const data: MealAnalysis = JSON.parse(raw.trim());

  for (const item of data.food_items) {
    const db = lookupGI(item.name_tr || item.name);
    if (db && item.gi_confidence < 0.9) {
      item.glycemic_index = db.gi;
      item.gi_confidence = db.confidence;
      item.glycemic_load = parseFloat(((db.gi * item.net_carb_g) / 100).toFixed(1));
    }
  }

  data.total_glycemic_load = parseFloat(
    data.food_items.reduce((s, i) => s + (i.glycemic_load || 0), 0).toFixed(1)
  );
  data.glucose_risk =
    data.total_glycemic_load < 10 ? "low" :
    data.total_glycemic_load <= 20 ? "medium" : "high";

  return data;
}
