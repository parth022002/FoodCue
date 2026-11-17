import { authenticateRequest } from "../auth/authorization";
import { query } from "../database/client";
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
 * GET /api/sync/status
 *
 * Returns tenant-isolated cloud synchronization status for the authenticated user.
 * Conforms strictly to FoodCue Master Specification v13.5 §9.3 & Security Requirements.
 * NOTE: Never returns database connection strings, infrastructure credentials, or internal diagnostics.
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

    // 1. Check registered devices count
    const deviceRows = await query<{ count: string; last_sync: string | null }>(
      `
      SELECT COUNT(*)::text as count, MAX(last_sync_at)::text as last_sync
      FROM sync_devices
      WHERE clerk_user_id = $1 AND is_revoked = FALSE;
      `,
      [userContext.clerkUserId]
    );

    const activeDevicesCount = parseInt(deviceRows[0]?.count ?? "0", 10);
    const lastSyncAt = deviceRows[0]?.last_sync ?? null;

    // 2. Check total operations count and current cursor
    const opRows = await query<{ count: string; max_cursor: string | null }>(
      `
      SELECT COUNT(*)::text as count, MAX(server_timestamp)::text as max_cursor
      FROM sync_operations
      WHERE clerk_user_id = $1;
      `,
      [userContext.clerkUserId]
    );

    const totalOperations = parseInt(opRows[0]?.count ?? "0", 10);
    const currentCursor = opRows[0]?.max_cursor ?? null;

    // 3. Check entity counts
    const entityRows = await query<{
      pantry_events: string;
      confirmed_labels: string;
      shopping_items: string;
    }>(
      `
      SELECT
        (SELECT COUNT(*)::text FROM foodcue_pantry_events WHERE clerk_user_id = $1) as pantry_events,
        (SELECT COUNT(*)::text FROM foodcue_confirmed_labels WHERE clerk_user_id = $1) as confirmed_labels,
        (SELECT COUNT(*)::text FROM foodcue_shopping_list WHERE clerk_user_id = $1) as shopping_items;
      `,
      [userContext.clerkUserId]
    );

    const pantryEventsCount = parseInt(entityRows[0]?.pantry_events ?? "0", 10);
    const confirmedLabelsCount = parseInt(entityRows[0]?.confirmed_labels ?? "0", 10);
    const shoppingItemsCount = parseInt(entityRows[0]?.shopping_items ?? "0", 10);

    return sendResponse(
      res,
      {
        syncEnabled: activeDevicesCount > 0 || totalOperations > 0,
        activeDevicesCount,
        lastSuccessfulSync: lastSyncAt,
        currentCursor,
        totalOperations,
        cloudRecordCounts: {
          pantryEvents: pantryEventsCount,
          confirmedLabels: confirmedLabelsCount,
          shoppingItems: shoppingItemsCount
        },
        conflictCount: 0,
        serverTimestamp: new Date().toISOString()
      },
      200
    );
  } catch (error) {
    return errorResponse(error, res);
  }
}
