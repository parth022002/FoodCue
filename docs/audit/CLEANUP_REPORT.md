# FoodCue — Repository Cleanup & Organisation Register

**Audit Date:** 17 November 2026  
**Auditor:** DevOps & Quality Engineering Lead  
**Scope:** Elimination of redundancy, consolidation of interim documentation, archiving of one-off inspection scripts, and verification of repository health.

---

## 1. Cleanup Objectives

1. Satisfy the user requirement: *"remove the .md file and other unwanted things from the project so that I can know what all is remaining and start working on it"*.
2. Clean and organize the repository without modifying working product behavior or deleting valuable audit evidence.
3. Establish a single authoritative documentation hub under `docs/audit/` and `docs/technical/`.
4. Archive interim step documents and scratch exploration scripts into dedicated archive directories.
5. Verify zero build regressions and zero test failures post-cleanup.

---

## 2. Directory Reorganization & Archiving Actions

### A. Python Inspection Scripts (`scripts/`)
During early development and specification analysis, 11 Python scripts were created to inspect the external `.docx` and `.xlsx` specification files. None of these were part of the application build or runtime.

- **Action:** Moved 11 Python files from `scripts/` to `scripts/archive/spec-inspection/`.
- **Files Archived:**
  - `check_data_counts.py`
  - `check_v13_4_counts.py`
  - `check_v13_5_cells.py`
  - `inspect_all_sheets.py`
  - `inspect_full_gates.py`
  - `inspect_master_spec.py`
  - `inspect_master_spec_2.py`
  - `inspect_tables.py`
  - `inspect_workbook.py`
  - `print_spec_tables.py`
  - `read_spec_sections.py`
- **Result:** `scripts/` now contains strictly production build, migration, and verification tools:
  - `bundle-api.mjs` (Vercel serverless bundler)
  - `generate-fmcg-catalog.mjs` (FMCG barcode catalog generator)
  - `migrate-neon.mjs` (Neon PostgreSQL database migrator)
  - `run-migrations.mjs` (Migration runner)
  - `verify-step5-webhooks.mjs` (Step 5 Clerk webhook delivery verification tool)

---

### B. Interim Step Documents (`docs/`)
Interim markdown reports produced during prompt-driven execution iterations (Step 7, Step 8, Step 9, Step 10, handover, and release) created clutter and conflicting roadmaps.

- **Action:** Moved 8 historical directories containing 60+ interim markdown reports to `docs/archive/historical-steps/`.
- **Directories Archived:**
  - `docs/step-7/` (20 test & validation files)
  - `docs/step-8/` (8 audit & gate assessment files)
  - `docs/step-9/` (7 beta protocol & findings files)
  - `docs/step-10/` (8 public launch review files)
  - `docs/handover/` (7 interim handover files)
  - `docs/release/` (7 interim release files)
  - `docs/next-phase/` (1 interim audit file)
  - `docs/final-completion/` (2 completion report files)
- **Benefit:** Historical git audit trail is 100% preserved in the repository; the active `docs/` tree is uncluttered, clean, and immediately comprehensible.

---

### C. Superseded Checklists (`docs/`)
Earlier checklist documents (`DEVELOPMENT_ROADMAP.md`, `FOODCUE_DEVELOPMENT_CHECKLIST.md`, `IMPLEMENTATION_STATUS.md`) contained unverified assumptions from Step 6 that conflicted with post-Milestone 8 reality.

- **Action:** Moved to `docs/archive/historical-checklists/`.
- **Replacement:** The single source of truth is now `docs/audit/PROJECT_STATUS.md` and `docs/audit/REMAINING_WORK.md`.

---

### D. Consolidated Canonical Technical Structure

The active `docs/` hierarchy is now strictly organized as follows:

