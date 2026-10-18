'use client';

/**
 * AutopilotTab.tsx, the three lanes (auto with veto countdown, approval
 * queue, recorded) plus the safety policy controls. The model never decides
 * lanes; the frozen policy engine does.
 */

import { useState } from "react";
import { Stars, Stamp, VetoCountdown } from "@/components/shared/bits";
import type { PolicyData, WorkspaceData } from "@/types/reviewdesk";

interface AutopilotTabProps {
  ws: WorkspaceData;
  refresh: () => Promise<void>;
  onNote: (note: string) => void;
  onOpenDesk: (reviewId: string) => void;
}

export default function AutopilotTab({ ws, refresh, onNote, onOpenDesk }: AutopilotTabProps) {
  const policy = ws.policy;
  const [busy, setBusy] = useState(false);
  const [trusted, setTrusted] = useState<string[]>(
    (() => { try { return JSON.parse(policy?.trustedLanguages ?? "[\"english\"]"); } catch { return ["english"]; } })(),
  );

  if (!policy) return <div className="rd-card p-8 text-center rd-mono">Loading policy…</div>;

  const autoRows = ws.reviews.filter((r) => r.triage?.lane === "auto" && r.triage?.status === "pending");
  const queueRows = ws.reviews.filter((r) =>
    r.triage && r.triage.lane === "queue" && r.triage.status === "pending" && !r.hasReply);
  const recordedRows = ws.reviews.filter((r) => r.hasReply);

  async function savePolicy(patch: Partial<Omit<PolicyData, "trustedLanguages">> & { trustedLanguages?: string[] }) {
    if (!policy) return;
    setBusy(true);
    try {
      await fetch("/api/policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: policy.enabled,
          dryRun: policy.dryRun,
          minStars: policy.minStars,
          delayMinutes: policy.delayMinutes,
          dailyCap: policy.dailyCap,
          allowMixedSentiment: policy.allowMixedSentiment,
          trustedLanguages: trusted,
          ...patch,
        }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function act(body: Record<string, unknown>, okNote: string) {
    const res = await fetch("/api/reviews/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    onNote(res.ok ? okNote : (data.message ?? data.error ?? "Action failed."));
    await refresh();
  }

  async function runCycle() {
    setBusy(true);
    try {
      const res = await fetch("/api/autopilot", { method: "POST" });
      const data = await res.json();
      onNote(res.ok
        ? `Cycle done: ${data.recorded} recorded, ${data.wouldRecord} would-record (dry run), ${data.failed} failed.`
        : data.error);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Lanes */}
      <div className="space-y-6">
        {/* Auto lane */}
        <section className="rd-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="rd-kicker" style={{ color: "#854D0E" }}>Lane 1 · Auto</span>
              <p className="text-sm text-[#6B7280]">Passes every check. Recorded after the veto window unless you stop it.</p>
            </div>
            {policy.enabled && !policy.dryRun && (
              <button className="rd-btn-green px-4 py-2 text-xs min-h-[36px]" onClick={runCycle} disabled={busy}>
                {busy ? "Running…" : "Run cycle now"}
              </button>
            )}
          </div>
          {autoRows.length === 0 ? (
            <p className="rd-mono py-4">No rows in the auto lane.</p>
          ) : (
            <div className="space-y-3">
              {autoRows.map((r) => (
                <div key={r.id} className="rounded-xl p-4" style={{ background: "#FBF3D9", border: "1px solid #E5E7EB" }}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <Stars stars={r.stars} />
                    <div className="flex items-center gap-2">
                      <VetoCountdown dueAt={r.triage!.dueAt} />
                      <Stamp action={r.triage!.action} />
                    </div>
                  </div>
                  <p className="line-clamp-2 text-sm text-[#374151]">{r.text}</p>
                  <div className="mt-2 flex gap-3">
                    <button className="rd-mono hover:text-[#111827]" onClick={() => onOpenDesk(r.id)}>Open in desk</button>
                    <button className="rd-mono hover:text-[#111827]" style={{ color: "#DC2626" }} onClick={() => act({ type: "cancel_veto", triageId: r.triage!.id }, "Moved to the approval queue.")}>
                      Veto → queue
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Queue lane */}
        <section className="rd-card p-6">
          <span className="rd-kicker" style={{ color: "#854D0E" }}>Lane 2 · Approval queue</span>
          <p className="mb-4 text-sm text-[#6B7280]">Needs a human: risk flags, mixed sentiment, low stars or untrusted language.</p>
          {queueRows.length === 0 ? (
            <p className="rd-mono py-4">Queue is clear.</p>
          ) : (
            <div className="space-y-3">
              {queueRows.map((r) => (
                <div key={r.id} className="rounded-xl p-4" style={{ background: "#FFFFFF", border: "1.5px dashed #D1D5DB" }}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <Stars stars={r.stars} />
                    <Stamp action={r.triage!.action} />
                  </div>
                  <p className="line-clamp-2 text-sm text-[#374151]">{r.text}</p>
                  {r.triage!.reason && <p className="mt-1 text-xs text-[#6B7280]">{r.triage!.reason}</p>}
                  <div className="mt-2 flex flex-wrap gap-3">
                    <button className="rd-mono hover:text-[#111827]" onClick={() => onOpenDesk(r.id)}>Open in desk</button>
                    {r.triage!.draftReply && (
                      <button className="rd-mono hover:text-[#111827]" style={{ color: "#166534" }} onClick={() => act({ type: "record", triageId: r.triage!.id }, "Recorded in your workspace (demo; nothing is sent to Google).")}>
                        Quick approve
                      </button>
                    )}
                    <button className="rd-mono hover:text-[#111827]" style={{ color: "#DC2626" }} onClick={() => act({ type: "dismiss", triageId: r.triage!.id }, "Draft dismissed.")}>
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recorded lane */}
        <section className="rd-card p-6">
          <span className="rd-kicker">Lane 3 · Recorded</span>
          <p className="mb-4 text-sm text-[#6B7280]">Everything already answered. Undo puts a review back on the desk.</p>
          {recordedRows.length === 0 ? (
            <p className="rd-mono py-4">Nothing recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {recordedRows.map((r) => (
                <div key={r.id} className="rd-ledger-row !items-start">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <Stars stars={r.stars} />
                      <span className="rd-chip" style={{ color: "#166534", background: "#E9F9EF", borderColor: "#15803D" }}>
                        {r.replyMode === "sent" ? "sent" : "recorded"}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-sm text-[#374151]">{r.text || "(star rating only)"}</p>
                  </div>
                  <button className="rd-mono shrink-0 hover:text-[#111827]" onClick={() => act({ type: "undo", reviewId: r.id }, "Reply undone; the review is back in the desk.")}>
                    Undo
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Policy */}
      <aside className="rd-card h-fit p-6">
        <span className="rd-kicker mb-4 block" style={{ color: "#854D0E" }}>Safety policy</span>
        <div className="space-y-4">
          <label className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium text-[#111827]">Autopilot on</span>
            <input type="checkbox" checked={policy.enabled} onChange={(e) => savePolicy({ enabled: e.target.checked })} className="h-5 w-5 accent-[#1D4ED8]" aria-label="Autopilot on" />
          </label>
          <label className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium text-[#111827]">Dry run
              <span className="block text-xs text-[#6B7280]">Log what would be recorded; record nothing</span>
            </span>
            <input type="checkbox" checked={policy.dryRun} onChange={(e) => savePolicy({ dryRun: e.target.checked })} className="h-5 w-5 accent-[#1D4ED8]" aria-label="Dry run" />
          </label>
          <label className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium text-[#111827]">Allow mixed sentiment
              <span className="block text-xs text-[#6B7280]">4-star &ldquo;good, but…&rdquo; reviews auto-record instead of queueing</span>
            </span>
            <input type="checkbox" checked={policy.allowMixedSentiment} onChange={(e) => savePolicy({ allowMixedSentiment: e.target.checked })} className="h-5 w-5 accent-[#1D4ED8]" aria-label="Allow mixed sentiment" />
          </label>

          <div className="rd-dash-rule border-t" />
          <div>
            <label htmlFor="pol-stars" className="rd-kicker mb-1.5 block">Minimum stars for auto</label>
            <input id="pol-stars" type="number" min={1} max={5} className="rd-input" value={policy.minStars} onChange={(e) => savePolicy({ minStars: Number(e.target.value) })} />
          </div>
          <div>
            <label htmlFor="pol-delay" className="rd-kicker mb-1.5 block">Veto window (minutes)</label>
            <input id="pol-delay" type="number" min={0} max={1440} className="rd-input" value={policy.delayMinutes} onChange={(e) => savePolicy({ delayMinutes: Number(e.target.value) })} />
          </div>
          <div>
            <label htmlFor="pol-cap" className="rd-kicker mb-1.5 block">Daily cap</label>
            <input id="pol-cap" type="number" min={1} max={100} className="rd-input" value={policy.dailyCap} onChange={(e) => savePolicy({ dailyCap: Number(e.target.value) })} />
          </div>
          <div>
            <span className="rd-kicker mb-1.5 block">Trusted languages</span>
            <div className="flex flex-wrap gap-1.5">
              {["english", "roman_urdu", "urdu"].map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`rd-chip ${trusted.includes(l) ? "!border-[#1D4ED8] !bg-[#E9F9EF] !text-[#166534]" : ""}`}
                  onClick={() => {
                    const next = trusted.includes(l) ? trusted.filter((x) => x !== l) : [...trusted, l];
                    setTrusted(next);
                    savePolicy({ trustedLanguages: next });
                  }}
                  aria-pressed={trusted.includes(l)}
                >
                  {l.replace("_", " ")}
                </button>
              ))}
            </div>
            <p className="rd-mono mt-2">Only languages a native reader has checked belong here.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
