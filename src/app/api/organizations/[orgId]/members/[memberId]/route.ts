import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";

/** PUT /api/organizations/[orgId]/members/[memberId], update member role. */
export async function PUT(req: Request, { params }: { params: { orgId: string; memberId: string } }) {
  try {
    const userId = await requireUserId();
    const { orgId, memberId } = params;
    const caller = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!caller || !["owner", "manager"].includes(caller.role))
      return NextResponse.json({ error: "Only owners and managers can update member roles." }, { status: 403 });
    const body = await req.json();
    const role = String(body.role ?? "");
    if (!["owner", "manager", "responder", "viewer"].includes(role))
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    const member = await db.member.findUnique({ where: { id: memberId } });
    if (!member || member.organizationId !== orgId)
      return NextResponse.json({ error: "Member not found in this organization." }, { status: 404 });
    if (member.role === "owner" && role !== "owner")
      return NextResponse.json({ error: "Cannot change the owner role." }, { status: 403 });
    await db.member.update({ where: { id: memberId }, data: { role } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("member update failed:", err);
    return NextResponse.json({ error: "Could not update member." }, { status: 500 });
  }
}

/** DELETE /api/organizations/[orgId]/members/[memberId], remove a member. */
export async function DELETE(req: Request, { params }: { params: { orgId: string; memberId: string } }) {
  try {
    const userId = await requireUserId();
    const { orgId, memberId } = params;
    const caller = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!caller || caller.role !== "owner")
      return NextResponse.json({ error: "Only the owner can remove members." }, { status: 403 });
    const member = await db.member.findUnique({ where: { id: memberId } });
    if (!member || member.organizationId !== orgId)
      return NextResponse.json({ error: "Member not found in this organization." }, { status: 404 });
    if (member.userId === userId)
      return NextResponse.json({ error: "The owner cannot remove themselves." }, { status: 400 });
    if (member.role === "owner")
      return NextResponse.json({ error: "Cannot remove the owner." }, { status: 403 });
    await db.member.delete({ where: { id: memberId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("member remove failed:", err);
    return NextResponse.json({ error: "Could not remove member." }, { status: 500 });
  }
}