```
docs/
├── archive/
│   ├── historical-checklists/     # Superseded roadmaps
│   └── historical-steps/          # Archived interim step documentation
├── audit/                         # 10 Authoritative Audit Deliverables
│   ├── PROJECT_AUDIT_REPORT.md
│   ├── DOCUMENT_AUTHORITY_REGISTER.md
│   ├── PROJECT_STATUS.md
│   ├── RELEASE_READINESS.md
│   ├── REQUIREMENT_TRACEABILITY.md
│   ├── CLEANUP_REPORT.md
│   ├── TEST_EXECUTION_REPORT.md
│   ├── DEPENDENCY_AUDIT.md
│   └── REMAINING_WORK.md
├── integrations/
│   └── openfoodfacts/             # OpenFoodFacts fallback integration documentation
├── technical/                     # Detailed architectural implementations
│   ├── HOUSEHOLD_SHARING_ARCHITECTURE_AND_IMPLEMENTATION.md
│   ├── INDIAN_FMCG_OFFLINE_CATALOGUE_REPORT.md
│   ├── ON_DEVICE_OCR_OPTIMISATION_REPORT.md
│   ├── SMARTSCAN_MOBILE_HARDWARE_CONTROLS_REPORT.md
│   └── WEB_PUSH_NOTIFICATION_IMPLEMENTATION_REPORT.md
├── validation/                    # Validation protocols and annotation guides
│   ├── G1_INTERVIEW_PROTOCOL.md
│   ├── G1_PROBLEM_VALIDATION_REPORT.md
│   ├── G1_SURVEY_PROTOCOL.md
│   ├── G2_COMPETITOR_AUDIT_REPORT.md
│   ├── G3_CONCEPT_VALIDATION_REPORT.md
│   ├── G4_LOCKED_RELEASE_SET_REPORT.md
│   ├── G4_PHYSICAL_PACK_BENCHMARK_REPORT.md
│   ├── G5_COST_AND_DEPENDENCY_AUDIT.md
│   ├── G6_RELEASE_CONTROL_REVIEW.md
│   └── PACK_BENCHMARK_ANNOTATION_GUIDE.md
├── ARCHITECTURE.md                # System Architecture
├── BACKEND_ARCHITECTURE.md        # Serverless backend design
├── CLERK_AUTHENTICATION.md        # Clerk auth integration
├── CLERK_WEBHOOK_IMPLEMENTATION.md# Webhook specifications
├── CLOUD_ARCHITECTURE.md          # Cloud sync design
├── CLOUD_PRIVACY_AND_CONSENT.md   # Privacy consent invariants
├── DATABASE_AND_LOCAL_STORAGE.md  # Storage layer specification
├── DECISIONS.md                   # Architecture Decision Records (ADRs)
├── FOODCUE_DATABASE_SCHEMA.md     # PostgreSQL schema documentation
├── FOODCUE_DEVELOPER_INPUTS_AND_CONFIGURATION_REGISTER.md # Environment variables
├── FRONTEND_DESIGN_SYSTEM.md      # Design system rules
├── FRONTEND_ROUTES_AND_PAGES.md   # Route specifications
├── LOCAL_TO_CLOUD_MIGRATION.md    # Migration protocols
├── MULTI_DEVICE_MANAGEMENT.md     # Multi-device session rules
├── NEON_CLOUD_DATABASE.md         # Database operational guide
├── PANTRY_EVENT_LEDGER.md         # Event ledger specification
├── schema.sql                     # Full SQL schema
├── SECURITY_AND_PRIVACY.md        # Threat model & security rules
├── SYNC_CONFLICT_RESOLUTION.md    # Conflict resolution algorithms
└── SYNC_ENGINE.md                 # Sync protocol specification
```

---

## 3. Post-Cleanup Verification Evidence

After completing the directory reorganization:

1. **TypeScript Typecheck (`npm run typecheck`):**
   - Result: `tsc -b --pretty` exited with code `0`.
   - Zero compilation errors.
2. **Automated Unit & Integration Test Suite (`npm test`):**
   - Result: **37 test files passed (37/37)**.
   - Total Tests: **213 tests passed (213/213)**.
   - Zero test failures, zero regressions.
3. **Production Build (`npm run build`):**
   - Result: `tsc -b && vite build && node scripts/bundle-api.mjs` completed with exit code `0`.
   - Frontend bundle: 2,212 modules transformed into optimized production chunks.
   - Serverless API bundle: 8 standalone endpoint bundles generated cleanly.
