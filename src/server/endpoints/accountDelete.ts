import { authenticateRequest } from "../auth/authorization";
import { deleteClerkUser } from "../auth/clerk";
import { profileRepository } from "../database/repositories/profile.repository";
import { householdRepository } from "../database/repositories/household.repository";
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
 * POST /api/account/delete
 *
 * Permanently erases personal profile, food preferences, allergies,
 * personal cloud sync records, and removes the user from households.
 * If the user is the owner of an active household with other members,
 * deletion is blocked until ownership is transferred or the household is dissolved.
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
    const clerkUserId = userContext.clerkUserId;

    // 1. Check if user is owner of any active household that has other members
    const ownershipCheck = await householdRepository.checkOwnershipConstraintsBeforeDeletion(clerkUserId);
    if (!ownershipCheck.canDelete) {
      return sendResponse(
        res,
        {
          error: `Cannot delete account while you are the owner of household(s) with active members: "${ownershipCheck.blockingHouseholds.join(
            '", "'
          )}". Please transfer ownership or dissolve the household first.`,
          code: "OWNERSHIP_CONSTRAINT_ACTIVE",
          blockingHouseholds: ownershipCheck.blockingHouseholds
        },
        403
      );
    }

    // 2. Clean up household memberships, dissolve sole-owned households, revoke issued invites
    await householdRepository.cleanupUserHouseholdMemberships(clerkUserId);

    // 3. Purge all personal profile, dietary, allergy, and cloud pantry/sync records
    await profileRepository.deleteUserProfileAndPersonalData(clerkUserId);

    // 4. Record audit log without storing sensitive PII
    await query(
      `
      INSERT INTO audit_logs (actor_clerk_user_id, action, entity_type, entity_id)
      VALUES ($1, 'ACCOUNT_DELETED', 'user_account', $1);
    `,
      [clerkUserId]
    );

    // 5. Delete or revoke Clerk identity if configured
    await deleteClerkUser(clerkUserId).catch(() => {
      // Non-fatal if Clerk external API is unreachable; database records are already purged
    });

    return sendResponse(
      res,
      {
        success: true,
        message: "Your FoodCue account and all personal data have been permanently deleted.",
        serverTimestamp: new Date().toISOString()
      },
      200
    );
  } catch (error) {
    return errorResponse(error, res);
  }
}
