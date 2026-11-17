/**
 * FoodCue Sync API Client
 * Transmits queued sync batches and pulls deltas using Clerk Bearer token authorization.
 */

import type {
  SyncBatchPushPayload,
  SyncPushResult,
  SyncPullResult,
  SyncDeviceRecord,
  MigrationSnapshot,
  MigrationResult
} from "../types/syncContracts";

export class SyncApiClient {
  private getToken: () => Promise<string | null>;

  constructor(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const token = await this.getToken();
    if (!token) {
      throw new Error("Authentication required: no active Clerk session token.");
    }
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    };
  }

  /**
   * Pushes a batch of locally queued operations to the cloud.
   */
  async pushBatch(batch: SyncBatchPushPayload): Promise<SyncPushResult> {
    const headers = await this.getAuthHeaders();
    const res = await fetch("/api/sync/push", {
      method: "POST",
      headers,
      body: JSON.stringify(batch)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Push sync failed" }));
      throw new Error(err.error || `Push sync failed with HTTP ${res.status}`);
    }

    return (await res.json()) as SyncPushResult;
  }

  /**
   * Pulls delta operations from the cloud since cursor timestamp.
   */
  async pullDelta(cursorTimestamp: string | null): Promise<SyncPullResult> {
    const headers = await this.getAuthHeaders();
    const url = cursorTimestamp
      ? `/api/sync/pull?since=${encodeURIComponent(cursorTimestamp)}`
      : `/api/sync/pull`;

    const res = await fetch(url, {
      method: "GET",
      headers
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Pull sync failed" }));
      throw new Error(err.error || `Pull sync failed with HTTP ${res.status}`);
    }

    return (await res.json()) as SyncPullResult;
  }

  /**
   * Migrates initial local IndexedDB snapshot to the cloud.
   */
  async migrateLocalData(snapshot: MigrationSnapshot): Promise<MigrationResult> {
    const headers = await this.getAuthHeaders();
    const res = await fetch("/api/sync/migrate", {
      method: "POST",
      headers,
      body: JSON.stringify(snapshot)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Local-to-cloud migration failed" }));
      throw new Error(err.error || `Migration failed with HTTP ${res.status}`);
    }

    return (await res.json()) as MigrationResult;
  }

  /**
   * Lists all registered devices for the current user.
   */
  async listDevices(): Promise<SyncDeviceRecord[]> {
    const headers = await this.getAuthHeaders();
    const res = await fetch("/api/devices", {
      method: "GET",
      headers
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return (data.devices as SyncDeviceRecord[]) || [];
  }

  /**
   * Registers or heartbeats the current client device.
   */
  async registerDevice(device: {
    deviceId: string;
    deviceName: string;
    clientVersion: string;
  }): Promise<void> {
    const headers = await this.getAuthHeaders();
    await fetch("/api/devices", {
      method: "POST",
      headers,
      body: JSON.stringify(device)
    });
  }

  /**
   * Revokes a device session.
   */
  async revokeDevice(deviceId: string): Promise<boolean> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/devices?deviceId=${encodeURIComponent(deviceId)}`, {
      method: "DELETE",
      headers
    });

    return res.ok;
  }

  /**
   * Retrieves cloud synchronization status from /api/sync/status.
   */
  async getStatus(): Promise<{
    syncEnabled: boolean;
    activeDevicesCount: number;
    lastSuccessfulSync: string | null;
    currentCursor: string | null;
    totalOperations: number;
    cloudRecordCounts: {
      pantryEvents: number;
      confirmedLabels: number;
      shoppingItems: number;
    };
    serverTimestamp: string;
  }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch("/api/sync/status", {
      method: "GET",
      headers
    });

    if (!res.ok) {
      throw new Error(`Failed to retrieve sync status (HTTP ${res.status})`);
    }

    return await res.json();
  }

  /**
   * Permanently deletes all cloud data associated with the user.
   */
  async deleteCloudData(): Promise<{ success: boolean; message: string }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch("/api/sync/deleteCloudData", {
      method: "POST",
      headers
    });

    if (!res.ok) {
      throw new Error(`Failed to delete cloud data (HTTP ${res.status})`);
    }

    return await res.json();
  }
}
