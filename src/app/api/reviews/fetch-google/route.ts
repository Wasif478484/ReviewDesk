import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { googleAccessToken } from "@/lib/server/workspace";
import { fetchGoogleReviews } from "@/lib/server/google";

/**
 * POST /api/reviews/fetch-google, pull real reviews via the Business
 * Information API using the stored Google connection (full OAuth with
 * refresh, or a pasted OAuth token). Fails with a clear message when only
 * an API key is present (review data needs OAuth user consent).
 */
export async function POST() {
  try {
    const userId = await requireUserId();
    const cred = await db.credential.findUnique({ where: { userId } });
    if (!cred || (cred.mode !== "oauth" && cred.mode !== "oauth_token")) {
      return NextResponse.json(
        { error: "Live fetch needs a Google OAuth connection. Connect with Google in Settings, or use the demo inbox." },
        { status: 400 },
      );
    }
    if (!cred.locationId || !cred.locationId.includes("locations/")) {
      return NextResponse.json(
        { error: "Pick a location in Settings first (or set the accounts/{account}/locations/{locationId} resource name)." },
        { status: 400 },
      );
    }
    const resolved = await googleAccessToken(userId);
    if (!resolved?.token) {
      return NextResponse.json(
        { error: "No usable Google token. Reconnect Google in Settings." },
        { status: 400 },
      );
    }
    const { reviews } = await fetchGoogleReviews(resolved.token, cred.locationId);
    if (!reviews.length) {
      return NextResponse.json({ ok: true, imported: 0, message: "Google returned no unreplied reviews right now." });
    }
    const existing = await db.review.findMany({
      where: { userId, source: "google" },
      select: { externalId: true },
    });
    const seen = new Set(existing.map((r) => r.externalId));
    const fresh = reviews.filter((r) => !seen.has(r.externalId));
    if (!fresh.length) {
      return NextResponse.json({ ok: true, imported: 0, message: "Inbox is already up to date with Google." });
    }
    const res = await db.review.createMany({
      data: fresh.map((r) => ({
        userId, source: "google", externalId: r.externalId,
        stars: r.stars, text: r.text, author: r.author, date: r.date, hasReply: r.hasReply,
      })),
    });
    return NextResponse.json({ ok: true, imported: res.count });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("google fetch failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Google fetch failed." },
      { status: 502 },
    );
  }
}
