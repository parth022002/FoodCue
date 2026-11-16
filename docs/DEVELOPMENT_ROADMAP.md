# Recommended implementation sequence

1. **Foundation:** repository hygiene, strict TypeScript, lint/typecheck/test/build, domain contracts.
2. **Vertical slice 1:** manual GTIN/text → validation → candidate state → physical confirmation → ConfirmedLabel guard → Not assessed analysis.
3. **SmartScan capture:** camera permission UX, photo/gallery validation, local image lifecycle, worker processing.
4. **Decoding:** barcode/QR decoder adapter; benchmark supported formats; QR security test suite.
5. **GS1:** dedicated parser, approved vectors, date/AI semantics and malformed-input tests.
6. **OCR:** compare candidate browser OCR engines; benchmark by field, language, script and pack condition; keep low-confidence fields uncertain.
7. **Evidence resolver:** local candidate catalogue, hard conflicts, provenance and label-version states.
8. **Food intelligence:** only after qualified content review, source rights and versioned rule packs; allergen states remain distinct.
9. **Persistence hardening:** IndexedDB migrations, transactional imports, quota handling, canary, export/restore and complete clear-data.
10. **Kitchen P1:** append-only pantry events, Unpack, locations, quantities, dates, reminders, shopping list and Pack Memory.
11. **Validation:** locked benchmark, QR/GS1/OCR/security/privacy/accessibility/performance suites and G1–G6 evidence.
12. **Beta only after approval:** opt-in 10–20 households for at least four weeks after gates pass.

Do not build Phase 2 AI, accounts, sync, backend, analytics or messaging as part of this baseline.
