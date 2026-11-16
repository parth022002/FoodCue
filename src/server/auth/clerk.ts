import { verifyToken, createClerkClient } from "@clerk/backend";
import { getBackendConfig } from "../config/environment";
import { UnauthorizedError } from "../errors/appErrors";

export interface VerifiedUserContext {
  clerkUserId: string;
  sessionClaims: Record<string, unknown>;
  authorizedAt: string;
}

export interface ClerkUserAttributes {
  clerkUserId: string;
  email?: string | null;
  displayName?: string | null;
  username?: string | null;
}

/**
 * Verifies a Clerk session JWT Bearer token on the server side using @clerk/backend.
 * Rejects missing, invalid, or expired tokens.
 * Extracts the stable clerkUserId from the token claims.
 */
export async function verifyClerkSessionToken(
  token: string,
  secretKeyOverride?: string
): Promise<VerifiedUserContext> {
  if (!token || typeof token !== "string" || token.trim() === "") {
    throw new UnauthorizedError("Authentication required. Missing or empty Bearer token.");
  }

  const secretKey = secretKeyOverride ?? getBackendConfig().CLERK_SECRET_KEY;

  try {
    const payload = await verifyToken(token.trim(), {
      secretKey
    });

    const clerkUserId = payload.sub;
    if (!clerkUserId || typeof clerkUserId !== "string" || !clerkUserId.startsWith("user_")) {
      throw new UnauthorizedError("Invalid token claims. Missing verified Clerk user ID.");
    }

    return {
      clerkUserId,
      sessionClaims: payload as unknown as Record<string, unknown>,
      authorizedAt: new Date().toISOString()
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "Token verification failed";
    throw new UnauthorizedError(`Authentication failed: ${message}`);
  }
}

/**
 * Optionally retrieves full user profile attributes from the Clerk API using ClerkClient.
 */
export async function fetchClerkUserAttributes(
  clerkUserId: string,
  secretKeyOverride?: string
): Promise<ClerkUserAttributes> {
  const secretKey = secretKeyOverride ?? getBackendConfig().CLERK_SECRET_KEY;
  const client = createClerkClient({ secretKey });

  try {
    const user = await client.users.getUser(clerkUserId);
    const primaryEmail =
      user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      null;

    const displayName =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.username ||
      null;

    return {
      clerkUserId: user.id,
      email: primaryEmail,
      displayName,
      username: user.username ?? null
    };
  } catch {
    // If Clerk API lookup fails or is unavailable, return minimum verified identity
    return {
      clerkUserId
    };
  }
}
