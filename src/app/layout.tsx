import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
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
  title: "GlucoLens — AI Food Sugar & Glucose Analyzer",
  description:
    "Upload a meal photo and instantly see sugar content, glycemic index, and glycemic load. Supports 10 languages including Turkish, English, Chinese, Hindi, Spanish.",
  keywords: ["glucose tracker", "glycemic index", "blood sugar", "food analyzer", "AI nutrition", "diabetes", "GlucoLens"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GlucoLens",
  },
  openGraph: {
    title: "GlucoLens — AI Food Sugar & Glucose Analyzer",
    description: "Upload any meal photo. See sugar, GI & glycemic load instantly.",
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
      <body className="min-h-screen bg-gray-950 antialiased">{children}</body>
    </html>
  );
}
