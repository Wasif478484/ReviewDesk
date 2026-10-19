'use client';

/**
 * Onboarding.tsx, three-step wizard after signup, built on daisyUI:
 *   1. Business details
 *   2. Google Business connection (API key or OAuth token; skippable)
 *   3. Desk preferences (tone, languages)
 * Progress renders as a daisyUI steps bar; credential type switches via
 * daisyUI tabs. Secrets are sent once over HTTPS and stored encrypted;
 * the response never echoes them back.
 */

import { useState, useEffect } from "react";
import { LogoMark, Stamp } from "@/components/shared/bits";
import SkewInText from "@/components/originkit/SkewInText";
import LabelSlideButton from "@/components/originkit/LabelSlideButton";
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

  const stepLabels = ["Business", "Google connection", "Preferences"];

  return (
    <div className="relative min-h-screen overflow-hidden px-5 py-10">
      <div className="rd-aurora" aria-hidden="true"><i /></div>
      <div className="relative mx-auto max-w-[640px]">
        <div className="mb-8 flex items-center gap-2.5">
          <LogoMark size={26} />
          <span className="rd-display text-lg">ReviewDesk</span>
        </div>

        {/* Progress: daisyUI steps */}
        <div className="card card-border bg-base-100 p-5 mb-6">
          <ul className="steps w-full">
            {stepLabels.map((label, i) => (
              <li
                key={label}
                className={`step font-display ${step >= i + 1 ? "step-primary" : ""}`}
                data-content={i + 1}
              >
                <span className="rd-mono hidden sm:inline" style={{ color: step === i + 1 ? "#111827" : undefined }}>{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card card-border bg-base-100 p-7">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <div className="rd-kicker mb-1 text-primary">Step 1 · Business</div>
                <h1 className="rd-display text-2xl"><SkewInText text="Tell the desk who is replying" /></h1>
                <p className="mt-1 text-sm text-[#6B7280]">
                  These details feed the frozen reply rules: the sign-off ends every draft, and the
                  contact line is the only place drafts may quote a phone number from.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <fieldset className="fieldset sm:col-span-2">
                  <legend className="fieldset-legend rd-kicker">Business name *</legend>
                  <input id="ob-name" className="input w-full" aria-label="Business name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Spice Corner" required />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend rd-kicker">Category</legend>
                  <select id="ob-category" className="select w-full" aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                    {["restaurant", "cafe", "bakery", "salon", "clinic", "grocery", "gym", "hotel", "shop", "other"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend rd-kicker">Owner name</legend>
                  <input id="ob-owner" className="input w-full" aria-label="Owner name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Imran" />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend rd-kicker">Sign-off</legend>
                  <input id="ob-signoff" className="input w-full" aria-label="Sign-off" value={signOff} onChange={(e) => setSignOff(e.target.value)} placeholder={signOffPreview} />
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend rd-kicker">Contact line</legend>
                  <input id="ob-contact" className="input w-full" aria-label="Contact line" value={contactLine} onChange={(e) => setContactLine(e.target.value)} placeholder="WhatsApp 03XX-XXXXXXX" />
                </fieldset>
                <fieldset className="fieldset sm:col-span-2">
                  <legend className="fieldset-legend rd-kicker">Offers you allow in replies</legend>
                  <input id="ob-offers" className="input w-full" aria-label="Offers you allow in replies" value={allowedOffers} onChange={(e) => setAllowedOffers(e.target.value)} placeholder="none" />
                  <p className="rd-mono mt-1.5">Keep &ldquo;none&rdquo; and drafts will never promise refunds, discounts or free items.</p>
                </fieldset>
                <fieldset className="fieldset sm:col-span-2">
                  <legend className="fieldset-legend rd-kicker">What the business does (optional)</legend>
                  <textarea id="ob-desc" className="textarea w-full min-h-[72px]" aria-label="What the business does" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Family-run Pakistani restaurant known for karahi and biryani" />
                </fieldset>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <div className="rd-kicker mb-1 text-primary">Step 2 · Google connection</div>
                <h1 className="rd-display text-2xl"><SkewInText text="Bring your Google Business credentials" /></h1>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Paste a Google Business Profile API key or an OAuth access token. It is encrypted
                  with AES-256-GCM before it touches the database and is never shown again. Review
                  data needs OAuth consent: a bare API key alone cannot read reviews; without a
                  connection the desk runs on the simulated inbox and nothing is ever sent.
                </p>
              </div>

              <div role="tablist" aria-label="Credential type" className="tabs tabs-box w-full">
                {(["skip", "api_key", "oauth_token"] as const).map((v) => (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={mode === v}
                    className={`tab flex-1 ${mode === v ? "tab-active" : ""}`}
                    onClick={() => setMode(v)}
                    type="button"
                  >
                    {v === "skip" ? "Skip for now" : v === "api_key" ? "API key" : "OAuth token"}
                  </button>
                ))}
              </div>

              <a
                href="/api/auth/google/start"
                className="btn btn-primary w-full min-h-[44px]"
                style={{ opacity: oauthConfigured === false ? 0.55 : 1 }}
                onClick={(e) => { if (oauthConfigured === false) e.preventDefault(); }}
                aria-disabled={oauthConfigured === false}
                title={oauthConfigured === false ? "The admin needs to set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first" : "Sign in with Google and consent to review access"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81"/></svg>
                Connect with Google{oauthConfigured === false ? " (needs admin setup)" : ""}
              </a>
              {initialGoogleStatus === "error" && (
                <div className="alert alert-error" role="alert">
                  <span className="text-sm">Google connection failed: {initialGoogleMessage ?? "unknown error"}</span>
                </div>
              )}

              {mode === "api_key" && (
                <div className="space-y-4">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend rd-kicker">Google API key</legend>
                    <input id="ob-apikey" className="input w-full font-mono text-sm" type="password" aria-label="Google API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AIza…" autoComplete="off" />
                  </fieldset>
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend rd-kicker">Place or location id (optional)</legend>
                    <input id="ob-location" className="input w-full font-mono text-sm" aria-label="Place or location id" value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="accounts/{id}/locations/{id} or places/{place_id}" />
                  </fieldset>
                </div>
              )}

              {mode === "oauth_token" && (
                <div className="space-y-4">
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend rd-kicker">OAuth access token (Business Profile scopes)</legend>
                    <input id="ob-token" className="input w-full font-mono text-sm" type="password" aria-label="OAuth access token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ya29.…" autoComplete="off" />
                  </fieldset>
                  <fieldset className="fieldset">
                    <legend className="fieldset-legend rd-kicker">Location resource name</legend>
                    <input id="ob-location2" className="input w-full font-mono text-sm" aria-label="Location resource name" value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="accounts/{id}/locations/{id}" />
                    <p className="rd-mono mt-1.5">Needed to fetch reviews and reply. Find it in the Business Profile API explorer.</p>
                  </fieldset>
                </div>
              )}

              {mode !== "skip" && (
                <div className="alert alert-warning" role="status">
                  <span className="text-sm">
                    You can test this in Settings later. Until a live connection verifies, every
                    approved reply stays <strong>recorded in your workspace</strong>; nothing is sent to Google.
                  </span>
                </div>
              )}
              {mode === "skip" && (
                <div className="alert alert-success" role="status">
                  <span className="text-sm">
                    Skipping keeps you fully in demo mode with the simulated inbox, a good way to learn the desk first.
                  </span>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <div className="rd-kicker mb-1 text-primary">Step 3 · Preferences</div>
                <h1 className="rd-display text-2xl"><SkewInText text="How should drafts sound?" /></h1>
                <p className="mt-1 text-sm text-[#6B7280]">
                  You can change all of this later. Autopilot stays off until you switch it on with a
                  veto window, a daily cap and dry-run mode.
                </p>
              </div>
              <div>
                <span className="rd-kicker mb-1.5 block">Default tone</span>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Default tone">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`btn btn-sm ${replyTone === t ? "btn-neutral" : "btn-outline"}`}
                      onClick={() => setReplyTone(t)}
                      aria-pressed={replyTone === t}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <fieldset className="fieldset">
                  <legend className="fieldset-legend rd-kicker">Reply language</legend>
                  <select id="ob-lang" className="select w-full" aria-label="Reply language" value={replyLanguage} onChange={(e) => setReplyLanguage(e.target.value)}>
                    {COMMON_LANGUAGES.map((l) => <option key={l} value={l}>{l === "auto" ? "auto (match the reviewer)" : l}</option>)}
                  </select>
                </fieldset>
                <fieldset className="fieldset">
                  <legend className="fieldset-legend rd-kicker">Your reading language</legend>
                  <select id="ob-ownerlang" className="select w-full" aria-label="Your reading language" value={ownerLanguage} onChange={(e) => setOwnerLanguage(e.target.value)}>
                    {COMMON_LANGUAGES.filter((l) => l !== "auto").map((l) => <option key={l} value={l}>{l}</option>)}
                    <option value="English">English</option>
                  </select>
                </fieldset>
              </div>
              <div className="card card-border bg-base-100 p-4">
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
            <div className="alert alert-error mt-5" role="alert">
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="mt-7 flex items-center justify-between gap-3">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
            >
              Back
            </button>
            <span className="rd-mono">step {step} of 3</span>
            {step < 3 ? (
              <LabelSlideButton
                className="btn btn-neutral"
                label="Continue"
                onClick={() => { setError(""); setStep(step + 1); }}
                disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
              />
            ) : (
              <LabelSlideButton
                className="btn btn-primary"
                label={busy ? (<><span className="loading loading-spinner loading-sm" aria-hidden="true" /> Setting up</>) : "Open my desk"}
                withIcon={!busy}
                onClick={finish}
                disabled={busy}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
