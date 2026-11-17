import {
  sendResponse,
  parseRequest,
  type UniversalServerRequest,
  type UniversalServerResponse
} from "../../src/server/utils/response";
import { userRepository } from "../../src/server/database/repositories/user.repository";
import { webhookRepository } from "../../src/server/database/repositories/webhook.repository";
import { verifySvixSignature } from "../../src/server/auth/svixVerification";

/**
 * Crucial for Vercel Serverless Functions:
 * Disabling bodyParser preserves the exact raw stream so HMAC-SHA256 signature
 * matches byte-for-byte with Svix/Clerk.
 */
export const config = {
  api: {
    bodyParser: false
  }
};

/**
 * POST /api/webhooks/clerk
 *
 * Production Clerk webhook endpoint with cryptographic Svix HMAC signature verification
 * and an idempotency ledger to prevent replay attacks and duplicate user creation.
 *
 * Supports both:
 *  - Node.js Serverless runtime (@vercel/node with req & res)
 *  - Standard Web Fetch API (Request => Response)
 *
 * Handles user lifecycle events:
 *   - user.created: Idempotently creates or reconciles the FoodCue user profile in Neon.
 *   - user.updated: Updates email, display name, and username.
 *   - user.deleted: Sets deleted_at timestamp (soft-delete).
 */
export default async function handler(
  req: UniversalServerRequest,
  res?: UniversalServerResponse
): Promise<Response> {
  const { method, getHeader, text } = await parseRequest(req);

  if (method !== "POST") {
    return sendResponse(res, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  const webhookSecret =
    process.env.CLERK_WEBHOOK_SIGNING_SECRET ||
    process.env.CLERK_WEBHOOK_SECRET ||
    process.env.WEBHOOK_SECRET;

  // 1. Guardrail: Fail closed if signing secret is not configured
  if (!webhookSecret || webhookSecret.trim() === "" || webhookSecret === "whsec_REPLACE_ME") {
    return sendResponse(
      res,
      {
        error: "Webhook endpoint is not active. CLERK_WEBHOOK_SIGNING_SECRET is pending configuration in Clerk Dashboard.",
        code: "WEBHOOK_SECRET_PENDING"
      },
      503
    );
  }

  // 2. Extract Svix signature headers
  const svixId = getHeader("svix-id");
  const svixTimestamp = getHeader("svix-timestamp");
  const svixSignature = getHeader("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return sendResponse(
      res,
      {
        error: "Missing required Svix webhook verification headers (svix-id, svix-timestamp, svix-signature).",
        code: "MISSING_SVIX_HEADERS"
      },
      400
    );
  }

  // 3. Read raw payload text for signature verification
  const rawBody = await text();
  if (!rawBody) {
    return sendResponse(res, { error: "Empty webhook payload.", code: "EMPTY_PAYLOAD" }, 400);
  }

  // 4. Verify cryptographic Svix signature (HMAC-SHA256 with 300s replay window)
  try {
    verifySvixSignature(rawBody, { id: svixId, timestamp: svixTimestamp, signature: svixSignature }, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook signature";
    return sendResponse(res, { error: message, code: "INVALID_SIGNATURE" }, 401);
  }

  // 5. Parse JSON payload
  let payload: {
    type: string;
    data: {
      id: string;
      email_addresses?: Array<{ id: string; email_address: string }>;
      primary_email_address_id?: string;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
  };

  try {
    payload = JSON.parse(rawBody);
  } catch {
    return sendResponse(res, { error: "Malformed JSON payload.", code: "INVALID_JSON" }, 400);
  }

  if (!payload || !payload.type || !payload.data?.id) {
    return sendResponse(res, { error: "Invalid webhook payload structure. type and data.id are required.", code: "INVALID_PAYLOAD" }, 400);
  }

  const { type, data } = payload;
  const clerkUserId = data.id;

  // 6. Idempotency Check: Claim event in ledger (prevents duplicate processing on retries)
  const isNewOrRetry = await webhookRepository.claimEvent(svixId, type, payload as unknown as Record<string, unknown>);
  if (!isNewOrRetry) {
    return sendResponse(res, { received: true, deduplicated: true, eventId: svixId }, 200);
  }

  // 7. Execute user synchronization logic in Neon PostgreSQL
  try {
    const primaryEmail =
      data.email_addresses?.find((e) => e.id === data.primary_email_address_id)?.email_address ??
      data.email_addresses?.[0]?.email_address ??
      null;

    const displayName =
      [data.first_name, data.last_name].filter(Boolean).join(" ").trim() ||
      data.username ||
      null;

    switch (type) {
      case "user.created":
      case "user.updated": {
        await userRepository.create({
          clerkUserId,
          email: primaryEmail,
          displayName,
          username: data.username ?? null,
          isAnonymous: false
        });
        break;
      }

      case "user.deleted": {
        await userRepository.markDeleted(clerkUserId);
        break;
      }

      default:
        // Acknowledge other Clerk events (session.created, organization.created, etc.) with 200 OK
        break;
    }

    await webhookRepository.markStatus(svixId, "processed");
    return sendResponse(res, { received: true, event: type, userId: clerkUserId, eventId: svixId }, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Webhook handler failed";
    await webhookRepository.markStatus(svixId, "failed", msg);
    return sendResponse(res, { error: msg, code: "WEBHOOK_PROCESSING_FAILED" }, 500);
  }
}
