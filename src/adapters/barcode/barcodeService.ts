import { readBarcodesFromImageData } from "@sec-ant/zxing-wasm/reader";

export interface DecodedBarcode {
  rawValue: string;
  format: string;
  sourceEngine: "BarcodeDetector" | "zxing-wasm" | "manual";
  timestamp: string;
}

/**
 * Portable barcode and QR code decoding across any browser or mobile camera
 */
export async function decodeBarcodeFromImageData(imageData: ImageData): Promise<DecodedBarcode[]> {
  try {
    const results = await readBarcodesFromImageData(imageData, {
      tryHarder: true,
      formats: [
        "EAN-13",
        "EAN-8",
        "UPC-A",
        "UPC-E",
        "QRCode",
        "DataMatrix",
        "Code128",
        "Code39"
      ]
    });

    if (results && results.length > 0) {
      return results.map((r: { text: string; format: string }) => ({
        rawValue: r.text,
        format: r.format,
        sourceEngine: "zxing-wasm",
        timestamp: new Date().toISOString()
      }));
    }
  } catch {
    // Graceful fallback to native detector if available
  }

  // Fallback to native BarcodeDetector if available in browser
  const hasNative = "BarcodeDetector" in globalThis;
  if (hasNative) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Detector = (globalThis as any).BarcodeDetector;
      const detector = new Detector();
      const canvas = document.createElement("canvas");
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.putImageData(imageData, 0, 0);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nativeResults: any[] = await detector.detect(canvas);
        if (nativeResults && nativeResults.length > 0) {
          return nativeResults.map((r) => ({
            rawValue: r.rawValue,
            format: r.format,
            sourceEngine: "BarcodeDetector",
            timestamp: new Date().toISOString()
          }));
        }
      }
    } catch {
      // Return empty if native also fails
    }
  }

  return [];
}

/**
 * Extracts and decodes barcodes from an uploaded File (JPEG, PNG, WebP)
 */
export async function decodeBarcodeFromFile(file: File): Promise<DecodedBarcode[]> {
  const img = new Image();
  const url = URL.createObjectURL(file);

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image file."));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create canvas 2D context.");

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return await decodeBarcodeFromImageData(imageData);
  } finally {
    URL.revokeObjectURL(url);
  }
}
