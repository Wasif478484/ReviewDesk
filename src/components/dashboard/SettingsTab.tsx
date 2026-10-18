'use client';

/**
 * SettingsTab.tsx, business profile, Google Business connection manager and
 * honest security notes. Connection paths:
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

  const statusColor =
    cred?.status === "connected" ? "#15803D"
    : cred?.status === "error" ? "#DC2626"
    : "#854D0E";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Business profile */}
      <section className="rd-card p-6">
        <div className="rd-double-rule mb-5" />
        <div className="rd-kicker mb-4">Business profile</div>
        <div className="space-y-4">
          <div>
            <label htmlFor="st-name" className="rd-kicker mb-1.5 block">Business name</label>
            <input id="st-name" className="rd-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="st-category" className="rd-kicker mb-1.5 block">Category</label>
              <select id="st-category" className="rd-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {["restaurant", "cafe", "bakery", "salon", "clinic", "grocery", "gym", "hotel", "shop", "other"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="st-owner" className="rd-kicker mb-1.5 block">Owner name</label>
              <input id="st-owner" className="rd-input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="st-signoff" className="rd-kicker mb-1.5 block">Sign-off</label>
              <input id="st-signoff" className="rd-input" value={signOff} onChange={(e) => setSignOff(e.target.value)} />
            </div>
            <div>
              <label htmlFor="st-contact" className="rd-kicker mb-1.5 block">Contact line</label>
              <input id="st-contact" className="rd-input" value={contactLine} onChange={(e) => setContactLine(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="st-offers" className="rd-kicker mb-1.5 block">Offers you allow in replies</label>
            <input id="st-offers" className="rd-input" value={allowedOffers} onChange={(e) => setAllowedOffers(e.target.value)} />
          </div>
          <div>
            <label htmlFor="st-desc" className="rd-kicker mb-1.5 block">What the business does</label>
            <textarea id="st-desc" className="rd-input min-h-[72px]" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <span className="rd-kicker mb-1.5 block">Tone</span>
              <select className="rd-input" value={replyTone} onChange={(e) => setReplyTone(e.target.value)} aria-label="Tone">
                {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="st-lang" className="rd-kicker mb-1.5 block">Reply language</label>
              <select id="st-lang" className="rd-input" value={replyLanguage} onChange={(e) => setReplyLanguage(e.target.value)}>
                {COMMON_LANGUAGES.map((l) => <option key={l} value={l}>{l === "auto" ? "auto" : l}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="st-ownerlang" className="rd-kicker mb-1.5 block">Your language</label>
              <select id="st-ownerlang" className="rd-input" value={ownerLanguage} onChange={(e) => setOwnerLanguage(e.target.value)}>
                {COMMON_LANGUAGES.filter((l) => l !== "auto").map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <button className="rd-btn-ink w-full px-6 py-3 text-sm" onClick={saveBusiness} disabled={busy}>
            Save business profile
          </button>
        </div>
      </section>

      {/* Connection + security notes */}
      <div className="space-y-6">
        <section className="rd-card p-6">
          <div className="rd-double-rule mb-5" />
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="rd-kicker">Google Business connection</div>
            {cred && cred.mode !== "none" && (
              <span className="rd-chip" style={{ color: statusColor, borderColor: statusColor }}>
                {cred.status} · {cred.mode === "oauth" ? `OAuth ${cred.keyHint}` : cred.mode === "oauth_token" ? `token ${cred.keyHint}` : `key ${cred.keyHint}`}
              </span>
            )}
          </div>

          {cred?.statusMessage && (
            <p className="mb-4 rounded-[10px] p-3 text-xs" style={{ background: "#F6F7F9", color: "#374151" }}>
              Last check: {cred.statusMessage}
              {cred.lastCheckedAt ? ` (${new Date(cred.lastCheckedAt).toLocaleString()})` : ""}
            </p>
          )}

          <div className="rd-tabs mb-4 w-full" role="tablist" aria-label="Connection type">
            {([["oauth", "Connect Google"], ["api_key", "API key"], ["oauth_token", "Paste token"]] as const).map(([v, label]) => (
              <button key={v} role="tab" aria-selected={mode === v} className={`rd-tab ${mode === v ? "rd-tab-active" : ""}`} onClick={() => setMode(v)}>
                {label}
              </button>
            ))}
          </div>

          {mode === "oauth" && (
            <div className="space-y-4">
              {!oauthConnected ? (
                <>
                  {ws.googleOAuthConfigured === false && (
                    <p className="rounded-[10px] p-3 text-sm" style={{ background: "#FBF3D9", border: "1px dashed #854D0E", color: "#854D0E" }}>
                      This deployment does not have Google OAuth configured yet. An admin must set
                      GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (plus the redirect URI in the Google
                      Cloud console) before this button will work. You can still paste a token below.
                    </p>
                  )}
                  <a
                    href="/api/auth/google/start"
                    className={`rd-btn-green flex w-full items-center justify-center gap-2 px-5 py-3 text-sm min-h-[44px] ${ws.googleOAuthConfigured === false ? "pointer-events-none opacity-55" : ""}`}
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
                  <div className="rounded-[10px] p-3 text-sm" style={{ background: "#E9F9EF", border: "1px solid #15803D", color: "#166534" }}>
                    Connected{cred?.grantedEmail ? ` as ${cred.grantedEmail}` : ""}. Access tokens refresh automatically.
                  </div>
                  <div>
                    <div className="rd-kicker mb-1.5 block">Location</div>
                    <div className="flex flex-wrap gap-2">
                      <button className="rd-btn-ghost px-4 py-2 text-xs min-h-[36px]" onClick={discoverLocations} disabled={locBusy}>
                        {locBusy ? "Looking…" : "Find my locations"}
                      </button>
                      <button className="rd-btn-ghost px-4 py-2 text-xs min-h-[36px]" onClick={async () => {
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
                        className="rd-input mt-2"
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
                      <input className="rd-input mt-2 font-mono text-xs" value={locationId} onChange={(e) => setLocationId(e.target.value)} aria-label="Location resource name" />
                    )}
                  </div>
                  <label className="flex items-start justify-between gap-3 rounded-[10px] p-3" style={{ background: "#FBF3D9", border: "1px dashed #854D0E" }}>
                    <span className="text-sm" style={{ color: "#854D0E" }}>
                      <strong>Live posting</strong>
                      <span className="block text-xs">Send approved replies to Google via API. Off = everything stays recorded here.</span>
                    </span>
                    <input type="checkbox" checked={livePosting} onChange={(e) => setLivePosting(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#854D0E]" aria-label="Live posting" />
                  </label>
                  <button className="rd-btn-ink w-full px-5 py-2.5 text-sm" onClick={saveCredential} disabled={busy}>
                    Save location &amp; preferences
                  </button>
                </>
              )}
            </div>
          )}

          {mode === "api_key" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="st-apikey" className="rd-kicker mb-1.5 block">
                  API key {cred?.keyHint && cred.mode === "api_key" ? `(stored: ${cred.keyHint}; leave blank to keep)` : ""}
                </label>
                <input id="st-apikey" className="rd-input font-mono text-sm" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AIza…" autoComplete="off" />
              </div>
              <div>
                <label htmlFor="st-loc" className="rd-kicker mb-1.5 block">Place or location id (optional)</label>
                <input id="st-loc" className="rd-input font-mono text-sm" value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="places/{place_id}" />
                <p className="rd-mono mt-1.5">An API key alone cannot read reviews. Google requires OAuth consent for review data. Use Connect Google for the full experience.</p>
              </div>
              <button className="rd-btn-ink w-full px-5 py-2.5 text-sm" onClick={saveCredential} disabled={busy}>Save</button>
            </div>
          )}

          {mode === "oauth_token" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="st-token" className="rd-kicker mb-1.5 block">
                  OAuth access token {cred?.keyHint && cred.mode === "oauth_token" ? `(stored: ${cred.keyHint}; leave blank to keep)` : ""}
                </label>
                <input id="st-token" className="rd-input font-mono text-sm" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ya29.…" autoComplete="off" />
              </div>
              <div>
                <label htmlFor="st-loc2" className="rd-kicker mb-1.5 block">Location resource name</label>
                <input id="st-loc2" className="rd-input font-mono text-sm" value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder="accounts/{id}/locations/{id}" />
                <p className="rd-mono mt-1.5">Pasted access tokens expire within the hour. Connect Google stores a refresh token instead.</p>
              </div>
              <label className="flex items-start justify-between gap-3 rounded-[10px] p-3" style={{ background: "#FBF3D9", border: "1px dashed #854D0E" }}>
                <span className="text-sm" style={{ color: "#854D0E" }}>
                  <strong>Live posting</strong>
                  <span className="block text-xs">Send approved replies to Google via API. Off = everything stays recorded here.</span>
                </span>
                <input type="checkbox" checked={livePosting} onChange={(e) => setLivePosting(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[#854D0E]" aria-label="Live posting" />
              </label>
              <button className="rd-btn-ink w-full px-5 py-2.5 text-sm" onClick={saveCredential} disabled={busy}>Save</button>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {mode !== "oauth" && (
              <button className="rd-btn-ghost px-5 py-2.5 text-sm" onClick={testCredential} disabled={busy}>Test connection</button>
            )}
            {cred && cred.mode !== "none" && (
              <button className="rd-btn-ghost px-5 py-2.5 text-sm" style={{ color: "#DC2626" }} onClick={disconnect} disabled={busy}>Disconnect</button>
            )}
          </div>

          {testResult && (
            <p className="mt-4 rounded-[10px] p-3 text-sm" role="status"
              style={{ background: testResult.ok ? "#E9F9EF" : "#FEE9E9", border: `1px solid ${testResult.ok ? "#15803D" : "#DC2626"}`, color: testResult.ok ? "#166534" : "#B91C1C" }}>
              {testResult.message}
              {testResult.fetchNote && <span className="mt-1 block text-xs">{testResult.fetchNote}</span>}
            </p>
          )}
        </section>

        <section className="rd-night-card p-6">
          <div className="rd-kicker mb-3" style={{ color: "rgba(250,250,252,.72)" }}>How your data is handled</div>
          <ul className="space-y-2.5 text-sm" style={{ color: "rgba(250,250,252,.82)" }}>
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
