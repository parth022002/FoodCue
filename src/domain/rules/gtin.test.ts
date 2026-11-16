import { describe, expect, it } from "vitest";
import { isValidGtin, normaliseGtin } from "./gtin";

describe("GTIN validation", () => {
  it("accepts a valid GTIN-13", () => expect(isValidGtin("4006381333931")).toBe(true));
  it("rejects an invalid check digit", () => expect(isValidGtin("4006381333932")).toBe(false));
  it("normalises spaces only after validation", () => expect(normaliseGtin(" 4006381333931 ")).toBe("4006381333931"));
  it("rejects unsupported lengths", () => expect(isValidGtin("12345")).toBe(false));
});
