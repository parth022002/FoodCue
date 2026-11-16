import { authenticateRequest } from "../src/server/auth/authorization";
import { userService } from "../src/server/services/user.service";
import { jsonResponse, errorResponse, parseRequest } from "../src/server/utils/response";

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
export default async function handler(req: Request): Promise<Response> {
  const { headers, method, json } = await parseRequest(req);

  try {
    // 1. Authenticate using Clerk session Bearer token
    const userContext = await authenticateRequest(headers);

    if (method === "GET") {
      // 2. Retrieve or idempotently provision the user record
      const user = await userService.getOrCreateUser(userContext);
      return jsonResponse(userService.formatPublicProfile(user), 200);
    }

    if (method === "PATCH") {
      const body = (await json<{ displayName?: string; username?: string }>()) ?? {};
      const updated = await userService.updateUserProfile(userContext.clerkUserId, {
        displayName: body.displayName,
        username: body.username
      });
      return jsonResponse(userService.formatPublicProfile(updated), 200);
    }

    return jsonResponse({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  } catch (error) {
    return errorResponse(error);
  }
}
