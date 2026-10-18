/**
 * llm.ts, one model call for triage, via z-ai-web-dev-sdk (server only).
 *
 * Review text is sent to the model provider. The app states this plainly in
 * the UI. If the SDK is unreachable the error surfaces to the route, which
 * falls back to a clear message instead of a stack trace.
 */

import ZAI from "z-ai-web-dev-sdk";

export async function callModel(system: string, user: string): Promise<string> {
  const zai = await ZAI.create();
  const completion = await zai.chat.completions.create({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  // Defensive extraction: the SDK mirrors the OpenAI chat shape but be safe.
  const content =
    completion?.choices?.[0]?.message?.content ??
    completion?.content ??
    (typeof completion === "string" ? completion : "");
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("model returned no text");
  }
  return content;
}

/** Run fn once; on failure wait briefly and retry once. */
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
