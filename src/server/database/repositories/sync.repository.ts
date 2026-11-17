/**
 * FoodCue Cloud Sync & Device Repository
 * Handles atomic operations on sync_devices, sync_operations, and cloud entity tables.
 * Controlling Authority: FoodCue Master Specification v13.5 §12 & §15
 */

import { query } from "../client";

export interface SyncDeviceEntity {
  deviceId: string;
  clerkUserId: string;
  deviceName: string;
  clientVersion: string;
  userAgent?: string;
  lastSyncAt: string;
  isRevoked: boolean;
  createdAt: string;
}

export interface SyncOperationEntity {
  idempotencyKey: string;
  entityType: string;
  entityId: string;
  operationType: string;
  payload: Record<string, unknown>;
  clientTimestamp: string;
}

export const syncRepository = {
  /**
   * Registers or updates a client device's heartbeat and checks if revoked.
   */
  async upsertDevice(device: {
    deviceId: string;
    clerkUserId: string;
    deviceName: string;
    clientVersion?: string;
    userAgent?: string;
  }): Promise<{ isRevoked: boolean }> {
    const rows = await query<{ is_revoked: boolean }>(
      `
      INSERT INTO sync_devices (device_id, clerk_user_id, device_name, client_version, user_agent, last_sync_at, is_revoked)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, FALSE)
      ON CONFLICT (device_id) DO UPDATE
      SET 
        device_name = EXCLUDED.device_name,
        client_version = EXCLUDED.client_version,
        user_agent = EXCLUDED.user_agent,
        last_sync_at = CURRENT_TIMESTAMP
      RETURNING is_revoked;
      `,
      [
        device.deviceId,
        device.clerkUserId,
        device.deviceName,
        device.clientVersion || "1.0.0",
        device.userAgent || null
      ]
    );

    return { isRevoked: rows[0]?.is_revoked ?? false };
  },

  /**
   * Checks if a device has been revoked by the user.
   */
  async isDeviceRevoked(deviceId: string, clerkUserId: string): Promise<boolean> {
    const rows = await query<{ is_revoked: boolean }>(
      `SELECT is_revoked FROM sync_devices WHERE device_id = $1 AND clerk_user_id = $2;`,
      [deviceId, clerkUserId]
    );
    return rows[0]?.is_revoked ?? false;
  },

  /**
   * Lists all devices associated with the user.
   */
  async listDevices(clerkUserId: string): Promise<SyncDeviceEntity[]> {
    const rows = await query<{
      device_id: string;
      clerk_user_id: string;
      device_name: string;
      client_version: string;
      user_agent: string | null;
      last_sync_at: string;
      is_revoked: boolean;
      created_at: string;
    }>(
      `
      SELECT device_id, clerk_user_id, device_name, client_version, user_agent, last_sync_at, is_revoked, created_at
      FROM sync_devices
      WHERE clerk_user_id = $1
      ORDER BY last_sync_at DESC;
      `,
      [clerkUserId]
    );

    return rows.map((r) => ({
      deviceId: r.device_id,
      clerkUserId: r.clerk_user_id,
      deviceName: r.device_name,
      clientVersion: r.client_version,
      userAgent: r.user_agent || undefined,
      lastSyncAt: r.last_sync_at,
      isRevoked: r.is_revoked,
      createdAt: r.created_at
    }));
  },

  /**
   * Revokes a device.
   */
  async revokeDevice(deviceId: string, clerkUserId: string): Promise<boolean> {
    const rows = await query<{ device_id: string }>(
      `
      UPDATE sync_devices
      SET is_revoked = TRUE
      WHERE device_id = $1 AND clerk_user_id = $2
      RETURNING device_id;
      `,
      [deviceId, clerkUserId]
    );
    return rows.length > 0;
  },

  /**
   * Ingests a push batch of operations atomically with idempotency.
   */
  async processPushBatch(
    clerkUserId: string,
    deviceId: string,
    operations: SyncOperationEntity[]
  ): Promise<{ processed: number; duplicates: number }> {
    let processed = 0;
    let duplicates = 0;

    for (const op of operations) {
      // 1. Record sync_operation with unique idempotency_key
      const inserted = await query<{ operation_id: string }>(
        `
        INSERT INTO sync_operations (
          clerk_user_id, device_id, entity_type, entity_id, operation_type, payload, client_timestamp, idempotency_key
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING operation_id;
        `,
        [
          clerkUserId,
          deviceId,
          op.entityType,
          op.entityId,
          op.operationType,
          JSON.stringify(op.payload),
          op.clientTimestamp,
          op.idempotencyKey
        ]
      );

      if (inserted.length === 0) {
        duplicates++;
        continue;
      }

      processed++;

      // 2. Project into entity tables
      if (op.entityType === "pantry_event" && op.payload) {
        const p = op.payload as {
          eventId?: string;
          itemId?: string;
          eventType?: string;
          quantityDelta?: number;
          unit?: string;
          location?: string;
          dateType?: string;
          dateValue?: string;
          note?: string;
          occurredAt?: string;
        };

        if (p.eventId && p.itemId && p.eventType) {
          await query(
            `
            INSERT INTO foodcue_pantry_events (
              event_id, item_id, user_id, clerk_user_id, event_type, quantity_delta, unit, location, date_type, date_value, note, occurred_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (event_id) DO NOTHING;
            `,
            [
              p.eventId,
              p.itemId,
              clerkUserId,
              clerkUserId,
              p.eventType,
              p.quantityDelta ?? 0,
              p.unit || "pack",
              p.location || null,
              p.dateType || null,
              p.dateValue || null,
              p.note || null,
              p.occurredAt || op.clientTimestamp
            ]
          );
        }
      } else if (op.entityType === "confirmed_label" && op.payload) {
        const l = op.payload as {
          confirmedLabelId?: string;
          candidateId?: string;
          gtin?: string;
          physicalIdentity?: string;
          labelVersion?: string;
          lotNumber?: string;
          dateMarkingType?: string;
          dateMarkingValue?: string;
          panels?: unknown;
          rawOcrEvidence?: unknown;
          fieldStates?: unknown;
          contentHash?: string;
          confirmedAt?: string;
        };

        if (l.confirmedLabelId && l.physicalIdentity) {
          await query(
            `
            INSERT INTO foodcue_confirmed_labels (
              label_id, candidate_id, gtin, user_id, clerk_user_id, physical_identity, label_version,
              lot_number, date_marking_type, date_marking_value, panels, raw_ocr_evidence, field_states, content_hash, confirmed_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (label_id) DO NOTHING;
            `,
            [
              l.confirmedLabelId,
              l.candidateId || l.confirmedLabelId,
              l.gtin || null,
              clerkUserId,
              clerkUserId,
              l.physicalIdentity,
              l.labelVersion || "1.0",
              l.lotNumber || null,
              l.dateMarkingType || null,
              l.dateMarkingValue || null,
              JSON.stringify(l.panels || {}),
              JSON.stringify(l.rawOcrEvidence || {}),
              JSON.stringify(l.fieldStates || {}),
              l.contentHash || null,
              l.confirmedAt || op.clientTimestamp
            ]
          );
        }
      } else if (op.entityType === "shopping_item" && op.payload) {
        const s = op.payload as {
          listItemId?: string;
          productName?: string;
          brand?: string;
          category?: string;
          requestedQuantity?: number;
          unit?: string;
          checked?: boolean;
          notes?: string;
          isDeleted?: boolean;
        };

        if (s.listItemId && s.productName) {
          if (s.isDeleted) {
            await query(
              `DELETE FROM foodcue_shopping_list WHERE list_item_id = $1 AND clerk_user_id = $2;`,
              [s.listItemId, clerkUserId]
            );
          } else {
            await query(
              `
              INSERT INTO foodcue_shopping_list (
                list_item_id, user_id, clerk_user_id, product_name, brand, category, requested_quantity, unit, checked, notes, updated_at
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
              ON CONFLICT (list_item_id) DO UPDATE
              SET
                product_name = EXCLUDED.product_name,
                brand = EXCLUDED.brand,
                category = EXCLUDED.category,
                requested_quantity = EXCLUDED.requested_quantity,
                unit = EXCLUDED.unit,
                checked = EXCLUDED.checked,
                notes = EXCLUDED.notes,
                updated_at = CURRENT_TIMESTAMP;
              `,
              [
                s.listItemId,
                clerkUserId,
                clerkUserId,
                s.productName,
                s.brand || null,
                s.category || "General",
                s.requestedQuantity ?? 1,
                s.unit || "pack",
                Boolean(s.checked),
                s.notes || null
              ]
            );
          }
        }
      }
    }

    return { processed, duplicates };
  },

  /**
   * Pulls operations for a user since a given server timestamp cursor.
   */
  async pullOperationsSince(
    clerkUserId: string,
    sinceTimestamp: string | null,
    limit = 100
  ): Promise<Array<{
    operationId: string;
    deviceId: string | null;
    entityType: string;
    entityId: string;
    operationType: string;
    payload: Record<string, unknown>;
    clientTimestamp: string;
    serverTimestamp: string;
  }>> {
    let sql: string;
    let params: unknown[];

    if (sinceTimestamp) {
      sql = `
        SELECT operation_id, device_id, entity_type, entity_id, operation_type, payload, client_timestamp, server_timestamp
        FROM sync_operations
        WHERE clerk_user_id = $1 AND server_timestamp > $2
        ORDER BY server_timestamp ASC
        LIMIT $3;
      `;
      params = [clerkUserId, sinceTimestamp, limit];
    } else {
      sql = `
        SELECT operation_id, device_id, entity_type, entity_id, operation_type, payload, client_timestamp, server_timestamp
        FROM sync_operations
        WHERE clerk_user_id = $1
        ORDER BY server_timestamp ASC
        LIMIT $2;
      `;
      params = [clerkUserId, limit];
    }

    const rows = await query<{
      operation_id: string;
      device_id: string | null;
      entity_type: string;
      entity_id: string;
      operation_type: string;
      payload: Record<string, unknown>;
      client_timestamp: string;
      server_timestamp: string;
    }>(sql, params);

    return rows.map((r) => ({
      operationId: r.operation_id,
      deviceId: r.device_id,
      entityType: r.entity_type,
      entityId: r.entity_id,
      operationType: r.operation_type,
      payload: r.payload,
      clientTimestamp: r.client_timestamp,
      serverTimestamp: r.server_timestamp
    }));
  },

  /**
   * Ingests an initial local data snapshot during Migration Wizard completion.
   */
  async migrateSnapshot(
    clerkUserId: string,
    snapshot: {
      pantryEvents?: Array<Record<string, unknown>>;
      confirmedLabels?: Array<Record<string, unknown>>;
      shoppingItems?: Array<Record<string, unknown>>;
    }
  ): Promise<{ pantryEvents: number; confirmedLabels: number; shoppingItems: number }> {
    let pCount = 0;
    let lCount = 0;
    let sCount = 0;

    // 1. Pantry Events
    if (snapshot.pantryEvents && Array.isArray(snapshot.pantryEvents)) {
      for (const p of snapshot.pantryEvents) {
        if (p.eventId && p.itemId && p.eventType) {
          await query(
            `
            INSERT INTO foodcue_pantry_events (
              event_id, item_id, user_id, clerk_user_id, event_type, quantity_delta, unit, location, date_type, date_value, note, occurred_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT (event_id) DO NOTHING;
            `,
            [
              p.eventId,
              p.itemId,
              clerkUserId,
              clerkUserId,
              p.eventType,
              p.quantityDelta ?? 0,
              p.unit || "pack",
              p.location || null,
              p.dateType || null,
              p.dateValue || null,
              p.note || null,
              p.occurredAt || new Date().toISOString()
            ]
          );
          pCount++;
        }
      }
    }

    // 2. Confirmed Labels
    if (snapshot.confirmedLabels && Array.isArray(snapshot.confirmedLabels)) {
      for (const l of snapshot.confirmedLabels) {
        if (l.confirmedLabelId && l.physicalIdentity) {
          await query(
            `
            INSERT INTO foodcue_confirmed_labels (
              label_id, candidate_id, gtin, user_id, clerk_user_id, physical_identity, label_version,
              lot_number, date_marking_type, date_marking_value, panels, raw_ocr_evidence, field_states, content_hash, confirmed_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            ON CONFLICT (label_id) DO NOTHING;
            `,
            [
              l.confirmedLabelId,
              l.candidateId || l.confirmedLabelId,
              l.gtin || null,
              clerkUserId,
              clerkUserId,
              l.physicalIdentity,
              l.labelVersion || "1.0",
              l.lotNumber || null,
              l.dateMarkingType || null,
              l.dateMarkingValue || null,
              JSON.stringify(l.panels || {}),
              JSON.stringify(l.rawOcrEvidence || {}),
              JSON.stringify(l.fieldStates || {}),
              l.contentHash || null,
              l.confirmedAt || new Date().toISOString()
            ]
          );
          lCount++;
        }
      }
    }

    // 3. Shopping Items
    if (snapshot.shoppingItems && Array.isArray(snapshot.shoppingItems)) {
      for (const s of snapshot.shoppingItems) {
        if (s.listItemId && s.productName) {
          await query(
            `
            INSERT INTO foodcue_shopping_list (
              list_item_id, user_id, clerk_user_id, product_name, brand, category, requested_quantity, unit, checked, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (list_item_id) DO NOTHING;
            `,
            [
              s.listItemId,
              clerkUserId,
              clerkUserId,
              s.productName,
              s.brand || null,
              s.category || "General",
              s.requestedQuantity ?? 1,
              s.unit || "pack",
              Boolean(s.checked),
              s.notes || null
            ]
          );
          sCount++;
        }
      }
    }

    return { pantryEvents: pCount, confirmedLabels: lCount, shoppingItems: sCount };
  }
};
