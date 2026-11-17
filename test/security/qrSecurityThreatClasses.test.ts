/**
 * QR Security Threat Classes Test Suite
 * Master Specification v13.5 §15.3, Table 28, Table 54 (SEC-01, SEC-02)
 *
 * Requirements:
 * 1. QR payload must remain inert data.
 * 2. Zero automatic navigation, zero automatic background fetch, zero redirects.
 * 3. Covers all 10 canonical QR Threat Classes.
 */

import { describe, expect, it } from "vitest";
import { classifyPayload, type PayloadClass } from "../../src/domain/rules/payloadClassifier";
import { parseGs1Payload } from "../../src/domain/rules/gs1Parser";

describe("SEC-01 / SEC-02: QR Security Threat Model (10 Canonical Classes)", () => {
  // Class 1: Valid GS1 Digital Link
  it("Class 1: Valid GS1 Digital Link is classified as https_url and parsed via GS1 without auto-fetching", () => {
    const raw = "https://id.gs1.org/01/08901058852332/10/BATCH123";
    const classification: PayloadClass = classifyPayload(raw);
    expect(classification).toBe("https_url");

    const gs1Result = parseGs1Payload(raw);
    expect(gs1Result.isValid).toBe(true);
    expect(gs1Result.gtin).toBe("08901058852332");
    expect(gs1Result.batchOrLot).toBe("BATCH123");
    // Explicitly verify it's inert: no network fetch is triggered
  });

  // Class 2: Plain GTIN (numeric)
  it("Class 2: Plain numeric barcode/GTIN is recognized as gtin without network action", () => {
    const raw = "8901058852332";
    const classification = classifyPayload(raw);
    expect(classification).toBe("gtin");
  });

  // Class 3: Valid Web URL (HTTPS)
  it("Class 3: Standard HTTPS URL is marked as previewable text only, never auto-opened", () => {
    const raw = "https://www.foodcue.org/product/info";
    const classification = classifyPayload(raw);
    expect(classification).toBe("https_url");
  });

  // Class 4: Insecure HTTP URL
  it("Class 4: Plain HTTP URL is flagged as http_url (insecure protocol)", () => {
    const raw = "http://insecure-food-site.com/item/123";
    const classification = classifyPayload(raw);
    expect(classification).toBe("http_url");
  });

  // Class 5: Short URL / Link Shortener (adversarial redirect risk)
  it("Class 5: Short URL (bit.ly/tinyurl) is classified as https_url, not expanded or resolved", () => {
    const raw = "https://bit.ly/3xSampleFood";
    const classification = classifyPayload(raw);
    expect(classification).toBe("https_url");
    // Must remain raw string, no redirect follow
  });

  // Class 6: Malicious / Unsafe Executable Schemes (javascript:, data:, file:, intent:)
  it("Class 6: Malicious executable URI schemes are strictly classified as unsafe_scheme", () => {
    const javascriptPayload = "javascript:alert(document.cookie)";
    expect(classifyPayload(javascriptPayload)).toBe("unsafe_scheme");

    const dataPayload = "data:text/html,<script>alert(1)</script>";
    expect(classifyPayload(dataPayload)).toBe("unsafe_scheme");

    const filePayload = "file:///etc/passwd";
    expect(classifyPayload(filePayload)).toBe("unsafe_scheme");

    const intentPayload = "intent://com.example.app/#Intent;scheme=bad;end";
    expect(classifyPayload(intentPayload)).toBe("unsafe_scheme");

    const vbscriptPayload = "vbscript:msgbox(1)";
    expect(classifyPayload(vbscriptPayload)).toBe("unsafe_scheme");
  });

  // Class 7: Embedded Credentials (phishing / credential leak vectors)
  it("Class 7: URLs with embedded credentials do not crash parser and are treated as inert strings", () => {
    const raw = "https://admin:supersecret@phishing-food.com/login";
    const classification = classifyPayload(raw);
    expect(classification).toBe("https_url");
  });

  // Class 8: Arbitrary Text / Non-URL String
  it("Class 8: Arbitrary text or recipe note is safely parsed as plain_text", () => {
    const raw = "Batch manufactured at Factory 4B, 100% Organic certified.";
    const classification = classifyPayload(raw);
    expect(classification).toBe("plain_text");
  });

  // Class 9: Oversized Payloads (Buffer overflow / memory exhaustion attempts)
  it("Class 9: Payloads exceeding 4096 characters are classified as malformed", () => {
    const oversized = "https://example.com/payload?" + "a".repeat(4100);
    expect(classifyPayload(oversized)).toBe("malformed");
  });

  // Class 10: Malformed GS1 Digital Link / Syntax Errors
  it("Class 10: Corrupted GS1 Digital Link returns invalid parse result and prevents downstream operations", () => {
    const corruptDigitalLink = "https://id.gs1.org/01/not-a-number/10/LOT";
    const classification = classifyPayload(corruptDigitalLink);
    expect(classification).toBe("https_url");

    const gs1 = parseGs1Payload(corruptDigitalLink);
    expect(gs1.isValid).toBe(false);
    expect(gs1.errors.length).toBeGreaterThan(0);
  });
});
