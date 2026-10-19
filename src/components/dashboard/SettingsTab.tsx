'use client';

/**
 * SettingsTab.tsx, business profile, Google Business connection manager and
 * honest security notes, built on daisyUI components (tabs-box, fieldset,
 * input, toggle, alert, badge). Connection paths:
 *   1. Connect with Google (full OAuth, refresh tokens, location picker)
 *   2. API key (advanced; cannot read reviews without OAuth)
 *   3. Paste an OAuth access token (advanced; short-lived)
 * Secrets are encrypted at rest and never returned to the browser.
 */

import { useState } from "react";
import { COMMON_LANGUAGES, TONES } from "@/lib/engine/prompts";
import type { WorkspaceData } from "@/types/reviewdesk";

interface SettingsTabProps {
  ws: WorkspaceData;
  refresh: () => Promise<void>;
  onNote: (note: string) => void;
}

interface GoogleLocation {
  name: string;
  title: string;
  address: string;
  account: string;
}

export default function SettingsTab({ ws, refresh, onNote }: SettingsTabProps) {
  const b = ws.business;
  const cred = ws.credential;
  const [busy, setBusy] = useState(false);

  // Business form
  const [name, setName] = useState(b?.name ?? "");
  const [category, setCategory] = useState(b?.category ?? "restaurant");
  const [ownerName, setOwnerName] = useState(b?.ownerName ?? "");
  const [signOff, setSignOff] = useState(b?.signOff ?? "");
  const [contactLine, setContactLine] = useState(b?.contactLine ?? "");
  const [allowedOffers, setAllowedOffers] = useState(b?.allowedOffers ?? "none");
  const [description, setDescription] = useState(b?.description ?? "");
  const [replyTone, setReplyTone] = useState(b?.replyTone ?? "warm");
  const [replyLanguage, setReplyLanguage] = useState(b?.replyLanguage ?? "auto");
  const [ownerLanguage, setOwnerLanguage] = useState(b?.ownerLanguage ?? "English");

  // Connection form
  const [mode, setMode] = useState<"oauth" | "api_key" | "oauth_token">(
    cred?.mode === "api_key" ? "api_key" : cred?.mode === "oauth_token" ? "oauth_token" : "oauth",
  );
  const [apiKey, setApiKey] = useState("");
  const [token, setToken] = useState("");
  const [locationId, setLocationId] = useState(cred?.locationId ?? "");
  const [livePosting, setLivePosting] = useState(cred?.livePosting ?? false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; fetchNote?: string } | null>(null);
  const [locations, setLocations] = useState<GoogleLocation[] | null>(null);
  const [locBusy, setLocBusy] = useState(false);

  const oauthConnected = cred?.mode === "oauth";

  async function saveBusiness() {
    setBusy(true);
    try {
      const res = await fetch("/api/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, category, ownerName, signOff, contactLine, allowedOffers,
          description, replyTone, replyLanguage, ownerLanguage,
        }),
      });
      const data = await res.json();
      onNote(res.ok ? "Business profile saved." : data.error);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function saveCredential() {
    setBusy(true);
    setTestResult(null);
    try {
      if (mode === "oauth") {
        const res = await fetch("/api/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "oauth", locationId, livePosting }),
        });
        const data = await res.json();
        onNote(res.ok ? "Connection preferences saved." : data.error);
        if (res.ok) await refresh();
        return;
      }
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          apiKey: mode === "api_key" ? (apiKey || (cred?.mode === "api_key" ? "••keep" : "")) : "",
          token: mode === "oauth_token" ? (token || (cred?.mode === "oauth_token" ? "••keep" : "")) : "",
          locationId,
          livePosting,
        }),
      });
      const data = await res.json();
      onNote(res.ok ? (data.message ? `Saved. ${data.message}` : "Connection saved.") : data.error);
      if (res.ok) {
        setApiKey("");
        setToken("");
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function testCredential() {
    setBusy(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/credentials/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: mode === "oauth" ? "oauth_token" : mode,
          apiKey: mode === "api_key" ? (apiKey || (cred?.mode === "api_key" ? "••test" : "")) : "",
          token: mode !== "api_key" ? (token || (cred?.mode === "oauth_token" ? "••test" : "")) : "",
          locationId,
        }),
      });
      const data = await res.json();
      setTestResult({ ok: Boolean(data.ok), message: data.message ?? data.error ?? "Unknown result.", fetchNote: data.fetchNote });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function discoverLocations() {
    setLocBusy(true);
    try {
      const res = await fetch("/api/google/locations");
      const data = await res.json();
      if (res.ok) {
        setLocations(data.locations);
        onNote(data.locations.length
          ? `Found ${data.locations.length} location(s) on your Google account.`
          : "No locations found on this Google account.");
      } else {
        onNote(data.error);
      }
    } finally {
      setLocBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await fetch("/api/credentials", { method: "DELETE" });
      onNote("Connection removed. The desk is back on the demo inbox.");
      setLivePosting(false);
      setLocations(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const statusBadge =
    cred?.status === "connected" ? "badge-success"
    : cred?.status === "error" ? "badge-error"
    : "badge-warning";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Business profile */}
      <section className="card card-border bg-base-100 p-6">
        <div className="rd-double-rule mb-5" />
        <div className="rd-kicker mb-4">Business profile</div>
        <div className="space-y-4">
          <fieldset className="fieldset">
            <legend className="fieldset-legend rd-kicker">Business name</legend>
            <input id="st-name" className="input w-full" aria-label="Business name" value={name} onChange={(e) => setName(e.target.value)} />
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset className="fieldset">
              <legend className="fieldset-legend rd-kicker">Category</legend>
              <select id="st-category" className="select w-full" aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                {["restaurant", "cafe", "bakery", "salon", "clinic", "grocery", "gym", "hotel", "shop", "other"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend rd-kicker">Owner name</legend>
              <input id="st-owner" className="input w-full" aria-label="Owner name" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            </fieldset>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset className="fieldset">
              <legend className="fieldset-legend rd-kicker">Sign-off</legend>
              <input id="st-signoff" className="input w-full" aria-label="Sign-off" value={signOff} onChange={(e) => setSignOff(e.target.value)} />
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend rd-kicker">Contact line</legend>
              <input id="st-contact" className="input w-full" aria-label="Contact line" value={contactLine} onChange={(e) => setContactLine(e.target.value)} />
            </fieldset>
          </div>
          <fieldset className="fieldset">
            <legend className="fieldset-legend rd-kicker">Offers you allow in replies</legend>
            <input id="st-offers" className="input w-full" aria-label="Offers you allow in replies" value={allowedOffers} onChange={(e) => setAllowedOffers(e.target.value)} />
          </fieldset>
          <fieldset className="fieldset">
            <legend className="fieldset-legend rd-kicker">What the business does</legend>
            <textarea id="st-desc" className="textarea w-full min-h-[72px]" aria-label="What the business does" value={description} onChange={(e) => setDescription(e.target.value)} />
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-3">
            <fieldset className="fieldset">
              <legend className="fieldset-legend rd-kicker">Tone</legend>
              <select className="select w-full" value={replyTone} onChange={(e) => setReplyTone(e.target.value)} aria-label="Tone">
                {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend rd-kicker">Reply language</legend>
              <select id="st-lang" className="select w-full" value={replyLanguage} onChange={(e) => setReplyLanguage(e.target.value)}>
                {COMMON_LANGUAGES.map((l) => <option key={l} value={l}>{l === "auto" ? "auto" : l}</option>)}
              </select>
            </fieldset>
            <fieldset className="fieldset">
              <legend className="fieldset-legend rd-kicker">Your language</legend>
              <select id="st-ownerlang" className="select w-full" value={ownerLanguage} onChange={(e) => setOwnerLanguage(e.target.value)}>
                {COMMON_LANGUAGES.filter((l) => l !== "auto").map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </fieldset>
          </div>
          <button className="btn btn-neutral w-full" onClick={saveBusiness} disabled={busy}>
            {busy ? <span className="loading loading-spinner loading-sm" aria-hidden="true" /> : null}
            Save business profile
          </button>
        </div>
      </section>

      {/* Connection + security notes */}
      <div className="space-y-6">
        <section className="card card-border bg-base-100 p-6">
          <div className="rd-double-rule mb-5" />
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="rd-kicker">Google Business connection</div>
            {cred && cred.mode !== "none" && (
              <span className={`badge badge-soft font-mono ${statusBadge}`}>
                {cred.status} · {cred.mode === "oauth" ? `OAuth ${cred.keyHint}` : cred.mode === "oauth_token" ? `token ${cred.keyHint}` : `key ${cred.keyHint}`}
              </span>
            )}
          </div>

          {cred?.statusMessage && (
            <p className="mb-4 rounded-[10px] p-3 text-xs text-base-content/70" style={{ background: "#F6F7F9" }}>
              Last check: {cred.statusMessage}
              {cred.lastCheckedAt ? ` (${new Date(cred.lastCheckedAt).toLocaleString()})` : ""}
            </p>
          )}

          <div className="tabs tabs-box mb-4 w-full" role="tablist" aria-label="Connection type">
            {([["oauth", "Connect Google"], ["api_key", "API key"], ["oauth_token", "Paste token"]] as const).map(([v, label]) => (
              <button key={v} role="tab" aria-selected={mode === v} className={`tab flex-1 ${mode === v ? "tab-active" : ""}`} onClick={() => setMode(v)}>
                {label}
              </button>
            ))}
          </div>

          {mode === "oauth" && (
            <div className="space-y-4">
              {!oauthConnected ? (
                <>
                  {ws.googleOAuthConfigured === false && (
                    <div className="alert alert-warning" role="status">
                      <span className="text-sm">
                        This deployment does not have Google OAuth configured yet. An admin must set
                        GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (plus the redirect URI in the Google
                        Cloud console) before this button will work. You can still paste a token below.
                      </span>
                    </div>
                  )}
                  <a
                    href="/api/auth/google/start"
                    className={`btn btn-primary w-full min-h-[44px] ${ws.googleOAuthConfigured === false ? "pointer-events-none opacity-55" : ""}`}
                    aria-disabled={ws.googleOAuthConfigured === false}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81"/></svg>
                    Connect with Google
                  </a>
                  <p className="rd-mono">
                    You will consent to review access for your business account. A refresh token is
                    stored encrypted, so the connection keeps working without re-pasting tokens.
                  </p>
                </>
              ) : (
                <>
                  <div className="alert alert-success" role="status">
                    <span className="text-sm">
                      Connected{cred?.grantedEmail ? ` as ${cred.grantedEmail}` : ""}. Access tokens refresh automatically.
                    </span>
                  </div>
                  <div>
                    <div className="rd-kicker mb-1.5 block">Location</div>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn btn-outline btn-sm" onClick={discoverLocations} disabled={locBusy}>
                        {locBusy ? <span className="loading loading-spinner loading-xs" aria-hidden="true" /> : null}
                        {locBusy ? "Looking" : "Find my locations"}
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={async () => {
                        const res = await fetch("/api/reviews/fetch-google", { method: "POST" });
                        const data = await res.json();
                        onNote(res.ok ? (data.message ?? `Imported ${data.imported} review(s).`) : data.error);
                        if (res.ok) await refresh();
                      }}>
                        Fetch reviews now
                      </button>
                    </div>
                    {locations && (
                      <select
                        className="select mt-2 w-full"
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                        aria-label="Choose location"
                      >
                        <option value="">Choose a location...</option>
                        {locations.map((l) => (
                          <option key={l.name} value={l.name}>{l.title} · {l.address || l.name}</option>
                        ))}
                      </select>
                    )}
                    {!locations && locationId && (
                      <input className="input mt-2 w-full font-mono text-xs" value={locationId} onChange={(e) => setLocationId(e.target.value)} aria-label="Location resource name" />
                    )}
                  </div>
                  <label className="flex items-start justify-between gap-3 rounded-[10px] p-3" style={{ background: "#FBF3D9", border: "1px dashed #854D0E" }}>
                    <span className="text-sm text-[#854D0E]">
                      <strong>Live posting</strong>
                      <span className="block text-xs">Send approved replies to Google via API. Off = everything stays recorded here.</span>
                    </span>
                    <input type="checkbox" checked={livePosting} onChange={(e) => setLivePosting(e.target.checked)} className="toggle toggle-sm mt-0.5" aria-label="Live posting" />
                  </label>
                  <button className="btn btn-neutral w-full" onClick={saveCredential} disabled={busy}>
                    Save location &amp; preferences
                  </button>
                </>
              )}
            </div>
          )}

          {mode === "api_key" && (
            <div className="space-y-4">
              <fieldset className="fieldset">
                <legend className="fieldset-legend rd-kicker">
                  API key {cred?.keyHint && cred.mode === "api_key" ? `(stored: ${cred.keyHint}; leave blank to keep)` : ""}
                </legend>
                <input id="st-apikey" className="input w-full font-mono text-sm" type="password" aria-label="API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AIza…" autoComplete="off" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend rd-kicker">Place or location id (optional)</legend>
                <input id="st-loc" className="input w-full font-mono text-sm" aria-label="Place or location id" value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="places/{place_id}" />
                <p className="rd-mono mt-1.5">An API key alone cannot read reviews. Google requires OAuth consent for review data. Use Connect Google for the full experience.</p>
              </fieldset>
              <button className="btn btn-neutral w-full" onClick={saveCredential} disabled={busy}>Save</button>
            </div>
          )}

          {mode === "oauth_token" && (
            <div className="space-y-4">
              <fieldset className="fieldset">
                <legend className="fieldset-legend rd-kicker">
                  OAuth access token {cred?.keyHint && cred.mode === "oauth_token" ? `(stored: ${cred.keyHint}; leave blank to keep)` : ""}
                </legend>
                <input id="st-token" className="input w-full font-mono text-sm" type="password" aria-label="OAuth access token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ya29.…" autoComplete="off" />
              </fieldset>
              <fieldset className="fieldset">
                <legend className="fieldset-legend rd-kicker">Location resource name</legend>
                <input id="st-loc2" className="input w-full font-mono text-sm" aria-label="Location resource name" value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="accounts/{id}/locations/{id}" />
                <p className="rd-mono mt-1.5">Pasted access tokens expire within the hour. Connect Google stores a refresh token instead.</p>
              </fieldset>
              <label className="flex items-start justify-between gap-3 rounded-[10px] p-3" style={{ background: "#FBF3D9", border: "1px dashed #854D0E" }}>
                <span className="text-sm text-[#854D0E]">
                  <strong>Live posting</strong>
                  <span className="block text-xs">Send approved replies to Google via API. Off = everything stays recorded here.</span>
                </span>
                <input type="checkbox" checked={livePosting} onChange={(e) => setLivePosting(e.target.checked)} className="toggle toggle-sm mt-0.5" aria-label="Live posting" />
              </label>
              <button className="btn btn-neutral w-full" onClick={saveCredential} disabled={busy}>Save</button>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {mode !== "oauth" && (
              <button className="btn btn-outline btn-sm" onClick={testCredential} disabled={busy}>Test connection</button>
            )}
            {cred && cred.mode !== "none" && (
              <button className="btn btn-outline btn-sm text-error" onClick={disconnect} disabled={busy}>Disconnect</button>
            )}
          </div>

          {testResult && (
            <div className={`alert mt-4 ${testResult.ok ? "alert-success" : "alert-error"}`} role="status">
              <div className="text-sm">
                <span>{testResult.message}</span>
                {testResult.fetchNote && <span className="mt-1 block text-xs">{testResult.fetchNote}</span>}
              </div>
            </div>
          )}
        </section>

        <section className="card bg-neutral text-neutral-content border border-neutral p-6">
          <div className="rd-kicker mb-3 text-[rgba(250,250,252,.72)]">How your data is handled</div>
          <ul className="space-y-2.5 text-sm text-[rgba(250,250,252,.82)]">
            <li>· Your Google credential is encrypted with AES-256-GCM before storage and never sent back to the browser; only a masked hint.</li>
            <li>· Review text is sent to the model provider for triage. That is the only outbound AI call.</li>
            <li>· Approved replies are <strong>recorded in your workspace</strong>. They reach Google only when live posting is on and the API call succeeds.</li>
            <li>· Passwords are hashed with bcrypt; sessions use signed httpOnly cookies; reset and verification links are single-use and expire.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
