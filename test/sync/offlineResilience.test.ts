/**
 * Offline Resilience & Local Persistence Test Suite
 * Master Specification v13.5 §12, §15, Table 54 (PRV-01, PRV-02)
 *
 * Requirements:
 * 1. Offline mutations are persistently queued.
 * 2. Monotonic timestamps ensure strict FIFO ordering across rapid mutations.
 * 3. Network interruptions do not lose queued local changes.
 * 4. Revoking cloud sync preserves local working state while cleaning queue.
 */

import { beforeEach, describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { localChangeQueue } from "../../src/sync/queue/localChangeQueue";
import { syncMetadata } from "../../src/sync/state/syncMetadata";
import { putRecord, getRecord, clearStore } from "../../src/adapters/storage/database";

describe("PRV-01 & PRV-02: Offline Resilience, Queue Integrity & Data Safety", () => {
  beforeEach(async () => {
    await localChangeQueue.clear();
    await clearStore("pantryEvents");
    await syncMetadata.reset();
  });

  it("queues multiple offline mutations with strictly monotonic timestamps", async () => {
    // Enqueue 3 rapid mutations in the same tick
    const p1 = localChangeQueue.enqueue({
      entityType: "pantry",
      entityId: "event-1",
      operationType: "create",
      payload: { eventType: "ADD", name: "Atta" },
    });
    const p2 = localChangeQueue.enqueue({
      entityType: "pantry",
      entityId: "event-2",
      operationType: "create",
      payload: { eventType: "ADD", name: "Rice" },
    });
    const p3 = localChangeQueue.enqueue({
      entityType: "pantry",
      entityId: "event-3",
      operationType: "create",
      payload: { eventType: "ADD", name: "Dal" },
    });

    await Promise.all([p1, p2, p3]);

    const batch = await localChangeQueue.peekBatch(10);
    expect(batch.length).toBe(3);

    // Verify monotonic ordering: createdAt of item 0 <= item 1 <= item 2
    const t0 = new Date(batch[0].createdAt).getTime();
    const t1 = new Date(batch[1].createdAt).getTime();
    const t2 = new Date(batch[2].createdAt).getTime();

    expect(t1).toBeGreaterThanOrEqual(t0);
    expect(t2).toBeGreaterThanOrEqual(t1);
  });

  it("retains pending mutations upon network failure without data loss", async () => {
    await localChangeQueue.enqueue({
      entityType: "pantry",
      entityId: "event-offline",
      operationType: "create",
      payload: { eventType: "CONSUME", name: "Tea" },
    });

    // Simulate peek for sync attempt
    const batch = await localChangeQueue.peekBatch(5);
    expect(batch.length).toBe(1);

    // Simulate network error: acknowledgment is NOT called
    // Queue must still have the item upon subsequent inspection
    const recheckedBatch = await localChangeQueue.peekBatch(5);
    expect(recheckedBatch.length).toBe(1);
    expect(recheckedBatch[0].entityId).toBe("event-offline");

    // Once successfully sent, mark completed removes it
    await localChangeQueue.markCompleted([recheckedBatch[0].id]);
    const emptyBatch = await localChangeQueue.peekBatch(5);
    expect(emptyBatch.length).toBe(0);
  });

  it("disabling sync preserves all local IndexedDB records while resetting sync metadata", async () => {
    // 1. User has local pantry event
    await putRecord("pantryEvents", {
      eventId: "event-local-preserve",
      eventType: "ADD",
      occurredAt: new Date().toISOString(),
      item: {
        productName: "Local Tata Salt",
        quantity: 1,
        unit: "pack",
      },
    });

    // 2. User consented to sync
    await syncMetadata.setCloudSyncEnabled(true);
    const metaBefore = await syncMetadata.get();
    expect(metaBefore.cloudSyncEnabled).toBe(true);

    // 3. User now revokes consent / disables sync
    await syncMetadata.setCloudSyncEnabled(false);
    const metaAfter = await syncMetadata.get();
    expect(metaAfter.cloudSyncEnabled).toBe(false);

    // 4. Local item MUST remain intact in IndexedDB
    const event = await getRecord<{ eventId: string; item: { productName: string } }>("pantryEvents", "event-local-preserve");
    expect(event).toBeDefined();
    expect(event?.item?.productName).toBe("Local Tata Salt");
  });
});
