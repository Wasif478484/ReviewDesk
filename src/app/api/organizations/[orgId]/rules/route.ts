import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { parseKeywords } from "@/lib/engine/rules";

/** GET /api/organizations/[orgId]/rules, list the automation rules. */
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
    const rules = await db.rule.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "asc" } });
    return NextResponse.json({
      ok: true,
      rules: rules.map((r) => ({
        id: r.id,
        name: r.name,
        enabled: r.enabled,
        minStars: r.minStars,
        maxStars: r.maxStars,
        keywords: parseKeywords(r.keywords),
        language: r.language,
        forceAction: r.forceAction,
        setPriority: r.setPriority,
      })),
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("rules list failed:", err);
    return NextResponse.json({ error: "Could not load rules." }, { status: 500 });
  }
}

/** POST /api/organizations/[orgId]/rules, create a rule. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { orgId } = await params;
    const membership = await db.member.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!membership || !["owner", "manager"].includes(membership.role))
      return NextResponse.json({ error: "Only owners and managers can create rules." }, { status: 403 });
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Rule name is required." }, { status: 400 });
    const forceAction = String(body.forceAction ?? "");
    if (forceAction && !["reply", "reply_needs_owner", "hold", "report"].includes(forceAction))
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    const setPriority = String(body.setPriority ?? "");
    if (setPriority && !["urgent", "normal", "low"].includes(setPriority))
      return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
    const keywords = Array.isArray(body.keywords)
      ? body.keywords.map((k) => String(k).trim().toLowerCase()).filter(Boolean).slice(0, 30)
      : [];
    const rule = await db.rule.create({
      data: {
        organizationId: orgId,
        userId,
        name: name.slice(0, 120),
        enabled: body.enabled !== false,
        minStars: body.minStars == null ? null : Number(body.minStars),
        maxStars: body.maxStars == null ? null : Number(body.maxStars),
        keywords: JSON.stringify(keywords),
        language: String(body.language ?? "").trim().slice(0, 40),
        forceAction,
        setPriority,
      },
    });
    return NextResponse.json({
      ok: true,
      rule: {
        id: rule.id, name: rule.name, enabled: rule.enabled,
        minStars: rule.minStars, maxStars: rule.maxStars,
        keywords: JSON.parse(rule.keywords), language: rule.language,
        forceAction: rule.forceAction, setPriority: rule.setPriority,
      },
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("rule create failed:", err);
    return NextResponse.json({ error: "Could not create rule." }, { status: 500 });
  }
}
