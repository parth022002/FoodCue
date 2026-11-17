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
 * POST /api/sync/deleteCloudData
 *
 * Permanently deletes all cloud data associated with the authenticated user
 * in compliance with FoodCue Security & Privacy Requirements §21.6 and GDPR / DPDP Act.
 * Local browser IndexedDB data is intentionally untouched.
 */
export default async function handler(
  req: UniversalServerRequest,
  res?: UniversalServerResponse
): Promise<Response> {
  const { headers, method } = await parseRequest(req);

  if (method !== "POST") {
    return sendResponse(res, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    const userContext = await authenticateRequest(headers);
    const userId = userContext.clerkUserId;

    // 1. Delete pantry events
    await query(`DELETE FROM foodcue_pantry_events WHERE clerk_user_id = $1;`, [userId]);

    // 2. Delete pantry items
    await query(`DELETE FROM foodcue_pantry_items WHERE clerk_user_id = $1;`, [userId]);

    // 3. Delete confirmed labels
    await query(`DELETE FROM foodcue_confirmed_labels WHERE clerk_user_id = $1;`, [userId]);

    // 4. Delete shopping list
    await query(`DELETE FROM foodcue_shopping_list WHERE clerk_user_id = $1;`, [userId]);

    // 5. Delete reminders
    await query(`DELETE FROM foodcue_reminders WHERE clerk_user_id = $1;`, [userId]);

    // 6. Delete sync operations
    await query(`DELETE FROM sync_operations WHERE clerk_user_id = $1;`, [userId]);

    // 7. Revoke and delete sync devices
    await query(`DELETE FROM sync_devices WHERE clerk_user_id = $1;`, [userId]);

    return sendResponse(
      res,
      {
        success: true,
        message: "All cloud records and synchronised copies have been permanently erased.",
        serverTimestamp: new Date().toISOString()
      },
      200
    );
  } catch (error) {
    return errorResponse(error, res);
  }
}
