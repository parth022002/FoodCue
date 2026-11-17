/**
 * FoodCue Multi-Device Synchronisation Contracts
 * Controlling Baseline: FoodCue Master Specification v13.5 §12
 */

export type SyncEntityType =
  | "pantry_event"
  | "pantry_item"
  | "shopping_item"
  | "confirmed_label"
  | "profile_settings";

export type SyncOperationType = "create" | "update" | "delete" | "append_event";

export type SyncItemStatus = "pending" | "in_flight" | "completed" | "failed";

export interface SyncOperation {
  id: string; // Local queue UUID
  entityType: SyncEntityType;
  entityId: string;
  operationType: SyncOperationType;
  payload: Record<string, unknown>;
  clientTimestamp: string;
  idempotencyKey: string;
  status: SyncItemStatus;
  retryCount: number;
  lastError?: string;
  createdAt: string;
}

export interface SyncBatchPushPayload {
  deviceId: string;
  deviceName: string;
  clientVersion: string;
  operations: Array<{
    idempotencyKey: string;
    entityType: SyncEntityType;
    entityId: string;
    operationType: SyncOperationType;
    payload: Record<string, unknown>;
    clientTimestamp: string;
  }>;
}

export interface SyncPushResult {
  success: boolean;
  processedCount: number;
  serverTimestamp: string;
  errors?: string[];
}

export interface SyncPullResult {
  serverTimestamp: string;
  operations: Array<{
    operationId: string;
    deviceId: string | null;
    entityType: SyncEntityType;
    entityId: string;
    operationType: SyncOperationType;
    payload: Record<string, unknown>;
    clientTimestamp: string;
    serverTimestamp: string;
  }>;
  hasMore: boolean;
}

export interface SyncDeviceRecord {
  deviceId: string;
  deviceName: string;
  clientVersion: string;
  userAgent?: string;
  lastSyncAt: string;
  isCurrent: boolean;
  isRevoked: boolean;
  createdAt: string;
}

export interface MigrationSnapshot {
  pantryEvents: unknown[];
  confirmedLabels: unknown[];
  shoppingItems: unknown[];
  settings: Record<string, unknown>;
}

export interface MigrationResult {
  migrated: boolean;
  counts: {
    pantryEvents: number;
    confirmedLabels: number;
    shoppingItems: number;
  };
  serverTimestamp: string;
}

export type SyncStatusType = "idle" | "syncing" | "offline" | "error" | "unauthenticated";

export interface SyncEngineState {
  status: SyncStatusType;
  pendingCount: number;
  lastSyncTime: string | null;
  lastError: string | null;
  deviceId: string | null;
  isCloudEnabled: boolean;
}
