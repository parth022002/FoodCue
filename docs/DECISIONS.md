# FOODCUE FORMAL DECISION REGISTER
**Project Baseline & Architecture Decision Records (ADRs)**

```text
========================================================================================
PROJECT:               FoodCue (Working Brand; Formerly SafeWise AI)
DOCUMENT TITLE:        FoodCue Formal Decision Register
VERSION:               v1.0 (Controlled Release Baseline)
DATE:                  16 November 2026
PARENT SPECIFICATION:  FoodCue Master Specification v13.5
========================================================================================
```

## Section 1: Pre-Development Baseline Decisions (D-001 to D-016)

The following baseline decisions were formally established in Master Specification v13.5 and Validation Workbook v13.5:

| Decision ID | Date | Decision Summary | Class | Rationale & Evidence | Approver | Affected Requirements | Status |
|---|---|---|---|---|---|---|---|
| **D-001** | 2026-10-31 | Adopt local-first static PWA as baseline; server design moved to conditional Phase 2 | Class 1 (Fundamental) | Zero cash; no accounts or server data to protect; privacy-first | Founder | SW-AUTH-016, SW-LINK-021 | **Accepted** |
| **D-002** | 2026-10-31 | No generative AI or paid API in safety path or baseline | Class 1 (Fundamental) | Cost and safety: deterministic reviewed rules only | Founder | SW-ALG-005, SW-EMG-019 | **Accepted** |
| **D-003** | 2026-10-31 | Hindi strings ship only after fluent qualified review; English first | Class 1 (Fundamental) | Unreviewed safety translations create patient safety risk | Founder | SW-ACC-017 | **Accepted** |
| **D-004** | 2026-10-31 | Independent review unavailable at INR 0 limits release to research prototype or closed beta | Class 1 (Fundamental) | Honesty about assurance; founder self-review is not legal sign-off | Founder | G6 Release Gate | **Accepted** |
| **D-005** | 2026-10-31 | Interview gate G1 counts best segment-and-job cell, not broad segment | Class 2 (Scope) | 3 segments across 20 interviews made old rule un-failable | Founder | G1 Problem Gate | **Accepted** |
| **D-006** | 2026-10-31 | Release-blocking critical-failure decisions use locked release set only | Class 2 (Scope) | Tuning on development set is expected; release set is held out | Founder | SW-MATCH-002, SW-ALG-005 | **Accepted** |
| **D-007** | 2026-10-31 | Manual gate rows pass only with evidence ID, reviewer, date, and decision record | Class 2 (Scope) | Workbook audit revealed bare 'Y' could pass without evidence | Founder | G2, G6 Gates | **Accepted** |
| **D-008** | 2026-10-31 | Public-release benchmark target 500 verified packs; initial gate 100 | Class 2 (Scope) | Review of workbook capacity and release targets | Founder | G4 Technical Gate | **Accepted** |
| **D-009** | 2026-11-16 | Adopt FoodCue as working brand name; SafeWise AI archived | Class 1 (Fundamental) | PRD v1.2/v1.3 and Brand Guidelines v1.0 | Founder | Product Name, UX, Brand | **Accepted** |
| **D-010** | 2026-11-16 | SmartScan is a P0 feature for live camera, photo, gallery, barcode, QR, GS1 | Class 1 (Fundamental) | PRD v1.3 multi-modal scan requirements | Founder | SW-SCAN-043 to SW-IMG-057 | **Accepted** |
| **D-011** | 2026-11-16 | Native BarcodeDetector is progressive enhancement only; portable decoder required | Class 3 (Impl) | MDN limited availability guidance; mobile browser compatibility | Founder | SW-BAR-044, SW-QR-045 | **Accepted** |
| **D-012** | 2026-11-16 | GS1 parsing is a standalone TypeScript module versioned against official syntax | Class 1 (Fundamental) | GS1 standards repository; prevent parsing ad hoc in UI | Founder | SW-GS1-046, SW-GS1-054 | **Accepted** |
| **D-013** | 2026-11-16 | QR URLs are preview-only; FoodCue never auto-navigates or fetches QR targets | Class 1 (Fundamental) | QR threat model and anti-phishing safeguard | Founder | SW-URL-049, SW-QR-045 | **LOCKED** |
| **D-014** | 2026-11-16 | AI, web research, and medical profiles remain Phase 2 / deferred | Class 1 (Fundamental) | Zero-cash, privacy, and food safety constraints | Founder | FC-AI, FC-WEB, FC-PROF-022 | **Accepted** |
| **D-015** | 2026-11-16 | English-first OCR; regional scripts require model benchmark and qualified review | Class 1 (Fundamental) | Browser model evidence not yet established for Devanagari | Founder | SW-OCR-003, SW-ACC-017 | **Accepted** |
| **D-016** | 2026-11-16 | Master Specification v13.5 and Validation Workbook v13.5 are active control pair | Class 1 (Fundamental) | Version reconciliation across all project materials | Founder | All baseline items | **Accepted** |
| **D-017** | 2026-11-16 | Dual-Storage architecture with Neon Serverless Postgres for optional cloud sync | Class 1 (Fundamental) | Local-first IndexedDB remains primary; Neon HTTP pooler enables multi-device backup | Founder | Database & Cloud | **Accepted** |
| **D-018** | 2026-11-16 | Deploy to Vercel ONLY for static PWA edge hosting; reject Render | Class 2 (Scope) | Avoid Render 50s cold-start spin-down on mobile; Vercel provides native SPA rewrites | Founder | Hosting & DevOps | **Accepted** |
| **D-019** | 2026-11-17 | Cryptographic Svix Webhook Verification via Native Node.js Crypto | Class 1 (Fundamental) | Eliminate third-party supply chain bloat; constant-time HMAC SHA-256 with 300s replay window | Founder | Security v1.0 §4 | **Accepted** |
| **D-020** | 2026-11-17 | IndexedDB Schema v3 with Persistent Offline Mutation Queue (`syncQueue`) | Class 1 (Fundamental) | Guarantees zero mutation loss across browser reloads and network outages | Founder | Master Spec §12 | **Accepted** |
| **D-021** | 2026-11-17 | Hybrid Deterministic Conflict Resolution with Safety-First Set Union | Class 1 (Fundamental) | Append-only event ordering for pantry stock; mathematical set union for allergen avoid-lists | Founder | Master Spec §12.5 | **Accepted** |
| **D-022** | 2026-11-17 | Multi-Device Fleet Heartbeat & Server-Enforced Remote Session Revocation | Class 2 (Scope) | Allow users to revoke compromised devices directly from Profile; rejected at API boundary | Founder | Security v1.0 §8 | **Accepted** |

