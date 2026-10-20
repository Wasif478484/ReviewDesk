/**
 * priority.ts, queue priority scoring.
 *
 * Priority decides how loudly a review is flagged, not what happens to it.
 * The lane still comes from the frozen policy; the owner still copies the
 * reply by hand. This is pure so it can be unit-tested on its own.
 */

export type Priority = "urgent" | "normal" | "low";

/** Flags that always mean a human should look at the review first. */
const RISK_FLAGS = new Set([
  "health",
  "legal",
  "abuse",
  "spam",
  "safety",
  "discrimination",
  "harassment",
  "self_harm",
]);

export interface PriorityInput {
  action: string;
  sentiment: string;
  flags: string[];
}

/**
 * Urgent means a hold or a risk flag. Normal means the owner has to look at
 * it, or the reviewer is unhappy. Low means a clean positive that can wait
 * for the autopilot lane.
 */
export function computePriority(result: PriorityInput, stars: number | null): Priority {
  const risky = result.flags.some((f) => RISK_FLAGS.has(String(f).toLowerCase()));
  if (result.action === "hold" || risky) return "urgent";
  if (result.action === "reply_needs_owner") return "normal";
  if (result.sentiment === "negative" || (stars !== null && stars <= 2)) return "normal";
  if (result.action === "reply" && result.sentiment === "positive" && (stars === null || stars >= 4)) {
    return "low";
  }
  return "normal";
}
