'use client';

/**
 * TeamPanel.tsx, organization, members and automation rules.
 *
 * One organization per workspace. Members have a role:
 *   owner    - everything, including removing people and editing rules
 *   manager  - add people, edit rules, triage
 *   responder- triage and record replies
 *   viewer   - read only
 *
 * Rules let the owner force the triage action or raise the priority for
 * reviews that match a condition. A rule never posts anything to Google.
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";

type Role = "owner" | "manager" | "responder" | "viewer";
type Action = "reply" | "reply_needs_owner" | "hold" | "report";
type Priority = "urgent" | "normal" | "low";

interface Member {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: Role;
}

interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  minStars: number | null;
  maxStars: number | null;
  keywords: string[] | string;
  language: string;
  forceAction: string;
  setPriority: string;
}

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: Role;
  members: Member[];
}

const ROLES: Role[] = ["owner", "manager", "responder", "viewer"];
const ACTIONS: Action[] = ["reply", "reply_needs_owner", "hold", "report"];
const PRIORITIES: Priority[] = ["urgent", "normal", "low"];

const ROLE_BLURB: Record<Role, string> = {
  owner: "Everything, including removing people and editing rules.",
  manager: "Add people, edit rules, and work the desk.",
  responder: "Work the desk: analyze, draft, record.",
  viewer: "Read only. Cannot change anything.",
};

export default function TeamPanel({
  organizationId,
  onNote,
}: {
  organizationId: string | null | undefined;
  onNote: (note: string) => void;
}) {
  const [org, setOrg] = useState<Org | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("responder");
  const [showMemberForm, setShowMemberForm] = useState(false);

  const [ruleName, setRuleName] = useState("");
  const [ruleAction, setRuleAction] = useState<Action | "">("");
  const [rulePriority, setRulePriority] = useState<Priority | "">("");
  const [ruleKeywords, setRuleKeywords] = useState("");
  const [showRuleForm, setShowRuleForm] = useState(false);

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    try {
      const [orgRes, ruleRes] = await Promise.all([
        fetch(`/api/organizations/${organizationId}`),
        fetch(`/api/organizations/${organizationId}/rules`),
      ]);
      if (orgRes.ok) {
        const data = await orgRes.json();
        setOrg(data.organization);
      }
      if (ruleRes.ok) {
        const data = await ruleRes.json();
        setRules(Array.isArray(data.rules) ? data.rules : []);
      }
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addMember() {
    if (!org || !email.trim()) {
      onNote("Enter the email of an existing ReviewDesk account.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/organizations/${org.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: newRole }),
      });
      const data = await res.json();
      onNote(res.ok ? `${data.member.name} added as ${data.member.role}.` : (data.error ?? "Could not add member."));
      if (res.ok) {
        setEmail("");
        setShowMemberForm(false);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(memberId: string, role: Role) {
    if (!org) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/organizations/${org.id}/members/${memberId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      onNote(res.ok ? "Role updated." : (data.error ?? "Could not update role."));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(memberId: string, name: string) {
    if (!org) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/organizations/${org.id}/members/${memberId}`, { method: "DELETE" });
      const data = await res.json();
      onNote(res.ok ? `${name} removed.` : (data.error ?? "Could not remove member."));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function addRule() {
    if (!org || !ruleName.trim()) {
      onNote("Give the rule a name.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/organizations/${org.id}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ruleName,
          forceAction: ruleAction,
          setPriority: rulePriority,
          keywords: ruleKeywords.split(",").map((k) => k.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      onNote(res.ok ? "Rule saved." : (data.error ?? "Could not save rule."));
      if (res.ok) {
        setRuleName("");
        setRuleAction("");
        setRulePriority("");
        setRuleKeywords("");
        setShowRuleForm(false);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeRule(ruleId: string, name: string) {
    if (!org) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/organizations/${org.id}/rules/${ruleId}`, { method: "DELETE" });
      const data = await res.json();
      onNote(res.ok ? `Rule "${name}" removed.` : (data.error ?? "Could not remove rule."));
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="card card-border bg-base-100 p-6">
        <p className="rd-mono py-6 text-center">Loading team…</p>
      </section>
    );
  }

  if (!org) {
    return (
      <section className="card card-border bg-base-100 p-6">
        <div className="rd-double-rule mb-5" />
        <div className="rd-kicker mb-2">Team</div>
        <p className="text-sm text-[#374151]">
          This workspace does not belong to an organization yet. Create one to invite people
          and set automation rules.
        </p>
        <button
          className="btn btn-neutral btn-sm mt-4"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const res = await fetch("/api/organizations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: "My business" }),
              });
              const data = await res.json();
              onNote(res.ok ? "Organization created." : (data.error ?? "Could not create organization."));
              if (res.ok) window.location.reload();
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
          Create an organization
        </button>
      </section>
    );
  }

  const canManage = org.role === "owner" || org.role === "manager";

  return (
    <div className="space-y-6">
      {/* Organization + members */}
      <section className="card card-border bg-base-100 p-6">
        <div className="rd-double-rule mb-5" />
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="rd-kicker mb-1">Organization</div>
            <h3 className="rd-display text-base">{org.name}</h3>
            <p className="rd-mono mt-1">
              {org.slug} · {org.plan} plan · you are {org.role}
            </p>
          </div>
          {canManage && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowMemberForm(!showMemberForm)}
              aria-expanded={showMemberForm}
            >
              <UserPlus size={14} aria-hidden="true" /> Add person
            </button>
          )}
        </div>

        {showMemberForm && canManage && (
          <div className="mb-4 space-y-2 rounded-[10px] border border-base-300 bg-base-200 p-4">
            <input
              className="input w-full"
              placeholder="Email of an existing ReviewDesk account"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Member email"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="select select-sm w-auto"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as Role)}
                aria-label="Member role"
              >
                {ROLES.filter((r) => r !== "owner" || org.role === "owner").map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button className="btn btn-primary btn-sm" onClick={addMember} disabled={busy}>
                {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
                Add to organization
              </button>
            </div>
            <p className="rd-mono">The person needs a ReviewDesk account first.</p>
          </div>
        )}

        <ul className="divide-y divide-base-300 border-t border-base-300">
          {org.members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#111827]">{m.name}</p>
                <p className="rd-mono">{m.email}</p>
              </div>
              {canManage && m.role !== "owner" ? (
                <>
                  <select
                    className="select select-sm w-auto"
                    value={m.role}
                    onChange={(e) => changeRole(m.id, e.target.value as Role)}
                    aria-label={`Role for ${m.name}`}
                    disabled={busy}
                  >
                    {ROLES.filter((r) => r !== "owner" || org.role === "owner").map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <button
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => removeMember(m.id, m.name)}
                    disabled={busy}
                    aria-label={`Remove ${m.name}`}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </>
              ) : (
                <span className="badge badge-outline font-mono">{m.role}</span>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-4 border-t border-base-300 pt-3">
          <div className="rd-kicker mb-2">What each role can do</div>
          <ul className="space-y-1 text-xs text-[#6B7280]">
            {ROLES.map((r) => (
              <li key={r}><span className="font-mono text-[#374151]">{r}</span> — {ROLE_BLURB[r]}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Automation rules */}
      <section className="card card-border bg-base-100 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="rd-kicker mb-1">Automation rules</div>
            <p className="max-w-[520px] text-sm text-[#374151]">
              A rule can force the triage action or raise the priority when a review matches.
              Rules never post to Google. The owner still copies the reply by hand.
            </p>
          </div>
          {canManage && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowRuleForm(!showRuleForm)}
              aria-expanded={showRuleForm}
            >
              <Plus size={14} aria-hidden="true" /> New rule
            </button>
          )}
        </div>

        {showRuleForm && canManage && (
          <div className="mb-4 space-y-2 rounded-[10px] border border-base-300 bg-base-200 p-4">
            <input
              className="input w-full"
              placeholder="Rule name (e.g. Hold health claims)"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              aria-label="Rule name"
              maxLength={120}
            />
            <input
              className="input w-full"
              placeholder="Keywords, comma separated (e.g. doctor, hospital, lawyer)"
              value={ruleKeywords}
              onChange={(e) => setRuleKeywords(e.target.value)}
              aria-label="Rule keywords"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="select select-sm w-auto"
                value={ruleAction}
                onChange={(e) => setRuleAction(e.target.value as Action | "")}
                aria-label="Force action"
              >
                <option value="">do not change the action</option>
                {ACTIONS.map((a) => <option key={a} value={a}>force: {a}</option>)}
              </select>
              <select
                className="select select-sm w-auto"
                value={rulePriority}
                onChange={(e) => setRulePriority(e.target.value as Priority | "")}
                aria-label="Set priority"
              >
                <option value="">leave the priority</option>
                {PRIORITIES.map((p) => <option key={p} value={p}>priority: {p}</option>)}
              </select>
              <button className="btn btn-primary btn-sm" onClick={addRule} disabled={busy}>
                {busy ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : null}
                Save rule
              </button>
            </div>
          </div>
        )}

        {rules.length === 0 ? (
          <p className="rd-mono py-6 text-center">
            No rules yet. A rule like &ldquo;hold anything mentioning a doctor&rdquo; keeps
            risky reviews out of the queue.
          </p>
        ) : (
          <ul className="space-y-2">
            {rules.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-[10px] border border-base-300 bg-base-200 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#111827]">{r.name}</span>
                    {!r.enabled ? <span className="badge badge-ghost font-mono text-[10px]">off</span> : null}
                    {r.forceAction ? (
                      <span className="badge badge-outline font-mono text-[10px]">force {r.forceAction}</span>
                    ) : null}
                    {r.setPriority ? (
                      <span className="badge badge-outline font-mono text-[10px]">{r.setPriority}</span>
                    ) : null}
                  </div>
                  <p className="rd-mono">
                    {Array.isArray(r.keywords) && r.keywords.length
                      ? `keywords: ${r.keywords.join(", ")}`
                      : "matches every review"}
                  </p>
                </div>
                {canManage && (
                  <button
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => removeRule(r.id, r.name)}
                    disabled={busy}
                    aria-label={`Remove rule ${r.name}`}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
