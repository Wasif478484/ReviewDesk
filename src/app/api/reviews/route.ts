import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";

/**
 * POST /api/reviews, import reviews from pasted CSV (stars,text[,author,date]).
 * Duplicate texts in the inbox are skipped so re-pastes stay clean.
 */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const csv = String(body.csv ?? "");
    if (!csv.trim()) return NextResponse.json({ error: "Paste CSV text first." }, { status: 400 });

    const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const existing = await db.review.findMany({ where: { userId }, select: { text: true } });
    const seen = new Set(existing.map((r) => r.text.trim().toLowerCase()));

    const rows: { stars: number | null; text: string; author: string; date: string }[] = [];
    for (const line of lines) {
      const cols = line.split(",").map((c) => c.trim());
      let stars: number | null = null;
      let text = line;
      let author = "Imported";
      let date = new Date().toISOString().slice(0, 10);
      if (cols.length >= 2 && /^\d$/.test(cols[0])) {
        stars = Number.parseInt(cols[0], 10);
        text = cols.slice(1).join(",").replace(/^"|"$/g, "");
      } else if (cols.length >= 3 && cols[0].toLowerCase() === "stars") {
        continue; // header row
      }
      if (!text) continue;
      if (seen.has(text.toLowerCase())) continue;
      seen.add(text.toLowerCase());
      rows.push({ stars, text: text.slice(0, 2000), author, date });
    }
    if (!rows.length) {
      return NextResponse.json({ error: "No new reviews found in that CSV (expected rows like: 5,\"Great food\")." }, { status: 400 });
    }
    const res = await db.review.createMany({
      data: rows.map((r) => ({ userId, source: "import", stars: r.stars, text: r.text, author: r.author, date: r.date })),
    });
    return NextResponse.json({ ok: true, imported: res.count });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("import failed:", err);
    return NextResponse.json({ error: "Could not import reviews." }, { status: 500 });
  }
}
