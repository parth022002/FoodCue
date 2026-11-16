# FoodCue — local-first development starter

**Version:** 0.1.0  
**Product baseline:** FoodCue Master Specification v13.5  
**Product requirements:** PRD v1.3  
**Security baseline:** Security, Privacy and Safety Requirements v1.0

FoodCue helps people understand supported packaged-food label information and organise the food they have. This starter is a modular React + TypeScript PWA scaffold designed to keep core processing local.

> **Important:** This is a development starter, not a finished scanner, validated food-safety product, legal-compliance result or beta-ready release. The food-analysis engine deliberately returns `Not assessed` because no reviewed rule/content pack is included.

## Requirements
- Node.js 20.18+ (LTS recommended)
- npm 10+
- Modern browser for local development

## Start locally
```bash
npm install
npm run dev
```
Open the local URL printed by Vite. Camera APIs require HTTPS or localhost and a user action.

## Validate
```bash
npm run typecheck
npm test
npm run lint
npm run build
```

The repository is delivered without `node_modules` and without a generated lockfile. After reviewing dependencies, run `npm install`, inspect the generated `package-lock.json`, commit it, and keep package versions pinned. Do not treat dependency installation as a security approval.

## What's in the starter
- React + TypeScript + Vite shell
- SmartScan manual input path with GTIN validation
- Unsafe URL scheme rejection and no QR URL navigation/fetch
- Candidate vs physical-pack confirmation boundary
- `ConfirmedLabel` runtime contract
- Safe `Not assessed` food-intelligence placeholder
- IndexedDB baseline with explicit clear-data
- Append-only pantry event helper and manual add UI
- Native camera and barcode-detection adapters (isolated, not fully wired)
- Unit tests and architecture/security docs

## Not included yet
See [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md) and [`docs/DEVELOPMENT_ROADMAP.md`](docs/DEVELOPMENT_ROADMAP.md).

## Key safety rules
1. A barcode, QR, GS1 value or catalogue candidate is not proof of the physical pack or current formulation.
2. Only `ConfirmedLabel` can reach food-intelligence.
3. Missing, unreadable, stale, conflicting or low-confidence evidence must not improve a safety result.
4. `Not detected in extracted text` is not proof of absence.
5. No universal safety/health grade or traffic-light verdict.
6. AI is Phase 2 only and cannot override deterministic safety rules.
7. Every pantry write requires explicit user confirmation.

## Free-tier / zero-cash posture
No paid API, backend, account, cloud OCR, AI service, analytics SDK, messaging service or external product lookup is connected. All dependencies are open-source packages pinned to exact versions in `package.json`; verify licences, provenance, advisories and bundle impact before adopting them.

## Project documents
The controlling documents should be maintained alongside development:
- FoodCue Master Specification v13.5
- FoodCue Product Development Requirements v1.3
- FoodCue Security, Privacy and Safety Requirements v1.0
- FoodCue Validation Workbook v13.5
- FoodCue Brand Guidelines v1.0

The Master Specification controls architecture, safety, privacy, gates and change control. If code convenience conflicts with it, stop and raise a change request.
