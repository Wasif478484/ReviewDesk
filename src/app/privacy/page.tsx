import LegalShell, { Section, Bullets } from "@/components/legal/LegalShell";

export const metadata = {
  title: "Privacy policy | ReviewDesk",
  description:
    "What ReviewDesk collects, what leaves the server, how credentials are protected, and how to get data deleted.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy policy" updated="October 18, 2026">
      <Section heading="Who this applies to">
        <p>
          This policy covers this ReviewDesk deployment. ReviewDesk is software that the operator of
          this site runs on their own server; the operator is the administrator who deployed it and
          is the data controller for accounts created here. This policy describes exactly what the
          software stores, what leaves the server, and what stays local.
        </p>
      </Section>

      <Section heading="What we collect">
        <p>
          When you create an account and use the desk, the following is stored in the app database:
        </p>
        <Bullets
          items={[
            "Account data: your name, email address, and a password. Passwords are hashed with bcrypt and never stored in readable form.",
            "Business profile: business name, category, owner name, reply sign-off, contact line, offers you allow in replies, and an optional description of the business.",
            "Reviews: reviews fetched from Google through your own connection, reviews imported from a CSV file, and the fictional sample reviews that ship with the demo inbox.",
            "Triage results: the lane a review was assigned to, drafted replies, translations, sentiment, and the reasons recorded for each decision.",
            "Audit events: every approval, veto, undo, and setting change, with the reason attached.",
            "Google credentials: if you connect Google, your API key or OAuth token and the location id you choose. These are encrypted with AES-256-GCM before storage and are never returned to the browser; you only see a masked hint.",
          ]}
        />
      </Section>

      <Section heading="What leaves the server">
        <Bullets
          items={[
            "Review text: when you analyze a review, the review text and your business profile are sent to the model provider (Z.ai) to produce the triage decision and the draft reply. This is stated here and inside the app.",
            "Google: nothing is sent to Google unless you connect your own OAuth credentials and explicitly switch live posting on. With live posting enabled, replies you approve are posted through the Google Business Profile API. Without it, approved replies are only recorded inside your workspace and labeled as recorded.",
            "Email: verification and password reset emails are sent through the SMTP server the operator configured. If SMTP is not configured, the app shows one-time links directly in the interface and logs them on the server; this mode is intended for development only.",
          ]}
        />
      </Section>

      <Section heading="Cookies and tracking">
        <p>
          The app sets a single httpOnly session cookie containing a signed JWT so you stay signed
          in. There is no analytics, no advertising, no fingerprinting, and no third-party tracking
          of any kind.
        </p>
      </Section>

      <Section heading="Where data lives">
        <p>
          Everything is stored in a SQLite database on the server this deployment runs on.
          Encryption keys for credentials are held in server-side environment variables and are not
          accessible from the browser.
        </p>
      </Section>

      <Section heading="Security">
        <Bullets
          items={[
            "Passwords are hashed with bcrypt.",
            "Google credentials are encrypted at rest with AES-256-GCM.",
            "Sessions use signed JWTs in httpOnly cookies.",
            "Model provider and Google calls are made server-side only; your keys are never exposed to the browser.",
          ]}
        />
        <p>
          No system is perfectly secure. If you believe an account here has been compromised,
          contact the operator and change your password immediately.
        </p>
      </Section>

      <Section heading="Retention and deletion">
        <p>
          Your data is kept while your account exists. You can delete individual reviews from the
          desk, disconnect Google at any time from Settings, and keep autopilot off. To delete your
          account and everything attached to it, contact the operator of this deployment; the
          administrator can remove your rows from the database.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          ReviewDesk is a business tool and is not directed at children under 16. Accounts created
          for people under 16 violate these terms.
        </p>
      </Section>

      <Section heading="Changes to this policy">
        <p>
          If the software or the operator changes what data is handled, the updated policy will be
          posted on this page with a new date. Material changes will be announced in the app before
          they take effect.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          For privacy questions or deletion requests, contact the administrator who operates this
          deployment. Their contact details are the ones they publish for this site.
        </p>
      </Section>
    </LegalShell>
  );
}
