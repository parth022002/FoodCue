/**
 * Comprehensive Live API Keys & Services Verification Suite
 * Tests every configured key in FoodCue with live requests.
 */

import { neon } from "@neondatabase/serverless";
import { createClerkClient } from "@clerk/backend";

console.log("================================================================================");
console.log("              FOODCUE LIVE API KEYS & INTEGRATIONS AUDIT                      ");
console.log("================================================================================\n");

async function runAudit() {
  const summary = [];

  // 1. Neon PostgreSQL (Pooled)
  try {
    const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL_POOLED;
    const sql = neon(dbUrl, { disableWarningInBrowsers: true });
    const start = Date.now();
    const rows = await sql`SELECT 1 as ok, current_database() as db;`;
    const latency = Date.now() - start;
    if (rows && rows[0]?.ok === 1) {
      console.log(`[1/5] Neon PostgreSQL (Pooled): ✓ PASS (200 OK, Latency: ${latency}ms, DB: ${rows[0].db})`);
      summary.push({ service: "Neon PostgreSQL (Pooled)", status: "PASS", details: `${latency}ms latency` });
    } else {
      console.log("[1/5] Neon PostgreSQL: ❌ Query failed");
      summary.push({ service: "Neon PostgreSQL (Pooled)", status: "FAIL", details: "Unexpected response" });
    }
  } catch (err) {
    console.log(`[1/5] Neon PostgreSQL: ❌ FAIL (${err.message})`);
    summary.push({ service: "Neon PostgreSQL (Pooled)", status: "FAIL", details: err.message });
  }

  // 2. Neon PostgreSQL (Unpooled)
  try {
    const dbUnpooledUrl = process.env.DATABASE_URL_UNPOOLED || process.env.NEON_DATABASE_URL_UNPOOLED;
    const sqlDirect = neon(dbUnpooledUrl, { disableWarningInBrowsers: true });
    const start = Date.now();
    const rows = await sqlDirect`SELECT 1 as ok;`;
    const latency = Date.now() - start;
    if (rows && rows[0]?.ok === 1) {
      console.log(`[2/5] Neon PostgreSQL (Unpooled): ✓ PASS (200 OK, Latency: ${latency}ms)`);
      summary.push({ service: "Neon PostgreSQL (Unpooled)", status: "PASS", details: `${latency}ms latency` });
    }
  } catch (err) {
    console.log(`[2/5] Neon PostgreSQL (Unpooled): ❌ FAIL (${err.message})`);
    summary.push({ service: "Neon PostgreSQL (Unpooled)", status: "FAIL", details: err.message });
  }

  // 3. Clerk Backend Authentication Client
  try {
    const clerkKey = process.env.CLERK_SECRET_KEY;
    const clerk = createClerkClient({ secretKey: clerkKey });
    const start = Date.now();
    const users = await clerk.users.getUserList({ limit: 1 });
    const latency = Date.now() - start;
    console.log(`[3/5] Clerk Backend Auth: ✓ PASS (200 OK, Latency: ${latency}ms, Key type: ${clerkKey.substring(0, 7)})`);
    summary.push({ service: "Clerk Backend Auth", status: "PASS", details: `${latency}ms latency` });
  } catch (err) {
    console.log(`[3/5] Clerk Backend Auth: ❌ FAIL (${err.message})`);
    summary.push({ service: "Clerk Backend Auth", status: "FAIL", details: err.message });
  }

  // 4. Groq High-Speed LLM Inference
  try {
    const groqKey = process.env.GROQ_API_KEY;
    const start = Date.now();
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [{ role: "user", content: "Reply with the word 'VERIFIED' only." }],
        max_tokens: 5,
        temperature: 0.1
      }),
      signal: AbortSignal.timeout(8000)
    });
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content?.trim() || "";
      console.log(`[4/5] Groq Cloud API (Llama 3.1): ✓ PASS (200 OK, Latency: ${latency}ms, Reply: "${reply}")`);
      summary.push({ service: "Groq Cloud API", status: "PASS", details: `${latency}ms latency, Reply: ${reply}` });
    } else {
      console.log(`[4/5] Groq Cloud API: ❌ FAIL (HTTP ${res.status})`);
      summary.push({ service: "Groq Cloud API", status: "FAIL", details: `HTTP ${res.status}` });
    }
  } catch (err) {
    console.log(`[4/5] Groq Cloud API: ❌ FAIL (${err.message})`);
    summary.push({ service: "Groq Cloud API", status: "FAIL", details: err.message });
  }

  // 5. OpenRouter Multimodal AI Gateway
  try {
    const orKey = process.env.OPENROUTER_API_KEY;
    const start = Date.now();
    const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: { Authorization: `Bearer ${orKey}` },
      signal: AbortSignal.timeout(8000)
    });
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      console.log(`[5/5] OpenRouter AI Gateway: ✓ PASS (200 OK, Latency: ${latency}ms, Label: ${data.data?.label || "Active"})`);
      summary.push({ service: "OpenRouter AI Gateway", status: "PASS", details: `${latency}ms latency` });
    } else {
      console.log(`[5/5] OpenRouter AI Gateway: ❌ FAIL (HTTP ${res.status})`);
      summary.push({ service: "OpenRouter AI Gateway", status: "FAIL", details: `HTTP ${res.status}` });
    }
  } catch (err) {
    console.log(`[5/5] OpenRouter AI Gateway: ❌ FAIL (${err.message})`);
    summary.push({ service: "OpenRouter AI Gateway", status: "FAIL", details: err.message });
  }

  // 6. Tavily AI Real-Time Web Search
  try {
    const tvKey = process.env.TAVILY_API_KEY;
    const start = Date.now();
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tvKey,
        query: "Tata Salt nutritional information per 100g",
        max_results: 1
      }),
      signal: AbortSignal.timeout(8000)
    });
    const latency = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      const top = data.results?.[0]?.title || "Results found";
      console.log(`[6/5] Tavily AI Web Search: ✓ PASS (200 OK, Latency: ${latency}ms, Top: "${top.substring(0, 45)}...")`);
      summary.push({ service: "Tavily AI Web Search", status: "PASS", details: `${latency}ms latency` });
    } else {
      console.log(`[6/5] Tavily AI Web Search: ❌ FAIL (HTTP ${res.status})`);
      summary.push({ service: "Tavily AI Web Search", status: "FAIL", details: `HTTP ${res.status}` });
    }
  } catch (err) {
    console.log(`[6/5] Tavily AI Web Search: ❌ FAIL (${err.message})`);
    summary.push({ service: "Tavily AI Web Search", status: "FAIL", details: err.message });
  }

  console.log("\n================================================================================");
  console.log("                                FINAL SUMMARY                                   ");
  console.log("================================================================================");
  const allPass = summary.every((s) => s.status === "PASS");
  if (allPass) {
    console.log("🎉 ALL CONFIGURED API KEYS AND EXTERNAL SERVICES ARE WORKING PERFECTLY (100%)!");
  } else {
    console.log("⚠️ SOME SERVICES ENCOUNTERED ERRORS.");
  }
  console.log("================================================================================\n");
}

runAudit();
