#!/usr/bin/env node
/**
 * GlucoLens — PROACTIVE model-deprecation watcher.
 *
 * The 5-minute deep canary (uptime.yml -> /api/health?deep=1) is REACTIVE:
 * it only fires once a model already fails. That is what took analyze 100%
 * down for weeks. This watcher is PROACTIVE: it warns while a model is still
 * fully working but has a retirement date on the horizon, using
 * endoflife.date's machine-readable Claude lifecycle data. Anthropic gives
 * >= 60 days notice, so a 75-day window leaves calm time to migrate.
 *
 * "Which models do we use?" is read from the app's own /api/health?deep=1
 * (model_chain), so this never drifts from the deployed MODEL_CHAIN. You can
 * override with WATCH_MODELS to run locally without the health token.
 *
 * Exit 1 (=> GitHub emails on the scheduled run, same as uptime.yml) if any
 * live model is already past EOL or within WARN_DAYS of retirement.
 * Fails SAFE: ambiguous name-matches or a transient data-source outage warn
 * but do NOT raise a false alarm.
 */

const APP = process.env.APP_URL || "https://glucolens-nine.vercel.app";
const HEALTH_TOKEN = process.env.HEALTH_CHECK_TOKEN || "";
const WARN_DAYS = parseInt(process.env.WARN_DAYS || "75", 10);
const EOL_URL = "https://endoflife.date/api/v1/products/claude/";
const DEPRECATIONS = "https://platform.claude.com/docs/en/about-claude/model-deprecations";

const norm = (s) =>
  String(s).toLowerCase().replace(/claude[-\s]?/g, "").replace(/[^a-z0-9]/g, "");

async function getAppModels() {
  // Optional override — run the check locally WITHOUT the health token:
  //   WATCH_MODELS="claude-sonnet-4-6,claude-haiku-4-5" node scripts/model-watch.mjs
  const override = (process.env.WATCH_MODELS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (override.length) return override;

  // HTTP header values must be ASCII; a pasted placeholder (e.g. Turkish chars)
  // otherwise throws a cryptic ByteString error instead of a clear one.
  if (!HEALTH_TOKEN || /[^\x20-\x7E]/.test(HEALTH_TOKEN)) {
    throw new Error(
      "HEALTH_CHECK_TOKEN missing or non-ASCII (did you paste the placeholder?). " +
        "Set the real token, or WATCH_MODELS='claude-sonnet-4-6,claude-haiku-4-5' to test without it."
    );
  }

  const r = await fetch(`${APP}/api/health?deep=1`, {
    headers: { "x-health-token": HEALTH_TOKEN },
  });
  // health returns 503 when a model is unreachable but the JSON is still valid.
  if (!r.ok && r.status !== 503) throw new Error(`health ${r.status}`);
  const j = await r.json();
  const chain = j.model_chain || [];
  if (!chain.length) throw new Error("no model_chain (HEALTH_CHECK_TOKEN wrong?)");
  return chain.map((c) => c.model);
}

async function getLifecycle() {
  const r = await fetch(EOL_URL, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(`endoflife ${r.status}`);
  const j = await r.json();
  const res = j.result ?? j; // v1 wraps in { result: ... }
  return res.releases ?? res.cycles ?? (Array.isArray(res) ? res : []);
}

// Best-effort match between an Anthropic model id ("claude-sonnet-4-6") and an
// endoflife cycle. Both sides are normalised (drop "claude", strip separators)
// and matched by containment; the longest match wins.
function matchCycle(model, cycles) {
  const m = norm(model);
  let best = null;
  for (const c of cycles) {
    for (const key of [c.name, c.label, c.codename].filter(Boolean)) {
      const k = norm(key);
      if (k && (m.includes(k) || k.includes(m))) {
        if (!best || k.length > norm(best.__key).length) best = { ...c, __key: key };
      }
    }
  }
  return best;
}

function daysUntil(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z").getTime();
  return Math.round((d - Date.now()) / 86400000);
}

(async () => {
  let models;
  try {
    models = await getAppModels();
  } catch (e) {
    console.error("::error::cannot read app models:", e.message);
    process.exit(1);
  }

  let cycles;
  try {
    cycles = await getLifecycle();
  } catch (e) {
    // Don't false-alarm on a transient endoflife.date outage.
    console.error("::warning::endoflife fetch failed:", e.message, "- proactive check skipped this run");
    console.log("Watched models:", models.join(", "));
    process.exit(0);
  }

  const rows = [];
  const problems = [];
  for (const model of models) {
    const c = matchCycle(model, cycles);
    if (!c) {
      rows.push(`  ${model}: no lifecycle match (new model or naming mismatch — review manually)`);
      continue;
    }
    const eol = c.eol;
    if (eol === false || eol == null) {
      rows.push(`  ${model} -> ${c.__key}: active (no EOL date set)`);
      continue;
    }
    const left = daysUntil(eol);
    rows.push(`  ${model} -> ${c.__key}: EOL ${eol} (${left} days)`);
    if (left <= WARN_DAYS) problems.push(`${model} retires ${eol} (${left} days left)`);
  }

  console.log("=== GlucoLens model lifecycle ===");
  rows.forEach((r) => console.log(r));

  if (problems.length) {
    console.error(
      "::error::MODEL RETIREMENT APPROACHING — migrate AI_MODEL/FREE_MODEL before the date. " +
        problems.join("; ") +
        ". Official schedule: " + DEPRECATIONS
    );
    process.exit(1);
  }
  console.log(`OK — all live models are active and outside the ${WARN_DAYS}-day window.`);
})();
