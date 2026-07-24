// Single source of truth for where the app's /api/* routes live.
//
// Why this exists: once the app ships as a packaged static build (Capacitor
// without server.url), the web origin is capacitor://localhost / file://, which
// has NO server. A relative fetch("/api/analyze") would resolve against that
// dead origin and 404 silently. So on native we must point every API call at
// the deployed Vercel backend; on the web (and in dev) relative URLs are
// correct and keep same-origin cookies/CSP simple.
//
// The base is defined HERE and nowhere else. Every /api/* call goes through
// apiFetch() so this rule can never drift between files.

import { Capacitor } from "@capacitor/core";

// Where the deployed backend lives. Overridable via env for staging/self-host,
// but falls back to the known production URL so a missing env var degrades to
// "works" rather than "silently broken" — the failure mode we keep designing
// against. Trailing slash is stripped so joins never double up.
const PROD_API_BASE = (
  process.env.NEXT_PUBLIC_API_BASE || "https://glucolens-nine.vercel.app"
).replace(/\/+$/, "");

// On native the web layer is bundled offline, so API calls need an absolute
// origin. On web/dev, "" keeps them relative (same-origin) exactly as today.
export const API_BASE = Capacitor.isNativePlatform() ? PROD_API_BASE : "";

// Join API_BASE with a path. Accepts "/api/x" or "api/x"; only rewrites
// app-relative /api paths — absolute URLs (http...) are passed through so a
// caller can still hit a third party deliberately.
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${clean}`;
}

// Drop-in wrapper around fetch that resolves app-relative paths to the right
// origin. Signature matches fetch() so callers change only the URL source.
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}
