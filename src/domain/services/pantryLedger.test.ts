import { describe, expect, it } from "vitest";
import { appendPantryEvent, projectBalances } from "./pantryLedger";
import type { PantryEvent } from "../entities/pantry";

const event: PantryEvent = {
  eventId: "evt-1", itemId: "oats", eventType: "add", quantityDelta: 2, unit: "pack",
  occurredAt: "2026-11-16T10:00:00.000Z", createdAt: "2026-11-16T10:00:00.000Z",
  source: "manual", confirmation: true, schemaVersion: 1
};

describe("append-only pantry ledger", () => {
  it("appends confirmed events and projects balance", () => {
    const ledger = appendPantryEvent(event, []);
    expect(ledger).toHaveLength(1);
    expect(projectBalances(ledger)[0]?.quantity).toBe(2);
  });
  it("is idempotent for duplicate event IDs", () => {
    expect(appendPantryEvent(event, [event])).toHaveLength(1);
  });
  it("rejects zero or invalid quantity deltas", () => {
    expect(() => appendPantryEvent({ ...event, quantityDelta: 0 }, [])).toThrow();
  });
});
