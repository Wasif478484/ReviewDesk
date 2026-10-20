"use client";

/**
 * bits.tsx, shared Owner's Desk UI primitives: logo, stars, stamps,
 * banners, draft card, check-facts card, veto countdown, distribution bar.
 */

import { useEffect, useState } from "react";
import { ACTION_META, type ReviewData, type TriageData } from "@/types/reviewdesk";
import CountUp from "@/components/effects/CountUp";

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#1D4ED8" />
      <path
        d="M9 17l5 5 9-12"
        stroke="#FFFFFF"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Stars({ stars }: { stars: number | null | undefined }) {
  if (stars == null) return <span className="rd-mono">no rating</span>;
  return (
    <span className="rd-stars" aria-label={`${stars} out of 5 stars`}>
      {"★".repeat(stars)}
      <span className="opacity-30">{"★".repeat(5 - stars)}</span>
    </span>
  );
}

export function Stamp({ action }: { action: string }) {
  const meta = ACTION_META[action] ?? ACTION_META.reply_needs_owner;
  return <span className={meta.stamp}>{meta.label}</span>;
}

/** Priority badge. Urgent reviews need a human before anything else. */
export function PriorityBadge({ priority }: { priority: string | null | undefined }) {
  if (!priority || priority === "normal") return null;
  if (priority === "urgent") {
    return <span className="rd-stamp rd-stamp-hold">Urgent</span>;
  }
  return <span className="rd-stamp rd-stamp-report">Low</span>;
}

/** Counts down a veto window. Shows "ready" when past due. */
export function VetoCountdown({ dueAt }: { dueAt: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!dueAt) return <span className="rd-veto">ready</span>;
  const ms = new Date(dueAt).getTime() - now;
  if (ms <= 0) return <span className="rd-veto">ready now</span>;
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return (
    <span className="rd-veto" aria-live="off">
      veto {m}:{String(s).padStart(2, "0")}
    </span>
  );
}

