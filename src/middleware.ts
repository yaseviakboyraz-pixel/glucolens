import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter
// NOTE: On Vercel serverless, each invocation is isolated — this map resets per cold start.
// For production distributed rate limiting, use Upstash Redis:
// https://upstash.com/docs/redis/quickstarts/nextjs
// For now this provides basic protection within a single warm instance.
const rateMap = new Map<string, { count: number; reset: number }>();

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/analyze":          { max: 10, windowMs: 60_000 },
  "/api/delivery-analyze": { max: 10, windowMs: 60_000 },
  "/api/coach":            { max: 20, windowMs: 60_000 },
  "/api/gi-estimate":      { max: 30, windowMs: 60_000 },
  "/api/meal-plan":        { max: 5,  windowMs: 60_000 },
  "/api/menu-analyze":     { max: 5,  windowMs: 60_000 },
};

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const limit = LIMITS[path];

  if (!limit) return NextResponse.next();

  const ip = getIP(req);
  const key = `${ip}:${path}`;
  const now = Date.now();
  const entry = rateMap.get(key);

  if (!entry || now > entry.reset) {
    rateMap.set(key, { count: 1, reset: now + limit.windowMs });
    return NextResponse.next();
  }

  if (entry.count >= limit.max) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((entry.reset - now) / 1000)),
          "X-RateLimit-Limit": String(limit.max),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  entry.count++;
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/analyze", "/api/delivery-analyze", "/api/coach", "/api/gi-estimate", "/api/meal-plan", "/api/menu-analyze"],
};
