import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/server/auth";
import { runAutopilotCycle } from "@/lib/server/workspace";

/**
 * POST /api/autopilot, run one autopilot cycle: record every past-due
 * auto-lane row whose policy gate passes (daily cap included).
 */
export async function POST() {
  try {
    const userId = await requireUserId();
    const outcome = await runAutopilotCycle(userId);
    return NextResponse.json({ ok: true, ...outcome });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("autopilot cycle failed:", err);
    return NextResponse.json({ error: "Autopilot cycle failed." }, { status: 500 });
  }
}
