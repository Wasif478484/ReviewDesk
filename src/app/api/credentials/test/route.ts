import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { decrypt } from "@/lib/server/crypto";
import { verifyCredentials, fetchGoogleReviews } from "@/lib/server/google";

/**
 * POST /api/credentials/test, verify the stored (or newly pasted) credential
 * against Google and report the result honestly.
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const mode = body.mode === "oauth_token" ? "oauth_token" : "api_key";
    let apiKey = String(body.apiKey ?? "").trim();
    let token = String(body.token ?? "").trim();
    const locationId = String(body.locationId ?? "").trim();

    if ((mode === "api_key" && !apiKey) || (mode === "oauth_token" && !token)) {
      const stored = await db.credential.findUnique({ where: { userId } });
      if (!stored || stored.mode !== mode) {
        return NextResponse.json({
          ok: false,
          status: "error",
          message: "No credential available to test.",
        });
      }
      try {
        if (mode === "api_key" && stored.apiKeyEnc) apiKey = decrypt(stored.apiKeyEnc);
        if (mode === "oauth_token" && stored.tokenEnc) token = decrypt(stored.tokenEnc);
      } catch {
        return NextResponse.json({
          ok: false,
          status: "error",
          message: "Stored credential could not be decrypted (changed APP_SECRET?).",
        });
      }
    }

    const verdict = await verifyCredentials(mode, apiKey, token, locationId);

    // While we hold a valid token, report whether live review fetch will work.
    let fetchNote = "";
    if (verdict.ok && mode === "oauth_token") {
      try {
        const sample = await fetchGoogleReviews(token, locationId || "accounts/-/locations/-");
        fetchNote = `Reviews endpoint reachable (${sample.reviews.length} in latest page).`;
      } catch (err) {
        fetchNote = `Reviews fetch check: ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    await db.credential.updateMany({
      where: { userId },
      data: {
        status: verdict.status,
        statusMessage: fetchNote ? `${verdict.message} ${fetchNote}` : verdict.message,
        lastCheckedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: verdict.ok,
      status: verdict.status,
      message: verdict.message,
      fetchNote,
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("credential test failed:", err);
    return NextResponse.json(
      { ok: false, status: "error", message: "Test failed unexpectedly." },
      { status: 500 },
    );
  }
}
