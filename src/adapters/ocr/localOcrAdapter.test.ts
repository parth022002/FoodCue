/**
 * Unit Tests for LocalOcrAdapter
 * Controlling Specification: Master Specification v13.5 §6.3
 */

import { beforeEach, describe, expect, it } from "vitest";
import { LocalOcrAdapter } from "./localOcrAdapter";

describe("LocalOcrAdapter", () => {
  let adapter: LocalOcrAdapter;

  beforeEach(() => {
    adapter = new LocalOcrAdapter({ useSimulated: true });
  });

  it("initializes and reports simulated engine type", async () => {
    expect(adapter.isReady()).toBe(false);
    await adapter.initialize();
    expect(adapter.isReady()).toBe(true);
    expect(adapter.getEngineType()).toBe("simulated");
  });

  it("extracts FSSAI licence, net weight, and allergens from Indian pack text", async () => {
    const packText = `
      HALDIRAM'S BHUJIA SEV
      Net Wt: 200g
      Lic No: 10012011000123
      Mfg Date: 12/01/2026
      Best Before 6 months from packaging
      Contains: Peanuts, Gluten and Milk Solids.
      May contain traces of Soya and Tree Nuts.
    `;

    const keywords = adapter.extractKeywords(packText);

    expect(keywords.fssaiLicense).toBe("10012011000123");
    expect(keywords.netWeight).toBe("200g");
    expect(keywords.allergens).toContain("Peanuts");
    expect(keywords.allergens).toContain("Gluten");
    expect(keywords.allergens).toContain("Milk");
    expect(keywords.allergens).toContain("Soy");
    expect(keywords.allergens).toContain("Tree Nuts");
    expect(keywords.dates.length).toBeGreaterThan(0);
  });

  it("preprocesses image data with contrast stretching on narrow dynamic range", () => {
    // 4 pixels RGBA with low contrast (luminance 50 to 90)
    const rawData = new Uint8ClampedArray([
      50, 50, 50, 255,
      60, 60, 60, 255,
      75, 75, 75, 255,
      90, 90, 90, 255,
    ]);

    const result = adapter.preprocessImageData(rawData);
    expect(result.appliedSteps).toContain("grayscale_luminance");
    expect(result.appliedSteps).toContain("contrast_stretch");

    // After stretching, minimum should be stretched down towards 0 and maximum towards 255
    expect(result.data[0]).toBe(0);
    expect(result.data[12]).toBe(255);
  });

  it("recognizes panel and structures text into lines and bounding boxes", async () => {
    const rawText = "INGREDIENTS:\nWheat Flour, Vegetable Oil, Sugar\nCONTAINS GLUTEN";
    const result = await adapter.recognizePanel(rawText, "ingredients");

    expect(result.panelType).toBe("ingredients");
    expect(result.lines).toHaveLength(3);
    expect(result.lines[0]?.text).toBe("INGREDIENTS:");
    expect(result.lines[1]?.words).toHaveLength(5);
    expect(result.extractedKeywords.allergens).toContain("Gluten");
    expect(result.confidence).toBeGreaterThan(0.7);
  });
});
