import { NextRequest, NextResponse } from "next/server";
import { MODEL_CHAIN } from "@/lib/ai-client";

export const dynamic = "force-dynamic";

// Health endpoint with two modes:
//   GET /api/health            → shallow check (env presence). Fast, free, public.
//   GET /api/health?deep=1&token=…  → ACTIVE model canary: pings EVERY model in
//       the fallback chain to prove they are actually reachable. This is the
//       check that would have caught the retired-model outage (analyze was 100%
//       down while shallow checks stayed green), and it also verifies the
//       fallback safety net has no holes. Token-gated: it makes small paid calls.
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
    model_chain?: { model: string; role: string; reachable: boolean; error?: string }[];
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

    const Anthropic = (await import("@anthropic-ai/sdk")).default;
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Ping every model in the chain with a minimal, near-zero-cost probe.
    const chain = await Promise.all(
      MODEL_CHAIN.map(async (model, i) => {
        const role = i === 0 ? "primary" : "fallback";
        try {
          await client.messages.create({
            model,
            max_tokens: 1,
            messages: [{ role: "user", content: "ping" }],
          });
          return { model, role, reachable: true };
        } catch (e) {
          return {
            model,
            role,
            reachable: false,
            error: e instanceof Error ? e.message.slice(0, 150) : String(e),
          };
        }
      })
    );
    result.model_chain = chain;

    // Red (503 → uptime alert) only if the PRIMARY is down — that means the app
    // is degraded and needs action. A broken fallback (primary still OK) stays
    // green but is visible in model_chain for the monthly resilience review, to
    // avoid alert fatigue while still surfacing a hole in the safety net.
    if (!chain[0]?.reachable) result.status = "degraded";
  }

  result.response_ms = Date.now() - start;
  const httpStatus = result.status === "ok" ? 200 : 503;
  return NextResponse.json(result, {
    status: httpStatus,
    headers: { "Cache-Control": "no-store", "X-Health-Check": "glucolens-api" },
  });
}
