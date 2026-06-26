import { NextRequest, NextResponse } from "next/server";
import { analyzeMealImage } from "@/lib/claude-vision";
import { rateLimit, clientKey } from "@/lib/rate-limit";

export const maxDuration = 60;

// ── Rate limiting (shared — distributed when Upstash configured, else in-memory) ──
const RATE_LIMIT = 20;       // max requests per IP per minute
const RATE_WINDOW_SEC = 60;

// ── Allowed userType values ────────────────────────────────────────────────────
const VALID_USER_TYPES = new Set([
  "healthy", "pre_diabetic", "diabetic", "type1", "type2", "athlete", "elderly", "child",
]);

function sanitizeString(s: unknown, maxLen = 200): string {
  if (typeof s !== "string") return "";
  return s.slice(0, maxLen).replace(/[<>"'&]/g, "");
}

export async function POST(req: NextRequest) {
  // Shared rate limit (distributed when Upstash is configured, else in-memory)
  const { allowed, remaining } = await rateLimit(clientKey(req, "analyze"), RATE_LIMIT, RATE_WINDOW_SEC);
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
    // Reject oversized payloads before buffering the whole body into memory (DoS guard)
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 12_000_000) {
      return NextResponse.json({ error: "Image too large. Max 8MB." }, { status: 413 });
    }

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

    // Log the real error in all environments (prod error visibility).
    console.error("[GlucoLens analyze]", rawMessage);

    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
