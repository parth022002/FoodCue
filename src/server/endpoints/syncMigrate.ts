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
 * POST /api/sync/migrate
 *
 * Atomically ingests an initial local IndexedDB snapshot when the user opts in to cloud sync.
 * Guarantees that local items (pantry events, confirmed labels, shopping items)
 * are safely persisted under the user's clerk_user_id in Neon PostgreSQL.
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
    const snapshot = await json<{
      pantryEvents?: Array<Record<string, unknown>>;
      confirmedLabels?: Array<Record<string, unknown>>;
      shoppingItems?: Array<Record<string, unknown>>;
      settings?: Record<string, unknown>;
    }>();

    if (!snapshot) {
      return sendResponse(res, { error: "Empty migration snapshot.", code: "INVALID_PAYLOAD" }, 400);
    }

    const counts = await syncRepository.migrateSnapshot(userContext.clerkUserId, snapshot);

    return sendResponse(
      res,
      {
        migrated: true,
        counts,
        serverTimestamp: new Date().toISOString()
      },
      200
    );
  } catch (error) {
    return errorResponse(error, res);
  }
}
