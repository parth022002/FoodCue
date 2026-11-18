# FoodCue — Technical Architecture Decision Records (ADRs)

This document captures the key architectural decisions, rationale, trade-offs, and compliance considerations made during the engineering of FoodCue.

---

## ADR-001: Local-First IndexedDB as Primary Source of Truth
- **Status:** Accepted & Implemented
- **Context:** Food shopping and kitchen management frequently occur in low-connectivity environments (basement grocery stores, remote kitchens). Forcing round-trip network authentication on every scan creates unacceptable latency and churn.
- **Decision:** Build FoodCue as a Local-First PWA using **Dexie.js (IndexedDB)**. Every feature (barcode scanning, health scoring, pantry inventory, avoid-list checks) executes 100% locally.
- **Consequences:**
  - *Positive:* Sub-10ms UI interactions, zero network dependencies for core features, full offline resilience.
  - *Trade-off:* Requires an offline sync queue and deterministic conflict resolution when synchronizing with cloud persistence.

---

## ADR-002: Neon Serverless PostgreSQL for Cloud Persistence
- **Status:** Accepted & Implemented
- **Context:** Cloud persistence is needed for multi-device sync and family household collaboration under a strict **INR 0.00 cash budget**.
- **Decision:** Utilize **Neon Serverless PostgreSQL** with both pooled connections (pgBouncer on port 6543 for Vercel Serverless Functions) and direct unpooled connections (port 5432 for DDL schema migrations).
- **Consequences:**
  - *Positive:* Generous free tier (0.5 GiB, serverless branching, auto-suspend), standard relational integrity, full SQL capability.
  - *Trade-off:* Cold start latency on unpooled compute; mitigated by using `@neondatabase/serverless` over WebSockets/HTTPS.

---

## ADR-003: Clerk Organizations for Multi-Tenant Family Kitchen Sharing
- **Status:** Accepted & Implemented
- **Context:** Multiple family members need to manage the same pantry inventory and shopping list without sharing personal credentials.
- **Decision:** Map each FoodCue **Household** to a **Clerk Organization**.
- **Consequences:**
  - *Positive:* Out-of-the-box invitation flows, role management (admin/member), user session management, zero custom auth plumbing.
  - *Trade-off:* Serverless endpoints must verify the active organization token (`org_id`) on all mutative requests to enforce strict tenant isolation.

---

## ADR-004: Event-Sourced Pantry Ledger with Vector Clocks
- **Status:** Accepted & Implemented
- **Context:** Multiple household members may update pantry items simultaneously while offline. Direct table overwrite results in lost updates and race conditions.
- **Decision:** Model the pantry as an append-only event ledger (`pantryLedger.ts`) with vector clock tracking and deterministic Last-Write-Wins (LWW) tie-breaking.
- **Consequences:**
  - *Positive:* Mathematical convergence across devices, full audit trail, undo/redo capabilities, clean event replay.
  - *Trade-off:* Periodic snapshot compaction required to keep projected state memory-efficient.

---

## ADR-005: Deterministic Food Safety & Anti-Hallucination Guardrails
- **Status:** Accepted & Implemented
- **Context:** Generative AI models frequently hallucinate dietary information (e.g., claiming a product is gluten-free when ingredients list barley malt).
- **Decision:** Generative LLMs are strictly forbidden from making food safety claims or fabricating nutrient values.
- **Consequences:**
  - *Positive:* 100% reproducible health scoring (0–100) based on verified mathematical formulas; missing nutrients preserved as `null`.
  - *Trade-off:* Missing data requires fallback searches (Open Food Facts, Tavily) or manual user label confirmation rather than generative inference.

---

## ADR-006: Zero Camera Image Retention
- **Status:** Accepted & Implemented
- **Context:** Capturing food packaging and barcodes involves accessing the user's camera stream. Transmitting or storing pictures of users' pantries presents severe privacy and regulatory risks (India DPDP Act, GDPR).
- **Decision:** All camera frames are processed in-memory via ephemeral HTML5 Canvas elements in client RAM and immediately garbage collected. **No images are ever transmitted or saved to disk/cloud.**
- **Consequences:**
  - *Positive:* Absolute user privacy, zero cloud storage costs, zero risk of data leaks from image databases.
  - *Trade-off:* Cloud-based heavy OCR models cannot be used; optical recognition must run locally via on-device Tesseract Web Workers or assistive LLM text-only transcription.
