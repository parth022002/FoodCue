/**
 * Client adapter for FoodCue Onboarding, Profile, and Household APIs.
 * Supports token injection from Clerk's useAuth().getToken().
 */

import type {
  FullUserProfileBundle,
  OnboardingStatus,
  AllergyStatus
} from "../server/database/repositories/profile.repository";
import type {
  HouseholdRecord,
  HouseholdMemberRole,
  HouseholdMemberWithProfile,
  HouseholdInvitationRecord,
  HouseholdSharingPreferenceRecord
} from "../server/database/repositories/household.repository";

export type AuthTokenGetter = () => Promise<string | null>;

export interface SaveProfilePayload {
  profile?: {
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
  };
  preferences?: Array<{ type: string; value: string }>;
  allergies?: Array<{
    name: string;
    category?: string;
    severity?: "mild" | "moderate" | "severe";
    notes?: string;
  }>;
  allergyStatus?: AllergyStatus;
  onboardingStatus?: OnboardingStatus;
}

export class OnboardingApiClient {
  private getToken: AuthTokenGetter;

  constructor(getToken: AuthTokenGetter) {
    this.getToken = getToken;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  /**
   * Fetches full profile bundle from server
   */
  async getProfile(): Promise<FullUserProfileBundle> {
    const headers = await this.getAuthHeaders();
    const res = await fetch("/api/profile", { headers });

    if (!res.ok) {
      throw new Error(`Failed to fetch profile: HTTP ${res.status}`);
    }

    return res.json();
  }

  /**
   * Saves profile, preferences, allergies, or advances onboarding step
   */
  async saveProfile(payload: SaveProfilePayload): Promise<FullUserProfileBundle> {
    const headers = await this.getAuthHeaders();
    const res = await fetch("/api/profile", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to save profile: HTTP ${res.status}`);
    }

    return res.json();
  }

  /**
   * Lists households the user belongs to
   */
  async listHouseholds(): Promise<Array<HouseholdRecord & { userRole: HouseholdMemberRole; memberCount: number }>> {
    const headers = await this.getAuthHeaders();
    const res = await fetch("/api/households", { headers });

    if (!res.ok) {
      throw new Error(`Failed to list households: HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.households || [];
  }

  /**
   * Creates a new household
   */
  async createHousehold(payload: {
    name: string;
    description?: string;
    householdType?: string;
    location?: string;
  }): Promise<HouseholdRecord> {
    const headers = await this.getAuthHeaders();
    const res = await fetch("/api/households", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to create household: HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.household;
  }

  /**
   * Retrieves household details with members and invites
   */
  async getHouseholdDetails(householdId: string): Promise<{
    household: HouseholdRecord;
    userRole: HouseholdMemberRole;
    members: HouseholdMemberWithProfile[];
    invitations: HouseholdInvitationRecord[];
  }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/households/details?householdId=${encodeURIComponent(householdId)}`, {
      headers
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch household details: HTTP ${res.status}`);
    }

    return res.json();
  }

  /**
   * Sends an invitation to a family member or friend
   */
  async createInvitation(payload: {
    householdId: string;
    email: string;
    role?: HouseholdMemberRole;
  }): Promise<{ invitation: HouseholdInvitationRecord; token: string; inviteUrl: string }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to create invitation: HTTP ${res.status}`);
    }

    return res.json();
  }

  /**
   * Validates an invitation token (public/auth-optional)
   */
  async validateInvitation(token: string): Promise<{
    valid: boolean;
    invitationId?: string;
    householdId?: string;
    householdName?: string;
    role?: HouseholdMemberRole;
    expiresAt?: string;
    reason?: string;
  }> {
    const res = await fetch(`/api/invitations?token=${encodeURIComponent(token)}`);
    return res.json();
  }

  /**
   * Accepts an invitation
   */
  async acceptInvitation(token: string): Promise<{ success: boolean; householdId: string; role: HouseholdMemberRole }> {
    const headers = await this.getAuthHeaders();
    const res = await fetch("/api/invitations", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ action: "accept", token })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to accept invitation: HTTP ${res.status}`);
    }

    return res.json();
  }

  /**
   * Revokes a pending invitation
   */
  async revokeInvitation(invitationId: string): Promise<boolean> {
    const headers = await this.getAuthHeaders();
    const res = await fetch("/api/invitations", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ action: "revoke", invitationId })
    });

    return res.ok;
  }

  /**
   * Gets sharing preferences for current user in a household
   */
  async getSharingPreferences(householdId: string): Promise<HouseholdSharingPreferenceRecord[]> {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`/api/sharing?householdId=${encodeURIComponent(householdId)}`, { headers });

    if (!res.ok) return [];
    const data = await res.json();
    return data.preferences || [];
  }

  /**
   * Updates a sharing preference
   */
  async setSharingPreference(householdId: string, category: string, enabled: boolean): Promise<boolean> {
    const headers = await this.getAuthHeaders();
    const res = await fetch("/api/sharing", {
      method: "POST",
      headers,
      body: JSON.stringify({ householdId, category, enabled })
    });

    return res.ok;
  }
}
