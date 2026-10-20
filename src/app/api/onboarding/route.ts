import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { encrypt, keyHint } from "@/lib/server/crypto";
import { verifyCredentials } from "@/lib/server/google";

/**
 * POST /api/onboarding, finish the wizard: business details, optional
 * Google Business credential, desk preferences. Marks the user onboarded.
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();

    const businessData = {
      name:
        String(body.business?.name ?? "")
          .trim()
          .slice(0, 120) || "Your Business",
      category:
        String(body.business?.category ?? "restaurant")
          .trim()
          .slice(0, 80) || "restaurant",
      ownerName:
        String(body.business?.ownerName ?? "")
          .trim()
          .slice(0, 80) || "The Owner",
      signOff: String(body.business?.signOff ?? "")
        .trim()
        .slice(0, 120),
      contactLine: String(body.business?.contactLine ?? "")
        .trim()
        .slice(0, 160),
      allowedOffers:
        String(body.business?.allowedOffers ?? "none")
          .trim()
          .slice(0, 200) || "none",
      description: String(body.business?.description ?? "")
        .trim()
        .slice(0, 600),
      platform:
        String(body.business?.platform ?? "Google")
          .trim()
          .slice(0, 40) || "Google",
      replyTone: ["warm", "formal", "apologetic"].includes(body.business?.replyTone)
        ? body.business.replyTone
        : "warm",
      replyLanguage:
        String(body.business?.replyLanguage ?? "auto")
          .trim()
          .slice(0, 40) || "auto",
      ownerLanguage:
        String(body.business?.ownerLanguage ?? "English")
          .trim()
          .slice(0, 40) || "English",
    };

    await db.business.upsert({
      where: { userId },
      update: businessData,
      create: { userId, ...businessData },
    });

    // Credential: only overwrite when the client sent one this round.
    if (body.credential && body.credential.mode !== "none") {
      const mode = body.credential.mode === "oauth_token" ? "oauth_token" : "api_key";
      const apiKey = String(body.credential.apiKey ?? "").trim();
      const token = String(body.credential.token ?? "").trim();
      const secret = mode === "api_key" ? apiKey : token;
      if (!secret) {
        return NextResponse.json(
          { error: "Credential selected but no key was provided." },
          { status: 400 },
        );
      }
      const locationId = String(body.credential.locationId ?? "")
        .trim()
        .slice(0, 200);
      const verdict = await verifyCredentials(mode, apiKey, token, locationId);
      await db.credential.upsert({
        where: { userId },
        update: {
          mode,
          apiKeyEnc: mode === "api_key" ? encrypt(apiKey) : null,
          tokenEnc: mode === "oauth_token" ? encrypt(token) : null,
          locationId,
          keyHint: keyHint(secret),
          status: verdict.status,
          statusMessage: verdict.message,
          lastCheckedAt: new Date(),
        },
        create: {
          userId,
          mode,
          apiKeyEnc: mode === "api_key" ? encrypt(apiKey) : null,
          tokenEnc: mode === "oauth_token" ? encrypt(token) : null,
          locationId,
          keyHint: keyHint(secret),
          status: verdict.status,
          statusMessage: verdict.message,
          lastCheckedAt: new Date(),
        },
      });
    }

    await db.user.update({ where: { id: userId }, data: { onboardedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("onboarding failed:", err);
    return NextResponse.json({ error: "Could not save your workspace details." }, { status: 500 });
  }
}
