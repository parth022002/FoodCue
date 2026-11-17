import { checkDatabaseHealth } from "../src/server/database/client";
import {
  sendResponse,
  parseRequest,
  type UniversalServerRequest,
  type UniversalServerResponse
} from "../src/server/utils/response";

export const config = {
  runtime: "nodejs"
};

/**
 * GET /api/health
 * Public health check confirming backend status and Neon database connectivity.
 * Never leaks credentials or database hostnames.
 */
export default async function handler(
  req: UniversalServerRequest,
  res?: UniversalServerResponse
): Promise<Response> {
  const { method } = await parseRequest(req);

  if (method !== "GET" && method !== "HEAD") {
    return sendResponse(res, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const dbHealth = await checkDatabaseHealth();

    if (!dbHealth.connected) {
      return sendResponse(
        res,
        {
          status: "error",
          application: "foodcue",
          database: "unavailable"
        },
        503
      );
    }

    return sendResponse(
      res,
      {
        status: "ok",
        application: "foodcue",
        database: "connected"
      },
      200
    );
  } catch (err) {
    return sendResponse(
      res,
      {
        status: "error",
        application: "foodcue",
        database: "unavailable",
        message: err instanceof Error ? err.message : "Database check failed"
      },
      503
    );
  }
}
