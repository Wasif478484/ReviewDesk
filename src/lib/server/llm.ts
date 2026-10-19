/**
 * llm.ts
 */

import ZAI from "z-ai-web-dev-sdk";

const MOCK_OUTPUTS = [
  { action: "reply", sentiment: "positive", flags: [], reason: "Simple praise.", review_language: "English", language_used: "English", draft_reply: "Thank you! The Owner.", review_translation: null, draft_translation: null, report_note: null, owner_checklist: [] },
  { action: "hold", sentiment: "negative", flags: ["health"], reason: "Needs review.", review_language: "English", language_used: "none", draft_reply: null, review_translation: null, draft_translation: null, report_note: null, owner_checklist: ["Verify claim"] },
];

function mockResponse(user: string): string {
  let hash = 0;
  for (let i = 0; i < user.length; i++) hash = ((hash << 5) - hash + user.charCodeAt(i)) | 0;
  return JSON.stringify(MOCK_OUTPUTS[Math.abs(hash) % MOCK_OUTPUTS.length]);
}

export async function callModel(system: string, user: string): Promise<string> {
  const provider = (process.env.REVIEWDESK_PROVIDER ?? "").toLowerCase();
  if (provider === "mock") return mockResponse(user);
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({ messages: [{ role: "system", content: system }, { role: "user", content: user }] });
    const content = completion?.choices?.[0]?.message?.content ?? completion?.content ?? (typeof completion === "string" ? completion : "");
    if (typeof content !== "string" || !content.trim()) throw new Error("model returned no text");
    return content;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes(".z-ai-config") || msg.includes("Configuration file")) {
      throw new Error("Model provider not configured. Set REVIEWDESK_PROVIDER=mock for offline demos, or create a .z-ai-config file. See README.md.");
    }
    throw err;
  }
}

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return await fn(); }
    catch (err) { lastErr = err; if (attempt === 0) await new Promise((r) => setTimeout(r, 1000)); }
  }
  throw lastErr;
}
