import { NextRequest, NextResponse } from "next/server";
import { analyzeMealImage } from "@/lib/claude-vision";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, userType, mealContext } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "Görsel gerekli" }, { status: 400 });
    const sizeKB = Math.round((imageBase64.length * 3) / 4 / 1024);
    if (sizeKB > 5000) return NextResponse.json({ error: "Görsel 5MB'dan küçük olmalı" }, { status: 400 });
    const start = Date.now();
    const analysis = await analyzeMealImage(imageBase64, userType, mealContext);
    return NextResponse.json({
      analysis,
      processingMs: Date.now() - start,
      disclaimer: "Bu analiz tıbbi tavsiye değildir. Diyabet yönetimi için doktorunuza danışın."
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Analiz başarısız" }, { status: 500 });
  }
}
