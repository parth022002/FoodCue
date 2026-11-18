import { authenticateRequest } from "../auth/authorization";
import { householdRepository } from "../database/repositories/household.repository";
import { ValidationError, ForbiddenError, NotFoundError } from "../errors/appErrors";
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

/**
 * GET /api/households/details?householdId=... — Returns household details, members and invites.
 */
export default async function handler(
  req: UniversalServerRequest,
  res?: UniversalServerResponse
): Promise<Response> {
  const { headers, method } = await parseRequest(req);
  const queryParams = extractQuery(req);

  try {
    const userContext = await authenticateRequest(headers);
    const clerkUserId = userContext.clerkUserId;

    const householdId = queryParams.get("householdId") || queryParams.get("id");
    if (!householdId) {
      throw new ValidationError("Missing required parameter: householdId");
    }

    const household = await householdRepository.findById(householdId);
    if (!household) {
      throw new NotFoundError("Household not found.");
    }

    const role = await householdRepository.getMemberRole(householdId, clerkUserId);
    if (!role) {
      throw new ForbiddenError("You are not an authorized member of this household.");
    }

    if (method === "GET") {
      const members = await householdRepository.getHouseholdMembers(householdId, clerkUserId);
      const invitations = await householdRepository.listHouseholdInvitations(householdId, clerkUserId);

      return sendResponse(
        res,
        {
          household,
          userRole: role,
          members,
          invitations
        },
        200
      );
    }

    return sendResponse(res, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  } catch (error) {
    return errorResponse(error, res);
  }
}
