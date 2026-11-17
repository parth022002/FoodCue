/**
 * OpenFoodFacts HTTP Client Test Suite
 * Master Specification v13.5 §31.4 & PRD v1.2 §4.5
 */

import { describe, expect, it, vi } from "vitest";
import {
  OpenFoodFactsClient,
  GtinValidationError,
  ProductNotFoundError,
  RateLimitError,
  TimeoutError,
  MalformedResponseError,
} from "../../../src/integrations/openfoodfacts";

describe("OpenFoodFactsClient", () => {
  it("rejects invalid GTIN without making network request", async () => {
    const fetchMock = vi.fn();
    const client = new OpenFoodFactsClient(undefined, fetchMock as typeof fetch);

    await expect(client.fetchProductByGtin("not-a-number")).rejects.toThrow(GtinValidationError);
    await expect(client.fetchProductByGtin("12345")).rejects.toThrow(GtinValidationError);
    await expect(client.fetchProductByGtin("8901058852339")).rejects.toThrow(GtinValidationError); // bad check digit

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("successfully fetches and returns valid product response", async () => {
    const mockResponseData = {
      status: 1,
      status_verbose: "product found",
      code: "8901058852738",
      product: {
        code: "8901058852738",
        product_name: "Tata Salt",
        brands: "Tata",
        quantity: "1 kg",
        categories: "Staples, Salt",
        ingredients_text: "Edible common salt, potassium iodate",
        allergens_tags: [],
        nutriments: {
          sodium_100g: 38.7,
        },
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => mockResponseData,
    });

    const client = new OpenFoodFactsClient(undefined, fetchMock as typeof fetch);
    const result = await client.fetchProductByGtin("8901058852738");

    expect(result.status).toBe(1);
    expect(result.product?.product_name).toBe("Tata Salt");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://world.openfoodfacts.org/api/v2/product/8901058852738.json",
      expect.objectContaining({
        method: "GET",
        credentials: "omit",
        headers: expect.objectContaining({
          "User-Agent": "FoodCue-PWA/1.0 (contact: parth022002@github.com)",
        }),
      })
    );
  });

  it("throws ProductNotFoundError when status is 0 or HTTP 404", async () => {
    // Case 1: Status 0
    const fetchMockStatus0 = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ status: 0, status_verbose: "product not found" }),
    });

    const client1 = new OpenFoodFactsClient(undefined, fetchMockStatus0 as typeof fetch);
    await expect(client1.fetchProductByGtin("8901058852738")).rejects.toThrow(ProductNotFoundError);

    // Case 2: HTTP 404
    const fetchMock404 = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      headers: new Headers(),
    });

    const client2 = new OpenFoodFactsClient(undefined, fetchMock404 as typeof fetch);
    await expect(client2.fetchProductByGtin("8901058852738")).rejects.toThrow(ProductNotFoundError);
  });

  it("handles HTTP 429 RateLimitError with Retry-After header", async () => {
    const fetchMock429 = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      headers: new Headers({ "Retry-After": "30" }),
    });

    const client = new OpenFoodFactsClient(undefined, fetchMock429 as typeof fetch);
    try {
      await client.fetchProductByGtin("8901058852738");
      expect.fail("Should have thrown RateLimitError");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterSeconds).toBe(30);
    }
  });

  it("throws MalformedResponseError on invalid JSON payload structure", async () => {
    const fetchMockBadJson = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ status: "invalid_status_type_not_number" }),
    });

    const client = new OpenFoodFactsClient(undefined, fetchMockBadJson as typeof fetch);
    await expect(client.fetchProductByGtin("8901058852738")).rejects.toThrow(MalformedResponseError);
  });

  it("throws TimeoutError on aborted request", async () => {
    const fetchMockTimeout = vi.fn().mockImplementation((_url, options) => {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => {
          const abortErr = new Error("The operation was aborted.");
          abortErr.name = "AbortError";
          reject(abortErr);
        });
      });
    });

    const client = new OpenFoodFactsClient({ timeoutMs: 50 }, fetchMockTimeout as typeof fetch);
    await expect(client.fetchProductByGtin("8901058852738")).rejects.toThrow(TimeoutError);
  });
});
