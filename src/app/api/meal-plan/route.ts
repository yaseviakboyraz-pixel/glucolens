import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { withModelFallback } from "@/lib/ai-client";
import { resolveLang, langDirective } from "@/lib/ai-lang";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are GlucoLens Meal Planner — a clinical nutritionist specializing in glycemic management.
Generate a personalized daily meal plan. Return ONLY valid JSON, no markdown.

GL targets per profile:
- healthy: breakfast <15, lunch <20, dinner <20, snack <8, daily total <60
- pre_diabetic: breakfast <12, lunch <15, dinner <15, snack <6, daily total <45
- diabetic: breakfast <10, lunch <12, dinner <12, snack <5, daily total <35

For each meal include:
- Real, cookable dishes (not vague like "protein + carb")
- Turkish/Mediterranean options when relevant
- Exact portion sizes in grams
- Preparation tip (1 sentence)
- Why it fits the profile (1 sentence)
- GL and GI estimates

Return exactly this JSON:
{
  "profile": "healthy|pre_diabetic|diabetic",
  "daily_gl_target": 55,
  "daily_gl_total": 48,
  "meals": [
    {
      "type": "breakfast|lunch|dinner|snack",
      "time_suggestion": "07:30",
      "name": "Menemen with Whole Wheat Bread",
      "name_tr": "Menemen + Kepekli Ekmek",
      "description": "Scrambled eggs with tomatoes, peppers and olive oil",
      "items": [
        { "name": "Menemen", "portion_g": 200, "gl": 8, "gi": 25 },
        { "name": "Kepekli ekmek", "portion_g": 40, "gl": 5, "gi": 49 }
      ],
      "meal_gl": 13,
      "meal_gi_avg": 35,
      "calories_est": 380,
      "protein_g": 18,
      "fiber_g": 6,
      "prep_tip": "Use olive oil instead of butter for lower saturated fat",
      "why_good": "High protein slows glucose absorption, moderate GL stays within target",
      "risk": "low"
    }
  ],
  "daily_tips": [
    "Start meals with vegetables or soup to slow carb absorption",
    "Walk 10-15 minutes after lunch and dinner"
  ],
  "shopping_list": [
    { "item": "eggs", "amount": "6 adet" },
    { "item": "whole wheat bread", "amount": "1 somun" }
  ]
}`;

export async function POST(req: NextRequest) {
  const { allowed } = await rateLimit(clientKey(req, "meal-plan"), 10, 60);
  if (!allowed) return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  try {
    const { userType = "healthy", preferences = "", lang: rawLang } = await req.json();
    const lang = resolveLang(rawLang);

    const profileNote = userType === "diabetic"
      ? "DIABETIC: Keep every meal GL very low. No refined carbs, no added sugar, no white rice/bread. Prioritize protein + fiber + healthy fats."
      : userType === "pre_diabetic"
      ? "PRE-DIABETIC: Moderate carb restriction. Whole grains only. No sugary drinks or desserts. Mediterranean diet principles."
      : "HEALTHY: Balanced nutrition with good GL management. Include variety. Can include moderate carb servings.";

    // Cuisine preference (which dishes) is separate from output language (what
    // language the text is written in). Keep a light regional hint, then let the
    // shared directive localize every human-readable field. No GI-DB lookup here,
    // so names localize directly (keepNameEnglish = false).
    const cuisineNote = lang === "tr"
      ? "Prefer authentic Turkish dishes with traditional names."
      : "Include a culturally relevant mix plus international variety.";

    const outputLang = langDirective(
      lang,
      'every meal "name", "description", "prep_tip", "why_good", each item "name", every "daily_tips" entry, and each shopping_list "item"',
      false
    );

    const prefNote = preferences
      ? `User preferences/restrictions: ${preferences}`
      : "No specific preferences. Provide varied, practical, delicious meals.";

    const prompt = `Generate a full day meal plan (breakfast, lunch, dinner, 1-2 snacks).
Profile: ${userType}
${profileNote}
${cuisineNote}
${prefNote}
Make it realistic and culturally relevant. Include a shopping list.${outputLang}`;

    const { response } = await withModelFallback((model) =>
      client.messages.create({
        model,
        max_tokens: 3000,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
      })
    );

    let raw = (response.content[0] as { type: string; text: string }).text.trim();
    if (raw.startsWith("```")) {
      const parts = raw.split("```");
      raw = parts[1] || parts[0];
      if (raw.startsWith("json")) raw = raw.slice(4);
    }

    const plan = JSON.parse(raw.trim());
    return NextResponse.json({ plan });

  } catch (err: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[GlucoLens MealPlan]", err instanceof Error ? err.message : String(err));
    }
    return NextResponse.json({ error: "Meal plan generation failed. Please try again." }, { status: 500 });
  }
}
