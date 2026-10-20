/**
 * mail.ts, outbound mail for verification and password reset.
 *
 * If SMTP env vars are configured (SMTP_HOST/SMTP_USER/SMTP_PASS) mail is
 * sent for real via nodemailer. Otherwise the message is logged to the
 * server console and the caller may surface the link in non-production so
 * the flow stays testable. Links are never returned to the client when the
 * deployment runs with SMTP configured.
 */

import { mailFrom, smtpHost, smtpPass, smtpPort, smtpUser } from "@/lib/server/env";

export interface MailResult {
  delivered: boolean;
  transport: "smtp" | "console";
  error?: string;
}

export function mailConfigured(): boolean {
  return Boolean(smtpHost() && smtpUser() && smtpPass());
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<MailResult> {
  if (mailConfigured()) {
    try {
      const nodemailer = await import("nodemailer");
      const transport = nodemailer.createTransport({
        host: smtpHost(),
        port: smtpPort(),
        secure: smtpPort() === 465,
        auth: { user: smtpUser(), pass: smtpPass() },
      });
      await transport.sendMail({
        from: mailFrom() || smtpUser(),
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });
      return { delivered: true, transport: "smtp" };
    } catch (err) {
      console.error("[mail] SMTP send failed:", err);
      return {
        delivered: false,
        transport: "smtp",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
  // No SMTP: log so the operator can hand the link over manually.
  console.log(`[mail:console] To: ${opts.to}\nSubject: ${opts.subject}\n${opts.text}`);
  return { delivered: false, transport: "console" };
}
