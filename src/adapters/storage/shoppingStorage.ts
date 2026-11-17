/**
 * FoodCue Shopping List Storage & Sync Adapter
 * Manages persistent offline storage (IndexedDB settings store + localStorage)
 * and dispatches item-level sync mutations to the persistent localChangeQueue.
 * Controlling Authority: FoodCue Master Specification v13.5 §12 & §21.4
 */

import { putRecord, getRecord } from "./database";
import { localChangeQueue } from "../../sync/queue/localChangeQueue";
import { syncCoordinator } from "../../sync/engine/syncCoordinator";
import { conflictResolver, type ShoppingItemPayload } from "../../sync/reconciliation/conflictResolver";

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  isBought: boolean;
  updatedAt: string;
}

const STORAGE_KEY = "foodcue_shopping_list";
const SETTINGS_STORE_KEY = "shopping_list_items";

const INITIAL_SHOPPING_ITEMS: ShoppingItem[] = [
  { id: "item-1", name: "Tata Iodised Salt", quantity: 1, unit: "kg", category: "Staples", isBought: false, updatedAt: new Date().toISOString() },
  { id: "item-2", name: "Amul Pasteurised Butter", quantity: 2, unit: "packs", category: "Dairy", isBought: false, updatedAt: new Date().toISOString() },
  { id: "item-3", name: "Whole Wheat Atta", quantity: 5, unit: "kg", category: "Staples", isBought: true, updatedAt: new Date().toISOString() },
  { id: "item-4", name: "Quaker Rolled Oats", quantity: 1, unit: "pack", category: "Breakfast", isBought: false, updatedAt: new Date().toISOString() }
];

type ShoppingListListener = (items: ShoppingItem[]) => void;
const listeners = new Set<ShoppingListListener>();

function notifyListeners(items: ShoppingItem[]) {
  for (const listener of listeners) {
    try {
      listener(items);
    } catch {
      // Resilience
    }
  }
}

export const shoppingStorage = {
  /**
   * Subscribe to shopping list updates across components
   */
  subscribe(listener: ShoppingListListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Loads all shopping items from persistent storage (IndexedDB with localStorage fast-cache)
   */
  async loadItems(): Promise<ShoppingItem[]> {
    // 1. Try IndexedDB settings store first
    try {
      const record = await getRecord<{ key: string; items: ShoppingItem[] }>("settings", SETTINGS_STORE_KEY);
      if (record && Array.isArray(record.items) && record.items.length > 0) {
        // Refresh local cache
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(record.items));
        }
        return record.items;
      }
    } catch {
      // Fallback to localStorage
    }

    // 2. Try localStorage fast-cache
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as ShoppingItem[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // Fallback
      }
    }

    // 3. Fallback to default initial items
    return INITIAL_SHOPPING_ITEMS;
  },

  /**
   * Internal helper to persist items to both IndexedDB and localStorage
   */
  async persistItems(items: ShoppingItem[]): Promise<void> {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        // Ignore quota
      }
    }

    try {
      await putRecord("settings", {
        key: SETTINGS_STORE_KEY,
        items,
        updatedAt: new Date().toISOString()
      });
    } catch {
      // Resilience
    }

    notifyListeners(items);
  },

  /**
   * Adds a new item to the shopping list and enqueues sync mutation
   */
  async addItem(item: Omit<ShoppingItem, "id" | "updatedAt">): Promise<ShoppingItem> {
    const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `shop-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    const now = new Date().toISOString();
    const newItem: ShoppingItem = {
      ...item,
      id,
      updatedAt: now
    };

    const current = await this.loadItems();
    const updated = [newItem, ...current];
    await this.persistItems(updated);

    // Enqueue sync operation
    await localChangeQueue.enqueue({
      entityType: "shopping_item",
      entityId: id,
      operationType: "create",
      payload: {
        listItemId: id,
        productName: newItem.name,
        requestedQuantity: newItem.quantity,
        unit: newItem.unit,
        category: newItem.category,
        checked: newItem.isBought,
        updatedAt: now
      }
    }).catch(() => {});

    // Trigger sync cycle if connected
    syncCoordinator.triggerSync().catch(() => {});

    return newItem;
  },

  /**
   * Updates an existing shopping item and enqueues sync mutation
   */
  async updateItem(id: string, updates: Partial<ShoppingItem>): Promise<void> {
    const current = await this.loadItems();
    const now = new Date().toISOString();

    let targetItem: ShoppingItem | null = null;
    const updated = current.map((item) => {
      if (item.id === id) {
        targetItem = { ...item, ...updates, updatedAt: now };
        return targetItem;
      }
      return item;
    });

    if (targetItem) {
      await this.persistItems(updated);

      await localChangeQueue.enqueue({
        entityType: "shopping_item",
        entityId: id,
        operationType: "update",
        payload: {
          listItemId: id,
          productName: (targetItem as ShoppingItem).name,
          requestedQuantity: (targetItem as ShoppingItem).quantity,
          unit: (targetItem as ShoppingItem).unit,
          category: (targetItem as ShoppingItem).category,
          checked: (targetItem as ShoppingItem).isBought,
          updatedAt: now
        }
      }).catch(() => {});

      syncCoordinator.triggerSync().catch(() => {});
    }
  },

  /**
   * Deletes an item from the shopping list and enqueues a deletion tombstone
   */
  async deleteItem(id: string): Promise<void> {
    const current = await this.loadItems();
    const targetItem = current.find((i) => i.id === id);
    const updated = current.filter((i) => i.id !== id);
    const now = new Date().toISOString();

    await this.persistItems(updated);

    await localChangeQueue.enqueue({
      entityType: "shopping_item",
      entityId: id,
      operationType: "delete",
      payload: {
        listItemId: id,
        productName: targetItem?.name || "Deleted Item",
        isDeleted: true,
        updatedAt: now
      }
    }).catch(() => {});

    syncCoordinator.triggerSync().catch(() => {});
  },

  /**
   * Merges remote shopping item operations from delta pull into local storage
   */
  async mergeRemoteItems(remotePayloads: ShoppingItemPayload[]): Promise<void> {
    if (remotePayloads.length === 0) return;

    const current = await this.loadItems();
    const localPayloads: ShoppingItemPayload[] = current.map((item) => ({
      listItemId: item.id,
      productName: item.name,
      requestedQuantity: item.quantity,
      unit: item.unit,
      category: item.category,
      checked: item.isBought,
      updatedAt: item.updatedAt
    }));

    const reconciled = conflictResolver.mergeShoppingItems(localPayloads, remotePayloads);

    const updatedItems: ShoppingItem[] = reconciled.map((r) => ({
      id: r.listItemId,
      name: r.productName,
      quantity: r.requestedQuantity,
      unit: r.unit,
      category: r.category || "General",
      isBought: r.checked,
      updatedAt: r.updatedAt
    }));

    await this.persistItems(updatedItems);
  }
};
