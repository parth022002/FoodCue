/**
 * Comprehensive Test Suite for GS1 Syntax & Digital Link Parser
 * Testing 13 official GS1 Conformance Vectors (9 valid, 4 invalid)
 * Controlling Spec: Master Specification v13.5 §6.2
 */

import { describe, expect, it } from "vitest";
import { parseGs1Payload } from "./gs1Parser";

describe("GS1 Parser - 13 Conformance Test Vectors", () => {
  // --- 9 VALID VECTORS ---

  it("Vector 1: Standard GTIN-14 alone in bracketed format", () => {
    const res = parseGs1Payload("(01)08901058852332");
    expect(res.isValid).toBe(true);
    expect(res.gtin).toBe("08901058852332");
    expect(res.syntaxType).toBe("bracketed_element_string");
    expect(res.errors).toHaveLength(0);
  });

  it("Vector 2: GTIN-14 + Expiration Date in bracketed format", () => {
    const res = parseGs1Payload("(01)08901058852332(17)261231");
    expect(res.isValid).toBe(true);
    expect(res.gtin).toBe("08901058852332");
    expect(res.expirationDate).toBe("2026-12-31");
    expect(res.syntaxType).toBe("bracketed_element_string");
    expect(res.errors).toHaveLength(0);
  });

  it("Vector 3: GTIN-14 + Best Before Date + Batch/Lot", () => {
    const res = parseGs1Payload("(01)08901058852332(15)270630(10)LOT9876");
    expect(res.isValid).toBe(true);
    expect(res.gtin).toBe("08901058852332");
    expect(res.bestBeforeDate).toBe("2027-06-30");
    expect(res.batchOrLot).toBe("LOT9876");
    expect(res.errors).toHaveLength(0);
  });

  it("Vector 4: Element string with ASCII 29 <GS> (FNC1) delimiter", () => {
    const res = parseGs1Payload("010890105885233210BATCH123\u001d17261231");
    expect(res.isValid).toBe(true);
    expect(res.gtin).toBe("08901058852332");
    expect(res.batchOrLot).toBe("BATCH123");
    expect(res.expirationDate).toBe("2026-12-31");
    expect(res.syntaxType).toBe("gs_delimited_element_string");
    expect(res.errors).toHaveLength(0);
  });

  it("Vector 5: Production Date with Day '00' (end of month convention)", () => {
    // 260200 = February 2026, day 00 -> 2026-02-28
    const res = parseGs1Payload("(01)08901058852332(11)260200");
    expect(res.isValid).toBe(true);
    expect(res.gtin).toBe("08901058852332");
    expect(res.productionDate).toBe("2026-02-28");
    expect(res.errors).toHaveLength(0);
  });

  it("Vector 6: Serial Number AI (21)", () => {
    const res = parseGs1Payload("(01)08901058852332(21)SN12345678");
    expect(res.isValid).toBe(true);
    expect(res.gtin).toBe("08901058852332");
    expect(res.serialNumber).toBe("SN12345678");
    expect(res.errors).toHaveLength(0);
  });

  it("Vector 7: Net Weight in kg AI (3103 - 3 decimal places)", () => {
    // 3103 000500 = 500 grams = 0.5 kg
    const res = parseGs1Payload("(01)08901058852332(3103)000500");
    expect(res.isValid).toBe(true);
    expect(res.gtin).toBe("08901058852332");
    expect(res.netWeightKg).toBe(0.5);
    expect(res.errors).toHaveLength(0);
  });

  it("Vector 8: Official GS1 Digital Link URI with path & query attributes", () => {
    const res = parseGs1Payload("https://id.gs1.org/01/08901058852332/10/LOT555?17=261231");
    expect(res.isValid).toBe(true);
    expect(res.gtin).toBe("08901058852332");
    expect(res.batchOrLot).toBe("LOT555");
    expect(res.expirationDate).toBe("2026-12-31");
    expect(res.syntaxType).toBe("gs1_digital_link");
    expect(res.errors).toHaveLength(0);
  });

  it("Vector 9: Custom Brand GS1 Digital Link URI with best-before date", () => {
    const res = parseGs1Payload("https://brand.foodcue.org/01/08901058852332?15=270531");
    expect(res.isValid).toBe(true);
    expect(res.gtin).toBe("08901058852332");
    expect(res.bestBeforeDate).toBe("2027-05-31");
    expect(res.syntaxType).toBe("gs1_digital_link");
    expect(res.errors).toHaveLength(0);
  });

  // --- 4 INVALID VECTORS (FAIL-CLOSED) ---

  it("Vector 10: Invalid GTIN check digit in AI (01)", () => {
    // 08901058852339 has incorrect check digit (should be 2)
    const res = parseGs1Payload("(01)08901058852339");
    expect(res.isValid).toBe(false);
    expect(res.gtin).toBeUndefined();
    expect(res.errors.some((e) => e.includes("check-digit failure"))).toBe(true);
  });

  it("Vector 11: Truncated fixed-length AI (01)", () => {
    // 9 digits instead of 14
    const res = parseGs1Payload("(01)089010588");
    expect(res.isValid).toBe(false);
    expect(res.gtin).toBeUndefined();
    expect(res.errors.some((e) => e.includes("expects 14 characters"))).toBe(true);
  });

  it("Vector 12: Unsupported or unknown AI", () => {
    const res = parseGs1Payload("(999)INVALIDDATA");
    expect(res.isValid).toBe(false);
    expect(res.unsupportedAis).toContain("999");
    expect(res.errors.some((e) => e.includes("Unsupported AI (999)"))).toBe(true);
  });

  it("Vector 13: Malformed Digital Link URL structure", () => {
    const res = parseGs1Payload("https://id.gs1.org/invalid-path");
    expect(res.isValid).toBe(false);
    expect(res.errors.some((e) => e.includes("Invalid GS1 Digital Link path structure"))).toBe(true);
  });
});
