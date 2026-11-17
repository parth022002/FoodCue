import { describe, it, expect, beforeEach } from "vitest";
import { localChangeQueue } from "../../src/sync/queue/localChangeQueue";

describe("Persistent Local Change Queue (IndexedDB)", () => {
  beforeEach(async () => {
    await localChangeQueue.clear();
  });

  it("enqueues operations with pending status and computes default properties", async () => {
    const op = await localChangeQueue.enqueue({
      entityType: "pantry_event",
      entityId: "item_tata_salt",
      operationType: "append_event",
      payload: {
        eventId: "ev_local_1",
        itemId: "item_tata_salt",
        eventType: "intake",
        quantityDelta: 1
      }
    });

    expect(op.id).toBeDefined();
    expect(op.status).toBe("pending");
    expect(op.retryCount).toBe(0);
    expect(op.createdAt).toBeDefined();

    const count = await localChangeQueue.getPendingCount();
    expect(count).toBe(1);
  });

  it("peeks a batch of pending items ordered by creation time", async () => {
    await localChangeQueue.enqueue({
      entityType: "pantry_event",
      entityId: "item_1",
      operationType: "append_event",
      payload: { eventId: "ev_1" }
    });

    await localChangeQueue.enqueue({
      entityType: "shopping_item",
      entityId: "item_2",
      operationType: "create",
      payload: { listItemId: "shop_1" }
    });

    const batch = await localChangeQueue.peekBatch(10);
    expect(batch).toHaveLength(2);
    expect(batch[0].entityId).toBe("item_1");
    expect(batch[1].entityId).toBe("item_2");
  });

  it("marks operations in-flight and completes them upon cloud confirmation", async () => {
    const op = await localChangeQueue.enqueue({
      entityType: "confirmed_label",
      entityId: "label_parle_g",
      operationType: "create",
      payload: { confirmedLabelId: "lbl_123" }
    });

    await localChangeQueue.markInFlight([op.id]);
    // During in-flight, peekBatch (which queries status === 'pending') returns 0
    const inFlightPending = await localChangeQueue.peekBatch(10);
    expect(inFlightPending).toHaveLength(0);

    // Mark completed deletes the operation from queue
    await localChangeQueue.markCompleted([op.id]);
    const finalCount = await localChangeQueue.getPendingCount();
    expect(finalCount).toBe(0);
  });

  it("increments retry count on failure and reverts to pending if below threshold", async () => {
    const op = await localChangeQueue.enqueue({
      entityType: "pantry_event",
      entityId: "item_err",
      operationType: "append_event",
      payload: { eventId: "ev_err" }
    });

    await localChangeQueue.markFailed(op.id, "Network timeout 504");
    const batch = await localChangeQueue.peekBatch(10);
    expect(batch).toHaveLength(1);
    expect(batch[0].retryCount).toBe(1);
    expect(batch[0].lastError).toBe("Network timeout 504");
  });
});
