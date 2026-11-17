/**
 * FoodCue Household Collaboration & Clerk Organizations Domain Entity
 * Phase 7-10 Master Product Completion (Milestone 5)
 *
 * Implements multi-tenant household sharing, server-side RBAC permissions,
 * and zero-silent-merge migration guarantees.
 */

export type HouseholdRole = "admin" | "member" | "viewer";

export interface HouseholdMember {
  userId: string;
  clerkUserId: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  role: HouseholdRole;
  joinedAt: string;
}

export interface Household {
  id: string; // Maps to Clerk org_id or local household ID
  name: string;
  slug: string;
  ownerClerkUserId: string;
  members: HouseholdMember[];
  createdAt: string;
  updatedAt: string;
}

export type HouseholdMigrationChoice = "merge" | "isolate";

export interface MigrationPreviewPlan {
  householdId: string;
  householdName: string;
  choice: HouseholdMigrationChoice;
  pantryEventsToMigrate: number;
  confirmedLabelsToMigrate: number;
  requiresConfirmation: true;
}

/**
 * Evaluates whether a household member has write access to the pantry ledger
 */
export function canWritePantryEvents(role: HouseholdRole): boolean {
  return role === "admin" || role === "member";
}

/**
 * Evaluates whether a member can administer household settings & members
 */
export function canAdministerHousehold(role: HouseholdRole): boolean {
  return role === "admin";
}

/**
 * Resolves a Clerk org_role string to a canonical FoodCue HouseholdRole
 */
export function resolveHouseholdRole(clerkOrgRole?: string | null): HouseholdRole {
  if (!clerkOrgRole) return "viewer";
  const r = clerkOrgRole.toLowerCase();
  if (r.includes("admin") || r === "org:admin") return "admin";
  if (r.includes("member") || r === "org:member") return "member";
  return "viewer";
}
