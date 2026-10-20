import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";

/** DELETE /api/organizations/[orgId]/rules/[ruleId], remove a rule. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ orgId: string; ruleId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { orgId, ruleId } = await params;
    const membership = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!membership || !["owner", "manager"].includes(membership.role))
      return NextResponse.json(
        { error: "Only owners and managers can remove rules." },
        { status: 403 },
      );
    const rule = await db.rule.findUnique({ where: { id: ruleId } });
    if (!rule || rule.organizationId !== orgId)
      return NextResponse.json({ error: "Rule not found in this organization." }, { status: 404 });
    await db.rule.delete({ where: { id: ruleId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("rule delete failed:", err);
    return NextResponse.json({ error: "Could not remove rule." }, { status: 500 });
  }
}
