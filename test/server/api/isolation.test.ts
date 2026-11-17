import { describe, it, expect, vi } from "vitest";
import pushHandler from "../../../src/server/endpoints/syncPush";
import pullHandler from "../../../src/server/endpoints/syncPull";
import migrateHandler from "../../../src/server/endpoints/syncMigrate";
import devicesHandler from "../../../src/server/endpoints/devices";
import * as authModule from "../../../src/server/auth/authorization";
import { syncRepository } from "../../../src/server/database/repositories/sync.repository";

describe("Multi-Tenant Isolation & Access Control", () => {
  describe("Unauthenticated Access Rejection", () => {
    it("rejects unauthenticated push request with 401", async () => {
      const req = new Request("https://foodcue.local/api/sync/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId: "dev_1", operations: [] })
      });
      const res = await pushHandler(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("rejects unauthenticated pull request with 401", async () => {
      const req = new Request("https://foodcue.local/api/sync/pull", {
        method: "GET"
      });
      const res = await pullHandler(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("rejects unauthenticated migrate request with 401", async () => {
      const req = new Request("https://foodcue.local/api/sync/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      const res = await migrateHandler(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe("UNAUTHORIZED");
    });

    it("rejects unauthenticated devices request with 401", async () => {
      const req = new Request("https://foodcue.local/api/devices", {
        method: "GET"
      });
      const res = await devicesHandler(req);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Horizontal Tenant Isolation (User A vs User B)", () => {
    it("ensures User B cannot read User A's sync operations", async () => {
      // Mock User B session
      vi.spyOn(authModule, "authenticateRequest").mockResolvedValue({
        clerkUserId: "user_tenant_b",
        email: "user_b@foodcue.local",
        displayName: "User B",
        username: "user_b"
      });

      // Spy on pullOperationsSince to verify that the query parameters always pass User B's clerkUserId
      const repoSpy = vi.spyOn(syncRepository, "pullOperationsSince").mockResolvedValue([]);

      const req = new Request("https://foodcue.local/api/sync/pull", {
        method: "GET",
        headers: { Authorization: "Bearer mock.jwt.token" }
      });

      const res = await pullHandler(req);
      expect(res.status).toBe(200);

      // Verify the query strictly requested User B's ID, never User A
      expect(repoSpy).toHaveBeenCalledWith("user_tenant_b", null, 100);
      expect(repoSpy).not.toHaveBeenCalledWith("user_tenant_a", expect.anything(), expect.anything());
    });

    it("ensures User B cannot revoke User A's device", async () => {
      vi.spyOn(authModule, "authenticateRequest").mockResolvedValue({
        clerkUserId: "user_tenant_b",
        email: "user_b@foodcue.local",
        displayName: "User B",
        username: "user_b"
      });

      const revokeSpy = vi.spyOn(syncRepository, "revokeDevice").mockResolvedValue(false);

      const req = new Request("https://foodcue.local/api/devices?deviceId=user_a_device_uuid", {
        method: "DELETE",
        headers: { Authorization: "Bearer mock.jwt.token" }
      });

      const res = await devicesHandler(req);
      expect(res.status).toBe(200);

      // Verify revokeDevice strictly scopes to User B's ownership
      expect(revokeSpy).toHaveBeenCalledWith("user_a_device_uuid", "user_tenant_b");
    });
  });
});
