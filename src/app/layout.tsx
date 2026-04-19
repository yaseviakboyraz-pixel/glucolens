import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GlucoLens — AI Food Sugar & Glucose Analyzer",
  description:
    "Upload a meal photo and instantly see sugar content, glycemic index, and glycemic load. Supports 10 languages including Turkish, English, Chinese, Hindi, Spanish.",
  keywords: ["glucose tracker", "glycemic index", "blood sugar", "food analyzer", "AI nutrition", "diabetes", "GlucoLens"],
  openGraph: {
    title: "GlucoLens — AI Food Sugar & Glucose Analyzer",
    description: "Upload any meal photo. See sugar, GI & glycemic load instantly.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable}`}>
      <body className="min-h-screen bg-gray-950 antialiased">{children}</body>
    </html>
  );
}
