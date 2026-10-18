import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { consumeAuthToken } from "@/lib/server/authtoken";

/** POST /api/auth/verify-email, consume a one-time verification token. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "");
    const userId = await consumeAuthToken(token, "verify_email");
    if (!userId) {
      return NextResponse.json({ error: "This verification link is invalid, already used, or expired." }, { status: 400 });
    }
    await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
    return NextResponse.json({ ok: true, message: "Email verified. Thank you!" });
  } catch (err) {
    console.error("verify-email failed:", err);
    return NextResponse.json({ error: "Could not verify the email. Please try again." }, { status: 500 });
  }
}
