import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { v4 as uuidv4 } from "uuid";

/** GET /api/templates/[templateId], get a single template. */
export async function GET(req: Request, { params }: { params: { templateId: string } }) {
  try {
    const userId = await requireUserId();
    const { templateId } = params;
    const rows = await db.$queryRawUnsafe(
      `SELECT id, name, content, category, usage_count, created_at, updated_at
       FROM "Template"
       WHERE id = $1 AND "userId" = $2`,
      [templateId, userId],
    );
    const rowsArray = Array.isArray(rows) ? rows : [];
    if (rowsArray.length === 0)
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    return NextResponse.json({ ok: true, template: rowsArray[0] });
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
    const body = await req.json();
    const data: string[] = [];
    const values: unknown[] = [templateId, userId];
    if (body.name) {
      data.push(`"name" = $${values.push(String(body.name).trim().slice(0, 120))}`);
    }
    if (body.content !== undefined) {
      data.push(`"content" = $${values.push(String(body.content).trim().slice(0, 2000))}`);
    }
    if (body.category) {
      data.push(`"category" = $${values.push(String(body.category).trim().slice(0, 40))}`);
    }
    if (data.length === 0) {
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });
    }
    data.push(`"updatedAt" = NOW()`);
    await db.$queryRawUnsafe(
      `UPDATE "Template" SET ${data.join(", ")} WHERE id = $1 AND "userId" = $2`,
      ...values,
    );
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
    await db.$queryRawUnsafe(
      `DELETE FROM "Template" WHERE id = $1 AND "userId" = $2`,
      [templateId, userId],
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("template delete failed:", err);
    return NextResponse.json({ error: "Could not delete template." }, { status: 500 });
  }
}
