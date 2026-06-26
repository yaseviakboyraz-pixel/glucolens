import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL } from "./ai-model";

// Ordered model chain: primary first, then fallback(s). If the primary model is
// retired or transiently failing, the next one is tried automatically so the app
// SURVIVES a model outage instead of going 100% down — which is exactly what a
// retired model snapshot did to every AI endpoint.
//
// Configure via env (no code change needed):
//   ANTHROPIC_MODEL            → primary model
//   ANTHROPIC_FALLBACK_MODELS  → comma-separated fallbacks, cheapest/stablest first
//
// Default fallback is Haiku: cheaper + faster than the primary, so an automatic
// fallback at scale degrades cost/latency gracefully rather than exploding it
// (a fallback to a pricier model could be catastrophic under load).
export const MODEL_CHAIN: string[] = [
  AI_MODEL,
  ...(process.env.ANTHROPIC_FALLBACK_MODELS || "claude-haiku-4-5")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
].filter((m, i, a) => a.indexOf(m) === i);

// True when trying a DIFFERENT model could plausibly succeed: the model is dead
// (404) or the server is transiently unhappy (429/500/503/529). Client/auth
// errors (400/401/403) are NOT retried — another model won't fix a bad image or
// a bad key, and retrying just wastes calls and money.
function shouldFallThrough(status: number | undefined): boolean {
  return status === 404 || status === 429 || status === 500 || status === 503 || status === 529;
}

// Run an Anthropic call across the model chain. The caller passes a closure that
// builds + sends the request for a given model, keeping full type-safety and
// control of its own client and params; this function only orchestrates the
// fallback. Returns which model actually served and whether it fell back.
export async function withModelFallback(
  call: (model: string) => Promise<Anthropic.Message>
): Promise<{ response: Anthropic.Message; modelUsed: string; fellBack: boolean }> {
  let lastErr: unknown;
  for (let i = 0; i < MODEL_CHAIN.length; i++) {
    const model = MODEL_CHAIN[i];
    try {
      const response = await call(model);
      return { response, modelUsed: model, fellBack: i > 0 };
    } catch (e) {
      const status = (e as { status?: number })?.status;
      lastErr = e;
      // Fail fast on errors another model can't fix.
      if (!shouldFallThrough(status)) throw e;
      console.error(
        `[ai-client] model "${model}" failed (status ${status ?? "?"}); trying next in chain`
      );
    }
  }
  // Whole chain exhausted — surface the last error.
  throw lastErr;
}
