// GlucoLens Global GI Index v5.0
// Combines all regional databases into one unified lookup system
// Total coverage: ~5000+ foods across all major world cuisines
//
// Regional sources:
//   Core (TR)  : turkish-gi-data.ts    — Turkish, Mediterranean, Ottoman (~2500 foods)
//   MENA       : gi-data-mena.ts       — Arabic, Persian, Egyptian, Gulf, Moroccan (~400)
//   India      : gi-data-india.ts      — North/South Indian, Pakistani, Sri Lankan (~420)
//   Asia       : gi-data-asia.ts       — Chinese, Japanese, Korean, Thai, Vietnamese, Indonesian (~480)
//   Europe     : gi-data-europe.ts     — Italian, French, German, Spanish, Greek, British, Nordic (~420)
//   Americas   : gi-data-americas.ts   — US fast food, Mexican, Brazilian, Peruvian, Caribbean (~380)
//   Africa     : gi-data-africa.ts     — Nigerian, Ethiopian, South African, Ghanaian, Senegalese (~280)

import { GI_DATABASE, type GIEntry } from "./turkish-gi-data";
import { GI_MENA }     from "./gi-data-mena";
import { GI_INDIA }    from "./gi-data-india";
import { GI_ASIA }     from "./gi-data-asia";
import { GI_EUROPE }   from "./gi-data-europe";
import { GI_AMERICAS } from "./gi-data-americas";
import { GI_AFRICA }   from "./gi-data-africa";

export type { GIEntry };

// ── Unified database (later entries override earlier for conflicts) ─────────
// Core TR database takes precedence for overlapping keys
export const GLOBAL_GI_DATABASE: Record<string, GIEntry> = {
  ...GI_MENA,
  ...GI_INDIA,
  ...GI_ASIA,
  ...GI_EUROPE,
  ...GI_AMERICAS,
  ...GI_AFRICA,
  ...GI_DATABASE, // Core TR always wins on conflicts
};

// ── Normalise query string ─────────────────────────────────────────────────
function normalise(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ");
}

// ── Token overlap score (0–1) ──────────────────────────────────────────────
function tokenScore(query: string, key: string): number {
  const qTokens = new Set(query.split(" ").filter(t => t.length > 1));
  const kTokens = key.split(" ").filter(t => t.length > 1);
  if (qTokens.size === 0 || kTokens.length === 0) return 0;
  const matches = kTokens.filter(t => qTokens.has(t)).length;
  return matches / Math.max(qTokens.size, kTokens.length);
}

// ── Primary lookup — exact then fuzzy ─────────────────────────────────────
export function lookupGI(name: string): GIEntry | null {
  if (!name) return null;
  const q = normalise(name);

  // 1. Exact match
  if (GLOBAL_GI_DATABASE[q]) return GLOBAL_GI_DATABASE[q];

  // 2. Exact on core TR database (already covered above, skip)

  // 3a. A database key is the leading whole word(s) of the query → most
  //     specific (longest) key wins. The word-boundary check stops a short key
  //     like "su" (water) from matching "sucuklu yumurta".
  let leadKey = "";
  for (const key of Object.keys(GLOBAL_GI_DATABASE)) {
    if (q.startsWith(key) && (q.length === key.length || q[key.length] === " ")) {
      if (key.length > leadKey.length) leadKey = key;
    }
  }
  if (leadKey) return GLOBAL_GI_DATABASE[leadKey];

  // 3b. The query is the leading whole word(s) of a key → closest (shortest)
  //     key wins, e.g. "elma" → "elma suyu" only when no exact "elma" exists.
  let extKey = "";
  for (const key of Object.keys(GLOBAL_GI_DATABASE)) {
    if (key.startsWith(q) && key.length > q.length && key[q.length] === " ") {
      if (!extKey || key.length < extKey.length) extKey = key;
    }
  }
  if (extKey) return GLOBAL_GI_DATABASE[extKey];

  // 4. Best token-overlap match (must be > 0.5)
  let bestKey = "";
  let bestScore = 0;
  for (const key of Object.keys(GLOBAL_GI_DATABASE)) {
    const score = tokenScore(q, key);
    if (score > bestScore) { bestScore = score; bestKey = key; }
  }
  if (bestScore >= 0.5 && bestKey) return GLOBAL_GI_DATABASE[bestKey];

  // 5. Whole-word containment — every word of the key appears as a complete
  //    token in the query (or vice-versa); longest match wins. Whole-word only,
  //    so "bal" (honey) never matches "balık" and "su" never matches "sucuk".
  const qWords = q.split(" ");
  const qTokens = new Set(qWords);
  let containKey = "";
  for (const key of Object.keys(GLOBAL_GI_DATABASE)) {
    if (key.length < 3) continue;
    const kWords = key.split(" ");
    const keyInQ = kWords.every(t => qTokens.has(t));
    const qInKey = qWords.every(t => kWords.includes(t));
    if ((keyInQ || qInKey) && key.length > containKey.length) containKey = key;
  }
  if (containKey) return GLOBAL_GI_DATABASE[containKey];

  return null;
}

// ── Ingredient lookup (for single-ingredient UI) ───────────────────────────
export interface IngredientResult {
  gi: number;
  confidence: number;
  source: string;
  carb_per_100g: number;
  fiber_per_100g: number;
  protein_per_100g: number;
  fat_per_100g: number;
  cal_per_100g: number;
  category?: string;
}

export function lookupIngredient(name: string): IngredientResult | null {
  const entry = lookupGI(name);
  if (!entry) return null;
  return {
    gi:              entry.gi,
    confidence:      entry.confidence,
    source:          entry.source,
    carb_per_100g:   entry.carb_per_100g   ?? 0,
    fiber_per_100g:  entry.fiber_per_100g  ?? 0,
    protein_per_100g: entry.protein_per_100g ?? 0,
    fat_per_100g:    entry.fat_per_100g    ?? 0,
    cal_per_100g:    entry.cal_per_100g    ?? 0,
    category:        entry.category,
  };
}

// ── Search suggestions (for autocomplete) ─────────────────────────────────
export function searchGI(query: string, limit = 10): string[] {
  if (!query || query.length < 2) return [];
  const q = normalise(query);
  const results: Array<{ key: string; score: number }> = [];

  for (const key of Object.keys(GLOBAL_GI_DATABASE)) {
    // Skip non-Latin scripts in suggestions (Arabic, Chinese etc.)
    if (/[^\u0000-\u024F\s]/.test(key)) continue;
    let score = 0;
    if (key === q)              score = 100;
    else if (key.startsWith(q)) score = 80;
    else if (key.includes(q))   score = 60;
    else score = tokenScore(q, key) * 50;
    if (score > 20) results.push({ key, score });
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.key);
}

// ── Stats helper ───────────────────────────────────────────────────────────
export function getDatabaseStats() {
  const regions = {
    core:     Object.keys(GI_DATABASE).length,
    mena:     Object.keys(GI_MENA).length,
    india:    Object.keys(GI_INDIA).length,
    asia:     Object.keys(GI_ASIA).length,
    europe:   Object.keys(GI_EUROPE).length,
    americas: Object.keys(GI_AMERICAS).length,
    africa:   Object.keys(GI_AFRICA).length,
  };
  return {
    regions,
    total: Object.keys(GLOBAL_GI_DATABASE).length,
  };
}
