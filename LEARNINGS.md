# LEARNINGS.md

Notes from the build. Each one is something that surprised us, cost us time,
or changed how we do things. New entries go at the top.

## The demo video caught a crash the tests missed

The rules endpoint returned the `keywords` column as the raw JSON string
Prisma stores, while the UI expected an array and called `.join()` on it.
The unhandled error blanked the entire Settings page. Every API test passed,
because the API was behaving exactly as written.

Two lessons. First, the end-to-end suite now asserts the _shape_ of a
response, not just its status code. Second, a video is a test: it walks the
UI the way a person does, and it found in ten seconds what a test suite
missed.

## The Prisma client was never broken. We were looking in the wrong place

A new model would not appear in the generated client, so we concluded that
`prisma generate` was failing in this environment. It was not. The client
is written to `node_modules/.prisma/client/`, and we had been inspecting
`node_modules/@prisma/client/generator-build/`, which is the bundled
generator, not the output.

The actual cause was that we had deleted `node_modules/@prisma/client`
during a cleanup and reinstalled it, and the reinstall's `postinstall` had
not run against the current schema. Two hours went into the wrong
hypothesis. Read the generator's output path before blaming the tool.

The fix that stuck was to make the build delete `node_modules/.prisma`
before it regenerates, so a cached client can never ship with stale fields.

## Schema and client drift is a deploy-time failure, not a build-time one

The Vercel build succeeded and the type check passed while every write to
the `Triage` table failed at runtime with `Unknown argument priority`. The
build was compiling against a client that had been restored from Vercel's
build cache and did not know the new column.

A green CI run does not mean the database and the deployed code agree. The
build now regenerates from scratch, and the local end-to-end suite exercises
the same code paths the production routes do.

## The engine stays pure so it can be tested without a database

Moving `computePriority` out of `lib/server/workspace.ts` and into
`lib/engine/priority.ts` was a small change that turned an untestable
function into one with eight assertions. The same reasoning put the
automation rules in their own module.

Pure modules are also the ones you can read in a pull request without
setting anything up.

## Node's test runner can run TypeScript directly, with one hook

`node --test` with native type stripping runs the suite with no test
framework dependency. The only thing it needed was a small ESM resolver
hook, because the source uses extensionless imports and the `@/` path alias,
and Node's loader knows about neither.

The hook is forty lines and it lives in `tests/`. That is a better trade than
adding Vitest and its config surface.

## The `readdir` of the inbox is the product

Every design decision in this app came down to one question: does this help
the owner see which review needs them next? The triage table, the priority
scoring, the rules, the bulk actions, and the veto countdown are all
answers to that question. The features that did not answer it did not
survive.

## A frozen engine is a feature, not a limitation

Freezing `prompts.ts` and `policy.ts` sounds like a tax. In practice it
means the safety rules are reviewable by a human, the tests are a
specification, and a prompt change cannot slip in and quietly weaken a rule.

The thing that makes it work: put new owner-configurable behaviour _above_
the frozen layer, not inside it. The rules engine is the proof.

## Escaping is easy to get wrong when the text comes from a model

Review text and every model-produced field are escaped before rendering.
The rule is easy to state and easy to forget, so it is in `AGENTS.md` and in
the pull request checklist, and every reviewer checks it.

## The demo account, seeded by script, beats clicking through the UI

Recording the demo by hand would have meant thirty careful clicks. Seeding
the workspace through the API, then driving the interface with a headless
browser, meant the capture was reproducible and the video showed a real
deployment rather than a staging copy.
