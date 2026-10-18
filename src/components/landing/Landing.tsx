'use client';

/**
 * Landing.tsx, marketing page with a precision-tool look:
 * centered display hero over a masked dot grid, a large honest product
 * mockup (sample data from the demo inbox), a bento feature grid with
 * sample artifacts, a dark control section, numbered setup steps, FAQ,
 * a dark CTA panel, and a dark footer with legal links.
 * Copy contract: no vague claims, no fabricated metrics or testimonials,
 * no em dashes, no emoji, no decorative motion. Analysis sends review
 * text to the model provider, and that is stated plainly.
 */

import { useState } from "react";
import {
  LayoutGrid, Languages, ShieldCheck, Timer, KeyRound, ScrollText,
  ArrowRight, Check, X,
} from "lucide-react";
import { LogoMark, Stamp } from "@/components/shared/bits";

interface LandingProps {
  onSignup: () => void;
  onLogin: () => void;
  initialGoogleStatus?: string;
  initialGoogleMessage?: string;
}

const STEPS = [
  {
    num: "01",
    title: "Create an account",
    body: "Sign up with an email and password. Your workspace starts with a demo inbox of 15 sample reviews so you can try the desk immediately.",
  },
  {
    num: "02",
    title: "Add business details",
    body: "Name, category, sign-off, contact line, and which offers you allow. These details feed the reply rules that keep drafts safe.",
  },
  {
    num: "03",
    title: "Connect Google (optional)",
    body: "Connect with Google OAuth, paste an API key, or paste an access token. Skip this and the desk runs on the simulated inbox; nothing is sent anywhere.",
  },
  {
    num: "04",
    title: "Work the desk",
    body: "Analyze one review or the whole batch, edit drafts, approve with one click, and switch autopilot on when you trust it.",
  },
];

const FAQ = [
  {
    q: "Does this post replies to Google?",
    a: "Only if you connect an OAuth token and switch live posting on. By default every approved reply is recorded in your workspace so you can copy it by hand. The UI labels each reply as recorded or sent.",
  },
  {
    q: "Where does my API key go?",
    a: "It is encrypted with AES-256-GCM on the server and stored with your workspace. It is never returned to the browser after saving; you only see a masked hint.",
  },
  {
    q: "What happens to review text?",
    a: "Analysis sends the review text to the model provider to produce the decision and the draft. That is stated here and inside the app. Nothing is sent to Google unless you enable live posting.",
  },
  {
    q: "Does autopilot post replies by itself?",
    a: "Only after you switch it on, and even then a clean 5-star reply waits through your veto window first. Everything else queues for your approval, and a daily cap bounds the volume. Autopilot starts off.",
  },
  {
    q: "Which languages are supported?",
    a: "The desk replies in the reviewer's language and attaches a translation. The reply rules were hand-checked for Urdu, Roman Urdu, and English. For other languages, read the translation before posting.",
  },
];

const FACTS = [
  { value: "4", label: "decision lanes for every review" },
  { value: "15", label: "sample reviews in the demo inbox" },
  { value: "30-80", label: "word target for each draft" },
  { value: "AES-256", label: "encryption for stored credentials" },
];

const LANES = [
  { name: "Auto", desc: "Clean 5-star replies after your veto window" },
  { name: "Approval queue", desc: "Everything else waits for you" },
  { name: "Recorded", desc: "Approved and stored in your workspace" },
  { name: "Reported", desc: "Guidance for Google's report option" },
];

