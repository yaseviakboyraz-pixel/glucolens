import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MENU_SYSTEM = `You are GlucoLens Menu Analyzer. Given a restaurant menu (as text or image), extract all dishes and estimate their glycemic load.

Return ONLY valid JSON, no markdown:
{
  "restaurant_name": "string or null",
  "cuisine_type": "Turkish/Italian/etc",
  "dishes": [
    {
      "name": "dish name",
      "name_tr": "Turkish name if applicable",
      "category": "starter/main/dessert/salad/soup/bread/drink",
      "estimated_gl": 25,
      "glucose_risk": "low|medium|high",
      "gi_estimate": 55,
      "main_ingredients": ["ingredient1", "ingredient2"],
      "carb_heavy": true,
      "fiber_rich": false,
      "protein_rich": true,
      "notes": "brief note about glucose impact"
    }
  ],
  "top_safe": ["dish1", "dish2", "dish3"],
  "top_risky": ["dish1", "dish2"],
  "meal_tips": ["tip1", "tip2"]
}

GL risk: low < 10, medium 10-20, high > 20
For pure proteins/fats (grilled meat, fish, eggs, cheese): gl=0-5, risk=low
For bread/rice/pasta/desserts: typically high
Be realistic — a Turkish kebab with bread is medium-high, without bread is low.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, text, base64, contentType, userType = "healthy" } = body;

    const profileNote = userType === "diabetic"
      ? " USER: Diabetic — flag any dish with GL > 15 as dangerous."
      : userType === "pre_diabetic"
      ? " USER: Pre-diabetic — flag GL > 18."
      : " USER: Healthy — general wellness guidance.";

    let messageContent: Anthropic.MessageParam["content"];

    if (type === "text" && text) {
      messageContent = [{
        type: "text",
        text: `Analyze this restaurant menu and return JSON.\n\nMENU CONTENT:\n${text}`,
      }];
    } else if ((type === "image" || type === "pdf") && base64) {
      const mediaType = (contentType || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
      messageContent = [
        {
          type: "image",
          source: { type: "base64", media_type: mediaType, data: base64 },
        },
        {
          type: "text",
          text: "Analyze this restaurant menu image and return JSON with all dishes and their glycemic load estimates.",
        },
      ];
    } else {
      return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: MENU_SYSTEM + profileNote,
      messages: [{ role: "user", content: messageContent }],
    });

    let raw = (response.content[0] as { type: string; text: string }).text.trim();
    if (raw.startsWith("```")) {
      const parts = raw.split("```");
      raw = parts[1] || parts[0];
      if (raw.startsWith("json")) raw = raw.slice(4);
    }

    const data = JSON.parse(raw.trim());
    return NextResponse.json({ menu: data });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
