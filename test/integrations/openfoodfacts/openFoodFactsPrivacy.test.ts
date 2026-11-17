/**
 * OpenFoodFacts Privacy & Network Boundary Test Suite
 * Master Specification v13.5 §15.1, §31.4 & PRD v1.2 §4.5
 *
 * Privacy Invariants:
 * 1. Only the normalized numeric GTIN is present in the request URL.
 * 2. Zero query parameters, user IDs, or tracking tokens.
 * 3. Zero Clerk authorization headers, session cookies, or device IDs.
 * 4. Credentials mode is explicitly 'omit'.
 * 5. Mandatory User-Agent header present.
 */

import { describe, expect, it, vi } from "vitest";
import { OpenFoodFactsClient } from "../../../src/integrations/openfoodfacts";

describe("OpenFoodFacts Privacy & Data Minimization", () => {
  it("sends ONLY the numerical GTIN in the URL path with zero query params", async () => {
    let capturedUrl = "";
    let capturedOptions: RequestInit | undefined;

    const mockFetch = vi.fn().mockImplementation((url, options) => {
      capturedUrl = url.toString();
      capturedOptions = options;
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ status: 1, product: { product_name: "Test Product" } }),
      });
    });

    const client = new OpenFoodFactsClient(undefined, mockFetch as typeof fetch);
    await client.fetchProductByGtin("8901058852738");

    // 1. Verify exact URL structure
    expect(capturedUrl).toBe("https://world.openfoodfacts.org/api/v2/product/8901058852738.json");
    expect(capturedUrl).not.toContain("?");
    expect(capturedUrl).not.toContain("&");
    expect(capturedUrl).not.toContain("user");
    expect(capturedUrl).not.toContain("token");

    // 2. Verify options
    expect(capturedOptions).toBeDefined();
    expect(capturedOptions?.method).toBe("GET");
    expect(capturedOptions?.body).toBeUndefined(); // GET has no body
    expect(capturedOptions?.credentials).toBe("omit"); // no cookies

    // 3. Verify headers: contains mandatory User-Agent, lacks Auth
    const headers = capturedOptions?.headers as Record<string, string>;
    expect(headers).toBeDefined();
    expect(headers["User-Agent"]).toBe("FoodCue-PWA/1.0 (contact: parth022002@github.com)");
    expect(headers["Authorization"]).toBeUndefined();
    expect(headers["Cookie"]).toBeUndefined();
    expect(headers["X-User-Id"]).toBeUndefined();
    expect(headers["X-Device-Id"]).toBeUndefined();
  });

  it("does not leak OCR text, image data, or pantry contents to OpenFoodFacts", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ status: 1, product: { product_name: "Sample Item" } }),
    });

    const client = new OpenFoodFactsClient(undefined, mockFetch as typeof fetch);
    await client.fetchProductByGtin("8901058852332");

    const calls = mockFetch.mock.calls;
    expect(calls.length).toBe(1);

    const callArgs = JSON.stringify(calls[0]);
    expect(callArgs).not.toContain("ocr");
    expect(callArgs).not.toContain("image");
    expect(callArgs).not.toContain("pantry");
    expect(callArgs).not.toContain("allergens");
  });
});
