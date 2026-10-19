import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";

/** GET /api/templates/[templateId], get a single template. */
export async function GET(req: Request, { params }: { params: { templateId: string } }) {
  try {
    const userId = await requireUserId();
    const { templateId } = params;
    const template = await db.template.findUnique({ where: { id: templateId } });
    if (!template) return NextResponse.json({ error: "Template not found." }, { status: 404 });
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || template.organizationId !== user.organizationId)
      return NextResponse.json({ error: "Not authorized to view this template." }, { status: 403 });
    await db.template.update({ where: { id: templateId }, data: { usageCount: { increment: 1 } } });
    return NextResponse.json({ ok: true, template });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("template get failed:", err);
    return NextResponse.json({ error: "Could not load template." }, { status: 500 });
  }
}

/** PUT /api/templates/[templateId], update a template. */
export async function PUT(req: Request, { params }: { params: { templateId: string } }) {
  try {
    const userId = await requireUserId();
    const { templateId } = params;
    const template = await db.template.findUnique({ where: { id: templateId } });
    if (!template) return NextResponse.json({ error: "Template not found." }, { status: 404 });
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || template.organizationId !== user.organizationId)
      return NextResponse.json({ error: "Not authorized to edit this template." }, { status: 403 });
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name) data.name = String(body.name).trim().slice(0, 120);
    if (body.content !== undefined) data.content = String(body.content).trim().slice(0, 2000);
    if (body.category) data.category = String(body.category).trim().slice(0, 40);
    await db.template.update({ where: { id: templateId }, data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("template update failed:", err);
    return NextResponse.json({ error: "Could not update template." }, { status: 500 });
  }
}

/** DELETE /api/templates/[templateId], delete a template. */
export async function DELETE(req: Request, { params }: { params: { templateId: string } }) {
  try {
    const userId = await requireUserId();
    const { templateId } = params;
    const template = await db.template.findUnique({ where: { id: templateId } });
    if (!template) return NextResponse.json({ error: "Template not found." }, { status: 404 });
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || template.organizationId !== user.organizationId)
      return NextResponse.json({ error: "Not authorized to delete this template." }, { status: 403 });
    await db.template.delete({ where: { id: templateId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("template delete failed:", err);
    return NextResponse.json({ error: "Could not delete template." }, { status: 500 });
  }
}
