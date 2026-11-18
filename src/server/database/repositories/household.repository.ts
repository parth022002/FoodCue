import { query } from "../client";
import { ForbiddenError, NotFoundError } from "../../errors/appErrors";

export type HouseholdMemberRole = "owner" | "admin" | "member" | "viewer";

export interface HouseholdRecord {
  id: string;
  name: string;
  description: string | null;
  householdType: string;
  location: string | null;
  ownerClerkUserId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdMemberWithProfile {
  id: string;
  householdId: string;
  clerkUserId: string;
  role: HouseholdMemberRole;
  membershipStatus: string;
  joinedAt: string;
  fullName: string;
  profileImageUrl: string | null;
  sharedAllergies?: string[];
  sharedDietaryPattern?: string;
}

export interface HouseholdInvitationRecord {
  id: string;
  householdId: string;
  householdName?: string;
  invitedByClerkUserId: string;
  inviteeEmail: string;
  invitationTokenHash: string;
  role: HouseholdMemberRole;
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: string;
  acceptedByClerkUserId: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface HouseholdSharingPreferenceRecord {
  id: string;
  clerkUserId: string;
  householdId: string;
  informationCategory: string;
  sharingEnabled: boolean;
  updatedAt: string;
}

export class HouseholdRepository {
  /**
   * Creates a new household and automatically adds the creator as "owner"
   */
  async createHousehold(data: {
    name: string;
    description?: string | null;
    householdType?: string;
    location?: string | null;
    ownerClerkUserId: string;
  }): Promise<HouseholdRecord> {
    const rows = await query<Record<string, unknown>>(
      `
      INSERT INTO households (
        name,
        description,
        household_type,
        location,
        owner_clerk_user_id,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `,
      [
        data.name.trim(),
        data.description || null,
        data.householdType || "Family",
        data.location || null,
        data.ownerClerkUserId
      ]
    );

    const record = rows[0];
    if (!record) {
      throw new Error("Failed to create household");
    }

    const household = this.mapRowToHousehold(record);

    // Automatically add owner to household_members
    await query(
      `
      INSERT INTO household_members (
        household_id,
        clerk_user_id,
        role,
        membership_status,
        joined_at,
        created_at,
        updated_at
      ) VALUES ($1, $2, 'owner', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (household_id, clerk_user_id) DO UPDATE SET role = 'owner';
    `,
      [household.id, data.ownerClerkUserId]
    );

    // Audit log
    await query(
      `
      INSERT INTO audit_logs (actor_clerk_user_id, household_id, action, entity_type, entity_id)
      VALUES ($1, $2, 'CREATE_HOUSEHOLD', 'household', $2);
    `,
      [data.ownerClerkUserId, household.id]
    );

    return household;
  }

