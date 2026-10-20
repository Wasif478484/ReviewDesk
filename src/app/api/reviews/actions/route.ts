import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/auth";
import { recordReply, undoReply, dismissTriage, cancelVeto } from "@/lib/server/workspace";

/**
 * POST /api/reviews/actions, owner decisions on a triage row.
 * Body: { type: "record" | "undo" | "dismiss" | "cancel_veto",
 *         triageId?, reviewId?, draft? }
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const type = String(body.type ?? "");

    if (type === "record") {
      if (!body.triageId) return NextResponse.json({ error: "Missing triageId." }, { status: 400 });
      const res = await recordReply(userId, body.triageId, body.draft);
      return NextResponse.json(res, { status: res.ok ? 200 : 400 });
    }
    if (type === "undo") {
      if (!body.reviewId) return NextResponse.json({ error: "Missing reviewId." }, { status: 400 });
      const ok = await undoReply(userId, body.reviewId);
      return NextResponse.json({
        ok,
        message: ok ? "Reply undone; the review is back in the desk." : "Nothing to undo.",
      });
    }
    if (type === "dismiss") {
      if (!body.triageId) return NextResponse.json({ error: "Missing triageId." }, { status: 400 });
      const ok = await dismissTriage(userId, body.triageId);
      return NextResponse.json({ ok, message: ok ? "Draft dismissed." : "Triage row not found." });
    }
    if (type === "cancel_veto") {
      if (!body.triageId) return NextResponse.json({ error: "Missing triageId." }, { status: 400 });
      const ok = await cancelVeto(userId, body.triageId);
      return NextResponse.json({
        ok,
        message: ok ? "Moved to the approval queue." : "Row not found.",
      });
    }
    return NextResponse.json({ error: "Unknown action type." }, { status: 400 });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("review action failed:", err);
    return NextResponse.json({ error: "Action failed. Please try again." }, { status: 500 });
  }
}
