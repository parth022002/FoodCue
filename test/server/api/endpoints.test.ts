import { describe, it, expect } from "vitest";
import healthHandler from "../../../api/health";
import meHandler from "../../../api/me";
import webhookHandler from "../../../api/webhooks/clerk";

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

  describe("POST /api/webhooks/clerk (Fail-Closed Webhook Guardrail)", () => {
    it("fails closed with 503 when CLERK_WEBHOOK_SIGNING_SECRET is not yet configured", async () => {
      // Ensure environment variable is empty
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
  });
});
