/**
 * FoodCue Production Deployment Configuration Verifier
 * Phase 11.2 Deployment Audit
 *
 * Verifies Neon DB, Clerk Auth, OpenFoodFacts, and Serverless API bundles
 * WITHOUT leaking secrets.
 */

import { neon } from "@neondatabase/serverless";
import { createClerkClient } from "@clerk/backend";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("              FOODCUE PRODUCTION DEPLOYMENT CONFIGURATION AUDIT               ");
console.log("================================================================================");

const results = {
  envVars: { pass: true, details: [] },
  neonDb: { pass: false, details: [] },
  clerkAuth: { pass: false, details: [] },
  openFoodFacts: { pass: false, details: [] },
  buildArtifacts: { pass: false, details: [] }
};

// 1. Audit Environment Variables
console.log("\n[1/5] Auditing Environment Variables...");
const requiredVars = [
  { name: "DATABASE_URL", isSecret: true, validator: (v) => v.startsWith("postgres") },
  { name: "DATABASE_URL_UNPOOLED", isSecret: true, validator: (v) => v.startsWith("postgres") },
  { name: "CLERK_SECRET_KEY", isSecret: true, validator: (v) => v.startsWith("sk_test_") || v.startsWith("sk_live_") },
  { name: "VITE_CLERK_PUBLISHABLE_KEY", isSecret: false, validator: (v) => v.startsWith("pk_test_") || v.startsWith("pk_live_") },
  {
    name: "CLERK_WEBHOOK_SIGNING_SECRET",
    isSecret: true,
    validator: (v) => (v ? v.startsWith("whsec_") : false),
    altNames: ["CLERK_WEBHOOK_SECRET", "WEBHOOK_SECRET"]
  }
];

for (const req of requiredVars) {
  let val = process.env[req.name];
  if (!val && req.altNames) {
    for (const alt of req.altNames) {
      if (process.env[alt]) {
        val = process.env[alt];
        break;
      }
    }
  }

  if (!val || val.includes("REPLACE_ME")) {
    results.envVars.details.push(`❌ ${req.name}: Missing or placeholder`);
    results.envVars.pass = false;
  } else if (!req.validator(val)) {
    results.envVars.details.push(`⚠️ ${req.name}: Configured but failed format validation`);
    results.envVars.pass = false;
  } else {
    const isLive = val.includes("_live_");
    const mode = req.isSecret && (val.startsWith("sk_") || val.startsWith("pk_"))
      ? (isLive ? "PRODUCTION (Live)" : "DEVELOPMENT (Test)")
      : "Configured";
    results.envVars.details.push(`✓ ${req.name}: Valid (${mode}, ${val.length} chars)`);
  }
}
results.envVars.details.forEach((d) => console.log("  " + d));

