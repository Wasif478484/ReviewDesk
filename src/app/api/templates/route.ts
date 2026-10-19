import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { v4 as uuidv4 } from "uuid";

/** GET /api/templates, list templates for the signed-in user. */
export async function GET() {
  try {
    const userId = await requireUserId();
    const rows = await db.$queryRawUnsafe(
      `SELECT id, name, content, category, usage_count, created_at, updated_at
       FROM "Template"
       WHERE "userId" = $1
       ORDER BY "created_at" DESC`,
      [userId],
    );
    return NextResponse.json({
      ok: true,
      templates: Array.isArray(rows) ? rows : [],
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

    const rows = await db.$queryRawUnsafe(
      `INSERT INTO "Template" ("id", "organizationId", "userId", "name", "content", "category", "usageCount", "createdAt", "updatedAt")
       VALUES ($1, NULL, $2, $3, $4, $5, 0, NOW(), NOW())
       RETURNING id, name, content, category, "usageCount", "createdAt", "updatedAt"`,
      [uuidv4(), userId, name, content, category],
    );
    return NextResponse.json({
      ok: true,
      template: Array.isArray(rows) && rows.length > 0 ? rows[0] : null,
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("template create failed:", err);
    return NextResponse.json({ error: "Could not create template." }, { status: 500 });
  }
}
