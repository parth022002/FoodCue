/**
 * FoodCue Sync Coordinator
 * Orchestrates background queued push, incremental delta pull, and conflict reconciliation.
 * Controlling Authority: FoodCue Master Specification v13.5 §12.4
 */

import { localChangeQueue } from "../queue/localChangeQueue";
import { syncMetadata } from "../state/syncMetadata";
import { syncStatus } from "../state/syncStatus";
import { conflictResolver } from "../reconciliation/conflictResolver";
import { SyncApiClient } from "../transport/syncApiClient";
import { openDatabase, registerStorageMutationListener } from "../../adapters/storage/database";
import type { PantryEvent } from "../../domain/entities/pantry";
import type { ConfirmedLabel } from "../../domain/entities/food";

class SyncCoordinator {
  private apiClient: SyncApiClient | null = null;
  private isRunning = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private initialized = false;

  /**
   * Initializes the coordinator with a token provider function.
   */
  async initialize(getToken: () => Promise<string | null>): Promise<void> {
    this.apiClient = new SyncApiClient(getToken);

    const meta = await syncMetadata.get();
    const pendingCount = await localChangeQueue.getPendingCount();

    syncStatus.updateState({
      deviceId: meta.deviceId,
      isCloudEnabled: meta.cloudSyncEnabled,
      pendingCount,
      lastSyncTime: meta.lastSyncTimestamp
    });

    // Hook local IndexedDB writes into persistent sync queue
    registerStorageMutationListener((store, value, action) => {
      if (action === "put" && value) {
        if (store === "pantryEvents") {
          const ev = value as { eventId?: string; id?: string };
          const eventId = ev.eventId || ev.id;
          if (eventId) {
            localChangeQueue
              .enqueue({
                entityType: "pantry_event",
                entityId: eventId,
                operationType: "append_event",
                payload: value as Record<string, unknown>
              })
              .then(async () => {
                const count = await localChangeQueue.getPendingCount();
                syncStatus.setPendingCount(count);
                this.triggerSync();
              })
              .catch(() => {});
          }
        } else if (store === "confirmedLabels") {
          const lbl = value as { confirmedLabelId?: string; id?: string };
          const labelId = lbl.confirmedLabelId || lbl.id;
          if (labelId) {
            localChangeQueue
              .enqueue({
                entityType: "confirmed_label",
                entityId: labelId,
                operationType: "create",
                payload: value as Record<string, unknown>
              })
              .then(async () => {
                const count = await localChangeQueue.getPendingCount();
                syncStatus.setPendingCount(count);
                this.triggerSync();
              })
              .catch(() => {});
          }
        }
      }
    });

    if (typeof window !== "undefined" && !this.initialized) {
      window.addEventListener("online", () => {
        syncStatus.setStatus("idle");
        this.triggerSync();
      });

      window.addEventListener("offline", () => {
        syncStatus.setStatus("offline");
      });

      // Periodic sync heartbeat every 60 seconds
      this.intervalId = setInterval(() => {
        this.triggerSync();
      }, 60000);

      this.initialized = true;
    }
  }

  /**
   * Triggers a sync cycle immediately.
   */
  async triggerSync(): Promise<boolean> {
    if (this.isRunning || !this.apiClient) return false;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      syncStatus.setStatus("offline");
      return false;
    }

    const meta = await syncMetadata.get();
    if (!meta.cloudSyncEnabled) {
      return false;
    }

    this.isRunning = true;
    syncStatus.setStatus("syncing");

