/**
 * Unit Tests for CandidateMatcher & ConfirmedLabel Gate
 * Controlling Spec: Master Specification v13.5 §6.5
 */

import { describe, expect, it } from "vitest";
import { VERIFIED_INDIAN_CATALOG } from "../entities/catalogData";
import { rankCandidates, validateConfirmedLabelGate } from "./candidateMatcher";
import { EvidenceResolver } from "./evidenceResolver";

describe("CandidateMatcher & ConfirmedLabel Gate", () => {
  it("ranks candidates using formula Q = S * min(1, E / 0.70)", () => {
    const resolver = new EvidenceResolver();

    // Observe GTIN for Tata Salt (8901058852738)
    resolver.addObservation({
      source: "barcode",
      rawPayload: "8901058852738",
      confidence: 1.0,
      parsedFields: {
        gtin: "8901058852738",
      },
      warnings: [],
    });

    // Add OCR front panel
    resolver.addObservation({
      source: "ocr_front",
      rawPayload: "Tata Vacuum Evaporated Iodised Salt 1kg",
      confidence: 0.95,
      parsedFields: {
        brand: "Tata",
        productName: "Vacuum Evaporated Iodised Salt",
        packSize: "1 kg",
        fssaiLicense: "10014022002759",
      },
      warnings: [],
    });

    const evidence = resolver.resolve();
    const ranked = rankCandidates(evidence, VERIFIED_INDIAN_CATALOG);

    expect(ranked.length).toBeGreaterThan(0);
    const top = ranked[0]!;

    expect(top.candidate.gtin).toBe("8901058852738");
    expect(top.similarityScore).toBe(1.0); // Perfect match across weights
    expect(top.score).toBeGreaterThan(0.7);
    expect(top.isBlockedByConflict).toBe(false);
  });

  it("blocks promotion if user has not physically confirmed pack", () => {
    const resolver = new EvidenceResolver();
    resolver.addObservation({
      source: "barcode",
      rawPayload: "8901719101037",
      confidence: 1.0,
      parsedFields: { gtin: "8901719101037" },
      warnings: [],
    });

    const evidence = resolver.resolve();
    const ranked = rankCandidates(evidence, VERIFIED_INDIAN_CATALOG);
    const top = ranked[0]!;

    // Physical confirmation is false
    const gateResult = validateConfirmedLabelGate(top, evidence, false);

    expect(gateResult.eligible).toBe(false);
    expect(gateResult.reasons.some((r) => r.includes("Physical pack confirmation"))).toBe(true);
  });

  it("blocks promotion when hard conflicts are present", () => {
    const resolver = new EvidenceResolver();

    // Contradictory brands
    resolver.addObservation({
      source: "ocr_front",
      rawPayload: "Parle-G",
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

    const evidence = resolver.resolve();
    const ranked = rankCandidates(evidence, VERIFIED_INDIAN_CATALOG);
    const top = ranked[0]!;

    const gateResult = validateConfirmedLabelGate(top, evidence, true);

    expect(gateResult.eligible).toBe(false);
    expect(gateResult.reasons.some((r) => r.includes("hard conflicts"))).toBe(true);
  });
});