/** The check-facts card: draft problems + owner checklist, ledger style. */
export function CheckFactsCard({ triage }: { triage: TriageData }) {
  const items = [
    ...triage.flags.map((f) => `risk flag: ${f.replace(/_/g, " ")}`),
    ...triage.ownerChecklist,
  ];
  if (!items.length) return null;
  return (
    <div
      className="rounded-xl border-[1.5px] border-dashed p-4"
      style={{ borderColor: "#854D0E", background: "#FBF3D9" }}
    >
      <div className="rd-kicker mb-2" style={{ color: "#854D0E" }}>
        Check facts before posting
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm" style={{ color: "#374151" }}>
            <span className="rd-mono shrink-0" style={{ color: "#854D0E" }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Draft reply with translation + word count target indicator. */
export function DraftCard({
  draft,
  translation,
  languageUsed,
  value,
  onChange,
  editable,
}: {
  draft: string;
  translation: string | null;
  languageUsed: string;
  value?: string;
  onChange?: (v: string) => void;
  editable?: boolean;
}) {
  const words = (value ?? draft).split(/\s+/).filter(Boolean).length;
  const inRange = words >= 25 && words <= 90;
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="rd-kicker">Draft reply · {languageUsed || "auto"}</span>
        <span
          className="rd-mono"
          style={{ color: inRange ? "#15803D" : "#854D0E" }}
          aria-label={`${words} words`}
        >
          {words} words {inRange ? "· on target" : "· aim 30-80"}
        </span>
      </div>
      {editable && onChange ? (
        <textarea
          className="textarea w-full min-h-[120px] resize-y text-[15px]"
          value={value ?? draft}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Edit draft reply"
        />
      ) : (
        <p
          className="whitespace-pre-wrap rounded-[10px] p-4 text-[15px]"
          style={{ background: "#FFFFFF", border: "1.5px solid #D1D5DB", color: "#111827" }}
        >
          {draft}
        </p>
      )}
      {translation && (
        <div>
          <div className="rd-kicker mb-1.5">What it says (owner copy)</div>
          <p
            className="whitespace-pre-wrap rounded-[10px] p-4 text-sm italic"
            style={{ background: "#F6F7F9", border: "1px solid #E5E7EB", color: "#374151" }}
          >
            {translation}
          </p>
        </div>
      )}
    </div>
  );
}

/** Triage banner: stamp + reason + optional report note. */
export function TriageBanner({ triage }: { triage: TriageData }) {
  const meta = ACTION_META[triage.action] ?? ACTION_META.reply_needs_owner;
  return (
    <div className={meta.banner}>
      <Stamp action={triage.action} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium" style={{ color: "#111827" }}>
          {meta.blurb}
        </p>
        {triage.reason && (
          <p className="mt-1 text-sm" style={{ color: "#374151" }}>
            {triage.reason}
          </p>
        )}
        {triage.reportNote && (
          <p
            className="mt-2 rounded-lg p-3 text-sm"
            style={{ background: "#FFFFFF", border: "1px dashed #57534E", color: "#374151" }}
          >
            <span className="rd-kicker block" style={{ color: "#57534E" }}>
              Report note
            </span>
            {triage.reportNote}
          </p>
        )}
      </div>
    </div>
  );
}

/** Reply composer: editable draft with sign-off, word target, and preview. */
export function ReplyComposer({
  draft,
  translation,
  languageUsed,
  value,
  onChange,
  signOff,
  ownerLanguage,
  editable,
}: {
  draft: string;
  translation: string | null;
  languageUsed: string;
  value?: string;
  onChange?: (v: string) => void;
  signOff?: string;
  ownerLanguage?: string;
  editable?: boolean;
}) {
  const text = value ?? draft;
  const words = text.split(/\s+/).filter(Boolean).length;
  const withSignOff = signOff && !text.trim().endsWith(signOff.trim());
  const preview = withSignOff ? `${text}\n\n${signOff}` : text;
  const inRange = words >= 25 && words <= 90;
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="rd-kicker">Draft reply {editable ? "· edit before you copy" : ""}</span>
        <span
          className="rd-mono"
          style={{ color: inRange ? "#15803D" : "#854D0E" }}
          aria-label={`${words} words`}
        >
          {words} words {inRange ? "· on target" : "· aim 30-80"}
        </span>
      </div>
      {editable && onChange ? (
        <>
          <textarea
            className="textarea w-full min-h-[140px] resize-y text-[15px] font-display"
            value={text}
            onChange={(e) => onChange(e.target.value)}
            aria-label="Edit draft reply"
            placeholder="Type your reply here…"
          />
          {signOff && (
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                checked={Boolean(withSignOff)}
                onChange={() => onChange(withSignOff ? text : `${text}\n\n${signOff}`)}
                className="toggle toggle-sm shrink-0"
                aria-label="Add sign-off"
              />
              <label className="text-xs text-[#6B7280] cursor-pointer select-none">
                Add sign-off (“{signOff}”)
              </label>
            </div>
          )}
          {translation && ownerLanguage && (
            <div className="mt-2 flex items-center gap-2">
              <button
                className="btn btn-ghost btn-xs rd-mono"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? "Show reply draft" : `Show in ${ownerLanguage} (owner copy)`}
              </button>
            </div>
          )}
          {showPreview && translation && (
            <div className="mt-2 rounded-lg border border-base-300 bg-[#F6F7F9] p-3 text-sm italic text-[#374151]">
              {translation}
            </div>
          )}
        </>
      ) : (
        <p
          className="whitespace-pre-wrap rounded-[10px] p-4 text-[15px] font-display"
          style={{ background: "#FFFFFF", border: "1.5px solid #D1D5DB", color: "#111827" }}
        >
          {preview}
        </p>
      )}
      {translation && !editable && (
        <div>
          <div className="rd-kicker mb-1.5">What it says (owner copy)</div>
          <p
            className="whitespace-pre-wrap rounded-[10px] p-4 text-sm italic"
            style={{ background: "#F6F7F9", border: "1px solid #E5E7EB", color: "#374151" }}
          >
            {translation}
          </p>
        </div>
      )}
    </div>
  );
}

