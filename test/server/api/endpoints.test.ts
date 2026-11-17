import { describe, it, expect, vi } from "vitest";
import healthHandler from "../../../api/health";
import meHandler from "../../../api/me";
import webhookHandler from "../../../api/webhooks/clerk";
import { generateSvixSignature } from "../../../src/server/auth/svixVerification";
import { userRepository } from "../../../src/server/database/repositories/user.repository";

describe("Serverless API Endpoints", () => {
  describe("GET /api/health", () => {
    it("returns 200 OK with application and database connected status", async () => {
      const request = new Request("https://foodcue.local/api/health", {
        method: "GET"
      });

      const response = await healthHandler(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty("status", "ok");
      expect(body).toHaveProperty("application", "foodcue");
      expect(body).toHaveProperty("database", "connected");

      // Verify no secrets or sensitive database URLs in response
      const rawText = JSON.stringify(body);
      expect(rawText).not.toContain("password");
      expect(rawText).not.toContain("postgres");
      expect(rawText).not.toContain("neon.tech");
    });

    it("returns 405 Method Not Allowed on POST request", async () => {
      const request = new Request("https://foodcue.local/api/health", {
        method: "POST"
      });

      const response = await healthHandler(request);
      expect(response.status).toBe(405);
    });
  });

  describe("GET /api/me (Authentication Isolation)", () => {
    it("returns 401 Unauthorized when no Bearer token is provided", async () => {
      const request = new Request("https://foodcue.local/api/me", {
        method: "GET"
      });

      const response = await meHandler(request);
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body).toHaveProperty("error");
      expect(body).toHaveProperty("code", "UNAUTHORIZED");
    });

    it("returns 401 Unauthorized when Bearer token is malformed or invalid", async () => {
      const request = new Request("https://foodcue.local/api/me", {
        method: "GET",
        headers: {
          Authorization: "Bearer invalid.fake.token"
        }
      });

      const response = await meHandler(request);
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.code).toBe("UNAUTHORIZED");
    });
  });

  describe("POST /api/webhooks/clerk (Cryptographic Webhook Ingestion)", () => {
    it("fails closed with 503 when CLERK_WEBHOOK_SIGNING_SECRET is not yet configured", async () => {
      const originalSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
      delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;

      try {
        const request = new Request("https://foodcue.local/api/webhooks/clerk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "user.created", data: { id: "user_test123" } })
        });

        const response = await webhookHandler(request);
        expect(response.status).toBe(503);

        const body = await response.json();
        expect(body).toHaveProperty("code", "WEBHOOK_SECRET_PENDING");
        expect(body.error).toContain("CLERK_WEBHOOK_SIGNING_SECRET is pending configuration");
      } finally {
        if (originalSecret) {
          process.env.CLERK_WEBHOOK_SIGNING_SECRET = originalSecret;
        }
      }
    });

    it("rejects non-POST methods with 405 Method Not Allowed", async () => {
      const request = new Request("https://foodcue.local/api/webhooks/clerk", {
        method: "GET"
      });

      const response = await webhookHandler(request);
      expect(response.status).toBe(405);
    });

    it("rejects requests missing required Svix headers with 400 Bad Request", async () => {
      const originalSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
      process.env.CLERK_WEBHOOK_SIGNING_SECRET = "whsec_testSecretKey1234567890abcdef";

      try {
        const request = new Request("https://foodcue.local/api/webhooks/clerk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "user.created", data: { id: "user_test123" } })
        });

        const response = await webhookHandler(request);
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.code).toBe("MISSING_SVIX_HEADERS");
      } finally {
        if (originalSecret) {
          process.env.CLERK_WEBHOOK_SIGNING_SECRET = originalSecret;
        } else {
          delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
        }
      }
    });

    it("rejects requests with invalid Svix signature with 401 Unauthorized", async () => {
      const originalSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
      process.env.CLERK_WEBHOOK_SIGNING_SECRET = "whsec_testSecretKey1234567890abcdef";

      try {
        const request = new Request("https://foodcue.local/api/webhooks/clerk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "svix-id": "msg_invalid_sig_123",
            "svix-timestamp": Math.floor(Date.now() / 1000).toString(),
            "svix-signature": "v1,invalid_signature_base64"
          },
          body: JSON.stringify({ type: "user.created", data: { id: "user_test123" } })
        });

        const response = await webhookHandler(request);
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.code).toBe("INVALID_SIGNATURE");
      } finally {
        if (originalSecret) {
          process.env.CLERK_WEBHOOK_SIGNING_SECRET = originalSecret;
        } else {
          delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
        }
      }
    });

    it("successfully verifies valid Svix signature and processes user.created event", async () => {
      const testSecret = "whsec_MfKQ9r8GJu2OpL6kNx7QyV1sTa3zW0bC";
      const originalSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
      process.env.CLERK_WEBHOOK_SIGNING_SECRET = testSecret;

      vi.spyOn(userRepository, "create").mockResolvedValue({
        id: "mock-uuid-123",
        clerkUserId: "user_clerk_svix_valid",
        email: "verified@foodcue.local",
        displayName: "Verified User",
        username: "verified_user",
        isAnonymous: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const bodyStr = JSON.stringify({
        type: "user.created",
        data: {
          id: "user_clerk_svix_valid",
          email_addresses: [{ id: "em_1", email_address: "verified@foodcue.local" }],
          primary_email_address_id: "em_1",
          first_name: "Verified",
          last_name: "User",
          username: "verified_user"
        }
      });

      const msgId = `msg_test_${Date.now()}`;
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = generateSvixSignature(bodyStr, msgId, timestamp, testSecret);

      try {
        const request = new Request("https://foodcue.local/api/webhooks/clerk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "svix-id": msgId,
            "svix-timestamp": timestamp,
            "svix-signature": signature
          },
          body: bodyStr
        });

        const response = await webhookHandler(request);
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body).toHaveProperty("received", true);
        expect(body).toHaveProperty("event", "user.created");
        expect(body).toHaveProperty("userId", "user_clerk_svix_valid");
      } finally {
        if (originalSecret) {
          process.env.CLERK_WEBHOOK_SIGNING_SECRET = originalSecret;
        } else {
          delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
        }
      }
    });
  });
});
