import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — GlucoLens",
  description: "GlucoLens Privacy Policy. Learn how we collect, use, and protect your data.",
};

export default function PrivacyPolicy() {
  const lastUpdated = "May 16, 2026";

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif", color: "#f1f5f9", background: "#030712", minHeight: "100vh" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#14b8a6", marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: "#64748b", fontSize: 14 }}>GlucoLens · Last updated: {lastUpdated}</p>
      </div>

      {/* Medical Disclaimer — prominent at top */}
      <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 12, padding: "16px 20px", marginBottom: 32 }}>
        <p style={{ color: "#fbbf24", fontWeight: 600, marginBottom: 6 }}>⚠️ Important Medical Disclaimer</p>
        <p style={{ color: "#fcd34d", fontSize: 13, lineHeight: 1.6 }}>
          GlucoLens is an <strong>estimation and education tool only</strong>. It uses artificial intelligence to
          provide approximate glycemic index (GI) and glycemic load (GL) values. These estimates:
        </p>
        <ul style={{ color: "#fcd34d", fontSize: 13, lineHeight: 1.8, paddingLeft: 20, marginTop: 8 }}>
          <li>Are <strong>not medical diagnoses</strong></li>
          <li>Are <strong>not clinical measurements</strong></li>
          <li>Are <strong>not a substitute for professional medical advice</strong></li>
          <li>May differ from actual blood glucose readings</li>
          <li>Should not be used to make clinical decisions, adjust medications, or replace a continuous glucose monitor (CGM)</li>
        </ul>
        <p style={{ color: "#fcd34d", fontSize: 13, lineHeight: 1.6, marginTop: 8 }}>
          Always consult a qualified healthcare professional before making any health or dietary changes.
        </p>
      </div>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>1. Who We Are</h2>
        <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
          GlucoLens (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is a food awareness application that uses AI to estimate the glycemic
          impact of meals from photographs and text descriptions. Our service is available at glucolens.app and
          through mobile applications on iOS and Android.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>2. Data We Collect</h2>
        <p style={{ color: "#94a3b8", lineHeight: 1.7, marginBottom: 12 }}>We collect the following information when you use GlucoLens:</p>
        <div style={{ background: "#0f172a", borderRadius: 10, padding: "16px 20px", marginBottom: 12 }}>
          <p style={{ color: "#38bdf8", fontWeight: 600, marginBottom: 6 }}>Information you provide:</p>
          <ul style={{ color: "#94a3b8", lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Name (optional, for personalization)</li>
            <li>Health profile type (Healthy / Pre-diabetic / Diabetic) — used only for calibrating estimates</li>
            <li>Meal photographs you submit for analysis</li>
            <li>Food text queries</li>
            <li>Sleep, fasting, and activity logs you manually enter</li>
            <li>Account email (if you create an account)</li>
          </ul>
        </div>
        <div style={{ background: "#0f172a", borderRadius: 10, padding: "16px 20px", marginBottom: 12 }}>
          <p style={{ color: "#38bdf8", fontWeight: 600, marginBottom: 6 }}>Automatically collected:</p>
          <ul style={{ color: "#94a3b8", lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Device type and operating system (for app compatibility)</li>
            <li>App usage patterns (anonymized, for improving AI accuracy)</li>
            <li>Crash reports and error logs</li>
          </ul>
        </div>
        <div style={{ background: "#0f172a", borderRadius: 10, padding: "16px 20px" }}>
          <p style={{ color: "#38bdf8", fontWeight: 600, marginBottom: 6 }}>Apple Health / Google Fit (if you enable integration):</p>
          <ul style={{ color: "#94a3b8", lineHeight: 1.8, paddingLeft: 20 }}>
            <li>Sleep duration and quality data</li>
            <li>Step count</li>
            <li>Body weight measurements</li>
          </ul>
          <p style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>
            This data is read from HealthKit / Health Connect with your explicit permission and is never sold or shared with third parties.
          </p>
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>3. How We Use Your Data</h2>
        <ul style={{ color: "#94a3b8", lineHeight: 1.8, paddingLeft: 20 }}>
          <li>To analyze food photographs and generate glycemic load estimates</li>
          <li>To personalize GL targets based on your health profile</li>
          <li>To provide AI coaching responses (sent to Anthropic Claude API — see Section 5)</li>
          <li>To store your meal history and wellness logs (locally and, if signed in, on our servers)</li>
          <li>To send you notifications you have enabled (meal reminders, alerts)</li>
          <li>To process subscription payments via RevenueCat</li>
          <li>To improve the accuracy of our AI models (using anonymized, aggregated data only)</li>
        </ul>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 12 }}>
          We do <strong>not</strong> sell your personal data. We do <strong>not</strong> use your health data for advertising.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>4. Data Storage & Security</h2>
        <p style={{ color: "#94a3b8", lineHeight: 1.7, marginBottom: 12 }}>
          Your meal history and profile are stored locally on your device (localStorage). If you create an account,
          data is additionally synced to our secure cloud database (Supabase, hosted in the EU/US) with row-level
          security — only you can access your own data.
        </p>
        <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
          Meal photographs are processed by the Anthropic Claude AI API and are <strong>not stored on Anthropic servers</strong>
          beyond the duration of a single API request (as per Anthropic&apos;s data handling policy).
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>5. Third-Party Services</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#1e293b" }}>
                <th style={{ padding: "10px 14px", textAlign: "left", color: "#94a3b8", fontWeight: 600 }}>Service</th>
                <th style={{ padding: "10px 14px", textAlign: "left", color: "#94a3b8", fontWeight: 600 }}>Purpose</th>
                <th style={{ padding: "10px 14px", textAlign: "left", color: "#94a3b8", fontWeight: 600 }}>Data Shared</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Anthropic Claude", "AI food analysis & coaching", "Meal photos, food descriptions (not stored)"],
                ["Supabase", "Cloud database & authentication", "Account email, meal records (encrypted)"],
                ["RevenueCat", "Subscription management", "Purchase receipts only"],
                ["Vercel", "App hosting & CDN", "No personal data stored"],
                ["Open Food Facts", "Barcode product lookup", "Barcode number only (anonymous)"],
              ].map(([svc, purpose, data], i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1e293b", background: i % 2 === 0 ? "transparent" : "#0f172a" }}>
                  <td style={{ padding: "10px 14px", color: "#38bdf8" }}>{svc}</td>
                  <td style={{ padding: "10px 14px", color: "#94a3b8" }}>{purpose}</td>
                  <td style={{ padding: "10px 14px", color: "#64748b" }}>{data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>6. Your Rights</h2>
        <ul style={{ color: "#94a3b8", lineHeight: 1.8, paddingLeft: 20 }}>
          <li><strong style={{ color: "#e2e8f0" }}>Access:</strong> You can export all your meal data via the CSV export function in the app.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Deletion:</strong> You can delete individual meals in the app or request full account deletion by emailing us.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Portability:</strong> CSV and PDF exports are available in the app.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Opt-out:</strong> You can disable notifications, Apple Health integration, and cloud sync at any time in app settings.</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>7. Children</h2>
        <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
          GlucoLens is not directed at children under 13 (under 16 in the EU). We do not knowingly collect
          personal data from children. If you believe a child has provided us data, please contact us for deletion.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>8. Changes to This Policy</h2>
        <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
          We may update this Privacy Policy periodically. When we do, we will update the &quot;Last updated&quot; date at the
          top of this page. Continued use of GlucoLens after changes constitutes acceptance of the updated policy.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>9. Contact</h2>
        <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
          For privacy inquiries, data deletion requests, or any questions:<br />
          <strong style={{ color: "#14b8a6" }}>privacy@glucolens.app</strong>
        </p>
      </section>

      <div style={{ borderTop: "1px solid #1e293b", paddingTop: 20, marginTop: 20 }}>
        <p style={{ color: "#334155", fontSize: 12, textAlign: "center" }}>
          GlucoLens is an AI estimation tool. It is not a medical device and does not provide medical advice.
          Always consult a healthcare professional for medical decisions.
        </p>
        <p style={{ color: "#334155", fontSize: 12, textAlign: "center", marginTop: 4 }}>
          © 2026 GlucoLens · <a href="/terms" style={{ color: "#14b8a6" }}>Terms of Use</a>
        </p>
      </div>
    </div>
  );
}
