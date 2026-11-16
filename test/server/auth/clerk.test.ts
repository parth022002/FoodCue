import { describe, it, expect } from "vitest";
import { extractBearerToken, authenticateRequest } from "../../../src/server/auth/authorization";
import { verifyClerkSessionToken } from "../../../src/server/auth/clerk";
import { UnauthorizedError } from "../../../src/server/errors/appErrors";

describe("Clerk Server-Side Authentication & Session Verification", () => {
  describe("extractBearerToken", () => {
    it("extracts token from standard Web Headers", () => {
      const headers = new Headers();
      headers.set("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token123");
      const token = extractBearerToken(headers);
      expect(token).toBe("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token123");
    });

    it("extracts token from Node.js header object (lowercase)", () => {
      const headers = { authorization: "Bearer eyJtoken456" };
      const token = extractBearerToken(headers);
      expect(token).toBe("eyJtoken456");
    });

    it("returns null when Authorization header is missing", () => {
      expect(extractBearerToken({})).toBeNull();
      expect(extractBearerToken(undefined)).toBeNull();
    });

    it("returns null when Authorization header has Basic or invalid scheme", () => {
      expect(extractBearerToken({ authorization: "Basic dXNlcjpwYXNz" })).toBeNull();
      expect(extractBearerToken({ authorization: "Bearer" })).toBeNull();
      expect(extractBearerToken({ authorization: "" })).toBeNull();
    });
  });

  describe("verifyClerkSessionToken", () => {
    it("throws UnauthorizedError when token is empty string", async () => {
      await expect(verifyClerkSessionToken("")).rejects.toThrow(UnauthorizedError);
      await expect(verifyClerkSessionToken("   ")).rejects.toThrow(UnauthorizedError);
    });

    it("throws UnauthorizedError when token is invalid or malformed", async () => {
      await expect(
        verifyClerkSessionToken("invalid.jwt.token", "sk_test_mock_1234567890abcdef")
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("authenticateRequest", () => {
    it("rejects unauthenticated requests missing Bearer token with 401 UnauthorizedError", async () => {
      await expect(authenticateRequest({})).rejects.toThrow(UnauthorizedError);
      await expect(authenticateRequest(new Headers())).rejects.toThrow(UnauthorizedError);
    });

    it("rejects requests where browser attempts to spoof user ID in custom headers", async () => {
      const spoofedHeaders = {
        "x-user-id": "user_spoofed_victim",
        "authorization": "Bearer invalid_token"
      };

      await expect(
        authenticateRequest(spoofedHeaders, { secretKeyOverride: "sk_test_mock_1234567890" })
      ).rejects.toThrow(UnauthorizedError);
    });
  });
});
