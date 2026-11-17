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
 * /api/devices
 *
 * GET: Lists all registered devices for the authenticated user.
 * POST: Registers or updates heartbeat for the current client device.
 * DELETE: Revokes a specified device (passed via ?deviceId=UUID).
 */
export default async function handler(
  req: UniversalServerRequest,
  res?: UniversalServerResponse
): Promise<Response> {
  const { headers, method, json } = await parseRequest(req);

  try {
    const userContext = await authenticateRequest(headers);

    if (method === "GET") {
      const devices = await syncRepository.listDevices(userContext.clerkUserId);
      return sendResponse(res, { devices }, 200);
    }

    if (method === "POST") {
      const body = await json<{
        deviceId?: string;
        deviceName?: string;
        clientVersion?: string;
        userAgent?: string;
      }>();

      if (!body || !body.deviceId || !body.deviceName) {
        return sendResponse(res, { error: "deviceId and deviceName are required.", code: "INVALID_PAYLOAD" }, 400);
      }

      const result = await syncRepository.upsertDevice({
        deviceId: body.deviceId,
        clerkUserId: userContext.clerkUserId,
        deviceName: body.deviceName,
        clientVersion: body.clientVersion,
        userAgent: body.userAgent
      });

      return sendResponse(res, { registered: true, isRevoked: result.isRevoked }, 200);
    }

    if (method === "DELETE") {
      const queryObj = "query" in req && typeof req.query === "object" ? req.query : undefined;
      let deviceId: string | null = (queryObj?.deviceId as string) ?? null;
      if (!deviceId && "url" in req && typeof req.url === "string") {
        try {
          const url = new URL(req.url, "http://localhost");
          deviceId = url.searchParams.get("deviceId");
        } catch {
          deviceId = null;
        }
      }

      if (!deviceId) {
        return sendResponse(res, { error: "Query parameter deviceId is required.", code: "MISSING_DEVICE_ID" }, 400);
      }

      const revoked = await syncRepository.revokeDevice(deviceId, userContext.clerkUserId);
      return sendResponse(res, { revoked, deviceId }, 200);
    }

    return sendResponse(res, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  } catch (error) {
    return errorResponse(error, res);
  }
}
