import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();
    if (!prompt) return NextResponse.json({ error: "Prompt required" }, { status: 400 });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: "You are GlucoLens AI Coach — a friendly, knowledgeable nutrition coach specializing in blood sugar and glycemic management. Be concise (2-4 sentences max), warm, and actionable. Never give medical diagnoses. Always suggest consulting a doctor for medical decisions.",
      messages: [{ role: "user", content: prompt }],
    });

    const message = (response.content[0] as { type: string; text: string }).text.trim();
    return NextResponse.json({ message });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
