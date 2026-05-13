import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: "You are GlucoLens AI Coach — a friendly, knowledgeable nutrition coach specializing in blood sugar and glycemic management. Be concise (3-5 sentences), warm, specific, and actionable. Respond in the same language as the user. Never give medical diagnoses. Always suggest consulting a doctor for medical decisions. When referencing data, be specific (use actual numbers). When giving food advice, include GL estimates.",
      messages: [{ role: "user", content: prompt }],
    });

    const message = (response.content[0] as { type: string; text: string }).text.trim();
    return NextResponse.json({ message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
