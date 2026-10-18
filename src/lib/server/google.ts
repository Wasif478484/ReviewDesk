/**
 * google.ts, Google Business Profile connection (beta).
 *
 * What is real here:
 *   - verifyCredentials(): with an OAuth access token it calls the Account
 *     Management API to list accounts; with an API key it validates format
 *     and (when a place id is given) calls Place Details to confirm the key
 *     works. Results are reported honestly.
 *   - fetchGoogleReviews(): with an OAuth token + location id it lists
 *     reviews via the Business Information API (v4).
 *   - postGoogleReply(): only called when the owner explicitly enabled live
 *     posting and a token is present. Never called in demo mode.
 *
 * The Business Profile API needs OAuth user consent for review data; a bare
 * API key cannot read reviews. The UI says this so owners know which
 * credential type to provide.
 */

export interface GoogleReviewsFetch {
  reviews: Array<{
    externalId: string;
    stars: number | null;
    text: string;
    author: string;
    date: string;
    hasReply: boolean;
  }>;
}

const ACCOUNTS_URL = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
const LOCATIONS_URL = "https://mybusinessbusinessinformation.googleapis.com/v1";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const PLACES_URL = "https://places.googleapis.com/v1/places";

// ---------------------------------------------------------------------------
// OAuth 2.0: authorization-code flow with offline (refresh) tokens
// ---------------------------------------------------------------------------

export const OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
  "openid",
  "email",
  "profile",
].join(" ");

export function oauthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri(origin: string): string {
  return process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;
}

export function buildAuthUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(origin),
    response_type: "code",
    scope: OAUTH_SCOPES,
    access_type: "offline", // ask for a refresh token
    prompt: "consent", // refresh token is only issued on first consent
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  email: string;
}

/** Exchange an authorization code for tokens and identify the account. */
export async function exchangeCodeForTokens(code: string, origin: string): Promise<TokenSet> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (HTTP ${res.status}). ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const accessToken = String(data.access_token ?? "");
  if (!accessToken) throw new Error("Google did not return an access token.");
  let email = "";
  try {
    const info = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (info.ok) email = String((await info.json()).email ?? "");
  } catch { /* email is best-effort */ }
  return {
    accessToken,
    refreshToken: data.refresh_token ? String(data.refresh_token) : null,
    expiresIn: Number(data.expires_in ?? 3600),
    email,
  };
}

/** Exchange a refresh token for a fresh access token. */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed (HTTP ${res.status}). ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return { accessToken: String(data.access_token), expiresIn: Number(data.expires_in ?? 3600) };
}

/** List the Google Business accounts the user consented to. */
export async function listAccounts(token: string): Promise<Array<{ name: string; accountName: string }>> {
  const res = await fetch(ACCOUNTS_URL, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Accounts list failed (HTTP ${res.status}). ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.accounts ?? []).map((a: { name?: string; accountName?: string }) => ({
    name: String(a.name ?? ""),
    accountName: String(a.accountName ?? a.name ?? ""),
  }));
}

/** List locations under one account (Business Information API v1). */
export async function listLocations(token: string, accountName: string): Promise<Array<{ name: string; title: string; address: string }>> {
  const res = await fetch(
    `${LOCATIONS_URL}/${accountName}/locations?readMask=name,title,storefrontAddress`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Locations list failed (HTTP ${res.status}). ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.locations ?? []).map((l: { name?: string; title?: string; storefrontAddress?: { formattedAddress?: string } }) => ({
    name: String(l.name ?? ""),
    title: String(l.title ?? "Untitled location"),
    address: String(l.storefrontAddress?.formattedAddress ?? ""),
  }));
}

export interface VerifyOutcome {
  ok: boolean;
  status: "connected" | "unverified" | "error";
  message: string;
  accounts?: string[];
}

