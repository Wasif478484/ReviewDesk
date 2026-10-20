import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";

/** GET /api/organizations/[orgId]/members, list members. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { orgId } = await params;
    const membership = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!membership)
      return NextResponse.json({ error: "Not a member of this organization." }, { status: 403 });
    const members = await db.member.findMany({
      where: { organizationId: orgId },
      include: { user: true },
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

/** POST /api/organizations/[orgId]/members, add an existing user as a member. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { orgId } = await params;
    const caller = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!caller || !["owner", "manager"].includes(caller.role))
      return NextResponse.json({ error: "Only owners and managers can add members." }, { status: 403 });
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = String(body.role ?? "responder");
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
    if (!["owner", "manager", "responder", "viewer"].includes(role))
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    if (role === "owner" && caller.role !== "owner")
      return NextResponse.json({ error: "Only an owner can add another owner." }, { status: 403 });
    const user = await db.user.findUnique({ where: { email } });
    if (!user)
      return NextResponse.json(
        { error: "No account with that email. They need to sign up first." },
        { status: 404 },
      );
    const existing = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: user.id } },
    });
    if (existing)
      return NextResponse.json({ error: "That person is already a member." }, { status: 409 });
    const member = await db.member.create({
      data: { organizationId: orgId, userId: user.id, role, invitedBy: userId, joinedAt: new Date() },
    });
    return NextResponse.json({
      ok: true,
      member: { id: member.id, userId: member.userId, name: user.name, email: user.email, role: member.role },
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("member add failed:", err);
    return NextResponse.json({ error: "Could not add member." }, { status: 500 });
  }
}
