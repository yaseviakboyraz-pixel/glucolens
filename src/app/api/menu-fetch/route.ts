import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// ── Global delivery platform registry ─────────────────────────────────────────
// Covers Turkey, Europe, Americas, Asia-Pacific, Middle East, Africa
const DELIVERY_PLATFORMS: Record<string, { name: string; region: string }> = {
  // Turkey
  "yemeksepeti.com":    { name: "Yemeksepeti", region: "TR" },
  "trendyol.com":       { name: "Trendyol Yemek", region: "TR" },
  "getir.com":          { name: "Getir Yemek", region: "TR" },
  "migros.com.tr":      { name: "Migros Sanal Market", region: "TR" },
  "banabi.com":         { name: "Banabi", region: "TR" },
  "gofody.com":         { name: "GoFody", region: "TR" },

  // Global / Americas
  "ubereats.com":       { name: "Uber Eats", region: "GLOBAL" },
  "doordash.com":       { name: "DoorDash", region: "US" },
  "grubhub.com":        { name: "Grubhub", region: "US" },
  "seamless.com":       { name: "Seamless", region: "US" },
  "postmates.com":      { name: "Postmates", region: "US" },
  "instacart.com":      { name: "Instacart", region: "US" },
  "caviar.com":         { name: "Caviar", region: "US" },
  "ezcater.com":        { name: "EZcater", region: "US" },
  "goldbelly.com":      { name: "Goldbelly", region: "US" },
  "rappi.com":          { name: "Rappi", region: "LATAM" },
  "ifood.com.br":       { name: "iFood", region: "BR" },
  "pedidosya.com":      { name: "PedidosYa", region: "LATAM" },

  // Europe
  "deliveroo.com":      { name: "Deliveroo", region: "EU" },
  "justeat.com":        { name: "Just Eat", region: "EU" },
  "just-eat.co.uk":     { name: "Just Eat UK", region: "UK" },
  "just-eat.de":        { name: "Lieferando", region: "DE" },
  "lieferando.de":      { name: "Lieferando", region: "DE" },
  "takeaway.com":       { name: "Takeaway.com", region: "EU" },
  "thuisbezorgd.nl":    { name: "Thuisbezorgd", region: "NL" },
  "pyszne.pl":          { name: "Pyszne.pl", region: "PL" },
  "mjam.at":            { name: "Mjam", region: "AT" },
  "glovo.com":          { name: "Glovo", region: "EU/MENA" },
  "wolt.com":           { name: "Wolt", region: "EU" },
  "bolt.food":          { name: "Bolt Food", region: "EU" },
  "foodpanda.com":      { name: "foodpanda", region: "ASIA" },
  "studenac.net":       { name: "Studenac", region: "BALKANS" },

  // Middle East / Africa
  "talabat.com":        { name: "Talabat", region: "MENA" },
  "careem.com":         { name: "Careem", region: "MENA" },
  "hungerstation.com":  { name: "HungerStation", region: "SA" },
  "otlob.com":          { name: "Otlob", region: "EG" },
  "elmenus.com":        { name: "elmenus", region: "EG" },
  "jumia.com":          { name: "Jumia Food", region: "AFRICA" },
  "noon.com":           { name: "Noon", region: "MENA" },

  // Asia-Pacific
  "swiggy.com":         { name: "Swiggy", region: "IN" },
  "zomato.com":         { name: "Zomato", region: "IN/GLOBAL" },
  "meituan.com":        { name: "Meituan", region: "CN" },
  "ele.me":             { name: "Ele.me", region: "CN" },
  "grab.com":           { name: "GrabFood", region: "SEA" },
  "gojek.com":          { name: "GoFood", region: "ID" },
  "shopee.com":         { name: "ShopeeFood", region: "SEA" },
  "lalamove.com":       { name: "Lalamove", region: "ASIA" },
  "pandamart.com":      { name: "PandaMart", region: "ASIA" },
  "mcdonald.com":       { name: "McDonald's", region: "GLOBAL" },
};

function detectPlatform(hostname: string) {
  const clean = hostname.replace(/^www\./, "");
  for (const [domain, info] of Object.entries(DELIVERY_PLATFORMS)) {
    if (clean === domain || clean.endsWith("." + domain)) return { domain, ...info };
  }
  return null;
}

