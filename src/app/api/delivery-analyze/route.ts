import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit, clientKey } from "@/lib/rate-limit";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const maxDuration = 60;

const DELIVERY_SYSTEM_PROMPT = `You are GlucoLens AI — a glucose and glycemic analysis expert.

You are analyzing a FOOD DELIVERY ORDER. This could be:
- A screenshot from Yemeksepeti, Trendyol Yemek, Getir, UberEats, Glovo, or similar apps
- A photo of a food delivery box/bag with visible label
- A receipt or order confirmation showing food items
- A menu screenshot with selected items
- A photo of delivered food in packaging

Your job:
1. Extract ALL food items from the order (read text carefully, identify dish names)
2. Estimate realistic portions based on restaurant standards
3. Calculate nutritional values for each item
4. Provide complete glucose analysis

IMPORTANT for Turkish delivery apps:
- Yemeksepeti / Trendyol Yemek / Getir orders are typically in Turkish
- Common Turkish restaurant foods: döner, pide, lahmacun, köfte, mantı, börek, pilav, mercimek çorbası
- Turkish desserts: baklava GI~55, künefe GI~65, sütlaç GI~52, revani GI~62, kadayıf GI~60, şekerpare GI~58, tulumba GI~72, dondurma GI~61, profiterol GI~68, tiramisu GI~62, cheesecake GI~35
- Portion standards: döner wrap ~250g, pide ~350g, lahmacun ~200g, köfte portion ~180g, baklava 3 pieces ~180g, künefe portion ~200g

For dessert-only orders (e.g. from a pastry shop/tatlıcı):
- Identify each dessert item
- Use standard Turkish pastry shop portions
- Note high sugar content

Return ONLY valid JSON, no markdown:
{
  "platform_detected": "Yemeksepeti / Trendyol Yemek / Getir / UberEats / Pastry Shop / Unknown",
  "restaurant_detected": "Restaurant name or type if visible",
  "order_items_detected": ["item1", "item2"],
  "food_items": [{
    "name": "English name",
    "name_tr": "Turkish name",
    "portion_g": 250,
    "total_sugar_g": 3.0,
    "added_sugar_g": 1.0,
    "carbohydrate_g": 45.0,
    "fiber_g": 3.0,
    "net_carb_g": 42.0,
    "protein_g": 22.0,
    "fat_g": 12.0,
    "calories": 380,
    "glycemic_index": 50,
    "glycemic_load": 21.0,
    "gi_confidence": 0.82,
    "cooking_method": "grilled",
    "delivery_note": "Standard restaurant portion estimated"
  }],
  "total_sugar_g": 8.0,
  "total_added_sugar_g": 2.0,
  "total_net_carb_g": 85.0,
  "total_fiber_g": 6.0,
  "total_protein_g": 44.0,
  "total_fat_g": 28.0,
  "total_calories": 760,
  "avg_glycemic_index": 52,
  "total_glycemic_load": 44.2,
  "glucose_risk": "high",
  "glucose_peak_estimate": "Sharp glucose response expected within ~45-75 minutes (illustrative, not a blood-glucose measurement)",
  "glucose_curve_description": "Sharp rise expected from high-carb delivery meal",
  "glucose_curve": {
    "shape": "sharp_rise",
    "peak_minutes": 50,
    "baseline_minutes": 170,
    "peak_level": "high",
    "points": [
      {"minutes": 0, "level": 0},
      {"minutes": 20, "level": 40},
      {"minutes": 40, "level": 80},
      {"minutes": 50, "level": 100},
      {"minutes": 80, "level": 70},
      {"minutes": 120, "level": 35},
      {"minutes": 170, "level": 0}
    ]
  },
  "timing_actions": {
    "pre_meal": [
      "Walk for 10 minutes before eating — reduces glucose peak by ~20%",
      "Drink a large glass of water — helps slow absorption"
    ],
    "post_meal": [
      "Take a 15-minute walk immediately after finishing",
      "Avoid lying down for at least 30 minutes"
    ],
    "meal_mods": [
      "Eat protein and vegetables first before carbs",
      "Skip extra bread/pide if served — reduces GL by ~30%"
    ],
    "swap_suggestion": "Order salad or soup as starter to slow glucose absorption"
  },
  "recommendations": [],
  "warnings": ["High GL delivery meal — consider splitting into two portions"],
  "confidence_score": 0.75,
  "analysis_note": "Delivery order analysis — portions estimated based on restaurant standards"
}`;

export async function POST(req: NextRequest) {
  const { allowed } = await rateLimit(clientKey(req, "delivery"), 15, 60);
  if (!allowed) return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  try {
    const body = await req.json();
    const { imageBase64, userType = "healthy", orderText, text, platform } = body;

    if (!imageBase64 && !orderText && !text) {
      return NextResponse.json({ error: "Image or order text required" }, { status: 400 });
    }

    const platformHint = platform
      ? `\n\nPLATFORM: ${platform.name} (${platform.region}) — use your knowledge of this platform's menu structure, typical dishes, and portion sizes.`
      : "";

    const orderContent = text || orderText;

    const profileNote = userType === "diabetic"
      ? "\n\nUSER: Diabetic. Emphasize high-risk items. Be very specific about glucose warnings."
      : userType === "pre_diabetic"
      ? "\n\nUSER: Pre-diabetic. Warn for GL > 18."
      : "\n\nUSER: Healthy individual.";

    const messages: Anthropic.MessageParam[] = [];

    if (imageBase64) {
      const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
      const mediaType = base64Data.startsWith("iVBOR") ? "image/png" as const : "image/jpeg" as const;

      messages.push({
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64Data } },
          { type: "text", text: `Analyze this food delivery order. Extract all food items and provide complete glucose analysis.${orderContent ? ` Additional context: ${orderContent}` : ""} Return JSON only.` },
        ],
      });
    } else {
      messages.push({
        role: "user",
        content: `Analyze this food delivery order and provide complete glucose analysis.\n\nOrder:\n${orderContent}\n\nReturn JSON only.`,
      });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: DELIVERY_SYSTEM_PROMPT + profileNote + platformHint,
      messages,
    });

    let raw = (response.content[0] as { type: string; text: string }).text.trim();
    if (raw.startsWith("```")) {
      const parts = raw.split("```");
      raw = parts[1] || parts[0];
      if (raw.startsWith("json")) raw = raw.slice(4);
    }

    const data = JSON.parse(raw.trim());
    return NextResponse.json({
      analysis: data,
      disclaimer: "Not medical advice. Portions estimated based on restaurant standards.",
    });

  } catch (err: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[GlucoLens Delivery]", err instanceof Error ? err.message : String(err));
    }
    return NextResponse.json({ error: "Delivery analysis failed. Please try again." }, { status: 500 });
  }
}
