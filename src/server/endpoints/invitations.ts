import crypto from "crypto";
import { authenticateRequest } from "../auth/authorization";
import { householdRepository, type HouseholdMemberRole } from "../database/repositories/household.repository";
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

function hashInvitationToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

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

interface CreateInvitationBody {
  householdId?: string;
  email?: string;
  role?: HouseholdMemberRole;
}

interface PatchInvitationBody {
  action?: "accept" | "revoke";
  token?: string;
  invitationId?: string;
}

/**
 * Invitations API:
 * POST /api/invitations — Creates an invitation with a secure random token.
 * GET /api/invitations?token=... — Validates an invitation token.
 * PATCH /api/invitations — Accepts or revokes an invitation.
 */
export default async function handler(
  req: UniversalServerRequest,
  res?: UniversalServerResponse
): Promise<Response> {
  const { headers, method, json } = await parseRequest(req);
  const queryParams = extractQuery(req);

  try {
    // 1. GET /api/invitations?token=... — Public/Auth-optional validation
    if (method === "GET") {
      const token = queryParams.get("token");
      if (!token) {
        throw new ValidationError("Missing invitation token.");
      }

      const tokenHash = hashInvitationToken(token);
      const inv = await householdRepository.findInvitationByTokenHash(tokenHash);

      if (!inv) {
        return sendResponse(res, { valid: false, reason: "Invitation not found." }, 404);
      }

      if (inv.status !== "pending") {
        return sendResponse(res, { valid: false, reason: `Invitation is ${inv.status}.` }, 400);
      }

      const isExpired = new Date(inv.expiresAt).getTime() < Date.now();
      if (isExpired) {
        return sendResponse(res, { valid: false, reason: "Invitation has expired." }, 400);
      }

      return sendResponse(
        res,
        {
          valid: true,
          invitationId: inv.id,
          householdId: inv.householdId,
          householdName: inv.householdName,
          role: inv.role,
          expiresAt: inv.expiresAt
        },
        200
      );
    }

    // All write operations require authentication
    const userContext = await authenticateRequest(headers);
    const clerkUserId = userContext.clerkUserId;

    // 2. POST /api/invitations — Create invitation (admin/owner only)
    if (method === "POST") {
      const body = (await json<CreateInvitationBody>()) ?? {};

      if (!body.householdId) {
        throw new ValidationError("householdId is required.");
      }

      const callerRole = await householdRepository.getMemberRole(body.householdId, clerkUserId);
      if (callerRole !== "owner" && callerRole !== "admin") {
        throw new ForbiddenError("Only household owners and admins can invite members.");
      }

      // Generate cryptographically secure random token (64 hex characters)
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashInvitationToken(rawToken);

      const emailToUse = (body.email && body.email.trim()) ? body.email.trim().toLowerCase() : "link-share@foodcue.app";

      const invitation = await householdRepository.createInvitation({
        householdId: body.householdId,
        invitedByClerkUserId: clerkUserId,
        inviteeEmail: emailToUse,
        tokenHash,
        role: body.role || "member",
        expiresInDays: 7
      });

      return sendResponse(
        res,
        {
          invitation,
          token: rawToken,
          inviteUrl: `/invite/${rawToken}`
        },
        201
      );
    }

    // 3. PATCH /api/invitations — Accept or Revoke
    if (method === "PATCH") {
      const body = (await json<PatchInvitationBody>()) ?? {};

      if (body.action === "accept") {
        if (!body.token) throw new ValidationError("Missing token to accept.");
        const tokenHash = hashInvitationToken(body.token);
        const result = await householdRepository.acceptInvitation(tokenHash, clerkUserId);
        return sendResponse(res, result, 200);
      }

      if (body.action === "revoke") {
        if (!body.invitationId) throw new ValidationError("Missing invitationId to revoke.");
        const ok = await householdRepository.revokeInvitation(body.invitationId, clerkUserId);
        return sendResponse(res, { success: ok }, 200);
      }

      throw new ValidationError("Invalid action. Must be 'accept' or 'revoke'.");
    }

    return sendResponse(res, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  } catch (error) {
    return errorResponse(error, res);
  }
}
