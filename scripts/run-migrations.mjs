import { neon } from "@neondatabase/serverless";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.NEON_DATABASE_URL_UNPOOLED ||
  "postgresql://neondb_owner:npg_cKRineBy5q8d@ep-snowy-mode-b3jn52y5.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

console.log("Connecting to Neon PostgreSQL direct/unpooled endpoint for migrations...");
const sql = neon(databaseUrl);

/**
 * Splits SQL script containing multiple statements into executable units.
 * Safely preserves $$ blocks (e.g. DO $$ ... END $$;).
 */
function splitSqlStatements(content) {
  const statements = [];
  let current = "";
  let inDollarBlock = false;

  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--") && !inDollarBlock) {
      continue;
    }

    if (line.includes("$$")) {
      inDollarBlock = !inDollarBlock;
    }

    current += line + "\n";

    if (!inDollarBlock && trimmed.endsWith(";")) {
      const stmt = current.trim();
      if (stmt.length > 0) {
        statements.push(stmt);
      }
      current = "";
    }
  }

  if (current.trim().length > 0) {
    statements.push(current.trim());
  }

  return statements;
}

async function executeMigrations() {
  // 1. Ensure migrations ledger table exists
  await sql`
    CREATE TABLE IF NOT EXISTS foodcue_schema_migrations (
      migration_name VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      checksum VARCHAR(64)
    );
  `;
  console.log("✓ Table foodcue_schema_migrations ready");

  // 2. Fetch applied migrations
  const appliedRows = await sql`SELECT migration_name FROM foodcue_schema_migrations;`;
  const applied = new Set(appliedRows.map((r) => r.migration_name));

  // 3. Scan migrations directory
  const migrationsDir = path.resolve(__dirname, "../src/server/database/migrations");
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`- Migration ${file} already applied (skipped)`);
      continue;
    }

    console.log(`Applying migration: ${file}...`);
    const sqlContent = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    const checksum = crypto.createHash("sha256").update(sqlContent.trim()).digest("hex");

    const statements = splitSqlStatements(sqlContent);
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt && stmt.length > 0) {
        await sql.query(stmt);
      }
    }

    // Record migration
    await sql`
      INSERT INTO foodcue_schema_migrations (migration_name, applied_at, checksum)
      VALUES (${file}, CURRENT_TIMESTAMP, ${checksum})
      ON CONFLICT (migration_name) DO UPDATE SET
        applied_at = CURRENT_TIMESTAMP,
        checksum = EXCLUDED.checksum;
    `;
    console.log(`✓ Migration ${file} successfully applied (${statements.length} statements).`);
  }

  // 4. Verify table columns
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'foodcue_users'
    ORDER BY ordinal_position;
  `;
  console.log("=================================");
  console.log("Live foodcue_users Table Schema in Neon PostgreSQL:");
  cols.forEach((c) => {
    console.log(` - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
  });
  console.log("=================================");
}

executeMigrations()
  .then(() => {
    console.log("Migration execution finished successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
