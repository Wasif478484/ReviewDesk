'use client';

/**
 * Landing.tsx, marketing page built on the daisyUI component system
 * (btn, badge, card, steps, collapse, alert, footer) with three
 * Originkit patterns (SkewInText entrance, LabelSlideButton CTA,
 * SpotlightText section title).
 * Centered display hero over a masked dot grid, a large honest product
 * mockup (sample data from the demo inbox), a bento feature grid with
 * sample artifacts, a dark control section, setup steps, FAQ, a dark
 * CTA panel, and a dark footer with legal links.
 * Copy contract: no vague claims, no fabricated metrics or testimonials,
 * no em dashes, no emoji, no scroll-driven motion. Analysis sends review
 * text to the model provider, and that is stated plainly.
 */

import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutGrid, Languages, ShieldCheck, Timer, KeyRound, ScrollText,
  ArrowRight, Check, X,
} from "lucide-react";
import { LogoMark, Stamp } from "@/components/shared/bits";
import SkewInText from "@/components/originkit/SkewInText";
import LabelSlideButton from "@/components/originkit/LabelSlideButton";
import SpotlightText from "@/components/originkit/SpotlightText";
import Reveal from "@/components/effects/Reveal";
import CountUp from "@/components/effects/CountUp";
import GlowCard from "@/components/effects/GlowCard";
import Marquee from "@/components/effects/Marquee";

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
  num: string; title: ReactNode; desc?: string; dark?: boolean;
}) {
  return (
    <Reveal className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-[560px]">
        <p className={`rd-eyebrow-num mb-3 ${dark ? "" : "rd-gradient-text"}`} style={dark ? { color: "#93C5FD" } : undefined}>{num}</p>
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
    </Reveal>
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
      <div className="flex items-center gap-3 border-b border-base-300 bg-base-200 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-base-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-base-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-base-300" />
        </div>
        <div className="rounded-md border border-base-300 bg-base-100 px-4 py-1 font-mono text-[0.7rem] text-[#6B7280]">
          reviewdesk.app/desk
        </div>
        <span className="w-10" />
      </div>
      {/* app bar */}
      <div className="flex items-center justify-between gap-3 border-b border-base-300 px-4 py-2">
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
                  ? "rounded-md bg-base-200 px-2.5 py-1 font-mono text-[0.68rem] font-bold uppercase tracking-[0.04em] text-[#111827]"
                  : "px-2.5 py-1 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.04em] text-[#9CA3AF]"
              }
            >
              {t}
            </span>
          ))}
        </div>
        <span className="badge badge-outline font-mono">Demo workspace</span>
      </div>
      {/* body */}
      <div className="grid lg:grid-cols-[210px_minmax(0,1fr)_225px]">
        {/* inbox rail */}
        <div className="hidden border-r border-base-300 lg:block">
          <p className="rd-kicker px-4 pb-2 pt-4">Inbox · demo</p>
          <div className="divide-y divide-base-300 border-t border-base-300">
            {inboxRows.map((r, i) => (
              <div key={i} className={r.selected ? "border-l-2 border-primary bg-base-200 px-3.5 py-3" : "border-l-2 border-transparent px-3.5 py-3"}>
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
          <div className="rounded-box border border-base-300 bg-base-200 p-4">
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
            <p className="mt-2 whitespace-pre-wrap rounded-lg border border-base-300 bg-base-100 p-3.5 text-sm leading-relaxed text-[#111827]">
              We are sorry the biryani reached you cold. That is not how we want food to leave our kitchen. Send us your order details and we will make it right on your next visit. Imran, Spice Corner
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="btn btn-primary btn-sm pointer-events-none">Approve and record</span>
            <span className="btn btn-outline btn-sm pointer-events-none">Edit draft</span>
            <span className="btn btn-outline btn-sm pointer-events-none">Dismiss</span>
          </div>
        </div>
        {/* policy rail */}
        <div className="hidden space-y-5 border-l border-base-300 bg-base-200 p-4 lg:block">
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
          <div className="border-t border-base-300 pt-4">
            <p className="rd-kicker mb-2.5">Autopilot</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="badge badge-outline font-mono">Off by default</span>
              <span className="badge badge-outline font-mono">Daily cap · 10</span>
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
    <div className="rounded-box border border-base-300 bg-base-200 mt-5 space-y-3 p-4">
      <div>
        <p className="rd-mono mb-1">Review · Roman Urdu</p>
        <p className="text-sm text-[#111827]">Biryani zabardast thi, service bhi achi.</p>
      </div>
      <div className="border-t border-base-300 pt-3">
        <p className="rd-mono mb-1">Draft · Roman Urdu</p>
        <p className="text-sm text-[#111827]">Shukriya! Khushi hui ke sab pasand aaya. Dobarah tashreef layen. Imran, Spice Corner</p>
      </div>
      <div className="border-t border-base-300 pt-3">
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
    <ul className="rounded-box border border-base-300 bg-base-200 mt-5 space-y-2.5 p-4">
      {rules.map((r) => (
        <li key={r} className="flex items-center gap-2.5 text-sm text-[#374151]">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-base-300 bg-base-100 text-[#6B7280]">
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
    <div className="rounded-box border border-base-300 bg-base-200 mt-5 flex flex-wrap items-center gap-2 p-4">
      <span className="rd-veto">veto 29:41</span>
      <span className="badge badge-outline font-mono">Daily cap · 10 replies</span>
      <span className="badge badge-outline font-mono">Mixed sentiment · queue</span>
      <span className="rd-mono w-full pt-1">Sample policy. Autopilot starts off.</span>
    </div>
  );
}

function CredentialVisual() {
  return (
    <div className="rounded-box border border-base-300 bg-base-200 mt-5 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="rd-mono mb-1">GBP · API key</p>
          <p className="font-mono text-sm tracking-[0.08em] text-[#111827]">•••• •••• •••• 7890</p>
        </div>
        <span className="badge badge-outline font-mono">AES-256-GCM</span>
      </div>
      <p className="rd-mono mt-3 border-t border-base-300 pt-2.5">
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
    <div className="rounded-box border border-base-300 bg-base-200 mt-5 p-4">
      {rows.map((r) => (
        <div key={r.t} className="flex gap-3 border-b border-base-300 py-2 font-mono text-xs last:border-b-0 last:pb-0 first:pt-0">
          <span className="w-10 shrink-0 text-[#9CA3AF]">{r.t}</span>
          <span className="w-14 shrink-0 font-semibold text-primary">{r.a}</span>
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
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-base-300 bg-base-100 text-primary">
            <Check size={12} strokeWidth={3} aria-hidden="true" />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function Landing({ onSignup, onLogin, initialGoogleStatus, initialGoogleMessage }: LandingProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // The nav gains a soft shadow once the page scrolls under it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const googleNotice = initialGoogleStatus === "connected"
    ? { ok: true, text: "Google connected. Your reviews can now be fetched from your chosen location in Settings." }
    : initialGoogleStatus === "unconfigured"
      ? { ok: false, text: "Google sign-in is not configured on this deployment yet. The admin needs to set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." }
      : initialGoogleStatus === "signin"
        ? { ok: false, text: "Please sign in first, then connect Google from Settings or onboarding." }
        : initialGoogleStatus === "error"
          ? { ok: false, text: `Google connection failed: ${initialGoogleMessage ?? "unknown error"}` }
          : null;

  const navLinks = [
    ["#features", "Features"],
    ["#control", "Control"],
    ["#setup", "Setup"],
    ["#faq", "FAQ"],
  ] as const;

  return (
    <div className="flex min-h-screen flex-col">
      <div className="rd-progress" aria-hidden="true" />
      {googleNotice && (
        <div className="px-5 pt-4">
          <div
            className={`alert mx-auto max-w-[1120px] ${googleNotice.ok ? "alert-success" : "alert-warning"}`}
            role="status"
          >
            <span className="text-sm">{googleNotice.text}</span>
          </div>
        </div>
      )}

      {/* ===================== Nav ===================== */}
      <nav data-scrolled={scrolled} className="rd-nav sticky top-0 z-40 border-b border-base-300 bg-base-100/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <span className="rd-display text-lg">ReviewDesk</span>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            {navLinks.map(([href, label]) => (
              <a key={href} href={href} className="btn btn-ghost btn-sm">{label}</a>
            ))}
            <span className="mx-1 h-5 w-px bg-base-300" aria-hidden="true" />
            <button onClick={onLogin} className="btn btn-ghost btn-sm">Sign in</button>
            <button onClick={onSignup} className="btn btn-neutral btn-sm min-h-[40px]">Create account</button>
          </div>
          <button
            className="btn btn-ghost btn-square md:hidden"
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
          <div className="border-b border-base-300 bg-base-100 px-6 py-4 md:hidden">
            <ul className="menu menu-vertical w-full gap-1 p-0">
              {navLinks.map(([href, label]) => (
                <li key={href}><a href={href} onClick={() => setMenuOpen(false)}>{label}</a></li>
              ))}
            </ul>
            <div className="mt-3 flex flex-col gap-2">
              <button onClick={onLogin} className="btn btn-outline btn-sm">Sign in</button>
              <button onClick={onSignup} className="btn btn-neutral btn-sm">Create account</button>
            </div>
          </div>
        )}
      </nav>

      {/* ===================== Hero ===================== */}
      <header className="relative overflow-hidden bg-base-100">
        <div className="rd-grid pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="rd-aurora" aria-hidden="true"><i /></div>
        <div className="relative mx-auto max-w-[1120px] px-6 pb-16 pt-16 md:pb-20 md:pt-24">
          <div className="mx-auto max-w-[820px] text-center">
            <span className="rd-chip-outline rd-chip-shimmer">Review triage for Google Business profiles</span>
            <h1 className="rd-hero-display mt-7 text-[clamp(2.5rem,5.5vw,4rem)]">
              <SkewInText text="The reply desk for your Google reviews" startDelay={80} />
            </h1>
            <p className="mx-auto mt-6 max-w-[680px] text-pretty text-lg leading-[1.7] text-[#374151]">
              ReviewDesk triages every review into a lane, drafts a policy-checked reply in the
              reviewer&apos;s language, and waits for your approval before anything is recorded.
              Connect Google when you are ready, or start with the demo inbox.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <LabelSlideButton
                onClick={onSignup}
                label="Create an account"
                hoverLabel="Open the demo inbox"
                className="btn btn-neutral btn-lg rd-cta-glow min-h-[52px] px-7 text-base font-semibold"
              />
              <a href="#setup" className="btn btn-outline btn-lg min-h-[52px] px-7 text-base">
                See how it works
              </a>
            </div>
            <p className="rd-mono mt-7">
              15 sample reviews included · No credit card · Credentials encrypted with AES-256
            </p>
          </div>

          <Reveal>
            <div className="rd-halo mt-14 md:mt-16" aria-hidden="true">
              <ProductMockup />
            </div>
          </Reveal>
          <p className="rd-mono mt-4 text-center">
            Sample data from the demo inbox that ships with every account. Nothing shown was sent to Google.
          </p>
        </div>
      </header>

      <Marquee
        items={[
          "Four decision lanes",
          "Policy-checked drafts",
          "Replies in the reviewer's language",
          "Approval before anything is recorded",
          "Veto window you set",
          "Every decision in the ledger",
          "Demo inbox included",
        ]}
      />

      {/* ===================== Facts strip ===================== */}
      <section className="border-y border-base-300 bg-base-200">
        <div className="mx-auto grid max-w-[1120px] grid-cols-2 gap-px bg-base-300 lg:grid-cols-4">
          {FACTS.map((s, i) => (
            <Reveal key={s.label} delay={i * 80} className="bg-base-200 px-6 py-9">
              <CountUp value={s.value} className="rd-num rd-gradient-text block text-[2rem]" />
              <p className="mt-1.5 max-w-[200px] text-sm leading-snug text-[#6B7280]">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===================== Features (bento) ===================== */}
      <section id="features" className="scroll-mt-20 bg-base-100 py-20 md:py-24">
        <div className="mx-auto max-w-[1120px] px-6">
          <SectionHead
            num="01 · Features"
            title="A safety editor for public replies"
            desc="Six things the desk handles on every review, from the first sort to the audit trail. The model suggests; the policy and you decide."
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Four lanes, wide card with lane visual */}
            <GlowCard delay={0} className="card card-border rd-card-hover bg-base-100 p-6 md:col-span-2">
              <div className="badge badge-lg badge-outline gap-1.5 border-base-300 bg-base-200 p-3.5 text-[#374151]">
                <LayoutGrid size={16} aria-hidden="true" />
              </div>
              <h3 className="rd-display mb-2 mt-4 text-lg">Four lanes for every review</h3>
              <p className="max-w-[520px] text-sm leading-relaxed text-[#374151]">
                Each review lands in one lane, and the lane decides what happens next. Reviews that
                need human judgment surface first, and a real complaint is never treated as spam.
              </p>
              <div className="rounded-box border border-base-300 bg-base-200 mt-5 grid gap-x-6 gap-y-4 p-4 sm:grid-cols-2">
                {LANES.map((l, i) => (
                  <div key={l.name} className="flex gap-3">
                    <span className="rd-mono pt-0.5 text-primary">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{l.name}</p>
                      <p className="text-xs leading-snug text-[#6B7280]">{l.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlowCard>

            {/* Language matching with sample artifact */}
            <GlowCard delay={90} className="card card-border rd-card-hover bg-base-100 p-6">
              <div className="badge badge-lg badge-outline gap-1.5 border-base-300 bg-base-200 p-3.5 text-[#374151]">
                <Languages size={16} aria-hidden="true" />
              </div>
              <h3 className="rd-display mb-2 mt-4 text-lg">Drafts in the reviewer&apos;s language</h3>
              <p className="text-sm leading-relaxed text-[#374151]">
                Every draft ships with a copy in your language, so you know exactly what it says
                before you approve it.
              </p>
              <LanguageVisual />
            </GlowCard>

            {/* Policy checks */}
            <GlowCard delay={180} className="card card-border rd-card-hover bg-base-100 p-6">
              <div className="badge badge-lg badge-outline gap-1.5 border-base-300 bg-base-200 p-3.5 text-[#374151]">
                <ShieldCheck size={16} aria-hidden="true" />
              </div>
              <h3 className="rd-display mb-2 mt-4 text-lg">Policy-checked drafts</h3>
              <p className="text-sm leading-relaxed text-[#374151]">
                The model suggests, the policy decides. Drafts cannot invent details you did not
                allow, and mixed-sentiment reviews wait for you by default.
              </p>
              <PolicyVisual />
            </GlowCard>

            {/* Autopilot */}
            <GlowCard delay={0} className="card card-border rd-card-hover bg-base-100 p-6">
              <div className="badge badge-lg badge-outline gap-1.5 border-base-300 bg-base-200 p-3.5 text-[#374151]">
                <Timer size={16} aria-hidden="true" />
              </div>
              <h3 className="rd-display mb-2 mt-4 text-lg">Autopilot with a veto window</h3>
              <p className="text-sm leading-relaxed text-[#374151]">
                Clean 5-star replies can go out automatically after a countdown you set. Veto any
                draft, undo anything, and a daily cap keeps volume predictable.
              </p>
              <AutopilotVisual />
            </GlowCard>

            {/* Credentials */}
            <GlowCard delay={90} className="card card-border rd-card-hover bg-base-100 p-6">
              <div className="badge badge-lg badge-outline gap-1.5 border-base-300 bg-base-200 p-3.5 text-[#374151]">
                <KeyRound size={16} aria-hidden="true" />
              </div>
              <h3 className="rd-display mb-2 mt-4 text-lg">Your own Google connection</h3>
              <p className="text-sm leading-relaxed text-[#374151]">
                Connect with Google OAuth, or paste an API key or access token. Without a
                connection, the demo inbox still works.
              </p>
              <CredentialVisual />
            </GlowCard>

            {/* Honesty card, wide */}
            <GlowCard delay={180} className="card card-border rd-card-hover bg-base-100 p-6 md:col-span-2">
              <h3 className="rd-display mb-2 mt-1 text-lg">What the desk does not claim</h3>
              <p className="max-w-[520px] text-sm leading-relaxed text-[#374151]">
                Trust comes from specifics, so here is exactly where the line sits.
              </p>
              <HonestyVisual />
            </GlowCard>

            {/* Audit ledger */}
            <GlowCard delay={0} className="card card-border rd-card-hover bg-base-100 p-6">
              <div className="badge badge-lg badge-outline gap-1.5 border-base-300 bg-base-200 p-3.5 text-[#374151]">
                <ScrollText size={16} aria-hidden="true" />
              </div>
              <h3 className="rd-display mb-2 mt-4 text-lg">Audit ledger</h3>
              <p className="text-sm leading-relaxed text-[#374151]">
                Every decision, approval, veto, and undo is written down with the reason attached.
              </p>
              <LedgerVisual />
            </GlowCard>
          </div>
        </div>
      </section>

      {/* ===================== Control (dark) ===================== */}
      <section id="control" className="scroll-mt-20 bg-neutral text-neutral-content">
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
                      <span className="font-mono text-sm font-bold text-[#93C5FD]">{row.n}</span>
                      <div>
                        <p className="text-base font-semibold text-[#F9FAFB]">{row.t}</p>
                        <p className="mt-1 text-sm leading-relaxed text-[rgba(249,250,251,0.72)]">{row.d}</p>
                        <p className="rd-mono mt-2 text-[rgba(249,250,251,0.55)]">{row.m}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* dark ledger card */}
              <div className="card bg-neutral text-neutral-content border border-neutral p-5" aria-hidden="true">
                <div className="flex items-center justify-between border-b border-[#374151] pb-3">
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-[rgba(249,250,251,0.72)]">
                    Audit ledger
                  </p>
                  <span className="font-mono text-xs text-[rgba(249,250,251,0.55)]">sample entries</span>
                </div>
                {[
                  { t: "14:02", a: "approve", d: "Reply recorded in workspace" },
                  { t: "13:47", a: "veto", d: "Autopilot draft stopped by owner" },
                  { t: "13:31", a: "analyze", d: "5-star review triaged to auto lane" },
                  { t: "13:12", a: "undo", d: "Recorded reply returned to queue" },
                ].map((r) => (
                  <div key={r.t + r.a} className="flex gap-3 border-b border-[#374151] py-3 font-mono text-xs last:border-b-0">
                    <span className="w-10 shrink-0 text-[rgba(249,250,251,0.55)]">{r.t}</span>
                    <span className="w-16 shrink-0 font-bold text-[#93C5FD]">{r.a}</span>
                    <span className="text-[rgba(249,250,251,0.82)]">{r.d}</span>
                  </div>
                ))}
                <p className="mt-4 font-mono text-xs text-[rgba(249,250,251,0.55)]">
                  Every entry carries the reason and the actor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== Setup steps (daisyUI steps) ===================== */}
      <section id="setup" className="scroll-mt-20 bg-base-200 py-20 md:py-24">
        <div className="mx-auto max-w-[1120px] px-6">
          <SectionHead
            num="03 · Setup"
            title="Four steps from signup to a working desk"
            desc="The demo inbox means the desk is usable on day one. The Google connection is optional and can wait."
          />
          <Reveal>
          <ul className="steps steps-vertical w-full border-base-300 font-display lg:steps-horizontal">
            {STEPS.map((s) => (
              <li key={s.num} className="step step-primary" data-content={s.num}>
                <div className="mt-2 max-w-[240px] text-left lg:mt-6">
                  <h3 className="rd-display mb-2 text-base">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-[#374151]">{s.body}</p>
                </div>
              </li>
            ))}
          </ul>
          </Reveal>
        </div>
      </section>

      {/* ===================== FAQ (daisyUI collapse) ===================== */}
      <section id="faq" className="scroll-mt-20 bg-base-100 py-20 md:py-24">
        <div className="mx-auto max-w-[1120px] px-6">
          <SectionHead num="04 · FAQ" title={<SpotlightText text="Straight answers" />} />
          <Reveal className="max-w-[760px] space-y-3">
            {FAQ.map((item, i) => (
              <details key={i} className="collapse collapse-arrow card card-border bg-base-100">
                <summary className="collapse-title cursor-pointer">
                  <span className="rd-display text-base">{item.q}</span>
                </summary>
                <div className="collapse-content border-t border-base-300">
                  <p className="pt-4 text-sm leading-relaxed text-[#374151]">{item.a}</p>
                </div>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="bg-base-100 pb-20">
        <div className="mx-auto max-w-[1120px] px-6">
          <div className="relative overflow-hidden rounded-[14px] bg-neutral px-6 py-16 text-center text-neutral-content md:py-20">
            <div className="rd-grid-dark pointer-events-none absolute inset-0" aria-hidden="true" />
            <div className="relative">
              <h2 className="rd-hero-display mx-auto max-w-[560px] text-[clamp(1.75rem,3.2vw,2.5rem)]" style={{ color: "#F9FAFB" }}>
                Create an account and try the demo inbox
              </h2>
              <p className="mx-auto mt-4 max-w-[480px] text-base leading-relaxed text-[rgba(249,250,251,0.72)]">
                Sign up, add your business details, and analyze the 15 sample reviews. Connect
                Google whenever you are ready.
              </p>
              <button
                onClick={onSignup}
                className="btn btn-lg mt-8 min-h-[52px] border-0 bg-base-100 px-7 text-base font-semibold text-neutral hover:bg-base-200"
              >
                Create an account <ArrowRight size={18} aria-hidden="true" />
              </button>
              <p className="rd-mono mt-6 text-[rgba(249,250,251,0.55)]">
                No credit card · Demo inbox included · Your data stays on this server
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== Footer (daisyUI) ===================== */}
      <footer className="footer mt-auto border-t border-[#374151] bg-neutral p-10 text-neutral-content sm:footer-horizontal">
        <div className="mx-auto w-full max-w-[1120px] px-6">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.4fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <LogoMark size={22} />
                <span className="rd-display text-base" style={{ color: "#F9FAFB" }}>ReviewDesk</span>
              </div>
              <p className="mt-3 max-w-[260px] text-sm leading-relaxed text-[rgba(249,250,251,0.72)]">
                Review triage and reply drafts for Google Business profiles. The final word is
                always yours.
              </p>
            </div>
            <nav aria-label="Product">
              <p className="rd-kicker mb-3 text-[rgba(249,250,251,0.6)]">Product</p>
              <ul className="space-y-2 text-sm text-[rgba(249,250,251,0.82)]">
                <li><a href="#features" className="link-hover link">Features</a></li>
                <li><a href="#control" className="link-hover link">Control</a></li>
                <li><a href="#setup" className="link-hover link">Setup</a></li>
                <li><a href="#faq" className="link-hover link">FAQ</a></li>
              </ul>
            </nav>
            <nav aria-label="Account">
              <p className="rd-kicker mb-3 text-[rgba(249,250,251,0.6)]">Account</p>
              <ul className="space-y-2 text-sm text-[rgba(249,250,251,0.82)]">
                <li><button onClick={onSignup} className="link-hover link">Create account</button></li>
                <li><button onClick={onLogin} className="link-hover link">Sign in</button></li>
              </ul>
            </nav>
            <nav aria-label="Legal">
              <p className="rd-kicker mb-3 text-[rgba(249,250,251,0.6)]">Legal</p>
              <ul className="space-y-2 text-sm text-[rgba(249,250,251,0.82)]">
                <li><a href="/privacy" className="link-hover link">Privacy policy</a></li>
                <li><a href="/terms" className="link-hover link">Terms and conditions</a></li>
              </ul>
            </nav>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#374151] pt-6">
            <p className="font-mono text-[0.75rem] text-[rgba(249,250,251,0.55)]">
              © 2026 ReviewDesk
            </p>
            <p className="font-mono text-[0.75rem] text-[rgba(249,250,251,0.55)]">
              Approved replies are recorded, not sent, until you connect Google yourself
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
