import { NextRequest, NextResponse } from "next/server";
import { analyzeMealImage } from "@/lib/claude-vision";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, userType = "healthy", mealContext } = body;
    if (!imageBase64) return NextResponse.json({ error: "Image required" }, { status: 400 });
    const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const sizeKB = Math.round((base64Data.length * 3) / 4 / 1024);
    if (sizeKB > 8000) return NextResponse.json({ error: "Image too large" }, { status: 400 });
    const start = Date.now();
    const analysis = await analyzeMealImage(base64Data, userType, mealContext);
    return NextResponse.json({ analysis, processingMs: Date.now() - start, disclaimer: "Not medical advice." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[GlucoLens]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
