import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { withModelFallback } from "@/lib/ai-client";

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { allowed } = await rateLimit(clientKey(req, "coach"), 20, 60);
  if (!allowed) return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

    const { response } = await withModelFallback((model) =>
      client.messages.create({
      model,
      max_tokens: 600,
      system: "You are GlucoLens AI Coach — a friendly, knowledgeable nutrition coach specializing in blood sugar and glycemic management. Be concise (3-5 sentences), warm, specific, and actionable. Respond in the same language as the user. Never give medical diagnoses. Never recommend insulin doses or medication changes. NEVER output specific blood glucose numbers in any unit (mg/dL or mmol/L) — describe glucose response only in relative terms (gentle/moderate/sharp). Always suggest consulting a doctor for medical decisions. When referencing data, be specific with GL and nutrition numbers (never blood-glucose values). When giving food advice, include GL estimates.",
      messages: [{ role: "user", content: prompt }],
    }));

    const message = (response.content[0] as { type: string; text: string }).text.trim();
    return NextResponse.json({ message });
  } catch (err: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("[GlucoLens coach]", err instanceof Error ? err.message : String(err));
    }
    return NextResponse.json({ error: "Coach is unavailable right now. Please try again." }, { status: 500 });
  }
}
