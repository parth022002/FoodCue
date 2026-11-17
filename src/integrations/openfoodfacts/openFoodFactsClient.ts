/**
 * FoodCue OpenFoodFacts Integration - HTTP Client
 * Controlling Authority: FoodCue Master Specification v13.5 §31.4 & PRD v1.2 §4.5
 *
 * Privacy Invariants:
 * 1. GET requests only; only the normalized numeric GTIN is in the URL.
 * 2. Mandatory User-Agent header: FoodCue-PWA/1.0 (contact: parth022002@github.com)
 * 3. Omit credentials; zero cookies, Clerk auth tokens, or telemetry sent.
 */

import { normaliseGtin } from "../../domain/rules/gtin";
import type { OpenFoodFactsClientConfig, RawOpenFoodFactsResponse } from "./openFoodFactsTypes";
import {
  GtinValidationError,
  ProductNotFoundError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  MalformedResponseError,
} from "./openFoodFactsErrors";
import { rawOpenFoodFactsResponseSchema } from "./openFoodFactsSchema";

export const DEFAULT_OFF_CONFIG: Required<OpenFoodFactsClientConfig> = {
  baseUrl: "https://world.openfoodfacts.org/api/v2/product",
  timeoutMs: 8000,
  userAgent: "FoodCue-PWA/1.0 (contact: parth022002@github.com)",
};

export class OpenFoodFactsClient {
  private readonly config: Required<OpenFoodFactsClientConfig>;
  private readonly fetchFn: typeof fetch;

  constructor(config?: OpenFoodFactsClientConfig, customFetch?: typeof fetch) {
    this.config = {
      baseUrl: config?.baseUrl ?? DEFAULT_OFF_CONFIG.baseUrl,
      timeoutMs: config?.timeoutMs ?? DEFAULT_OFF_CONFIG.timeoutMs,
      userAgent: config?.userAgent ?? DEFAULT_OFF_CONFIG.userAgent,
    };
    this.fetchFn = customFetch ?? (typeof fetch !== "undefined" ? fetch.bind(globalThis) : (fetch as typeof fetch));
  }

  /**
   * Performs an optional, user-initiated GTIN metadata lookup against OpenFoodFacts.
   * Sends ONLY the validated numerical GTIN in the URL path.
   */
  async fetchProductByGtin(rawGtin: string): Promise<RawOpenFoodFactsResponse> {
    const clean = rawGtin.trim();
    const gtin = normaliseGtin(clean);

    if (!gtin) {
      throw new GtinValidationError(
        `'${rawGtin}' is not a valid GTIN (must be 8, 12, 13, or 14 digits with valid check digit).`,
        rawGtin
      );
    }

    const endpointUrl = `${this.config.baseUrl}/${gtin}.json`;

    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await this.fetchFn(endpointUrl, {
        method: "GET",
        headers: {
          "User-Agent": this.config.userAgent,
          Accept: "application/json",
        },
        credentials: "omit",
        signal: controller.signal,
      });

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
        throw new RateLimitError(Number.isNaN(retryAfterSec) ? undefined : retryAfterSec);
      }

      if (response.status === 404) {
        throw new ProductNotFoundError(gtin);
      }

      if (!response.ok) {
        throw new NetworkError(
          `OpenFoodFacts returned HTTP ${response.status} (${response.statusText}).`
        );
      }

      const rawJson: unknown = await response.json();
      const parsed = rawOpenFoodFactsResponseSchema.safeParse(rawJson);

      if (!parsed.success) {
        throw new MalformedResponseError(
          "OpenFoodFacts response did not conform to the expected schema.",
          parsed.error.format()
        );
      }

      // OpenFoodFacts uses status: 0 to indicate product not found
      if (parsed.data.status === 0 || !parsed.data.product) {
        throw new ProductNotFoundError(gtin);
      }

      return parsed.data as RawOpenFoodFactsResponse;
    } catch (err: unknown) {
      if (err instanceof GtinValidationError ||
          err instanceof ProductNotFoundError ||
          err instanceof RateLimitError ||
          err instanceof MalformedResponseError) {
        throw err;
      }

      if (err instanceof Error) {
        if (err.name === "AbortError") {
          throw new TimeoutError(this.config.timeoutMs);
        }
        throw new NetworkError(err.message, err);
      }

      throw new NetworkError("Unknown error occurred during OpenFoodFacts request.", err);
    } finally {
      clearTimeout(timeoutHandle);
    }
  }
}
