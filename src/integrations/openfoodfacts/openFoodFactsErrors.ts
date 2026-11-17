/**
 * FoodCue OpenFoodFacts Integration - Error Hierarchy
 * Controlling Authority: FoodCue Master Specification v13.5 §31.4 & PRD v1.2 §4.5
 */

export class OpenFoodFactsError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "OpenFoodFactsError";
  }
}

export class GtinValidationError extends OpenFoodFactsError {
  constructor(message: string, public readonly invalidGtin: string) {
    super(message, "INVALID_GTIN");
    this.name = "GtinValidationError";
  }
}

export class ProductNotFoundError extends OpenFoodFactsError {
  constructor(public readonly gtin: string) {
    super(`Product with GTIN '${gtin}' was not found in OpenFoodFacts.`, "PRODUCT_NOT_FOUND");
    this.name = "ProductNotFoundError";
  }
}

export class RateLimitError extends OpenFoodFactsError {
  constructor(public readonly retryAfterSeconds?: number) {
    super(
      retryAfterSeconds
        ? `OpenFoodFacts rate limit reached. Please retry after ${retryAfterSeconds} seconds.`
        : "OpenFoodFacts rate limit reached (HTTP 429). Please wait before retrying.",
      "RATE_LIMITED"
    );
    this.name = "RateLimitError";
  }
}

export class NetworkError extends OpenFoodFactsError {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message, "NETWORK_ERROR");
    this.name = "NetworkError";
  }
}

export class TimeoutError extends OpenFoodFactsError {
  constructor(public readonly timeoutMs: number) {
    super(`OpenFoodFacts request timed out after ${timeoutMs}ms.`, "TIMEOUT");
    this.name = "TimeoutError";
  }
}

export class MalformedResponseError extends OpenFoodFactsError {
  constructor(message: string, public readonly rawResponse?: unknown) {
    super(message, "MALFORMED_RESPONSE");
    this.name = "MalformedResponseError";
  }
}