---

## Section 2: Implementation Decisions Required from Project Owner (FD-01 to FD-08)

The following operational decisions require formal review and owner sign-off:

```text
FD-01: Browser & Target Device Matrix
Recommended Default: Chrome on Android 11+ and Safari on iOS 16.4+ as primary targets.
Safe Fallback: Unsupported devices fallback to gallery upload and manual entry.
Owner Action: Approve target device profiles for latency (<=20s) and memory (<=400MB) benchmarking.

FD-02: Barcode Decoder & OCR Engine Selection
Recommended Default: ZXing-WASM for barcode decoding; PaddleOCR.js vs Tesseract.js evaluated via spike.
Safe Fallback: ZXing-WASM + Tesseract.js (English only) bundled locally in Web Workers.
Owner Action: Approve engineering spike results before bundle commitment.

FD-03: Validation Benchmark Thresholds Freeze
Recommended Default: Freeze workbook Assumptions: 100 packs (40 locked release set), OCR accuracy >=95% allergen / >=90% ingredient, zero false matches.
Safe Fallback: Formulas fail closed as NOT TESTED until frozen.
Owner Action: Sign off Assumptions sheet before collecting physical pack benchmark.

FD-04: External Source Use Scope Approval
Recommended Default: Open Food Facts candidate lookup only (GTIN only; user disclosed). ICMR-NIN strictly link-only.
Safe Fallback: Unapproved sources are completely excluded from release.
Owner Action: Sign off approved use scopes in Source_Rights_Register.

FD-05: Allergen & Nutrition Rule Approval
Recommended Default: FSSAI 8 mandatory allergen declarations. Qualified food technologist sign-off on lexicon aliases.
Safe Fallback: Output remains "not_assessed" until reviewed lexicon is approved.
Owner Action: Appoint qualified food technologist reviewer.

FD-06: Hindi & Regional Language Scope
Recommended Default: English-first for L0/L1 baseline. Hindi deferred until reviewed.
Safe Fallback: Ship English-only with clear coverage statement.
Owner Action: Confirm English-only baseline scope.

FD-07: Phase 2 AI & Cloud Assistant Scope
Recommended Default: Remain 100% local-first. Phase 2 deferred.
Safe Fallback: Zero AI code in baseline.
Owner Action: Confirm Phase 2 boundary.

FD-08: Beachhead Market Segment Selection
Recommended Default: Urban household grocery organiser managing packaged food.
Safe Fallback: Segment remains conditional until G1 qualitative interviews complete.
Owner Action: Approve discovery interview target profile.
```
