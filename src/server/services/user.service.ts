import type { UserRepository } from "../database/repositories/user.repository";
import { userRepository } from "../database/repositories/user.repository";
import { type FoodCueUserRecord, type PublicUserProfile, toPublicUserProfile } from "../database/schema/user.schema";
import { type VerifiedUserContext, fetchClerkUserAttributes } from "../auth/clerk";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors/appErrors";

export interface UserProfileHints {
  email?: string | null;
  displayName?: string | null;
  username?: string | null;
}

export class UserService {
  constructor(private readonly userRepo: UserRepository = userRepository) {}

  /**
   * Idempotently retrieves or creates the FoodCue user profile for a verified Clerk identity.
   * If the account is marked deleted, access is denied.
   */
  async getOrCreateUser(
    context: VerifiedUserContext,
    hints?: UserProfileHints
  ): Promise<FoodCueUserRecord> {
    const existing = await this.userRepo.findByClerkUserId(context.clerkUserId, true);

    if (existing) {
      if (existing.deletedAt) {
        throw new ForbiddenError("This account has been deactivated or deleted.");
      }
      await this.userRepo.updateLastActive(context.clerkUserId).catch(() => {});
      return existing;
    }

    // If new user, populate profile fields from hints or query Clerk API
    let email = hints?.email ?? null;
    let displayName = hints?.displayName ?? null;
    let username = hints?.username ?? null;

    if (!email && !displayName) {
      try {
        const clerkAttrs = await fetchClerkUserAttributes(context.clerkUserId);
        email = clerkAttrs.email ?? null;
        displayName = clerkAttrs.displayName ?? null;
        username = clerkAttrs.username ?? null;
      } catch {
        // Fallback gracefully without external API block
      }
    }

    return this.userRepo.create({
      clerkUserId: context.clerkUserId,
      email,
      displayName,
      username,
      isAnonymous: false
    });
  }

  /**
   * Retrieves the active profile for a verified user.
   */
  async getUserProfile(clerkUserId: string): Promise<FoodCueUserRecord> {
    const user = await this.userRepo.findByClerkUserId(clerkUserId, false);
    if (!user) {
      throw new NotFoundError("FoodCue user profile not found for this identity.");
    }
    return user;
  }

  /**
   * Updates allowed profile fields (displayName, username) for an authenticated user.
   */
  async updateUserProfile(
    clerkUserId: string,
    data: { displayName?: string; username?: string }
  ): Promise<FoodCueUserRecord> {
    if (data.username !== undefined) {
      const cleanUsername = data.username.trim();
      if (cleanUsername.length > 0 && !/^[a-zA-Z0-9_-]{3,30}$/.test(cleanUsername)) {
        throw new ValidationError(
          "Username must be 3-30 characters long and contain only letters, numbers, underscores, or hyphens."
        );
      }
    }

    if (data.displayName !== undefined && data.displayName.trim().length > 100) {
      throw new ValidationError("Display name cannot exceed 100 characters.");
    }

    return this.userRepo.updateProfile(clerkUserId, {
      displayName: data.displayName ? data.displayName.trim() : undefined,
      username: data.username ? data.username.trim() : undefined
    });
  }

  /**
   * Soft-deletes a user account.
   */
  async deleteUser(clerkUserId: string): Promise<boolean> {
    const success = await this.userRepo.markDeleted(clerkUserId);
    if (!success) {
      throw new NotFoundError("User record not found or already deleted.");
    }
    return true;
  }

  /**
   * Formats a FoodCueUserRecord into the safe public response shape for client consumption.
   */
  formatPublicProfile(record: FoodCueUserRecord): PublicUserProfile {
    return toPublicUserProfile(record);
  }
}

export const userService = new UserService();
