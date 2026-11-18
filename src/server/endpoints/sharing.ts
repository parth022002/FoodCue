import { authenticateRequest } from "../auth/authorization";
import { householdRepository } from "../database/repositories/household.repository";
import { ValidationError, ForbiddenError } from "../errors/appErrors";
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

function extractQuery(req: UniversalServerRequest): URLSearchParams {
  const urlStr = typeof (req as Request).url === "string" ? (req as Request).url : (req as { url?: string }).url;
  if (urlStr) {
    try {
      const parsed = new URL(urlStr, "http://localhost");
      return parsed.searchParams;
    } catch {
      // fallback
    }
  }
  return new URLSearchParams();
}

interface UpdateSharingBody {
  householdId?: string;
  category?: string;
  enabled?: boolean;
}

/**
 * GET /api/sharing?householdId=... — Returns sharing preferences for current user in household.
 * POST /api/sharing — Updates explicit sharing permission for category (allergies, dietary_preferences).
 */
export default async function handler(
  req: UniversalServerRequest,
  res?: UniversalServerResponse
): Promise<Response> {
  const { headers, method, json } = await parseRequest(req);
  const queryParams = extractQuery(req);

  try {
    const userContext = await authenticateRequest(headers);
    const clerkUserId = userContext.clerkUserId;

    if (method === "GET") {
      const householdId = queryParams.get("householdId");
      if (!householdId) throw new ValidationError("householdId parameter is required.");

      const role = await householdRepository.getMemberRole(householdId, clerkUserId);
      if (!role) throw new ForbiddenError("You are not a member of this household.");

      const preferences = await householdRepository.getSharingPreferences(householdId, clerkUserId);
      return sendResponse(res, { preferences }, 200);
    }

    if (method === "POST" || method === "PUT") {
      const body = (await json<UpdateSharingBody>()) ?? {};

      if (!body.householdId || !body.category) {
        throw new ValidationError("householdId and category are required.");
      }

      const role = await householdRepository.getMemberRole(body.householdId, clerkUserId);
      if (!role) throw new ForbiddenError("You are not a member of this household.");

      await householdRepository.setSharingPreference(
        body.householdId,
        clerkUserId,
        body.category,
        Boolean(body.enabled)
      );

      const preferences = await householdRepository.getSharingPreferences(body.householdId, clerkUserId);
      return sendResponse(res, { success: true, preferences }, 200);
    }

    return sendResponse(res, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  } catch (error) {
    return errorResponse(error, res);
  }
}
