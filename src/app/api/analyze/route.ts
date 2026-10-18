import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { triageReview } from "@/lib/server/workspace";
import type { Tone } from "@/lib/engine/prompts";

/**
 * POST /api/analyze, run the frozen triage prompt over one review or a
 * batch. Body: { reviewId } or { reviewIds: [...] }, optional overrides
 * { tone, language, ownerLanguage }.
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const ids: string[] = body.reviewIds ?? (body.reviewId ? [body.reviewId] : []);
    if (!ids.length) return NextResponse.json({ error: "No reviews to analyze." }, { status: 400 });
    if (ids.length > 30) return NextResponse.json({ error: "Batch is capped at 30 reviews." }, { status: 400 });

    const opts = {
      tone: body.tone as Tone | undefined,
      language: body.language as string | undefined,
      ownerLanguage: body.ownerLanguage as string | undefined,
    };

    const results: { reviewId: string; ok: boolean; action?: string; error?: string }[] = [];
    for (const id of ids) {
      try {
        const result = await triageReview(userId, id, opts);
        results.push({ reviewId: id, ok: true, action: result.action });
      } catch (err) {
        console.error(`triage failed for ${id}:`, err);
        results.push({ reviewId: id, ok: false, error: err instanceof Error ? err.message : String(err) });
      }
    }
    const failed = results.filter((r) => !r.ok).length;
    return NextResponse.json({
      ok: failed === 0,
      analyzed: results.length - failed,
      failed,
      results,
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("analyze failed:", err);
    return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
  }
}
