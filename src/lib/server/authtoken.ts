/**
 * authtoken.ts, one-time tokens for email verification and password reset.
 * Only the SHA-256 hash is stored; the raw token lives in the link.
 */

import crypto from "crypto";
import { db } from "@/lib/server/db";

export type AuthTokenType = "verify_email" | "reset_password";

export const VERIFY_TTL_HOURS = 24;
export const RESET_TTL_MINUTES = 60;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Create a one-time token; returns the raw token for the link. */
export async function issueAuthToken(
  userId: string,
  type: AuthTokenType,
): Promise<{ token: string; expiresAt: Date }> {
  // Invalidate any previous unused tokens of this type.
  await db.authToken.updateMany({
    where: { userId, type, usedAt: null },
    data: { usedAt: new Date() },
  });
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt =
    type === "reset_password"
      ? new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000)
      : new Date(Date.now() + VERIFY_TTL_HOURS * 60 * 60 * 1000);
  await db.authToken.create({
    data: { userId, type, tokenHash: sha256(token), expiresAt },
  });
  return { token, expiresAt };
}

/** Consume a token exactly once. Returns the userId or null. */
export async function consumeAuthToken(token: string, type: AuthTokenType): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const row = await db.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.type !== type || row.usedAt || row.expiresAt < new Date()) return null;
  await db.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return row.userId;
}
