'use client';

/**
 * TemplateLibrary.tsx, the saved reply template panel.
 * Templates are owner-written snippets they can insert into any draft.
 * Stored server-side, encrypted at rest with the rest of the workspace,
 * and never sent to the model provider.
 */

import { useCallback, useEffect, useState } from "react";
import { Trash2, Plus, Loader2 } from "lucide-react";

export interface TemplateItem {
  id: string;
  name: string;
  content: string;
  category: string;
  usageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

const CATEGORIES = ["general", "positive", "negative", "apologetic", "formal"];

export default function TemplateLibrary({
  onNote,
}: {
  onNote: (note: string) => void;
}) {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/templates");
      if (!res.ok) return;
      const data = await res.json();
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    if (!name.trim() || !content.trim()) {
      onNote("Template needs a name and content.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content, category }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNote(data.error ?? "Could not save the template.");
        return;
      }
      setName("");
      setContent("");
      setCategory("general");
      setShowForm(false);
      onNote("Template saved.");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    const data = await res.json();
    onNote(res.ok ? "Template deleted." : (data.error ?? "Could not delete the template."));
    await load();
  }

  async function copy(t: TemplateItem) {
    await navigator.clipboard?.writeText(t.content);
    onNote(`Template "${t.name}" copied.`);
  }

  return (
    <section className="card card-border bg-base-100 p-6">
      <div className="rd-double-rule mb-5" />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="rd-kicker mb-1">Reply templates</div>
          <p className="text-sm text-[#374151]">
            Save the phrases you reuse. Insert one into any draft, then edit it before you copy.
          </p>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => setShowForm(!showForm)}
          aria-expanded={showForm}
        >
          {showForm ? "Cancel" : <><Plus size={14} aria-hidden="true" /> New template</>}
        </button>
      </div>

      {showForm && (
        <div className="mb-5 space-y-3 rounded-[10px] border border-base-300 bg-base-200 p-4">
          <input
            className="input w-full"
            placeholder="Template name (e.g. Thank a regular)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Template name"
            maxLength={120}
          />
          <textarea
            className="textarea w-full min-h-[90px]"
            placeholder="The reply text. Plain words work best."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            aria-label="Template content"
            maxLength={2000}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="select select-sm w-auto"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Template category"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              className="btn btn-primary btn-sm"
              onClick={create}
              disabled={saving}
            >
              {saving ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
              Save template
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="rd-mono py-6 text-center">Loading templates…</p>
      ) : templates.length === 0 ? (
        <p className="rd-mono py-6 text-center">
          No templates yet. Save a phrase you reply with often.
        </p>
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li
              key={t.id}
              className="flex items-start gap-3 rounded-[10px] border border-base-300 bg-base-200 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[#111827]">{t.name}</span>
                  <span className="badge badge-outline font-mono text-[10px]">{t.category}</span>
                  {t.usageCount ? (
                    <span className="rd-mono text-[10px]">used {t.usageCount}</span>
                  ) : null}
                </div>
                <p className="text-sm leading-relaxed text-[#374151]">{t.content}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  className="btn btn-ghost btn-xs rd-mono"
                  onClick={() => copy(t)}
                  aria-label={`Copy template ${t.name}`}
                >
                  Copy
                </button>
                <button
                  className="btn btn-ghost btn-xs text-error"
                  onClick={() => remove(t.id)}
                  aria-label={`Delete template ${t.name}`}
                >
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
