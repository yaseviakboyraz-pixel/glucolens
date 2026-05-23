import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  const checks = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env.NODE_ENV,
    checks: {
      api: true,
      anthropic_key: !!process.env.ANTHROPIC_API_KEY,
      supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    response_ms: Date.now() - start,
  };
  return NextResponse.json(checks, {
    status: 200,
    headers: { "Cache-Control": "no-store", "X-Health-Check": "glucolens-api" },
  });
}
