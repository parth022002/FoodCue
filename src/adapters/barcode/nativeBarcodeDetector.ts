export interface BarcodeObservation {
  rawValue: string;
  format: string;
  detectorName: "BarcodeDetector";
  detectorVersion: "browser-native";
  observedAt: string;
}

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string; format: string }>>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

export async function detectBarcodes(source: ImageBitmapSource): Promise<BarcodeObservation[]> {
  const ctor = (globalThis as typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
  if (!ctor) throw new Error("Native barcode detection is unavailable. Use manual identifier entry for now.");
  const detector = new ctor();
  const results = await detector.detect(source);
  return results.map((item) => ({
    rawValue: item.rawValue,
    format: item.format,
    detectorName: "BarcodeDetector",
    detectorVersion: "browser-native",
    observedAt: new Date().toISOString()
  }));
}
