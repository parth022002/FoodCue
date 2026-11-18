import { authenticateRequest } from "../auth/authorization";
import { householdRepository } from "../database/repositories/household.repository";
import { profileRepository } from "../database/repositories/profile.repository";
import { ValidationError } from "../errors/appErrors";
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
 * GET /api/households — Lists all households for the authenticated user.
 * POST /api/households — Creates a new household and designates the caller as owner.
 */
export default async function handler(
  req: UniversalServerRequest,
  res?: UniversalServerResponse
): Promise<Response> {
  const { headers, method, json } = await parseRequest(req);

  try {
    const userContext = await authenticateRequest(headers);
    const clerkUserId = userContext.clerkUserId;

    if (method === "GET") {
      const households = await householdRepository.listUserHouseholds(clerkUserId);
      return sendResponse(res, { households }, 200);
    }

    if (method === "POST") {
      const body = (await json<{
        name?: string;
        description?: string;
        householdType?: string;
        location?: string;
      }>()) ?? {};

      if (!body.name || !body.name.trim()) {
        throw new ValidationError("Household name is required.");
      }

      const household = await householdRepository.createHousehold({
        name: body.name.trim(),
        description: body.description ?? null,
        householdType: body.householdType ?? "Family",
        location: body.location ?? null,
        ownerClerkUserId: clerkUserId
      });

      // Update onboarding status if currently in onboarding
      const userProfile = await profileRepository.findByClerkUserId(clerkUserId);
      if (userProfile && (userProfile.onboardingStatus === "PROFILE_COMPLETED" || userProfile.onboardingStatus === "HOUSEHOLD_SETUP_PENDING")) {
        await profileRepository.updateOnboardingStatus(clerkUserId, "ONBOARDING_COMPLETED");
      }

      return sendResponse(res, { household }, 201);
    }

    return sendResponse(res, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  } catch (error) {
    return errorResponse(error, res);
  }
}
