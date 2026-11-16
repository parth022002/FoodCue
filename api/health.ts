import { checkDatabaseHealth } from "../src/server/database/client";
import { jsonResponse } from "../src/server/utils/response";

export const config = {
  runtime: "edge"
};

/**
 * GET /api/health
 * Public health check confirming backend status and Neon database connectivity.
 * Never leaks credentials or database hostnames.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return jsonResponse({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  const dbHealth = await checkDatabaseHealth();

  if (!dbHealth.connected) {
    return jsonResponse(
      {
        status: "error",
        application: "foodcue",
        database: "unavailable"
      },
      503
    );
  }

  return jsonResponse(
    {
      status: "ok",
      application: "foodcue",
      database: "connected"
    },
    200
  );
}
