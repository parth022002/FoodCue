/**
 * FoodCue Append-Only Pantry Event Ledger & Projection Engine (S1 Baseline)
 * Controlling Specification: Master Specification v13.5 §9.1 & PRD v1.3 §12
 * Invariant: Never overwrite historical events. Projections fold chronologically from event history.
 */

import type { LocationBalances, PantryBalance, PantryEvent, PantryLocation } from "../entities/pantry";

/**
 * Appends a verified, confirmed pantry event to the immutable ledger.
 * Throws explicit descriptive errors on invariant violations.
 */
export function appendPantryEvent(event: PantryEvent, ledger: PantryEvent[]): PantryEvent[] {
  // Invariant 1: Mandatory explicit user confirmation
  if (event.confirmation !== true) {
    throw new Error("Pantry events require explicit user confirmation (confirmation=true).");
  }

  // Invariant 2: Non-zero, finite quantity deltas
  if (!Number.isFinite(event.quantityDelta) || event.quantityDelta === 0) {
    throw new Error("Pantry quantity delta must be a finite, non-zero number.");
  }

  // Invariant 3: Required item reference and measurement unit
  if (!event.itemId || !event.itemId.trim()) {
    throw new Error("Pantry event must reference a valid non-empty itemId.");
  }

  if (!event.unit || !event.unit.trim()) {
    throw new Error("Pantry event must specify a valid measurement unit.");
  }

  // Invariant 4: Event idempotency on unique eventId
  if (ledger.some((existing) => existing.eventId === event.eventId)) {
    return ledger; // Idempotent return without duplicate appending
  }

  // Invariant 5: Negative resulting balance prevention for consumption/discard
  if (event.eventType === "consume" || event.eventType === "discard") {
    const currentBalances = projectBalances(ledger);
    const itemBalance = currentBalances.find((b) => b.itemId === event.itemId);
    const currentQty = itemBalance ? itemBalance.quantity : 0;
    const requestedDeduction = Math.abs(event.quantityDelta);

    if (currentQty - requestedDeduction < 0) {
      throw new Error(
        `Insufficient stock: Cannot deduct ${requestedDeduction} ${event.unit}. Current balance is ${currentQty} ${event.unit}.`
      );
    }
  }

  return [...ledger, event];
}

/**
 * Creates a compensating event to undo a prior target event.
 * Reverses the quantity delta while preserving the historical event trail.
 */
export function createCompensatingUndoEvent(
  targetEventId: string,
  ledger: PantryEvent[],
  note?: string
): PantryEvent {
  const targetEvent = ledger.find((e) => e.eventId === targetEventId);
  if (!targetEvent) {
    throw new Error(`Cannot undo: Event '${targetEventId}' was not found in the pantry ledger.`);
  }

  // Prevent undoing an undo event
  if (targetEvent.eventType === "undo") {
    throw new Error("Cannot undo an undo event. Re-enter the desired action instead.");
  }

  // Prevent duplicate undo of the same event
  const alreadyUndone = ledger.some(
    (e) => e.eventType === "undo" && e.targetEventId === targetEventId
  );
  if (alreadyUndone) {
    throw new Error(`Event '${targetEventId}' has already been reversed by a compensating undo event.`);
  }

  return {
    eventId: `undo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    itemId: targetEvent.itemId,
    eventType: "undo",
    quantityDelta: -targetEvent.quantityDelta,
    unit: targetEvent.unit,
    location: targetEvent.location,
    dateType: targetEvent.dateType,
    dateValue: targetEvent.dateValue,
    occurredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    source: "undo",
    confirmation: true,
    targetEventId: targetEvent.eventId,
    note: note ?? `Compensating undo for ${targetEvent.eventType} event (${targetEvent.eventId})`,
    schemaVersion: 1
  };
}

/**
 * Derives current inventory balances by folding the append-only event ledger.
 * Projections are strictly mathematical derivatives of event history.
 */
export function projectBalances(events: PantryEvent[]): PantryBalance[] {
  const balanceMap = new Map<string, {
    quantity: number;
    unit: string;
    locations: LocationBalances;
    stockedIn: number;
    consumed: number;
    discarded: number;
    lastActivityAt: string;
  }>();

  // Sort events chronologically to guarantee deterministic fold order
  const sorted = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  for (const event of sorted) {
    const existing = balanceMap.get(event.itemId) ?? {
      quantity: 0,
      unit: event.unit,
      locations: { pantry: 0, fridge: 0, freezer: 0, use_soon: 0 },
      stockedIn: 0,
      consumed: 0,
      discarded: 0,
      lastActivityAt: event.occurredAt
    };

    // If unit differs, skip or separate to avoid unit mismatch errors
    if (existing.unit !== event.unit) {
      continue;
    }

    existing.quantity += event.quantityDelta;
    existing.lastActivityAt = event.occurredAt;

    // Track metrics by event type
    if (event.quantityDelta > 0) {
      existing.stockedIn += event.quantityDelta;
    } else if (event.eventType === "consume") {
      existing.consumed += Math.abs(event.quantityDelta);
    } else if (event.eventType === "discard") {
      existing.discarded += Math.abs(event.quantityDelta);
    }

    // Update location breakdown
    const loc: PantryLocation = event.location ?? "pantry";
    if (loc in existing.locations) {
      existing.locations[loc] = Math.max(0, existing.locations[loc] + event.quantityDelta);
    }

    balanceMap.set(event.itemId, existing);
  }

  const results: PantryBalance[] = [];
  for (const [itemId, data] of balanceMap.entries()) {
    results.push({
      itemId,
      quantity: Math.max(0, data.quantity), // Safeguard non-negative display
      unit: data.unit,
      locationBalances: data.locations,
      totalStockedIn: data.stockedIn,
      totalConsumed: data.consumed,
      totalDiscarded: data.discarded,
      lastActivityAt: data.lastActivityAt
    });
  }

  return results;
}

/**
 * Reconstructs the complete projection from zero event history
 */
export function reconstructBalances(events: PantryEvent[]): PantryBalance[] {
  return projectBalances(events);
}
