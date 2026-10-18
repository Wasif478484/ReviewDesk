import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { consumeAuthToken } from "@/lib/server/authtoken";
import { hashPassword } from "@/lib/server/auth";

/** POST /api/auth/reset-password, consume a one-time token and set a new password. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "");
    const password = String(body.password ?? "");
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    const userId = await consumeAuthToken(token, "reset_password");
    if (!userId) {
      return NextResponse.json({ error: "This reset link is invalid, already used, or expired. Request a new one." }, { status: 400 });
    }
    const passwordHash = await hashPassword(password);
    await db.user.update({ where: { id: userId }, data: { passwordHash } });
    return NextResponse.json({ ok: true, message: "Password updated. You can sign in with the new password now." });
  } catch (err) {
    console.error("reset-password failed:", err);
    return NextResponse.json({ error: "Could not reset the password. Please try again." }, { status: 500 });
  }
}
