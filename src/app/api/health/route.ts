import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";

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
  const provider = (process.env.REVIEWDESK_PROVIDER ?? "mock").toLowerCase();
  checks.push({
    name: "model_provider",
    ok: true,
    detail:
      provider === "mock"
        ? "mock (offline canned responses)"
        : `${provider} (live calls cost money)`,
  });

  // Optional integrations
  checks.push({
    name: "google_oauth",
    ok: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    detail: process.env.GOOGLE_CLIENT_ID ? "configured" : "not configured",
  });
  checks.push({
    name: "smtp",
    ok: Boolean(process.env.SMTP_HOST),
    detail: process.env.SMTP_HOST ? "configured" : "not configured (dev links shown)",
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
