import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { hashPassword, createSession } from "@/lib/server/auth";
import { ensureWorkspace } from "@/lib/server/workspace";
import { issueAuthToken } from "@/lib/server/authtoken";
import { sendMail } from "@/lib/server/mail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");

    if (!name || name.length > 80) {
      return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: { email, passwordHash, name },
    });
    await ensureWorkspace(user.id);
    await createSession(user.id);

    // Fire-and-forget verification email; devLink surfaces only when SMTP
    // is not configured so the flow stays testable on such deployments.
    let verify: { devLink?: string; devNote?: string } = {};
    try {
      const origin = new URL(req.url).origin;
      const { token } = await issueAuthToken(user.id, "verify_email");
      const link = `${origin}/?verify=${token}`;
      const mail = await sendMail({
        to: user.email,
        subject: "ReviewDesk: verify your email",
        text: `Hello ${user.name},\n\nVerify your ReviewDesk email address with this link (valid for 24 hours):\n\n${link}\n\nIf you did not sign up, you can ignore this message.`,
      });
      if (mail.transport === "console") {
        verify = {
          devLink: link,
          devNote:
            "SMTP is not configured on this deployment, so the link is shown here and logged on the server.",
        };
      }
    } catch (mailErr) {
      console.error("verification mail failed (signup continues):", mailErr);
    }

    return NextResponse.json({ ok: true, userId: user.id, ...verify });
  } catch (err) {
    console.error("signup failed:", err);
    return NextResponse.json(
      { error: "Could not create the account. Please try again." },
      { status: 500 },
    );
  }
}
