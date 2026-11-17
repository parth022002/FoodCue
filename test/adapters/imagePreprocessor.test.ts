import { describe, it, expect } from "vitest";
import {
  applyGrayscale,
  applyContrastStretch,
  computeOtsuThreshold,
  applyThreshold,
  applyMedianFilter,
  preprocessPackagingImage,
} from "../../src/adapters/ocr/imagePreprocessor";

describe("Image Preprocessor for Packaging OCR", () => {
  it("converts RGBA pixels to grayscale using BT.601 luminance weights", () => {
    // Red: (255, 0, 0, 255) -> 0.299 * 255 = 76
    const data = new Uint8ClampedArray([255, 0, 0, 255]);
    const gray = applyGrayscale(data, 1, 1);
    expect(gray[0]).toBe(76);
    expect(gray[1]).toBe(76);
    expect(gray[2]).toBe(76);
    expect(gray[3]).toBe(255); // Alpha preserved
  });

  it("applies contrast stretch to widen narrow dynamic range", () => {
    // Two pixels with low contrast: 50 and 100
    const data = new Uint8ClampedArray([50, 50, 50, 255, 100, 100, 100, 255]);
    const stretched = applyContrastStretch(data, 2, 1);
    expect(stretched[0]).toBe(0); // 50 mapped to 0
    expect(stretched[4]).toBe(255); // 100 mapped to 255
  });

  it("computes Otsu binarization threshold correctly for bimodal distribution", () => {
    // Half dark pixels (30) and half light pixels (220)
    const data = new Uint8ClampedArray([
      30, 30, 30, 255,
      30, 30, 30, 255,
      220, 220, 220, 255,
      220, 220, 220, 255,
    ]);
    const threshold = computeOtsuThreshold(data, 2, 2);
    expect(threshold).toBeGreaterThanOrEqual(30);
    expect(threshold).toBeLessThanOrEqual(220);
  });

  it("applies threshold to generate binary black and white values", () => {
    const data = new Uint8ClampedArray([50, 50, 50, 255, 200, 200, 200, 255]);
    const bin = applyThreshold(data, 2, 1, 100);
    expect(bin[0]).toBe(0); // 50 < 100 -> 0
    expect(bin[4]).toBe(255); // 200 >= 100 -> 255
  });

  it("removes salt-and-pepper noise via 3x3 median filter", () => {
    // 3x3 image with all zeros except a center noisy white pixel (255)
    const width = 3;
    const height = 3;
    const data = new Uint8ClampedArray(width * height * 4);
    // Set center pixel (x=1, y=1) to 255
    const centerIdx = (1 * width + 1) * 4;
    data[centerIdx] = 255;
    data[centerIdx + 1] = 255;
    data[centerIdx + 2] = 255;
    data[centerIdx + 3] = 255;

    const filtered = applyMedianFilter(data, width, height);
    expect(filtered[centerIdx]).toBe(0); // Filtered to median (0)
  });

  it("runs full packaging preprocessing pipeline with step tracking", () => {
    const data = new Uint8ClampedArray([50, 100, 150, 255, 60, 110, 160, 255]);
    const res = preprocessPackagingImage(data, 2, 1, {
      enableGrayscale: true,
      enableContrastStretch: true,
      enableAdaptiveThreshold: true,
    });
    expect(res.appliedSteps).toContain("grayscale_bt601");
    expect(res.appliedSteps).toContain("contrast_stretch");
    expect(res.appliedSteps.some((s) => s.startsWith("otsu_threshold"))).toBe(true);
    expect(res.data.length).toBe(data.length);
  });
});
