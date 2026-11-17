import { describe, it, expect } from "vitest";
import { verifySvixSignature, generateSvixSignature } from "../../../src/server/auth/svixVerification";

describe("Svix Webhook Cryptographic Verification", () => {
  const testSecret = "whsec_MfKQ9r8GJu2OpL6kNx7QyV1sTa3zW0bC"; // Base64 mock secret
  const testId = "msg_2X8J0QkQ5t8Lp1m9Nv3R4s7T2w";
  const testPayload = JSON.stringify({
    type: "user.created",
    data: {
      id: "user_test_svix_123",
      email_addresses: [{ id: "email_1", email_address: "svix@foodcue.local" }],
      primary_email_address_id: "email_1",
      first_name: "Svix",
      last_name: "Tester"
    }
  });

  it("successfully verifies a valid Svix signature generated with secret", () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSvixSignature(testPayload, testId, timestamp, testSecret);

    const isValid = verifySvixSignature(
      testPayload,
      { id: testId, timestamp, signature },
      testSecret
    );

    expect(isValid).toBe(true);
  });

  it("rejects when the signature is tampered with", () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSvixSignature(testPayload, testId, timestamp, testSecret);
    const tamperedSignature = signature.replace(/[A-Za-z]/, "X");

    expect(() =>
      verifySvixSignature(
        testPayload,
        { id: testId, timestamp, signature: tamperedSignature },
        testSecret
      )
    ).toThrow(/signature mismatch/i);
  });

  it("rejects when the payload body has been tampered with", () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = generateSvixSignature(testPayload, testId, timestamp, testSecret);
    const tamperedPayload = testPayload.replace("Svix", "Hacker");

    expect(() =>
      verifySvixSignature(
        tamperedPayload,
        { id: testId, timestamp, signature },
        testSecret
      )
    ).toThrow(/signature mismatch/i);
  });

  it("rejects expired timestamps outside the tolerance window", () => {
    // 10 minutes in the past
    const expiredTimestamp = (Math.floor(Date.now() / 1000) - 600).toString();
    const signature = generateSvixSignature(testPayload, testId, expiredTimestamp, testSecret);

    expect(() =>
      verifySvixSignature(
        testPayload,
        { id: testId, timestamp: expiredTimestamp, signature },
        testSecret,
        { toleranceSeconds: 300 }
      )
    ).toThrow(/outside tolerance window/i);
  });

  it("rejects when required headers are missing", () => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    expect(() =>
      verifySvixSignature(
        testPayload,
        { id: "", timestamp, signature: "v1,abc" },
        testSecret
      )
    ).toThrow(/missing required svix headers/i);
  });
});
