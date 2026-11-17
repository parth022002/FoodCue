import { describe, it, expect } from "vitest";
import {
  processOcrTask,
  extractOcrKeywords,
  type WorkerRecognizeMessage,
} from "../../src/adapters/ocr/ocrWorker";

describe("On-Device OCR Web Worker Processor", () => {
  it("extracts FSSAI, allergens, and dates from raw packaging text", () => {
    const text =
      "MFD. 15/10/2026 B.NO. A24\n" +
      "Ingredients: Wheat Flour (Atta), Milk Solids, Sugar, Almonds.\n" +
      "FSSAI LIC. NO. 10014022002759\n" +
      "Net Wt. 500 g";

    const keywords = extractOcrKeywords(text);
    expect(keywords.fssaiLicense).toBe("10014022002759");
    expect(keywords.allergens).toContain("Gluten");
    expect(keywords.allergens).toContain("Milk");
    expect(keywords.allergens).toContain("Tree Nuts");
    expect(keywords.dates.length).toBeGreaterThan(0);
    expect(keywords.netWeight).toBe("500 g");
  });

  it("processes OCR recognition task and produces structured OcrResult", () => {
    const msg: WorkerRecognizeMessage = {
      type: "RECOGNIZE",
      id: "test-task-1",
      panelType: "ingredients",
      rawText: "Ingredients: Whole Wheat Flour, Edible Common Salt, Potassium Iodate.",
      options: {
        enableGrayscale: true,
      },
    };

    const result = processOcrTask(msg);
    expect(result.panelType).toBe("ingredients");
    expect(result.text).toBe(msg.rawText);
    expect(result.lines.length).toBe(1);
    expect(result.lines[0]?.words.length).toBeGreaterThan(3);
    expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    expect(result.extractedKeywords.allergens).toContain("Gluten");
    expect(result.memoryFootprintEstimateMb).toBeLessThanOrEqual(100);
  });

  it("handles image data with preprocessing inside worker task", () => {
    // 2x2 mock pixel array
    const data = new Uint8ClampedArray([
      200, 50, 50, 255,
      50, 200, 50, 255,
      50, 50, 200, 255,
      200, 200, 200, 255,
    ]);

    const msg: WorkerRecognizeMessage = {
      type: "RECOGNIZE",
      id: "test-task-2",
      panelType: "front",
      imageData: {
        data,
        width: 2,
        height: 2,
      },
      options: {
        enableGrayscale: true,
        enableContrastStretch: true,
      },
    };

    const result = processOcrTask(msg);
    expect(result.preprocessingApplied).toContain("grayscale_bt601");
    expect(result.text).toBe("PREPROCESSED_CANVAS_CROP");
  });
});