  /**
   * Retrieves a household by ID
   */
  async findById(householdId: string): Promise<HouseholdRecord | null> {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM households WHERE id = $1 AND status = 'active' LIMIT 1;`,
      [householdId]
    );

    if (!rows[0]) return null;
    return this.mapRowToHousehold(rows[0]);
  }

  /**
   * Lists all households a user belongs to
   */
  async listUserHouseholds(clerkUserId: string): Promise<Array<HouseholdRecord & { userRole: HouseholdMemberRole; memberCount: number }>> {
    const rows = await query<Record<string, unknown>>(
      `
      SELECT 
        h.*,
        m.role as user_role,
        (SELECT COUNT(*) FROM household_members hm WHERE hm.household_id = h.id AND hm.membership_status = 'active') as member_count
      FROM households h
      INNER JOIN household_members m ON h.id = m.household_id
      WHERE m.clerk_user_id = $1 AND m.membership_status = 'active' AND h.status = 'active'
      ORDER BY h.created_at DESC;
    `,
      [clerkUserId]
    );

    return rows.map((r) => ({
      ...this.mapRowToHousehold(r),
      userRole: (r.user_role as HouseholdMemberRole) || "member",
      memberCount: Number(r.member_count || 1)
    }));
  }

  /**
   * Retrieves members for a household, respecting explicit sharing permissions
   */
  async getHouseholdMembers(
    householdId: string,
    requestingClerkUserId: string
  ): Promise<HouseholdMemberWithProfile[]> {
    // 1. Verify requesting user is a member
    const userRole = await this.getMemberRole(householdId, requestingClerkUserId);
    if (!userRole) {
      throw new ForbiddenError("You are not an authorized member of this household.");
    }

    // 2. Fetch active members with their profiles
    const rows = await query<Record<string, unknown>>(
      `
      SELECT 
        m.id,
        m.household_id,
        m.clerk_user_id,
        m.role,
        m.membership_status,
        m.joined_at,
        COALESCE(p.full_name, u.display_name, 'Family Member') as full_name,
        p.profile_image_url
      FROM household_members m
      LEFT JOIN user_profiles p ON m.clerk_user_id = p.clerk_user_id
      LEFT JOIN foodcue_users u ON m.clerk_user_id = u.clerk_user_id
      WHERE m.household_id = $1 AND m.membership_status = 'active'
      ORDER BY 
        CASE m.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 WHEN 'member' THEN 3 ELSE 4 END,
        m.joined_at ASC;
    `,
      [householdId]
    );

    // 3. For each member, check if they have explicitly enabled sharing for allergies/dietary preferences
    const members: HouseholdMemberWithProfile[] = [];
    for (const r of rows) {
      const memberClerkId = String(r.clerk_user_id);
      const isSelf = memberClerkId === requestingClerkUserId;

      // Check sharing preferences for this member in this household
      const sharingRows = await query<{ information_category: string; sharing_enabled: boolean }>(
        `
        SELECT information_category, sharing_enabled 
        FROM user_household_sharing_preferences 
        WHERE household_id = $1 AND clerk_user_id = $2;
      `,
        [householdId, memberClerkId]
      );

      const shareMap = new Map(sharingRows.map((s) => [s.information_category, s.sharing_enabled]));
      const canShareAllergies = isSelf || shareMap.get("allergies") === true;
      const canShareDiet = isSelf || shareMap.get("dietary_preferences") === true;

      let sharedAllergies: string[] | undefined;
      let sharedDiet: string | undefined;

      if (canShareAllergies) {
        const allergies = await query<{ allergen_name: string }>(
          `SELECT allergen_name FROM user_allergies WHERE clerk_user_id = $1;`,
          [memberClerkId]
        );
        sharedAllergies = allergies.map((a) => a.allergen_name);
      }

      if (canShareDiet) {
        const prefs = await query<{ preference_value: string }>(
          `SELECT preference_value FROM user_food_preferences WHERE clerk_user_id = $1 AND preference_type = 'dietary_pattern' LIMIT 1;`,
          [memberClerkId]
        );
        if (prefs[0]) sharedDiet = prefs[0].preference_value;
      }

      members.push({
        id: String(r.id),
        householdId: String(r.household_id),
        clerkUserId: memberClerkId,
        role: (r.role as HouseholdMemberRole) || "member",
        membershipStatus: String(r.membership_status),
        joinedAt: String(r.joined_at),
        fullName: String(r.full_name),
        profileImageUrl: r.profile_image_url ? String(r.profile_image_url) : null,
        sharedAllergies,
        sharedDietaryPattern: sharedDiet
      });
    }

    return members;
  }

  /**
   * Checks role of a user in a household
   */
  async getMemberRole(householdId: string, clerkUserId: string): Promise<HouseholdMemberRole | null> {
    const rows = await query<{ role: string }>(
      `
      SELECT role FROM household_members 
      WHERE household_id = $1 AND clerk_user_id = $2 AND membership_status = 'active'
      LIMIT 1;
    `,
      [householdId, clerkUserId]
    );

    if (!rows[0]) return null;
    return (rows[0].role as HouseholdMemberRole) || "member";
  }

  /**
   * Creates an invitation record with token hash
   */
  async createInvitation(data: {
    householdId: string;
    invitedByClerkUserId: string;
    inviteeEmail: string;
    tokenHash: string;
    role?: HouseholdMemberRole;
    expiresInDays?: number;
  }): Promise<HouseholdInvitationRecord> {
    const expiresInDays = data.expiresInDays || 7;
    const rows = await query<Record<string, unknown>>(
      `
      INSERT INTO household_invitations (
        household_id,
        invited_by_clerk_user_id,
        invitee_email,
        invitation_token_hash,
        role,
        status,
        expires_at,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_TIMESTAMP + ($6 || ' days')::interval, CURRENT_TIMESTAMP)
      RETURNING *;
    `,
      [
        data.householdId,
        data.invitedByClerkUserId,
        data.inviteeEmail.trim().toLowerCase(),
        data.tokenHash,
        data.role || "member",
        String(expiresInDays)
      ]
    );

    const record = rows[0];
    if (!record) {
      throw new Error("Failed to create invitation record");
    }

    return this.mapRowToInvitation(record);
  }

  /**
   * Finds an invitation by token hash and verifies validity
   */
  async findInvitationByTokenHash(tokenHash: string): Promise<HouseholdInvitationRecord | null> {
    const rows = await query<Record<string, unknown>>(
      `
      SELECT i.*, h.name as household_name
      FROM household_invitations i
      INNER JOIN households h ON i.household_id = h.id
      WHERE i.invitation_token_hash = $1
      LIMIT 1;
    `,
      [tokenHash]
    );

    if (!rows[0]) return null;
    return this.mapRowToInvitation(rows[0]);
  }

  /**
   * Accepts an invitation and provisions membership
   */
  async acceptInvitation(
    tokenHash: string,
    acceptingClerkUserId: string
  ): Promise<{ success: boolean; householdId: string; role: HouseholdMemberRole }> {
    const inv = await this.findInvitationByTokenHash(tokenHash);
    if (!inv) {
      throw new NotFoundError("Invitation not found or invalid token.");
    }

    if (inv.status !== "pending") {
      throw new ForbiddenError(`Invitation is no longer active (status: ${inv.status}).`);
    }

    if (new Date(inv.expiresAt).getTime() < Date.now()) {
      await query(`UPDATE household_invitations SET status = 'expired' WHERE id = $1;`, [inv.id]);
      throw new ForbiddenError("This invitation has expired.");
    }

    // Add user to household_members
    await query(
      `
      INSERT INTO household_members (
        household_id,
        clerk_user_id,
        role,
        membership_status,
        joined_at,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (household_id, clerk_user_id) DO UPDATE SET
        role = EXCLUDED.role,
        membership_status = 'active',
        updated_at = CURRENT_TIMESTAMP;
    `,
      [inv.householdId, acceptingClerkUserId, inv.role]
    );

    // Update invitation status
    await query(
      `
      UPDATE household_invitations 
      SET status = 'accepted', accepted_by_clerk_user_id = $2, accepted_at = CURRENT_TIMESTAMP
      WHERE id = $1;
    `,
      [inv.id, acceptingClerkUserId]
    );

    // Audit log
    await query(
      `
      INSERT INTO audit_logs (actor_clerk_user_id, household_id, action, entity_type, entity_id)
      VALUES ($1, $2, 'ACCEPT_INVITATION', 'invitation', $3);
    `,
      [acceptingClerkUserId, inv.householdId, inv.id]
    );

    return {
      success: true,
      householdId: inv.householdId,
      role: inv.role
    };
  }

  /**
   * Revokes an invitation (admin/owner only)
   */
  async revokeInvitation(invitationId: string, revokingClerkUserId: string): Promise<boolean> {
    const invRows = await query<{ household_id: string }>(
      `SELECT household_id FROM household_invitations WHERE id = $1 LIMIT 1;`,
      [invitationId]
    );

    if (!invRows[0]) throw new NotFoundError("Invitation not found.");

    const role = await this.getMemberRole(invRows[0].household_id, revokingClerkUserId);
    if (role !== "owner" && role !== "admin") {
      throw new ForbiddenError("Only household owners or admins can revoke invitations.");
    }

    await query(
      `UPDATE household_invitations SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP WHERE id = $1;`,
      [invitationId]
    );

    return true;
  }

  /**
   * Lists pending invitations for a household (admin/owner only)
   */
  async listHouseholdInvitations(
    householdId: string,
    requestingClerkUserId: string
  ): Promise<HouseholdInvitationRecord[]> {
    const role = await this.getMemberRole(householdId, requestingClerkUserId);
    if (role !== "owner" && role !== "admin") {
      return [];
    }

    const rows = await query<Record<string, unknown>>(
      `
      SELECT * FROM household_invitations 
      WHERE household_id = $1 AND status = 'pending' AND expires_at > CURRENT_TIMESTAMP
      ORDER BY created_at DESC;
    `,
      [householdId]
    );

    return rows.map((r) => this.mapRowToInvitation(r));
  }

  /**
   * Updates user sharing preference within a household
   */
  async setSharingPreference(
    householdId: string,
    clerkUserId: string,
    category: string,
    enabled: boolean
  ): Promise<void> {
    await query(
      `
      INSERT INTO user_household_sharing_preferences (
        clerk_user_id,
        household_id,
        information_category,
        sharing_enabled,
        updated_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (clerk_user_id, household_id, information_category) DO UPDATE SET
        sharing_enabled = EXCLUDED.sharing_enabled,
        updated_at = CURRENT_TIMESTAMP;
    `,
      [clerkUserId, householdId, category, enabled]
    );
  }

  /**
   * Retrieves sharing preferences for a user in a household
   */
  async getSharingPreferences(
    householdId: string,
    clerkUserId: string
  ): Promise<HouseholdSharingPreferenceRecord[]> {
    const rows = await query<Record<string, unknown>>(
      `
      SELECT * FROM user_household_sharing_preferences 
      WHERE household_id = $1 AND clerk_user_id = $2;
    `,
      [householdId, clerkUserId]
    );

    return rows.map((r) => ({
      id: String(r.id),
      clerkUserId: String(r.clerk_user_id),
      householdId: String(r.household_id),
      informationCategory: String(r.information_category),
      sharingEnabled: Boolean(r.sharing_enabled),
      updatedAt: String(r.updated_at)
    }));
  }

  private mapRowToHousehold(row: Record<string, unknown>): HouseholdRecord {
    return {
      id: String(row.id),
      name: String(row.name),
      description: row.description ? String(row.description) : null,
      householdType: String(row.household_type || "Family"),
      location: row.location ? String(row.location) : null,
      ownerClerkUserId: String(row.owner_clerk_user_id),
      status: String(row.status || "active"),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  private mapRowToInvitation(row: Record<string, unknown>): HouseholdInvitationRecord {
    return {
      id: String(row.id),
      householdId: String(row.household_id),
      householdName: row.household_name ? String(row.household_name) : undefined,
      invitedByClerkUserId: String(row.invited_by_clerk_user_id),
      inviteeEmail: String(row.invitee_email),
      invitationTokenHash: String(row.invitation_token_hash),
      role: (row.role as HouseholdMemberRole) || "member",
      status: (row.status as "pending" | "accepted" | "expired" | "revoked") || "pending",
      expiresAt: String(row.expires_at),
      acceptedByClerkUserId: row.accepted_by_clerk_user_id ? String(row.accepted_by_clerk_user_id) : null,
      acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
      revokedAt: row.revoked_at ? String(row.revoked_at) : null,
      createdAt: String(row.created_at)
    };
  }
}

export const householdRepository = new HouseholdRepository();
