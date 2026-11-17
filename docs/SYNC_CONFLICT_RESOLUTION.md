# FoodCue Synchronization Conflict Resolution Specification

```text
========================================================================================
MODULE:                Deterministic Conflict Resolution
SPECIFICATION:         FoodCue Master Specification v13.5 §12.5
SECURITY LEVEL:        Critical (Prevents Data Overwrites & Ensures Food Safety Avoidance)
COMPONENTS:            src/sync/reconciliation/conflictResolver.ts
========================================================================================
```

---

## 1. Conflict Resolution Philosophy

In distributed multi-device applications, network partitions and concurrent offline edits inevitably produce conflicting state. FoodCue classifies application data into three distinct entity tiers, each governed by a purpose-built conflict resolution algorithm:

| Entity Tier | Conflict Strategy | Rationale |
|---|---|---|
| **Pantry Events** | **Append-Only Event Merging** | Historical intake and consumption events are immutable facts; inventory balances must be derived, never directly overwritten |
| **Shopping List Items** | **Last-Write-Wins (LWW) with Tombstones** | Items are mutable list entries; the latest user action across devices represents the desired state |
| **Dietary Avoid-Lists** | **Safety-First Union** | Allergen and ingredient avoidance must never be silently discarded; any avoided item on any device remains avoided |
| **Confirmed Labels** | **Content-Hash Immutable Snapshots** | A confirmed physical pack label is an audit record; duplicates are ignored via idempotency |

---

## 2. Append-Only Pantry Event Merging

When Device A and Device B both record pantry operations offline:
- Device A consumes 1 bottle of Milk at 10:15 AM (`eventId: ev_a`).
- Device B adds 2 bottles of Milk at 10:20 AM (`eventId: ev_b`).

Both events are preserved:
1. `conflictResolver.mergePantryEvents(local, remote)` accepts both event streams.
2. Duplicate event IDs are dropped idempotently.
3. The merged stream is sorted chronologically by `occurredAt`.
4. The projected stock balance is re-calculated deterministically by `pantryLedger`:
   $$\text{Current Balance} = \sum \Delta Q_i$$
5. Zero events are lost; audit history remains completely intact.

---

## 3. Last-Write-Wins (LWW) with Deletion Tombstones

For mutable items (e.g., items on the Smart Shopping List):
- Each entity maintains an `updatedAt` ISO timestamp.
- When merging, if the remote timestamp is greater than or equal to the local timestamp, the remote version replaces the local version.
- **Deletions:** When an item is deleted, a tombstone record with `isDeleted: true` is transmitted. If the tombstone timestamp is newer than the item's creation, the item is removed cleanly from the list.

---

## 4. Safety-First Avoid-List Union

Allergen avoidance directly impacts human health. If User A adds "Peanuts" on their smartphone and User B adds "Shellfish" on their tablet:
- A simple Last-Write-Wins would risk overwriting "Peanuts" with "Shellfish", exposing User A to anaphylaxis risk.
- **FoodCue Rule:** `mergeAvoidLists` performs a case-insensitive mathematical set union:
  $$\text{Merged Avoid List} = \text{Local Avoid List} \cup \text{Remote Avoid List}$$
- Peanuts and Shellfish are both maintained in the combined avoid-list.
