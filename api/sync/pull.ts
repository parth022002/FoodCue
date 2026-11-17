import { authenticateRequest } from "../../src/server/auth/authorization";
import { syncRepository } from "../../src/server/database/repositories/sync.repository";
import { jsonResponse, errorResponse, parseRequest } from "../../src/server/utils/response";

export const config = {
  runtime: "nodejs"
};

/**
 * GET /api/sync/pull
 *
 * Pulls incremental synchronization delta operations for the authenticated user.
 * Optional query parameter: ?since=<ISO_TIMESTAMP>
 * Returns operations created after the cursor, ordered chronologically.
 */
export default async function handler(req: Request): Promise<Response> {
  const { headers, method } = await parseRequest(req);

  if (method !== "GET") {
    return jsonResponse({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const userContext = await authenticateRequest(headers);

    let sinceTimestamp: string | null = null;
    try {
      const url = new URL((req as Request).url || "http://localhost");
      sinceTimestamp = url.searchParams.get("since");
    } catch {
      sinceTimestamp = null;
    }

    const operations = await syncRepository.pullOperationsSince(
      userContext.clerkUserId,
      sinceTimestamp,
      100
    );

    return jsonResponse(
      {
        serverTimestamp: new Date().toISOString(),
        operations,
        hasMore: operations.length >= 100
      },
      200
    );
  } catch (error) {
    return errorResponse(error);
  }
}