// 2. Test Neon PostgreSQL Connection
console.log("\n[2/5] Testing Neon Serverless PostgreSQL Connectivity...");
const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL_POOLED;
if (dbUrl && !dbUrl.includes("REPLACE_ME")) {
  try {
    const sql = neon(dbUrl, { disableWarningInBrowsers: true });
    const startTime = Date.now();
    const ping = await sql`SELECT 1 as connected;`;
    const latency = Date.now() - startTime;

    if (ping && ping[0]?.connected === 1) {
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `;
      const tableNames = tables.map((t) => t.table_name);
      results.neonDb.pass = true;
      results.neonDb.details.push(`✓ Neon PostgreSQL connected (Latency: ${latency}ms)`);
      results.neonDb.details.push(`✓ Live public tables found (${tableNames.length}): ${tableNames.slice(0, 5).join(", ")}...`);
    } else {
      results.neonDb.details.push("❌ Neon database query did not return expected result.");
    }
  } catch (err) {
    results.neonDb.details.push(`❌ Neon connection failed: ${err.message}`);
  }
} else {
  results.neonDb.details.push("❌ DATABASE_URL is not configured.");
}
results.neonDb.details.forEach((d) => console.log("  " + d));

// 3. Test Clerk Authentication Backend
console.log("\n[3/5] Testing Clerk Backend Client Connectivity...");
const clerkKey = process.env.CLERK_SECRET_KEY;
if (clerkKey && !clerkKey.includes("REPLACE_ME")) {
  try {
    const clerk = createClerkClient({ secretKey: clerkKey });
    const userList = await clerk.users.getUserList({ limit: 1 });
    const isProd = clerkKey.startsWith("sk_live_");
    results.clerkAuth.pass = true;
    results.clerkAuth.details.push(`✓ Clerk Backend API connected successfully`);
    results.clerkAuth.details.push(`✓ Clerk Environment Mode: ${isProd ? "PRODUCTION (Live keys)" : "DEVELOPMENT (Test keys)"}`);
  } catch (err) {
    results.clerkAuth.details.push(`❌ Clerk API authentication failed: ${err.message}`);
  }
} else {
  results.clerkAuth.details.push("❌ CLERK_SECRET_KEY is not configured.");
}
results.clerkAuth.details.forEach((d) => console.log("  " + d));

// 4. Test Open Food Facts API Connectivity
console.log("\n[4/5] Testing Open Food Facts Indian API Mirror...");
try {
  const startOff = Date.now();
  const res = await fetch("https://in.openfoodfacts.org/cgi/search.pl?search_terms=Tata&json=1&page_size=2", {
    headers: { "User-Agent": "FoodCue-PWA/2.0 (deployment-verifier)" },
    signal: AbortSignal.timeout(6000)
  });
  const latencyOff = Date.now() - startOff;
  if (res.ok) {
    const data = await res.json();
    results.openFoodFacts.pass = true;
    results.openFoodFacts.details.push(`✓ Open Food Facts responded (Status: ${res.status}, Latency: ${latencyOff}ms)`);
    results.openFoodFacts.details.push(`✓ Sample Indian search returned ${data.count || 0} matched products`);
  } else {
    results.openFoodFacts.details.push(`⚠️ Open Food Facts returned HTTP ${res.status}`);
  }
} catch (err) {
  results.openFoodFacts.details.push(`⚠️ Open Food Facts unreachable or timed out: ${err.message}`);
}
results.openFoodFacts.details.forEach((d) => console.log("  " + d));

// Test Tavily AI Web Search
const tavilyKey = process.env.TAVILY_API_KEY || process.env.VITE_TAVILY_API_KEY;
if (tavilyKey && !tavilyKey.includes("REPLACE_ME")) {
  console.log("\nTesting Tavily AI Web Search API...");
  try {
    const startTv = Date.now();
    const tvRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: "Amul Butter India",
        max_results: 1
      }),
      signal: AbortSignal.timeout(6000)
    });
    const latTv = Date.now() - startTv;
    if (tvRes.ok) {
      console.log(`  ✓ Tavily AI Web Search connected (Status: ${tvRes.status}, Latency: ${latTv}ms)`);
    } else {
      console.log(`  ⚠️ Tavily returned HTTP ${tvRes.status}`);
    }
  } catch (err) {
    console.log(`  ⚠️ Tavily test failed: ${err.message}`);
  }
}

// 5. Audit Serverless API Bundles & Production Artifacts
console.log("\n[5/5] Auditing Production Build Artifacts...");
const expectedEndpoints = [
  "api/me.js",
  "api/devices/index.js",
  "api/sync/push.js",
  "api/sync/pull.js",
  "api/sync/migrate.js",
  "api/sync/status.js",
  "api/sync/deleteCloudData.js",
  "api/notifications/subscribe.js"
];

let allEndpointsExist = true;
for (const ep of expectedEndpoints) {
  const fullPath = path.join(rootDir, ep);
  if (fs.existsSync(fullPath)) {
    const stat = fs.statSync(fullPath);
    results.buildArtifacts.details.push(`✓ Endpoint bundled: ${ep} (${Math.round(stat.size / 1024)} KB)`);
  } else {
    allEndpointsExist = false;
    results.buildArtifacts.details.push(`❌ Missing bundled endpoint: ${ep}`);
  }
}
const distIndex = path.join(rootDir, "dist/index.html");
if (fs.existsSync(distIndex)) {
  results.buildArtifacts.details.push("✓ Frontend dist/index.html exists and ready for deployment");
} else {
  results.buildArtifacts.details.push("⚠️ dist/index.html not found (run `npm run build`)");
}
results.buildArtifacts.pass = allEndpointsExist;
results.buildArtifacts.details.forEach((d) => console.log("  " + d));

console.log("\n================================================================================");
console.log("                              SUMMARY VERDICT                                  ");
console.log("================================================================================");
const overallPass = results.envVars.pass && results.neonDb.pass && results.clerkAuth.pass && results.buildArtifacts.pass;
if (overallPass) {
  console.log("🎉 ALL PRODUCTION INTEGRATIONS & BUNDLES ARE VERIFIED AND FUNCTIONAL!");
} else {
  console.log("⚠️ DEPLOYMENT VERIFICATION IDENTIFIED ITEMS REQUIRING ATTENTION BEFORE RELEASE.");
}
console.log("================================================================================\n");

process.exit(overallPass ? 0 : 1);
