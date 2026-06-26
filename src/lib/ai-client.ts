import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL } from "./ai-model";

// Two models matter:
//   QUALITY_MODEL — best accuracy, used for Pro (and as Free's fallback).
//   FREE_MODEL    — cheaper + faster, used for Free (and as Pro's fallback).
// Both are env-configurable so the free/pro split — and any deprecation
// migration — is a one-variable change, never a code edit. If the cheap model
// underperforms, set ANTHROPIC_FREE_MODEL=claude-sonnet-4-6 to revert instantly.
export const QUALITY_MODEL = AI_MODEL; // ANTHROPIC_MODEL → default claude-sonnet-4-6
export const FREE_MODEL = process.env.ANTHROPIC_FREE_MODEL || "claude-haiku-4-5";

const EXTRA_FALLBACKS = (process.env.ANTHROPIC_FALLBACK_MODELS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Tier → ordered model chain. Free leads with the cheap/fast model and falls
// back to quality; Pro leads with quality and falls back to cheap. Either order
// also IS the resilience fallback — the app survives one model dying.
export function modelChainFor(tier: "free" | "pro"): string[] {
  const base = tier === "pro" ? [QUALITY_MODEL, FREE_MODEL] : [FREE_MODEL, QUALITY_MODEL];
  return [...new Set([...base, ...EXTRA_FALLBACKS])];
}

// Every distinct model the app may use — the health canary pings all of these
// so a hole in either tier's chain (e.g. a retired model) is caught early.
export const MODEL_CHAIN: string[] = [
  ...new Set([QUALITY_MODEL, FREE_MODEL, ...EXTRA_FALLBACKS]),
];

// True when trying a DIFFERENT model could plausibly succeed: the model is dead
// (404) or the server is transiently unhappy (429/500/503/529). Client/auth
// errors (400/401/403) are NOT retried — another model won't fix a bad image or
// a bad key, and retrying just wastes calls and money.
function shouldFallThrough(status: number | undefined): boolean {
  return status === 404 || status === 429 || status === 500 || status === 503 || status === 529;
}

// Run an Anthropic call across a model chain. The caller passes a closure that
// builds + sends the request for a given model (keeping full type-safety and
// control of its own client and params); this function only orchestrates the
// fallback. `chain` defaults to the full model set; pass modelChainFor(tier) to
// tier the request. Returns which model actually served and whether it fell back.
export async function withModelFallback(
  call: (model: string) => Promise<Anthropic.Message>,
  chain: string[] = MODEL_CHAIN
): Promise<{ response: Anthropic.Message; modelUsed: string; fellBack: boolean }> {
  let lastErr: unknown;
  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    try {
      const response = await call(model);
      return { response, modelUsed: model, fellBack: i > 0 };
    } catch (e) {
      const status = (e as { status?: number })?.status;
      lastErr = e;
      if (!shouldFallThrough(status)) throw e; // fail fast on errors another model can't fix
      console.error(
        `[ai-client] model "${model}" failed (status ${status ?? "?"}); trying next in chain`
      );
    }
  }
  throw lastErr;
}
