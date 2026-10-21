# ReviewDesk

**Know when not to reply.**

ReviewDesk is a review triage desk for local businesses. It reads a customer
review, decides which of four lanes it belongs in, drafts a policy-checked
reply in the reviewer's own language, and then waits for a human. The owner
copies the reply into Google Business by hand. Nothing is ever posted
automatically.

Live app: https://reviewdesk-nu.vercel.app
Source: https://github.com/Wasif478484/ReviewDesk

### Demo video

A three-minute walkthrough of the whole flow, from the marketing page through
the desk, a Roman Urdu complaint, a rule-forced hold, the ledger, the team
roles, and the template library.

> **reviewdesk-demo.mp4** · 1920x1080 · 2m 56s · silent track
> <https://github.com/Wasif478484/ReviewDesk/blob/main/demo-assets/reviewdesk-demo.mp4>

The video runs entirely on the offline mock provider, so no model calls are
made while recording it.

---

## Inspiration

Every review-reply tool I could find did the same thing. You paste a review,
it writes a reply, it posts the reply. The tool's job is the writing.

But the writing is the easy part. The hard part of running a small
business's reviews is the judgement: is this one a misunderstanding, a
complaint a manager should see, spam, or something that needs a lawyer? A
tool that cheerfully auto-posts a "we're sorry to hear that!" to a customer
who says they got food poisoning is worse than no tool at all. The failure
is public, permanent, and it lands exactly on the people already annoyed.

So the question that shaped the product was not "how do we write better
replies?" It was "how do we know when not to reply?" That question became
the name.

The second inspiration was a demo inbox. Every workspace starts with the
same 15 sample reviews, and they are deliberately the awkward ones:

- a Roman Urdu complaint about cold food and a 40-minute wait
- a one-star review claiming illness, written in Roman Urdu
- a spam review with a link in it
- a five-star review with no text at all
- a review where the food was fine but the parking was terrible
- a French and an Arabic complaint

If a tool cannot handle the hard ones, it should not be trusted with the
easy ones. Building the inbox around the awkward cases is what kept the
rest of the product honest.

---

## What it does

### Four lanes, decided by policy, not by the model

Every review lands in exactly one lane: **Reply**, **Check facts**, **Hold**,
or **Report**. The model produces a decision and a draft. The policy engine
decides what happens next, and the owner has the final word.

The distinction that matters is between *what the model thinks* and *what
the desk does with it*. A model that returns `reply` for a complaint is not
a safety problem. A model that returns `reply` and the desk posts it
automatically is.

### The auto-post gate

Autopilot exists, but it is off by default, runs dry-run first, waits
through a veto window, and is bounded by a daily cap. A review can only be
recorded without a click if **every** gate passes:

$$
\text{auto}(r) \;=\; \bigwedge_{c \,\in\, C} c(r)
$$

where $C$ is the set of gates, each of which must hold:

| Gate | Rule |
|---|---|
| $c_{\text{action}}$ | the action is exactly `reply` |
| $c_{\text{flags}}$ | no risk flags are present |
| $c_{\text{sentiment}}$ | sentiment is positive, or mixed and the owner opted in |
| $c_{\text{stars}}$ | the rating is at or above the owner's threshold |
| $c_{\text{lang}}$ | the reply language is on the owner's trusted list |
| $c_{\text{draft}}$ | the draft exists, is non-empty, and passes the draft checks |
| $c_{\text{cap}}$ | the daily cap has not been reached |
| $c_{\text{veto}}$ | the veto window has elapsed |

A single false gate sends the review to the approval queue. The gates are
conjunctive on purpose: the failure mode of an AND is a review that waits
for a human, and that is the failure mode we want.

### Priority, so the right review is first

The queue is sorted by how loudly a review should be flagged, which is a
pure function of what the triage produced:

