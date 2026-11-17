/**
 * FoodCue Reactive Sync State Store
 * Provides subscribers with current sync status, pending count, and consumer-friendly labels.
 * Controlling Authority: FoodCue Brand Guidelines v1.0 & Master Spec v13.5
 */

import type { SyncEngineState, SyncStatusType } from "../types/syncContracts";

type StateListener = (state: SyncEngineState) => void;

class SyncStatusStore {
  private state: SyncEngineState = {
    status: "idle",
    pendingCount: 0,
    lastSyncTime: null,
    lastError: null,
    deviceId: null,
    isCloudEnabled: false
  };

  private listeners = new Set<StateListener>();

  getState(): SyncEngineState {
    return { ...this.state };
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const current = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(current);
      } catch {
        // Listener error resilience
      }
    }
  }

  updateState(partial: Partial<SyncEngineState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  setStatus(status: SyncStatusType, error?: string): void {
    this.state.status = status;
    if (error !== undefined) {
      this.state.lastError = error;
    }
    this.notify();
  }

  setPendingCount(count: number): void {
    this.state.pendingCount = count;
    this.notify();
  }

  setLastSyncTime(time: string): void {
    this.state.lastSyncTime = time;
    this.notify();
  }

  /**
   * Returns a consumer-grade, non-technical status label for user display.
   */
  getConsumerLabel(): { text: string; variant: "success" | "warning" | "neutral" | "syncing" } {
    if (!this.state.isCloudEnabled) {
      return { text: "Stored locally on device", variant: "neutral" };
    }

    if (this.state.status === "syncing") {
      return { text: "Syncing changes...", variant: "syncing" };
    }

    if (this.state.status === "offline") {
      if (this.state.pendingCount > 0) {
        return {
          text: `${this.state.pendingCount} item${this.state.pendingCount > 1 ? "s" : ""} waiting to sync`,
          variant: "warning"
        };
      }
      return { text: "Offline — saved on device", variant: "neutral" };
    }

    if (this.state.status === "error") {
      return { text: "Sync paused — will retry", variant: "warning" };
    }

    if (this.state.pendingCount > 0) {
      return {
        text: `${this.state.pendingCount} change${this.state.pendingCount > 1 ? "s" : ""} waiting to sync`,
        variant: "warning"
      };
    }

    return { text: "All synced to cloud", variant: "success" };
  }
}

export const syncStatus = new SyncStatusStore();
