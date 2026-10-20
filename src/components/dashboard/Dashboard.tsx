'use client';

/**
 * Dashboard.tsx, the owner's desk after onboarding: top ledger bar, stats,
 and tabs (Desk / Autopilot / Ledger / Settings), built on daisyUI
 components (tabs-box, alert, badge, btn). The Desk tab is the
 single-review triage surface.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { LogoMark, Stars, TriageBanner, CheckFactsCard, Distribution, Breakdown, LedgerStat, ReplyComposer, CopyReviewAndReply, ReplyTemplates } from "@/components/shared/bits";
import SortableTable from "@/components/shared/SortableTable";
import { ACTION_META, type ReviewData, type WorkspaceData } from "@/types/reviewdesk";
import AutopilotTab from "@/components/dashboard/AutopilotTab";
import LedgerTab from "@/components/dashboard/LedgerTab";
import SettingsTab from "@/components/dashboard/SettingsTab";

type Tab = "desk" | "autopilot" | "ledger" | "settings";

/** Review sources the desk can hold. Google is the live connection; the rest
 *  are import channels, so each one is a normal API-backed source, not a
 *  scraper. */
const SOURCES = ["demo", "google", "yelp", "facebook", "tripadvisor", "imported"];

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
  const [importSource, setImportSource] = useState("imported");
  const [draftEdit, setDraftEdit] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "replied">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [tone, setTone] = useState<"warm" | "formal" | "apologetic">("warm");
  const [draftHistory, setDraftHistory] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState("");

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

  // Track draft versions when the user edits.
  useEffect(() => {
    if (selected && draftEdit && draftEdit !== selected.triage?.draftReply) {
      addToDraftHistory(selected.id, draftEdit);
    }
  }, [draftEdit, selected]);

  // Keyboard shortcuts: A=analyze, R=record, C=copy draft, D=dismiss, V=revert draft
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (!selected || !selected.triage) return;
      const key = e.key.toLowerCase();
      if (key === "a") { e.preventDefault(); analyzeOne(selected); }
      else if (key === "r") { e.preventDefault(); act({ type: "record", triageId: selected.triage.id, draft: draftEdit }, "Recorded in your workspace."); }
      else if (key === "c") { e.preventDefault(); navigator.clipboard?.writeText(draftEdit || selected.triage.draftReply || ""); setNote("Draft copied."); }
      else if (key === "d") { e.preventDefault(); act({ type: "dismiss", triageId: selected.triage.id }, "Draft dismissed."); }
      else if (key === "v") { e.preventDefault(); const hist = draftHistory[selected.id] ?? []; if (hist.length) revertDraft(selected.id, hist[hist.length - 1]); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, draftEdit, draftHistory]);

  const visible = ws.reviews.filter((r) => {
    if (filter === "pending") return !r.hasReply;
    if (filter === "replied") return r.hasReply;
    return true;
  }).filter((r) => {
    if (sourceFilter !== "all" && r.source !== sourceFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (r.text ?? "").toLowerCase().includes(q)
      || (r.author ?? "").toLowerCase().includes(q)
      || (r.stars ?? 0).toString().includes(q);
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
      body: JSON.stringify({ csv, source: importSource }),
    });
    const data = await res.json();
    setNote(res.ok ? `Imported ${data.imported} review${data.imported === 1 ? "" : "s"} from ${importSource}.` : data.error);
    if (res.ok) { setCsv(""); setShowImport(false); await refresh(); }
  }

  async function exportCsv() {
    setNote("");
    const rows = ws.reviews.map((r) =>
      `${r.stars ?? ""},"${(r.text ?? "").replace(/"/g, '""')}","${r.author ?? ""}","${r.date ?? ""}"`
    );
    const csvContent = `stars,text,author,date\n${rows.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reviewdesk-reviews-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setNote(`Exported ${ws.reviews.length} review${ws.reviews.length === 1 ? "" : "s"} to CSV.`);
  }

  async function exportTriageCsv() {
    setNote("");
    const rows = ws.reviews
      .filter((r) => r.triage)
      .map((r) => {
        const t = r.triage!;
        return `${r.id},"${(r.text ?? "").replace(/"/g, '""')}",${t.action},${t.sentiment},"${(t.flags ?? []).join(";")}","${(t.reason ?? "").replace(/"/g, '""')}",${t.reviewLanguage},${t.languageUsed}`;
      });
    const csvContent = `review_id,text,action,sentiment,flags,reason,review_language,language_used\n${rows.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reviewdesk-triage-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setNote(`Exported triage results for ${rows.length} review${rows.length === 1 ? "" : "s"} to CSV.`);
  }

  async function bulkRecord(triageIds: string[], drafts: string[]) {
    setNote("");
    let ok = 0;
    let failed = 0;
    for (let i = 0; i < triageIds.length; i++) {
      const res = await fetch("/api/reviews/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "record", triageId: triageIds[i], draft: drafts[i] }),
      });
      if (res.ok) ok++;
      else failed++;
    }
    setNote(`Recorded ${ok} review${ok === 1 ? "" : "s"}${failed ? `; ${failed} failed` : ""}.`);
    await refresh();
  }

  async function bulkDismiss(triageIds: string[]) {
    setNote("");
    let ok = 0;
    let failed = 0;
    for (const id of triageIds) {
      const res = await fetch("/api/reviews/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "dismiss", triageId: id }),
      });
      if (res.ok) ok++;
      else failed++;
    }
    setNote(`Dismissed ${ok} review${ok === 1 ? "" : "s"}${failed ? `; ${failed} failed` : ""}.`);
    await refresh();
  }

  async function bulkCopyDrafts(items: { id: string; draft: string }[]) {
    const text = items.map(({ id, draft }) => `Review ${id}:\n${draft}\n`).join("\n---\n");
    await navigator.clipboard?.writeText(text);
    setNote(`Copied ${items.length} draft${items.length === 1 ? "" : "s"} to clipboard.`);
  }

  async function reanalyzeWithTone(review: ReviewData, newTone: string) {
    setNote("");
    setBusyReview(review.id);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: review.id, tone: newTone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNote(data.error ?? "Re-analysis failed.");
        return;
      }
      setDraftHistory((prev) => {
        const cur = prev[review.id] ?? [];
        return { ...prev, [review.id]: [...cur.slice(-4), draftEdit] };
      });
      setDraftEdit(selected?.triage?.draftReply ?? "");
      setNote(`Re-analyzed with "${newTone}" tone.`);
    } finally {
      setBusyReview(null);
      await refresh();
    }
  }

  function addToDraftHistory(reviewId: string, draft: string) {
    setDraftHistory((prev) => {
      const cur = prev[reviewId] ?? [];
      const next = [...cur, draft].slice(-5);
      return { ...prev, [reviewId]: next };
    });
  }

  function revertDraft(reviewId: string, version: string) {
    setDraftEdit(version);
    setNote("Reverted to earlier draft version.");
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
    <div className="relative min-h-screen overflow-x-clip">
      <div className="rd-aurora h-[460px] opacity-70" aria-hidden="true"><i /></div>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-base-300 bg-base-100/85 backdrop-blur-md">
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
              className={`badge badge-soft font-mono ${cred?.status === "connected" ? "badge-success" : "badge-ghost"}`}
              title={cred ? cred.statusMessage : "Demo mode: nothing is sent to Google"}
            >
              {cred?.status === "connected" ? "Google connected" : "Demo inbox"}
            </span>
            <button
              onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); onSignOut(); }}
              className="btn btn-ghost btn-sm rd-mono"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1200px] px-6 py-8">
        {/* Stats ledger */}
        <section className="mb-8 grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="card card-border bg-base-100 p-6">
            <div className="mb-3 flex items-center justify-between">
              <span className="rd-kicker">Desk at a glance</span>
              <span className="rd-mono">{ws.stats.pending} pending · {ws.stats.recordedToday} recorded today</span>
            </div>
            <div className="grid gap-x-8 sm:grid-cols-3">
              <LedgerStat label="In inbox" value={ws.stats.total} />
              <LedgerStat label="Replied" value={ws.stats.replied} accent />
              <LedgerStat label="Reply rate" value={`${ws.stats.total ? Math.round((ws.stats.replied / ws.stats.total) * 100) : 0}%`} accent />
            </div>
            {ws.analytics && (
              <div className="mt-6 border-t border-base-300 pt-4">
                <div className="rd-kicker mb-3">Breakdown</div>
                <div className="grid gap-6 sm:grid-cols-3">
                  <Breakdown
                    title="Actions"
                    counts={ws.analytics.actionCounts}
                    order={["reply", "reply_needs_owner", "hold", "report"]}
                    labels={{ reply: "Reply", reply_needs_owner: "Check facts", hold: "Hold", report: "Report" }}
                  />
                  <Breakdown
                    title="Priority"
                    counts={ws.analytics.priorityCounts}
                    order={["urgent", "normal", "low"]}
                    labels={{ urgent: "Urgent", normal: "Normal", low: "Low" }}
                  />
                  <Breakdown
                    title="Sources"
                    counts={ws.analytics.sourceCounts}
                    order={Object.keys(ws.analytics.sourceCounts)}
                    labels={Object.fromEntries(
                      Object.keys(ws.analytics.sourceCounts).map((k) => [k, k]),
                    )}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="card card-border bg-base-100 p-6">
            <span className="rd-kicker mb-3 block">Rating distribution</span>
            <Distribution reviews={ws.reviews} />
          </div>
        </section>

        {/* Tabs: daisyUI */}
        <div className="tabs tabs-box mb-6 w-fit" role="tablist" aria-label="Workspace sections">
          {([["desk", "Desk"], ["autopilot", "Autopilot"], ["ledger", "Ledger"], ["settings", "Settings"]] as const).map(([v, label]) => (
            <button key={v} role="tab" aria-selected={tab === v} className={`tab ${tab === v ? "tab-active" : ""}`} onClick={() => setTab(v)}>
              {label}
              {v === "autopilot" && ws.reviews.some((r) => r.triage?.lane === "auto" && r.triage?.status === "pending") ? " ●" : ""}
            </button>
          ))}
        </div>

        {note && (
          <div className="alert alert-success mb-6" role="status">
            <span className="text-sm">{note}</span>
          </div>
        )}

        {googleNote && (
          <div className={`alert mb-6 ${initialGoogleStatus === "connected" ? "alert-success" : "alert-warning"}`} role="status">
            <span className="text-sm">{googleNote}</span>
          </div>
        )}

        {!ws.user.emailVerified && (
          <div className="alert alert-warning mb-6" role="status">
            <span className="text-sm">
              <strong>Verify your email</strong>. {ws.user.email} is not verified yet. Verification keeps your account recoverable.
            </span>
            <button className="btn btn-outline btn-sm" onClick={resendVerification}>
              Resend verification link
            </button>
          </div>
        )}

        <div key={tab} className="rd-enter">
        {tab === "desk" && (
          <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
            {/* Inbox */}
            <div className="card card-border bg-base-100 flex max-h-[72vh] flex-col p-5">
              <div className="mb-3 flex flex-wrap gap-2 items-start">
                <div className="tabs tabs-box tabs-xs flex-1" role="group" aria-label="Inbox filter">
                  {(["all", "pending", "replied"] as const).map((f) => (
                    <button
                      key={f}
                      className={`tab ${filter === f ? "tab-active" : ""}`}
                      onClick={() => setFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  className="input input-sm flex-1 sm:w-[240px] font-mono text-xs"
                  placeholder="Search reviews by text or author…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search reviews"
                />
                <select
                  className="select select-sm w-auto min-w-[120px] mt-1 sm:mt-0"
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  aria-label="Filter by source"
                >
                  <option value="all">All sources</option>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <span className="rd-mono text-xs whitespace-nowrap mt-1 sm:mt-0">Tone:</span>
                <select
                  className="select select-sm w-auto min-w-[120px] mt-1 sm:mt-0"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as "warm" | "formal" | "apologetic")}
                  aria-label="Reply tone"
                >
                  <option value="warm">Warm</option>
                  <option value="formal">Formal</option>
                  <option value="apologetic">Apologetic</option>
                </select>
                <button
                  className="btn btn-outline btn-sm mt-1 sm:mt-0"
                  onClick={() => selected && reanalyzeWithTone(selected, tone)}
                  disabled={!selected || !selected.triage}
                >
                  Re-analyze
                </button>
                <button
                  className="btn btn-primary btn-sm mt-1 sm:mt-0"
                  onClick={() => analyze(pendingIds)}
                  disabled={batchBusy || !pendingIds.length}
                >
                  {batchBusy ? <span className="loading loading-spinner loading-xs" aria-hidden="true" /> : null}
                  {batchBusy ? "Analyzing" : pendingIds.length ? `Analyze all (${pendingIds.length})` : "Inbox analyzed"}
                </button>
                {cred?.status === "connected" && (
                  <button className="btn btn-outline btn-sm mt-1 sm:mt-0" onClick={fetchGoogle}>
                    Fetch from Google
                  </button>
                )}
                <button className="btn btn-outline btn-sm mt-1 sm:mt-0" onClick={() => setShowImport(!showImport)}>
                  Import CSV
                </button>
                <button className="btn btn-outline btn-sm rd-mono mt-1 sm:mt-0" onClick={exportCsv}>
                  Export reviews CSV
                </button>
                <button className="btn btn-outline btn-sm rd-mono mt-1 sm:mt-0" onClick={exportTriageCsv}>
                  Export triage CSV
                </button>
              </div>

              {showImport && (
                <div className="mb-3 space-y-2">
                  <textarea
                    className="textarea w-full min-h-[80px] font-mono text-xs"
                    placeholder={'stars,text per line, e.g. 4,"Great food but slow service"'}
                    value={csv}
                    onChange={(e) => setCsv(e.target.value)}
                    aria-label="CSV import"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="select select-sm w-auto min-w-[130px]"
                      value={importSource}
                      onChange={(e) => setImportSource(e.target.value)}
                      aria-label="Import source"
                    >
                      {SOURCES.filter((s) => s !== "demo" && s !== "google").map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button className="btn btn-neutral btn-sm flex-1" onClick={importCsv}>Import reviews</button>
                  </div>
                </div>
              )}

              <div className="rd-scroll -mx-2 flex-1 overflow-y-auto px-2">
                <SortableTable
                  reviews={visible}
                  onSelect={(id) => setSelectedId(id)}
                  selectedId={selectedId}
                  onAnalyze={(id) => analyzeOne(visible.find((r) => r.id === id)!)}
                  onRecord={(triageId, draft) => act({ type: "record", triageId, draft }, "Recorded in your workspace (demo; nothing is sent to Google).")}
                  onDismiss={(triageId) => act({ type: "dismiss", triageId }, "Draft dismissed.")}
                  onCopy={(text) => { navigator.clipboard?.writeText(text); setNote("Draft copied to clipboard."); }}
                  onBulkRecord={bulkRecord}
                  onBulkDismiss={bulkDismiss}
                  onBulkCopy={bulkCopyDrafts}
                />
                {!visible.length && <p className="rd-mono py-8 text-center">Nothing here under this filter.</p>}
              </div>
            </div>

            {/* Detail */}
            <div className="space-y-5">
              {!selected && <div className="card card-border bg-base-100 p-10 text-center rd-mono">Select a review from the inbox.</div>}
              {selected && (
                <>
                  <div className="card card-border bg-base-100 p-6">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Stars stars={selected.stars} />
                        <span className="rd-mono">{selected.author || "Reviewer"} · {selected.date || "recent"}</span>
                      </div>
                      <span className="badge badge-ghost font-mono">{selected.triage?.reviewLanguage || "(none)"}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[#111827]">
                      {selected.text || "(no text, star rating only)"}
                    </p>
                    {selected.triage?.reviewTranslation && (
                      <div className="mt-4 border-t border-dashed border-base-300 pt-3">
                        <div className="rd-kicker mb-1">What it says (owner copy)</div>
                        <p className="text-sm italic text-[#374151]">{selected.triage.reviewTranslation}</p>
                      </div>
                    )}
                  </div>

                  {!selected.triage && (
                    <div className="card card-border bg-base-100 p-6 text-center">
                      <p className="rd-mono mb-4">Not analyzed yet.</p>
                      <button className="btn btn-neutral" onClick={() => analyzeOne(selected)} disabled={busyReview === selected.id}>
                        {busyReview === selected.id ? <span className="loading loading-spinner loading-sm" aria-hidden="true" /> : null}
                        {busyReview === selected.id ? "Thinking" : "Analyze this review"}
                      </button>
                    </div>
                  )}

                  {selected.triage && (
                    <>
                      <TriageBanner triage={selected.triage} />

                      {selected.triage.draftReply && (
                        <div className="card card-border bg-base-100 p-6">
                          <ReplyComposer
                            draft={selected.triage.draftReply}
                            translation={selected.triage.draftTranslation}
                            languageUsed={selected.triage.languageUsed}
                            value={draftEdit}
                            onChange={setDraftEdit}
                            signOff={ws.business?.signOff}
                            ownerLanguage={ws.business?.ownerLanguage}
                            editable={!selected.hasReply}
                          />
                          {!selected.hasReply && (
                            <ReplyTemplates
                              onInsert={(phrase) => {
                                setDraftEdit((prev) =>
                                  prev ? `${prev} ${phrase}` : phrase,
                                );
                              }}
                            />
                          )}
                          {selected.id && draftHistory[selected.id]?.length && (
                            <div className="mt-3 rounded-lg border border-base-300 bg-base-200 p-3">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="rd-kicker text-xs">Draft versions</span>
                                <span className="rd-mono text-xs">{draftHistory[selected.id]!.length} saved</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {draftHistory[selected.id]!.map((v, i) => (
                                  <button
                                    key={i}
                                    className="btn btn-ghost btn-xs rd-mono"
                                    onClick={() => revertDraft(selected.id, v)}
                                    title="Revert to this version"
                                  >
                                    v{i + 1}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="mt-4 flex flex-wrap items-center gap-3">
                            {!selected.hasReply ? (
                              <>
                                <CopyReviewAndReply
                                  review={selected}
                                  draft={draftEdit || selected.triage!.draftReply || ""}
                                  signOff={ws.business?.signOff}
                                  onCopied={() => setNote("Reviewer + reply copied to clipboard.")}
                                />
                                <button
                                  className="btn btn-primary"
                                  onClick={() => act({ type: "record", triageId: selected.triage!.id, draft: draftEdit }, "Recorded in your workspace (demo; nothing is sent to Google).")}
                                >
                                  Approve &amp; record
                                </button>
                                <button
                                  className="btn btn-outline"
                                  onClick={() => act({ type: "dismiss", triageId: selected.triage!.id }, "Draft dismissed.")}
                                >
                                  Dismiss
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm rd-mono"
                                  onClick={() => { navigator.clipboard?.writeText(draftEdit || selected.triage!.draftReply || ""); setNote("Draft copied to clipboard."); }}
                                >
                                  Copy draft only
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="badge badge-soft badge-success font-mono">
                                  {selected.replyMode === "sent" ? "Sent via Google API" : "Recorded in your workspace"}
                                </span>
                                <button className="btn btn-outline btn-sm" onClick={() => act({ type: "undo", reviewId: selected.id }, "Reply undone; the review is back in the desk.")}>
                                  Undo
                                </button>
                                <button className="btn btn-ghost btn-sm rd-mono" onClick={() => { navigator.clipboard?.writeText(selected.replyText ?? ""); setNote("Reply copied to clipboard."); }}>
                                  Copy reply
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {selected.triage.action === "hold" && selected.triage.ownerChecklist.length > 0 && (
                        <div className="card card-border bg-base-100 p-6">
                          <CheckFactsCard triage={selected.triage} />
                        </div>
                      )}

                      {selected.triage.action === "reply_needs_owner" && selected.triage.draftReply && (
                        <div className="card card-border bg-base-100 p-6">
                          <CheckFactsCard triage={selected.triage} />
                        </div>
                      )}

                      {selected.triage.action === "report" && selected.triage.reportNote && (
                        <div className="card card-border bg-base-100 p-6">
                          <span className="rd-kicker mb-2 block">For Google&apos;s report form</span>
                          <p className="text-sm text-[#374151]">{selected.triage.reportNote}</p>
                          <p className="rd-mono mt-3">Submit via Google&apos;s own &ldquo;report review&rdquo; option. Copy this note.</p>
                        </div>
                      )}

                      {!selected.hasReply && (
                        <div className="mt-4 p-3 rounded-lg border border-base-300 bg-base-200 text-xs text-[#6B7280]">
                          <span className="rd-kicker block mb-1">Keyboard shortcuts</span>
                          <span className="font-mono">A</span> Analyze · <span className="font-mono">R</span> Record · <span className="font-mono">C</span> Copy draft · <span className="font-mono">D</span> Dismiss · <span className="font-mono">V</span> Revert draft
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
        </div>
      </main>
    </div>
  );
}
