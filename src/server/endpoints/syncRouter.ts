import pushHandler from "./syncPush";
import pullHandler from "./syncPull";
import migrateHandler from "./syncMigrate";
import statusHandler from "./syncStatus";
import deleteCloudDataHandler from "./deleteCloudData";
import { sendResponse, type UniversalServerRequest, type UniversalServerResponse } from "../utils/response";

export const config = {
  runtime: "nodejs"
};

/**
 * Consolidated /api/sync/* Router
 * Routes: /api/sync/push, /api/sync/pull, /api/sync/migrate, /api/sync/status, /api/sync/deleteCloudData
 * Reduces 5 discrete serverless functions to 1 function to satisfy Vercel Hobby plan 12-function limit.
 */
export default async function handler(
  req: UniversalServerRequest,
  res?: UniversalServerResponse
): Promise<Response> {
  const rawUrl = (req as { url?: string })?.url || "";
  const query = (req as { query?: Record<string, string | string[]> })?.query || {};
  const actionParam = typeof query.action === "string" ? query.action : "";

  if (rawUrl.includes("/push") || actionParam === "push") {
    return pushHandler(req, res);
  }
  if (rawUrl.includes("/pull") || actionParam === "pull") {
    return pullHandler(req, res);
  }
  if (rawUrl.includes("/migrate") || actionParam === "migrate") {
    return migrateHandler(req, res);
  }
  if (rawUrl.includes("/status") || actionParam === "status") {
    return statusHandler(req, res);
  }
  if (rawUrl.includes("/deleteCloudData") || actionParam === "deleteCloudData") {
    return deleteCloudDataHandler(req, res);
  }

  return sendResponse(res, { error: "Unknown sync endpoint", code: "NOT_FOUND" }, 404);
}
