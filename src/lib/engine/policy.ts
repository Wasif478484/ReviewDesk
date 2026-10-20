/**
 * policy.ts, faithful TypeScript port of ReviewDesk's policy.py.
 *
 * This is the safety-critical part of autopilot, so it stays plain logic:
 * the model never makes this decision, it only produces the triage result
 * that decide() checks.
 *
 * decide(...) returns [decision, reasons]:
 *   "skip"       the review already has an owner reply
 *   "queue"      a human must approve it (reasons say why)
 *   "auto_post"  every check passed
 *
 * shouldSend(...) is the only place that turns "auto_post" into a real send,
 * and it returns false while autopilot is off or dryRun is on.
 */

import { checkDraft, normLang, type TriageResult, type BusinessProfile } from "./prompts";

export interface AutopilotPolicy {
  enabled: boolean; // off by default
  dryRun: boolean; // log what would be posted, send nothing
  minStars: number; // lower ratings always wait for the owner
  trustedLanguages: string[]; // only languages a native reader has checked
  delayMinutes: number; // veto window before a post goes out
  dailyCap: number;
  // A 4-star "good, but..." review can still carry a complaint. Default is
  // the safe side: mixed sentiment waits for owner approval. Owners who have
  // watched the drafts for a while can flip this on.
  allowMixedSentiment: boolean;
}

export const DEFAULT_POLICY: AutopilotPolicy = {
  enabled: false,
  dryRun: true,
  minStars: 4,
  trustedLanguages: ["english"],
  delayMinutes: 30,
  dailyCap: 10,
  allowMixedSentiment: false,
};

export interface ReviewLike {
  stars?: number | string | null;
  text?: string | null;
  hasReply?: boolean;
}

export function decide(
  result: TriageResult,
  review: ReviewLike,
  profile: Partial<BusinessProfile>,
  policy: AutopilotPolicy,
  postedToday = 0,
  alreadyReplied = false,
): [decision: "skip" | "queue" | "auto_post", reasons: string[]] {
  if (alreadyReplied) return ["skip", ["review already has an owner reply"]];

  const reasons: string[] = [];
  if (!policy.enabled) reasons.push("autopilot is off");

  // hold, report and reply_needs_owner can never be posted automatically
  const action = result.action;
  if (action !== "reply") reasons.push(`action is ${action}, which needs a human`);
  if (result.flags?.length) reasons.push("risk flags: " + result.flags.join(", "));
  if (result.sentiment === "negative") reasons.push("sentiment is negative");
  else if (result.sentiment === "mixed" && !policy.allowMixedSentiment) {
    reasons.push("sentiment is mixed; owner approval required by default");
  }

  let starsOk = false;
  try {
    starsOk = Number.parseInt(String(review.stars), 10) >= policy.minStars;
  } catch {
    starsOk = false;
  }
  if (!starsOk) reasons.push(`rating is below ${policy.minStars} stars or unknown`);

  const trusted = new Set(policy.trustedLanguages.map(normLang));
  if (String(review.text ?? "").trim()) {
    if (!trusted.has(normLang(result.review_language))) {
      reasons.push(
        `review language ${JSON.stringify(result.review_language)} is not on the trusted list`,
      );
    }
  }

  const draft = result.draft_reply;
  if (!draft) {
    reasons.push("no draft to post");
  } else {
    if (draft.includes("[OWNER:")) {
      reasons.push("draft has an unfilled owner placeholder");
    }
    reasons.push(
      ...checkDraft(draft, profile, result.draft_translation).map((p) => `draft check: ${p}`),
    );
    if (!trusted.has(normLang(result.language_used))) {
      reasons.push(
        `reply language ${JSON.stringify(result.language_used)} is not on the trusted list`,
      );
    }
  }

  if (postedToday >= policy.dailyCap) reasons.push("daily cap reached");

  return reasons.length ? ["queue", reasons] : ["auto_post", ["passes all checks"]];
}

export function shouldSend(decision: string, policy: AutopilotPolicy): boolean {
  return decision === "auto_post" && policy.enabled && !policy.dryRun;
}
