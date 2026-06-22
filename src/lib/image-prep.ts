// Client-side image preparation.
// Converts ANY browser-decodable image (including iOS HEIC/HEIF, which the
// analysis API cannot accept) into a downscaled JPEG. This solves two issues:
//   1. P1 — iPhones shoot HEIC by default; sending it raw made analysis fail.
//   2. P2 — the analyze API rejects payloads > 8MB; downscaling keeps us well under.
// Output is ALWAYS JPEG, so the server reliably receives a supported format.
//
// On iOS/WKWebView the OS image decoder handles HEIC, so drawing it to a
// canvas and re-encoding as JPEG works. If a browser genuinely cannot decode
// the file, fileToJpegBase64 rejects and the caller shows a clear error.

export interface PreparedImage {
  base64: string; // raw base64 (no "data:" prefix) — always JPEG
  dataUrl: string; // full data URL, for <img> preview
}

const MAX_DIM = 1600; // longest edge in px — plenty for food recognition
const JPEG_QUALITY = 0.85;

export async function fileToJpegBase64(file: File): Promise<PreparedImage> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const { width, height } = scaleDimensions(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      MAX_DIM
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas-unavailable");
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    if (!dataUrl.startsWith("data:image/jpeg")) throw new Error("encode-failed");
    const base64 = dataUrl.split(",")[1];
    if (!base64) throw new Error("encode-empty");

    return { base64, dataUrl };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode-failed"));
    img.src = src;
  });
}

function scaleDimensions(w: number, h: number, maxDim: number) {
  if (!w || !h) return { width: maxDim, height: maxDim };
  if (w <= maxDim && h <= maxDim) return { width: w, height: h };
  const ratio = w > h ? maxDim / w : maxDim / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}
