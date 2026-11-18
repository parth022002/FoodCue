import { authenticateRequest } from "../auth/authorization";
import { profileRepository, type OnboardingStatus, type AllergyStatus } from "../database/repositories/profile.repository";
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
 * GET /api/profile — Returns user profile, preferences, allergies, and onboarding status.
 * POST /api/profile — Upserts profile and advances onboarding step.
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
      const bundle = await profileRepository.getFullProfile(clerkUserId);
      return sendResponse(res, bundle, 200);
    }

    if (method === "POST" || method === "PUT" || method === "PATCH") {
      const body = (await json<{
        profile?: {
          fullName: string;
          profileImageUrl?: string | null;
          age?: number | null;
          gender?: string | null;
          country?: string;
          state?: string | null;
          city?: string | null;
          preferredLanguage?: string;
          timezone?: string;
          onboardingStatus?: OnboardingStatus;
        };
        preferences?: Array<{ type: string; value: string }>;
        allergies?: Array<{
          name: string;
          category?: string;
          severity?: "mild" | "moderate" | "severe";
          notes?: string;
        }>;
        allergyStatus?: AllergyStatus;
        onboardingStatus?: OnboardingStatus;
      }>()) ?? {};

      // 1. Upsert profile if provided
      if (body.profile) {
        const existing = await profileRepository.findByClerkUserId(clerkUserId);
        const fullName = body.profile.fullName?.trim() || existing?.fullName || "FoodCue Member";
        await profileRepository.upsertProfile(clerkUserId, {
          fullName,
          profileImageUrl: body.profile.profileImageUrl,
          age: body.profile.age,
          gender: body.profile.gender,
          country: body.profile.country,
          state: body.profile.state,
          city: body.profile.city,
          preferredLanguage: body.profile.preferredLanguage,
          timezone: body.profile.timezone,
          onboardingStatus: body.onboardingStatus || body.profile.onboardingStatus || existing?.onboardingStatus
        });
      } else if (body.onboardingStatus) {
        await profileRepository.updateOnboardingStatus(clerkUserId, body.onboardingStatus);
      }

      // 2. Set food preferences if provided
      if (Array.isArray(body.preferences)) {
        await profileRepository.setPreferences(clerkUserId, body.preferences);
      }

      // 3. Set allergies & status if provided
      if (Array.isArray(body.allergies) || body.allergyStatus) {
        const allergies = Array.isArray(body.allergies) ? body.allergies : [];
        const status = body.allergyStatus || (allergies.length > 0 ? "ALLERGIES_SPECIFIED" : "NOT_PROVIDED");
        await profileRepository.setAllergies(clerkUserId, allergies, status);
      }

      const updatedBundle = await profileRepository.getFullProfile(clerkUserId);
      return sendResponse(res, updatedBundle, 200);
    }

    return sendResponse(res, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  } catch (error) {
    return errorResponse(error, res);
  }
}