$$
P(r) \;=\;
\begin{cases}
\text{urgent} & \text{if } a(r) = \texttt{hold} \;\lor\; F(r) \cap F_{\text{risk}} \neq \emptyset \\[4pt]
\text{normal} & \text{if } a(r) = \texttt{reply\_needs\_owner} \;\lor\; s(r) = \text{negative} \;\lor\; \star(r) \le 2 \\[4pt]
\text{low} & \text{if } a(r) = \texttt{reply} \;\land\; s(r) = \text{positive} \;\land\; \star(r) \ge 4
\end{cases}
$$

where $a(r)$ is the action, $s(r)$ the sentiment, $\star(r)$ the star rating,
$F(r)$ the set of risk flags, and $F_{\text{risk}} = \{\texttt{health},
\texttt{legal}, \texttt{abuse}, \texttt{spam}, \texttt{safety},
\texttt{discrimination}, \texttt{harassment}\}$. A hold or a risk flag is
always urgent, no matter what else the model said.

### The veto window

When autopilot does record a reply on its own, it does not do it
immediately. It schedules a deadline:

$$
\text{due\_at} \;=\; t_{\text{analyze}} + \Delta_{\text{veto}}, \qquad \Delta_{\text{veto}} \in [0, 60]\ \text{minutes}
$$

The owner can veto anything in that window, and the countdown is visible in
the queue. The default is 30 minutes.

### Everything else the desk does

- **Bulk actions** on the triage table: select many reviews, record, dismiss,
  or copy all the drafts at once
- **Tone switching** per review (warm, formal, apologetic) with re-analysis
- **Reply templates**: save the phrases you reuse, insert them into any draft
- **Draft version history**: every edit is kept, and any earlier version can
  be restored
- **Automation rules**: owner-configured rules that force the action or raise
  the priority for reviews matching a condition. A rule never posts anything,
  and a rule that forces an action always routes the review to the approval
  queue
- **Teams**: organizations with owner, manager, responder, and viewer roles
- **Source filtering** across Google, Yelp, Facebook, TripAdvisor, and
  imported CSV
- **An audit ledger**: every approve, veto, dismiss, and undo, with the reason
  and the actor attached
- **CSV export** of both the reviews and the full triage analysis
- **Search, sort, and filters** over the inbox, plus keyboard shortcuts
  (`A` analyze, `R` record, `C` copy, `D` dismiss, `V` revert)

---

## How I built it

### The shape of the thing

I started as a Streamlit prototype with a plain-Python workflow core, which
was the right call for exploring the rules but the wrong call for
shipping. The valuable part turned out to be the workflow core, not the
screen. So I rebuilt it as a Next.js full-stack app and kept the core as the
part that matters.

The engine is **two files that are frozen**:

```
src/lib/engine/prompts.ts    557 lines   the prompt, the parser, the draft checks
src/lib/engine/policy.ts      111 lines   the safety decision rules
```

Both are pure. They never import from the server layer, never touch the
database, and never read the environment. That is not an aesthetic
preference; it is what makes them testable, and testable is what makes
them trustworthy.

The request path is a straight line:

```
review text
  → buildSystemPrompt / buildUserMessage   (frozen)
  → callModel                               (the provider)
  → safeParse                               (frozen)
  → decide                                  (frozen)
  → applyRules                              (owner rules, above the frozen layer)
  → lane + priority
  → triage row + audit event
  → the owner edits, approves, and copies by hand
```

The model proposes. The policy disposes. The owner decides.

### Putting new behaviour above the frozen layer

The first version of the automation rules went straight into the policy
engine. That was wrong. The engine is shared across every workspace and is
the part the tests are written against, and per-tenant configuration does
not belong in shared, frozen code.

So the rules live in their own module, `src/lib/engine/rules.ts`, and run
*after* the frozen policy. They can force an action or set a priority, but
they can never open the auto lane, and every match is written into the
reason and into the audit trail so the owner can see which rule touched
which review. The frozen engine stayed frozen, and its tests stayed valid.

### The stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16, App Router, React 19 |
| Language | TypeScript 5, strict |
| Styling | Tailwind CSS 4, DaisyUI 5, one custom theme |
| Database | PostgreSQL on Neon, Prisma 6, checked-in migrations |
| Auth | bcrypt, signed httpOnly session cookies, email verification, password reset |
| Credentials | AES-256-GCM encryption, never returned to the browser |
| Model | Z.ai SDK, OpenAI-compatible, with an offline mock provider |
| Tests | `node:test` with native TypeScript stripping, no test framework |
| Hosting | Vercel, with GitHub Actions on every push |

