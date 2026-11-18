import householdsHandler from "./households";
import householdDetailsHandler from "./householdDetails";
import { type UniversalServerRequest, type UniversalServerResponse } from "../utils/response";

export const config = {
  runtime: "nodejs"
};

/**
 * Consolidated /api/households Router
 * Handles both:
 * - /api/households (list, create)
 * - /api/households/details (get details, update, delete)
 * Reduces 2 discrete serverless functions to 1 function to satisfy Vercel Hobby plan 12-function limit.
 */
export default async function handler(
  req: UniversalServerRequest,
  res?: UniversalServerResponse
): Promise<Response> {
  const rawUrl = (req as { url?: string })?.url || "";
  const query = (req as { query?: Record<string, string | string[]> })?.query || {};
  const isDetails = rawUrl.includes("/details") || query.view === "details" || query.slug === "details";

  if (isDetails) {
    return householdDetailsHandler(req, res);
  }

  return householdsHandler(req, res);
}
