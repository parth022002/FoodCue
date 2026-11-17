/**
 * FoodCue Deterministic Conflict Resolver
 * Implements merge algorithms for append-only events, LWW entities, and safety-first avoid lists.
 * Controlling Authority: FoodCue Master Specification v13.5 §12.5
 */

import type { PantryEvent } from "../../domain/entities/pantry";
import type { ConfirmedLabel } from "../../domain/entities/food";

export interface ReconciledPantryResult {
  addedEvents: PantryEvent[];
  totalEvents: number;
}

export interface ShoppingItemPayload {
  listItemId: string;
  productName: string;
  brand?: string;
  category?: string;
  requestedQuantity: number;
  unit: string;
  checked: boolean;
  updatedAt: string;
  isDeleted?: boolean;
}

export const conflictResolver = {
  /**
   * Merges incoming remote pantry events into the local event list.
   * Ensures idempotency: duplicate event IDs are rejected.
   * Preserves chronological order by occurredAt.
   */
  mergePantryEvents(
    localEvents: PantryEvent[],
    remoteEvents: PantryEvent[]
  ): ReconciledPantryResult {
    const existingIds = new Set(localEvents.map((e) => e.eventId));
    const addedEvents: PantryEvent[] = [];

    for (const remote of remoteEvents) {
      if (!existingIds.has(remote.eventId)) {
        addedEvents.push(remote);
        existingIds.add(remote.eventId);
      }
    }

    const merged = [...localEvents, ...addedEvents].sort(
      (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );

    return {
      addedEvents,
      totalEvents: merged.length
    };
  },

  /**
   * Merges shopping list items using Last-Write-Wins (LWW) based on updatedAt.
   * Handles deletion tombstones.
   */
  mergeShoppingItems(
    localItems: ShoppingItemPayload[],
    remoteItems: ShoppingItemPayload[]
  ): ShoppingItemPayload[] {
    const itemMap = new Map<string, ShoppingItemPayload>();

    for (const item of localItems) {
      itemMap.set(item.listItemId, item);
    }

    for (const remote of remoteItems) {
      const local = itemMap.get(remote.listItemId);
      if (!local) {
        if (!remote.isDeleted) {
          itemMap.set(remote.listItemId, remote);
        }
      } else {
        const localTime = new Date(local.updatedAt).getTime();
        const remoteTime = new Date(remote.updatedAt).getTime();

        if (remoteTime >= localTime) {
          if (remote.isDeleted) {
            itemMap.delete(remote.listItemId);
          } else {
            itemMap.set(remote.listItemId, remote);
          }
        }
      }
    }

    return Array.from(itemMap.values());
  },

  /**
   * Merges dietary avoid-lists using Safety-First Union.
   * If an allergen or ingredient was avoided on any device, it remains avoided.
   */
  mergeAvoidLists(localList: string[], remoteList: string[]): string[] {
    const set = new Set<string>();
    for (const item of localList) {
      if (item && item.trim()) set.add(item.trim().toLowerCase());
    }
    for (const item of remoteList) {
      if (item && item.trim()) set.add(item.trim().toLowerCase());
    }
    return Array.from(set).sort();
  },

  /**
   * Merges confirmed packaging label verifications.
   * Labels are immutable audit records keyed by confirmedLabelId.
   */
  mergeConfirmedLabels(
    localLabels: ConfirmedLabel[],
    remoteLabels: ConfirmedLabel[]
  ): { addedLabels: ConfirmedLabel[]; totalCount: number } {
    const existingIds = new Set(localLabels.map((l) => l.confirmedLabelId));
    const addedLabels: ConfirmedLabel[] = [];

    for (const remote of remoteLabels) {
      if (!existingIds.has(remote.confirmedLabelId)) {
        addedLabels.push(remote);
        existingIds.add(remote.confirmedLabelId);
      }
    }

    return {
      addedLabels,
      totalCount: localLabels.length + addedLabels.length
    };
  }
};
