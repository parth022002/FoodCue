import { authenticateRequest } from "../../src/server/auth/authorization";
import { syncRepository } from "../../src/server/database/repositories/sync.repository";
import { jsonResponse, errorResponse, parseRequest } from "../../src/server/utils/response";

export const config = {
  runtime: "nodejs"
};

/**
 * /api/devices
 *
 * GET: Lists all registered devices for the authenticated user.
 * POST: Registers or updates heartbeat for the current client device.
 * DELETE: Revokes a specified device (passed via ?deviceId=UUID).
 */
export default async function handler(req: Request): Promise<Response> {
  const { headers, method, json } = await parseRequest(req);

  try {
    const userContext = await authenticateRequest(headers);

    if (method === "GET") {
      const devices = await syncRepository.listDevices(userContext.clerkUserId);
      return jsonResponse({ devices }, 200);
    }

    if (method === "POST") {
      const body = await json<{
        deviceId?: string;
        deviceName?: string;
        clientVersion?: string;
        userAgent?: string;
      }>();

      if (!body || !body.deviceId || !body.deviceName) {
        return jsonResponse({ error: "deviceId and deviceName are required.", code: "INVALID_PAYLOAD" }, 400);
      }

      const result = await syncRepository.upsertDevice({
        deviceId: body.deviceId,
        clerkUserId: userContext.clerkUserId,
        deviceName: body.deviceName,
        clientVersion: body.clientVersion,
        userAgent: body.userAgent
      });

      return jsonResponse({ registered: true, isRevoked: result.isRevoked }, 200);
    }

    if (method === "DELETE") {
      let deviceId: string | null = null;
      try {
        const url = new URL((req as Request).url || "http://localhost");
        deviceId = url.searchParams.get("deviceId");
      } catch {
        deviceId = null;
      }

      if (!deviceId) {
        return jsonResponse({ error: "Query parameter deviceId is required.", code: "MISSING_DEVICE_ID" }, 400);
      }

      const revoked = await syncRepository.revokeDevice(deviceId, userContext.clerkUserId);
      return jsonResponse({ revoked, deviceId }, 200);
    }

    return jsonResponse({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  } catch (error) {
    return errorResponse(error);
  }
}
