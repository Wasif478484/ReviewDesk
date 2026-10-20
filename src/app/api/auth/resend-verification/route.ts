import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { issueAuthToken } from "@/lib/server/authtoken";
import { sendMail } from "@/lib/server/mail";

/** POST /api/auth/resend-verification, issue and send a fresh verification link. */
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const origin = new URL(req.url).origin;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    if (user.emailVerifiedAt) {
      return NextResponse.json({ ok: true, message: "Your email is already verified." });
    }
    const { token } = await issueAuthToken(user.id, "verify_email");
    const link = `${origin}/?verify=${token}`;
    const result = await sendMail({
      to: user.email,
      subject: "ReviewDesk: verify your email",
      text: `Hello ${user.name},\n\nVerify your ReviewDesk email address with this link (valid for 24 hours):\n\n${link}\n\nIf you did not sign up, you can ignore this message.`,
    });
    if (result.transport === "console") {
      return NextResponse.json({
        ok: true,
        message: "Verification link generated.",
        devLink: link,
        devNote:
          "SMTP is not configured on this deployment, so the link is shown here and logged on the server.",
      });
    }
    if (!result.delivered) {
      return NextResponse.json(
        { ok: false, error: `Mail could not be sent: ${result.error ?? "unknown error"}` },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, message: "Verification email sent. Check your inbox." });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("resend-verification failed:", err);
    return NextResponse.json({ error: "Could not send the verification email." }, { status: 500 });
  }
}
