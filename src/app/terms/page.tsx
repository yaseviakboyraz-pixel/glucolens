import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use — GlucoLens",
  description: "GlucoLens Terms of Use. Please read before using the app.",
};

export default function Terms() {
  const lastUpdated = "May 16, 2026";
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif", color: "#f1f5f9", background: "#030712", minHeight: "100vh" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#14b8a6", marginBottom: 8 }}>Terms of Use</h1>
        <p style={{ color: "#64748b", fontSize: 14 }}>GlucoLens · Last updated: {lastUpdated}</p>
      </div>

      {/* Critical disclaimer box */}
      <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 12, padding: "16px 20px", marginBottom: 32 }}>
        <p style={{ color: "#f87171", fontWeight: 700, marginBottom: 8, fontSize: 15 }}>
          ⚕️ NOT A MEDICAL DEVICE — ESTIMATION TOOL ONLY
        </p>
        <p style={{ color: "#fca5a5", fontSize: 13, lineHeight: 1.7 }}>
          GlucoLens provides <strong>AI-generated estimates</strong> of glycemic index (GI) and glycemic load (GL).
          These are approximations based on food databases and machine learning — they are <strong>not clinical measurements</strong>.
          GlucoLens is not approved by the FDA, CE, or any health regulatory body as a medical device.
          Do not use GlucoLens to make decisions about insulin dosing, medication adjustments, or any clinical intervention.
          Always consult your doctor or a registered dietitian.
        </p>
      </div>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>1. Acceptance</h2>
        <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
          By downloading, installing, or using GlucoLens, you agree to these Terms of Use.
          If you do not agree, do not use the app.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>2. What GlucoLens Is (and Is Not)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 10, padding: "14px 16px" }}>
            <p style={{ color: "#4ade80", fontWeight: 600, marginBottom: 8 }}>✅ GlucoLens IS:</p>
            <ul style={{ color: "#86efac", fontSize: 13, lineHeight: 1.8, paddingLeft: 16 }}>
              <li>An AI estimation tool</li>
              <li>A food awareness aid</li>
              <li>A nutritional education resource</li>
              <li>A personal wellness tracker</li>
            </ul>
          </div>
          <div style={{ background: "#450a0a", border: "1px solid #991b1b", borderRadius: 10, padding: "14px 16px" }}>
            <p style={{ color: "#f87171", fontWeight: 600, marginBottom: 8 }}>❌ GlucoLens is NOT:</p>
            <ul style={{ color: "#fca5a5", fontSize: 13, lineHeight: 1.8, paddingLeft: 16 }}>
              <li>A medical device</li>
              <li>A diagnostic tool</li>
              <li>A replacement for a CGM</li>
              <li>Clinical medical advice</li>
            </ul>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>3. Accuracy Disclaimer</h2>
        <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
          GlucoLens AI estimates may be inaccurate due to:
        </p>
        <ul style={{ color: "#94a3b8", lineHeight: 1.8, paddingLeft: 20, marginTop: 8 }}>
          <li>Variations in food preparation, ripeness, and portion size</li>
          <li>Individual metabolic differences between users</li>
          <li>Limitations of AI image recognition</li>
          <li>Foods not covered in our database</li>
        </ul>
        <p style={{ color: "#94a3b8", lineHeight: 1.7, marginTop: 12 }}>
          <strong style={{ color: "#e2e8f0" }}>GlucoLens makes no warranty</strong> regarding the accuracy, completeness,
          or fitness for any particular purpose of the estimates provided.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>4. Limitation of Liability</h2>
        <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
          To the fullest extent permitted by applicable law, GlucoLens and its developers shall not be liable for
          any damages arising from:
        </p>
        <ul style={{ color: "#94a3b8", lineHeight: 1.8, paddingLeft: 20, marginTop: 8 }}>
          <li>Reliance on GlucoLens estimates for medical decisions</li>
          <li>Inaccurate GL/GI values</li>
          <li>Health outcomes resulting from dietary changes based on app outputs</li>
          <li>Data loss or service interruptions</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>5. Subscriptions</h2>
        <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
          GlucoLens Pro subscriptions are billed through the Apple App Store or Google Play at $5.99/month or $49.99/year.
          A 14-day free trial is available for new subscribers. Subscriptions automatically renew unless cancelled
          at least 24 hours before the renewal date. Manage or cancel subscriptions in your device&apos;s App Store settings.
          Refunds are handled by Apple or Google according to their respective refund policies.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>6. Intellectual Property</h2>
        <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
          All content, design, and code in GlucoLens is owned by GlucoLens. You may not copy, reverse-engineer,
          or distribute any part of the app without written permission.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>7. Governing Law</h2>
        <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
          These Terms are governed by the laws of the Republic of Turkey. Any disputes shall be resolved
          in the courts of Ankara, Turkey, unless mandatory consumer protection laws in your jurisdiction provide otherwise.
        </p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "#e2e8f0", marginBottom: 12, borderBottom: "1px solid #1e293b", paddingBottom: 8 }}>8. Contact</h2>
        <p style={{ color: "#94a3b8", lineHeight: 1.7 }}>
          Questions about these Terms:<br />
          <strong style={{ color: "#14b8a6" }}>legal@glucolens.app</strong>
        </p>
      </section>

      <div style={{ borderTop: "1px solid #1e293b", paddingTop: 20, marginTop: 20 }}>
        <p style={{ color: "#334155", fontSize: 12, textAlign: "center" }}>
          © 2026 GlucoLens · <a href="/privacy" style={{ color: "#14b8a6" }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
