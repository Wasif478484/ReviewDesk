# Pull request

## What this changes

<!-- One or two sentences. What is different after this merges? -->

## Why

<!-- The problem this solves. Link the issue: Fixes #123 -->

## How it was verified

<!-- What did you run? Paste the relevant output. -->

- [ ] `npx tsc --noEmit` is clean
- [ ] `npm run lint` is clean
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] The change was checked against a running app

## Checklist

- [ ] The frozen engine was not touched. `src/lib/engine/prompts.ts` and
      `src/lib/engine/policy.ts` are unchanged. (If a change there is really
      needed, say so in the description and explain why. It is a product
      decision, not a quiet edit.)
- [ ] No reply is posted, sent, or reported automatically. The owner still
      copies replies by hand.
- [ ] Untrusted text (review text, model output) is escaped before rendering.
- [ ] No secret, token, or personal review data is committed.
- [ ] The interface never claims something was sent unless the API call
      actually succeeded.
- [ ] `docs/ARCHITECTURE.md` is updated if a module boundary moved.
- [ ] `CHANGELOG.md` has an entry under Unreleased.

## Screenshots

<!-- Before and after, for anything visual. -->
