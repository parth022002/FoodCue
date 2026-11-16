import { describe, expect, it } from "vitest";
import {
  appendPantryEvent,
  createCompensatingUndoEvent,
  projectBalances,
  reconstructBalances
} from "./pantryLedger";
import type { PantryEvent } from "../entities/pantry";

const sampleEvent: PantryEvent = {
  eventId: "evt-1",
  itemId: "oats",
  eventType: "add",
  quantityDelta: 2,
  unit: "pack",
  location: "pantry",
  occurredAt: "2026-11-16T10:00:00.000Z",
  createdAt: "2026-11-16T10:00:00.000Z",
  source: "manual",
  confirmation: true,
  schemaVersion: 1
};

describe("append-only pantry ledger & event sourcing (S1)", () => {
  it("appends confirmed events and projects balances correctly", () => {
    const ledger = appendPantryEvent(sampleEvent, []);
    expect(ledger).toHaveLength(1);
    const balances = projectBalances(ledger);
    expect(balances[0]?.quantity).toBe(2);
    expect(balances[0]?.locationBalances?.pantry).toBe(2);
    expect(balances[0]?.totalStockedIn).toBe(2);
  });

  it("is idempotent for duplicate event IDs", () => {
    const ledger = appendPantryEvent(sampleEvent, [sampleEvent]);
    expect(ledger).toHaveLength(1);
  });

  it("rejects zero or non-finite quantity deltas", () => {
    expect(() => appendPantryEvent({ ...sampleEvent, quantityDelta: 0 }, [])).toThrow(
      /must be a finite, non-zero number/
    );
    expect(() => appendPantryEvent({ ...sampleEvent, quantityDelta: NaN }, [])).toThrow(
      /must be a finite, non-zero number/
    );
  });

  it("rejects unconfirmed events (confirmation !== true)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => appendPantryEvent({ ...sampleEvent, confirmation: false as any }, [])).toThrow(
      /require explicit user confirmation/
    );
  });

  it("prevents consumption that would result in negative stock balance", () => {
    const consumeEvent: PantryEvent = {
      ...sampleEvent,
      eventId: "evt-consume-excess",
      eventType: "consume",
      quantityDelta: -5
    };
    expect(() => appendPantryEvent(consumeEvent, [sampleEvent])).toThrow(
      /Insufficient stock/
    );
  });

  it("creates a valid compensating undo event that reverses stock balance", () => {
    const consumeEvent: PantryEvent = {
      ...sampleEvent,
      eventId: "evt-consume",
      eventType: "consume",
      quantityDelta: -1,
      occurredAt: "2026-11-16T11:00:00.000Z"
    };

    let ledger = appendPantryEvent(sampleEvent, []);
    ledger = appendPantryEvent(consumeEvent, ledger);
    expect(projectBalances(ledger)[0]?.quantity).toBe(1);

    // Create undo compensating event
    const undoEvent = createCompensatingUndoEvent("evt-consume", ledger);
    expect(undoEvent.quantityDelta).toBe(1);
    expect(undoEvent.targetEventId).toBe("evt-consume");
    expect(undoEvent.source).toBe("undo");

    // Append undo event to ledger
    ledger = appendPantryEvent(undoEvent, ledger);
    expect(ledger).toHaveLength(3); // Historical events are preserved!
    expect(projectBalances(ledger)[0]?.quantity).toBe(2); // Balance restored
  });

  it("blocks duplicate undo of the same event", () => {
    const consumeEvent: PantryEvent = {
      ...sampleEvent,
      eventId: "evt-consume-2",
      eventType: "consume",
      quantityDelta: -1
    };
    let ledger = appendPantryEvent(sampleEvent, []);
    ledger = appendPantryEvent(consumeEvent, ledger);

    const undo1 = createCompensatingUndoEvent("evt-consume-2", ledger);
    ledger = appendPantryEvent(undo1, ledger);

    expect(() => createCompensatingUndoEvent("evt-consume-2", ledger)).toThrow(
      /already been reversed/
    );
  });

  it("reconstructs projections accurately from chronological event history", () => {
    const events: PantryEvent[] = [
      { ...sampleEvent, eventId: "e1", quantityDelta: 5, occurredAt: "2026-11-16T08:00:00Z" },
      { ...sampleEvent, eventId: "e2", eventType: "consume", quantityDelta: -2, occurredAt: "2026-11-16T12:00:00Z" },
      { ...sampleEvent, eventId: "e3", eventType: "discard", quantityDelta: -1, occurredAt: "2026-11-16T15:00:00Z" }
    ];

    const balances = reconstructBalances(events);
    expect(balances[0]?.quantity).toBe(2);
    expect(balances[0]?.totalStockedIn).toBe(5);
    expect(balances[0]?.totalConsumed).toBe(2);
    expect(balances[0]?.totalDiscarded).toBe(1);
  });
});
