/**
 * auth.ts, session handling: bcrypt password hashes + JWT in an httpOnly
 * cookie. Small and dependency-light on purpose.
 */

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { appSecret, isProduction } from "@/lib/server/env";

const COOKIE = "rd_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

function secret(): Uint8Array {
  return new TextEncoder().encode(appSecret().padStart(64, "0").slice(0, 64));
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Returns the signed-in user id, or null. */
export async function currentUserId(): Promise<string | null> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Throws a typed 401 flag when unauthenticated (helper for API routes). */
export async function requireUserId(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) {
    const err = new Error("Not signed in") as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  return userId;
}
