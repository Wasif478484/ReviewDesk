# 0001. The owner copies replies by hand

Status: Accepted
Date: 2026-10-18

## Context

ReviewDesk reads customer reviews and writes replies. The obvious product is
to post those replies automatically: the review is already there, the reply
is already written, and the owner is asleep.

That product is a liability. A wrong reply to a public complaint is visible
to everyone, permanently, and it can cost a customer. Automating the post
also means automating the judgement about _whether_ to post, which is the one
thing an owner should never delegate to a classifier.

## Decision

ReviewDesk never posts a reply on its own.

- The model drafts. The policy decides the lane. The owner approves.
- An approved reply is **recorded in the workspace**, labelled as such.
- The owner copies the text and pastes it into Google Business themselves.
- The interface must never claim something was posted, sent, or reported
  unless the Google API call actually succeeded with the owner's own live
  connection.
- Even the autopilot lane, which can record a reply without a click, is off
  by default, runs in dry-run first, waits through a veto window, and is
  bounded by a daily cap.

## Consequences

Good:

- A bad draft can never reach a customer on its own.
- The audit trail is honest. Every entry says what actually happened.
- The product is safe to run on mock provider mode, which is how the demo
  and the tests work.

Bad:

- Slower. A busy owner has to copy and paste.
- The "connected to Google" promise is smaller than it sounds.

We accept the tradeoff. The copy step is one keystroke, and it is the step
that makes the rest of the product safe.

## Related

- 0002, the frozen engine, is what makes the safety rules reviewable.
