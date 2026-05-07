import { Capacitor } from '@capacitor/core';
export interface BarcodeResult { barcode: string; format: string; }
async function scanNative(): Promise<BarcodeResult | null> {
  try {
    const { BarcodeScanner, BarcodeFormat } = await import('@capacitor-mlkit/barcode-scanning');
    const { camera } = await BarcodeScanner.checkPermissions();
    if (camera !== 'granted') {
      const { camera: g } = await BarcodeScanner.requestPermissions();
      if (g !== 'granted') return null;
    }
    if (Capacitor.getPlatform() === 'android') {
      const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!available) await BarcodeScanner.installGoogleBarcodeScannerModule();
    }
    const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE, BarcodeFormat.QrCode] });
    if (barcodes.length > 0 && barcodes[0].rawValue) return { barcode: barcodes[0].rawValue, format: String(barcodes[0].format) };
    return null;
  } catch (err) { console.error('Native scan error:', err); return null; }
}
async function scanWeb(v: HTMLVideoElement): Promise<BarcodeResult | null> {
  try {
    if (!('BarcodeDetector' in window)) return null;
    const d = new (window as any).BarcodeDetector({ formats: ['ean_13','ean_8','upc_a','upc_e','qr_code'] });
    const b = await d.detect(v);
    if (b.length > 0) return { barcode: b[0].rawValue, format: b[0].format };
    return null;
  } catch { return null; }
}
export async function scanBarcode(v?: HTMLVideoElement): Promise<BarcodeResult | null> {
  if (Capacitor.isNativePlatform()) return scanNative();
  if (v) return scanWeb(v);
  return null;
}
export const isBarcodeScannerSupported = () => Capacitor.isNativePlatform() || 'BarcodeDetector' in window;
export const isNativePlatform = () => Capacitor.isNativePlatform();
