import ZAI from "z-ai-web-dev-sdk";
import { provider } from "@/lib/server/env";

function mockResponse(user: string): string {
  const lower = user.toLowerCase();
  let result: any;
  if (/health|doctor|sick|legal|sue/i.test(lower)) {
    result = {
      action: "hold",
      sentiment: "negative",
      flags: ["health"],
      reason: "Needs owner review.",
      review_language: "English",
      language_used: "none",
      draft_reply: null,
      review_translation: null,
      draft_translation: null,
      report_note: null,
      owner_checklist: ["Verify claim"],
    };
  } else if (/spam|fake|scam|http/i.test(lower)) {
    result = {
      action: "report",
      sentiment: "negative",
      flags: ["spam"],
      reason: "Appears to be spam.",
      review_language: "English",
      language_used: "none",
      draft_reply: null,
      review_translation: null,
      draft_translation: null,
      report_note: "Consider reporting.",
      owner_checklist: ["Verify spam"],
    };
  } else if (/great|amazing|excellent|love|best|wonderful|thank|good/i.test(lower)) {
    result = {
      action: "reply",
      sentiment: "positive",
      flags: [],
      reason: "Positive feedback.",
      review_language: "English",
      language_used: "English",
      draft_reply:
        "Thank you for the kind words! We look forward to seeing you again. The Owner, Your Business",
      review_translation: null,
      draft_translation: null,
      report_note: null,
      owner_checklist: [],
    };
  } else if (/cold|late|slow|bad|terrible|worst|wait|poor/i.test(lower)) {
    result = {
      action: "reply",
      sentiment: "negative",
      flags: [],
      reason: "Genuine complaint.",
      review_language: "English",
      language_used: "English",
      draft_reply:
        "We are sorry to hear about your experience. We are looking into this. Thank you for your feedback. The Owner, Your Business",
      review_translation: null,
      draft_translation: null,
      report_note: null,
      owner_checklist: [],
    };
  } else {
    result = {
      action: "reply",
      sentiment: "mixed",
      flags: [],
      reason: "Mixed feedback.",
      review_language: "English",
      language_used: "English",
      draft_reply:
        "Thank you for your feedback. We appreciate your input. The Owner, Your Business",
      review_translation: null,
      draft_translation: null,
      report_note: null,
      owner_checklist: [],
    };
  }
  return JSON.stringify(result);
}

export async function callModel(system: string, user: string): Promise<string> {
  if (provider() === "mock") return mockResponse(user);
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const content =
      completion?.choices?.[0]?.message?.content ??
      completion?.content ??
      (typeof completion === "string" ? completion : "");
    if (typeof content !== "string" || !content.trim()) throw new Error("model returned no text");
    return content;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes(".z-ai-config") || msg.includes("Configuration file")) {
      throw new Error(
        "Model provider not configured. Set REVIEWDESK_PROVIDER=mock for offline demos, or create a .z-ai-config file. See README.md.",
      );
    }
    throw err;
  }
}

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw lastErr;
}
