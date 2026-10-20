/**
 * rules.ts, owner-configured automation rules.
 *
 * A rule can force the triage action or set the queue priority when a review
 * matches its conditions. Rules never post anything to Google: the owner
 * still copies the reply by hand. The model still produces the draft; a rule
 * only decides where the review lands and how loudly it is flagged.
 *
 * Pure and client-safe, like the rest of lib/engine.
 */

export const RULE_ACTIONS = ["reply", "reply_needs_owner", "hold", "report"] as const;
export const RULE_PRIORITIES = ["urgent", "normal", "low"] as const;

export type RuleAction = (typeof RULE_ACTIONS)[number];
export type RulePriority = (typeof RULE_PRIORITIES)[number];

export interface RuleInput {
  id: string;
  name: string;
  enabled: boolean;
  minStars: number | null;
  maxStars: number | null;
  keywords: string[];
  language: string;
  forceAction: string;
  setPriority: string;
}

export interface RuleMatch {
  ruleId: string;
  ruleName: string;
  action: RuleAction | null;
  priority: RulePriority | null;
  reason: string;
}

export interface RuleEvaluation {
  action: string;
  priority: "urgent" | "normal" | "low";
  matches: RuleMatch[];
}

/** Parse the stored JSON keyword list. Never throws. */
export function parseKeywords(raw: string | string[] | null | undefined): string[] {
  if (Array.isArray(raw)) return raw.map((k) => String(k).trim().toLowerCase()).filter(Boolean);
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((k) => String(k).trim().toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
}

/** Does one rule match this review? Returns null when it does not. */
export function matchRule(
  rule: RuleInput,
  review: { text: string; stars: number | null; language?: string | null },
): RuleMatch | null {
  if (!rule.enabled) return null;

  if (rule.minStars != null && (review.stars == null || review.stars < rule.minStars)) return null;
  if (rule.maxStars != null && (review.stars == null || review.stars > rule.maxStars)) return null;

  const text = (review.text ?? "").toLowerCase();
  const keyword = rule.keywords.find((k) => k && text.includes(k));
  if (rule.keywords.length > 0 && !keyword) return null;

  if (rule.language) {
    const lang = (review.language ?? "").toLowerCase();
    if (lang && lang !== rule.language.toLowerCase()) return null;
  }

  const bits: string[] = [];
  if (rule.minStars != null || rule.maxStars != null) {
    bits.push(`${rule.minStars ?? 1}-${rule.maxStars ?? 5} stars`);
  }
  if (keyword) bits.push(`text contains "${keyword}"`);
  if (rule.language) bits.push(`language ${rule.language}`);

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    action: (RULE_ACTIONS as readonly string[]).includes(rule.forceAction)
      ? (rule.forceAction as RuleAction)
      : null,
    priority: (RULE_PRIORITIES as readonly string[]).includes(rule.setPriority)
      ? (rule.setPriority as RulePriority)
      : null,
    reason: bits.length ? `Rule "${rule.name}" matched: ${bits.join(", ")}.` : `Rule "${rule.name}" matched.`,
  };
}

/**
 * Apply every rule to one review. The first rule that forces an action wins
 * for the action; the most urgent priority wins for the priority.
 */
export function applyRules(
  rules: RuleInput[],
  review: { text: string; stars: number | null; language?: string | null },
  basePriority: "urgent" | "normal" | "low",
): RuleEvaluation {
  const matches: RuleMatch[] = [];
  let action = "";
  let priority = basePriority;

  for (const rule of rules) {
    const m = matchRule(rule, review);
    if (!m) continue;
    matches.push(m);
    if (m.action && !action) action = m.action;
    if (m.priority === "urgent") priority = "urgent";
    else if (m.priority === "normal" && priority === "low") priority = "normal";
    else if (m.priority === "low" && priority === "normal" && !m.action) priority = "low";
  }

  return { action, priority, matches };
}
