import { describe, expect, it } from "vitest";
import { classifyPayload } from "./payloadClassifier";

describe("payload classification", () => {
  it("accepts HTTPS as a previewable class only", () => expect(classifyPayload("https://example.com/x")).toBe("https_url"));
  it("classifies unsafe schemes", () => expect(classifyPayload("javascript:alert(1)")).toBe("unsafe_scheme"));
  it("does not treat short URL text as permission to fetch", () => expect(classifyPayload("https://bit.ly/abc")).toBe("https_url"));
  it("rejects oversized payloads", () => expect(classifyPayload("x".repeat(4097))).toBe("malformed"));
});
