/**
 * Unit Tests for EvidenceResolver
 * Controlling Spec: Master Specification v13.5 §6.4
 */

import { describe, expect, it } from "vitest";
import { EvidenceResolver } from "./evidenceResolver";

describe("EvidenceResolver", () => {
  it("records observations with immutable provenance", () => {
    const resolver = new EvidenceResolver();

    resolver.addObservation({
      source: "barcode",
      rawPayload: "8901058852738",
      confidence: 1.0,
      detectorInfo: { name: "ZXing-WASM", version: "2.2.0" },
      parsedFields: {
        gtin: "8901058852738",
      },
      warnings: [],
    });

    resolver.addObservation({
      source: "ocr_front",
      rawPayload: "TATA SALT VACUUM EVAPORATED 1kg",
      confidence: 0.92,
      detectorInfo: { name: "Tesseract.js-Worker" },
      parsedFields: {
        brand: "Tata",
        productName: "Vacuum Evaporated Iodised Salt",
        packSize: "1 kg",
      },
      warnings: [],
    });

    const state = resolver.resolve();

    expect(state.observations).toHaveLength(2);
    expect(state.capturedPanels).toContain("barcode");
    expect(state.capturedPanels).toContain("ocr_front");
    expect(state.resolvedFields.gtin).toBe("8901058852738");
    expect(state.resolvedFields.brand).toBe("Tata");
    expect(state.resolvedFields.packSize).toBe("1 kg");
    expect(state.hasHardConflicts).toBe(false);
    expect(state.conflicts).toHaveLength(0);
    expect(state.evidenceCoverage).toBeGreaterThan(0.4);
  });

  it("detects hard conflicts between incompatible GTIN readings", () => {
    const resolver = new EvidenceResolver();

    resolver.addObservation({
      source: "barcode",
      rawPayload: "8901058852738",
      confidence: 1.0,
      parsedFields: { gtin: "8901058852738" },
      warnings: [],
    });

    resolver.addObservation({
      source: "gs1",
      rawPayload: "https://id.gs1.org/01/08901719101037",
      confidence: 1.0,
      parsedFields: { gtin: "08901719101037" },
      warnings: [],
    });

    const state = resolver.resolve();

    expect(state.hasHardConflicts).toBe(true);
    expect(state.conflicts.some((c) => c.field === "gtin" && c.severity === "hard")).toBe(true);
  });

  it("detects brand contradiction across OCR and manual inputs", () => {
    const resolver = new EvidenceResolver();

    resolver.addObservation({
      source: "ocr_front",
      rawPayload: "PARLE-G GLUCO BISCUITS",
      confidence: 0.9,
      parsedFields: { brand: "Parle" },
      warnings: [],
    });

    resolver.addObservation({
      source: "manual",
      rawPayload: "Britannia",
      confidence: 1.0,
      parsedFields: { brand: "Britannia" },
      warnings: [],
    });

    const state = resolver.resolve();

    expect(state.hasHardConflicts).toBe(true);
    expect(state.conflicts.some((c) => c.field === "brand")).toBe(true);
  });
});
