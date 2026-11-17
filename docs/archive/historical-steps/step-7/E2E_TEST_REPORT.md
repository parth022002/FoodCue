# FoodCue Step 7 End-to-End User Journeys Report

**Document Version:** 1.0.0  
**Project:** FoodCue (Packaged Food Intelligence & Kitchen Management PWA)  
**Parent Specification:** FoodCue Master Specification v13.5 §11.1 & §18  
**Test Suite Reference:** `test/e2e/userJourneys.test.ts`  
**Status:** **6 / 6 JOURNEYS PASSED (100%)**

---

## 1. User Journey Execution Summary

The 6 mandatory end-to-end user journeys defined in Section 11.1 of the Step 7 Master Implementation Prompt were codified into automated end-to-end tests and executed against local IndexedDB and domain services.

```text
 ✓ test/e2e/userJourneys.test.ts (6 tests) 166ms
   ✓ Journey A: Local-First User operates kitchen and food intelligence entirely offline
   ✓ Journey B: Signing in preserves local-first mode until explicit migration consent
   ✓ Journey C: Offline mutations are queued safely and flush upon reconnection
   ✓ Journey D: Multi-device conflicts resolve deterministically using domain rules
   ✓ Journey E: Disabling cloud sync pauses uploads without erasing local records
   ✓ Journey F: Unconfirmed candidates cannot bypass ConfirmedLabel safety boundaries
```

---

## 2. Detailed Journey Findings & Evidence

### Journey A — Local-First User
- **Precondition:** User accesses FoodCue on a fresh device without signing in.
- **Actions:**
  1. Product identified via GTIN `8901719101037` (Parle-G).
  2. Physical pack label confirmed with all 3 required panels (`ingredients`, `allergen_declaration`, `nutrition`).
  3. Deterministic food intelligence generates allergen review (`Gluten`: declared contains, `Milk`: declared contains, `Sulphites`: listed in ingredients via INS 223).
  4. Item added to pantry event ledger with location `Pantry` and Best-Before date `2027-01-01`.
  5. Shopping item added to persistent store.
  6. Reload simulation: Database reopened and records queried.
- **Evidence:** Confirmed labels (1), pantry events (1), shopping items (5, including 4 seeded staples) verified intact in IndexedDB.
- **Verdict:** **PASS**

### Journey B — Account Creation & Explicit Cloud Activation
- **Precondition:** User has pre-existing local records in IndexedDB.
- **Actions:**
  1. User authenticates via Clerk OAuth / Email.
  2. Initial check verifies `syncMetadata.cloudSyncEnabled === false`. Zero data transmitted.
  3. User launches 7-Step Migration Wizard, reviews data scope and checks explicit consent.
  4. User confirms migration; state updates to `cloudSyncEnabled = true`.
- **Evidence:** Cloud sync remains inactive until explicit confirmation; migration updates sync authorization.
- **Verdict:** **PASS**

### Journey C — Offline Resilience & Queue Flush
- **Precondition:** User is signed in with cloud sync enabled.
- **Actions:**
  1. Offline state simulated.
  2. 2 mutations enqueued (`pantry_event` consume and `shopping_item` create).
  3. Pending count reaches 2 in `localChangeQueue`.
  4. Online event triggered: `peekBatch()` delivers both operations.
  5. Operations acknowledged via `markCompleted()`; pending count drops to 0.
- **Evidence:** Zero dropped mutations; persistent queue recovers gracefully.
- **Verdict:** **PASS**

### Journey D — Multi-Device Conflict Resolution
- **Actions:**
  1. Shopping item updated to `isPurchased: false` at `10:00:00` on Device A, and `isPurchased: true` at `10:05:00` on Device B.
  2. Conflict resolver applies Last-Write-Wins (LWW) with deletion tombstones; resolved item has `isPurchased: true`.
  3. Avoid list on Device A (`Peanuts, Soy`) merged with Device B (`Peanuts, Gluten`).
- **Evidence:** Avoid list merges to `['gluten', 'peanuts', 'soy']` (safety-first union).
- **Verdict:** **PASS**

### Journey E — Disabling Cloud Sync & Account Data Retention
- **Actions:**
  1. Authenticated user pauses/disables cloud sync in Privacy Center.
  2. `syncMetadata.setCloudSyncEnabled(false)` executed.
- **Evidence:** Local IndexedDB records (`Basmati Rice`) remain 100% accessible; zero local data deleted.
- **Verdict:** **PASS**

### Journey F — SmartScan Uncertainty & Evidence Integrity
- **Actions:**
  1. Attempted to confirm candidate with unresolved packaging conflicts. Throws `ConfirmationError` ("Resolve product identity conflicts before confirmation").
  2. Attempted to confirm candidate with missing required panels (`allergen_declaration`, `nutrition`). Throws `ConfirmationError` ("Required critical label panels and field confirmations are incomplete").
- **Evidence:** Unconfirmed products cannot bypass safety checks.
- **Verdict:** **PASS**
