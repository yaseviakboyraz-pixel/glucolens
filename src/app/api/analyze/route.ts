import { NextRequest, NextResponse } from "next/server";
import { analyzeMealImage } from "@/lib/claude-vision";

export const maxDuration = 60;

// ── Rate limiting (in-memory, per IP) ─────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;        // max requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute window

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: RATE_LIMIT - entry.count };
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60_000);

// ── Allowed userType values ────────────────────────────────────────────────────
const VALID_USER_TYPES = new Set([
  "healthy", "pre_diabetic", "diabetic", "type1", "type2", "athlete", "elderly", "child",
]);

function sanitizeString(s: unknown, maxLen = 200): string {
  if (typeof s !== "string") return "";
  return s.slice(0, maxLen).replace(/[<>"'&]/g, "");
}

export async function POST(req: NextRequest) {
  // ── Rate limit ──────────────────────────────────────────────────────────────
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const { allowed, remaining } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Limit": String(RATE_LIMIT),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const body = await req.json();
    const { imageBase64, userType: rawUserType, mealContext: rawContext } = body;

    // ── Input validation ────────────────────────────────────────────────────
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return NextResponse.json({ error: "Image required" }, { status: 400 });
    }

    // Sanitize userType — whitelist only
    const userType = VALID_USER_TYPES.has(rawUserType) ? rawUserType : "healthy";

    // Sanitize mealContext — strip HTML, limit length
    const mealContext = rawContext ? sanitizeString(rawContext, 200) : undefined;

    // Image size check
    const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const sizeKB = Math.round((base64Data.length * 3) / 4 / 1024);
    if (sizeKB > 8000) {
      return NextResponse.json({ error: "Image too large. Max 8MB." }, { status: 400 });
    }

    const start = Date.now();
    const analysis = await analyzeMealImage(base64Data, userType, mealContext);

    return NextResponse.json(
      { analysis, processingMs: Date.now() - start, disclaimer: "Not medical advice." },
      {
        headers: {
          "X-RateLimit-Limit": String(RATE_LIMIT),
          "X-RateLimit-Remaining": String(remaining),
        },
      }
    );
  } catch (err: unknown) {
    // ── Sanitized error response — no internal details leaked ──────────────
    const isDev = process.env.NODE_ENV === "development";
    const rawMessage = err instanceof Error ? err.message : String(err);

    // Only expose safe error messages
    const safeMessages = [
      "No food detected",
      "AI returned invalid JSON",
      "AI response missing food items",
      "Image required",
      "Image too large",
    ];
    const safeMessage = safeMessages.find(s => rawMessage.includes(s)) ||
      "Analysis failed. Please try again.";

    if (isDev) console.error("[GlucoLens analyze]", rawMessage);

    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
