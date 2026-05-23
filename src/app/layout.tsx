import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ErrorBoundary } from "@/components/error-boundary";
import { UpdateBanner } from "@/components/update-banner";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#14b8a6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "GlucoLens — AI Food Glucose Estimator",
  description:
    "Snap a photo of your meal and get instant AI-based estimates of sugar content, glycemic index (GI), and glycemic load (GL). A food awareness tool — not a medical device. Available in 10 languages.",
  keywords: ["glycemic index estimator", "food glucose tracker", "GL calculator", "AI nutrition", "blood sugar awareness", "GlucoLens"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GlucoLens",
  },
  openGraph: {
    title: "GlucoLens — AI Food Glucose Estimator",
    description: "Snap any meal photo. Get AI estimates of sugar, GI & glycemic load. Food awareness, not medical advice.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen antialiased" style={{background:'var(--nova-bg)',color:'var(--nova-text-1)'}}>
        <UpdateBanner />
        <div className="nova-aurora" aria-hidden="true" />
        <ErrorBoundary>{children}</ErrorBoundary>
        <Script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
