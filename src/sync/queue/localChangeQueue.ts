/**
 * FoodCue Persistent Local Change Queue
 * Manages the offline-tolerant sync operation queue stored inside IndexedDB.
 * Controlling Authority: FoodCue Master Specification v13.5 §12.2
 */

import { openDatabase } from "../../adapters/storage/database";
import type { SyncOperation, SyncEntityType, SyncOperationType } from "../types/syncContracts";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "op_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export const localChangeQueue = {
  /**
   * Enqueues a new sync operation into IndexedDB.
   */
  async enqueue(operation: {
    entityType: SyncEntityType;
    entityId: string;
    operationType: SyncOperationType;
    payload: Record<string, unknown>;
    clientTimestamp?: string;
    idempotencyKey?: string;
  }): Promise<SyncOperation> {
    const db = await openDatabase();
    const id = generateUUID();
    const now = new Date().toISOString();

    const record: SyncOperation = {
      id,
      entityType: operation.entityType,
      entityId: operation.entityId,
      operationType: operation.operationType,
      payload: operation.payload,
      clientTimestamp: operation.clientTimestamp || now,
      idempotencyKey: operation.idempotencyKey || `${operation.entityType}_${operation.entityId}_${Date.now()}_${id.slice(0, 8)}`,
      status: "pending",
      retryCount: 0,
      createdAt: now
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction("syncQueue", "readwrite");
      const store = tx.objectStore("syncQueue");
      const req = store.put(record);

      req.onsuccess = () => resolve(record);
      req.onerror = () => reject(req.error ?? new Error("Failed to enqueue sync operation"));
    });
  },

  /**
   * Retrieves a batch of pending operations to be transmitted to the server.
   */
  async peekBatch(limit = 50): Promise<SyncOperation[]> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction("syncQueue", "readonly");
      const store = tx.objectStore("syncQueue");
      const index = store.index("status");
      const req = index.getAll("pending");

      req.onsuccess = () => {
        const items = (req.result as SyncOperation[]) || [];
        // Sort oldest first
        items.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        resolve(items.slice(0, limit));
      };
      req.onerror = () => reject(req.error ?? new Error("Failed to read syncQueue"));
    });
  },

  /**
   * Marks operations as in_flight during an active network transmission.
   */
  async markInFlight(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction("syncQueue", "readwrite");
      const store = tx.objectStore("syncQueue");

      let remaining = ids.length;
      for (const id of ids) {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const item = getReq.result as SyncOperation | undefined;
          if (item) {
            item.status = "in_flight";
            store.put(item);
          }
          remaining--;
          if (remaining === 0) resolve();
        };
        getReq.onerror = () => {
          remaining--;
          if (remaining === 0) resolve();
        };
      }

      tx.onerror = () => reject(tx.error ?? new Error("Failed to update in_flight status"));
    });
  },

  /**
   * Marks operations as completed and removes them or tags them as completed.
   */
  async markCompleted(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction("syncQueue", "readwrite");
      const store = tx.objectStore("syncQueue");

      for (const id of ids) {
        store.delete(id); // Delete from queue once confirmed by server
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Failed to mark operations completed"));
    });
  },

  /**
   * Marks an operation as failed with backoff tracking.
   */
  async markFailed(id: string, error: string): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction("syncQueue", "readwrite");
      const store = tx.objectStore("syncQueue");
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const item = getReq.result as SyncOperation | undefined;
        if (item) {
          item.retryCount = (item.retryCount || 0) + 1;
          item.lastError = error;
          // Revert to pending if retry threshold not reached
          item.status = item.retryCount >= 5 ? "failed" : "pending";
          store.put(item);
        }
        resolve();
      };

      getReq.onerror = () => reject(getReq.error ?? new Error("Failed to mark operation failed"));
    });
  },

  /**
   * Resets any stuck in_flight items back to pending (e.g. after network drop).
   */
  async resetInFlight(): Promise<void> {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction("syncQueue", "readwrite");
      const store = tx.objectStore("syncQueue");
      const index = store.index("status");
      const req = index.getAll("in_flight");

      req.onsuccess = () => {
        const items = req.result as SyncOperation[];
        for (const item of items) {
          item.status = "pending";
          store.put(item);
        }
        resolve();
      };
      req.onerror = () => reject(req.error ?? new Error("Failed to reset in-flight operations"));
    });
  },

  /**
   * Returns the count of pending and in-flight operations.
   */
  async getPendingCount(): Promise<number> {
    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const tx = db.transaction("syncQueue", "readonly");
        const store = tx.objectStore("syncQueue");
        const req = store.count();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(0);
      });
    } catch {
      return 0;
    }
  },

  /**
   * Returns all items currently in the sync queue for diagnostics.
   */
  async getAll(): Promise<SyncOperation[]> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("syncQueue", "readonly");
      const store = tx.objectStore("syncQueue");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as SyncOperation[]);
      req.onerror = () => reject(req.error ?? new Error("Failed to get all syncQueue items"));
    });
  },

  /**
   * Clears the entire sync queue (e.g. on user reset / full data wipe).
   */
  async clear(): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("syncQueue", "readwrite");
      const store = tx.objectStore("syncQueue");
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("Failed to clear sync queue"));
    });
  }
};
