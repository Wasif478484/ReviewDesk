'use client';

/**
 * Onboarding.tsx, three-step wizard after signup:
 *   1. Business details
 *   2. Google Business connection (API key or OAuth token; skippable)
 *   3. Desk preferences (tone, languages)
 * Secrets are sent once over HTTPS and stored encrypted; the response
 * never echoes them back.
 */

import { useState, useEffect } from "react";
import { LogoMark, Stamp } from "@/components/shared/bits";
import { COMMON_LANGUAGES, TONES } from "@/lib/engine/prompts";

interface OnboardingProps {
  userName: string;
  initialGoogleStatus?: string;
  initialGoogleMessage?: string;
  onDone: () => void;
}

export default function Onboarding({ userName, initialGoogleStatus, initialGoogleMessage, onDone }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [oauthConfigured, setOauthConfigured] = useState<boolean | null>(null);

  // Discover whether this deployment has Google OAuth configured.
  useEffect(() => {
    fetch("/api/workspace")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setOauthConfigured(Boolean(d.googleOAuthConfigured)); })
      .catch(() => setOauthConfigured(false));
  }, []);

  // Step 1: business
  const [name, setName] = useState("");
  const [category, setCategory] = useState("restaurant");
  const [ownerName, setOwnerName] = useState(userName);
  const [signOff, setSignOff] = useState("");
  const [contactLine, setContactLine] = useState("");
  const [allowedOffers, setAllowedOffers] = useState("none");
  const [description, setDescription] = useState("");

  // Step 2: connection
  const [mode, setMode] = useState<"skip" | "api_key" | "oauth_token">("skip");
  const [apiKey, setApiKey] = useState("");
  const [token, setToken] = useState("");
  const [locationId, setLocationId] = useState("");

  // Step 3: preferences
  const [replyTone, setReplyTone] = useState<string>("warm");
  const [replyLanguage, setReplyLanguage] = useState("auto");
  const [ownerLanguage, setOwnerLanguage] = useState("English");

  const signOffPreview = signOff || `${ownerName || "The Owner"}, ${name || "Your Business"}`;

  async function finish() {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business: {
            name, category, ownerName, signOff, contactLine,
            allowedOffers, description, replyTone, replyLanguage, ownerLanguage,
          },
          credential: mode === "skip" ? null : {
            mode,
            apiKey: mode === "api_key" ? apiKey : "",
            token: mode === "oauth_token" ? token : "",
            locationId,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save. Please try again.");
        return;
      }
      onDone();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const canNext1 = name.trim().length > 0;
  const canNext2 = mode === "skip" || (mode === "api_key" ? apiKey.trim().length > 0 : token.trim().length > 0);

  return (
    <div className="min-h-screen px-5 py-10">
      <div className="mx-auto max-w-[640px]">
        <div className="mb-8 flex items-center gap-2.5">
          <LogoMark size={26} />
          <span className="rd-display text-lg">ReviewDesk</span>
        </div>

        {/* Progress ledger */}
        <div className="rd-card mb-6 p-5">
          <div className="flex items-center justify-between">
            {["Business", "Google connection", "Preferences"].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full rd-mono text-[0.75rem] font-bold"
                  style={{
                    background: step > i ? "#1D4ED8" : step === i + 1 ? "#111827" : "#F6F7F9",
                    color: step >= i + 1 ? "#FFFFFF" : "#6B7280",
                    border: `1.5px solid ${step > i ? "#1D4ED8" : step === i + 1 ? "#111827" : "#D1D5DB"}`,
                  }}
                >
                  {i + 1}
                </span>
                <span className="rd-mono hidden sm:inline" style={{ color: step === i + 1 ? "#111827" : "#6B7280" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rd-card p-7">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <div className="rd-kicker mb-1" style={{ color: "#1D4ED8" }}>Step 1 · Business</div>
                <h1 className="rd-display text-2xl">Tell the desk who is replying</h1>
                <p className="mt-1 text-sm text-[#6B7280]">
                  These details feed the frozen reply rules: the sign-off ends every draft, and the
                  contact line is the only place drafts may quote a phone number from.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="ob-name" className="rd-kicker mb-1.5 block">Business name *</label>
                  <input id="ob-name" className="rd-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Spice Corner" required />
                </div>
                <div>
                  <label htmlFor="ob-category" className="rd-kicker mb-1.5 block">Category</label>
                  <select id="ob-category" className="rd-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {["restaurant", "cafe", "bakery", "salon", "clinic", "grocery", "gym", "hotel", "shop", "other"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ob-owner" className="rd-kicker mb-1.5 block">Owner name</label>
                  <input id="ob-owner" className="rd-input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Imran" />
                </div>
                <div>
                  <label htmlFor="ob-signoff" className="rd-kicker mb-1.5 block">Sign-off</label>
                  <input id="ob-signoff" className="rd-input" value={signOff} onChange={(e) => setSignOff(e.target.value)} placeholder={signOffPreview} />
                </div>
                <div>
                  <label htmlFor="ob-contact" className="rd-kicker mb-1.5 block">Contact line</label>
                  <input id="ob-contact" className="rd-input" value={contactLine} onChange={(e) => setContactLine(e.target.value)} placeholder="WhatsApp 03XX-XXXXXXX" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="ob-offers" className="rd-kicker mb-1.5 block">Offers you allow in replies</label>
                  <input id="ob-offers" className="rd-input" value={allowedOffers} onChange={(e) => setAllowedOffers(e.target.value)} placeholder="none" />
                  <p className="rd-mono mt-1.5">Keep &ldquo;none&rdquo; and drafts will never promise refunds, discounts or free items.</p>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="ob-desc" className="rd-kicker mb-1.5 block">What the business does (optional)</label>
                  <textarea id="ob-desc" className="rd-input min-h-[72px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Family-run Pakistani restaurant known for karahi and biryani" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <div className="rd-kicker mb-1" style={{ color: "#1D4ED8" }}>Step 2 · Google connection</div>
                <h1 className="rd-display text-2xl">Bring your Google Business credentials</h1>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Paste a Google Business Profile API key or an OAuth access token. It is encrypted
                  with AES-256-GCM before it touches the database and is never shown again. Review
                  data needs OAuth consent: a bare API key alone cannot read reviews; without a
                  connection the desk runs on the simulated inbox and nothing is ever sent.
                </p>
              </div>

              <div className="rd-tabs w-full justify-center" role="tablist" aria-label="Credential type">
                {(["skip", "api_key", "oauth_token"] as const).map((v) => (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={mode === v}
                    className={`rd-tab flex-1 ${mode === v ? "rd-tab-active" : ""}`}
                    onClick={() => setMode(v)}
                    type="button"
                  >
                    {v === "skip" ? "Skip for now" : v === "api_key" ? "API key" : "OAuth token"}
                  </button>
                ))}
              </div>

              <a
                href="/api/auth/google/start"
                className="rd-btn-green flex w-full items-center justify-center gap-2 px-5 py-3 text-sm min-h-[44px]"
                style={{ opacity: oauthConfigured === false ? 0.55 : 1 }}
                onClick={(e) => { if (oauthConfigured === false) e.preventDefault(); }}
                aria-disabled={oauthConfigured === false}
                title={oauthConfigured === false ? "The admin needs to set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first" : "Sign in with Google and consent to review access"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81"/></svg>
                Connect with Google{oauthConfigured === false ? " (needs admin setup)" : ""}
              </a>
              {initialGoogleStatus === "error" && (
                <p className="rounded-[10px] p-3 text-sm" style={{ background: "#FEE9E9", border: "1px solid #DC2626", color: "#B91C1C" }}>
                  Google connection failed: {initialGoogleMessage ?? "unknown error"}
                </p>
              )}

              {mode === "api_key" && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="ob-apikey" className="rd-kicker mb-1.5 block">Google API key</label>
                    <input id="ob-apikey" className="rd-input font-mono text-sm" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AIza…" autoComplete="off" />
                  </div>
                  <div>
                    <label htmlFor="ob-location" className="rd-kicker mb-1.5 block">Place or location id (optional)</label>
                    <input id="ob-location" className="rd-input font-mono text-sm" value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="accounts/{id}/locations/{id} or places/{place_id}" />
                  </div>
                </div>
              )}

              {mode === "oauth_token" && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="ob-token" className="rd-kicker mb-1.5 block">OAuth access token (Business Profile scopes)</label>
                    <input id="ob-token" className="rd-input font-mono text-sm" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ya29.…" autoComplete="off" />
                  </div>
                  <div>
                    <label htmlFor="ob-location2" className="rd-kicker mb-1.5 block">Location resource name</label>
                    <input id="ob-location2" className="rd-input font-mono text-sm" value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="accounts/{id}/locations/{id}" />
                    <p className="rd-mono mt-1.5">Needed to fetch reviews and reply. Find it in the Business Profile API explorer.</p>
                  </div>
                </div>
              )}

              {mode !== "skip" && (
                <p className="rounded-[10px] p-3 text-sm" style={{ background: "#FBF3D9", border: "1px dashed #854D0E", color: "#854D0E" }}>
                  You can test this in Settings later. Until a live connection verifies, every
                  approved reply stays <strong>recorded in your workspace</strong>; nothing is sent to Google.
                </p>
              )}
              {mode === "skip" && (
                <p className="rounded-[10px] p-3 text-sm" style={{ background: "#E9F9EF", border: "1px solid #1D4ED8", color: "#166534" }}>
                  Skipping keeps you fully in demo mode with the simulated inbox, a good way to learn the desk first.
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <div className="rd-kicker mb-1" style={{ color: "#1D4ED8" }}>Step 3 · Preferences</div>
                <h1 className="rd-display text-2xl">How should drafts sound?</h1>
                <p className="mt-1 text-sm text-[#6B7280]">
                  You can change all of this later. Autopilot stays off until you switch it on with a
                  veto window, a daily cap and dry-run mode.
                </p>
              </div>
              <div>
                <span className="rd-kicker mb-1.5 block">Default tone</span>
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`rd-tab ${replyTone === t ? "rd-tab-active" : ""}`}
                      onClick={() => setReplyTone(t)}
                      aria-pressed={replyTone === t}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ob-lang" className="rd-kicker mb-1.5 block">Reply language</label>
                  <select id="ob-lang" className="rd-input" value={replyLanguage} onChange={(e) => setReplyLanguage(e.target.value)}>
                    {COMMON_LANGUAGES.map((l) => <option key={l} value={l}>{l === "auto" ? "auto (match the reviewer)" : l}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="ob-ownerlang" className="rd-kicker mb-1.5 block">Your reading language</label>
                  <select id="ob-ownerlang" className="rd-input" value={ownerLanguage} onChange={(e) => setOwnerLanguage(e.target.value)}>
                    {COMMON_LANGUAGES.filter((l) => l !== "auto").map((l) => <option key={l} value={l}>{l}</option>)}
                    <option value="English">English</option>
                  </select>
                </div>
              </div>
              <div className="rd-card p-4" style={{ boxShadow: "none" }}>
                <div className="rd-kicker mb-2">Preview</div>
                <div className="flex items-center gap-3">
                  <Stamp action="reply" />
                  <p className="text-sm text-[#374151]">
                    &ldquo;Thank you for the kind words… {signOffPreview}&rdquo;
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-5 rounded-[10px] p-3 text-sm" style={{ background: "#FEE9E9", border: "1px solid #DC2626", color: "#B91C1C" }} role="alert">
              {error}
            </p>
          )}

          <div className="mt-7 flex items-center justify-between gap-3">
            <button
              type="button"
              className="rd-btn-ghost px-5 py-2.5 text-sm"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              style={{ opacity: step === 1 ? 0.4 : 1 }}
            >
              Back
            </button>
            <span className="rd-mono">step {step} of 3</span>
            {step < 3 ? (
              <button
                type="button"
                className="rd-btn-ink px-6 py-2.5 text-sm"
                onClick={() => { setError(""); setStep(step + 1); }}
                disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
                style={{ opacity: (step === 1 && !canNext1) || (step === 2 && !canNext2) ? 0.4 : 1 }}
              >
                Continue
              </button>
            ) : (
              <button type="button" className="rd-btn-green px-6 py-2.5 text-sm" onClick={finish} disabled={busy}>
                {busy ? "Setting up…" : "Open my desk"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
