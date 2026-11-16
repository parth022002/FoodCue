# Implementation status — starter v0.1.0

This repository is a development scaffold, not a complete FoodCue implementation.

## Implemented in this starter
- React + TypeScript + Vite application shell with SmartScan, My Kitchen and Privacy views.
- Manual identifier/text entry and GTIN check-digit validation.
- Basic QR/URL payload classification; no URL opening, fetching or redirect following.
- Candidate object and explicit physical-pack confirmation flow.
- Runtime `ConfirmedLabel` contract guard.
- Food-analysis boundary that deliberately returns `Not assessed` until reviewed rule/content packs exist.
- Native IndexedDB database with versioned stores and clear-data operation.
- Append-only pantry event helper and manual-add starter UI.
- Native camera and BarcodeDetector adapters isolated behind modules (not yet wired into full scan orchestration).
- Unit tests for GTIN, payload classification, ConfirmedLabel and pantry ledger.

## Not implemented / not release-ready
- Full camera viewfinder, still-photo/gallery pipeline and local OCR.
- Production-grade barcode/QR decoder integration and complete GS1 parser/conformance.
- Local product catalogue, candidate ranking and hard mismatch algorithm.
- Reviewed ingredient lexicon, allergen mappings, nutrition transforms, approved content/source packs.
- Complete export/import/restore, EXIF stripping, migrations beyond initial schema, quota/canary/recovery UX.
- Full pantry consume/move/discard/correction, dates, reminders, shopping list and pack memory.
- Accessibility audit, supported device matrix, performance benchmark, SBOM, dependency scans, security review and G1–G6 evidence.
- Optional Open Food Facts lookup (must be implemented GTIN-only, user-initiated and disclosed).
- All Phase 2 features: AI/RAG, web research, accounts, sync, backend, analytics, messaging and cloud processing.

## Safety status
No food-safety or allergen conclusion is produced. The starter's analysis result remains `not_assessed`. Do not use it to make consumption decisions or expose it as validated food guidance.
