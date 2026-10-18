'use client';

/**
 * LedgerTab.tsx, the audit ledger: every decision, approval, veto and undo
 * with reasons, newest first.
 */

import type { WorkspaceData } from "@/types/reviewdesk";
import { ACTION_META } from "@/types/reviewdesk";

export default function LedgerTab({ ws }: { ws: WorkspaceData }) {
  const fmt = (ts: string) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <section className="rd-card p-6">
      <div className="rd-double-rule mb-5" />
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <div className="rd-kicker mb-1">The ledger</div>
          <h2 className="rd-display text-xl">Every decision, on the record</h2>
        </div>
        <span className="rd-mono">{ws.audits.length} entries</span>
      </div>

      {ws.audits.length === 0 ? (
        <p className="rd-mono py-8 text-center">No entries yet. Analyze a review to start the ledger.</p>
      ) : (
        <div className="rd-scroll max-h-[64vh] overflow-y-auto pr-1">
          {ws.audits.map((a) => {
            const meta = ACTION_META[a.action];
            const statusColor =
              a.status === "failed" ? "#DC2626"
              : a.status === "recorded_demo" || a.status === "sent" ? "#15803D"
              : a.status === "deferred" || a.status === "dry_run" ? "#854D0E"
              : "#57534E";
            return (
              <article key={a.id} className="rd-ledger-row !items-start">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="rd-mono font-semibold" style={{ color: "#111827" }}>{fmt(a.timestamp)}</span>
                    <span className="rd-chip">{meta?.label ?? (a.action || "(none)")}</span>
                    <span className="rd-chip" style={{ color: statusColor, borderColor: statusColor }}>{a.status.replace(/_/g, " ")}</span>
                    <span className="rd-mono">by {a.actor}</span>
                  </div>
                  {a.excerpt && <p className="line-clamp-1 text-sm text-[#374151]">&ldquo;{a.excerpt}&rdquo;</p>}
                  {a.reasons.length > 0 && (
                    <p className="mt-1 text-xs text-[#6B7280]">{a.reasons.join(" · ")}</p>
                  )}
                  {a.error && <p className="mt-1 text-xs" style={{ color: "#DC2626" }}>{a.error}</p>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