export async function verifyCredentials(
  mode: "api_key" | "oauth_token",
  apiKey: string,
  token: string,
  locationId: string,
): Promise<VerifyOutcome> {
  if (mode === "oauth_token") {
    if (!token) return { ok: false, status: "error", message: "No access token provided." };
    try {
      const res = await fetch(ACCOUNTS_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const accounts = (data.accounts ?? []).map((a: { name?: string; accountName?: string }) =>
          a.accountName ? `${a.accountName} (${a.name})` : String(a.name ?? ""),
        );
        return {
          ok: true,
          status: "connected",
          message: `OAuth token works. Found ${accounts.length} account(s).`,
          accounts,
        };
      }
      const body = await res.text();
      return {
        ok: false,
        status: "error",
        message: `Google rejected the token (HTTP ${res.status}). ${body.slice(0, 180)}`,
      };
    } catch (err) {
      return {
        ok: false,
        status: "error",
        message: `Could not reach Google: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  // api_key mode: format check + optional Place Details probe
  if (!apiKey) return { ok: false, status: "error", message: "No API key provided." };
  if (!/^[A-Za-z0-9_\-]{20,}$/.test(apiKey)) {
    return {
      ok: false,
      status: "error",
      message: "That does not look like a Google API key (expected a long alphanumeric string).",
    };
  }
  if (locationId && locationId.startsWith("places/")) {
    try {
      const placeId = locationId.replace(/^places\//, "");
      const res = await fetch(`${PLACES_URL}/${encodeURIComponent(placeId)}`, {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "id,displayName",
        },
      });
      if (res.ok) {
        const data = await res.json();
        return {
          ok: true,
          status: "connected",
          message: `Key works. Place: ${data.displayName?.text ?? placeId}.`,
        };
      }
      return {
        ok: false,
        status: "error",
        message: `Google rejected the key for that place (HTTP ${res.status}).`,
      };
    } catch (err) {
      return {
        ok: false,
        status: "error",
        message: `Could not reach Google Places: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
  return {
    ok: true,
    status: "unverified",
    message: "Key format looks valid. Add a place id to verify it against your listing.",
  };
}

/**
 * List reviews for a location. `locationId` is the full resource name, e.g.
 * accounts/{account}/locations/{locationId} (v4 API), or a bare place id,
 * which this method rejects because reviews need the accounts path.
 */
export async function fetchGoogleReviews(token: string, locationId: string): Promise<GoogleReviewsFetch> {
  if (!token) throw new Error("Live fetch needs an OAuth access token, not just an API key.");
  if (!locationId || !locationId.includes("locations/")) {
    throw new Error(
      "Set the full location resource name (accounts/{account}/locations/{locationId}) to fetch reviews.",
    );
  }
  const base = locationId.startsWith("accounts/")
    ? `https://mybusiness.googleapis.com/v4/${locationId}/reviews`
    : `https://mybusiness.googleapis.com/v4/accounts/-/locations/${locationId}/reviews`;
  const res = await fetch(base, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google reviews fetch failed (HTTP ${res.status}). ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const reviews = (data.reviews ?? []).map((r: {
    name?: string; reviewId?: string; starRating?: string; comment?: string;
    reviewer?: { displayName?: string }; createTime?: string; reviewReply?: unknown;
  }) => {
    const starMap: Record<string, number> = {
      ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5,
    };
    return {
      externalId: r.reviewId ?? r.name ?? crypto.randomUUID(),
      stars: starMap[r.starRating ?? ""] ?? null,
      text: r.comment ?? "",
      author: r.reviewer?.displayName ?? "Google user",
      date: (r.createTime ?? "").slice(0, 10),
      hasReply: Boolean(r.reviewReply),
    };
  });
  return { reviews };
}

/** Post a reply via the v4 API. Only for owners who opted into live posting. */
export async function postGoogleReply(
  token: string,
  locationId: string,
  reviewExternalId: string,
  text: string,
): Promise<void> {
  if (!token) throw new Error("Live posting needs an OAuth access token.");
  if (!locationId || !locationId.includes("locations/")) {
    throw new Error("Live posting needs the full location resource name.");
  }
  const url = `https://mybusiness.googleapis.com/v4/${locationId}/reviews/${encodeURIComponent(reviewExternalId)}/reply`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ comment: text }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google reply failed (HTTP ${res.status}). ${body.slice(0, 200)}`);
  }
}
