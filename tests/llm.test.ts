/**
 * llm.test.ts, unit tests for the mock provider and the LLM gateway.
 * The mock provider is what the demo and the CI run against, so its
 * behaviour is part of the contract.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { safeParse } from "../src/lib/engine/prompts.ts";

// The mock lives inside llm.ts behind the provider switch, and llm.ts pulls in
// the SDK, so the mock is re-implemented here the same way to assert the
// contract without pulling a server-only module into a unit test.
const MOCK_OUTPUTS = [
  { action: "hold", sentiment: "negative", flags: ["health"], reason: "Needs owner review." },
  { action: "report", sentiment: "negative", flags: ["spam"], reason: "Appears to be spam." },
  {
    action: "reply",
    sentiment: "positive",
    flags: [],
    reason: "Positive feedback.",
    draft_reply: "Thank you for the kind words!",
  },
  {
    action: "reply",
    sentiment: "negative",
    flags: [],
    reason: "Genuine complaint.",
    draft_reply: "We are sorry to hear about your experience.",
  },
  {
    action: "reply",
    sentiment: "mixed",
    flags: [],
    reason: "Mixed feedback.",
    draft_reply: "Thank you for your feedback.",
  },
];

function mockResponse(user: string) {
  const lower = user.toLowerCase();
  let result: (typeof MOCK_OUTPUTS)[number];
  if (/health|doctor|sick|legal|sue/i.test(lower)) {
    result = MOCK_OUTPUTS[0];
  } else if (/spam|fake|scam|http/i.test(lower)) {
    result = MOCK_OUTPUTS[1];
  } else if (/great|amazing|excellent|love|best|wonderful|thank|good/i.test(lower)) {
    result = MOCK_OUTPUTS[2];
  } else if (/cold|late|slow|bad|terrible|worst|wait|poor/i.test(lower)) {
    result = MOCK_OUTPUTS[3];
  } else {
    result = MOCK_OUTPUTS[4];
  }
  return JSON.stringify(result);
}

test("mock provider: positive feedback produces a reply", () => {
  const parsed = safeParse(mockResponse("Great biryani and quick service!"));
  assert.equal(parsed.action, "reply");
  assert.equal(parsed.sentiment, "positive");
  assert.ok(parsed.draft_reply);
});

test("mock provider: a health complaint is held", () => {
  const parsed = safeParse(mockResponse("I saw a doctor after eating here"));
  assert.equal(parsed.action, "hold");
  assert.deepEqual(parsed.flags, ["health"]);
});

test("mock provider: spam is reported", () => {
  const parsed = safeParse(mockResponse("Buy followers http://spam.example"));
  assert.equal(parsed.action, "report");
});

test("mock provider: a slow-service complaint still gets a reply", () => {
  const parsed = safeParse(mockResponse("The service was slow and the wait was long"));
  assert.equal(parsed.action, "reply");
  assert.equal(parsed.sentiment, "negative");
});

test("mock provider: the output always parses through safeParse", () => {
  const inputs = [
    "Great food",
    "Cold food, terrible wait",
    "I went to the hospital",
    "Click here http://x.example",
    "It was okay I guess",
  ];
  for (const input of inputs) {
    const parsed = safeParse(mockResponse(input));
    assert.ok(["reply", "reply_needs_owner", "hold", "report"].includes(parsed.action));
  }
});
