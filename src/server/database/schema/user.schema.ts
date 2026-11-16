export interface FoodCueUserRecord {
  id: string;
  userId: string;
  clerkUserId: string;
  email: string | null;
  displayName: string | null;
  username: string | null;
  isAnonymous: boolean;
  deviceFingerprint: string | null;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
  deletedAt: string | null;
}

export interface CreateUserData {
  clerkUserId: string;
  email?: string | null;
  displayName?: string | null;
  username?: string | null;
  isAnonymous?: boolean;
  deviceFingerprint?: string | null;
}

export interface UpdateUserData {
  displayName?: string | null;
  username?: string | null;
  email?: string | null;
}

export interface PublicUserProfile {
  id: string;
  clerkUserId: string;
  email: string | null;
  displayName: string | null;
  username: string | null;
  createdAt: string;
}

/**
 * Maps a raw database row from foodcue_users to a typed FoodCueUserRecord
 */
export function mapRowToUserRecord(row: Record<string, unknown>): FoodCueUserRecord {
  const id = String(row.id || row.user_id || "");
  const userId = String(row.user_id || row.id || "");
  const clerkUserId = String(row.clerk_user_id || row.clerk_id || "");

  return {
    id,
    userId,
    clerkUserId,
    email: row.email ? String(row.email) : null,
    displayName: row.display_name ? String(row.display_name) : null,
    username: row.username ? String(row.username) : null,
    isAnonymous: Boolean(row.is_anonymous),
    deviceFingerprint: row.device_fingerprint ? String(row.device_fingerprint) : null,
    createdAt: row.created_at ? new Date(String(row.created_at)).toISOString() : new Date().toISOString(),
    updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : new Date().toISOString(),
    lastActiveAt: row.last_active_at ? new Date(String(row.last_active_at)).toISOString() : new Date().toISOString(),
    deletedAt: row.deleted_at ? new Date(String(row.deleted_at)).toISOString() : null
  };
}

/**
 * Transforms a FoodCueUserRecord into the safe public user-profile format for /api/me
 */
export function toPublicUserProfile(record: FoodCueUserRecord): PublicUserProfile {
  return {
    id: record.id,
    clerkUserId: record.clerkUserId,
    email: record.email,
    displayName: record.displayName,
    username: record.username,
    createdAt: record.createdAt
  };
}
