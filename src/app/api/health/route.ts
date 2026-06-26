import { NextRequest, NextResponse } from "next/server";
import { AI_MODEL } from "@/lib/ai-model";

export const dynamic = "force-dynamic";

// Health endpoint with two modes:
//   GET /api/health            → shallow check (env presence). Fast, free, public.
//   GET /api/health?deep=1&token=…  → ACTIVE model canary: pings the AI model to
//       prove it is actually reachable. This is the check that would have caught
//       the retired-model outage (analyze was 100% down while shallow checks
//       stayed green). Token-gated because it makes a small paid API call.
export async function GET(req: NextRequest) {
  const start = Date.now();
  const url = new URL(req.url);
  const deep = url.searchParams.get("deep") === "1";
  const token = url.searchParams.get("token") || req.headers.get("x-health-token") || "";

  const result: {
    status: string;
    timestamp: string;
    version: string;
    environment: string | undefined;
    checks: Record<string, boolean>;
    model?: { reachable: boolean; model: string; error?: string };
    response_ms: number;
  } = {
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
    response_ms: 0,
  };

  // Active model canary — only when explicitly requested AND authorized.
  if (deep) {
    const configured = process.env.HEALTH_CHECK_TOKEN;
    if (!configured || token !== configured) {
      result.status = "unauthorized";
      result.response_ms = Date.now() - start;
      return NextResponse.json(result, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      // Minimal, near-zero-cost probe: 1 output token, tiny prompt, no image.
      await client.messages.create({
        model: AI_MODEL,
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      });
      result.model = { reachable: true, model: AI_MODEL };
    } catch (e) {
      // Model unreachable/retired/auth-failed → report DEGRADED so the uptime
      // monitor turns red and GitHub emails an alert.
      result.status = "degraded";
      result.model = {
        reachable: false,
        model: AI_MODEL,
        error: e instanceof Error ? e.message.slice(0, 200) : String(e),
      };
    }
  }

  result.response_ms = Date.now() - start;
  const httpStatus = result.status === "ok" ? 200 : 503;
  return NextResponse.json(result, {
    status: httpStatus,
    headers: { "Cache-Control": "no-store", "X-Health-Check": "glucolens-api" },
  });
}
