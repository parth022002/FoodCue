import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { getBackendConfig } from "../config/environment";
import { DatabaseError } from "../errors/appErrors";

interface ClientInstances {
  pooled: NeonQueryFunction<false, false> | null;
  unpooled: NeonQueryFunction<false, false> | null;
}

const clients: ClientInstances = {
  pooled: null,
  unpooled: null
};

/**
 * Strips password and user credentials from database URLs in error messages
 */
function sanitizeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Unknown database error";
  }
  return error.message
    .replace(/postgres(ql)?:\/\/[^:]+:[^@]+@/gi, "postgresql://[REDACTED]:[REDACTED]@")
    .replace(/password=[^&;]+/gi, "password=[REDACTED]");
}

/**
 * Returns a configured Neon client instance (singleton per runtime).
 */
export function getDbClient(options: { unpooled?: boolean } = {}): NeonQueryFunction<false, false> {
  const isUnpooled = options.unpooled ?? false;

  if (isUnpooled) {
    if (!clients.unpooled) {
      const config = getBackendConfig();
      clients.unpooled = neon(config.DATABASE_URL_UNPOOLED, { disableWarningInBrowsers: true });
    }
    return clients.unpooled;
  }

  if (!clients.pooled) {
    const config = getBackendConfig();
    clients.pooled = neon(config.DATABASE_URL, { disableWarningInBrowsers: true });
  }
  return clients.pooled;
}

/**
 * Executes a parameterized SQL query against Neon Lakebase PostgreSQL.
 */
export async function query<T = Record<string, unknown>>(
  sqlText: string,
  params: unknown[] = [],
  options: { unpooled?: boolean } = {}
): Promise<T[]> {
  try {
    const sql = getDbClient(options);
    const result = await sql.query(sqlText, params);
    return (result ?? []) as T[];
  } catch (error) {
    const sanitizedMsg = sanitizeErrorMessage(error);
    throw new DatabaseError(`Database query failed: ${sanitizedMsg}`);
  }
}

/**
 * Executes a health check query (SELECT 1) against Neon and measures latency.
 * Never leaks credentials in results or errors.
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  latencyMs: number;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    const sql = getDbClient({ unpooled: false });
    const rows = await sql.query("SELECT 1 AS ok;");
    const latencyMs = Date.now() - startTime;

    const isOk = Array.isArray(rows) && rows.length > 0;
    return {
      connected: isOk,
      latencyMs
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return {
      connected: false,
      latencyMs,
      error: sanitizeErrorMessage(err)
    };
  }
}

/**
 * Resets cached clients (for testing or configuration changes).
 */
export function resetDbClient(): void {
  clients.pooled = null;
  clients.unpooled = null;
}