/* ------------------------------------------------------------------ */
/* Section header: numbered kicker + display title, description right */
/* ------------------------------------------------------------------ */
function SectionHead({
  num, title, desc, dark,
}: {
  num: string; title: string; desc?: string; dark?: boolean;
}) {
  return (
    <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-[560px]">
        <p className="rd-eyebrow-num mb-3" style={dark ? { color: "#93C5FD" } : undefined}>{num}</p>
        <h2
          className="rd-hero-display text-[clamp(1.75rem,3.2vw,2.5rem)]"
          style={dark ? { color: "#F9FAFB" } : undefined}
        >
          {title}
        </h2>
      </div>
      {desc && (
        <p
          className="max-w-[400px] text-sm leading-relaxed lg:pb-1 lg:text-right"
          style={{ color: dark ? "rgba(249,250,251,0.72)" : "#6B7280" }}
        >
          {desc}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Product mockup: the desk, with sample data from the demo inbox.    */
/* Decorative and aria-hidden; the caption below it is the real text. */
/* ------------------------------------------------------------------ */
function ProductMockup() {
  const inboxRows = [
    { stars: 5, text: "Great biryani and quick service. Will come again!", stamp: "reply" },
    { stars: 2, text: "Biryani was cold when it arrived. Very disappointed.", stamp: "reply", selected: true },
    { stars: 4, text: "Best karahi in town. Ahmed took care of us.", stamp: "reply_needs_owner" },
    { stars: 1, text: "WIN FREE COUPONS, click the link in my profile now.", stamp: "report" },
  ];
  return (
    <div className="rd-window-xl rd-shadow-float overflow-hidden text-left">
      {/* browser chrome */}
      <div className="flex items-center gap-3 border-b border-[#E5E7EB] bg-[#FAFAFA] px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#D1D5DB]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#D1D5DB]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#D1D5DB]" />
        </div>
        <div className="rounded-md border border-[#E5E7EB] bg-white px-4 py-1 font-mono text-[0.7rem] text-[#6B7280]">
          reviewdesk.app/desk
        </div>
        <span className="w-10" />
      </div>
      {/* app bar */}
      <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] px-4 py-2">
        <div className="flex items-center gap-2">
          <LogoMark size={18} />
          <span className="text-sm font-semibold tracking-[-0.01em] text-[#111827]">ReviewDesk</span>
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          {["Desk", "Autopilot", "Ledger", "Settings"].map((t, i) => (
            <span
              key={t}
              className={
                i === 0
                  ? "rounded-md bg-[#F6F7F9] px-2.5 py-1 font-mono text-[0.68rem] font-bold uppercase tracking-[0.04em] text-[#111827]"
                  : "px-2.5 py-1 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-[#9CA3AF]"
              }
            >
              {t}
            </span>
          ))}
        </div>
        <span className="rd-chip">Demo workspace</span>
      </div>
      {/* body */}
      <div className="grid lg:grid-cols-[210px_minmax(0,1fr)_225px]">
        {/* inbox rail */}
        <div className="hidden border-r border-[#E5E7EB] lg:block">
          <p className="rd-kicker px-4 pb-2 pt-4">Inbox · demo</p>
          <div className="divide-y divide-[#E5E7EB] border-t border-[#E5E7EB]">
            {inboxRows.map((r, i) => (
              <div key={i} className={r.selected ? "border-l-2 border-[#1D4ED8] bg-[#F6F7F9] px-3.5 py-3" : "border-l-2 border-transparent px-3.5 py-3"}>
                <div className="flex items-center justify-between gap-2">
                  <StarsSmall n={r.stars} />
                  <Stamp action={r.stamp} />
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-[#374151]">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
        {/* center: selected review + draft */}
        <div className="min-w-0 space-y-4 p-5">
          <div className="rd-inset p-4">
            <div className="flex items-center justify-between gap-3">
              <StarsSmall n={2} />
              <span className="rd-mono">Demo Reviewer · 2026-10-17</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#374151]">
              Biryani was cold when it arrived. Very disappointed, the food is usually good.
            </p>
          </div>
          <div className="rd-banner rd-banner-check">
            <Stamp action="reply_needs_owner" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[#111827]">Worth replying once the owner checks the facts.</p>
              <p className="mt-1 text-xs leading-relaxed text-[#374151]">
                A real complaint, not spam. The draft acknowledges it and offers no compensation you did not allow.
              </p>
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="rd-kicker">Draft reply · English</span>
              <span className="rd-mono" style={{ color: "#15803D" }}>34 words · on target</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap rounded-lg border border-[#D1D5DB] bg-white p-3.5 text-sm leading-relaxed text-[#111827]">
              We are sorry the biryani reached you cold. That is not how we want food to leave our kitchen. Send us your order details and we will make it right on your next visit. Imran, Spice Corner
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rd-btn-green inline-flex px-4 py-2 text-sm">Approve and record</span>
            <span className="rd-btn-ghost inline-flex px-4 py-2 text-sm">Edit draft</span>
            <span className="rd-btn-ghost inline-flex px-4 py-2 text-sm">Dismiss</span>
          </div>
        </div>
        {/* policy rail */}
        <div className="hidden space-y-5 border-l border-[#E5E7EB] bg-[#FAFAFA] p-4 lg:block">
          <div>
            <p className="rd-kicker mb-2.5">Reply policy</p>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-[#6B7280]">Sign-off</dt>
                <dd className="font-medium text-[#111827]">Imran, Spice Corner</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#6B7280]">Offers allowed</dt>
                <dd className="font-medium text-[#111827]">None</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#6B7280]">Mixed sentiment</dt>
                <dd className="font-medium text-[#111827]">Waits for owner</dd>
              </div>
            </dl>
          </div>
          <div className="border-t border-[#E5E7EB] pt-4">
            <p className="rd-kicker mb-2.5">Autopilot</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rd-chip">Off by default</span>
              <span className="rd-chip">Daily cap · 10</span>
              <span className="rd-veto">veto 29:41</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StarsSmall({ n }: { n: number }) {
  return (
    <span className="rd-stars text-[11px] tracking-[1px]" aria-hidden="true">
      {"★".repeat(n)}
      <span className="opacity-30">{"★".repeat(5 - n)}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Feature card visuals (sample artifacts, all labeled as samples)    */
/* ------------------------------------------------------------------ */
function LanguageVisual() {
  return (
    <div className="rd-inset mt-5 space-y-3 p-4">
      <div>
        <p className="rd-mono mb-1">Review · Roman Urdu</p>
        <p className="text-sm text-[#111827]">Biryani zabardast thi, service bhi achi.</p>
      </div>
      <div className="border-t border-[#E5E7EB] pt-3">
        <p className="rd-mono mb-1">Draft · Roman Urdu</p>
        <p className="text-sm text-[#111827]">Shukriya! Khushi hui ke sab pasand aaya. Dobarah tashreef layen. Imran, Spice Corner</p>
      </div>
      <div className="border-t border-[#E5E7EB] pt-3">
        <p className="rd-mono mb-1">Owner copy · English</p>
        <p className="text-sm italic text-[#374151]">Thank you! Glad everything hit the spot. Please come again. Imran, Spice Corner</p>
      </div>
    </div>
  );
}

function PolicyVisual() {
  const rules = [
    "No phone numbers you did not add",
    "No staff names unless you listed them",
    "No offers you did not allow",
  ];
  return (
    <ul className="rd-inset mt-5 space-y-2.5 p-4">
      {rules.map((r) => (
        <li key={r} className="flex items-center gap-2.5 text-sm text-[#374151]">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#E5E7EB] bg-white text-[#6B7280]">
            <X size={12} aria-hidden="true" />
          </span>
          {r}
        </li>
      ))}
    </ul>
  );
}

function AutopilotVisual() {
  return (
    <div className="rd-inset mt-5 flex flex-wrap items-center gap-2 p-4">
      <span className="rd-veto">veto 29:41</span>
      <span className="rd-chip">Daily cap · 10 replies</span>
      <span className="rd-chip">Mixed sentiment · queue</span>
      <span className="rd-mono w-full pt-1">Sample policy. Autopilot starts off.</span>
    </div>
  );
}

function CredentialVisual() {
  return (
    <div className="rd-inset mt-5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="rd-mono mb-1">GBP · API key</p>
          <p className="font-mono text-sm tracking-[0.08em] text-[#111827]">•••• •••• •••• 7890</p>
        </div>
        <span className="rd-chip">AES-256-GCM</span>
      </div>
      <p className="rd-mono mt-3 border-t border-[#E5E7EB] pt-2.5">
        Never returned to the browser after saving. Masked hint only.
      </p>
    </div>
  );
}

function LedgerVisual() {
  const rows = [
    { t: "14:02", a: "approve", d: "Reply recorded in workspace" },
    { t: "13:47", a: "veto", d: "Autopilot draft stopped by owner" },
    { t: "13:31", a: "analyze", d: "5-star review triaged to auto lane" },
  ];
  return (
    <div className="rd-inset mt-5 p-4">
      {rows.map((r) => (
        <div key={r.t} className="flex gap-3 border-b border-[#E5E7EB] py-2 font-mono text-xs last:border-b-0 last:pb-0 first:pt-0">
          <span className="w-10 shrink-0 text-[#9CA3AF]">{r.t}</span>
          <span className="w-14 shrink-0 font-semibold text-[#1D4ED8]">{r.a}</span>
          <span className="text-[#374151]">{r.d}</span>
        </div>
      ))}
    </div>
  );
}

function HonestyVisual() {
  const items = [
    "Nothing is posted to Google unless you connect Google and switch live posting on.",
    "Recorded and sent are two different labels, and the interface never mixes them.",
    "Analyzing a review sends its text to the model provider, stated here and inside the app.",
    "Autopilot starts off, and a daily cap bounds everything it records.",
  ];
  return (
    <ul className="mt-5 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#374151]">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]">
            <Check size={12} strokeWidth={3} aria-hidden="true" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function Landing({ onSignup, onLogin, initialGoogleStatus, initialGoogleMessage }: LandingProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const googleNotice = initialGoogleStatus === "connected"
    ? { ok: true, text: "Google connected. Your reviews can now be fetched from your chosen location in Settings." }
    : initialGoogleStatus === "unconfigured"
      ? { ok: false, text: "Google sign-in is not configured on this deployment yet. The admin needs to set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." }
      : initialGoogleStatus === "signin"
        ? { ok: false, text: "Please sign in first, then connect Google from Settings or onboarding." }
        : initialGoogleStatus === "error"
          ? { ok: false, text: `Google connection failed: ${initialGoogleMessage ?? "unknown error"}` }
          : null;

  return (
    <div className="flex min-h-screen flex-col">
      {googleNotice && (
        <div className="px-5 pt-4">
          <div
            className="mx-auto max-w-[1120px] rounded-lg p-3.5 text-sm"
            style={{
              background: googleNotice.ok ? "#ECFDF3" : "#FBF3D9",
              border: `1px solid ${googleNotice.ok ? "#15803D" : "#854D0E"}`,
              color: googleNotice.ok ? "#166534" : "#854D0E",
            }}
            role="status"
          >
            {googleNotice.text}
          </div>
        </div>
      )}

      {/* ===================== Nav ===================== */}
      <nav className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="rd-display text-lg">ReviewDesk</span>
          </div>
          <div className="hidden items-center gap-7 md:flex">
            <a href="#features" className="text-sm font-medium text-[#374151] hover:text-[#111827]">Features</a>
            <a href="#control" className="text-sm font-medium text-[#374151] hover:text-[#111827]">Control</a>
            <a href="#setup" className="text-sm font-medium text-[#374151] hover:text-[#111827]">Setup</a>
            <a href="#faq" className="text-sm font-medium text-[#374151] hover:text-[#111827]">FAQ</a>
            <span className="h-5 w-px bg-[#E5E7EB]" aria-hidden="true" />
            <button onClick={onLogin} className="text-sm font-semibold text-[#111827] hover:text-[#1D4ED8]">Sign in</button>
            <button onClick={onSignup} className="rd-btn-ink px-4 py-2.5 text-sm min-h-[44px]">Create account</button>
          </div>
          <button
            className="flex h-11 w-11 items-center justify-center md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? <path d="M4 4l12 12M16 4L4 16" /> : <path d="M3 5h14M3 10h14M3 15h14" />}
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div className="border-b border-[#E5E7EB] bg-white px-6 py-4 md:hidden">
            <div className="flex flex-col gap-3">
              <a href="#features" onClick={() => setMenuOpen(false)} className="flex min-h-[44px] items-center text-sm font-medium">Features</a>
              <a href="#control" onClick={() => setMenuOpen(false)} className="flex min-h-[44px] items-center text-sm font-medium">Control</a>
              <a href="#setup" onClick={() => setMenuOpen(false)} className="flex min-h-[44px] items-center text-sm font-medium">Setup</a>
              <a href="#faq" onClick={() => setMenuOpen(false)} className="flex min-h-[44px] items-center text-sm font-medium">FAQ</a>
              <button onClick={onLogin} className="rd-btn-ghost px-4 py-2.5 text-sm">Sign in</button>
              <button onClick={onSignup} className="rd-btn-ink px-4 py-2.5 text-sm">Create account</button>
            </div>
          </div>
        )}
      </nav>

      {/* ===================== Hero ===================== */}
      <header className="relative overflow-hidden bg-white">
        <div className="rd-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1120px] px-6 pb-16 pt-16 md:pb-20 md:pt-24">
          <div className="mx-auto max-w-[820px] text-center">
            <span className="rd-chip-outline">Review triage for Google Business profiles</span>
            <h1 className="rd-hero-display mt-7 text-[clamp(2.5rem,5.5vw,4rem)]">
              The reply desk for your Google reviews
            </h1>
            <p className="mx-auto mt-6 max-w-[680px] text-pretty text-lg leading-[1.7] text-[#374151]">
              ReviewDesk triages every review into a lane, drafts a policy-checked reply in the
              reviewer&apos;s language, and waits for your approval before anything is recorded.
              Connect Google when you are ready, or start with the demo inbox.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={onSignup}
                className="inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-[#111827] px-6 py-3 text-base font-semibold text-white hover:bg-[#1F2937]"
              >
                Create an account <ArrowRight size={18} aria-hidden="true" />
              </button>
              <a href="#setup" className="rd-btn-ghost inline-flex min-h-[48px] items-center px-6 py-3 text-base">
                See how it works
              </a>
            </div>
            <p className="rd-mono mt-7">
              15 sample reviews included · No credit card · Credentials encrypted with AES-256
            </p>
          </div>

          <div className="mt-14 md:mt-16" aria-hidden="true">
            <ProductMockup />
          </div>
          <p className="rd-mono mt-4 text-center">
            Sample data from the demo inbox that ships with every account. Nothing shown was sent to Google.
          </p>
        </div>
      </header>

      {/* ===================== Facts strip ===================== */}
      <section className="border-y border-[#E5E7EB] bg-[#FAFAFA]">
        <div className="mx-auto grid max-w-[1120px] grid-cols-2 gap-px lg:grid-cols-4" style={{ background: "#E5E7EB" }}>
          {FACTS.map((s) => (
            <div key={s.label} className="px-6 py-9" style={{ background: "#FAFAFA" }}>
              <div className="rd-num text-[2rem] text-[#111827]">{s.value}</div>
              <p className="mt-1.5 max-w-[200px] text-sm leading-snug text-[#6B7280]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== Features (bento) ===================== */}
      <section id="features" className="scroll-mt-20 bg-white py-20 md:py-24">
        <div className="mx-auto max-w-[1120px] px-6">
          <SectionHead
            num="01 · Features"
            title="A safety editor for public replies"
            desc="Six things the desk handles on every review, from the first sort to the audit trail. The model suggests; the policy and you decide."
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Four lanes, wide card with lane visual */}
            <article className="rd-card rd-card-hover p-6 md:col-span-2">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F6F7F9] text-[#374151]">
                <LayoutGrid size={20} aria-hidden="true" />
              </div>
              <h3 className="rd-display mb-2 text-lg">Four lanes for every review</h3>
              <p className="max-w-[520px] text-sm leading-relaxed text-[#374151]">
                Each review lands in one lane, and the lane decides what happens next. Reviews that
                need human judgment surface first, and a real complaint is never treated as spam.
              </p>
              <div className="rd-inset mt-5 grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2">
                {LANES.map((l, i) => (
                  <div key={l.name} className="flex gap-3">
                    <span className="rd-mono pt-0.5" style={{ color: "#1D4ED8" }}>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{l.name}</p>
                      <p className="text-xs leading-snug text-[#6B7280]">{l.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            {/* Language matching with sample artifact */}
            <article className="rd-card rd-card-hover p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F6F7F9] text-[#374151]">
                <Languages size={20} aria-hidden="true" />
              </div>
              <h3 className="rd-display mb-2 text-lg">Drafts in the reviewer&apos;s language</h3>
              <p className="text-sm leading-relaxed text-[#374151]">
                Every draft ships with a copy in your language, so you know exactly what it says
                before you approve it.
              </p>
              <LanguageVisual />
            </article>

            {/* Policy checks */}
            <article className="rd-card rd-card-hover p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F6F7F9] text-[#374151]">
                <ShieldCheck size={20} aria-hidden="true" />
              </div>
              <h3 className="rd-display mb-2 text-lg">Policy-checked drafts</h3>
              <p className="text-sm leading-relaxed text-[#374151]">
                The model suggests, the policy decides. Drafts cannot invent details you did not
                allow, and mixed-sentiment reviews wait for you by default.
              </p>
              <PolicyVisual />
            </article>

            {/* Autopilot */}
            <article className="rd-card rd-card-hover p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F6F7F9] text-[#374151]">
                <Timer size={20} aria-hidden="true" />
              </div>
              <h3 className="rd-display mb-2 text-lg">Autopilot with a veto window</h3>
              <p className="text-sm leading-relaxed text-[#374151]">
                Clean 5-star replies can go out automatically after a countdown you set. Veto any
                draft, undo anything, and a daily cap keeps volume predictable.
              </p>
              <AutopilotVisual />
            </article>

            {/* Credentials */}
            <article className="rd-card rd-card-hover p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F6F7F9] text-[#374151]">
                <KeyRound size={20} aria-hidden="true" />
              </div>
              <h3 className="rd-display mb-2 text-lg">Your own Google connection</h3>
              <p className="text-sm leading-relaxed text-[#374151]">
                Connect with Google OAuth, or paste an API key or access token. Without a
                connection, the demo inbox still works.
              </p>
              <CredentialVisual />
            </article>

            {/* Honesty card, wide */}
            <article className="rd-card rd-card-hover p-6 md:col-span-2">
              <h3 className="rd-display mb-2 text-lg">What the desk does not claim</h3>
              <p className="max-w-[520px] text-sm leading-relaxed text-[#374151]">
                Trust comes from specifics, so here is exactly where the line sits.
              </p>
              <HonestyVisual />
            </article>

            {/* Audit ledger */}
            <article className="rd-card rd-card-hover p-6">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E5E7EB] bg-[#F6F7F9] text-[#374151]">
                <ScrollText size={20} aria-hidden="true" />
              </div>
              <h3 className="rd-display mb-2 text-lg">Audit ledger</h3>
              <p className="text-sm leading-relaxed text-[#374151]">
                Every decision, approval, veto, and undo is written down with the reason attached.
              </p>
              <LedgerVisual />
            </article>
          </div>
        </div>
      </section>

      {/* ===================== Control (dark) ===================== */}
      <section id="control" className="scroll-mt-20 bg-[#111827]">
        <div className="relative overflow-hidden">
          <div className="rd-grid-dark pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="relative mx-auto max-w-[1120px] px-6 py-20 md:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <SectionHead
                  num="02 · Control"
                  title="Nothing goes out without a human decision"
                  dark
                />
                <div className="border-t border-[#374151]">
                  {[
                    {
                      n: "01", t: "Draft",
                      d: "The model writes a reply in the reviewer's language and attaches a translation for you.",
                      m: "30-80 word target",
                    },
                    {
                      n: "02", t: "Decide",
                      d: "Approve, edit, veto, or report. Mixed-sentiment reviews always wait for a human.",
                      m: "veto window you set",
                    },
                    {
                      n: "03", t: "Ledger",
                      d: "Every decision is written down with its reason, so the desk can always explain itself.",
                      m: "who, what, why",
                    },
                  ].map((row, i) => (
                    <div key={row.n} className={`flex gap-6 py-6 ${i > 0 ? "border-t border-[#374151]" : ""}`}>
                      <span className="font-mono text-sm font-bold" style={{ color: "#93C5FD" }}>{row.n}</span>
                      <div>
                        <p className="text-base font-semibold" style={{ color: "#F9FAFB" }}>{row.t}</p>
                        <p className="mt-1 text-sm leading-relaxed" style={{ color: "rgba(249,250,251,0.72)" }}>{row.d}</p>
                        <p className="rd-mono mt-2" style={{ color: "rgba(249,250,251,0.55)" }}>{row.m}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* dark ledger card */}
              <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-5" aria-hidden="true">
                <div className="flex items-center justify-between border-b border-[#374151] pb-3">
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.08em]" style={{ color: "rgba(249,250,251,0.72)" }}>
                    Audit ledger
                  </p>
                  <span className="font-mono text-xs" style={{ color: "rgba(249,250,251,0.55)" }}>sample entries</span>
                </div>
                {[
                  { t: "14:02", a: "approve", d: "Reply recorded in workspace" },
                  { t: "13:47", a: "veto", d: "Autopilot draft stopped by owner" },
                  { t: "13:31", a: "analyze", d: "5-star review triaged to auto lane" },
                  { t: "13:12", a: "undo", d: "Recorded reply returned to queue" },
                ].map((r) => (
                  <div key={r.t + r.a} className="flex gap-3 border-b border-[#374151] py-3 font-mono text-xs last:border-b-0">
                    <span className="w-10 shrink-0" style={{ color: "rgba(249,250,251,0.55)" }}>{r.t}</span>
                    <span className="w-16 shrink-0 font-bold" style={{ color: "#93C5FD" }}>{r.a}</span>
                    <span style={{ color: "rgba(249,250,251,0.82)" }}>{r.d}</span>
                  </div>
                ))}
                <p className="mt-4 font-mono text-xs" style={{ color: "rgba(249,250,251,0.55)" }}>
                  Every entry carries the reason and the actor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== Setup steps ===================== */}
      <section id="setup" className="scroll-mt-20 bg-[#FAFAFA] py-20 md:py-24">
        <div className="mx-auto max-w-[1120px] px-6">
          <SectionHead
            num="03 · Setup"
            title="Four steps from signup to a working desk"
            desc="The demo inbox means the desk is usable on day one. The Google connection is optional and can wait."
          />
          <div className="grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <article key={s.num} className="border-t border-[#D1D5DB] pt-6">
                <div className="rd-num mb-3 text-2xl" style={{ color: "#1D4ED8" }}>{s.num}</div>
                <h3 className="rd-display mb-2 text-base">{s.title}</h3>
                <p className="text-sm leading-relaxed text-[#374151]">{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== FAQ ===================== */}
      <section id="faq" className="scroll-mt-20 bg-white py-20 md:py-24">
        <div className="mx-auto max-w-[1120px] px-6">
          <SectionHead num="04 · FAQ" title="Straight answers" />
          <div className="max-w-[760px] space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="rd-card overflow-hidden">
                <button
                  className="flex w-full items-center justify-between gap-4 p-5 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  <span className="rd-display text-base">{item.q}</span>
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#E5E7EB] text-sm font-semibold text-[#374151]"
                    aria-hidden="true"
                  >
                    {openFaq === i ? "-" : "+"}
                  </span>
                </button>
                {openFaq === i && (
                  <p className="border-t border-[#E5E7EB] p-5 text-sm leading-relaxed text-[#374151]">
                    {item.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="bg-white pb-20">
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="relative overflow-hidden rounded-[14px] bg-[#111827] px-6 py-16 text-center md:py-20">
            <div className="rd-grid-dark pointer-events-none absolute inset-0" aria-hidden="true" />
            <div className="relative">
              <h2 className="rd-hero-display mx-auto max-w-[560px] text-[clamp(1.75rem,3.2vw,2.5rem)]" style={{ color: "#F9FAFB" }}>
                Create an account and try the demo inbox
              </h2>
              <p className="mx-auto mt-4 max-w-[480px] text-base leading-relaxed" style={{ color: "rgba(249,250,251,0.72)" }}>
                Sign up, add your business details, and analyze the 15 sample reviews. Connect
                Google whenever you are ready.
              </p>
              <button
                onClick={onSignup}
                className="mt-8 inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-semibold text-[#111827] hover:bg-[#F6F7F9]"
              >
                Create an account <ArrowRight size={18} aria-hidden="true" />
              </button>
              <p className="rd-mono mt-6" style={{ color: "rgba(249,250,251,0.55)" }}>
                No credit card · Demo inbox included · Your data stays on this server
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== Footer ===================== */}
      <footer className="border-t border-[#374151] bg-[#111827] mt-auto">
        <div className="mx-auto max-w-[1120px] px-6 py-12">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <LogoMark size={22} />
                <span className="rd-display text-base" style={{ color: "#F9FAFB" }}>ReviewDesk</span>
              </div>
              <p className="mt-3 max-w-[260px] text-sm leading-relaxed" style={{ color: "rgba(249,250,251,0.72)" }}>
                Review triage and reply drafts for Google Business profiles. The final word is
                always yours.
              </p>
            </div>
            <div>
              <p className="rd-kicker mb-3" style={{ color: "rgba(249,250,251,0.6)" }}>Product</p>
              <ul className="space-y-2 text-sm" style={{ color: "rgba(249,250,251,0.82)" }}>
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#control" className="hover:text-white">Control</a></li>
                <li><a href="#setup" className="hover:text-white">Setup</a></li>
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
              </ul>
            </div>
            <div>
              <p className="rd-kicker mb-3" style={{ color: "rgba(249,250,251,0.6)" }}>Account</p>
              <ul className="space-y-2 text-sm" style={{ color: "rgba(249,250,251,0.82)" }}>
                <li><button onClick={onSignup} className="hover:text-white">Create account</button></li>
                <li><button onClick={onLogin} className="hover:text-white">Sign in</button></li>
              </ul>
            </div>
            <div>
              <p className="rd-kicker mb-3" style={{ color: "rgba(249,250,251,0.6)" }}>Legal</p>
              <ul className="space-y-2 text-sm" style={{ color: "rgba(249,250,251,0.82)" }}>
                <li><a href="/privacy" className="hover:text-white">Privacy policy</a></li>
                <li><a href="/terms" className="hover:text-white">Terms and conditions</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#374151] pt-6">
            <p className="font-mono text-[0.75rem]" style={{ color: "rgba(249,250,251,0.55)" }}>
              © 2026 ReviewDesk
            </p>
            <p className="font-mono text-[0.75rem]" style={{ color: "rgba(249,250,251,0.55)" }}>
              Approved replies are recorded, not sent, until you connect Google yourself
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

