"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "./api";

const APP_VERSION = "1.0.0";

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [appStoreUrl, setAppStoreUrl] = useState("");

  useEffect(() => {
    const check = async () => {
      try {
        const res = await apiFetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();

        const needsForce = compareVersions(APP_VERSION, data.minimum_required) < 0;
        const hasUpdate = compareVersions(APP_VERSION, data.current) < 0;

        if (needsForce || hasUpdate) {
          setUpdateAvailable(true);
          setForceUpdate(needsForce || data.force_update);
          setAppStoreUrl(data.app_store_url);
        }
      } catch {
        // Silently fail — offline or server error
      }
    };

    // Check on mount, then every 30 minutes
    check();
    const interval = setInterval(check, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { updateAvailable, forceUpdate, appStoreUrl };
}