/** One-click copy of reviewer + draft reply, formatted for pasting into Google Business. */
export function CopyReviewAndReply({
  review,
  draft,
  signOff,
  onCopied,
}: {
  review: ReviewData;
  draft: string;
  signOff?: string;
  onCopied?: () => void;
}) {
  const fullText = [
    `Reviewer: ${review.author || "Reviewer"}`,
    `Rating: ${review.stars ?? "—"}★`,
    `Review: ${review.text || "(no text)"}`,
    ``,
    `Your reply:`,
    `${draft}${signOff ? `\n\n${signOff}` : ""}`,
  ].join("\n");

  return (
    <button
      className="btn btn-neutral btn-sm w-full flex items-center justify-center gap-2"
      onClick={async () => {
        await navigator.clipboard?.writeText(fullText);
        onCopied?.();
      }}
      aria-label="Copy reviewer and reply to clipboard"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </svg>
      Copy review + reply
    </button>
  );
}

/** Quick reply templates the owner can insert into the draft. */
export function ReplyTemplates({ onInsert }: { onInsert: (phrase: string) => void }) {
  const templates = [
    "Thank you for your feedback!",
    "We're sorry to hear about your experience.",
    "Thank you for bringing this to our attention.",
    "We appreciate you taking the time to review us.",
    "We look forward to serving you again.",
  ];
  return (
    <div className="space-y-2">
      <div className="rd-kicker mb-2">Quick insert</div>
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => (
          <button key={t} className="btn btn-outline btn-xs rd-mono" onClick={() => onInsert(t)}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Rating distribution bar. */
export function Distribution({ reviews }: { reviews: ReviewData[] }) {
  const buckets = [1, 2, 3, 4, 5].map((s) => reviews.filter((r) => r.stars === s).length);
  const total = buckets.reduce((a, b) => a + b, 0) || 1;
  const colors = ["#EF4444", "#F97316", "#EAB308", "#4ADE80", "#22C55E"];
  return (
    <div>
      <div className="rd-dist" role="img" aria-label="Rating distribution">
        {buckets.map((n, i) => (
          <div
            key={i}
            style={{ width: `${(n / total) * 100}%`, background: colors[i] }}
            title={`${i + 1}★: ${n}`}
          />
        ))}
      </div>
      <div className="rd-mono mt-1.5 flex justify-between">
        {[1, 2, 3, 4, 5].map((s, i) => (
          <span key={s}>
            {s}★ {buckets[i]}
          </span>
        ))}
      </div>
    </div>
  );
}

const BREAKDOWN_COLORS: Record<string, string> = {
  reply: "#15803D",
  reply_needs_owner: "#854D0E",
  hold: "#DC2626",
  report: "#52525B",
  urgent: "#DC2626",
  normal: "#854D0E",
  low: "#15803D",
  demo: "#6B7280",
  google: "#1D4ED8",
  yelp: "#DC2626",
  facebook: "#2563EB",
  tripadvisor: "#0F766E",
  imported: "#854D0E",
};

/** A small breakdown list: one row per key with a count and a share bar. */
export function Breakdown({
  title,
  counts,
  order,
  labels,
}: {
  title: string;
  counts: Record<string, number>;
  order: string[];
  labels: Record<string, string>;
}) {
  const keys = order.filter((k) => k in counts);
  const total = keys.reduce((a, k) => a + (counts[k] ?? 0), 0);
  return (
    <div>
      <p className="rd-kicker mb-2">{title}</p>
      {total === 0 ? (
        <p className="rd-mono text-xs">Nothing triaged yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {keys.map((k) => {
            const n = counts[k] ?? 0;
            const pct = Math.round((n / total) * 100);
            return (
              <li key={k}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs text-[#374151]">{labels[k] ?? k}</span>
                  <span className="rd-mono text-xs">{n}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-base-300">
                  <div
                    className="h-full rounded"
                    style={{ width: `${pct}%`, background: BREAKDOWN_COLORS[k] ?? "#6B7280" }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Small metric in ledger style. */
export function LedgerStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rd-ledger-row">
      <span className="rd-kicker">{label}</span>
      <CountUp
        value={value}
        className={`rd-num text-2xl ${accent ? "text-[#1D4ED8]" : "text-[#111827]"}`}
      />
    </div>
  );
}
