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
 * GET /api/sync/pull
 *
 * Pulls incremental synchronization delta operations for the authenticated user.
 * Optional query parameter: ?since=<ISO_TIMESTAMP>
 * Returns operations created after the cursor, ordered chronologically.
 */
export default async function handler(
  req: UniversalServerRequest,
  res?: UniversalServerResponse
): Promise<Response> {
  const { headers, method } = await parseRequest(req);

  if (method !== "GET") {
    return sendResponse(res, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const userContext = await authenticateRequest(headers);

    const queryObj = "query" in req && typeof req.query === "object" ? req.query : undefined;
    let sinceTimestamp: string | null = (queryObj?.since as string) ?? null;
    if (!sinceTimestamp && "url" in req && typeof req.url === "string") {
      try {
        const url = new URL(req.url, "http://localhost");
        sinceTimestamp = url.searchParams.get("since");
      } catch {
        sinceTimestamp = null;
      }
    }

    // Scoped tenant ID: organizationId if present, else user's personal clerkUserId
    const tenantId = userContext.organizationId || userContext.clerkUserId;

    const operations = await syncRepository.pullOperationsSince(
      tenantId,
      sinceTimestamp,
      100
    );

    return sendResponse(
      res,
      {
        serverTimestamp: new Date().toISOString(),
        operations,
        hasMore: operations.length >= 100
      },
      200
    );
  } catch (error) {
    return errorResponse(error, res);
  }
}
