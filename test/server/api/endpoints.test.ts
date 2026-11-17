import { describe, it, expect, vi } from "vitest";
import healthHandler from "../../../api/health";
import meHandler from "../../../api/me";
import webhookHandler from "../../../api/webhooks/clerk";
import { generateSvixSignature } from "../../../src/server/auth/svixVerification";
import { userRepository } from "../../../src/server/database/repositories/user.repository";
import { webhookRepository } from "../../../src/server/database/repositories/webhook.repository";
import { Readable } from "stream";

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

    it("idempotently deduplicates repeated delivery of the same webhook event", async () => {
      const testSecret = "whsec_MfKQ9r8GJu2OpL6kNx7QyV1sTa3zW0bC";
      const originalSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
      process.env.CLERK_WEBHOOK_SIGNING_SECRET = testSecret;

      vi.spyOn(userRepository, "create").mockResolvedValue({
        id: "mock-uuid-dup",
        clerkUserId: "user_clerk_duplicate",
        email: "dup@foodcue.local",
        displayName: "Duplicate User",
        username: "dup_user",
        isAnonymous: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Mock claimEvent to return true on first call, false on second call (already processed)
      vi.spyOn(webhookRepository, "claimEvent")
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const bodyStr = JSON.stringify({
        type: "user.created",
        data: {
          id: "user_clerk_duplicate",
          email_addresses: [{ id: "em_dup", email_address: "dup@foodcue.local" }],
          primary_email_address_id: "em_dup",
          first_name: "Dup",
          last_name: "User"
        }
      });

      const msgId = `msg_dup_${Date.now()}`;
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = generateSvixSignature(bodyStr, msgId, timestamp, testSecret);

      try {
        const makeRequest = () =>
          new Request("https://foodcue.local/api/webhooks/clerk", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "svix-id": msgId,
              "svix-timestamp": timestamp,
              "svix-signature": signature
            },
            body: bodyStr
          });

        // 1. First delivery attempt: claims event and creates user
        const res1 = await webhookHandler(makeRequest());
        expect(res1.status).toBe(200);
        const body1 = await res1.json();
        expect(body1).toHaveProperty("received", true);
        expect(body1).toHaveProperty("event", "user.created");

        // 2. Second delivery attempt: safely deduplicated
        const res2 = await webhookHandler(makeRequest());
        expect(res2.status).toBe(200);
        const body2 = await res2.json();
        expect(body2).toHaveProperty("received", true);
        expect(body2).toHaveProperty("deduplicated", true);
      } finally {
        if (originalSecret) {
          process.env.CLERK_WEBHOOK_SIGNING_SECRET = originalSecret;
        } else {
          delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
        }
      }
    });

    it("rejects malformed non-JSON payload with 400 Bad Request", async () => {
      const testSecret = "whsec_MfKQ9r8GJu2OpL6kNx7QyV1sTa3zW0bC";
      const originalSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
      process.env.CLERK_WEBHOOK_SIGNING_SECRET = testSecret;

      const malformedBody = "not valid json {{{";
      const msgId = `msg_malformed_${Date.now()}`;
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = generateSvixSignature(malformedBody, msgId, timestamp, testSecret);

      try {
        const request = new Request("https://foodcue.local/api/webhooks/clerk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "svix-id": msgId,
            "svix-timestamp": timestamp,
            "svix-signature": signature
          },
          body: malformedBody
        });

        const response = await webhookHandler(request);
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.code).toBe("INVALID_JSON");
      } finally {
        if (originalSecret) {
          process.env.CLERK_WEBHOOK_SIGNING_SECRET = originalSecret;
        } else {
          delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
        }
      }
    });

    it("rejects payload missing data.id with 400 Bad Request", async () => {
      const testSecret = "whsec_MfKQ9r8GJu2OpL6kNx7QyV1sTa3zW0bC";
      const originalSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
      process.env.CLERK_WEBHOOK_SIGNING_SECRET = testSecret;

      const bodyStr = JSON.stringify({
        type: "user.created",
        data: {
          first_name: "No ID"
        }
      });

      const msgId = `msg_missing_id_${Date.now()}`;
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
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.code).toBe("INVALID_PAYLOAD");
      } finally {
        if (originalSecret) {
          process.env.CLERK_WEBHOOK_SIGNING_SECRET = originalSecret;
        } else {
          delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
        }
      }
    });

    it("handles database failure gracefully and marks status as failed with 500", async () => {
      const testSecret = "whsec_MfKQ9r8GJu2OpL6kNx7QyV1sTa3zW0bC";
      const originalSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
      process.env.CLERK_WEBHOOK_SIGNING_SECRET = testSecret;

      vi.spyOn(webhookRepository, "claimEvent").mockResolvedValue(true);
      const markStatusSpy = vi.spyOn(webhookRepository, "markStatus").mockResolvedValue();
      vi.spyOn(userRepository, "create").mockRejectedValue(new Error("Database connection timed out"));

      const bodyStr = JSON.stringify({
        type: "user.created",
        data: {
          id: "user_db_fail_test",
          email_addresses: [{ id: "em_1", email_address: "fail@foodcue.local" }]
        }
      });

      const msgId = `msg_db_fail_${Date.now()}`;
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
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.code).toBe("WEBHOOK_PROCESSING_FAILED");
        expect(markStatusSpy).toHaveBeenCalledWith(msgId, "failed", "Database connection timed out");
      } finally {
        if (originalSecret) {
          process.env.CLERK_WEBHOOK_SIGNING_SECRET = originalSecret;
        } else {
          delete process.env.CLERK_WEBHOOK_SIGNING_SECRET;
        }
      }
    });

    it("successfully verifies and processes requests in Node.js (req, res) streaming mode", async () => {
      const testSecret = "whsec_MfKQ9r8GJu2OpL6kNx7QyV1sTa3zW0bC";
      const originalSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
      process.env.CLERK_WEBHOOK_SIGNING_SECRET = testSecret;

      vi.spyOn(webhookRepository, "claimEvent").mockResolvedValue(true);
      vi.spyOn(webhookRepository, "markStatus").mockResolvedValue();
      vi.spyOn(userRepository, "create").mockResolvedValue({
        id: "mock-stream-id",
        clerkUserId: "user_stream_test",
        email: "stream@foodcue.local",
        displayName: "Stream User",
        username: "streamuser",
        isAnonymous: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const bodyStr = JSON.stringify({
        type: "user.created",
        data: {
          id: "user_stream_test",
          email_addresses: [{ id: "em_stream", email_address: "stream@foodcue.local" }],
          first_name: "Stream",
          last_name: "User"
        }
      });

      const msgId = `msg_stream_${Date.now()}`;
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = generateSvixSignature(bodyStr, msgId, timestamp, testSecret);

      // Create a mock Node.js stream for req (IncomingMessage with bodyParser: false)
      const streamReq = Object.assign(
        new Readable({
          read() {
            this.push(Buffer.from(bodyStr));
            this.push(null);
          }
        }),
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "svix-id": msgId,
            "svix-timestamp": timestamp,
            "svix-signature": signature
          }
        }
      );

      // Create a mock ServerResponse object
      let capturedStatus = 0;
      let capturedBody: Record<string, unknown> | null = null;
      const headersMap: Record<string, string> = {};

      const mockRes = {
        setHeader: (name: string, value: string) => {
          headersMap[name] = value;
        },
        status: (code: number) => {
          capturedStatus = code;
          return {
            json: (data: unknown) => {
              capturedBody = data as Record<string, unknown>;
            }
          };
        }
      };

      try {
        await webhookHandler(streamReq, mockRes);
        expect(capturedStatus).toBe(200);
        expect(capturedBody).toHaveProperty("received", true);
        expect(capturedBody).toHaveProperty("event", "user.created");
        expect(capturedBody).toHaveProperty("userId", "user_stream_test");
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
