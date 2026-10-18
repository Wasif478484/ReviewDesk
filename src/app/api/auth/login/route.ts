import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { verifyPassword, createSession } from "@/lib/server/auth";
import { ensureWorkspace } from "@/lib/server/workspace";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    await ensureWorkspace(user.id);
    await createSession(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("login failed:", err);
    return NextResponse.json({ error: "Could not sign in. Please try again." }, { status: 500 });
  }
}
