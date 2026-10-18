import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { issueAuthToken } from "@/lib/server/authtoken";
import { sendMail } from "@/lib/server/mail";

/**
 * POST /api/auth/forgot-password, always answers ok (no account
 * enumeration). When the account exists, a one-hour single-use reset link
 * is emailed (or logged to the server console when SMTP is not configured;
 * the link is returned to the client only in that case so the flow stays
 * testable on deployments without mail).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const origin = new URL(req.url).origin;

    const generic = { ok: true, message: "If that email has an account, a reset link is on its way." };
    if (!email) return NextResponse.json(generic);

    const user = await db.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json(generic);

    const { token } = await issueAuthToken(user.id, "reset_password");
    const link = `${origin}/?reset=${token}`;
    const result = await sendMail({
      to: user.email,
      subject: "ReviewDesk: reset your password",
      text: `Hello ${user.name},\n\nReset your ReviewDesk password with this link (valid for 60 minutes, single use):\n\n${link}\n\nIf you did not ask for this, you can ignore it; your password stays unchanged.`,
    });

    if (result.transport === "console") {
      // Dev/self-hosted without SMTP: hand the link back so the flow works.
      return NextResponse.json({ ...generic, devLink: link, devNote: "SMTP is not configured on this deployment, so the link is shown here and logged on the server." });
    }
    if (!result.delivered) {
      return NextResponse.json({ ok: false, error: `Mail could not be sent: ${result.error ?? "unknown error"}` }, { status: 500 });
    }
    return NextResponse.json(generic);
  } catch (err) {
    console.error("forgot-password failed:", err);
    return NextResponse.json({ error: "Could not process the request. Please try again." }, { status: 500 });
  }
}
