import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { query } from "../client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MigrationRecord {
  migrationName: string;
  appliedAt: string;
  checksum: string;
}

export interface MigrationResult {
  success: boolean;
  applied: string[];
  skipped: string[];
  errors?: string[];
}

/**
 * Initializes the migrations ledger table in Neon PostgreSQL.
 */
async function ensureMigrationsTable(): Promise<void> {
  await query(
    `
    CREATE TABLE IF NOT EXISTS foodcue_schema_migrations (
      migration_name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      checksum VARCHAR(64)
    );
  `,
    [],
    { unpooled: true }
  );
}

/**
 * Computes a SHA-256 checksum of SQL migration content for tamper detection.
 */
function computeChecksum(content: string): string {
  return crypto.createHash("sha256").update(content.trim()).digest("hex");
}

/**
 * Returns the list of all applied migrations from the database.
 */
export async function getAppliedMigrations(): Promise<MigrationRecord[]> {
  await ensureMigrationsTable();
  const rows = await query<{
    migration_name: string;
    applied_at: string;
    checksum: string;
  }>(
    `SELECT migration_name, applied_at, checksum FROM foodcue_schema_migrations ORDER BY applied_at ASC;`,
    [],
    { unpooled: true }
  );

  return rows.map((r) => ({
    migrationName: r.migration_name,
    appliedAt: r.applied_at,
    checksum: r.checksum
  }));
}

/**
 * Executes all pending SQL migrations against Neon PostgreSQL using the unpooled direct connection.
 */
export async function runMigrations(): Promise<MigrationResult> {
  await ensureMigrationsTable();
  const appliedRecords = await getAppliedMigrations();
  const appliedNames = new Set(appliedRecords.map((r) => r.migrationName));

  const migrationsDir = path.resolve(__dirname);
  const sqlFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const applied: string[] = [];
  const skipped: string[] = [];

  for (const filename of sqlFiles) {
    if (appliedNames.has(filename)) {
      skipped.push(filename);
      continue;
    }

    const filePath = path.join(migrationsDir, filename);
    const sqlContent = fs.readFileSync(filePath, "utf8");
    const checksum = computeChecksum(sqlContent);

    // Execute migration in a single batch
    await query(sqlContent, [], { unpooled: true });

    // Record migration execution
    await query(
      `
      INSERT INTO foodcue_schema_migrations (migration_name, applied_at, checksum)
      VALUES ($1, CURRENT_TIMESTAMP, $2)
      ON CONFLICT (migration_name) DO UPDATE SET applied_at = CURRENT_TIMESTAMP, checksum = EXCLUDED.checksum;
    `,
      [filename, checksum],
      { unpooled: true }
    );

    applied.push(filename);
  }

  return {
    success: true,
    applied,
    skipped
  };
}

// Allow CLI invocation: node dist/server/database/migrations/runner.js
if (typeof process !== "undefined" && process.argv[1] && process.argv[1].includes("runner")) {
  runMigrations()
    .then((res) => {
      console.log("Migration run complete:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
