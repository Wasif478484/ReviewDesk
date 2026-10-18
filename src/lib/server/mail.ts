/**
 * mail.ts, outbound mail for verification and password reset.
 *
 * If SMTP env vars are configured (SMTP_HOST/SMTP_USER/SMTP_PASS) mail is
 * sent for real via nodemailer. Otherwise the message is logged to the
 * server console and the caller may surface the link in non-production so
 * the flow stays testable. Links are never returned to the client when the
 * deployment runs with SMTP configured.
 */

export interface MailResult {
  delivered: boolean;
  transport: "smtp" | "console";
  error?: string;
}

export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(opts: { to: string; subject: string; text: string; html?: string }): Promise<MailResult> {
  if (mailConfigured()) {
    try {
      const nodemailer = await import("nodemailer");
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: Number(process.env.SMTP_PORT ?? 587) === 465,
        auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
      });
      await transport.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });
      return { delivered: true, transport: "smtp" };
    } catch (err) {
      console.error("[mail] SMTP send failed:", err);
      return { delivered: false, transport: "smtp", error: err instanceof Error ? err.message : String(err) };
    }
  }
  // No SMTP: log so the operator can hand the link over manually.
  console.log(`[mail:console] To: ${opts.to}\nSubject: ${opts.subject}\n${opts.text}`);
  return { delivered: false, transport: "console" };
}
