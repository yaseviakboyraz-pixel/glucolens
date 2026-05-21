import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

// HTML escape to prevent XSS in PDF
function esc(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: NextRequest) {
  try {
    const { meals, profile, waterAvg, activityMin, sleepAvg } = await req.json();

    if (!meals || meals.length === 0) {
      return NextResponse.json({ error: "No meal data provided" }, { status: 400 });
    }

    // Calculate summary stats
    const totalGL = meals.reduce((s: number, m: { analysis: { total_glycemic_load: number } }) => s + m.analysis.total_glycemic_load, 0);
    const avgGL = (totalGL / meals.length).toFixed(1);
    const highRisk = meals.filter((m: { analysis: { glucose_risk: string } }) => m.analysis.glucose_risk === "high").length;
    const lowRisk = meals.filter((m: { analysis: { glucose_risk: string } }) => m.analysis.glucose_risk === "low").length;
    const avgCalories = (meals.reduce((s: number, m: { analysis: { total_calories: number } }) => s + m.analysis.total_calories, 0) / meals.length).toFixed(0);
    const avgFiber = (meals.reduce((s: number, m: { analysis: { total_fiber_g: number } }) => s + m.analysis.total_fiber_g, 0) / meals.length).toFixed(1);
    const avgProtein = (meals.reduce((s: number, m: { analysis: { total_protein_g: number } }) => s + m.analysis.total_protein_g, 0) / meals.length).toFixed(1);

    const dateRange = meals.length > 0 ? (() => {
      const timestamps = meals.map((m: { timestamp: number }) => m.timestamp);
      const min = new Date(Math.min(...timestamps));
      const max = new Date(Math.max(...timestamps));
      return `${min.toLocaleDateString("tr-TR")} – ${max.toLocaleDateString("tr-TR")}`;
    })() : "—";

    const reportDate = new Date().toLocaleDateString("tr-TR", {
      year: "numeric", month: "long", day: "numeric"
    });

    // Build HTML for PDF
    const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<title>GlucoLens Sağlık Raporu</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #1a1a2e; padding: 40px; font-size: 13px; }
  h1 { font-size: 22px; font-weight: 700; color: #0d9488; margin-bottom: 4px; }
  h2 { font-size: 15px; font-weight: 600; color: #1a1a2e; margin: 20px 0 10px; border-bottom: 1.5px solid #e5e7eb; padding-bottom: 6px; }
  .subtitle { font-size: 12px; color: #6b7280; margin-bottom: 2px; }
  .meta { font-size: 11px; color: #9ca3af; margin-bottom: 24px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
  .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; text-align: center; }
  .card .value { font-size: 22px; font-weight: 700; color: #0d9488; }
  .card .label { font-size: 11px; color: #6b7280; margin-top: 3px; }
  .risk-low { color: #16a34a; } .risk-medium { color: #d97706; } .risk-high { color: #dc2626; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f3f4f6; text-align: left; padding: 8px 10px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
  td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
  tr:nth-child(even) { background: #f9fafb; }
  .disclaimer { margin-top: 28px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  .header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .badge { background: #ccfbf1; color: #0f766e; border-radius: 20px; padding: 2px 10px; font-size: 10px; font-weight: 600; }
  .wellness { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .wellness-card { background: #f9fafb; border-radius: 8px; padding: 10px 12px; }
  .wellness-card .wval { font-size: 18px; font-weight: 700; }
  .wellness-card .wlab { font-size: 10px; color: #9ca3af; margin-top: 2px; }
</style>
</head>
<body>

<div class="header-row">
  <div>
    <h1>GlucoLens Sağlık Raporu</h1>
    <div class="subtitle">${esc(profile?.name) || "Kullanıcı"} · ${profile?.userType === "diabetic" ? "Diyabetik" : profile?.userType === "pre_diabetic" ? "Pre-diyabetik" : "Sağlıklı"}</div>
    <div class="meta">Rapor tarihi: ${esc(reportDate)} · Analiz dönemi: ${esc(dateRange)}</div>
  </div>
  <div class="badge">GlucoLens AI</div>
</div>

<h2>📊 Özet İstatistikler</h2>
<div class="grid">
  <div class="card">
    <div class="value">${avgGL}</div>
    <div class="label">Ort. Glisemik Yük (GL)</div>
  </div>
  <div class="card">
    <div class="value">${meals.length}</div>
    <div class="label">Toplam Analiz</div>
  </div>
  <div class="card">
    <div class="value risk-high">${highRisk}</div>
    <div class="label">Yüksek Riskli Öğün</div>
  </div>
  <div class="card">
    <div class="value risk-low">${lowRisk}</div>
    <div class="label">Güvenli Öğün</div>
  </div>
  <div class="card">
    <div class="value">${avgCalories}</div>
    <div class="label">Ort. Kalori (kcal)</div>
  </div>
  <div class="card">
    <div class="value">${avgProtein}g</div>
    <div class="label">Ort. Protein</div>
  </div>
</div>

${waterAvg || activityMin || sleepAvg ? `
<h2>🌿 Yaşam Biçimi</h2>
<div class="wellness">
  ${waterAvg ? `<div class="wellness-card"><div class="wval" style="color:#0ea5e9">${waterAvg}ml</div><div class="wlab">Günlük Ort. Su</div></div>` : ""}
  ${activityMin ? `<div class="wellness-card"><div class="wval" style="color:#8b5cf6">${activityMin}dk</div><div class="wlab">Haftalık Aktivite</div></div>` : ""}
  ${sleepAvg ? `<div class="wellness-card"><div class="wval" style="color:#6366f1">${sleepAvg}s</div><div class="wlab">Ort. Uyku</div></div>` : ""}
</div>
` : ""}

<h2>🍽 Öğün Detayları (Son ${Math.min(meals.length, 30)} Öğün)</h2>
<table>
  <thead>
    <tr>
      <th>Tarih</th>
      <th>Yiyecekler</th>
      <th>GL</th>
      <th>Kalori</th>
      <th>Protein</th>
      <th>Risk</th>
    </tr>
  </thead>
  <tbody>
    ${meals.slice(0, 30).map((m: {
      timestamp: number;
      analysis: {
        food_items: { name_tr?: string; name: string }[];
        total_glycemic_load: number;
        total_calories: number;
        total_protein_g: number;
        glucose_risk: string;
      }
    }) => `
    <tr>
      <td>${new Date(m.timestamp).toLocaleDateString("tr-TR", { month: "short", day: "numeric" })}</td>
      <td>${m.analysis.food_items?.slice(0, 2).map((f) => esc(f.name_tr || f.name)).join(", ") || "—"}${m.analysis.food_items?.length > 2 ? ` +${m.analysis.food_items.length - 2}` : ""}</td>
      <td><strong>${esc(m.analysis.total_glycemic_load)}</strong></td>
      <td>${esc(m.analysis.total_calories)} kcal</td>
      <td>${esc(m.analysis.total_protein_g)}g</td>
      <td class="risk-${esc(m.analysis.glucose_risk)}">${m.analysis.glucose_risk === "low" ? "✅ Düşük" : m.analysis.glucose_risk === "medium" ? "⚠️ Orta" : "🔴 Yüksek"}</td>
    </tr>`).join("")}
  </tbody>
</table>

<div class="disclaimer">
  ⚕️ Bu rapor bilgilendirme amaçlıdır ve tıbbi tanı yerine geçmez. GlucoLens'in sunduğu GL tahminleri AI tabanlıdır ve gerçek kan şekeri ölçümleri ile farklılık gösterebilir. Sağlık kararlarınız için hekiminize danışın.<br>
  Oluşturulma: ${reportDate} · GlucoLens AI · glucolens.app
</div>

</body>
</html>`;

    return NextResponse.json({ html, success: true });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Report generation failed. Please try again." }, { status: 500 });
  }
}
