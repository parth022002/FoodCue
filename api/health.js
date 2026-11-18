// src/server/endpoints/health.ts
import { neon } from "@neondatabase/serverless";
var config = {
  runtime: "nodejs"
};
async function handler(req, res) {
  const r = req;
  const method = r?.method || "GET";
  const nodeRes = res;
  const send = (body, statusCode) => {
    if (nodeRes && typeof nodeRes.status === "function") {
      try {
        nodeRes.setHeader?.("Content-Type", "application/json");
        nodeRes.setHeader?.("Cache-Control", "no-store, no-cache, must-revalidate");
        nodeRes.status(statusCode).json(body);
      } catch {
      }
      return new Response(JSON.stringify(body), { status: statusCode });
    }
    return new Response(JSON.stringify(body), {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    });
  };
  if (method !== "GET" && method !== "HEAD") {
    return send({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" }, 405);
  }
  const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL_POOLED || process.env.VITE_NEON_DATABASE_URL;
  if (!dbUrl) {
    return send(
      {
        status: "error",
        application: "foodcue",
        database: "unavailable",
        reason: "DATABASE_URL is not set"
      },
      503
    );
  }
  try {
    const sql = neon(dbUrl, { disableWarningInBrowsers: true });
    await sql`SELECT 1;`;
    return send(
      {
        status: "ok",
        application: "foodcue",
        database: "connected"
      },
      200
    );
  } catch (err) {
    return send(
      {
        status: "error",
        application: "foodcue",
        database: "unavailable",
        message: err instanceof Error ? err.message : "Database check failed"
      },
      503
    );
  }
}
export {
  config,
  handler as default
};