The whole app is 75 source files and about 11,300 lines, with 31 API routes
and 12 database models. It has 17 runtime dependencies. That number started
at 81; most of the difference was the shadcn/ui starter template, which I
had carried around long after the app stopped using it. The lockfile went
from 14,807 lines to 7,008.

### Testing without a framework

Node 24 can strip TypeScript types natively, so the unit suite runs with
`node --test` and no test framework at all. The only thing it needed was a
forty-line ESM resolver hook, because the source uses extensionless imports
and the `@/` path alias and Node's loader knows about neither.

The 28 tests cover the frozen policy, the prompt parser, the priority
scoring, and the rule engine. The engine tests are the specification. If
one of them fails, the change is wrong until it has been raised as a
question.

---

## Challenges

### The two hours I spent on the wrong hypothesis

Adding a new database model did not appear in the generated Prisma client.
`db.template` was `undefined` at runtime, even though the table existed in
the database and `prisma generate` reported success.

I concluded that Prisma's client generation was broken in this environment
and started working around it with raw SQL. I deleted
`node_modules/@prisma/client` to test the theory, reinstalled it, and
wasted a lot of time.

The real cause was that I was looking in the wrong directory. The generated
client goes to `node_modules/.prisma/client/`. I had been inspecting
`node_modules/@prisma/client/generator-build/`, which is the bundled
*generator*, not its output. The tool had been working the entire time. I
had broken it myself by deleting the package and reinstalling it without
regenerating.

The fix that actually stuck was to make the build delete
`node_modules/.prisma` before it regenerates, so a stale client can never
ship. The lesson was to read where a tool writes its output before
deciding the tool is broken.

### A green CI run and a broken production app

The Vercel build restored a cached `node_modules` and brought back a
generated Prisma client that did not know about a column I had just added.
The build succeeded, the type check passed, CI was green, and every single
write to the triage table failed in production with `Unknown argument
priority`.

Nothing in the pull request pipeline could have caught it, because the
failure was in the relationship between the deployed code and the
deployed database, not in either one alone. What caught it was a
hand-written end-to-end suite that exercises the real routes against the
real database. It now runs 46 checks, and it is what I reach for before
every deploy.

### The demo video found a bug the tests had missed

The rules endpoint returned the `keywords` column as the raw JSON string
that Prisma stores, while the interface expected an array and called
`.join()` on it. The unhandled error blanked the entire Settings page.

Every API test had passed, because the API was behaving exactly as it was
written. I only found it because I built a screen-recording script to
produce the demo video, and two frames of that video came back showing
Next.js's error page instead of the app.

Two changes came out of it. The end-to-end suite now asserts the *shape* of
a response, not just its status code. And the app got a route-level error
boundary and a global one, so a single failing panel can never take the
whole desk down.

### Making a demo video with no tools

There was no screen recorder and no ffmpeg on the machine. I installed
`ffmpeg-static` into a scratch directory, drove Microsoft Edge in headless
mode with `puppeteer-core`, captured the app at 1600x1067, composed the
frames into caption cards in the app's own design language, and cross-faded
them with `xfade`. The result is a 2 minute 56 second video with a silent
track, so narration can be laid over it without re-encoding the picture.

Seeding the workspace through the API and then walking the interface was
also much better than clicking through it by hand: the capture became
reproducible, and the video shows a real deployment instead of a staging
copy.

---

## What I learned

**The engine has to stay pure, or it cannot be tested.** Moving the
priority scoring out of the server layer and into `lib/engine/` turned a
function nobody could test into one with eight assertions. The same
reasoning put the rules engine in its own module. Pure modules are the
ones you can read in a pull request without setting anything up.

