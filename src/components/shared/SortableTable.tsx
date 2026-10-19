'use client';

import { useState, useMemo } from "react";
import { ArrowUpDown } from "lucide-react";
import { Stamp, Stars } from "@/components/shared/bits";
import type { ReviewData } from "@/types/reviewdesk";

type SortDirection = "asc" | "desc" | null;

interface SortableTableProps {
  reviews: ReviewData[];
  onSelect: (id: string) => void;
  selectedId: string | null;
  onAnalyze: (id: string) => void;
  onRecord: (triageId: string, draft: string) => void;
  onDismiss: (triageId: string) => void;
  onCopy: (text: string) => void;
}

export default function SortableTable({
  reviews,
  onSelect,
  selectedId,
  onAnalyze,
  onRecord,
  onDismiss,
  onCopy,
}: SortableTableProps) {
  const [sort, setSort] = useState<{ key: keyof ReviewData; dir: SortDirection } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return reviews;
    const { key, dir } = sort;
    return [...reviews].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av === null || av === undefined) return dir === "asc" ? 1 : -1;
      if (bv === null || bv === undefined) return dir === "asc" ? -1 : 1;
      const cmp = String(av).localeCompare(String(bv));
      return dir === "asc" ? cmp : -cmp;
    });
  }, [reviews, sort]);

  const headerCells: { key: keyof ReviewData; label: string; sortable: boolean }[] = [
    { key: "stars", label: "★", sortable: true },
    { key: "text", label: "Review text", sortable: true },
    { key: "author", label: "Author", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "source", label: "Source", sortable: true },
  ];

  const toggleSort = (key: keyof ReviewData) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  if (sorted.length === 0) {
    return (
      <div className="rd-empty">
        <p>No reviews under this filter.</p>
        <p className="text-xs text-[#6B7280]">Import CSV or analyze the demo inbox.</p>
      </div>
    );
  }

  return (
    <div className="card card-border bg-base-100 p-5">
      <table className="rd-table rd-scroll">
        <thead className="sticky top-0 z-10">
          <tr>
            {headerCells.map((c) => (
              <th
                key={c.key}
                className={`text-left ${c.sortable ? "sortable hover:text-[#111827]" : ""}`}
                onClick={c.sortable ? () => toggleSort(c.key) : undefined}
              >
                {c.label}
                {c.sortable && sort?.key === c.key ? (
                  <span className={`sort-indicator ${sort.dir === "asc" ? "sort-asc" : "sort-desc"}`} />
                ) : c.sortable && sort === null && (
                  <span className="sort-indicator" />
                )}
                {c.sortable && <ArrowUpDown className="ml-1 h-3 w-3 text-[#9CA3AF]" aria-hidden="true" />}
              </th>
            ))}
            <th className="text-left w-24">Decision</th>
            <th className="text-left w-20">Lane</th>
            <th className="text-left w-48">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const isSel = r.id === selectedId;
            const lane = r.triage?.lane;
            const status = r.triage?.status;
            const triage = r.triage;
            return (
              <tr
                key={r.id}
                onClick={() => onSelect(r.id)}
                className={`group cursor-pointer ${isSel ? "selected" : ""}`}
                aria-current={isSel}
              >
                <td className="font-mono text-xs font-semibold text-[#111827]">
                  {r.stars == null ? "—" : r.stars}
                </td>
                <td className="line-clamp-2 text-sm leading-snug text-[#374151]">
                  {r.text || "(star rating only)"}
                </td>
                <td className="font-mono text-xs text-[#374151]">{r.author || "Reviewer"}</td>
                <td className="font-mono text-xs text-[#374151]">{r.date || "—"}</td>
                <td className="font-mono text-xs text-[#6B7280]">{r.source === "demo" ? "demo" : r.source}</td>
                <td>
                  {r.hasReply ? (
                    <span className="badge badge-soft badge-success font-mono text-[10px]">
                      {r.replyMode === "sent" ? "sent" : "recorded"}
                    </span>
                  ) : triage ? (
                    <Stamp action={triage.action} />
                  ) : (
                    <span className="badge badge-outline font-mono text-[10px]">not analyzed</span>
                  )}
                </td>
                <td>
                  {lane === "auto" && status === "pending" ? (
                    <span className="font-mono text-xs text-[#854D0E]">auto·pending</span>
                  ) : lane === "queue" ? (
                    <span className="font-mono text-xs text-[#6B7280]">queue</span>
                  ) : lane === "done" ? (
                    <span className="font-mono text-xs text-[#15803D]">done</span>
                  ) : (
                    <span className="font-mono text-xs text-[#9CA3AF]">—</span>
                  )}
                </td>
                <td>
                  <div className="rd-action-row">
                    {!r.hasReply && triage ? (
                      <>
                        <button
                          className="btn btn-primary btn-xs rd-mono"
                          onClick={(e) => { e.stopPropagation(); onRecord(triage!.id, triage!.draftReply ?? ""); }}
                          disabled={lane === "auto" && status === "pending"}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-outline btn-xs rd-mono"
                          onClick={(e) => { e.stopPropagation(); onDismiss(triage!.id); }}
                        >
                          Dismiss
                        </button>
                        <button
                          className="btn btn-ghost btn-xs rd-mono"
                          onClick={(e) => { e.stopPropagation(); onCopy(triage!.draftReply ?? ""); }}
                          disabled={!triage!.draftReply}
                        >
                          Copy
                        </button>
                      </>
                    ) : !r.hasReply && !r.triage ? (
                      <button
                        className="btn btn-outline btn-xs rd-mono"
                        onClick={(e) => { e.stopPropagation(); onAnalyze(r.id); }}
                      >
                        Analyze
                      </button>
                    ) : (
                      <button
                        className="btn btn-ghost btn-xs rd-mono"
                        onClick={(e) => { e.stopPropagation(); onCopy(r.replyText ?? ""); }}
                      >
                        Copy reply
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
