// src/server/endpoints/clerkWebhook.ts
import crypto from "crypto";
import { neon } from "@neondatabase/serverless";
var config = {
  runtime: "nodejs"
};
function getSql() {
  const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL_POOLED || process.env.VITE_NEON_DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not configured.");
  return neon(dbUrl, { disableWarningInBrowsers: true });
}
function verifySvix(rawBody, headers, secret) {
  const nowSeconds = Math.floor(Date.now() / 1e3);
  const tsNum = parseInt(headers.timestamp, 10);
  if (isNaN(tsNum) || Math.abs(nowSeconds - tsNum) > 300) {
    throw new Error("Webhook signature timestamp is outside tolerance window");
  }
  const cleanedSecret = secret.startsWith("whsec_") ? secret.substring(6) : secret;
  const keyBytes = Buffer.from(cleanedSecret, "base64");
  const signedContent = `${headers.id}.${headers.timestamp}.${rawBody}`;
  const expectedSig = crypto.createHmac("sha256", keyBytes).update(signedContent).digest("base64");
  const signatures = headers.signature.split(" ");
  let matched = false;
  const expectedBuf = Buffer.from(expectedSig);
  for (const versioned of signatures) {
    const parts = versioned.split(",");
    if (parts.length >= 2 && parts[0] === "v1" && parts[1]) {
      const sigBuf = Buffer.from(parts[1]);
      if (sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf)) {
        matched = true;
        break;
      }
    }
  }
  if (!matched) {
    throw new Error("Svix webhook signature verification failed: signature mismatch");
  }
}
async function getRawBody(req) {
  const r = req;
  if (!r) return "";
  if (typeof r.text === "function") {
    return await r.text();
  }
  if (typeof r.body === "string") {
    return r.body;
  }
  if (Buffer.isBuffer(r.body)) {
    return r.body.toString("utf8");
  }
  if (typeof r.on === "function" && !r._readableState?.ended) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      const nodeReq = r;
      nodeReq.on("data", (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      });
      nodeReq.on("end", () => {
        resolve(Buffer.concat(chunks).toString("utf8"));
      });
      nodeReq.on("error", (err) => {
        reject(err);
      });
    });
  }
  if (r.body !== void 0 && r.body !== null) {
    return JSON.stringify(r.body);
  }
  return "";
}
function send(res, body, status = 200) {
  const nodeRes = res;
  if (nodeRes && typeof nodeRes.status === "function") {
    try {
      nodeRes.setHeader?.("Content-Type", "application/json");
      nodeRes.setHeader?.("Cache-Control", "no-store, no-cache, must-revalidate");
      nodeRes.status(status).json(body);
    } catch {
    }
    return new Response(JSON.stringify(body), { status });
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate"
    }
  });
}
async function handler(req, res) {
  const r = req;
  const method = r?.method || "POST";
  if (method !== "POST") {
    return send(res, { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }
  const webhookSecret = process.env.CLERK_WEBHOOK_SIGNING_SECRET || process.env.CLERK_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret.trim() === "" || webhookSecret === "whsec_REPLACE_ME") {
    return send(
      res,
      {
        error: "Webhook endpoint is not active. CLERK_WEBHOOK_SIGNING_SECRET is pending configuration in Clerk Dashboard.",
        code: "WEBHOOK_SECRET_PENDING"
      },
      503
    );
  }
  const getHeader = (name) => {
    const headers = r?.headers;
    if (!headers) return null;
    const lower = name.toLowerCase();
    if ("get" in headers && typeof headers.get === "function") {
      return headers.get(lower) || headers.get(name);
    }
    const map = headers;
    const val = map[lower] ?? map[name];
    return Array.isArray(val) ? val[0] ?? null : val ?? null;
  };
  const svixId = getHeader("svix-id");
  const svixTimestamp = getHeader("svix-timestamp");
  const svixSignature = getHeader("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return send(
      res,
      {
        error: "Missing required Svix webhook verification headers (svix-id, svix-timestamp, svix-signature).",
        code: "MISSING_SVIX_HEADERS"
      },
      400
    );
  }
  const rawBody = await getRawBody(req);
  if (!rawBody) {
    return send(res, { error: "Empty webhook payload.", code: "EMPTY_PAYLOAD" }, 400);
  }
  try {
    verifySvix(rawBody, { id: svixId, timestamp: svixTimestamp, signature: svixSignature }, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook signature";
    return send(res, { error: message, code: "INVALID_SIGNATURE" }, 401);
  }
  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return send(res, { error: "Malformed JSON payload.", code: "INVALID_JSON" }, 400);
  }
  if (!payload || !payload.type || !payload.data?.id) {
    return send(
      res,
      { error: "Invalid webhook payload structure. type and data.id are required.", code: "INVALID_PAYLOAD" },
      400
    );
  }
  const { type, data } = payload;
  const clerkUserId = data.id;
  try {
    const sql = getSql();
    const existing = await sql`
      SELECT status FROM foodcue_webhook_events WHERE event_id = ${svixId} LIMIT 1;
    `;
    if (existing[0] && existing[0].status === "processed") {
      return send(res, { received: true, deduplicated: true, eventId: svixId }, 200);
    }
    await sql`
      INSERT INTO foodcue_webhook_events (event_id, event_type, status, payload, received_at)
      VALUES (${svixId}, ${type}, 'received', ${JSON.stringify(payload)}::jsonb, CURRENT_TIMESTAMP)
      ON CONFLICT (event_id) DO UPDATE SET
        status = 'received',
        error = NULL,
        received_at = CURRENT_TIMESTAMP;
    `;
    const primaryEmail = data.email_addresses?.find((e) => e.id === data.primary_email_address_id)?.email_address ?? data.email_addresses?.[0]?.email_address ?? null;
    const displayName = [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || data.username || null;
    switch (type) {
      case "user.created":
      case "user.updated": {
        await sql`
          INSERT INTO foodcue_users (
            user_id,
            clerk_user_id,
            clerk_id,
            email,
            display_name,
            username,
            is_anonymous,
            device_fingerprint,
            created_at,
            updated_at,
            last_active_at
          ) VALUES (
            ${clerkUserId}::varchar,
            ${clerkUserId}::text,
            ${clerkUserId}::varchar,
            ${primaryEmail},
            ${displayName},
            ${data.username ?? null},
            false,
            null,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
          ON CONFLICT (clerk_user_id) DO UPDATE SET
            email = COALESCE(EXCLUDED.email, foodcue_users.email),
            display_name = COALESCE(EXCLUDED.display_name, foodcue_users.display_name),
            username = COALESCE(EXCLUDED.username, foodcue_users.username),
            updated_at = CURRENT_TIMESTAMP,
            last_active_at = CURRENT_TIMESTAMP,
            deleted_at = NULL;
        `;
        break;
      }
      case "user.deleted": {
        await sql`
          UPDATE foodcue_users
          SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE (clerk_user_id = ${clerkUserId} OR clerk_id = ${clerkUserId}) AND deleted_at IS NULL;
        `;
        break;
      }
      default:
        break;
    }
    await sql`
      UPDATE foodcue_webhook_events
      SET status = 'processed', error = NULL
      WHERE event_id = ${svixId};
    `;
    return send(res, { received: true, event: type, userId: clerkUserId, eventId: svixId }, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Webhook handler failed";
    try {
      const sql = getSql();
      await sql`
        UPDATE foodcue_webhook_events
        SET status = 'failed', error = ${msg}
        WHERE event_id = ${svixId};
      `;
    } catch {
    }
    return send(res, { error: msg, code: "WEBHOOK_PROCESSING_FAILED" }, 500);
  }
}
export {
  config,
  handler as default
};
