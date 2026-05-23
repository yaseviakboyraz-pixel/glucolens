"use client";
import { useVersionCheck } from "@/lib/version-check";

export function UpdateBanner() {
  const { updateAvailable, forceUpdate, appStoreUrl } = useVersionCheck();

  if (!updateAvailable) return null;

  const openStore = () => {
    if (typeof window !== "undefined" && appStoreUrl) {
      window.location.href = appStoreUrl;
    }
  };

  if (forceUpdate) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.92)", display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: 32, textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔄</div>
        <div style={{ fontSize: 20, color: "#fff", fontWeight: 300, marginBottom: 8 }}>
          Güncelleme Gerekli
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 32, lineHeight: 1.6 }}>
          GlucoLens&apos;i kullanmaya devam etmek için lütfen güncelleyin.
        </div>
        <button onClick={openStore} style={{
          padding: "14px 32px", borderRadius: 14,
          background: "rgba(20,184,166,1)", color: "#fff",
          fontSize: 16, fontWeight: 500, border: "none", cursor: "pointer",
        }}>
          App Store&apos;da Güncelle
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
      background: "rgba(20,184,166,0.95)", padding: "10px 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <span style={{ fontSize: 13, color: "#fff" }}>🆕 Yeni sürüm mevcut</span>
      <button onClick={openStore} style={{
        fontSize: 12, color: "#fff", fontWeight: 600,
        background: "rgba(255,255,255,0.2)", border: "none",
        borderRadius: 8, padding: "4px 12px", cursor: "pointer",
      }}>
        Güncelle
      </button>
    </div>
  );
}
