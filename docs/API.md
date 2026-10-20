# API reference

Every endpoint lives under `src/app/api`. All of them return JSON. A route
that needs a signed-in user reads the `rd_session` httpOnly cookie and returns
`401` with `{"error": "Not signed in"}` when it is missing.

| Method   | Path                                            | Auth | Purpose                                                                           |
| -------- | ----------------------------------------------- | ---- | --------------------------------------------------------------------------------- |
| `GET`    | `/api/health`                                   | no   | Liveness and readiness                                                            |
| `POST`   | `/api/auth/signup`                              | no   | Create an account, send the verification mail                                     |
| `POST`   | `/api/auth/login`                               | no   | Sign in, set the session cookie                                                   |
| `POST`   | `/api/auth/logout`                              | yes  | Clear the session cookie                                                          |
| `GET`    | `/api/auth/verify-email`                        | no   | Consume a verification token                                                      |
| `POST`   | `/api/auth/resend-verification`                 | yes  | Send a new verification mail                                                      |
| `POST`   | `/api/auth/forgot-password`                     | no   | Send a reset mail                                                                 |
| `POST`   | `/api/auth/reset-password`                      | no   | Consume a reset token, set the new password                                       |
| `GET`    | `/api/auth/google/start`                        | yes  | Begin the Google OAuth consent flow                                               |
| `GET`    | `/api/auth/google/callback`                     | no   | Finish the Google OAuth flow                                                      |
| `GET`    | `/api/workspace`                                | yes  | The whole boot payload: user, business, policy, reviews, stats, analytics, audits |
| `PUT`    | `/api/business`                                 | yes  | Business profile and desk preferences                                             |
| `POST`   | `/api/onboarding`                               | yes  | First-run setup                                                                   |
| `POST`   | `/api/analyze`                                  | yes  | Triage one review or a batch                                                      |
| `GET`    | `/api/reviews`                                  | -    | Not used. Reviews arrive through the workspace payload                            |
| `POST`   | `/api/reviews`                                  | yes  | Import reviews from CSV, with a source                                            |
| `POST`   | `/api/reviews/actions`                          | yes  | Record, dismiss, or undo a reply                                                  |
| `POST`   | `/api/reviews/fetch-google`                     | yes  | Pull reviews from the connected Google account                                    |
| `GET`    | `/api/policy`                                   | yes  | The autopilot policy                                                              |
| `PUT`    | `/api/policy`                                   | yes  | Update the autopilot policy                                                       |
| `POST`   | `/api/autopilot`                                | yes  | Run one autopilot cycle                                                           |
| `GET`    | `/api/credentials`                              | yes  | The masked Google connection                                                      |
| `POST`   | `/api/credentials`                              | yes  | Save a Google connection                                                          |
| `DELETE` | `/api/credentials`                              | yes  | Remove the Google connection                                                      |
| `POST`   | `/api/credentials/test`                         | yes  | Check a credential without saving it                                              |
| `GET`    | `/api/google/locations`                         | yes  | Locations on the connected Google account                                         |
| `GET`    | `/api/organizations`                            | yes  | Organizations the caller belongs to                                               |
| `POST`   | `/api/organizations`                            | yes  | Create an organization, the caller becomes owner                                  |
| `GET`    | `/api/organizations/{orgId}`                    | yes  | One organization and its members                                                  |
| `PUT`    | `/api/organizations/{orgId}`                    | yes  | Rename the organization, owners only                                              |
| `GET`    | `/api/organizations/{orgId}/members`            | yes  | List members                                                                      |
| `POST`   | `/api/organizations/{orgId}/members`            | yes  | Add an existing account, owners and managers                                      |
| `PUT`    | `/api/organizations/{orgId}/members/{memberId}` | yes  | Change a role, owners and managers                                                |
| `DELETE` | `/api/organizations/{orgId}/members/{memberId}` | yes  | Remove a member, owners only                                                      |
| `GET`    | `/api/organizations/{orgId}/rules`              | yes  | List the automation rules                                                         |
| `POST`   | `/api/organizations/{orgId}/rules`              | yes  | Create a rule, owners and managers                                                |
| `DELETE` | `/api/organizations/{orgId}/rules/{ruleId}`     | yes  | Remove a rule, owners and managers                                                |
| `GET`    | `/api/templates`                                | yes  | List the reply templates                                                          |
| `POST`   | `/api/templates`                                | yes  | Create a reply template                                                           |
| `GET`    | `/api/templates/{templateId}`                   | yes  | One template                                                                      |
| `PUT`    | `/api/templates/{templateId}`                   | yes  | Update a template                                                                 |
| `DELETE` | `/api/templates/{templateId}`                   | yes  | Delete a template                                                                 |

