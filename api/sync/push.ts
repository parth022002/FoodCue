import { authenticateRequest } from "../../src/server/auth/authorization";
import { syncRepository } from "../../src/server/database/repositories/sync.repository";
import { jsonResponse, errorResponse, parseRequest } from "../../src/server/utils/response";

export const config = {
  runtime: "nodejs"
};

/**
 * POST /api/sync/push
 *
 * Ingests a batch of queued synchronization operations from an authenticated client device.
 * Enforces:
 *   1. Clerk Bearer token validation.
 *   2. Device revocation check (rejects revoked devices).
 *   3. Operation idempotency via unique idempotency_key.
 *   4. Cloud entity projection under the authenticated clerk_user_id.
 */
export default async function handler(req: Request): Promise<Response> {
  const { headers, method, json } = await parseRequest(req);

  if (method !== "POST") {
    return jsonResponse({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const userContext = await authenticateRequest(headers);
    const body = await json<{
      deviceId?: string;
      deviceName?: string;
      clientVersion?: string;
      operations?: Array<{
        idempotencyKey: string;
        entityType: string;
        entityId: string;
        operationType: string;
        payload: Record<string, unknown>;
        clientTimestamp: string;
      }>;
    }>();

    if (!body || !body.deviceId || !Array.isArray(body.operations)) {
      return jsonResponse(
        { error: "Invalid sync push payload. deviceId and operations array are required.", code: "INVALID_PAYLOAD" },
        400
      );
    }

    // Check device revocation
    const isRevoked = await syncRepository.isDeviceRevoked(body.deviceId, userContext.clerkUserId);
    if (isRevoked) {
      return jsonResponse(
        { error: "This device has been revoked. Re-authenticate to resume syncing.", code: "DEVICE_REVOKED" },
        403
      );
    }

    const { processed, duplicates } = await syncRepository.processPushBatch(
      userContext.clerkUserId,
      body.deviceId,
      body.operations
    );

    return jsonResponse(
      {
        success: true,
        processedCount: processed,
        duplicateCount: duplicates,
        serverTimestamp: new Date().toISOString()
      },
      200
    );
  } catch (error) {
    return errorResponse(error);
  }
}
