import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { withModelFallback } from "@/lib/ai-client";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GI_SYSTEM = `You are a clinical nutritionist and glycemic index expert with encyclopedic knowledge of global foods.

Your job: estimate precise nutritional and glycemic values for any food from any cuisine worldwide.

Rules:
- GL = (GI × net_carb_g) / 100  — always recalculate, never guess
- glucose_risk: low GL<10, medium GL 10-20, high GL>20
- For pure proteins/fats (meat, fish, eggs, cheese, oil): GI=0, GL=0
- For Turkish foods use authentic preparation knowledge (e.g. pilav with butter vs olive oil, baklava with şerbet vs honey)
- For packaged/branded foods use product-specific data when known (e.g. Magnum Classic GI≈50)
- gi_confidence: 0.95+ for lab-verified, 0.85-0.95 for well-researched, 0.7-0.85 for estimated, <0.7 for exotic/uncertain
- Fiber lowers net carbs and GL significantly — be accurate
- Cooking method matters: al dente pasta GI≈40, overcooked GI≈60; baked potato GI≈85, boiled GI≈65
- Ripeness matters for fruit: ripe banana GI≈62, unripe GI≈30
- Portion is already specified — calculate all values for that exact portion, not per 100g
- similar_foods: provide 2-3 foods with lower GL as alternatives
- Return ONLY valid JSON. No markdown, no explanation.`;

export async function POST(req: NextRequest) {
  const { allowed } = await rateLimit(clientKey(req, "gi-estimate"), 30, 60);
  if (!allowed) return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  try {
    const { food, portion_g = 100, context = "", userType = "healthy" } = await req.json();

    if (!food) {
      return NextResponse.json({ error: "Food name required" }, { status: 400 });
    }

    const userNote = userType === "diabetic"
      ? " Note: User is diabetic — flag if GL > 12."
      : userType === "pre_diabetic"
      ? " Note: User is pre-diabetic — flag if GL > 15."
      : "";

    const prompt = `Estimate nutritional and glycemic values for: "${food}"${context ? ` (${context})` : ""}
Portion: ${portion_g}g${userNote}

Return ONLY this JSON (all values for the ${portion_g}g portion):
{
  "name": "${food}",
  "name_tr": "Turkish name if applicable, else same",
  "gi": <0-100>,
  "gl": <glycemic load for ${portion_g}g>,
  "confidence": <0.0-1.0>,
  "carb_g": <total carbohydrates>,
  "fiber_g": <dietary fiber>,
  "net_carb_g": <net carbs = carb_g - fiber_g>,
  "sugar_g": <total sugar>,
  "protein_g": <protein>,
  "fat_g": <fat>,
  "calories": <kcal>,
  "glucose_risk": "low|medium|high",
  "cooking_method": "raw|boiled|grilled|fried|baked|other",
  "glucose_curve_shape": "flat|gentle_rise|moderate_rise|sharp_rise",
  "peak_minutes": <estimated minutes to glucose peak>,
  "notes": "1-2 sentence insight about glycemic impact",
  "category": "grain|fruit|vegetable|meat|dairy|legume|snack|dessert|beverage|other",
  "similar_lower_gl": ["food1", "food2"],
  "source": "GI Database|Claude AI Estimate|Lab Verified"
}`;

    const { response } = await withModelFallback((model) =>
      client.messages.create({
        model,
        max_tokens: 800,
        system: GI_SYSTEM,
        messages: [{ role: "user", content: prompt }],
      })
    );

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid response format");

    const data = JSON.parse(jsonMatch[0]);

    // Recalculate GL defensively. The model can omit gi/net_carb_g; the old
    // code then produced NaN here, and since (NaN < 10) and (NaN <= 20) are
    // both false it mislabelled the food "high" risk and rendered "NaN" as GL.
    const giNum = Math.max(0, Number(data.gi) || 0);
    const netCarb = Math.max(0, Number(data.net_carb_g) || 0);
    data.gi = giNum;
    data.net_carb_g = netCarb;
    data.gl = parseFloat(((giNum * netCarb) / 100).toFixed(1));
    data.glucose_risk = data.gl < 10 ? "low" : data.gl <= 20 ? "medium" : "high";

    return NextResponse.json({ success: true, estimate: data, ai_generated: true });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[GlucoLens GI estimate]", error instanceof Error ? error.message : String(error));
    }
    return NextResponse.json({ error: "Failed to estimate GI values" }, { status: 500 });
  }
}