// ── Embedded JSON extraction ────────────────────────────────────────────────
function extractEmbeddedData(html: string): string {
  const chunks: string[] = [];

  // 1. Next.js __NEXT_DATA__
  const nextData = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextData?.[1]) {
    try {
      const obj = JSON.parse(nextData[1]);
      const str = JSON.stringify(obj);
      // Extract menu-relevant keys
      const relevant = extractRelevantKeys(obj);
      if (relevant) chunks.push("[NEXT_DATA] " + relevant);
    } catch { /* ignore */ }
  }

  // 2. JSON-LD structured data (schema.org Restaurant / Menu)
  const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of jsonLdMatches) {
    try {
      const obj = JSON.parse(match[1]);
      const relevant = extractRelevantKeys(obj);
      if (relevant) chunks.push("[JSON-LD] " + relevant);
    } catch { /* ignore */ }
  }

  // 3. window.__INITIAL_STATE__ or similar
  const initState = html.match(/window\.__(?:INITIAL_STATE|APP_STATE|PRELOADED_STATE|STORE_STATE)__\s*=\s*(\{[\s\S]{10,5000}?\});/);
  if (initState?.[1]) {
    try {
      const obj = JSON.parse(initState[1]);
      const relevant = extractRelevantKeys(obj);
      if (relevant) chunks.push("[INIT_STATE] " + relevant);
    } catch { /* ignore */ }
  }

  // 4. data-initial or data-props on body/app
  const dataProps = html.match(/data-(?:initial|props|state|config)\s*=\s*'([^']{10,5000})'/);
  if (dataProps?.[1]) {
    try {
      const obj = JSON.parse(dataProps[1].replace(/&quot;/g, '"'));
      const relevant = extractRelevantKeys(obj);
      if (relevant) chunks.push("[DATA_PROPS] " + relevant);
    } catch { /* ignore */ }
  }

  return chunks.join("\n\n").slice(0, 8000);
}

// Recursively extract menu/food-related keys from any JSON object
function extractRelevantKeys(obj: unknown, depth = 0): string {
  if (depth > 6 || !obj || typeof obj !== "object") return "";
  const FOOD_KEYS = /menu|item|food|dish|product|category|meal|restaurant|cuisine|price|name|description|calories|ingredient|allergen|nutrition/i;
  const parts: string[] = [];

  if (Array.isArray(obj)) {
    const relevant = obj.slice(0, 30).map(v => extractRelevantKeys(v, depth + 1)).filter(Boolean);
    return relevant.join(", ");
  }

  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (!FOOD_KEYS.test(key)) continue;
    if (typeof val === "string" && val.length > 0 && val.length < 500) {
      parts.push(`${key}: ${val}`);
    } else if (typeof val === "number") {
      parts.push(`${key}: ${val}`);
    } else if (Array.isArray(val) && val.length > 0) {
      const sub = extractRelevantKeys(val, depth + 1);
      if (sub) parts.push(`${key}: [${sub}]`);
    } else if (val && typeof val === "object") {
      const sub = extractRelevantKeys(val, depth + 1);
      if (sub) parts.push(`${key}: {${sub}}`);
    }
  }
  return parts.join(" | ");
}

// ── Clean HTML to readable text ─────────────────────────────────────────────
function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim();
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith("http") ? url : "https://" + url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const hostname = parsedUrl.hostname;
    if (hostname === "localhost" || hostname.startsWith("192.168") || hostname.startsWith("10.")) {
      return NextResponse.json({ error: "Private URLs not allowed" }, { status: 400 });
    }

    const platform = detectPlatform(hostname);

    // Fetch with realistic browser headers for better SPA compatibility
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    const contentType = response.headers.get("content-type") || "";

    // PDF
    if (contentType.includes("pdf")) {
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return NextResponse.json({ type: "pdf", base64, contentType: "application/pdf", platform });
    }

    // Image
    if (contentType.startsWith("image/")) {
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return NextResponse.json({ type: "image", base64, contentType, platform });
    }

    // HTML — extract embedded JSON + visible text
    const html = await response.text();
    const embeddedData = extractEmbeddedData(html);
    const visibleText = htmlToText(html).slice(0, 12000);

    // Build context string for Claude
    const platformHint = platform
      ? `Platform: ${platform.name} (${platform.region}) | URL: ${parsedUrl.toString()}`
      : `URL: ${parsedUrl.toString()}`;

    // Extract URL slug as restaurant/menu hint
    const slug = parsedUrl.pathname
      .split("/").filter(Boolean)
      .map(s => s.replace(/-/g, " ").replace(/_/g, " "))
      .join(" > ");

    const combinedText = [
      platformHint,
      slug ? `Page path: ${slug}` : "",
      embeddedData ? `=== STRUCTURED DATA ===\n${embeddedData}` : "",
      `=== PAGE TEXT ===\n${visibleText}`,
    ].filter(Boolean).join("\n\n");

    return NextResponse.json({
      type: "text",
      text: combinedText,
      url: parsedUrl.toString(),
      platform,
      hasEmbeddedData: embeddedData.length > 0,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to fetch: ${message}` }, { status: 500 });
  }
}
