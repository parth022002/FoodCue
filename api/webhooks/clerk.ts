import { jsonResponse, parseRequest } from "../../src/server/utils/response";
import { userRepository } from "../../src/server/database/repositories/user.repository";
import { webhookRepository } from "../../src/server/database/repositories/webhook.repository";
import { verifySvixSignature } from "../../src/server/auth/svixVerification";

export const config = {
  runtime: "nodejs"
};

/**
 * POST /api/webhooks/clerk
 *
 * Production Clerk webhook endpoint with cryptographic Svix HMAC signature verification
 * and an idempotency ledger to prevent replay attacks.
 *
 * Handles user lifecycle events:
 *   - user.created: Creates or reconciles the FoodCue user profile.
 *   - user.updated: Updates email, display name, and username.
 *   - user.deleted: Sets deleted_at timestamp (soft-delete).
 */
export default async function handler(req: Request): Promise<Response> {
  const { headers, method, text } = await parseRequest(req);

  if (method !== "POST") {
    return jsonResponse({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  const webhookSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;

  // 1. Guardrail: Fail closed if signing secret is not configured
  if (!webhookSecret || webhookSecret.trim() === "" || webhookSecret === "whsec_REPLACE_ME") {
    return jsonResponse(
      {
        error: "Webhook endpoint is not active. CLERK_WEBHOOK_SIGNING_SECRET is pending configuration in Clerk Dashboard.",
        code: "WEBHOOK_SECRET_PENDING"
      },
      503
    );
  }

  // 2. Extract Svix signature headers
  const getHeader = (name: string): string | null => {
    if (typeof (headers as Headers).get === "function") {
      return (headers as Headers).get(name);
    }
    const val = (headers as Record<string, string | string[] | undefined>)[name];
    return Array.isArray(val) ? val[0] ?? null : val ?? null;
  };

  const svixId = getHeader("svix-id");
  const svixTimestamp = getHeader("svix-timestamp");
  const svixSignature = getHeader("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return jsonResponse(
      {
        error: "Missing required Svix webhook verification headers.",
        code: "MISSING_SVIX_HEADERS"
      },
      400
    );
  }

  // 3. Read raw payload text for signature verification
  const rawBody = await text();
  if (!rawBody) {
    return jsonResponse({ error: "Empty webhook payload.", code: "EMPTY_PAYLOAD" }, 400);
  }

  // 4. Verify cryptographic Svix signature
  try {
    verifySvixSignature(rawBody, { id: svixId, timestamp: svixTimestamp, signature: svixSignature }, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook signature";
    return jsonResponse({ error: message, code: "INVALID_SIGNATURE" }, 401);
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
    return jsonResponse({ error: "Malformed JSON payload.", code: "INVALID_JSON" }, 400);
  }

  if (!payload || !payload.type || !payload.data?.id) {
    return jsonResponse({ error: "Invalid webhook payload structure.", code: "INVALID_PAYLOAD" }, 400);
  }

  const { type, data } = payload;
  const clerkUserId = data.id;

  // 6. Idempotency Check: Claim event to prevent double-processing or replay attacks
  const isNew = await webhookRepository.claimEvent(svixId, type, payload as unknown as Record<string, unknown>);
  if (!isNew) {
    return jsonResponse({ received: true, deduplicated: true, eventId: svixId }, 200);
  }

  // 7. Execute business logic based on event type
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
        // Acknowledge other events (e.g. session.created, organization.created) without error
        break;
    }

    await webhookRepository.markStatus(svixId, "processed");
    return jsonResponse({ received: true, event: type, userId: clerkUserId, eventId: svixId }, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Webhook handler failed";
    await webhookRepository.markStatus(svixId, "failed", msg);
    return jsonResponse({ error: msg, code: "WEBHOOK_PROCESSING_FAILED" }, 500);
  }
}
