import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { encrypt, keyHint, decrypt } from "@/lib/server/crypto";
import { verifyCredentials } from "@/lib/server/google";

/**
 * POST /api/credentials, save or replace the Google Business credential.
 * Body: { mode, apiKey?, token?, locationId?, livePosting?, test? }
 * Secrets are stored AES-256-GCM encrypted and never returned to the client.
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const mode =
      body.mode === "oauth_token"
        ? "oauth_token"
        : body.mode === "oauth"
          ? "oauth"
          : body.mode === "none"
            ? "none"
            : "api_key";

    if (mode === "none") {
      await db.credential.upsert({
        where: { userId },
        update: {
          mode: "none",
          status: "unverified",
          statusMessage: "Disconnected; demo inbox only.",
          livePosting: false,
        },
        create: {
          userId,
          mode: "none",
          status: "unverified",
          statusMessage: "Disconnected; demo inbox only.",
        },
      });
      return NextResponse.json({ ok: true });
    }

    // Full OAuth connection: the callback already stored the tokens. This
    // branch only updates the location choice and live-posting switch.
    if (mode === "oauth") {
      const existing = await db.credential.findUnique({ where: { userId } });
      if (!existing || existing.mode !== "oauth") {
        return NextResponse.json(
          { error: "No OAuth connection found. Use the Connect with Google button first." },
          { status: 400 },
        );
      }
      await db.credential.update({
        where: { userId },
        data: {
          locationId: String(body.locationId ?? "")
            .trim()
            .slice(0, 200),
          livePosting: Boolean(body.livePosting),
        },
      });
      return NextResponse.json({ ok: true });
    }

    const apiKey = String(body.apiKey ?? "").trim();
    const token = String(body.token ?? "").trim();
    const secret = mode === "api_key" ? apiKey : token;
    if (!secret) return NextResponse.json({ error: "No key provided." }, { status: 400 });
    const locationId = String(body.locationId ?? "")
      .trim()
      .slice(0, 200);

    // Allow keeping the existing secret when only other fields change.
    let finalSecret = secret;
    if (secret.startsWith("••")) {
      const existing = await db.credential.findUnique({ where: { userId } });
      const enc = mode === "api_key" ? existing?.apiKeyEnc : existing?.tokenEnc;
      if (!enc)
        return NextResponse.json(
          { error: "No stored key to keep; paste the full key." },
          { status: 400 },
        );
      finalSecret = decrypt(enc);
    }

    const verdict =
      body.test === false
        ? { status: "unverified", message: "Saved without testing." }
        : await verifyCredentials(
            mode,
            mode === "api_key" ? finalSecret : "",
            mode === "oauth_token" ? finalSecret : "",
            locationId,
          );

    const livePosting = Boolean(body.livePosting);
    await db.credential.upsert({
      where: { userId },
      update: {
        mode,
        apiKeyEnc: mode === "api_key" ? encrypt(finalSecret) : null,
        tokenEnc: mode === "oauth_token" ? encrypt(finalSecret) : null,
        locationId,
        keyHint: keyHint(finalSecret),
        status: verdict.status,
        statusMessage: verdict.message,
        lastCheckedAt: new Date(),
        livePosting,
      },
      create: {
        userId,
        mode,
        apiKeyEnc: mode === "api_key" ? encrypt(finalSecret) : null,
        tokenEnc: mode === "oauth_token" ? encrypt(finalSecret) : null,
        locationId,
        keyHint: keyHint(finalSecret),
        status: verdict.status,
        statusMessage: verdict.message,
        lastCheckedAt: new Date(),
        livePosting,
      },
    });
    return NextResponse.json({ ok: true, status: verdict.status, message: verdict.message });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("credential save failed:", err);
    return NextResponse.json({ error: "Could not save the credential." }, { status: 500 });
  }
}

/** DELETE /api/credentials, disconnect and wipe the stored secret. */
export async function DELETE() {
  try {
    const userId = await requireUserId();
    await db.credential.deleteMany({ where: { userId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("credential delete failed:", err);
    return NextResponse.json({ error: "Could not remove the credential." }, { status: 500 });
  }
}
