import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";

/** PUT /api/business, update the business profile + desk preferences. */
export async function PUT(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const data = {
      name:
        String(body.name ?? "")
          .trim()
          .slice(0, 120) || "Your Business",
      category:
        String(body.category ?? "restaurant")
          .trim()
          .slice(0, 80) || "restaurant",
      ownerName:
        String(body.ownerName ?? "")
          .trim()
          .slice(0, 80) || "The Owner",
      signOff: String(body.signOff ?? "")
        .trim()
        .slice(0, 120),
      contactLine: String(body.contactLine ?? "")
        .trim()
        .slice(0, 160),
      allowedOffers:
        String(body.allowedOffers ?? "none")
          .trim()
          .slice(0, 200) || "none",
      description: String(body.description ?? "")
        .trim()
        .slice(0, 600),
      platform:
        String(body.platform ?? "Google")
          .trim()
          .slice(0, 40) || "Google",
      replyTone: ["warm", "formal", "apologetic"].includes(body.replyTone)
        ? body.replyTone
        : "warm",
      replyLanguage:
        String(body.replyLanguage ?? "auto")
          .trim()
          .slice(0, 40) || "auto",
      ownerLanguage:
        String(body.ownerLanguage ?? "English")
          .trim()
          .slice(0, 40) || "English",
    };
    await db.business.upsert({ where: { userId }, update: data, create: { userId, ...data } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("business update failed:", err);
    return NextResponse.json({ error: "Could not save the business profile." }, { status: 500 });
  }
}
