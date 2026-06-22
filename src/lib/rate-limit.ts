// Shared rate limiter for the AI endpoints.
//
// WHY: every AI route proxies a paid Anthropic call. Without a shared limiter an
// attacker can hammer the endpoints and run up cost. The previous in-memory
// Map limiter is useless on Vercel because each serverless instance has its own
// memory and they reset on cold start.
//
// HOW: when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are configured we
// use Upstash Redis over its REST API (HTTP — works perfectly on serverless,
// shared across all instances). When they are NOT configured we fall back to a
// best-effort in-memory counter: degraded (per-instance only) but still better
// than nothing, and it keeps the app working with zero setup. Adding the two env
// vars upgrades every endpoint to true distributed limiting automatically.
//
// No npm dependency — the Upstash REST API is called directly with fetch.

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

const REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// ── In-memory fallback (per-instance, best-effort) ──────────────────
const mem = new Map<string, { count: number; resetAt: number }>();

function memLimit(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  const entry = mem.get(key);
  if (!entry || entry.resetAt < now) {
    mem.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    // Opportunistic cleanup — no setInterval (which doesn't run reliably on serverless)
    if (mem.size > 5000) {
      for (const [k, v] of mem) if (v.resetAt < now) mem.delete(k);
    }
    return { allowed: true, remaining: limit - 1, limit };
  }
  entry.count++;
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count), limit };
}

// ── Upstash Redis REST (distributed) ────────────────────────────────
async function upstashLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  // Atomic-ish fixed window: INCR the counter, set TTL only on first hit (NX).
  const res = await fetch(`${REST_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REST_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(windowSec), "NX"],
    ]),
    // Keep the limiter from hanging a request if Upstash is slow
    signal: AbortSignal.timeout(2000),
  });

  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const data = (await res.json()) as Array<{ result: number }>;
  const count = Number(data?.[0]?.result ?? 0);
  if (!count) throw new Error("upstash empty result");

  return { allowed: count <= limit, remaining: Math.max(0, limit - count), limit };
}

/**
 * Rate-limit a key to `limit` requests per `windowSec` seconds.
 * Never throws — on any backend error it degrades to in-memory and, failing
 * that, allows the request (fail-open) so a limiter outage can't take the app down.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  if (REST_URL && REST_TOKEN) {
    try {
      return await upstashLimit(key, limit, windowSec);
    } catch {
      // fall through to in-memory
    }
  }
  try {
    return memLimit(key, limit, windowSec);
  } catch {
    return { allowed: true, remaining: limit, limit };
  }
}

/** Build a per-client key from the request IP, scoped to an endpoint. */
export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  return `rl:${scope}:${ip}`;
}