**A frozen engine is a feature, not a limitation.** Freezing the prompt
and policy files sounds like a tax. In practice it means the safety rules
are reviewable by a human, the tests *are* the specification, and a prompt
change cannot slip in and quietly weaken a rule. The thing that makes it
work is putting new owner-configurable behaviour above the frozen layer
instead of inside it.

**Every design decision reduces to one question: does this help the owner
see which review needs them next?** The triage table, the priority scoring,
the rules, the bulk actions, the veto countdown, the search box. Every one
of them is an answer to that question. The features that were not did not
survive.

**A deploy-time failure can be green in CI.** Schema and client drift
fails in production while every individual check passes, because the
failure is in the relationship between two things that are each fine on
their own. A test suite that exercises the real routes against the real
database is the only thing that catches it.

**The readdir of the inbox is the product.** Everything else in this
project is in service of one list of reviews and the decisions attached to
them.

---

## Accomplishments

- A working triage desk with four lanes, policy-checked drafts in the
  reviewer's language, and an owner who always has the last word
- An engine that is frozen, pure, and covered by 28 unit tests
- 46 end-to-end checks against the deployed app
- Teams with role-based access, automation rules, a template library, an
  audit ledger, and CSV export
- 81 dependencies cut down to 17 runtime ones, and a lockfile that is nearly
  8,000 lines shorter than it was
- A three-minute demo video and a 15-image gallery, both captured
  automatically from the live deployment
- A deployment that builds, passes its checks, and is verifiable from
  outside: `GET /api/health` reports the database, the model provider, and
  which optional integrations are configured

---

## What's next

- **Real live model calls.** The whole app currently runs on the offline
  mock provider, which is what made the demo reproducible. The provider
  switch is in place and the SDK path is written; it needs a key and a
  careful pass on cost.
- **The Google Business Profile connection**, which is a real integration
  when access is approved and an honest "needs admin setup" state when it
  is not. It is the one piece I would not fake.
- **Reply-time analytics**, so an owner can see whether responding quickly
  actually correlates with better sentiment.
- **A background job queue** for importing thousands of reviews at once,
  instead of the current thirty at a time.
- **More trusted languages.** The rule checks are hand-verified for Urdu,
  Roman Urdu, and English. Every other language waits for a human to read
  the translation first, and that is the correct default.

---

## Try it

The live app is at **https://reviewdesk-nu.vercel.app**. Sign up and the
workspace starts with the 15 sample reviews already loaded, so you can work
the desk in about a minute. It runs on the mock provider, so nothing leaves
your machine and no key is needed.

The source, the architecture, the API reference, the design system, and the
architecture decision records are in the repository. The most useful one to
read first is probably `docs/decisions/`, which records the reasoning
behind the choices, including the ones that were later reversed.

MIT licensed.

---

## Screenshots

The gallery images are uploaded through the **Project Media** field, in this
order. Captions for each one are in `demo-assets/gallery/README.md`.

| The desk at a glance | The triage table |
|---|---|
| ![The desk at a glance, with the actions, priority, and sources breakdown](https://github.com/Wasif478484/ReviewDesk/blob/main/demo-assets/gallery/07-desk-overview.png?raw=1) | ![The sortable triage table, one row per review](https://github.com/Wasif478484/ReviewDesk/blob/main/demo-assets/gallery/08-desk-table.png?raw=1) |

| A Roman Urdu complaint | A rule-forced hold |
|---|---|
| ![A Roman Urdu complaint, with the draft editor and the sign-off toggle](https://github.com/Wasif478484/ReviewDesk/blob/main/demo-assets/gallery/09-review-roman-urdu.png?raw=1) | ![A review held by an owner rule, marked urgent, with the reason attached](https://github.com/Wasif478484/ReviewDesk/blob/main/demo-assets/gallery/10-review-held.png?raw=1) |

| The audit ledger | The team and its rules |
|---|---|
| ![The audit ledger, with every decision and its reason](https://github.com/Wasif478484/ReviewDesk/blob/main/demo-assets/gallery/11-ledger.png?raw=1) | ![The organization, its roles, and the automation rules](https://github.com/Wasif478484/ReviewDesk/blob/main/demo-assets/gallery/14-team.png?raw=1) |

