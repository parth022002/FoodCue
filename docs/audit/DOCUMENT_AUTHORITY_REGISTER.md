# FoodCue — Document Authority Register & Specification Baseline

**Status:** ACTIVE CANONICAL BASELINE  
**Audit Date:** 17 November 2026  
**Auditor:** Principal Software Architect & QA Lead  
**Scope:** Specification Baseline, Document Hierarchy, Precedence Rules, and External Verification

---

## 1. Specification Precedence Hierarchy

In accordance with strict configuration management principles, all architectural decisions, feature implementations, and verification criteria in FoodCue are governed by the following strict hierarchy of authority. When a conflict exists between documents, the higher-ranking document controls without exception.

```
+-----------------------------------------------------------------------------------+
| RANK 1: Master Specification v13.5 (Final Controlled Baseline)                    |
| Controlling Product, Architectural, Engineering, Safety & Cryptographic Authority|
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
| RANK 2: Product Development Requirements (PRD) v1.3                               |
| Functional Scope, User Journeys, Acceptance Criteria, Operational Constraints     |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
| RANK 3: Validation Workbook v13.5 (Final Controlled Baseline)                     |
| Empirical Test Gates (G1-G6), Target Metrics, Gate Evidence Templates            |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
| RANK 4: Specialized Governance Standards                                          |
| - Security, Privacy and Safety Requirements v1.0                                  |
| - Brand Guidelines and Web Design System v1.0                                     |
| - Website Analysis and Design Reference v1.0                                      |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
| RANK 5: Internal Technical Architecture Specifications (in `docs/`)                |
| Component Architecture, DB Schemas, Sync Engine, Hardware Protocols, API Specs    |
+-----------------------------------------------------------------------------------+
```

---

## 2. Canonical Specifications Register

The table below catalogs all approved external and internal specifications controlling the FoodCue project, their location, version, hash/timestamp, and authority scope:

| Document Code | Canonical Document Title | Version | File Path / Location | Controlling Scope | Authority Status |
|---|---|---|---|---|---|
| **MS-13.5** | FoodCue Master Specification Final Controlled Baseline | v13.5 | `../Upload/FoodCue_Master_Specification_v13_5_Final_Controlled_Baseline.pdf` | System architecture, data flow, safety invariants, crypto verification, release criteria | **CONTROLLING AUTHORITY** |
| **PRD-1.3** | FoodCue Product Development Requirements | v1.3 | `../Upload/FoodCue_Product_Development_Requirements_v1_3.docx` | Product scope, functional specifications, non-functional requirements, milestones | **APPROVED** |
| **VW-13.5** | FoodCue Validation Workbook Final Controlled Baseline | v13.5 | `../Upload/FoodCue_Validation_Workbook_v13_5_Final_Controlled_Baseline.xlsx` | Release gates G1 through G6, benchmark structures, scorecard definitions | **APPROVED** |
| **SPS-1.0** | FoodCue Security, Privacy and Safety Requirements | v1.0 | `../Upload/FoodCue_Security_Privacy_and_Safety_Requirements_v1_0.docx` | OWASP ASVS compliance, food allergen rules, zero-token leaks, consent protocols | **APPROVED** |
| **BG-1.0** | FoodCue Brand Guidelines and Web Design System | v1.0 | `../Upload/FoodCue_Brand_Guidelines_and_Web_Design_System_v1_0.docx` | Typography, color palette, WCAG 2.1 AA tokens, responsive layout grid | **APPROVED** |
| **WAD-1.0** | FoodCue Website Analysis and Design Reference | v1.0 | `../Upload/FoodCue_Website_Analysis_and_Design_Reference_v1_0.docx` | Competitor evaluation, UI ergonomics, marketing page standards | **APPROVED** |
| **ARCH-SYS** | FoodCue System Architecture | v1.2 | `docs/ARCHITECTURE.md` | React 18, TypeScript, IndexedDB, local-first engine design | **APPROVED** |
| **ARCH-CLOUD**| FoodCue Cloud Architecture & Sync Engine | v1.2 | `docs/CLOUD_ARCHITECTURE.md`, `docs/SYNC_ENGINE.md` | Neon PostgreSQL, push/pull protocol, vector clock/device revisioning | **APPROVED** |
| **SEC-CLERK** | Clerk Webhook & Authentication Specification | v1.1 | `docs/CLERK_WEBHOOK_IMPLEMENTATION.md` | Svix signature validation, webhook secret rotation, user lifecycle sync | **APPROVED** |
| **DATA-SCHEMA**| FoodCue Database Schema Specification | v1.3 | `docs/FOODCUE_DATABASE_SCHEMA.md`, `docs/schema.sql` | PostgreSQL schema, indexes, multi-tenant household isolation, RLS rules | **APPROVED** |

---

## 3. Superseded Document Register

The following documents previously created during development or referenced in earlier iteration prompts have been formally superseded by the active canonical baseline:

| Superseded Document | Former Scope | Superseding Authority | Reason for Deprecation |
|---|---|---|---|
| Master Specification v13.4 | Specification baseline | Master Specification v13.5 | Updated release criteria, expanded FMCG scope, clarified offline invariants. |
| PRD v1.2 | Product requirements | PRD v1.3 | Refined household sharing, push notifications, and OpenFoodFacts fallback requirements. |
| Validation Workbook v13.4 | Validation metrics | Validation Workbook v13.5 | Fixed gate criteria formulas, expanded benchmark templates, added cohort trackers. |
| `docs/DEVELOPMENT_ROADMAP.md` | Historical step roadmap | `docs/audit/PROJECT_STATUS.md` & `REMAINING_WORK.md` | Outdated milestone checklist; superseded by post-Milestone 8 comprehensive status. |
| `docs/FOODCUE_DEVELOPMENT_CHECKLIST.md` | Interim step checklist | `docs/audit/PROJECT_STATUS.md` | Contains unverified assumptions from Step 6; superseded by audited evidence. |
| `docs/IMPLEMENTATION_STATUS.md` | Step 6 status report | `docs/audit/PROJECT_STATUS.md` | Replaced by full codebase audit after completion of Milestones 1–8 and Step 5 webhooks. |
| `docs/step-7/*` through `step-10/*` | Interim prompt-specific test reports | `docs/audit/*` | Archived into `docs/archive/historical-steps/` to eliminate repository clutter while preserving audit history. |

---

## 4. Conflict Resolution Protocol

Whenever an implementation detail is disputed:
1. The **Master Specification v13.5** clause takes precedence over PRD, workbook, and code comments.
2. In case of ambiguous food-safety rules (e.g. shelf-life calculation, allergen identification), the **fail-closed principle** applies: "Unknown is never assumed safe" (PRD-1.3 Section 4.2).
3. In case of cloud synchronization conflicts: local user unsynced edits must never be silently overwritten; the server operates as an append-only transaction ledger.
