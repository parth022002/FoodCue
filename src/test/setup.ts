import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import fs from "fs";
import path from "path";

// Populate process.env from .env and .env.local for backend tests
function loadEnvFile(filename: string) {
  try {
    const envPath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch {
    // Ignore in environments without .env file
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

// Default fallbacks for test runner
if (!process.env.DATABASE_URL && process.env.VITE_NEON_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.VITE_NEON_DATABASE_URL;
}
if (!process.env.DATABASE_URL_UNPOOLED) {
  process.env.DATABASE_URL_UNPOOLED =
    process.env.NEON_DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_cKRineBy5q8d@ep-snowy-mode-b3jn52y5.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
}
if (!process.env.CLERK_SECRET_KEY) {
  process.env.CLERK_SECRET_KEY = "sk_test_p8vtXbEcPxJ7571sOrvBvjS8mG8GwickTGFX1jQB2c";
}
