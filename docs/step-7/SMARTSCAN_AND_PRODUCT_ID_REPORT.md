# FoodCue — SmartScan & Product Identification Report
**Controlling Authority:** FoodCue Master Specification v13.5 §6, §7; PRD v1.2 §4  
**Scope:** SmartScan Multi-Modal Recognition, GS1 Parser, Candidate Matcher & Label Confirmation  
**Run ID:** `RUN-SMARTSCAN-20261117-01`  
**Git Commit Hash:** `4b94ae3`  
**Status:** PASS (All Deterministic Scan & Match Rules Verified)

---

## 1. Executive Summary

SmartScan is FoodCue's multi-modal packaged food recognition pipeline. It ingests camera feeds, uploaded photos, and manual inputs to extract machine-readable identifiers (EAN/UPC barcodes, GS1 DataMatrix, QR codes) and visual label text via on-device OCR.

This report documents the verification of SmartScan components, focusing on:
1. GS1 Application Identifier (AI) parsing conformance.
2. QR security and threat classification.
3. Decoupled candidate matching.
4. Accurate communication of uncertainty.
5. Strict physical-pack confirmation boundary (`ConfirmedLabel`).

---

## 2. Supported Input Families & Decoding Pipeline

### 2.1 1D Linear Barcodes (EAN-13, EAN-8, UPC-A)
- Decoded using on-device `@sec-ant/zxing-wasm` WebAssembly engine.
- GTIN validation enforces standard check digit calculations:
  - GTIN-8, GTIN-12, GTIN-13, and GTIN-14 vectors verified in `src/domain/rules/gtin.test.ts` (4/4 tests pass).
  - Invalid GTINs (e.g. invalid check digits, incorrect length) are flagged immediately and prevented from auto-matching.

### 2.2 GS1 2D DataMatrix & GS1 Digital Link
- Parsed via `src/domain/rules/gs1Parser.ts` according to the GS1 General Specifications.
- **13 Official Conformance Vectors** evaluated in `src/domain/rules/gs1Parser.test.ts`:
  - 9 Valid Vectors: Bracketed element strings, GS-delimited (ASCII 29 / FNC1) strings, end-of-month date conventions (`YYMM00`), batch/lot (AI 10), expiration date (AI 17), production date (AI 11), serial numbers (AI 21), and standard GS1 Digital Link URIs.
  - 4 Invalid Vectors: Malformed AI prefixes, unparseable date formats, and truncated strings properly rejected with descriptive error arrays.
- Conformance Result: **100% (13/13 passing)**.

### 2.3 QR Threat Model & Payload Classification
- Payload classification strictly enforced in `src/domain/rules/payloadClassifier.ts`.
- **10 Canonical QR Threat Classes** verified in `test/security/qrSecurityThreatClasses.test.ts`:
  1. Valid GS1 Digital Link (parsed as inert structure).
  2. Plain numeric GTIN.
  3. Valid Web URL (HTTPS) — rendered as inert text preview.
  4. Insecure HTTP URL — flagged as insecure.
  5. Short URL (bit.ly/tinyurl) — classified as URL without redirect resolution.
  6. Malicious executable schemes (`javascript:`, `data:`, `file:`, `intent:`, `vbscript:`) — classified as `unsafe_scheme`.
  7. Embedded credentials (`https://user:pass@domain.com`) — treated as inert string.
  8. Plain text notes.
  9. Oversized payloads (>4096 characters) — classified as `malformed`.
  10. Corrupt Digital Link syntax — parsed with invalid flag.
- **Zero Auto-Navigation / Zero Auto-Fetch Rule:** Verified. At no point does scanning a QR code trigger an automated network fetch or browser navigation.

---

## 3. Product Candidate Resolution & Uncertainty Handling

### 3.1 Candidate Matcher (`src/domain/services/candidateMatcher.ts`)
- Candidate resolution operates across two independent paths:
  - **Path A:** Barcode / GTIN candidate resolution.
  - **Path B:** OCR brand / product title text candidate resolution.
- Both paths are treated as unconfirmed hypotheses. A barcode match does **NOT** equal physical formulation verification; an OCR reading does **NOT** equal verified label content.

### 3.2 Evidence Resolution & Conflict Detection (`src/domain/services/evidenceResolver.ts`)
- If Path A and Path B produce conflicting brands, package sizes, or variants, an explicit conflict is logged in `ProductCandidate.conflicts`.
- Hard conflicts prevent the candidate from advancing until the user explicitly resolves the ambiguity.

### 3.3 ConfirmedLabel Boundary (`src/domain/contracts/confirmedLabel.ts`)
- `createConfirmedLabel()` enforces non-waivable safety controls:
  1. The candidate must be in `"candidate"` status.
  2. All hard conflicts must be resolved.
  3. The physical identity and label version must be confirmed.
  4. All 3 critical panels (`ingredients`, `allergen_declaration`, `nutrition`) must be present.
  5. All 4 field confirmation states must be `"confirmed"`.
- If any requirement is missing, `ConfirmationError` is thrown, halting downstream analysis.

---

## 4. Test Verification Summary

| Test Suite | Tests | Result | Verification Area |
| :--- | :---: | :---: | :--- |
| `src/domain/rules/gtin.test.ts` | 4 | **PASS** | GTIN check digits & length validation |
| `src/domain/rules/gs1Parser.test.ts` | 13 | **PASS** | GS1 syntax & 13 conformance vectors |
| `src/domain/rules/payloadClassifier.test.ts` | 4 | **PASS** | Basic payload classification |
| `test/security/qrSecurityThreatClasses.test.ts` | 10 | **PASS** | 10 canonical QR security threat classes |
| `src/domain/services/candidateMatcher.test.ts` | 3 | **PASS** | Independent candidate matching paths |
| `src/domain/services/evidenceResolver.test.ts` | 3 | **PASS** | Multi-source conflict detection |
| `src/domain/contracts/confirmedLabel.test.ts` | 3 | **PASS** | ConfirmedLabel safety boundary enforcement |

**Conclusion:** SmartScan multi-modal processing and product identity contracts strictly adhere to the Master Specification.
