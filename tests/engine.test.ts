/**
 * engine.test.ts, unit tests for the pure engine.
 *
 * Covers the frozen policy, the prompt parser, the priority scoring, and the
 * owner-configured automation rules. Run with `npm test`.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { decide, shouldSend, DEFAULT_POLICY } from "../src/lib/engine/policy.ts";
import { parseTriageOutput, safeParse, ACTIONS, SENTIMENTS } from "../src/lib/engine/prompts.ts";
import { computePriority } from "../src/lib/engine/priority.ts";
import { applyRules, matchRule, parseKeywords } from "../src/lib/engine/rules.ts";

// ---------------------------------------------------------------------------
// Frozen policy
// ---------------------------------------------------------------------------

const cleanReply = {
  action: "reply",
  sentiment: "positive",
  flags: [],
  reason: "Simple praise.",
  review_language: "English",
  language_used: "English",
  draft_reply: "Thanks for the kind words. We look forward to seeing you again.",
  review_translation: null,
  draft_translation: null,
  report_note: null,
  owner_checklist: [],
};

const goodReview = {
  id: "r1",
  userId: "u1",
  source: "demo",
  externalId: null,
  stars: 5,
  text: "Great food, lovely staff.",
  author: "Sam",
  date: "2026-01-01",
  hasReply: false,
  replyText: null,
  replyMode: null,
  repliedAt: null,
  triage: null,
};

test("policy: a clean five-star reply can enter the auto lane", () => {
  const [decision] = decide(
    cleanReply as never,
    goodReview as never,
    {
      business_name: "B",
      business_type: "restaurant",
      owner_name: "O",
      sign_off: "",
      contact_line: "",
      allowed_offers: "none",
    } as never,
    { ...DEFAULT_POLICY, enabled: true, dryRun: false },
    0,
    false,
  );
  assert.equal(decision, "auto_post");
});

test("policy: autopilot stays off when the policy is disabled", () => {
  const [decision] = decide(
    cleanReply as never,
    goodReview as never,
    {
      business_name: "B",
      business_type: "restaurant",
      owner_name: "O",
      sign_off: "",
      contact_line: "",
      allowed_offers: "none",
    } as never,
    { ...DEFAULT_POLICY, enabled: false },
    0,
    false,
  );
  assert.notEqual(decision, "auto_post");
});

test("policy: a hold never enters the auto lane", () => {
  const [decision] = decide(
    { ...cleanReply, action: "hold", reason: "Health claim." } as never,
    { ...goodReview, stars: 1 } as never,
    {
      business_name: "B",
      business_type: "restaurant",
      owner_name: "O",
      sign_off: "",
      contact_line: "",
      allowed_offers: "none",
    } as never,
    { ...DEFAULT_POLICY, enabled: true, dryRun: false },
    0,
    false,
  );
  assert.notEqual(decision, "auto_post");
});

test("policy: report never enters the auto lane", () => {
  const [decision] = decide(
    { ...cleanReply, action: "report" } as never,
    { ...goodReview, stars: 1 } as never,
    {
      business_name: "B",
      business_type: "restaurant",
      owner_name: "O",
      sign_off: "",
      contact_line: "",
      allowed_offfers: "none",
    } as never,
    { ...DEFAULT_POLICY, enabled: true, dryRun: false },
    0,
    false,
  );
  assert.notEqual(decision, "auto_post");
});

test("policy: shouldSend only allows auto_post when the policy is live", () => {
  const live = { ...DEFAULT_POLICY, enabled: true, dryRun: false };
  const dry = { ...DEFAULT_POLICY, enabled: true, dryRun: true };
  const off = { ...DEFAULT_POLICY, enabled: false, dryRun: false };
  assert.equal(shouldSend("auto_post", live), true);
  assert.equal(shouldSend("auto_post", dry), false);
  assert.equal(shouldSend("auto_post", off), false);
  assert.equal(shouldSend("queue", live), false);
  assert.equal(shouldSend("hold", live), false);
  assert.equal(shouldSend("report", live), false);
});

// ---------------------------------------------------------------------------
// Prompt parser
// ---------------------------------------------------------------------------

test("parser: accepts a valid triage object", () => {
  const out = parseTriageOutput(
    JSON.stringify({
      action: "reply",
      sentiment: "positive",
      flags: [],
      reason: "ok",
      review_language: "English",
      language_used: "English",
      draft_reply: "Thanks!",
    }),
  );
  assert.equal(out.action, "reply");
  assert.equal(out.sentiment, "positive");
  assert.equal(out.draft_reply, "Thanks!");
});

test("parser: rejects an action outside the frozen set", () => {
  assert.throws(() =>
    parseTriageOutput(JSON.stringify({ action: "delete", sentiment: "positive" })),
  );
});

test("parser: rejects a sentiment outside the frozen set", () => {
  assert.throws(() => parseTriageOutput(JSON.stringify({ action: "reply", sentiment: "furious" })));
});

test("parser: safeParse falls back to owner review on bad output", () => {
  const out = safeParse("this is not json");
  assert.equal(out.action, "reply_needs_owner");
  assert.equal(out.draft_reply, null);
  assert.ok(out.owner_checklist.length > 0);
});

test("parser: the frozen action and sentiment lists are unchanged", () => {
  assert.deepEqual([...ACTIONS], ["reply", "reply_needs_owner", "hold", "report"]);
  assert.deepEqual([...SENTIMENTS], ["positive", "mixed", "negative"]);
});

// ---------------------------------------------------------------------------
// Priority scoring
// ---------------------------------------------------------------------------

test("priority: a hold is urgent", () => {
  assert.equal(computePriority({ action: "hold", sentiment: "negative", flags: [] }, 1), "urgent");
});

test("priority: a risk flag is urgent even on a reply", () => {
  assert.equal(
    computePriority({ action: "reply", sentiment: "positive", flags: ["health"] }, 5),
    "urgent",
  );
});

test("priority: check-facts is normal", () => {
  assert.equal(
    computePriority({ action: "reply_needs_owner", sentiment: "mixed", flags: [] }, 3),
    "normal",
  );
});

test("priority: a clean positive is low", () => {
  assert.equal(computePriority({ action: "reply", sentiment: "positive", flags: [] }, 5), "low");
});

test("priority: a one-star complaint is at least normal", () => {
  assert.equal(computePriority({ action: "reply", sentiment: "positive", flags: [] }, 1), "normal");
});

// ---------------------------------------------------------------------------
// Automation rules
// ---------------------------------------------------------------------------

const keywordRule = {
  id: "rule-1",
  name: "Hold health claims",
  enabled: true,
  minStars: null,
  maxStars: null,
  keywords: ["doctor", "hospital"],
  language: "",
  forceAction: "hold",
  setPriority: "urgent",
};

test("rules: parseKeywords never throws on bad JSON", () => {
  assert.deepEqual(parseKeywords("not json"), []);
  assert.deepEqual(parseKeywords('["a","b"]'), ["a", "b"]);
  assert.deepEqual(parseKeywords(null), []);
});

test("rules: a keyword rule matches its text", () => {
  const m = matchRule(keywordRule, { text: "I saw a doctor after eating here", stars: 1 });
  assert.ok(m);
  assert.equal(m!.action, "hold");
  assert.equal(m!.priority, "urgent");
});

test("rules: a keyword rule does not match unrelated text", () => {
  assert.equal(matchRule(keywordRule, { text: "Great food", stars: 5 }), null);
});

test("rules: a disabled rule never matches", () => {
  assert.equal(matchRule({ ...keywordRule, enabled: false }, { text: "doctor", stars: 1 }), null);
});

test("rules: star bounds are respected", () => {
  const rule = { ...keywordRule, minStars: 4, maxStars: 5, keywords: [], forceAction: "reply" };
  assert.ok(matchRule(rule, { text: "anything", stars: 5 }));
  assert.equal(matchRule(rule, { text: "anything", stars: 2 }), null);
});

test("rules: applyRules forces the action and raises the priority", () => {
  const out = applyRules(
    [keywordRule],
    { text: "The food made me ill and I saw a doctor", stars: 1 },
    "normal",
  );
  assert.equal(out.action, "hold");
  assert.equal(out.priority, "urgent");
  assert.equal(out.matches.length, 1);
});

test("rules: no matching rules leaves the base result alone", () => {
  const out = applyRules([keywordRule], { text: "Lovely meal", stars: 5 }, "low");
  assert.equal(out.action, "");
  assert.equal(out.priority, "low");
  assert.equal(out.matches.length, 0);
});

test("rules: a rule that only sets priority does not change the action", () => {
  const out = applyRules(
    [{ ...keywordRule, forceAction: "" }],
    { text: "I saw a doctor", stars: 1 },
    "normal",
  );
  assert.equal(out.action, "");
  assert.equal(out.priority, "urgent");
});
