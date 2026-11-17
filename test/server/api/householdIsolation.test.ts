import { beforeEach, describe, expect, it } from "vitest";
import {
  canAdministerHousehold,
  canWritePantryEvents,
  resolveHouseholdRole
} from "../../../src/domain/entities/household";
import { syncRepository } from "../../../src/server/database/repositories/sync.repository";
import syncPushHandler from "../../../src/server/endpoints/syncPush";
import syncPullHandler from "../../../src/server/endpoints/syncPull";

describe("Milestone 5: Multi-Tenant Household Sharing & RBAC Isolation", () => {
  beforeEach(async () => {
    // Clean up test sync operations
    try {
      await syncRepository.purgeUserCloudData("org_household_alpha");
      await syncRepository.purgeUserCloudData("org_household_beta");
      await syncRepository.purgeUserCloudData("user_solo_charlie");
    } catch {
      // Test mock environment
    }
  });

  describe("Household RBAC Role Resolution", () => {
    it("correctly resolves Clerk organization roles to FoodCue permissions", () => {
      expect(resolveHouseholdRole("org:admin")).toBe("admin");
      expect(resolveHouseholdRole("admin")).toBe("admin");
      expect(resolveHouseholdRole("org:member")).toBe("member");
      expect(resolveHouseholdRole("member")).toBe("member");
      expect(resolveHouseholdRole("org:viewer")).toBe("viewer");
      expect(resolveHouseholdRole("guest")).toBe("viewer");
      expect(resolveHouseholdRole(null)).toBe("viewer");
    });

    it("enforces write permissions: admin and member can write, viewer cannot", () => {
      expect(canWritePantryEvents("admin")).toBe(true);
      expect(canWritePantryEvents("member")).toBe(true);
      expect(canWritePantryEvents("viewer")).toBe(false);
    });

    it("enforces administrative permissions: only admin can manage members and delete", () => {
      expect(canAdministerHousehold("admin")).toBe(true);
      expect(canAdministerHousehold("member")).toBe(false);
      expect(canAdministerHousehold("viewer")).toBe(false);
    });
  });

  describe("Tenant Isolation between Households", () => {
    it("ensures Household A operations are strictly invisible to Household B", async () => {
      const orgA = "org_household_alpha";
      const orgB = "org_household_beta";
      const deviceA = "a0000000-0000-4000-8000-000000000001";
      const deviceB = "b0000000-0000-4000-8000-000000000002";

      // Register devices
      await syncRepository.upsertDevice({
        deviceId: deviceA,
        clerkUserId: "user_alice",
        deviceName: "Alice iPhone"
      });
      await syncRepository.upsertDevice({
        deviceId: deviceB,
        clerkUserId: "user_bob",
        deviceName: "Bob Android"
      });

      // 1. Household A pushes 2 pantry operations
      const operationsA = [
        {
          idempotencyKey: `op_alpha_1_${Date.now()}`,
          entityType: "pantry_event",
          entityId: "event_a1",
          operationType: "CREATE",
          payload: {
            eventId: "event_a1",
            itemId: "milk_amul_toned",
            eventType: "add",
            quantityDelta: 2,
            unit: "pack"
          },
          clientTimestamp: new Date().toISOString()
        },
        {
          idempotencyKey: `op_alpha_2_${Date.now()}`,
          entityType: "pantry_event",
          entityId: "event_a2",
          operationType: "CREATE",
          payload: {
            eventId: "event_a2",
            itemId: "parle_g_biscuits",
            eventType: "add",
            quantityDelta: 1,
            unit: "pack"
          },
          clientTimestamp: new Date().toISOString()
        }
      ];

      const { processed: countA } = await syncRepository.processPushBatch(orgA, deviceA, operationsA);
      expect(countA).toBe(2);

      // 2. Household B pulls operations
      const pulledByB = await syncRepository.pullOperationsSince(orgB, null, 100);

      // Household B MUST NOT see Household A's items!
      expect(pulledByB.length).toBe(0);

      // 3. Household A pulls operations
      const pulledByA = await syncRepository.pullOperationsSince(orgA, null, 100);

      // Household A receives exactly their 2 operations
      expect(pulledByA.length).toBe(2);
      expect(pulledByA.some((op) => op.entityId === "event_a1")).toBe(true);
      expect(pulledByA.some((op) => op.entityId === "event_a2")).toBe(true);
    });

    it("preserves isolation between personal pantries and household pantries", async () => {
      const personalUser = "user_solo_charlie";
      const orgA = "org_household_alpha";
      const deviceC = "c0000000-0000-4000-8000-000000000003";

      await syncRepository.upsertDevice({
        deviceId: deviceC,
        clerkUserId: personalUser,
        deviceName: "Charlie Laptop"
      });

      const personalOp = [
        {
          idempotencyKey: `op_charlie_1_${Date.now()}`,
          entityType: "pantry_event",
          entityId: "event_c1",
          operationType: "CREATE",
          payload: {
            eventId: "event_c1",
            itemId: "secret_chocolate",
            eventType: "add",
            quantityDelta: 1,
            unit: "bar"
          },
          clientTimestamp: new Date().toISOString()
        }
      ];

      await syncRepository.processPushBatch(personalUser, deviceC, personalOp);

      // Org A pulls
      const orgAPull = await syncRepository.pullOperationsSince(orgA, null, 100);
      expect(orgAPull.every((op) => op.entityId !== "event_c1")).toBe(true);

      // Personal user pulls
      const charliePull = await syncRepository.pullOperationsSince(personalUser, null, 100);
      expect(charliePull.some((op) => op.entityId === "event_c1")).toBe(true);
    });
  });
});
