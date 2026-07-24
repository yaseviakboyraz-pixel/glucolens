import type { NextConfig } from "next";

// Two build targets from one codebase:
//   BUILD_TARGET=capacitor -> static export into out/, bundled inside the app
//   (default)              -> normal server build for Vercel, where /api/* lives
// The native app must NOT depend on a live server for its UI, so it ships the
// shell offline and calls the Vercel API over the network (see src/lib/api.ts).
const isNativeBuild = process.env.BUILD_TARGET === "capacitor";

const nextConfig: NextConfig = {
  ...(isNativeBuild ? { output: "export" as const } : {}),
  serverExternalPackages: ["@anthropic-ai/sdk"],
  images: {
    // Static export has no image optimization server; without this the export
    // build fails outright on the default loader.
    ...(isNativeBuild ? { unoptimized: true } : {}),
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qrjoiwzwewoqsioomjgr.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  async headers() {
    const isDev = process.env.NODE_ENV !== "production";
    // 'unsafe-eval' is only needed by the dev/HMR runtime — drop it in production.
    // 'unsafe-inline' stays for now: Next.js injects inline bootstrap scripts and
    // the UI relies heavily on inline style attributes, so removing it requires a
    // per-request nonce (proxy.ts) — deferred as a larger, separately-tested change.
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net"
      : "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net";
    const csp = [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.revenuecat.com wss://*.supabase.co",
      "media-src 'self' blob:",
      "font-src 'self' data:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    // The packaged app is no longer same-origin: iOS WKWebView runs on
    // capacitor://localhost and Android on https://localhost, so every call to
    // this backend is now cross-origin and the browser will block it without
    // these headers. Origins are allow-listed and echoed back rather than using
    // "*" — a wildcard would let any website drive this (paid) API from a
    // visitor's browser. Note CORS is a browser rule only; it is not what stops
    // direct abuse — the usage quota is.
    const NATIVE_ORIGINS = [
      "capacitor://localhost", // iOS
      "https://localhost",     // Android
      "http://localhost:3000", // dev live-reload (CAP_SERVER_URL)
    ].join("|");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=self, microphone=(), geolocation=()" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
      {
        source: "/api/(.*)",
        has: [
          { type: "header", key: "origin", value: `(?<allowedOrigin>${NATIVE_ORIGINS})` },
        ],
        headers: [
          { key: "Access-Control-Allow-Origin", value: ":allowedOrigin" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Max-Age", value: "86400" },
          // Required so shared caches don't serve one origin's CORS headers to another.
          { key: "Vary", value: "Origin" },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
