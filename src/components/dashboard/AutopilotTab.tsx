"use client";

/**
 * AutopilotTab.tsx, the three lanes (auto with veto countdown, approval
 * queue, recorded) plus the safety policy controls, built on daisyUI
 * components (card, toggle, btn, badge). The model never decides lanes;
 * the frozen policy engine does.
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
    (() => {
      try {
        return JSON.parse(policy?.trustedLanguages ?? '["english"]');
      } catch {
        return ["english"];
      }
    })(),
  );

  if (!policy)
    return (
      <div className="card card-border bg-base-100 p-8 text-center rd-mono">Loading policy…</div>
    );

  const autoRows = ws.reviews.filter(
    (r) => r.triage?.lane === "auto" && r.triage?.status === "pending",
  );
  const queueRows = ws.reviews.filter(
    (r) => r.triage && r.triage.lane === "queue" && r.triage.status === "pending" && !r.hasReply,
  );
  const recordedRows = ws.reviews.filter((r) => r.hasReply);

  async function savePolicy(
    patch: Partial<Omit<PolicyData, "trustedLanguages">> & { trustedLanguages?: string[] },
  ) {
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
      onNote(
        res.ok
          ? `Cycle done: ${data.recorded} recorded, ${data.wouldRecord} would-record (dry run), ${data.failed} failed.`
          : data.error,
      );
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
        <section className="card card-border bg-base-100 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="rd-kicker text-[#854D0E]">Lane 1 · Auto</span>
              <p className="text-sm text-[#6B7280]">
                Passes every check. Recorded after the veto window unless you stop it.
              </p>
            </div>
            {policy.enabled && !policy.dryRun && (
              <button className="btn btn-primary btn-sm" onClick={runCycle} disabled={busy}>
                {busy ? (
                  <span className="loading loading-spinner loading-xs" aria-hidden="true" />
                ) : null}
                {busy ? "Running" : "Run cycle now"}
              </button>
            )}
          </div>
          {autoRows.length === 0 ? (
            <p className="rd-mono py-4">No rows in the auto lane.</p>
          ) : (
            <div className="space-y-3">
              {autoRows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl p-4"
                  style={{ background: "#FBF3D9", border: "1px solid #E5E7EB" }}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <Stars stars={r.stars} />
                    <div className="flex items-center gap-2">
                      <VetoCountdown dueAt={r.triage!.dueAt} />
                      <Stamp action={r.triage!.action} />
                    </div>
                  </div>
                  <p className="line-clamp-2 text-sm text-[#374151]">{r.text}</p>
                  <div className="mt-2 flex gap-2">
                    <button className="btn btn-ghost btn-xs" onClick={() => onOpenDesk(r.id)}>
                      Open in desk
                    </button>
                    <button
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() =>
                        act(
                          { type: "cancel_veto", triageId: r.triage!.id },
                          "Moved to the approval queue.",
                        )
                      }
                    >
                      Veto to queue
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Queue lane */}
        <section className="card card-border bg-base-100 p-6">
          <span className="rd-kicker text-[#854D0E]">Lane 2 · Approval queue</span>
          <p className="mb-4 text-sm text-[#6B7280]">
            Needs a human: risk flags, mixed sentiment, low stars or untrusted language.
          </p>
          {queueRows.length === 0 ? (
            <p className="rd-mono py-4">Queue is clear.</p>
          ) : (
            <div className="space-y-3">
              {queueRows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl p-4"
                  style={{ background: "#FFFFFF", border: "1.5px dashed #D1D5DB" }}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <Stars stars={r.stars} />
                    <Stamp action={r.triage!.action} />
                  </div>
                  <p className="line-clamp-2 text-sm text-[#374151]">{r.text}</p>
                  {r.triage!.reason && (
                    <p className="mt-1 text-xs text-[#6B7280]">{r.triage!.reason}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="btn btn-ghost btn-xs" onClick={() => onOpenDesk(r.id)}>
                      Open in desk
                    </button>
                    {r.triage!.draftReply && (
                      <button
                        className="btn btn-ghost btn-xs text-success"
                        onClick={() =>
                          act(
                            { type: "record", triageId: r.triage!.id },
                            "Recorded in your workspace (demo; nothing is sent to Google).",
                          )
                        }
                      >
                        Quick approve
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-xs text-error"
                      onClick={() =>
                        act({ type: "dismiss", triageId: r.triage!.id }, "Draft dismissed.")
                      }
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recorded lane */}
        <section className="card card-border bg-base-100 p-6">
          <span className="rd-kicker">Lane 3 · Recorded</span>
          <p className="mb-4 text-sm text-[#6B7280]">
            Everything already answered. Undo puts a review back on the desk.
          </p>
          {recordedRows.length === 0 ? (
            <p className="rd-mono py-4">Nothing recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {recordedRows.map((r) => (
                <div key={r.id} className="rd-ledger-row !items-start">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2">
                      <Stars stars={r.stars} />
                      <span className="badge badge-soft badge-success font-mono">
                        {r.replyMode === "sent" ? "sent" : "recorded"}
                      </span>
                    </div>
                    <p className="line-clamp-1 text-sm text-[#374151]">
                      {r.text || "(star rating only)"}
                    </p>
                  </div>
                  <button
                    className="btn btn-ghost btn-xs shrink-0"
                    onClick={() =>
                      act(
                        { type: "undo", reviewId: r.id },
                        "Reply undone; the review is back in the desk.",
                      )
                    }
                  >
                    Undo
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Policy */}
      <aside className="card card-border bg-base-100 h-fit p-6">
        <span className="rd-kicker mb-4 block text-[#854D0E]">Safety policy</span>
        <div className="space-y-4">
          <label className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium text-[#111827]">Autopilot on</span>
            <input
              type="checkbox"
              checked={policy.enabled}
              onChange={(e) => savePolicy({ enabled: e.target.checked })}
              className="toggle toggle-primary toggle-sm"
              aria-label="Autopilot on"
            />
          </label>
          <label className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium text-[#111827]">
              Dry run
              <span className="block text-xs text-[#6B7280]">
                Log what would be recorded; record nothing
              </span>
            </span>
            <input
              type="checkbox"
              checked={policy.dryRun}
              onChange={(e) => savePolicy({ dryRun: e.target.checked })}
              className="toggle toggle-primary toggle-sm"
              aria-label="Dry run"
            />
          </label>
          <label className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium text-[#111827]">
              Allow mixed sentiment
              <span className="block text-xs text-[#6B7280]">
                4-star &ldquo;good, but…&rdquo; reviews auto-record instead of queueing
              </span>
            </span>
            <input
              type="checkbox"
              checked={policy.allowMixedSentiment}
              onChange={(e) => savePolicy({ allowMixedSentiment: e.target.checked })}
              className="toggle toggle-primary toggle-sm"
              aria-label="Allow mixed sentiment"
            />
          </label>

          <div className="rd-dash-rule border-t" />
          <fieldset className="fieldset">
            <legend className="fieldset-legend rd-kicker">Minimum stars for auto</legend>
            <input
              id="pol-stars"
              type="number"
              min={1}
              max={5}
              className="input w-full"
              aria-label="Minimum stars for auto"
              value={policy.minStars}
              onChange={(e) => savePolicy({ minStars: Number(e.target.value) })}
            />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend rd-kicker">Veto window (minutes)</legend>
            <input
              id="pol-delay"
              type="number"
              min={0}
              max={1440}
              className="input w-full"
              aria-label="Veto window in minutes"
              value={policy.delayMinutes}
              onChange={(e) => savePolicy({ delayMinutes: Number(e.target.value) })}
            />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend rd-kicker">Daily cap</legend>
            <input
              id="pol-cap"
              type="number"
              min={1}
              max={100}
              className="input w-full"
              aria-label="Daily cap"
              value={policy.dailyCap}
              onChange={(e) => savePolicy({ dailyCap: Number(e.target.value) })}
            />
          </fieldset>
          <div>
            <span className="rd-kicker mb-1.5 block">Trusted languages</span>
            <div className="flex flex-wrap gap-1.5">
              {["english", "roman_urdu", "urdu"].map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`btn btn-xs ${trusted.includes(l) ? "btn-primary" : "btn-outline"}`}
                  onClick={() => {
                    const next = trusted.includes(l)
                      ? trusted.filter((x) => x !== l)
                      : [...trusted, l];
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
