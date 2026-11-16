import { describe, it, expect } from "vitest";
import {
  validateBackendEnvironment,
  isNeonConfigured,
  isClerkConfigured
} from "../../../src/server/config/environment";
import { ConfigurationError } from "../../../src/server/errors/appErrors";

describe("Backend Environment Configuration & Validation", () => {
  const validMockEnv = {
    DATABASE_URL: "postgresql://neondb_owner:npg_secret123@ep-mock-pooler.c-4.aws.neon.tech/neondb?sslmode=require",
    DATABASE_URL_UNPOOLED: "postgresql://neondb_owner:npg_secret123@ep-mock.c-4.aws.neon.tech/neondb?sslmode=require",
    CLERK_SECRET_KEY: "sk_test_mock_secret_key_1234567890",
    VITE_CLERK_PUBLISHABLE_KEY: "pk_test_mock_publishable_key_1234567890",
    NODE_ENV: "test"
  };

  it("successfully validates a complete and properly formatted environment config", () => {
    const config = validateBackendEnvironment(validMockEnv);
    expect(config.DATABASE_URL).toContain("ep-mock-pooler");
    expect(config.DATABASE_URL_UNPOOLED).toContain("ep-mock");
    expect(config.CLERK_SECRET_KEY).toBe("sk_test_mock_secret_key_1234567890");
    expect(config.NODE_ENV).toBe("test");
  });

  it("throws ConfigurationError when DATABASE_URL is missing", () => {
    const invalidEnv = { ...validMockEnv, DATABASE_URL: undefined };
    expect(() => validateBackendEnvironment(invalidEnv)).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when CLERK_SECRET_KEY is missing", () => {
    const invalidEnv = { ...validMockEnv, CLERK_SECRET_KEY: undefined };
    expect(() => validateBackendEnvironment(invalidEnv)).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when DATABASE_URL is not a postgres URI", () => {
    const invalidEnv = { ...validMockEnv, DATABASE_URL: "http://localhost:3000" };
    expect(() => validateBackendEnvironment(invalidEnv)).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when CLERK_SECRET_KEY does not start with sk_", () => {
    const invalidEnv = { ...validMockEnv, CLERK_SECRET_KEY: "invalid_secret_key_format" };
    expect(() => validateBackendEnvironment(invalidEnv)).toThrow(ConfigurationError);
  });

  it("never includes raw secret values in thrown error messages", () => {
    try {
      validateBackendEnvironment({
        ...validMockEnv,
        DATABASE_URL: "invalid_uri_value",
        CLERK_SECRET_KEY: "invalid_clerk_val"
      });
      expect.fail("Should have thrown ConfigurationError");
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigurationError);
      const msg = (err as Error).message;
      expect(msg).not.toContain("npg_secret123");
      expect(msg).toContain("Invalid backend configuration");
    }
  });

  it("isNeonConfigured accurately detects valid and invalid configurations", () => {
    expect(isNeonConfigured(validMockEnv)).toBe(true);
    expect(isNeonConfigured({ DATABASE_URL: "invalid" })).toBe(false);
    expect(isNeonConfigured({})).toBe(false);
  });

  it("isClerkConfigured accurately detects valid and invalid keys", () => {
    expect(isClerkConfigured(validMockEnv)).toBe(true);
    expect(isClerkConfigured({ CLERK_SECRET_KEY: "wrong_prefix" })).toBe(false);
    expect(isClerkConfigured({})).toBe(false);
  });
});
