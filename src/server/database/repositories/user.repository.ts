import { query } from "../client";
import {
  type FoodCueUserRecord,
  type CreateUserData,
  type UpdateUserData,
  mapRowToUserRecord
} from "../schema/user.schema";
import { NotFoundError } from "../../errors/appErrors";

export class UserRepository {
  /**
   * Finds a user by internal FoodCue ID / UUID.
   */
  async findById(id: string): Promise<FoodCueUserRecord | null> {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM foodcue_users WHERE (id::text = $1 OR user_id = $1) LIMIT 1;`,
      [id]
    );

    if (!rows[0]) return null;
    return mapRowToUserRecord(rows[0]);
  }

  /**
   * Finds a user by verified Clerk user ID (e.g. user_xxx).
   * By default, filters out soft-deleted users.
   */
  async findByClerkUserId(clerkUserId: string, includeDeleted = false): Promise<FoodCueUserRecord | null> {
    const sqlText = includeDeleted
      ? `SELECT * FROM foodcue_users WHERE (clerk_user_id = $1 OR clerk_id = $1) LIMIT 1;`
      : `SELECT * FROM foodcue_users WHERE (clerk_user_id = $1 OR clerk_id = $1) AND deleted_at IS NULL LIMIT 1;`;

    const rows = await query<Record<string, unknown>>(sqlText, [clerkUserId]);

    if (!rows[0]) return null;
    return mapRowToUserRecord(rows[0]);
  }

  /**
   * Idempotently creates a new FoodCue user mapped to a verified Clerk user ID.
   * If a record already exists with the same clerkUserId, returns the existing record.
   */
  async create(data: CreateUserData): Promise<FoodCueUserRecord> {
    const rows = await query<Record<string, unknown>>(
      `
      INSERT INTO foodcue_users (
        user_id,
        clerk_user_id,
        clerk_id,
        email,
        display_name,
        username,
        is_anonymous,
        device_fingerprint,
        created_at,
        updated_at,
        last_active_at
      ) VALUES (
        $1::varchar, $1::text, $1::varchar, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT (clerk_user_id) DO UPDATE SET
        email = COALESCE(EXCLUDED.email, foodcue_users.email),
        display_name = COALESCE(EXCLUDED.display_name, foodcue_users.display_name),
        username = COALESCE(EXCLUDED.username, foodcue_users.username),
        updated_at = CURRENT_TIMESTAMP,
        last_active_at = CURRENT_TIMESTAMP,
        deleted_at = NULL
      RETURNING *;
    `,
      [
        data.clerkUserId,
        data.email ?? null,
        data.displayName ?? null,
        data.username ?? null,
        data.isAnonymous ?? false,
        data.deviceFingerprint ?? null
      ]
    );

    const record = rows[0];
    if (!record) {
      throw new Error("Failed to insert or retrieve user record");
    }

    return mapRowToUserRecord(record);
  }

  /**
   * Updates permitted profile fields for an authenticated user.
   */
  async updateProfile(clerkUserId: string, data: UpdateUserData): Promise<FoodCueUserRecord> {
    const existing = await this.findByClerkUserId(clerkUserId);
    if (!existing) {
      throw new NotFoundError(`User with Clerk ID ${clerkUserId} not found.`);
    }

    const rows = await query<Record<string, unknown>>(
      `
      UPDATE foodcue_users
      SET
        display_name = COALESCE($2, display_name),
        username = COALESCE($3, username),
        email = COALESCE($4, email),
        updated_at = CURRENT_TIMESTAMP,
        last_active_at = CURRENT_TIMESTAMP
      WHERE (clerk_user_id = $1 OR clerk_id = $1)
      RETURNING *;
    `,
      [
        clerkUserId,
        data.displayName !== undefined ? data.displayName : null,
        data.username !== undefined ? data.username : null,
        data.email !== undefined ? data.email : null
      ]
    );

    const updated = rows[0];
    if (!updated) {
      throw new NotFoundError("User record update failed.");
    }

    return mapRowToUserRecord(updated);
  }

  /**
   * Soft-deletes a user account by setting deleted_at = CURRENT_TIMESTAMP.
   */
  async markDeleted(clerkUserId: string): Promise<boolean> {
    const rows = await query<{ row_count: number }>(
      `
      UPDATE foodcue_users
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE (clerk_user_id = $1 OR clerk_id = $1) AND deleted_at IS NULL
      RETURNING 1 as row_count;
    `,
      [clerkUserId]
    );

    return rows.length > 0;
  }

  /**
   * Restores a soft-deleted user account by clearing deleted_at.
   */
  async restore(clerkUserId: string): Promise<boolean> {
    const rows = await query<{ row_count: number }>(
      `
      UPDATE foodcue_users
      SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE (clerk_user_id = $1 OR clerk_id = $1) AND deleted_at IS NOT NULL
      RETURNING 1 as row_count;
    `,
      [clerkUserId]
    );

    return rows.length > 0;
  }

  /**
   * Updates last_active_at timestamp for telemetry/presence.
   */
  async updateLastActive(clerkUserId: string): Promise<void> {
    await query(
      `UPDATE foodcue_users SET last_active_at = CURRENT_TIMESTAMP WHERE (clerk_user_id = $1 OR clerk_id = $1);`,
      [clerkUserId]
    );
  }
}

export const userRepository = new UserRepository();
