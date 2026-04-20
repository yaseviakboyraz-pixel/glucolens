"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import type { Lang } from "@/lib/i18n";

interface BarcodeResult {
  name: string;
  brand?: string;
  calories_100g?: number;
  carbs_100g?: number;
  sugars_100g?: number;
  fiber_100g?: number;
  fat_100g?: number;
  protein_100g?: number;
  gi_estimate?: number;
  gl_estimate?: number;
  serving_size?: number;
  image_url?: string;
  barcode: string;
}

interface Props {
  lang: Lang;
  onResult: (result: BarcodeResult) => void;
  onClose: () => void;
}

export function BarcodeScanner({ lang, onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (scannerRef.current) {
      clearInterval(scannerRef.current);
      scannerRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);
      startScanning();
    } catch {
      setError("Camera access denied. Use manual entry below.");
      setMode("manual");
    }
  }

  function startScanning() {
    // Use canvas to capture frames and decode barcode
    scannerRef.current = setInterval(async () => {
      if (!videoRef.current || !scanning) return;
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(videoRef.current, 0, 0);

      // Use BarcodeDetector API if available (Chrome/Android)
      if ("BarcodeDetector" in window) {
        try {
          // @ts-expect-error BarcodeDetector not in TS types
          const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"] });
          const barcodes = await detector.detect(canvas);
          if (barcodes.length > 0) {
            stopCamera();
            await fetchProduct(barcodes[0].rawValue);
          }
        } catch { /* continue scanning */ }
      }
    }, 500);
  }

  async function fetchProduct(barcode: string) {
    setLoading(true);
    setError(null);
    try {
      // Open Food Facts API — free, no key needed, 3M+ products
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=product_name,brands,nutriments,serving_size,image_front_url,categories`);
      const data = await res.json();

      if (data.status === 0 || !data.product) {
        throw new Error(`Product not found (${barcode}). Try manual search.`);
      }

      const p = data.product;
      const n = p.nutriments || {};

      // Estimate GI from category and sugar/fiber ratio
      const categories = (p.categories || "").toLowerCase();
      const gi_estimate = estimateGI(categories, n["sugars_100g"] || 0, n["fiber_100g"] || 0, n["carbohydrates_100g"] || 0);
      const carbs = n["carbohydrates_100g"] || 0;
      const fiber = n["fiber_100g"] || 0;
      const net_carb = Math.max(0, carbs - fiber);
      const gl_estimate = parseFloat(((gi_estimate * net_carb) / 100).toFixed(1));

      const result: BarcodeResult = {
        barcode,
        name: p.product_name || "Unknown Product",
        brand: p.brands,
        calories_100g: n["energy-kcal_100g"],
        carbs_100g: carbs,
        sugars_100g: n["sugars_100g"],
        fiber_100g: fiber,
        fat_100g: n["fat_100g"],
        protein_100g: n["proteins_100g"],
        gi_estimate,
        gl_estimate,
        serving_size: p.serving_size ? parseFloat(p.serving_size) : undefined,
        image_url: p.image_front_url,
      };

      onResult(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not fetch product info.");
    } finally {
      setLoading(false);
    }
  }

  function estimateGI(categories: string, sugars: number, fiber: number, carbs: number): number {
    if (carbs === 0) return 0;
    // Category-based estimates
    if (categories.includes("beverage") || categories.includes("drink") || categories.includes("soda")) return 63;
    if (categories.includes("bread") || categories.includes("toast")) return 70;
    if (categories.includes("rice") || categories.includes("pasta")) return 65;
    if (categories.includes("cereal") || categories.includes("cornflakes")) return 72;
    if (categories.includes("chocolate") || categories.includes("candy") || categories.includes("sweet")) return 55;
    if (categories.includes("biscuit") || categories.includes("cookie") || categories.includes("cracker")) return 65;
    if (categories.includes("yogurt") || categories.includes("dairy")) return 36;
    if (categories.includes("fruit") && !categories.includes("juice")) return 50;
    if (categories.includes("juice")) return 55;
    if (categories.includes("legume") || categories.includes("bean") || categories.includes("lentil")) return 30;
    if (categories.includes("nut") || categories.includes("seed")) return 15;
    // Estimate from nutrient ratio
    const sugar_ratio = sugars / (carbs || 1);
    const fiber_ratio = fiber / (carbs || 1);
    let gi = 55; // default medium
    if (sugar_ratio > 0.5) gi += 15;
    if (fiber_ratio > 0.2) gi -= 15;
    return Math.max(10, Math.min(100, Math.round(gi)));
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <h2 className="text-white font-semibold">🔍 Barcode Scanner</h2>
        <button onClick={() => { stopCamera(); onClose(); }}
          className="text-gray-400 hover:text-white text-2xl leading-none">✕</button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 px-4 py-3 bg-gray-900">
        <button onClick={() => { setMode("camera"); setError(null); }}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${mode === "camera" ? "bg-teal-600 text-white" : "bg-gray-800 text-gray-400"}`}>
          📷 Scan
        </button>
        <button onClick={() => { stopCamera(); setMode("manual"); setError(null); }}
          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${mode === "manual" ? "bg-teal-600 text-white" : "bg-gray-800 text-gray-400"}`}>
          ⌨️ Manual
        </button>
      </div>

      {/* Camera mode */}
      {mode === "camera" && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-4">
          {!scanning ? (
            <button onClick={startCamera}
              className="px-8 py-4 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-semibold text-lg">
              📷 Start Camera
            </button>
          ) : (
            <div className="w-full max-w-sm relative">
              <video ref={videoRef} className="w-full rounded-2xl" playsInline muted />
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-64 h-40 border-2 border-teal-400 rounded-xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-teal-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-teal-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-teal-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-teal-400 rounded-br-lg" />
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-teal-400/70 animate-pulse" />
                </div>
              </div>
              <p className="text-center text-gray-400 text-sm mt-3">
                Point at barcode — auto-detects EAN/UPC
              </p>
              <button onClick={stopCamera}
                className="w-full mt-2 py-2 bg-gray-800 text-gray-400 rounded-xl text-sm">
                Stop
              </button>
            </div>
          )}

          {/* Fallback: file-based barcode */}
          <div className="text-center">
            <p className="text-gray-600 text-xs mb-2">Or upload a barcode image</p>
            <label className="cursor-pointer text-teal-500 text-sm underline">
              Choose image
              <input type="file" accept="image/*" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setLoading(true);
                  // Read as data URL and try BarcodeDetector
                  const url = URL.createObjectURL(file);
                  const img = new Image();
                  img.onload = async () => {
                    if ("BarcodeDetector" in window) {
                      try {
                        // @ts-expect-error BarcodeDetector not in TS types
                        const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
                        const barcodes = await detector.detect(img);
                        if (barcodes.length > 0) {
                          await fetchProduct(barcodes[0].rawValue);
                          return;
                        }
                      } catch { /* fall through */ }
                    }
                    setError("Could not read barcode from image. Try manual entry.");
                    setLoading(false);
                  };
                  img.src = url;
                }}
              />
            </label>
          </div>
        </div>
      )}

      {/* Manual mode */}
      {mode === "manual" && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
          <div className="text-center">
            <div className="text-4xl mb-2">🏷️</div>
            <p className="text-gray-400 text-sm">Enter the barcode number from the product</p>
          </div>
          <input
            type="number"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            placeholder="e.g. 8690526474562"
            className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-center text-lg tracking-wider focus:outline-none focus:border-teal-500"
          />
          <button
            onClick={() => manualBarcode.length >= 8 && fetchProduct(manualBarcode)}
            disabled={manualBarcode.length < 8 || loading}
            className="w-full max-w-sm py-4 rounded-xl font-semibold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-40 transition-all"
          >
            {loading ? "Looking up..." : "Search Product"}
          </button>

          <p className="text-gray-600 text-xs text-center max-w-xs">
            Powered by Open Food Facts — 3M+ products worldwide
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl p-6 text-center space-y-3">
            <div className="text-3xl animate-bounce">🔍</div>
            <p className="text-teal-400 font-medium">Looking up product...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mb-4 bg-red-950 border border-red-500/40 rounded-xl p-3 text-red-300 text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}
