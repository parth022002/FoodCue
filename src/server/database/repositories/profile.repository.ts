import { query } from "../client";

export type OnboardingStatus =
  | "PROFILE_PENDING"
  | "PROFILE_COMPLETED"
  | "HOUSEHOLD_SETUP_PENDING"
  | "HOUSEHOLD_COMPLETED"
  | "ONBOARDING_COMPLETED";

export type AllergyStatus =
  | "NOT_PROVIDED"
  | "CONFIRMED_NO_ALLERGIES"
  | "ALLERGIES_SPECIFIED";

export interface UserProfileRecord {
  id: string;
  clerkUserId: string;
  fullName: string;
  profileImageUrl: string | null;
  age: number | null;
  gender: string | null;
  country: string;
  state: string | null;
  city: string | null;
  preferredLanguage: string;
  timezone: string;
  onboardingStatus: OnboardingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserFoodPreferenceRecord {
  id: string;
  clerkUserId: string;
  preferenceType: string;
  preferenceValue: string;
  createdAt: string;
}

export interface UserAllergyRecord {
  id: string;
  clerkUserId: string;
  allergenName: string;
  allergenCategory: string;
  severity: "mild" | "moderate" | "severe";
  notes: string | null;
  consentObtained: boolean;
  createdAt: string;
}

export interface FullUserProfileBundle {
  profile: UserProfileRecord | null;
  preferences: UserFoodPreferenceRecord[];
  allergies: UserAllergyRecord[];
  allergyStatus: AllergyStatus;
  onboardingStatus: OnboardingStatus;
}

export class ProfileRepository {
  /**
   * Retrieves profile by Clerk user ID
   */
  async findByClerkUserId(clerkUserId: string): Promise<UserProfileRecord | null> {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM user_profiles WHERE clerk_user_id = $1 LIMIT 1;`,
      [clerkUserId]
    );

    if (!rows[0]) return null;
    return this.mapRowToProfile(rows[0]);
  }

  /**
   * Creates or updates a user profile record
   */
  async upsertProfile(
    clerkUserId: string,
    data: {
      fullName: string;
      profileImageUrl?: string | null;
      age?: number | null;
      gender?: string | null;
      country?: string;
      state?: string | null;
      city?: string | null;
      preferredLanguage?: string;
      timezone?: string;
      onboardingStatus?: OnboardingStatus;
    }
  ): Promise<UserProfileRecord> {
    const rows = await query<Record<string, unknown>>(
      `
      INSERT INTO user_profiles (
        clerk_user_id,
        full_name,
        profile_image_url,
        age,
        gender,
        country,
        state,
        city,
        preferred_language,
        timezone,
        onboarding_status,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
      ON CONFLICT (clerk_user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        profile_image_url = EXCLUDED.profile_image_url,
        age = EXCLUDED.age,
        gender = EXCLUDED.gender,
        country = COALESCE(NULLIF(EXCLUDED.country, ''), user_profiles.country, 'India'),
        state = EXCLUDED.state,
        city = EXCLUDED.city,
        preferred_language = COALESCE(NULLIF(EXCLUDED.preferred_language, ''), user_profiles.preferred_language, 'en'),
        timezone = COALESCE(NULLIF(EXCLUDED.timezone, ''), user_profiles.timezone, 'Asia/Kolkata'),
        onboarding_status = COALESCE(EXCLUDED.onboarding_status, user_profiles.onboarding_status),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `,
      [
        clerkUserId,
        data.fullName,
        data.profileImageUrl ?? null,
        data.age ?? null,
        data.gender ?? null,
        data.country ?? "India",
        data.state ?? null,
        data.city ?? null,
        data.preferredLanguage ?? "en",
        data.timezone ?? "Asia/Kolkata",
        data.onboardingStatus ?? "PROFILE_PENDING"
      ]
    );

    const record = rows[0];
    if (!record) {
      throw new Error("Failed to upsert user profile record");
    }

    return this.mapRowToProfile(record);
  }

  /**
   * Updates only onboarding status
   */
  async updateOnboardingStatus(
    clerkUserId: string,
    status: OnboardingStatus
  ): Promise<void> {
    await query(
      `
      UPDATE user_profiles
      SET onboarding_status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE clerk_user_id = $1;
    `,
      [clerkUserId, status]
    );
  }

  /**
   * Retrieves food preferences for a user
   */
  async getPreferences(clerkUserId: string): Promise<UserFoodPreferenceRecord[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM user_food_preferences WHERE clerk_user_id = $1 ORDER BY preference_type, preference_value;`,
      [clerkUserId]
    );

    return rows.map((r) => ({
      id: String(r.id),
      clerkUserId: String(r.clerk_user_id),
      preferenceType: String(r.preference_type),
      preferenceValue: String(r.preference_value),
      createdAt: String(r.created_at)
    }));
  }

  /**
   * Replaces or updates food preferences for a user
   */
  async setPreferences(
    clerkUserId: string,
    preferences: Array<{ type: string; value: string }>
  ): Promise<UserFoodPreferenceRecord[]> {
    // Delete existing preferences and insert new list atomically
    await query(`DELETE FROM user_food_preferences WHERE clerk_user_id = $1;`, [clerkUserId]);

    for (const pref of preferences) {
      if (pref.type && pref.value) {
        await query(
          `
          INSERT INTO user_food_preferences (clerk_user_id, preference_type, preference_value)
          VALUES ($1, $2, $3)
          ON CONFLICT (clerk_user_id, preference_type, preference_value) DO NOTHING;
        `,
          [clerkUserId, pref.type.trim(), pref.value.trim()]
        );
      }
    }

    return this.getPreferences(clerkUserId);
  }

  /**
   * Retrieves user allergies
   */
  async getAllergies(clerkUserId: string): Promise<UserAllergyRecord[]> {
    const rows = await query<Record<string, unknown>>(
      `SELECT * FROM user_allergies WHERE clerk_user_id = $1 ORDER BY allergen_name;`,
      [clerkUserId]
    );

    return rows.map((r) => ({
      id: String(r.id),
      clerkUserId: String(r.clerk_user_id),
      allergenName: String(r.allergen_name),
      allergenCategory: String(r.allergen_category || "food"),
      severity: (r.severity as "mild" | "moderate" | "severe") || "moderate",
      notes: r.notes ? String(r.notes) : null,
      consentObtained: Boolean(r.consent_obtained),
      createdAt: String(r.created_at)
    }));
  }

  /**
   * Sets allergies and updates allergy status
   */
  async setAllergies(
    clerkUserId: string,
    allergies: Array<{
      name: string;
      category?: string;
      severity?: "mild" | "moderate" | "severe";
      notes?: string;
    }>,
    status: AllergyStatus
  ): Promise<UserAllergyRecord[]> {
    await query(`DELETE FROM user_allergies WHERE clerk_user_id = $1;`, [clerkUserId]);

    for (const allergy of allergies) {
      if (allergy.name && allergy.name.trim()) {
        await query(
          `
          INSERT INTO user_allergies (
            clerk_user_id,
            allergen_name,
            allergen_category,
            severity,
            notes,
            consent_obtained
          ) VALUES ($1, $2, $3, $4, $5, TRUE)
          ON CONFLICT (clerk_user_id, allergen_name) DO UPDATE SET
            allergen_category = EXCLUDED.allergen_category,
            severity = EXCLUDED.severity,
            notes = EXCLUDED.notes,
            updated_at = CURRENT_TIMESTAMP;
        `,
          [
            clerkUserId,
            allergy.name.trim(),
            allergy.category || "food",
            allergy.severity || "moderate",
            allergy.notes || null
          ]
        );
      }
    }

    // Update explicit status
    await query(
      `
      INSERT INTO user_allergy_status (clerk_user_id, status, consent_timestamp, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (clerk_user_id) DO UPDATE SET
        status = EXCLUDED.status,
        consent_timestamp = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP;
    `,
      [clerkUserId, status]
    );

    return this.getAllergies(clerkUserId);
  }

  /**
   * Retrieves explicit allergy status
   */
  async getAllergyStatus(clerkUserId: string): Promise<AllergyStatus> {
    const rows = await query<{ status: string }>(
      `SELECT status FROM user_allergy_status WHERE clerk_user_id = $1 LIMIT 1;`,
      [clerkUserId]
    );

    if (!rows[0]) return "NOT_PROVIDED";
    return (rows[0].status as AllergyStatus) || "NOT_PROVIDED";
  }

  /**
   * Returns complete profile bundle
   */
  async getFullProfile(clerkUserId: string): Promise<FullUserProfileBundle> {
    const [profile, preferences, allergies, allergyStatus] = await Promise.all([
      this.findByClerkUserId(clerkUserId),
      this.getPreferences(clerkUserId),
      this.getAllergies(clerkUserId),
      this.getAllergyStatus(clerkUserId)
    ]);

    return {
      profile,
      preferences,
      allergies,
      allergyStatus,
      onboardingStatus: profile?.onboardingStatus || "PROFILE_PENDING"
    };
  }

  /**
   * Permanently and completely deletes all personal user data:
   * profiles, preferences, allergies, status, and cloud pantry/sync records.
   */
  async deleteUserProfileAndPersonalData(clerkUserId: string): Promise<void> {
    // 1. Delete personal profile records
    await query(`DELETE FROM user_profiles WHERE clerk_user_id = $1;`, [clerkUserId]);
    await query(`DELETE FROM user_food_preferences WHERE clerk_user_id = $1;`, [clerkUserId]);
    await query(`DELETE FROM user_allergies WHERE clerk_user_id = $1;`, [clerkUserId]);
    await query(`DELETE FROM user_allergy_status WHERE clerk_user_id = $1;`, [clerkUserId]);
    await query(`DELETE FROM user_household_sharing_preferences WHERE clerk_user_id = $1;`, [clerkUserId]);

    // 2. Delete cloud pantry events and items
    await query(`DELETE FROM foodcue_pantry_events WHERE clerk_user_id = $1;`, [clerkUserId]);
    await query(`DELETE FROM foodcue_pantry_items WHERE clerk_user_id = $1;`, [clerkUserId]);
    await query(`DELETE FROM foodcue_confirmed_labels WHERE clerk_user_id = $1;`, [clerkUserId]);
    await query(`DELETE FROM foodcue_shopping_list WHERE clerk_user_id = $1;`, [clerkUserId]);
    await query(`DELETE FROM foodcue_reminders WHERE clerk_user_id = $1;`, [clerkUserId]);
    await query(`DELETE FROM sync_operations WHERE clerk_user_id = $1;`, [clerkUserId]);
    await query(`DELETE FROM sync_devices WHERE clerk_user_id = $1;`, [clerkUserId]);
  }

  private mapRowToProfile(row: Record<string, unknown>): UserProfileRecord {
    return {
      id: String(row.id),
      clerkUserId: String(row.clerk_user_id),
      fullName: String(row.full_name || ""),
      profileImageUrl: row.profile_image_url ? String(row.profile_image_url) : null,
      age: row.age !== null && row.age !== undefined ? Number(row.age) : null,
      gender: row.gender ? String(row.gender) : null,
      country: String(row.country || "India"),
      state: row.state ? String(row.state) : null,
      city: row.city ? String(row.city) : null,
      preferredLanguage: String(row.preferred_language || "en"),
      timezone: String(row.timezone || "Asia/Kolkata"),
      onboardingStatus: (row.onboarding_status as OnboardingStatus) || "PROFILE_PENDING",
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }
}

export const profileRepository = new ProfileRepository();
