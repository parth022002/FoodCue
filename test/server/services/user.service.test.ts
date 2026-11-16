import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserService } from "../../../src/server/services/user.service";
import type { UserRepository } from "../../../src/server/database/repositories/user.repository";
import type { FoodCueUserRecord } from "../../../src/server/database/schema/user.schema";
import { ForbiddenError, ValidationError } from "../../../src/server/errors/appErrors";

describe("User Service & Profile Management", () => {
  let mockUserRepo: Partial<UserRepository>;
  let userService: UserService;

  const mockActiveUser: FoodCueUserRecord = {
    id: "uuid-1234-5678-9012",
    userId: "uuid-1234-5678-9012",
    clerkUserId: "user_2testClerkId123",
    email: "testuser@foodcue.local",
    displayName: "Priya Sharma",
    username: "priya_kitchen",
    isAnonymous: false,
    deviceFingerprint: null,
    createdAt: "2026-11-16T12:00:00.000Z",
    updatedAt: "2026-11-16T12:00:00.000Z",
    lastActiveAt: "2026-11-16T12:00:00.000Z",
    deletedAt: null
  };

  beforeEach(() => {
    mockUserRepo = {
      findByClerkUserId: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      updateProfile: vi.fn(),
      markDeleted: vi.fn(),
      restore: vi.fn(),
      updateLastActive: vi.fn().mockResolvedValue(undefined)
    };
    userService = new UserService(mockUserRepo as UserRepository);
  });

  describe("getOrCreateUser (Idempotency & Safe Creation)", () => {
    it("returns existing user profile without re-inserting or duplicating", async () => {
      vi.mocked(mockUserRepo.findByClerkUserId!).mockResolvedValue(mockActiveUser);

      const result = await userService.getOrCreateUser({
        clerkUserId: "user_2testClerkId123",
        sessionClaims: {},
        authorizedAt: new Date().toISOString()
      });

      expect(result).toEqual(mockActiveUser);
      expect(mockUserRepo.create).not.toHaveBeenCalled();
      expect(mockUserRepo.updateLastActive).toHaveBeenCalledWith("user_2testClerkId123");
    });

    it("creates a new FoodCue user record when identity does not exist", async () => {
      vi.mocked(mockUserRepo.findByClerkUserId!).mockResolvedValue(null);
      vi.mocked(mockUserRepo.create!).mockResolvedValue(mockActiveUser);

      const result = await userService.getOrCreateUser(
        {
          clerkUserId: "user_2testClerkId123",
          sessionClaims: {},
          authorizedAt: new Date().toISOString()
        },
        {
          email: "testuser@foodcue.local",
          displayName: "Priya Sharma",
          username: "priya_kitchen"
        }
      );

      expect(result).toEqual(mockActiveUser);
      expect(mockUserRepo.create).toHaveBeenCalledWith({
        clerkUserId: "user_2testClerkId123",
        email: "testuser@foodcue.local",
        displayName: "Priya Sharma",
        username: "priya_kitchen",
        isAnonymous: false
      });
    });

    it("throws ForbiddenError when account has been soft-deleted", async () => {
      const deletedUser: FoodCueUserRecord = {
        ...mockActiveUser,
        deletedAt: "2026-11-16T10:00:00.000Z"
      };
      vi.mocked(mockUserRepo.findByClerkUserId!).mockResolvedValue(deletedUser);

      await expect(
        userService.getOrCreateUser({
          clerkUserId: "user_2testClerkId123",
          sessionClaims: {},
          authorizedAt: new Date().toISOString()
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("updateUserProfile validation", () => {
    it("rejects invalid usernames with spaces or special characters", async () => {
      await expect(
        userService.updateUserProfile("user_2testClerkId123", { username: "invalid user!" })
      ).rejects.toThrow(ValidationError);

      await expect(
        userService.updateUserProfile("user_2testClerkId123", { username: "ab" }) // too short
      ).rejects.toThrow(ValidationError);
    });

    it("rejects oversized display names exceeding 100 characters", async () => {
      await expect(
        userService.updateUserProfile("user_2testClerkId123", { displayName: "a".repeat(105) })
      ).rejects.toThrow(ValidationError);
    });

    it("successfully delegates valid updates to repository", async () => {
      vi.mocked(mockUserRepo.updateProfile!).mockResolvedValue({
        ...mockActiveUser,
        displayName: "Priya Ahuja"
      });

      const updated = await userService.updateUserProfile("user_2testClerkId123", {
        displayName: "Priya Ahuja"
      });

      expect(updated.displayName).toBe("Priya Ahuja");
      expect(mockUserRepo.updateProfile).toHaveBeenCalledWith("user_2testClerkId123", {
        displayName: "Priya Ahuja",
        username: undefined
      });
    });
  });

  describe("formatPublicProfile", () => {
    it("strips internal audit fields and returns clean public profile structure", () => {
      const publicShape = userService.formatPublicProfile(mockActiveUser);

      expect(publicShape).toEqual({
        id: "uuid-1234-5678-9012",
        clerkUserId: "user_2testClerkId123",
        email: "testuser@foodcue.local",
        displayName: "Priya Sharma",
        username: "priya_kitchen",
        createdAt: "2026-11-16T12:00:00.000Z"
      });

      // Internal fields are absent
      expect((publicShape as unknown as Record<string, unknown>).deletedAt).toBeUndefined();
      expect((publicShape as unknown as Record<string, unknown>).isAnonymous).toBeUndefined();
      expect((publicShape as unknown as Record<string, unknown>).deviceFingerprint).toBeUndefined();
    });
  });
});
