import { query } from "../client";

export interface WebhookEventRecord {
  eventId: string;
  eventType: string;
  status: "received" | "processed" | "failed" | "duplicate";
  payload?: Record<string, unknown>;
  error?: string;
  receivedAt?: string;
}

export const webhookRepository = {
  /**
   * Attempts to claim a webhook event for processing.
   * Returns true if the event is new and successfully claimed;
   * returns false if the event has already been registered (duplicate/replay).
   */
  async claimEvent(eventId: string, eventType: string, payload: Record<string, unknown>): Promise<boolean> {
    try {
      const rows = await query<{ event_id: string }>(
        `
        INSERT INTO foodcue_webhook_events (event_id, event_type, status, payload, received_at)
        VALUES ($1, $2, 'received', $3, CURRENT_TIMESTAMP)
        ON CONFLICT (event_id) DO NOTHING
        RETURNING event_id;
        `,
        [eventId, eventType, JSON.stringify(payload)]
      );

      return rows.length > 0;
    } catch {
      // If table does not exist yet (before migration 002 is run), allow processing with warning
      return true;
    }
  },

  /**
   * Updates the final processing status of a webhook event.
   */
  async markStatus(eventId: string, status: "processed" | "failed", errorMessage?: string): Promise<void> {
    try {
      await query(
        `
        UPDATE foodcue_webhook_events
        SET status = $2, error = $3
        WHERE event_id = $1;
        `,
        [eventId, status, errorMessage ?? null]
      );
    } catch {
      // Best-effort status update
    }
  },

  /**
   * Checks if an event ID has already been recorded.
   */
  async hasEvent(eventId: string): Promise<boolean> {
    try {
      const rows = await query<{ event_id: string }>(
        `SELECT event_id FROM foodcue_webhook_events WHERE event_id = $1;`,
        [eventId]
      );
      return rows.length > 0;
    } catch {
      return false;
    }
  }
};
