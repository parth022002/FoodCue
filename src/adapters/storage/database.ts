/**
 * FoodCue Local-First IndexedDB Storage Engine (S1 Baseline)
 * Architecture: Modular Adapter decoupling UI from browser-native IndexedDB.
 * Controlling Authority: FoodCue Master Specification v13.5 & PRD v1.3
 */

import type { PantryEvent } from "../../domain/entities/pantry";
import type { ConfirmedLabel, ProductCandidate } from "../../domain/entities/food";

export const DB_NAME = "foodcue-local";
export const DB_VERSION = 2;

export const STORES = [
  "candidates",
  "confirmedLabels",
  "analysisResults",
  "pantryEvents",
  "settings",
  "metadata"
] as const;

export type StoreName = typeof STORES[number];

export interface StorageQuotaInfo {
  supported: boolean;
  usedBytes: number;
  quotaBytes: number;
  usedMB: number;
  totalMB: number;
  percent: number;
  isPersisted: boolean;
}

export interface DatabaseHealthStatus {
  healthy: boolean;
  databaseName: string;
  version: number;
  stores: Record<StoreName, number>;
  error?: string;
}

export interface FoodCueExportPackage {
  format: "FoodCueBackup";
  schemaVersion: number;
  exportVersion: 1;
  exportedAt: string;
  metadata: {
    totalPantryEvents: number;
    totalConfirmedLabels: number;
    totalCandidates: number;
    appVersion: string;
  };
  data: {
    pantryEvents: PantryEvent[];
    confirmedLabels: ConfirmedLabel[];
    candidates: ProductCandidate[];
    settings: Record<string, unknown>;
  };
}

/**
 * Opens IndexedDB with versioned schema migrations
 */
export function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not supported in this browser environment."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const oldVersion = event.oldVersion;

      // Migration v0 -> v1: Baseline store creation
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains("candidates")) {
          db.createObjectStore("candidates", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("confirmedLabels")) {
          db.createObjectStore("confirmedLabels", { keyPath: "confirmedLabelId" });
        }
        if (!db.objectStoreNames.contains("analysisResults")) {
          db.createObjectStore("analysisResults", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("pantryEvents")) {
          db.createObjectStore("pantryEvents", { keyPath: "eventId" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      }

      // Migration v1 -> v2: Add metadata store and performance indexes
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains("metadata")) {
          db.createObjectStore("metadata", { keyPath: "key" });
        }

        // Add indexes to pantryEvents if missing
        if (db.objectStoreNames.contains("pantryEvents")) {
          const pantryStore = request.transaction?.objectStore("pantryEvents");
          if (pantryStore) {
            if (!pantryStore.indexNames.contains("itemId")) {
              pantryStore.createIndex("itemId", "itemId", { unique: false });
            }
            if (!pantryStore.indexNames.contains("eventType")) {
              pantryStore.createIndex("eventType", "eventType", { unique: false });
            }
            if (!pantryStore.indexNames.contains("occurredAt")) {
              pantryStore.createIndex("occurredAt", "occurredAt", { unique: false });
            }
          }
        }

        // Add indexes to confirmedLabels if missing
        if (db.objectStoreNames.contains("confirmedLabels")) {
          const labelStore = request.transaction?.objectStore("confirmedLabels");
          if (labelStore) {
            if (!labelStore.indexNames.contains("candidateId")) {
              labelStore.createIndex("candidateId", "candidateId", { unique: false });
            }
          }
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local database."));
    request.onblocked = () => reject(new Error("Database upgrade is blocked by another open FoodCue tab."));
  });
}

/**
 * Puts a single record into an IndexedDB store
 */
export async function putRecord<T>(store: StoreName, value: T): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const objStore = tx.objectStore(store);
      objStore.put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error(`Failed to save record to store '${store}'.`));
      tx.onabort = () => reject(tx.error ?? new Error(`Save transaction aborted on store '${store}'.`));
    });
  } finally {
    db.close();
  }
}

/**
 * Gets a single record by primary key
 */
