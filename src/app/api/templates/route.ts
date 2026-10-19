import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";

/** GET /api/templates, list templates for the user's organization(s). */
export async function GET() {
  try {
    const userId = await requireUserId();
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { templates: true },
    });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    return NextResponse.json({
      ok: true,
      templates: user.templates.map((t) => ({
        id: t.id,
        name: t.name,
        content: t.content,
        category: t.category,
        usageCount: t.usageCount,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("templates list failed:", err);
    return NextResponse.json({ error: "Could not load templates." }, { status: 500 });
  }
}

/** POST /api/templates, create a new reply template. */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const content = String(body.content ?? "").trim();
    const category = String(body.category ?? "general").trim().slice(0, 40);
    if (!name) return NextResponse.json({ error: "Template name is required." }, { status: 400 });
    if (!content) return NextResponse.json({ error: "Template content is required." }, { status: 400 });
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user?.organizationId)
      return NextResponse.json({ error: "You must belong to an organization to create templates." }, { status: 400 });
    const template = await db.template.create({
      data: { organizationId: user.organizationId, userId, name, content, category },
    });
    return NextResponse.json({ ok: true, template: { id: template.id, name: template.name, content: template.content, category: template.category } });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("template create failed:", err);
    return NextResponse.json({ error: "Could not create template." }, { status: 500 });
  }
}
