# FoodCue Append-Only Pantry Event Ledger Specification
**Phase 1 (S1 – Local Data) Event Sourcing Engine & Ledger Invariants**

```text
========================================================================================
PROJECT:               FoodCue (Working Brand; Formerly SafeWise AI)
DOCUMENT TITLE:        Pantry Event Ledger & Projection Specification
DOCUMENT VERSION:      v1.0 (Phase 1 / S1 Baseline Complete)
DATE:                  16 November 2026
PARENT SPECIFICATION:  FoodCue Master Specification v13.5 §9.1 & §30.3
PRODUCT SPECIFICATION: FoodCue Product Development Requirements Document (PRD) v1.3 §12
STATUS:                Production Implementation Verified (8/8 Ledger Tests Passing)
========================================================================================
```

---

## 1. Event Sourcing Philosophy

Traditional inventory systems store a mutable `current_quantity` integer and overwrite it on every update. This creates fatal risks: race conditions, untracked stock shrinkage, corrupted balances, and impossible undo operations.

FoodCue adopts a **strict append-only event sourcing model**:
- **The Event Ledger is the Sole Source of Truth:** Every change in inventory is recorded as an immutable, timestamped `PantryEvent`.
- **Current Balances are Projections:** Current pantry stock is calculated dynamically by folding event history chronologically (`projectBalances(events)`).
- **History is Never Overwritten or Deleted:** Historical events are permanent. Mistakes are corrected by appending **compensating events**.

---

## 2. Enumerated Event Types

| Event Type | Quantity Delta (`quantityDelta`) | Typical Trigger | Effect on Total Stock |
|---|---|---|---|
| `add` | Positive (`+N`) | Grocery shopping intake / Unpack mode | Increases stock |
| `consume` | Negative (`-N`) | Cooking, eating, household use | Decreases stock |
| `discard` | Negative (`-N`) | Spoiled food, broken pack, contamination | Decreases stock; tracked as waste |
| `move` | Zero net (`0`) or location transfer | Moving pack from Freezer to Fridge | Preserves total stock; shifts location |
| `adjust` | Positive or Negative (`±N`) | Physical inventory count reconciliation | Reconciles stock discrepancy |
| `correction` | Positive or Negative (`±N`) | Correcting an accidental entry typo | Adjusts balance with audit note |
| `undo` | Inverse of target (`-targetDelta`) | Clicking "Undo" on an action | Exactly reverses a prior event |
| `import` | Positive (`+N`) | Restoring pantry events from backup file | Ingests historical events idempotently |

---

## 3. Pantry Event Data Schema

```typescript
export interface PantryEvent {
  eventId: string;           // Unique UUID/nanoid identifier
  itemId: string;            // Product/staple identifier (e.g. "parle_g", "milk")
  eventType: PantryEventType;// "add" | "consume" | "adjust" | "move" | "discard" | "correction" | "undo" | "import"
  quantityDelta: number;     // Finite, non-zero number (e.g. +2, -1)
  unit: string;              // "pack", "litre", "kg", "g", "bottle"
  location?: PantryLocation; // "pantry" | "fridge" | "freezer" | "use_soon"
  dateType?: PantryDateType; // "best_before" | "use_by" | "expiry" | "date_of_mfg"
  dateValue?: string;        // Printed or entered date string (e.g. "2026-12-31")
  occurredAt: string;        // ISO 8601 timestamp of when action occurred
  createdAt: string;         // ISO 8601 timestamp of record creation
  source: "manual" | "confirmed_label" | "import" | "undo";
  confirmation: true;        // Invariant: Must always be explicitly true
  targetEventId?: string;    // References original event if this is an undo
  note?: string;             // Optional user context or reason
  schemaVersion: 1;          // Event schema version
}
```

---

## 4. The 10 Invariant Ledger Rules

1. **Rule 1: Historical Immutability**  
   Once written to IndexedDB, an event is permanent. The system contains no SQL `UPDATE` or `DELETE` path for historical events.
2. **Rule 2: Compensating Corrections**  
   If a user records 5 packs instead of 3, the system does not edit the original event; it appends a `correction` event with `quantityDelta: -2`.
3. **Rule 3: Structured Compensating Undo**  
   Clicking "Undo" creates a new event with `eventType: "undo"`, `quantityDelta: -original.quantityDelta`, and `targetEventId: original.eventId`.
4. **Rule 4: Mandatory User Confirmation**  
   Every event requires `confirmation === true`. Automated background writes without user review are rejected at runtime.
5. **Rule 5: Non-Zero Finite Deltas**  
   `quantityDelta` must be a valid, finite number and cannot be zero (`quantityDelta !== 0`).
6. **Rule 6: Movement Conservation**  
   Moving an item between locations (e.g., from Freezer to Fridge) does not change the aggregate item quantity.
7. **Rule 7: Negative Balance Prevention**  
   The system blocks consumption or discard events that would drop the current balance below zero (`currentQuantity - deduction < 0`).
8. **Rule 8: Transactional Integrity**  
   Event writes are committed in an atomic readwrite transaction; incomplete event pairs are rolled back.
9. **Rule 9: Inspectable Audit Trail**  
   The complete event log is accessible in the "Pantry Audit Ledger" UI drawer with full timestamps, deltas, and notes.
10. **Rule 10: Mathematical Projection Derivation**  
    Stock balances are strictly deterministic projections folded chronologically from the event sequence.

---

## 5. Projection & Reconstruction Engine

The projection function (`projectBalances(events)`) processes event history in ascending chronological order:

```typescript
export interface LocationBalances {
  pantry: number;
  fridge: number;
  freezer: number;
  use_soon: number;
}

export interface PantryBalance {
  itemId: string;
  quantity: number;
  unit: string;
  locationBalances?: LocationBalances;
  totalStockedIn?: number;
  totalConsumed?: number;
  totalDiscarded?: number;
  lastActivityAt?: string;
}
```

### Complete Projection Reconstruction
If local storage is suspected of inconsistency, `reconstructBalances(events)` discards all cached numbers and replays the entire event history from event 0, guaranteeing mathematical consistency.

---

## 6. Compensating Undo Architecture

When a user mistakenly consumes or adds an item, `createCompensatingUndoEvent()` constructs the exact inverse event:

```text
Original Event:      [eventId: "evt_101", eventType: "consume", delta: -1, item: "milk"]
                              │
                    (User clicks "Undo")
                              │
Compensating Event:  [eventId: "undo_202", eventType: "undo", delta: +1, targetEventId: "evt_101"]
```

### Safety Guards Against Undo Abuse
- **No Duplicate Undo:** An event can only be undone once. If `targetEventId` is already referenced by an existing `undo` event, the action is rejected.
- **No Undo of an Undo:** An `undo` event cannot be undone. Users must re-enter the desired action to maintain a clean linear ledger.

---

```text
========================================================================================
END OF PANTRY EVENT LEDGER SPECIFICATION (v1.0)
========================================================================================
```
