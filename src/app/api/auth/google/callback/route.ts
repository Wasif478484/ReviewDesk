import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/server/db";
import { currentUserId } from "@/lib/server/auth";
import { encrypt, keyHint } from "@/lib/server/crypto";
import { exchangeCodeForTokens, listAccounts, oauthConfigured } from "@/lib/server/google";

/**
 * GET /api/auth/google/callback, finish the OAuth flow: validate state,
 * exchange the code, encrypt and store the refresh token, verify access by
 * listing accounts, then return to the app.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const store = await cookies();
  const expectedState = store.get("rd_oauth_state")?.value;
  store.delete("rd_oauth_state");

  if (oauthError) {
    return NextResponse.redirect(`${origin}/?google=error&msg=${encodeURIComponent(oauthError)}`);
  }
  if (!oauthConfigured()) {
    return NextResponse.redirect(`${origin}/?google=unconfigured`);
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(
      `${origin}/?google=error&msg=${encodeURIComponent("Invalid or expired OAuth state. Please try again.")}`,
    );
  }
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.redirect(`${origin}/?google=signin`);
  }

  try {
    const tokens = await exchangeCodeForTokens(code, origin);
    if (!tokens.refreshToken) {
      return NextResponse.redirect(
        `${origin}/?google=error&msg=${encodeURIComponent("Google did not return a refresh token. Reconnect and make sure to choose your account (prompt=consent is already requested).")}`,
      );
    }
    let status = "connected";
    let statusMessage = tokens.email
      ? `Connected as ${tokens.email}.`
      : "Connected. Review data needs the business.manage scope.";
    try {
      const accounts = await listAccounts(tokens.accessToken);
      statusMessage += ` Found ${accounts.length} account(s).`;
    } catch (err) {
      status = "error";
      statusMessage = `Token stored, but the Business Profile API rejected it: ${err instanceof Error ? err.message : String(err)}`;
    }
    await db.credential.upsert({
      where: { userId },
      update: {
        mode: "oauth",
        refreshTokenEnc: encrypt(tokens.refreshToken),
        accessTokenEnc: encrypt(tokens.accessToken),
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        grantedEmail: tokens.email,
        keyHint: keyHint(tokens.refreshToken),
        status,
        statusMessage,
        lastCheckedAt: new Date(),
      },
      create: {
        userId,
        mode: "oauth",
        refreshTokenEnc: encrypt(tokens.refreshToken),
        accessTokenEnc: encrypt(tokens.accessToken),
        tokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
        grantedEmail: tokens.email,
        keyHint: keyHint(tokens.refreshToken),
        status,
        statusMessage,
        lastCheckedAt: new Date(),
      },
    });
    return NextResponse.redirect(`${origin}/?google=connected`);
  } catch (err) {
    return NextResponse.redirect(
      `${origin}/?google=error&msg=${encodeURIComponent(err instanceof Error ? err.message : String(err))}`,
    );
  }
}
