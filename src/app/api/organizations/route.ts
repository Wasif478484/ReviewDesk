import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";

/** GET /api/organizations, list organizations the user belongs to. */
export async function GET() {
  try {
    const userId = await requireUserId();
    const memberships = await db.member.findMany({
      where: { userId },
      include: { organization: true },
    });
    return NextResponse.json({
      ok: true,
      organizations: memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        plan: m.organization.plan,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("organizations list failed:", err);
    return NextResponse.json({ error: "Could not load organizations." }, { status: 500 });
  }
}

/** POST /api/organizations, create a new organization. */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const existing = await db.organization.findUnique({ where: { slug } });
    if (existing) return NextResponse.json({ error: "An organization with that name already exists." }, { status: 409 });

    const org = await db.organization.create({
      data: { name, slug },
    });
    await db.member.create({
      data: { organizationId: org.id, userId, role: "owner" },
    });
    await db.user.update({
      where: { id: userId },
      data: { organizationId: org.id },
    });
    return NextResponse.json({ ok: true, organization: { id: org.id, name: org.name, slug: org.slug, role: "owner" } });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("organization create failed:", err);
    return NextResponse.json({ error: "Could not create organization." }, { status: 500 });
  }
}