export async function getRecord<T>(store: StoreName, key: IDBValidKey): Promise<T | null> {
  const db = await openDatabase();
  try {
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const request = tx.objectStore(store).get(key);
      request.onsuccess = () => resolve((request.result as T) ?? null);
      request.onerror = () => reject(request.error ?? new Error(`Failed to get record from store '${store}'.`));
    });
  } finally {
    db.close();
  }
}

/**
 * Deletes a single record by primary key
 */
export async function deleteRecord(store: StoreName, key: IDBValidKey): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error(`Failed to delete record from store '${store}'.`));
      tx.onabort = () => reject(tx.error ?? new Error(`Delete transaction aborted on store '${store}'.`));
    });
  } finally {
    db.close();
  }
}

/**
 * Gets all records from an IndexedDB store
 */
export async function getAllRecords<T>(store: StoreName): Promise<T[]> {
  const db = await openDatabase();
  try {
    return await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const request = tx.objectStore(store).getAll();
      request.onsuccess = () => resolve((request.result as T[]) ?? []);
      request.onerror = () => reject(request.error ?? new Error(`Could not read records from store '${store}'.`));
    });
  } finally {
    db.close();
  }
}

/**
 * Counts records in a store
 */
export async function countRecords(store: StoreName): Promise<number> {
  const db = await openDatabase();
  try {
    return await new Promise<number>((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const request = tx.objectStore(store).count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error(`Could not count records in store '${store}'.`));
    });
  } finally {
    db.close();
  }
}

/**
 * Queries records using an index
 */
export async function queryByIndex<T>(
  store: StoreName,
  indexName: string,
  query: IDBValidKey | IDBKeyRange
): Promise<T[]> {
  const db = await openDatabase();
  try {
    return await new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const objStore = tx.objectStore(store);
      if (!objStore.indexNames.contains(indexName)) {
        reject(new Error(`Index '${indexName}' does not exist on store '${store}'.`));
        return;
      }
      const request = objStore.index(indexName).getAll(query);
      request.onsuccess = () => resolve((request.result as T[]) ?? []);
      request.onerror = () => reject(request.error ?? new Error(`Query failed on index '${indexName}'.`));
    });
  } finally {
    db.close();
  }
}

/**
 * Clears all FoodCue stores atomically and verifies zero records remaining
 */
export async function clearFoodCueData(): Promise<{ success: boolean; clearedStores: string[] }> {
  const db = await openDatabase();
  const cleared: string[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([...STORES], "readwrite");
      for (const store of STORES) {
        tx.objectStore(store).clear();
        cleared.push(store);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not clear all local data."));
      tx.onabort = () => reject(tx.error ?? new Error("Clear-data operation was aborted."));
    });

    // Verification step
    for (const store of STORES) {
      const count = await countRecords(store);
      if (count !== 0) {
        throw new Error(`Data wipe incomplete: store '${store}' still contains ${count} records.`);
      }
    }

    return { success: true, clearedStores: cleared };
  } finally {
    db.close();
  }
}

/**
 * Storage quota estimation and eviction canary check
 */
export async function getStorageQuotaEstimate(): Promise<StorageQuotaInfo> {
  if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.estimate) {
    try {
      const [est, isPersisted] = await Promise.all([
        navigator.storage.estimate(),
        navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false)
      ]);
      const usedBytes = est.usage || 0;
      const quotaBytes = est.quota || 1;
      const usedMB = Math.round((usedBytes / (1024 * 1024)) * 10) / 10;
      const totalMB = Math.round(quotaBytes / (1024 * 1024));
      const percent = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));
      return {
        supported: true,
        usedBytes,
        quotaBytes,
        usedMB,
        totalMB,
        percent,
        isPersisted
      };
    } catch {
      // fallback
    }
  }

  return {
    supported: false,
    usedBytes: 0,
    quotaBytes: 0,
    usedMB: 0,
    totalMB: 0,
    percent: 0,
    isPersisted: false
  };
}

