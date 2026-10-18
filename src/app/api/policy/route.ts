import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";

/** PUT /api/policy, update autopilot safety policy. */
export async function PUT(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const clampInt = (v: unknown, min: number, max: number, fallback: number) => {
      const n = Number.parseInt(String(v), 10);
      if (Number.isNaN(n)) return fallback;
      return Math.min(max, Math.max(min, n));
    };
    let trusted = ["english"];
    if (Array.isArray(body.trustedLanguages)) {
      trusted = body.trustedLanguages.map((l: unknown) => String(l).trim().toLowerCase()).filter(Boolean);
    }
    const data = {
      enabled: Boolean(body.enabled),
      dryRun: Boolean(body.dryRun),
      minStars: clampInt(body.minStars, 1, 5, 4),
      trustedLanguages: JSON.stringify(trusted.length ? trusted : ["english"]),
      delayMinutes: clampInt(body.delayMinutes, 0, 1440, 30),
      dailyCap: clampInt(body.dailyCap, 1, 100, 10),
      allowMixedSentiment: Boolean(body.allowMixedSentiment),
    };
    await db.policy.upsert({ where: { userId }, update: data, create: { userId, ...data } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("policy update failed:", err);
    return NextResponse.json({ error: "Could not save the autopilot policy." }, { status: 500 });
  }
}
