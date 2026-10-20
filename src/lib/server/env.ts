/**
 * env.ts, the one place environment variables are read.
 *
 * Server-only. Every value is validated once, at the boundary, so a missing
 * or malformed variable fails with a clear message instead of surfacing as
 * `undefined` three layers deeper.
 *
 * Import from `@/lib/server/env` in server code only. A client component
 * that imports this will fail to build, which is the point.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env and fill it in, or add it to your platform's environment variables.`,
    );
  }
  return value.trim();
}

function optional(name: string, fallback = ""): string {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || !raw.trim()) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw || !raw.trim()) return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

/**
 * The model provider. `mock` runs offline with canned responses. Any other
 * value means a live provider, reached through the Z.ai SDK, which speaks
 * the OpenAI chat completions shape.
 */
export type Provider = "mock" | "live";

export function provider(): Provider {
  return optional("REVIEWDESK_PROVIDER", "mock").toLowerCase() === "mock" ? "mock" : "live";
}

/** True when the provider makes paid, outbound model calls. */
export function providerIsLive(): boolean {
  return provider() !== "mock";
}

/** The secret used to sign sessions and to encrypt stored credentials. */
export function appSecret(): string {
  const secret = required("APP_SECRET");
  if (secret.length < 32) {
    throw new Error(
      "APP_SECRET must be at least 32 characters. Generate one with: openssl rand -hex 32",
    );
  }
  return secret;
}

export function googleClientId(): string {
  return optional("GOOGLE_CLIENT_ID");
}

export function googleClientSecret(): string {
  return optional("GOOGLE_CLIENT_SECRET");
}

export function googleRedirectUri(): string {
  return optional("GOOGLE_REDIRECT_URI");
}

export function googleOAuthConfigured(): boolean {
  return Boolean(googleClientId() && googleClientSecret());
}

export function smtpHost(): string {
  return optional("SMTP_HOST");
}

export function smtpPort(): number {
  return optionalNumber("SMTP_PORT", 587);
}

export function smtpUser(): string {
  return optional("SMTP_USER");
}

export function smtpPass(): string {
  return optional("SMTP_PASS");
}

export function mailFrom(): string {
  return optional("MAIL_FROM", "ReviewDesk <no-reply@example.com>");
}

export function mailConfigured(): boolean {
  return Boolean(smtpHost());
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