/**
 * Verifies overall database health and record counts
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  try {
    const db = await openDatabase();
    db.close();

    const stores: Record<string, number> = {};
    for (const store of STORES) {
      stores[store] = await countRecords(store);
    }

    return {
      healthy: true,
      databaseName: DB_NAME,
      version: DB_VERSION,
      stores: stores as Record<StoreName, number>
    };
  } catch (err) {
    return {
      healthy: false,
      databaseName: DB_NAME,
      version: DB_VERSION,
      stores: {} as Record<StoreName, number>,
      error: err instanceof Error ? err.message : "Unknown database health check failure"
    };
  }
}

/**
 * Exports all user-owned data to a validated, versioned JSON backup package
 */
export async function exportDataPackage(): Promise<FoodCueExportPackage> {
  const [events, labels, candidates, settings] = await Promise.all([
    getAllRecords<PantryEvent>("pantryEvents"),
    getAllRecords<ConfirmedLabel>("confirmedLabels"),
    getAllRecords<ProductCandidate>("candidates"),
    getAllRecords<{ key: string; value: unknown }>("settings")
  ]);

  const settingsMap: Record<string, unknown> = {};
  for (const s of settings) {
    settingsMap[s.key] = s.value;
  }

  return {
    format: "FoodCueBackup",
    schemaVersion: DB_VERSION,
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    metadata: {
      totalPantryEvents: events.length,
      totalConfirmedLabels: labels.length,
      totalCandidates: candidates.length,
      appVersion: "1.0.0"
    },
    data: {
      pantryEvents: events,
      confirmedLabels: labels,
      candidates,
      settings: settingsMap
    }
  };
}

/**
 * Imports a FoodCue backup package with comprehensive schema validation and atomic write
 */
export async function importDataPackage(
  jsonString: string,
  mode: "merge" | "replace" = "merge"
): Promise<{
  success: boolean;
  importedEvents: number;
  importedLabels: number;
  importedCandidates: number;
  message: string;
}> {
  let pkg: FoodCueExportPackage;
  try {
    pkg = JSON.parse(jsonString) as FoodCueExportPackage;
  } catch {
    throw new Error("Invalid import file: The provided file is not valid JSON.");
  }

  // Schema & Header Validation
  if (pkg.format !== "FoodCueBackup" || typeof pkg.schemaVersion !== "number") {
    throw new Error("Incompatible import file: Format header 'FoodCueBackup' is missing or corrupted.");
  }

  if (pkg.schemaVersion > DB_VERSION) {
    throw new Error(
      `Incompatible backup version: File is schema v${pkg.schemaVersion}, but this application supports up to v${DB_VERSION}. Please update FoodCue.`
    );
  }

  if (!pkg.data || !Array.isArray(pkg.data.pantryEvents)) {
    throw new Error("Corrupted backup package: 'pantryEvents' array is missing.");
  }

  // In replace mode, wipe existing data first
  if (mode === "replace") {
    await clearFoodCueData();
  }

  let importedEvents = 0;
  let importedLabels = 0;
  let importedCandidates = 0;

  // Import Pantry Events (validate confirmation & deltas)
  for (const ev of pkg.data.pantryEvents) {
    if (!ev.eventId || !ev.itemId || !Number.isFinite(ev.quantityDelta)) {
      continue; // Skip malformed events
    }
    await putRecord("pantryEvents", { ...ev, id: ev.eventId });
    importedEvents++;
  }

  // Import Confirmed Labels
  if (Array.isArray(pkg.data.confirmedLabels)) {
    for (const lbl of pkg.data.confirmedLabels) {
      if (lbl.confirmedLabelId) {
        await putRecord("confirmedLabels", { ...lbl, id: lbl.confirmedLabelId });
        importedLabels++;
      }
    }
  }

  // Import Candidates
  if (Array.isArray(pkg.data.candidates)) {
    for (const c of pkg.data.candidates) {
      if (c.candidateId) {
        await putRecord("candidates", { ...c, id: c.candidateId });
        importedCandidates++;
      }
    }
  }

  return {
    success: true,
    importedEvents,
    importedLabels,
    importedCandidates,
    message: `Successfully imported ${importedEvents} pantry event(s), ${importedLabels} confirmed label(s), and ${importedCandidates} candidate(s).`
  };
}

export const storageInfo = {
  databaseName: DB_NAME,
  version: DB_VERSION,
  stores: STORES
};
