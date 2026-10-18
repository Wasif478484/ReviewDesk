'use client';

/**
 * Dashboard.tsx, the owner's desk after onboarding: top ledger bar, stats,
 and tabs (Desk / Autopilot / Ledger / Settings). The Desk tab is the
 single-review triage surface.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { LogoMark, Stars, Stamp, TriageBanner, DraftCard, CheckFactsCard, Distribution, LedgerStat, VetoCountdown } from "@/components/shared/bits";
import { ACTION_META, type ReviewData, type WorkspaceData } from "@/types/reviewdesk";
import AutopilotTab from "@/components/dashboard/AutopilotTab";
import LedgerTab from "@/components/dashboard/LedgerTab";
import SettingsTab from "@/components/dashboard/SettingsTab";

type Tab = "desk" | "autopilot" | "ledger" | "settings";

interface DashboardProps {
  initial: WorkspaceData;
  initialGoogleStatus?: string;
  initialGoogleMessage?: string;
  onSignOut: () => void;
}

export default function Dashboard({ initial, initialGoogleStatus, initialGoogleMessage, onSignOut }: DashboardProps) {
  const [ws, setWs] = useState<WorkspaceData>(initial);
  const [tab, setTab] = useState<Tab>("desk");
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.reviews.find((r) => !r.hasReply)?.id ?? initial.reviews[0]?.id ?? null,
  );
  const [busyReview, setBusyReview] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [note, setNote] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [csv, setCsv] = useState("");
  const [draftEdit, setDraftEdit] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "replied">("all");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/workspace");
    if (res.ok) setWs(await res.json());
  }, []);

  const selected = useMemo(
    () => ws.reviews.find((r) => r.id === selectedId) ?? null,
    [ws.reviews, selectedId],
  );

  // Reset draft editor when the selection changes.
  useEffect(() => {
    setDraftEdit(selected?.triage?.draftReply ?? "");
  }, [selected?.id, selected?.triage?.draftReply]);

  const visible = ws.reviews.filter((r) => {
    if (filter === "pending") return !r.hasReply;
    if (filter === "replied") return r.hasReply;
    return true;
  });

  const pendingIds = ws.reviews.filter((r) => !r.hasReply && !r.triage).map((r) => r.id);

  async function analyze(ids: string[]) {
    if (!ids.length) return;
    setBatchBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewIds: ids }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNote(data.error ?? "Analysis failed.");
        return;
      }
      setNote(
        data.failed
          ? `Analyzed ${data.analyzed}; ${data.failed} could not be processed.`
          : `Analyzed ${data.analyzed} review${data.analyzed === 1 ? "" : "s"}.`,
      );
      await refresh();
    } finally {
      setBatchBusy(false);
    }
  }

  async function analyzeOne(review: ReviewData) {
    setBusyReview(review.id);
    await analyze([review.id]);
    setBusyReview(null);
  }

  async function act(body: Record<string, unknown>, okNote: string) {
    setNote("");
    const res = await fetch("/api/reviews/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setNote(res.ok ? okNote : (data.message ?? data.error ?? "Action failed."));
    await refresh();
  }

  async function importCsv() {
    setNote("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const data = await res.json();
    setNote(res.ok ? `Imported ${data.imported} review${data.imported === 1 ? "" : "s"}.` : data.error);
    if (res.ok) { setCsv(""); setShowImport(false); await refresh(); }
  }

  async function fetchGoogle() {
    setNote("");
    const res = await fetch("/api/reviews/fetch-google", { method: "POST" });
    const data = await res.json();
    setNote(res.ok ? (data.message ?? `Imported ${data.imported} review(s) from Google.`) : data.error);
    if (res.ok) await refresh();
  }

  const cred = ws.credential;

  const googleNote = initialGoogleStatus === "connected"
    ? "Google connected. Pick your location in Settings to start fetching real reviews."
    : initialGoogleStatus === "unconfigured"
      ? "Google sign-in is not configured on this deployment yet. The admin needs to set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
      : initialGoogleStatus === "error"
        ? `Google connection failed: ${initialGoogleMessage ?? "unknown error"}`
        : null;

  async function resendVerification() {
    setNote("");
    const res = await fetch("/api/auth/resend-verification", { method: "POST" });
    const data = await res.json();
    setNote(res.ok
      ? `${data.message}${data.devLink ? ` Link: ${data.devLink}` : ""}`
      : data.error);
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-[rgba(255,255,255,0.85)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <div>
              <div className="rd-display text-base leading-tight">ReviewDesk</div>
              <div className="rd-mono leading-tight">{ws.business?.name ?? "Your workspace"}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className="rd-chip"
              title={cred ? cred.statusMessage : "Demo mode: nothing is sent to Google"}
              style={{
                color: cred?.status === "connected" ? "#166534" : "#6B7280",
                background: cred?.status === "connected" ? "#E9F9EF" : "#F6F7F9",
                borderColor: cred?.status === "connected" ? "#1D4ED8" : "#E5E7EB",
              }}
            >
              {cred?.status === "connected" ? "Google connected" : "Demo inbox"}
            </span>
            <button
              onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); onSignOut(); }}
              className="rd-mono hover:text-[#111827]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 py-8">
        {/* Stats ledger */}
        <section className="mb-8 grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="rd-card p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="rd-kicker">Desk at a glance</span>
              <span className="rd-mono">{ws.stats.pending} pending · {ws.stats.recordedToday} recorded today</span>
            </div>
            <div className="grid gap-x-8 sm:grid-cols-3">
              <LedgerStat label="In inbox" value={ws.stats.total} />
              <LedgerStat label="Replied" value={ws.stats.replied} accent />
              <LedgerStat label="Reply rate" value={`${ws.stats.total ? Math.round((ws.stats.replied / ws.stats.total) * 100) : 0}%`} accent />
            </div>
          </div>
          <div className="rd-card p-6">
            <span className="rd-kicker mb-3 block">Rating distribution</span>
            <Distribution reviews={ws.reviews} />
          </div>
        </section>

        {/* Tabs */}
        <div className="rd-tabs mb-6" role="tablist" aria-label="Workspace sections">
          {([["desk", "Desk"], ["autopilot", "Autopilot"], ["ledger", "Ledger"], ["settings", "Settings"]] as const).map(([v, label]) => (
            <button key={v} role="tab" aria-selected={tab === v} className={`rd-tab ${tab === v ? "rd-tab-active" : ""}`} onClick={() => setTab(v)}>
              {label}
              {v === "autopilot" && ws.reviews.some((r) => r.triage?.lane === "auto" && r.triage?.status === "pending") ? " ●" : ""}
            </button>
          ))}
        </div>

        {note && (
          <div className="rd-card mb-6 p-4 text-sm" style={{ background: "#E9F9EF", borderColor: "#1D4ED8", color: "#166534" }} role="status">
            {note}
          </div>
        )}

        {googleNote && (
          <div className="rd-card mb-6 p-4 text-sm" style={{ background: initialGoogleStatus === "connected" ? "#E9F9EF" : "#FBF3D9", borderColor: initialGoogleStatus === "connected" ? "#15803D" : "#854D0E", color: initialGoogleStatus === "connected" ? "#166534" : "#854D0E" }} role="status">
            {googleNote}
          </div>
        )}

        {!ws.user.emailVerified && (
          <div className="rd-card mb-6 flex flex-wrap items-center justify-between gap-3 p-4 text-sm" style={{ background: "#FBF3D9", borderColor: "#854D0E", color: "#854D0E" }} role="status">
            <span>
              <strong>Verify your email</strong>. {ws.user.email} is not verified yet. Verification keeps your account recoverable.
            </span>
            <button className="rd-btn-ghost px-4 py-2 text-xs min-h-[36px]" style={{ borderColor: "#854D0E", color: "#854D0E" }} onClick={resendVerification}>
              Resend verification link
            </button>
          </div>
        )}

        {tab === "desk" && (
          <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
            {/* Inbox */}
            <div className="rd-card flex max-h-[72vh] flex-col p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="rd-kicker">Inbox</span>
                <div className="flex gap-1.5">
                  {(["all", "pending", "replied"] as const).map((f) => (
                    <button
                      key={f}
                      className={`rd-tab !min-h-[28px] !px-2.5 !py-1 ${filter === f ? "rd-tab-active" : ""}`}
                      onClick={() => setFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  className="rd-btn-green px-4 py-2 text-xs min-h-[36px]"
                  onClick={() => analyze(pendingIds)}
                  disabled={batchBusy || !pendingIds.length}
                  style={{ opacity: batchBusy || !pendingIds.length ? 0.5 : 1 }}
                >
                  {batchBusy ? "Analyzing…" : pendingIds.length ? `Analyze all (${pendingIds.length})` : "Inbox analyzed"}
                </button>
                {cred?.status === "connected" && (
                  <button className="rd-btn-ghost px-4 py-2 text-xs min-h-[36px]" onClick={fetchGoogle}>
                    Fetch from Google
                  </button>
                )}
                <button className="rd-btn-ghost px-4 py-2 text-xs min-h-[36px]" onClick={() => setShowImport(!showImport)}>
                  Import CSV
                </button>
              </div>

              {showImport && (
                <div className="mb-3 space-y-2">
                  <textarea
                    className="rd-input min-h-[80px] font-mono text-xs"
                    placeholder={'stars,text per line, e.g. 4,"Great food but slow service"'}
                    value={csv}
                    onChange={(e) => setCsv(e.target.value)}
                    aria-label="CSV import"
                  />
                  <button className="rd-btn-ink w-full px-4 py-2 text-xs" onClick={importCsv}>Import reviews</button>
                </div>
              )}

              <div className="rd-scroll -mx-2 flex-1 overflow-y-auto px-2">
                {visible.map((r) => {
                  const isSel = r.id === selectedId;
                  const lane = r.triage?.lane;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className="mb-2 w-full rounded-xl p-3.5 text-left transition-colors"
                      style={{
                        background: isSel ? "#F6F7F9" : "#FFFFFF",
                        border: `1.5px solid ${isSel ? "#111827" : "#E5E7EB"}`,
                      }}
                      aria-current={isSel}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <Stars stars={r.stars} />
                        <span className="rd-mono">{r.source === "demo" ? "demo" : r.source}</span>
                      </div>
                      <p className="line-clamp-2 text-sm text-[#374151]">{r.text || "(star rating only)"}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {r.hasReply ? (
                          <span className="rd-chip" style={{ color: "#166534", background: "#E9F9EF", borderColor: "#15803D" }}>
                            {r.replyMode === "sent" ? "sent" : "recorded"}
                          </span>
                        ) : r.triage ? (
                          <>
                            <Stamp action={r.triage.action} />
                            {lane === "auto" && r.triage.status === "pending" && <VetoCountdown dueAt={r.triage.dueAt} />}
                          </>
                        ) : (
                          <span className="rd-chip">not analyzed</span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {!visible.length && <p className="rd-mono py-8 text-center">Nothing here under this filter.</p>}
              </div>
            </div>

            {/* Detail */}
            <div className="space-y-5">
              {!selected && <div className="rd-card p-10 text-center rd-mono">Select a review from the inbox.</div>}
              {selected && (
                <>
                  <div className="rd-card p-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Stars stars={selected.stars} />
                        <span className="rd-mono">{selected.author || "Reviewer"} · {selected.date || "recent"}</span>
                      </div>
                      <span className="rd-chip">{selected.triage?.reviewLanguage || "(none)"}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#111827]">
                      {selected.text || "(no text, star rating only)"}
                    </p>
                    {selected.triage?.reviewTranslation && (
                      <div className="mt-4 border-t border-dashed border-[#D1D5DB] pt-3">
                        <div className="rd-kicker mb-1">What it says (owner copy)</div>
                        <p className="text-sm italic text-[#374151]">{selected.triage.reviewTranslation}</p>
                      </div>
                    )}
                  </div>

                  {!selected.triage && (
                    <div className="rd-card p-6 text-center">
                      <p className="rd-mono mb-4">Not analyzed yet.</p>
                      <button className="rd-btn-ink px-6 py-2.5 text-sm" onClick={() => analyzeOne(selected)} disabled={busyReview === selected.id}>
                        {busyReview === selected.id ? "Thinking…" : "Analyze this review"}
                      </button>
                    </div>
                  )}

                  {selected.triage && (
                    <>
                      <TriageBanner triage={selected.triage} />

                      {selected.triage.draftReply && (
                        <div className="rd-card p-6">
                          <DraftCard
                            draft={selected.triage.draftReply}
                            translation={selected.triage.draftTranslation}
                            languageUsed={selected.triage.languageUsed}
                            editable={!selected.hasReply}
                            value={draftEdit}
                            onChange={setDraftEdit}
                          />
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            {!selected.hasReply ? (
                              <>
                                <button
                                  className="rd-btn-green px-6 py-2.5 text-sm"
                                  onClick={() => act({ type: "record", triageId: selected.triage!.id, draft: draftEdit }, "Recorded in your workspace (demo; nothing is sent to Google).")}
                                >
                                  Approve &amp; record
                                </button>
                                <button
                                  className="rd-btn-ghost px-5 py-2.5 text-sm"
                                  onClick={() => act({ type: "dismiss", triageId: selected.triage!.id }, "Draft dismissed.")}
                                >
                                  Dismiss
                                </button>
                                <button
                                  className="rd-mono hover:text-[#111827]"
                                  onClick={() => { navigator.clipboard?.writeText(draftEdit || selected.triage!.draftReply || ""); setNote("Draft copied to clipboard."); }}
                                >
                                  Copy draft
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="rd-chip" style={{ color: "#166534", background: "#E9F9EF", borderColor: "#15803D" }}>
                                  {selected.replyMode === "sent" ? "Sent via Google API" : "Recorded in your workspace"}
                                </span>
                                <button className="rd-btn-ghost px-5 py-2.5 text-sm" onClick={() => act({ type: "undo", reviewId: selected.id }, "Reply undone; the review is back in the desk.")}>
                                  Undo
                                </button>
                                <button className="rd-mono hover:text-[#111827]" onClick={() => { navigator.clipboard?.writeText(selected.replyText ?? ""); setNote("Reply copied to clipboard."); }}>
                                  Copy reply
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {selected.triage.action === "hold" && selected.triage.ownerChecklist.length > 0 && (
                        <div className="rd-card p-6">
                          <CheckFactsCard triage={selected.triage} />
                        </div>
                      )}

                      {selected.triage.action === "reply_needs_owner" && selected.triage.draftReply && (
                        <div className="rd-card p-6">
                          <CheckFactsCard triage={selected.triage} />
                        </div>
                      )}

                      {selected.triage.action === "report" && selected.triage.reportNote && (
                        <div className="rd-card p-6">
                          <span className="rd-kicker mb-2 block">For Google&apos;s report form</span>
                          <p className="text-sm text-[#374151]">{selected.triage.reportNote}</p>
                          <p className="rd-mono mt-3">Submit via Google&apos;s own &ldquo;report review&rdquo; option. Copy this note.</p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {tab === "autopilot" && (
          <AutopilotTab ws={ws} refresh={refresh} onNote={setNote} onOpenDesk={(id) => { setSelectedId(id); setTab("desk"); }} />
        )}
        {tab === "ledger" && <LedgerTab ws={ws} />}
        {tab === "settings" && <SettingsTab ws={ws} refresh={refresh} onNote={setNote} />}
      </main>
    </div>
  );
}
