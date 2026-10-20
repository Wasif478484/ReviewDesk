"use client";

/**
 * LedgerTab.tsx, the audit ledger: every decision, approval, veto and undo
 * with reasons, newest first. Rendered as a daisyUI table.
 */

import type { WorkspaceData } from "@/types/reviewdesk";
import { ACTION_META } from "@/types/reviewdesk";

export default function LedgerTab({ ws }: { ws: WorkspaceData }) {
  const fmt = (ts: string) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <section className="card card-border bg-base-100 p-6">
      <div className="rd-double-rule mb-5" />
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <div className="rd-kicker mb-1">The ledger</div>
          <h2 className="rd-display text-xl">Every decision, on the record</h2>
        </div>
        <span className="rd-mono">{ws.audits.length} entries</span>
      </div>

      {ws.audits.length === 0 ? (
        <p className="rd-mono py-8 text-center">
          No entries yet. Analyze a review to start the ledger.
        </p>
      ) : (
        <div className="rd-scroll max-h-[64vh] overflow-y-auto pr-1">
          <table className="table table-sm">
            <thead>
              <tr>
                <th className="rd-kicker">When</th>
                <th className="rd-kicker">Action</th>
                <th className="rd-kicker">Status</th>
                <th className="rd-kicker">Actor</th>
                <th className="rd-kicker">Detail</th>
              </tr>
            </thead>
            <tbody>
              {ws.audits.map((a) => {
                const meta = ACTION_META[a.action];
                const statusBadge =
                  a.status === "failed"
                    ? "badge-error"
                    : a.status === "recorded_demo" || a.status === "sent"
                      ? "badge-success"
                      : a.status === "deferred" || a.status === "dry_run"
                        ? "badge-warning"
                        : "badge-ghost";
                return (
                  <tr key={a.id} className="align-top">
                    <td className="whitespace-nowrap font-mono text-xs font-semibold text-[#111827]">
                      {fmt(a.timestamp)}
                    </td>
                    <td>
                      <span className="badge badge-ghost badge-sm font-mono">
                        {meta?.label ?? (a.action || "(none)")}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-soft badge-sm font-mono ${statusBadge}`}>
                        {a.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-[#6B7280]">{a.actor}</td>
                    <td className="min-w-0">
                      {a.excerpt && (
                        <p className="line-clamp-1 text-sm text-[#374151]">
                          &ldquo;{a.excerpt}&rdquo;
                        </p>
                      )}
                      {a.reasons.length > 0 && (
                        <p className="mt-0.5 text-xs text-[#6B7280]">{a.reasons.join(" · ")}</p>
                      )}
                      {a.error && <p className="mt-0.5 text-xs text-error">{a.error}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
