import { UnauthorizedError } from "../errors/appErrors";
import { verifyClerkSessionToken, type VerifiedUserContext } from "./clerk";

type HeaderInput =
  | Headers
  | Record<string, string | string[] | undefined>
  | { get?: (name: string) => string | null }
  | undefined;

/**
 * Extracts the Bearer token from the Authorization header across Web Headers or Node request headers.
 */
export function extractBearerToken(headers: HeaderInput): string | null {
  if (!headers) return null;

  let authHeader: string | null = null;

  if (typeof (headers as Headers).get === "function") {
    authHeader = (headers as Headers).get("authorization");
  } else {
    const raw = (headers as Record<string, string | string[] | undefined>)["authorization"] ||
                (headers as Record<string, string | string[] | undefined>)["Authorization"];
    authHeader = Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
  }

  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+([A-Za-z0-9\-._~+/]+=*)$/);
  return match ? (match[1] ?? null) : null;
}

/**
 * Verifies that the incoming request contains a valid Clerk Bearer session token.
 * Extracts and returns the trusted VerifiedUserContext.
 * Rejects unauthenticated requests or spoofed identities.
 */
export async function authenticateRequest(
  headers: HeaderInput,
  options: { secretKeyOverride?: string } = {}
): Promise<VerifiedUserContext> {
  const token = extractBearerToken(headers);

  if (!token) {
    throw new UnauthorizedError("Authentication required. Missing or malformed Bearer token in Authorization header.");
  }

  return verifyClerkSessionToken(token, options.secretKeyOverride);
}
