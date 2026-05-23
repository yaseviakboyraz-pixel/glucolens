import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Bump these when a new App Store build is required
const VERSION_CONFIG = {
  current: "1.0.0",
  minimum_required: "1.0.0", // Force update below this version
  recommended: "1.0.0",
  release_notes: {
    tr: "İlk sürüm — AI ile glisemik yük analizi",
    en: "First release — AI-powered glycemic load analysis",
  },
  app_store_url: "https://apps.apple.com/app/glucolens/id000000000", // Update after publish
  force_update: false,
};

export async function GET() {
  return NextResponse.json(VERSION_CONFIG, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
