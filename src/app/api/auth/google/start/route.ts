import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { currentUserId } from "@/lib/server/auth";
import { buildAuthUrl, oauthConfigured } from "@/lib/server/google";

/**
 * GET /api/auth/google/start, kick off the OAuth consent flow.
 * Requires GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in the environment and a
 * signed-in user. A random state is stored in a short-lived httpOnly cookie
 * and compared at the callback (CSRF).
 */
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (!oauthConfigured()) {
    return NextResponse.redirect(`${origin}/?google=unconfigured`);
  }
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.redirect(`${origin}/?google=signin`);
  }
  const state = crypto.randomBytes(24).toString("hex");
  const store = await cookies();
  store.set("rd_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 minutes to finish consent
    path: "/",
  });
  return NextResponse.redirect(buildAuthUrl(origin, state));
}
