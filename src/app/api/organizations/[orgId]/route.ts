import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";

/** GET /api/organizations/[orgId], get a single organization with members. */
export async function GET(req: Request, { params }: { params: { orgId: string } }) {
  try {
    const userId = await requireUserId();
    const { orgId } = params;
    const membership = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: { organization: { include: { members: { include: { user: true } } } } },
    });
    if (!membership) return NextResponse.json({ error: "Not found or not a member." }, { status: 404 });
    return NextResponse.json({
      ok: true,
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        plan: membership.organization.plan,
        role: membership.role,
        members: membership.organization.members.map((m) => ({
          id: m.id,
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
      },
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("organization get failed:", err);
    return NextResponse.json({ error: "Could not load organization." }, { status: 500 });
  }
}

/** PUT /api/organizations/[orgId], update organization details. */
export async function PUT(req: Request, { params }: { params: { orgId: string } }) {
  try {
    const userId = await requireUserId();
    const { orgId } = params;
    const membership = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!membership || membership.role !== "owner")
      return NextResponse.json({ error: "Only the organization owner can update details." }, { status: 403 });
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name) data.name = String(body.name).trim().slice(0, 120);
    if (body.plan && ["free", "pro", "enterprise"].includes(body.plan)) data.plan = body.plan;
    await db.organization.update({ where: { id: orgId }, data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("organization update failed:", err);
    return NextResponse.json({ error: "Could not update organization." }, { status: 500 });
  }
}
