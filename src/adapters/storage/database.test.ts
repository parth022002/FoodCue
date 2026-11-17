import { beforeEach, describe, expect, it } from "vitest";
import {
  checkDatabaseHealth,
  clearFoodCueData,
  countRecords,
  deleteRecord,
  exportDataPackage,
  getAllRecords,
  getRecord,
  getStorageQuotaEstimate,
  importDataPackage,
  putRecord,
  queryByIndex,
  STORES
} from "./database";

describe("FoodCue IndexedDB Local Storage Engine (S1)", () => {
  beforeEach(async () => {
    await clearFoodCueData();
  });

  it("initializes with all required stores and verifies health", async () => {
    const health = await checkDatabaseHealth();
    expect(health.healthy).toBe(true);
    expect(health.version).toBe(3);
    for (const store of STORES) {
      expect(health.stores[store]).toBe(0);
    }
  });

  it("performs CRUD operations reliably on pantryEvents", async () => {
    const event = {
      eventId: "test-event-1",
      id: "test-event-1",
      itemId: "milk",
      eventType: "add",
      quantityDelta: 2,
      unit: "litre",
      occurredAt: new Date().toISOString()
    };

    await putRecord("pantryEvents", event);
    expect(await countRecords("pantryEvents")).toBe(1);

    const retrieved = await getRecord<typeof event>("pantryEvents", "test-event-1");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.itemId).toBe("milk");
    expect(retrieved?.quantityDelta).toBe(2);

    await deleteRecord("pantryEvents", "test-event-1");
    expect(await countRecords("pantryEvents")).toBe(0);
  });

  it("queries records by index (itemId index on pantryEvents)", async () => {
    const ev1 = {
      eventId: "ev-1",
      id: "ev-1",
      itemId: "bread",
      eventType: "add",
      quantityDelta: 1,
      unit: "loaf",
      occurredAt: new Date().toISOString()
    };
    const ev2 = {
      eventId: "ev-2",
      id: "ev-2",
      itemId: "milk",
      eventType: "add",
      quantityDelta: 2,
      unit: "litre",
      occurredAt: new Date().toISOString()
    };

    await putRecord("pantryEvents", ev1);
    await putRecord("pantryEvents", ev2);

    const results = await queryByIndex<typeof ev1>("pantryEvents", "itemId", "bread");
    expect(results).toHaveLength(1);
    expect(results[0]?.itemId).toBe("bread");
  });

  it("exports a valid versioned FoodCueBackup package", async () => {
    const ev = {
      eventId: "ev-export-1",
      id: "ev-export-1",
      itemId: "tea",
      eventType: "add",
      quantityDelta: 1,
      unit: "box",
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      source: "manual" as const,
      confirmation: true as const,
      schemaVersion: 1 as const
    };
    await putRecord("pantryEvents", ev);

    const pkg = await exportDataPackage();
    expect(pkg.format).toBe("FoodCueBackup");
    expect(pkg.schemaVersion).toBe(3);
    expect(pkg.metadata.totalPantryEvents).toBe(1);
    expect(pkg.data.pantryEvents[0]?.itemId).toBe("tea");
  });

  it("imports a backup package and restores records idempotently", async () => {
    const backupJson = JSON.stringify({
      format: "FoodCueBackup",
      schemaVersion: 2,
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      metadata: {
        totalPantryEvents: 1,
        totalConfirmedLabels: 0,
        totalCandidates: 0,
        appVersion: "1.0.0"
      },
      data: {
        pantryEvents: [
          {
            eventId: "imported-ev-1",
            itemId: "coffee",
            eventType: "add",
            quantityDelta: 1,
            unit: "jar",
            occurredAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            source: "import",
            confirmation: true,
            schemaVersion: 1
          }
        ],
        confirmedLabels: [],
        candidates: [],
        settings: {}
      }
    });

    const result = await importDataPackage(backupJson, "merge");
    expect(result.success).toBe(true);
    expect(result.importedEvents).toBe(1);

    const records = await getAllRecords("pantryEvents");
    expect(records).toHaveLength(1);
  });

  it("rejects corrupt or incompatible import files safely", async () => {
    // Malformed JSON
    await expect(importDataPackage("invalid json string")).rejects.toThrow(/not valid JSON/);

    // Wrong format header
    await expect(
      importDataPackage(JSON.stringify({ format: "WrongFormat", schemaVersion: 2, data: {} }))
    ).rejects.toThrow(/Format header 'FoodCueBackup' is missing/);

    // Incompatible future schema version
    await expect(
      importDataPackage(JSON.stringify({ format: "FoodCueBackup", schemaVersion: 99, data: {} }))
    ).rejects.toThrow(/Incompatible backup version/);
  });

  it("clears all data atomically and verifies zero records remaining", async () => {
    await putRecord("pantryEvents", { eventId: "e1", id: "e1", itemId: "salt", quantityDelta: 1 });
    await putRecord("settings", { key: "theme", value: "dark" });
    expect(await countRecords("pantryEvents")).toBe(1);
    expect(await countRecords("settings")).toBe(1);

    const result = await clearFoodCueData();
    expect(result.success).toBe(true);
    expect(await countRecords("pantryEvents")).toBe(0);
    expect(await countRecords("settings")).toBe(0);
  });

  it("returns a structured storage quota estimate", async () => {
    const quota = await getStorageQuotaEstimate();
    expect(typeof quota.supported).toBe("boolean");
    expect(typeof quota.usedMB).toBe("number");
    expect(typeof quota.percent).toBe("number");
  });
});
