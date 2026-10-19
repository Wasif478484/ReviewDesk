import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";

/**
 * GET /api/templates/[templateId], get a single template.
 * Raw SQL: the Prisma client in this build does not expose the Template model.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { templateId } = await params;
    const rows = await db.$queryRawUnsafe(
      `SELECT id, name, content, category, "usageCount", "createdAt", "updatedAt"
       FROM "Template"
       WHERE id = $1 AND "userId" = $2`,
      templateId,
      userId,
    );
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0)
      return NextResponse.json({ error: "Template not found." }, { status: 404 });
    return NextResponse.json({ ok: true, template: list[0] });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("template get failed:", err);
    return NextResponse.json({ error: "Could not load template." }, { status: 500 });
  }
}

/** PUT /api/templates/[templateId], update a template. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { templateId } = await params;
    const body = await req.json();

    const sets: string[] = [];
    const values: unknown[] = [];
    if (body.name !== undefined) {
      values.push(String(body.name).trim().slice(0, 120));
      sets.push(`"name" = $${values.length}`);
    }
    if (body.content !== undefined) {
      values.push(String(body.content).trim().slice(0, 2000));
      sets.push(`"content" = $${values.length}`);
    }
    if (body.category !== undefined) {
      values.push(String(body.category).trim().slice(0, 40));
      sets.push(`"category" = $${values.length}`);
    }
    if (sets.length === 0)
      return NextResponse.json({ error: "No fields to update." }, { status: 400 });

    values.push(templateId);
    values.push(userId);
    await db.$executeRawUnsafe(
      `UPDATE "Template" SET ${sets.join(", ")}, "updatedAt" = NOW()
       WHERE id = $${values.length - 1} AND "userId" = $${values.length}`,
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
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { templateId } = await params;
    await db.$executeRawUnsafe(
      `DELETE FROM "Template" WHERE id = $1 AND "userId" = $2`,
      templateId,
      userId,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("template delete failed:", err);
    return NextResponse.json({ error: "Could not delete template." }, { status: 500 });
  }
}
