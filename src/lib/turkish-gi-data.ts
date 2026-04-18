export const TURKISH_GI_DATA: Record<string, { gi: number; confidence: number; source: string }> = {
  "beyaz ekmek": { gi: 75, confidence: 0.95, source: "Sydney GI DB" },
  "tam buğday ekmeği": { gi: 51, confidence: 0.92, source: "Sydney GI DB" },
  "simit": { gi: 68, confidence: 0.80, source: "TürKomp" },
  "bulgur pilavı": { gi: 46, confidence: 0.88, source: "Sydney GI DB" },
  "pirinç pilavı": { gi: 64, confidence: 0.90, source: "Sydney GI DB" },
  "mercimek çorbası": { gi: 44, confidence: 0.85, source: "TürKomp" },
  "kırmızı mercimek": { gi: 29, confidence: 0.95, source: "Sydney GI DB" },
  "kuru fasulye": { gi: 29, confidence: 0.92, source: "Sydney GI DB" },
  "nohut": { gi: 28, confidence: 0.92, source: "Sydney GI DB" },
  "döner": { gi: 35, confidence: 0.70, source: "TürKomp" },
  "köfte": { gi: 10, confidence: 0.75, source: "TürKomp" },
  "kebap": { gi: 5, confidence: 0.80, source: "TürKomp" },
  "tavuk ızgara": { gi: 0, confidence: 0.99, source: "Genel" },
  "mantı": { gi: 52, confidence: 0.75, source: "TürKomp" },
  "börek": { gi: 60, confidence: 0.72, source: "TürKomp" },
  "lahmacun": { gi: 62, confidence: 0.74, source: "TürKomp" },
  "pide": { gi: 70, confidence: 0.78, source: "TürKomp" },
  "gözleme": { gi: 58, confidence: 0.72, source: "TürKomp" },
  "baklava": { gi: 55, confidence: 0.80, source: "TürKomp" },
  "künefe": { gi: 58, confidence: 0.70, source: "TürKomp" },
  "sütlaç": { gi: 55, confidence: 0.75, source: "TürKomp" },
  "patates haşlama": { gi: 78, confidence: 0.95, source: "Sydney GI DB" },
  "patates kızartma": { gi: 63, confidence: 0.90, source: "Sydney GI DB" },
  "yoğurt": { gi: 36, confidence: 0.92, source: "Sydney GI DB" },
  "ayran": { gi: 30, confidence: 0.85, source: "TürKomp" },
  "karnıyarık": { gi: 38, confidence: 0.72, source: "TürKomp" },
  "dolma": { gi: 55, confidence: 0.72, source: "TürKomp" },
  "sarma": { gi: 50, confidence: 0.70, source: "TürKomp" },
  "çorba": { gi: 32, confidence: 0.70, source: "TürKomp" },
  "makarna": { gi: 49, confidence: 0.90, source: "Sydney GI DB" },
  "karpuz": { gi: 76, confidence: 0.88, source: "Sydney GI DB" },
  "muz": { gi: 51, confidence: 0.95, source: "Sydney GI DB" },
  "elma": { gi: 36, confidence: 0.95, source: "Sydney GI DB" },
  "üzüm": { gi: 59, confidence: 0.92, source: "Sydney GI DB" },
  "türk lokumu": { gi: 65, confidence: 0.78, source: "TürKomp" },
  "zeytinyağlı fasulye": { gi: 35, confidence: 0.75, source: "TürKomp" },
  "imam bayıldı": { gi: 30, confidence: 0.70, source: "TürKomp" },
};

export function lookupGI(name: string) {
  const lower = name.toLowerCase().trim();
  if (TURKISH_GI_DATA[lower]) return TURKISH_GI_DATA[lower];
  for (const [key, val] of Object.entries(TURKISH_GI_DATA)) {
    if (lower.includes(key) || key.includes(lower)) return val;
  }
  return null;
}
