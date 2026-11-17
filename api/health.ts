import { neon } from "@neondatabase/serverless";

export const config = {
  runtime: "nodejs"
};

/**
 * GET /api/health
 * Public health check confirming backend status and Neon database connectivity.
 * Zero relative imports for fail-safe Vercel Node ESM execution.
 */
export default async function handler(req: unknown, res?: unknown): Promise<Response> {
  const r = req as { method?: string } | null | undefined;
  const method = r?.method || "GET";

  const nodeRes = res as {
    setHeader?: (k: string, v: string) => void;
    status?: (c: number) => { json: (b: unknown) => void };
  } | null | undefined;

  const send = (body: Record<string, unknown>, statusCode: number) => {
    if (nodeRes && typeof nodeRes.status === "function") {
      try {
        nodeRes.setHeader?.("Content-Type", "application/json");
        nodeRes.setHeader?.("Cache-Control", "no-store, no-cache, must-revalidate");
        nodeRes.status(statusCode).json(body);
      } catch {
        // stream closed
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

  const dbUrl =
    process.env.DATABASE_URL ||
    process.env.NEON_DATABASE_URL_POOLED ||
    process.env.VITE_NEON_DATABASE_URL;

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