    try {
      // 1. Device registration / heartbeat
      await this.apiClient.registerDevice({
        deviceId: meta.deviceId,
        deviceName: meta.deviceName,
        clientVersion: meta.clientVersion
      });

      // 2. Push locally queued mutations
      const batch = await localChangeQueue.peekBatch(50);
      if (batch.length > 0) {
        const batchIds = batch.map((b) => b.id);
        await localChangeQueue.markInFlight(batchIds);

        try {
          const pushResult = await this.apiClient.pushBatch({
            deviceId: meta.deviceId,
            deviceName: meta.deviceName,
            clientVersion: meta.clientVersion,
            operations: batch.map((op) => ({
              idempotencyKey: op.idempotencyKey,
              entityType: op.entityType,
              entityId: op.entityId,
              operationType: op.operationType,
              payload: op.payload,
              clientTimestamp: op.clientTimestamp
            }))
          });

          if (pushResult.success) {
            await localChangeQueue.markCompleted(batchIds);
          }
        } catch (pushErr) {
          const errMsg = pushErr instanceof Error ? pushErr.message : "Push failed";
          for (const id of batchIds) {
            await localChangeQueue.markFailed(id, errMsg);
          }
        }
      }

      // 3. Pull incremental deltas from cloud
      const pullResult = await this.apiClient.pullDelta(meta.lastSyncTimestamp);
      if (pullResult.operations && pullResult.operations.length > 0) {
        await this.applyRemoteOperations(pullResult.operations);
      }

      // 4. Update sync cursor
      if (pullResult.serverTimestamp) {
        await syncMetadata.updateCursor(pullResult.serverTimestamp);
        syncStatus.setLastSyncTime(pullResult.serverTimestamp);
      }

      const remainingPending = await localChangeQueue.getPendingCount();
      syncStatus.setPendingCount(remainingPending);
      syncStatus.setStatus("idle");
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync error";
      syncStatus.setStatus("error", msg);
      return false;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Applies remote delta operations into local IndexedDB with conflict resolution.
   */
  private async applyRemoteOperations(
    operations: Array<{
      entityType: string;
      operationType: string;
      payload: Record<string, unknown>;
    }>
  ): Promise<void> {
    const db = await openDatabase();

    const remotePantryEvents: PantryEvent[] = [];
    const remoteLabels: ConfirmedLabel[] = [];

    for (const op of operations) {
      if (op.entityType === "pantry_event" && op.payload) {
        remotePantryEvents.push(op.payload as unknown as PantryEvent);
      } else if (op.entityType === "confirmed_label" && op.payload) {
        remoteLabels.push(op.payload as unknown as ConfirmedLabel);
      }
    }

    // Merge remote pantry events into local pantryEvents store
    if (remotePantryEvents.length > 0) {
      const localEvents = await new Promise<PantryEvent[]>((resolve) => {
        const tx = db.transaction("pantryEvents", "readonly");
        const store = tx.objectStore("pantryEvents");
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as PantryEvent[]) || []);
        req.onerror = () => resolve([]);
      });

      const { addedEvents } = conflictResolver.mergePantryEvents(localEvents, remotePantryEvents);
      if (addedEvents.length > 0) {
        const writeTx = db.transaction("pantryEvents", "readwrite");
        const store = writeTx.objectStore("pantryEvents");
        for (const ev of addedEvents) {
          store.put(ev);
        }
      }
    }

    // Merge remote confirmed labels into local confirmedLabels store
    if (remoteLabels.length > 0) {
      const localLabels = await new Promise<ConfirmedLabel[]>((resolve) => {
        const tx = db.transaction("confirmedLabels", "readonly");
        const store = tx.objectStore("confirmedLabels");
        const req = store.getAll();
        req.onsuccess = () => resolve((req.result as ConfirmedLabel[]) || []);
        req.onerror = () => resolve([]);
      });

      const { addedLabels } = conflictResolver.mergeConfirmedLabels(localLabels, remoteLabels);
      if (addedLabels.length > 0) {
        const writeTx = db.transaction("confirmedLabels", "readwrite");
        const store = writeTx.objectStore("confirmedLabels");
        for (const lbl of addedLabels) {
          store.put(lbl);
        }
      }
    }
  }

  /**
   * Cleans up background timers.
   */
  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const syncCoordinator = new SyncCoordinator();
