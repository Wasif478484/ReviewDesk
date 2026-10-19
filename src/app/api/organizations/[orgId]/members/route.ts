import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";

/** GET /api/organizations/[orgId]/members, list members. */
export async function GET(req: Request, { params }: { params: { orgId: string } }) {
  try {
    const userId = await requireUserId();
    const { orgId } = params;
    const membership = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!membership) return NextResponse.json({ error: "Not a member of this organization." }, { status: 403 });
    const members = await db.member.findMany({
      where: { organizationId: orgId },
      include: { user: true },
      orderBy: { role: "asc" },
    });
    return NextResponse.json({
      ok: true,
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        invitedAt: m.invitedAt,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("members list failed:", err);
    return NextResponse.json({ error: "Could not load members." }, { status: 500 });
  }
}

/** POST /api/organizations/[orgId]/members, invite a member. */
export async function POST(req: Request, { params }: { params: { orgId: string } }) {
  try {
    const userId = await requireUserId();
    const { orgId } = params;
    const membership = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!membership || !["owner", "manager"].includes(membership.role))
      return NextResponse.json({ error: "Only owners and managers can invite members." }, { status: 403 });
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = String(body.role ?? "responder");
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
    if (!["owner", "manager", "responder", "viewer"].includes(role))
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    const user = await db.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: "User not found. They must sign up first." }, { status: 404 });
    const existing = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
    });
    if (existing) return NextResponse.json({ error: "User is already a member." }, { status: 409 });
    const member = await db.member.create({
      data: { organizationId: orgId, userId: user.id, role, invitedBy: userId },
    });
    return NextResponse.json({ ok: true, member: { id: member.id, userId: member.userId, role: member.role } });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("member invite failed:", err);
    return NextResponse.json({ error: "Could not invite member." }, { status: 500 });
  }
}
