import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { food, portion_g = 100, context = "" } = await req.json();

    if (!food) {
      return NextResponse.json({ error: "Food name required" }, { status: 400 });
    }

    const prompt = `You are a nutritionist and glycemic index expert. Estimate the nutritional profile and glycemic values for: "${food}"${context ? ` (${context})` : ""}.

Portion size: ${portion_g}g

Respond ONLY with valid JSON, no explanation, no markdown:
{
  "name": "${food}",
  "gi": <glycemic index 0-100>,
  "gl": <glycemic load for ${portion_g}g>,
  "confidence": <0.0-1.0>,
  "carb_g": <total carbohydrates>,
  "fiber_g": <dietary fiber>,
  "net_carb_g": <net carbs>,
  "protein_g": <protein>,
  "fat_g": <fat>,
  "calories": <calories>,
  "sugar_g": <total sugar>,
  "glucose_risk": "low" or "medium" or "high",
  "notes": "<1 sentence about glycemic impact>",
  "category": "<food category>",
  "source": "Claude AI Estimate"
}

Rules:
- GL = (GI x net_carb_g) / 100
- glucose_risk: low=GL<10, medium=GL 10-20, high=GL>20
- All values for ${portion_g}g portion`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid response format");

    const data = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ success: true, estimate: data, ai_generated: true });
  } catch (error) {
    console.error("GI estimate error:", error);
    return NextResponse.json({ error: "Failed to estimate GI values" }, { status: 500 });
  }
}
