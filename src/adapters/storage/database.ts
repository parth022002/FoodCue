const DB_NAME = "foodcue-local";
const DB_VERSION = 1;
const STORES = ["candidates", "confirmedLabels", "analysisResults", "pantryEvents", "settings"] as const;

export type StoreName = typeof STORES[number];

function openDatabase(): Promise<IDBDatabase> {
  if (!("indexedDB" in window)) return Promise.reject(new Error("IndexedDB is not supported in this browser."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open local database."));
    request.onblocked = () => reject(new Error("Database upgrade is blocked by another open FoodCue tab."));
  });
}

export async function putRecord<T extends { id: string }>(store: StoreName, value: T): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Local save failed."));
      tx.onabort = () => reject(tx.error ?? new Error("Local save was cancelled."));
    });
  } finally { db.close(); }
}

export async function getAllRecords<T>(store: StoreName): Promise<T[]> {
  const db = await openDatabase();
  try {
    return await new Promise<T[]>((resolve, reject) => {
      const request = db.transaction(store, "readonly").objectStore(store).getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error ?? new Error("Could not read local data."));
    });
  } finally { db.close(); }
}

export async function clearFoodCueData(): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([...STORES], "readwrite");
      for (const store of STORES) tx.objectStore(store).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not clear all local data."));
      tx.onabort = () => reject(tx.error ?? new Error("Clear-data operation was aborted."));
    });
  } finally { db.close(); }
}

export const storageInfo = {
  databaseName: DB_NAME,
  version: DB_VERSION,
  stores: STORES
};
