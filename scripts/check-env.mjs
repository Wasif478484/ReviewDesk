#!/usr/bin/env node
/**
 * check-env.mjs, verify the environment before a deploy.
 *
 * Reads .env (if present) and reports what is configured, what is missing,
 * and what would break. Never prints a secret value: only whether it is set
 * and, for the secret, its length.
 *
 *   node scripts/check-env.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// fileURLToPath, not URL.pathname: the project path can contain spaces and
// other characters that pathname leaves percent-encoded.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Load .env into the process environment without overriding what is already set.
const envPath = path.join(root, ".env");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

let problems = 0;
let warnings = 0;

function ok(label, detail = "") {
  console.log(`  ${GREEN}ok${RESET}    ${label}${detail ? ` ${DIM}${detail}${RESET}` : ""}`);
}
function warn(label, detail = "") {
  warnings += 1;
  console.log(`  ${YELLOW}warn${RESET}  ${label}${detail ? ` ${DIM}${detail}${RESET}` : ""}`);
}
function fail(label, detail = "") {
  problems += 1;
  console.log(`  ${RED}fail${RESET}  ${label}${detail ? ` ${DIM}${detail}${RESET}` : ""}`);
}

console.log("\nReviewDesk environment check\n");

// --------------------------------------------------------------- required
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  fail("DATABASE_URL", "not set");
} else if (databaseUrl.startsWith("file:")) {
  fail("DATABASE_URL", "points at a SQLite file; this app needs PostgreSQL");
} else if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
  fail("DATABASE_URL", "does not look like a PostgreSQL connection string");
} else {
  ok("DATABASE_URL", "PostgreSQL");
}

const appSecret = process.env.APP_SECRET;
if (!appSecret) {
  fail("APP_SECRET", "not set");
} else if (!/^[0-9a-f]{64}$/i.test(appSecret)) {
  fail("APP_SECRET", "must be 64 hex characters (32 bytes)");
} else {
  ok("APP_SECRET", "64 hex characters");
}

// --------------------------------------------------------------- optional
const provider = (process.env.REVIEWDESK_PROVIDER ?? "mock").toLowerCase();
if (provider === "mock") {
  ok("REVIEWDESK_PROVIDER", "mock (offline, no API key needed)");
} else if (provider === "openai" && process.env.OPENAI_API_KEY) {
  ok("REVIEWDESK_PROVIDER", `${provider} (live calls cost money)`);
} else if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
  ok("REVIEWDESK_PROVIDER", `${provider} (live calls cost money)`);
} else {
  warn("REVIEWDESK_PROVIDER", `${provider} but no matching API key is set`);
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  ok("Google OAuth", "configured");
} else {
  warn("Google OAuth", "not configured; Connect with Google stays disabled");
}

if (process.env.SMTP_HOST) {
  ok("SMTP", "configured");
} else {
  warn("SMTP", "not configured; verification links are shown in the interface");
}

// --------------------------------------------------------------- summary
console.log("");
if (problems > 0) {
  console.log(
    `${RED}${problems} problem(s)${RESET}, ${warnings} warning(s). Fix the problems before deploying.`,
  );
  process.exit(1);
}
if (warnings > 0) {
  console.log(
    `${YELLOW}No problems, ${warnings} warning(s).${RESET} The app will run, some features stay off.`,
  );
  process.exit(0);
}
console.log(`${GREEN}Everything is configured.${RESET}`);
