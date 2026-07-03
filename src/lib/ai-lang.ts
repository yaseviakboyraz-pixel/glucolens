// Shared output-language directive for AI routes.
//
// The core problem: our AI endpoints generate human-readable content (food
// names, tips, warnings, descriptions) that must match the user's UI language
// across all 10 supported locales — WITHOUT translating JSON field names or
// numeric values, and WITHOUT breaking any GI-database lookup that keys off the
// English food name. This helper centralises that directive so every route
// phrases it identically and one source of truth governs the language list.

export const LANG_NAMES: Record<string, string> = {
  en: "English",
  tr: "Turkish",
  zh: "Chinese (Simplified)",
  hi: "Hindi",
  es: "Spanish",
  fr: "French",
  ar: "Arabic",
  pt: "Portuguese (Brazil)",
  ru: "Russian",
  de: "German",
};

export const VALID_LANGS = new Set(Object.keys(LANG_NAMES));

/** Whitelist a client-supplied lang code; anything unknown falls back to "en". */
export function resolveLang(raw: unknown): string {
  return typeof raw === "string" && VALID_LANGS.has(raw) ? raw : "en";
}

/**
 * Build an output-language directive to append to a prompt/system string.
 *
 * @param lang   Resolved language code (use resolveLang first).
 * @param fields Human-readable description of which JSON string fields to localize.
 * @param keepNameEnglish When true, adds the rule that keeps `name` in English
 *   (for GI-DB lookup / shared display paths) and puts the translation in
 *   `name_local`. Set false when the result has no English-anchored name field.
 *
 * Returns "" for English (the schemas already specify English) so the default
 * path is unchanged and cheapest.
 */
export function langDirective(lang: string, fields: string, keepNameEnglish = true): string {
  if (lang === "en") return "";
  const langName = LANG_NAMES[lang] || "English";
  const nameRule = keepNameEnglish
    ? ` CRITICAL: keep the "name" field in ENGLISH (it is used for a database lookup / display consistency) and additionally put the ${langName} translation in a "name_local" field.`
    : "";
  return `\n\nOUTPUT LANGUAGE: Write ALL human-readable text in ${langName} — ${fields}.${nameRule} Keep EVERY JSON field name in English and EVERY numeric value unchanged.`;
}
