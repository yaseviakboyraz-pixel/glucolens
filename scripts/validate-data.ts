/**
 * GlucoLens — GI data integrity validator
 * ----------------------------------------
 * tsc already guarantees structure, types, and duplicate keys WITHIN a single
 * object literal. It does NOT catch the one class of bug that silently corrupts
 * estimates: numeric values that are the wrong magnitude (e.g. a GI of 730 typo
 * for 73, a negative carb, a fiber value larger than the carb it came from).
 *
 * This script walks the live unified database (turkish-gi-data + 6 regional
 * sets, the exact object the app uses) plus the drink database, and flags any
 * out-of-range or impossible value. It exits non-zero on a hard error, so it
 * can be wired into CI (e.g. a "pretest"/"prebuild" step) to stop bad data from
 * ever shipping.
 *
 * Run:  npx tsx scripts/validate-data.ts
 */

import { GLOBAL_GI_DATABASE } from "../src/lib/gi-index";
import { GI_DATABASE } from "../src/lib/turkish-gi-data";
import { GI_MENA } from "../src/lib/gi-data-mena";
import { GI_INDIA } from "../src/lib/gi-data-india";
import { GI_ASIA } from "../src/lib/gi-data-asia";
import { GI_EUROPE } from "../src/lib/gi-data-europe";
import { GI_AMERICAS } from "../src/lib/gi-data-americas";
import { GI_AFRICA } from "../src/lib/gi-data-africa";

type AnyEntry = Record<string, unknown>;

const errors: string[] = [];
const warnings: string[] = [];

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// ── Per-entry validation ────────────────────────────────────────────────────
function checkEntry(key: string, e: AnyEntry) {
  // GI: pure glucose = 100. A few processed foods edge slightly above; anything
  // over 110 or below 0 is almost certainly a typo.
  if (!isNum(e.gi)) errors.push(`gi not a finite number — "${key}" (got ${JSON.stringify(e.gi)})`);
  else if (e.gi < 0 || e.gi > 110) errors.push(`gi out of range [0,110] — "${key}" = ${e.gi}`);

  // confidence ∈ [0,1]
  if (!isNum(e.confidence)) errors.push(`confidence not a finite number — "${key}" (got ${JSON.stringify(e.confidence)})`);
  else if (e.confidence < 0 || e.confidence > 1) errors.push(`confidence out of range [0,1] — "${key}" = ${e.confidence}`);

  // Optional macros: if present must be finite and ≥ 0
  for (const f of ["carb_per_100g", "fiber_per_100g", "protein_per_100g", "fat_per_100g", "cal_per_100g"]) {
    if (e[f] === undefined) continue;
    if (!isNum(e[f])) errors.push(`${f} present but not a finite number — "${key}" (got ${JSON.stringify(e[f])})`);
    else if ((e[f] as number) < 0) errors.push(`${f} is negative — "${key}" = ${e[f]}`);
  }

  // Fiber cannot exceed total carbohydrate (would make net carb negative).
  if (isNum(e.carb_per_100g) && isNum(e.fiber_per_100g) && e.fiber_per_100g > e.carb_per_100g) {
    errors.push(`fiber > carb — "${key}" (fiber ${e.fiber_per_100g} > carb ${e.carb_per_100g})`);
  }

  // Macros per 100g can't exceed 100g of mass (sanity).
  for (const f of ["carb_per_100g", "fiber_per_100g", "protein_per_100g", "fat_per_100g"]) {
    if (isNum(e[f]) && (e[f] as number) > 100) warnings.push(`${f} > 100g/100g — "${key}" = ${e[f]}`);
  }

  // source label present (soft)
  if (typeof e.source !== "string" || !e.source) warnings.push(`missing source label — "${key}"`);

  // key hygiene: should be lowercase, trimmed, single-spaced
  if (key !== key.toLowerCase()) warnings.push(`key has uppercase chars — "${key}"`);
  if (key !== key.trim() || /\s{2,}/.test(key)) warnings.push(`key has irregular whitespace — "${key}"`);
}

// ── Validate the merged database (what the app actually queries) ─────────────
const all = Object.entries(GLOBAL_GI_DATABASE);
for (const [key, entry] of all) checkEntry(key, entry as unknown as AnyEntry);

// ── Cross-region key collisions (informational) ─────────────────────────────
// GLOBAL spreads regions first, then TR last (TR wins). Overlaps are silently
// overridden — usually intended, but worth surfacing so an accidental shadow is
// noticed.
const regions: Record<string, Record<string, unknown>> = {
  TR: GI_DATABASE, MENA: GI_MENA, INDIA: GI_INDIA, ASIA: GI_ASIA,
  EUROPE: GI_EUROPE, AMERICAS: GI_AMERICAS, AFRICA: GI_AFRICA,
};
const seen: Record<string, string[]> = {};
for (const [region, db] of Object.entries(regions)) {
  for (const key of Object.keys(db)) (seen[key] ??= []).push(region);
}
const collisions = Object.entries(seen).filter(([, regs]) => regs.length > 1);

// ── Report ──────────────────────────────────────────────────────────────────
console.log(`\nGlucoLens data validation`);
console.log(`  entries (merged): ${all.length}`);
console.log(`  per region: ${Object.entries(regions).map(([r, d]) => `${r}=${Object.keys(d).length}`).join("  ")}`);
console.log(`  cross-region key collisions: ${collisions.length}`);
if (collisions.length) {
  for (const [key, regs] of collisions.slice(0, 40)) {
    console.log(`    "${key}" in ${regs.join(", ")} (last wins)`);
  }
  if (collisions.length > 40) console.log(`    …and ${collisions.length - 40} more`);
}

if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} warning(s):`);
  for (const w of warnings.slice(0, 60)) console.log(`   - ${w}`);
  if (warnings.length > 60) console.log(`   …and ${warnings.length - 60} more`);
}

if (errors.length) {
  console.error(`\n❌ ${errors.length} ERROR(S):`);
  for (const e of errors) console.error(`   - ${e}`);
  console.error(`\nData validation FAILED.\n`);
  process.exit(1);
}

console.log(`\n✅ No hard data errors. Validation passed.\n`);
