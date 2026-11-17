/**
 * FoodCue Sync Metadata & Device Identity Storage
 * Preserves local cursor timestamps, device identity, and sync toggle.
 */

import { openDatabase } from "../../adapters/storage/database";

export interface SyncMetadataState {
  deviceId: string;
  deviceName: string;
  clientVersion: string;
  lastSyncTimestamp: string | null;
  cloudSyncEnabled: boolean;
}

const DEFAULT_METADATA: SyncMetadataState = {
  deviceId: "",
  deviceName: "",
  clientVersion: "1.0.0",
  lastSyncTimestamp: null,
  cloudSyncEnabled: false
};

function detectDeviceName(): string {
  if (typeof navigator === "undefined") return "Unknown Client";
  const ua = navigator.userAgent;
  let browser = "Browser";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";

  let os = "Device";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  return `${browser} on ${os}`;
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "dev_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export const syncMetadata = {
  /**
   * Retrieves or initializes the persistent device metadata.
   */
  async get(): Promise<SyncMetadataState> {
    try {
      const db = await openDatabase();
      return new Promise((resolve) => {
        const tx = db.transaction("syncState", "readonly");
        const store = tx.objectStore("syncState");
        const req = store.get("device_meta");

        req.onsuccess = () => {
          const existing = req.result?.value as SyncMetadataState | undefined;
          if (existing && existing.deviceId) {
            resolve(existing);
          } else {
            // Initialize new device identity
            const initialized: SyncMetadataState = {
              deviceId: generateUUID(),
              deviceName: detectDeviceName(),
              clientVersion: "1.0.0",
              lastSyncTimestamp: null,
              cloudSyncEnabled: false
            };
            syncMetadata.save(initialized).then(() => resolve(initialized));
          }
        };

        req.onerror = () => resolve({ ...DEFAULT_METADATA, deviceId: generateUUID() });
      });
    } catch {
      return { ...DEFAULT_METADATA, deviceId: generateUUID() };
    }
  },

  /**
   * Saves updated sync metadata.
   */
  async save(state: SyncMetadataState): Promise<void> {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("syncState", "readwrite");
      const store = tx.objectStore("syncState");
      const req = store.put({ key: "device_meta", value: state });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error ?? new Error("Failed to save sync metadata"));
    });
  },

  /**
   * Updates only the last server sync timestamp cursor.
   */
  async updateCursor(serverTimestamp: string): Promise<void> {
    const current = await this.get();
    current.lastSyncTimestamp = serverTimestamp;
    await this.save(current);
  },

  /**
   * Enables or disables cloud sync locally.
   */
  async setCloudSyncEnabled(enabled: boolean): Promise<void> {
    const current = await this.get();
    current.cloudSyncEnabled = enabled;
    await this.save(current);
  }
};
