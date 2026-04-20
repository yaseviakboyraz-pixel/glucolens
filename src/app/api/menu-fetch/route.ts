import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const hostname = parsedUrl.hostname;
    if (hostname === "localhost" || hostname.startsWith("192.168") || hostname.startsWith("10.")) {
      return NextResponse.json({ error: "Private URLs not allowed" }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GlucoLens/1.0)",
        "Accept": "text/html,application/pdf,image/*,*/*",
      },
      signal: AbortSignal.timeout(15000),
    });

    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("pdf")) {
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return NextResponse.json({ type: "pdf", base64, contentType: "application/pdf" });
    }

    if (contentType.startsWith("image/")) {
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      return NextResponse.json({ type: "image", base64, contentType });
    }

    const html = await response.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000);

    return NextResponse.json({ type: "text", text, url });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to fetch: ${message}` }, { status: 500 });
  }
}
