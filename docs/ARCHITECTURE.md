# FoodCue architecture — starter v0.1.0

```text
React + TypeScript PWA
  ├── Features: SmartScan / Product / Food Intelligence / Kitchen / Privacy
  ├── Capture adapters: camera / photo / gallery / manual
  ├── Decoder adapters: native BarcodeDetector (progressive enhancement)
  ├── Parsers: GTIN / QR URL classification / GS1 (future adapter)
  ├── Evidence resolver: candidate generation + hard conflicts (future)
  ├── Confirmation boundary: ConfirmedLabel
  ├── Deterministic domain rules: food intelligence / pantry ledger
  ├── IndexedDB repositories and migrations
  └── Privacy/security infrastructure
       └── Optional GTIN-only external lookup (not connected in starter)

Phase 2 (separate approval): AI adapter / grounded assistant / web retrieval.
Must never write or override deterministic safety state.
```

## Dependency direction
UI → feature orchestration → domain contracts/rules → ports.
Adapters implement ports and must not be imported by domain rule modules.
No external content is executable. QR/OCR/import/web text is untrusted data.