## Conventions

### Errors

Every failure is a JSON body with an `error` string that is safe to show a
user. Stack traces go to the server console and never to the response.

```json
{ "error": "Not signed in" }
```

| Status | Meaning                                                           |
| ------ | ----------------------------------------------------------------- |
| `400`  | The request was malformed or a value was out of range             |
| `401`  | No session, or the session expired                                |
| `403`  | Signed in, but not allowed to do this                             |
| `404`  | Not found, or not yours to see                                    |
| `409`  | Conflict, such as an email that is already registered             |
| `500`  | Something failed on the server. The message is generic on purpose |

### The action values

`reply`, `reply_needs_owner`, `hold`, `report`. These come from the frozen
engine in `src/lib/engine/prompts.ts` and are the only ones. Labels and
colors live in one dict, `ACTION_META` in `src/types/reviewdesk.ts`.

### Roles

`owner`, `manager`, `responder`, `viewer`.

|                       | owner | manager | responder | viewer    |
| --------------------- | ----- | ------- | --------- | --------- |
| Work the desk         | yes   | yes     | yes       | read only |
| Record a reply        | yes   | yes     | yes       | no        |
| Add a member          | yes   | yes     | no        | no        |
| Change a role         | yes   | yes     | no        | no        |
| Remove a member       | yes   | no      | no        | no        |
| Edit rules            | yes   | yes     | no        | no        |
| Edit the organization | yes   | no      | no        | no        |

### Pagination and limits

| Limit                       | Value           | Where                 |
| --------------------------- | --------------- | --------------------- |
| Reviews per analyze call    | 30              | `POST /api/analyze`   |
| Batch size in the interface | 30              | The desk              |
| Audits returned             | 200             | `GET /api/workspace`  |
| Reply length target         | 30 to 80 words  | The draft rules       |
| Template content            | 2000 characters | `POST /api/templates` |

## Example: triage one review

```http
POST /api/analyze
Content-Type: application/json

{ "reviewId": "cmvabc123", "tone": "apologetic" }
```

```json
{
  "ok": true,
  "analyzed": 1,
  "failed": 0,
  "results": [{ "reviewId": "cmvabc123", "ok": true, "action": "reply" }]
}
```

A rule that matches the review can change the action. The response still
reports the action that was stored, so the caller always sees what the desk
did.

## Example: create a rule

```http
POST /api/organizations/{orgId}/rules
Content-Type: application/json

{
  "name": "Hold health and legal claims",
  "forceAction": "hold",
  "setPriority": "urgent",
  "keywords": ["doctor", "hospital", "sick", "legal", "lawyer"]
}
```

`forceAction` and `setPriority` are optional. A rule with neither still
records the match in the audit trail, so the owner can see which reviews a
rule touched.

## The health endpoint

```http
GET /api/health
```

```json
{
  "ok": true,
  "service": "reviewdesk",
  "version": 2,
  "checks": [
    { "name": "database", "ok": true, "detail": "reachable in 24ms" },
    { "name": "model_provider", "ok": true, "detail": "mock (offline canned responses)" },
    { "name": "google_oauth", "ok": false, "detail": "not configured" },
    { "name": "smtp", "ok": false, "detail": "not configured (dev links shown)" }
  ],
  "timestamp": "2026-10-20T12:00:00.000Z"
}
```

`200` when the database is reachable. `503` when it is not. The optional
integrations are reported but do not fail the check. No credential ever
appears in the response.
