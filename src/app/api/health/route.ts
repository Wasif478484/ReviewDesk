import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import {
  googleClientId,
  googleOAuthConfigured,
  mailConfigured,
  provider,
  smtpHost,
} from "@/lib/server/env";

/**
 * GET /api/health, liveness and readiness for the platform.
 * Reports database reachability and which model provider is configured.
 * Never leaks credentials: only the provider name and a boolean.
 */
export async function GET() {
  const checks: { name: string; ok: boolean; detail: string }[] = [];

  // Database
  const started = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    checks.push({
      name: "database",
      ok: true,
      detail: `reachable in ${Date.now() - started}ms`,
    });
  } catch (err) {
    checks.push({
      name: "database",
      ok: false,
      detail: err instanceof Error ? err.message.slice(0, 120) : "unreachable",
    });
  }

  // Model provider
  const active = provider();
  checks.push({
    name: "model_provider",
    ok: true,
    detail:
      active === "mock"
        ? "mock (offline canned responses)"
        : "z.ai SDK (live calls cost money)",
  });

  // Optional integrations
  checks.push({
    name: "google_oauth",
    ok: googleOAuthConfigured(),
    detail: googleClientId() ? "configured" : "not configured",
  });
  checks.push({
    name: "smtp",
    ok: mailConfigured(),
    detail: smtpHost() ? "configured" : "not configured (dev links shown)",
  });

  const ok = checks.every((c) => c.ok || c.name === "google_oauth" || c.name === "smtp");
  return NextResponse.json(
    {
      ok,
      service: "reviewdesk",
      version: 2,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
