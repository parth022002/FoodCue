/**
 * FoodCue OCR Port Definition (S2 Baseline)
 * Controlling Specification: Master Specification v13.5 §6.3 & Architecture Diagram
 *
 * Defines the contract for all local browser-based OCR adapters (Web Worker WASM).
 * Guarantees uniform observation structures for the Evidence Resolver.
 */

export type OcrPanelType =
  | "front"
  | "ingredients"
  | "allergen_statement"
  | "nutrition_table"
  | "dates_batch"
  | "fssai"
  | "generic";

export type OcrEngineType = "tesseract" | "paddleocr" | "fallback" | "simulated";

export interface OcrBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrWord {
  text: string;
  confidence: number; // 0.0 to 1.0 calibrated
  bbox: OcrBoundingBox;
}

export interface OcrLine {
  text: string;
  confidence: number;
  words: OcrWord[];
  bbox: OcrBoundingBox;
}

export interface ExtractedKeywords {
  allergens: string[];
  dates: string[];
  fssaiLicense?: string;
  netWeight?: string;
}

export interface OcrResult {
  text: string;
  confidence: number; // Overall calibrated confidence 0.0 to 1.0
  lines: OcrLine[];
  panelType: OcrPanelType;
  engine: OcrEngineType;
  processingTimeMs: number;
  memoryFootprintEstimateMb?: number;
  extractedKeywords: ExtractedKeywords;
  preprocessingApplied: string[];
}

export type OcrImageInput = ImageData | HTMLCanvasElement | Blob | string;

export interface OcrPort {
  initialize(): Promise<void>;
  recognizePanel(input: OcrImageInput, panelType: OcrPanelType): Promise<OcrResult>;
  terminate(): Promise<void>;
  isReady(): boolean;
  getEngineType(): OcrEngineType;
}
