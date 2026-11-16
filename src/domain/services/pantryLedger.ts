import type { PantryBalance, PantryEvent } from "../entities/pantry";

export function appendPantryEvent(event: PantryEvent, ledger: PantryEvent[]): PantryEvent[] {
  if (event.confirmation !== true) throw new Error("Pantry events require explicit user confirmation.");
  if (!Number.isFinite(event.quantityDelta) || event.quantityDelta === 0) {
    throw new Error("Pantry quantity delta must be finite and non-zero.");
  }
  if (!event.itemId.trim() || !event.unit.trim()) throw new Error("Pantry item and unit are required.");
  if (ledger.some((existing) => existing.eventId === event.eventId)) return ledger;
  return [...ledger, event];
}

export function projectBalances(events: PantryEvent[]): PantryBalance[] {
  const map = new Map<string, PantryBalance>();
  for (const event of events) {
    const current = map.get(event.itemId) ?? { itemId: event.itemId, quantity: 0, unit: event.unit };
    if (current.unit !== event.unit) continue;
    current.quantity += event.quantityDelta;
    map.set(event.itemId, current);
  }
  return [...map.values()];
}
