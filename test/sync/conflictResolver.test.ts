import { describe, it, expect } from "vitest";
import { conflictResolver, type ShoppingItemPayload } from "../../src/sync/reconciliation/conflictResolver";
import type { PantryEvent } from "../../src/domain/entities/pantry";

describe("Deterministic Conflict Resolver", () => {
  describe("mergePantryEvents (Append-Only Event Ledger)", () => {
    it("merges remote events into local events idempotently and preserves chronological order", () => {
      const localEvents: PantryEvent[] = [
        {
          eventId: "ev_1",
          itemId: "item_milk",
          eventType: "intake",
          quantityDelta: 1,
          unit: "pack",
          occurredAt: "2026-11-17T10:00:00.000Z",
          createdAt: "2026-11-17T10:00:00.000Z",
          source: "user_action"
        }
      ];

      const remoteEvents: PantryEvent[] = [
        // Duplicate event
        {
          eventId: "ev_1",
          itemId: "item_milk",
          eventType: "intake",
          quantityDelta: 1,
          unit: "pack",
          occurredAt: "2026-11-17T10:00:00.000Z",
          createdAt: "2026-11-17T10:00:00.000Z",
          source: "user_action"
        },
        // New consume event from another device
        {
          eventId: "ev_2",
          itemId: "item_milk",
          eventType: "consume",
          quantityDelta: -1,
          unit: "pack",
          occurredAt: "2026-11-17T10:30:00.000Z",
          createdAt: "2026-11-17T10:30:00.000Z",
          source: "user_action"
        }
      ];

      const result = conflictResolver.mergePantryEvents(localEvents, remoteEvents);

      expect(result.addedEvents).toHaveLength(1);
      expect(result.addedEvents[0].eventId).toBe("ev_2");
      expect(result.totalEvents).toBe(2);
    });
  });

  describe("mergeShoppingItems (Last-Write-Wins with Tombstones)", () => {
    it("updates local item when remote item has newer timestamp", () => {
      const localItems: ShoppingItemPayload[] = [
        {
          listItemId: "shop_1",
          productName: "Oat Milk",
          requestedQuantity: 1,
          unit: "pack",
          checked: false,
          updatedAt: "2026-11-17T09:00:00.000Z"
        }
      ];

      const remoteItems: ShoppingItemPayload[] = [
        {
          listItemId: "shop_1",
          productName: "Oat Milk (Barista)",
          requestedQuantity: 2,
          unit: "pack",
          checked: true,
          updatedAt: "2026-11-17T10:00:00.000Z"
        }
      ];

      const merged = conflictResolver.mergeShoppingItems(localItems, remoteItems);
      expect(merged).toHaveLength(1);
      expect(merged[0].productName).toBe("Oat Milk (Barista)");
      expect(merged[0].requestedQuantity).toBe(2);
      expect(merged[0].checked).toBe(true);
    });

    it("applies deletion tombstone when remote delete is newer", () => {
      const localItems: ShoppingItemPayload[] = [
        {
          listItemId: "shop_2",
          productName: "Bread",
          requestedQuantity: 1,
          unit: "pack",
          checked: false,
          updatedAt: "2026-11-17T09:00:00.000Z"
        }
      ];

      const remoteItems: ShoppingItemPayload[] = [
        {
          listItemId: "shop_2",
          productName: "Bread",
          requestedQuantity: 1,
          unit: "pack",
          checked: false,
          updatedAt: "2026-11-17T10:00:00.000Z",
          isDeleted: true
        }
      ];

      const merged = conflictResolver.mergeShoppingItems(localItems, remoteItems);
      expect(merged).toHaveLength(0); // Successfully removed
    });
  });

  describe("mergeAvoidLists (Safety-First Union)", () => {
    it("creates a case-insensitive union of allergens/ingredients to avoid", () => {
      const localAvoid = ["Peanuts", "Gluten"];
      const remoteAvoid = ["peanuts", "Soy", "Shellfish"];

      const merged = conflictResolver.mergeAvoidLists(localAvoid, remoteAvoid);

      expect(merged).toEqual(["gluten", "peanuts", "shellfish", "soy"]);
    });
  });
});
