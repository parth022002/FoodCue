import { authenticateRequest } from "../auth/authorization";
import { syncRepository } from "../database/repositories/sync.repository";
import {
  sendResponse,
  errorResponse,
  parseRequest,
  type UniversalServerRequest,
  type UniversalServerResponse
} from "../utils/response";

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
export default async function handler(
  req: UniversalServerRequest,
  res?: UniversalServerResponse
): Promise<Response> {
  const { headers, method, json } = await parseRequest(req);

  if (method !== "POST") {
    return sendResponse(res, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
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
      return sendResponse(
        res,
        { error: "Invalid sync push payload. deviceId and operations array are required.", code: "INVALID_PAYLOAD" },
        400
      );
    }

    // Check device revocation
    const isRevoked = await syncRepository.isDeviceRevoked(body.deviceId, userContext.clerkUserId);
    if (isRevoked) {
      return sendResponse(
        res,
        { error: "This device has been revoked. Re-authenticate to resume syncing.", code: "DEVICE_REVOKED" },
        403
      );
    }

    const { processed, duplicates } = await syncRepository.processPushBatch(
      userContext.clerkUserId,
      body.deviceId,
      body.operations
    );

    return sendResponse(
      res,
      {
        success: true,
        processedCount: processed,
        duplicateCount: duplicates,
        serverTimestamp: new Date().toISOString()
      },
      200
    );
  } catch (error) {
    return errorResponse(error, res);
  }
}
