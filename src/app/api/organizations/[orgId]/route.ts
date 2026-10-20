import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";

/** GET /api/organizations/[orgId], get one organization with its members. */
export async function GET(req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const userId = await requireUserId();
    const { orgId } = await params;
    const membership = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      include: { organization: { include: { members: { include: { user: true } } } } },
    });
    if (!membership)
      return NextResponse.json({ error: "Not found or not a member." }, { status: 404 });
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

/** PUT /api/organizations/[orgId], rename the organization. Owners only. */
export async function PUT(req: Request, { params }: { params: Promise<{ orgId: string }> }) {
  try {
    const userId = await requireUserId();
    const { orgId } = await params;
    const membership = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!membership || membership.role !== "owner")
      return NextResponse.json(
        { error: "Only the organization owner can update details." },
        { status: 403 },
      );
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    await db.organization.update({ where: { id: orgId }, data: { name: name.slice(0, 120) } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("organization update failed:", err);
    return NextResponse.json({ error: "Could not update organization." }, { status: 500 });
  }
}
