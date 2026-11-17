import { authenticateRequest } from "../auth/authorization";
import { userService } from "../services/user.service";
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
 * GET /api/me — Returns the FoodCue profile for the authenticated Clerk user.
 * PATCH /api/me — Updates allowed profile fields for the authenticated user.
 *
 * Identity is derived exclusively from the verified Clerk session Bearer token.
 * Never accepts user ID from query params or body payload as proof of identity.
 */
export default async function handler(
  req: UniversalServerRequest,
  res?: UniversalServerResponse
): Promise<Response> {
  const { headers, method, json } = await parseRequest(req);

  try {
    // 1. Authenticate using Clerk session Bearer token
    const userContext = await authenticateRequest(headers);

    if (method === "GET") {
      // 2. Retrieve or idempotently provision the user record
      const user = await userService.getOrCreateUser(userContext);
      return sendResponse(res, userService.formatPublicProfile(user), 200);
    }

    if (method === "PATCH") {
      const body = (await json<{ displayName?: string; username?: string }>()) ?? {};
      const updated = await userService.updateUserProfile(userContext.clerkUserId, {
        displayName: body.displayName,
        username: body.username
      });
      return sendResponse(res, userService.formatPublicProfile(updated), 200);
    }

    return sendResponse(res, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  } catch (error) {
    return errorResponse(error, res);
  }
}
