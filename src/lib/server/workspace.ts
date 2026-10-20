/**
 * workspace.ts, server-side service layer tying the engine to the database.
 *
 * Lanes mirror the Python autopilot: auto (veto countdown), queue (owner
 * approval), done, skipped. The model never decides lanes, decide() does.
 */

import { db } from "@/lib/server/db";
import { Prisma } from "@prisma/client";
import {
  buildSystemPrompt,
  buildUserMessage,
  safeParse,
  type BusinessProfile,
  type TriageResult,
  type Tone,
} from "@/lib/engine/prompts";
import { decide, shouldSend, DEFAULT_POLICY, type AutopilotPolicy } from "@/lib/engine/policy";
import { applyRules, parseKeywords, type RuleMatch } from "@/lib/engine/rules";
import { computePriority } from "@/lib/engine/priority";
import { SAMPLE_REVIEWS } from "@/lib/engine/samples";
import { callModel, withRetry } from "@/lib/server/llm";
import { decrypt, encrypt } from "@/lib/server/crypto";
import { postGoogleReply, refreshAccessToken } from "@/lib/server/google";

// ---------------------------------------------------------------------------
// Row → engine types
// ---------------------------------------------------------------------------

export type BusinessRow = NonNullable<
  Prisma.UserGetPayload<{ include: { business: true; policy: true; credential: true } }>["business"]
>;
export type PolicyRow = NonNullable<
  Prisma.UserGetPayload<{ include: { business: true; policy: true; credential: true } }>["policy"]
>;

export function profileFor(b: BusinessRow | null): BusinessProfile {
  if (!b)
    return {
      business_name: "Your Business",
      business_type: "restaurant",
      owner_name: "The Owner",
      sign_off: "",
      contact_line: "",
      allowed_offers: "none",
    };
  return {
    business_name: b.name,
    business_type: b.category,
    owner_name: b.ownerName,
    sign_off: b.signOff,
    contact_line: b.contactLine,
    allowed_offers: b.allowedOffers,
  };
}

export function policyFor(p: PolicyRow | null | undefined): AutopilotPolicy {
  if (!p) return DEFAULT_POLICY;
  let trusted: string[] = ["english"];
  try {
    const parsed = JSON.parse(p.trustedLanguages);
    if (Array.isArray(parsed)) trusted = parsed.map(String);
  } catch {
    /* keep default */
  }
  return {
    enabled: p.enabled,
    dryRun: p.dryRun,
    minStars: p.minStars,
    trustedLanguages: trusted,
    delayMinutes: p.delayMinutes,
    dailyCap: p.dailyCap,
    allowMixedSentiment: p.allowMixedSentiment,
  };
}

export function parseTriageRow(t: Prisma.TriageGetPayload<Record<string, never>>): TriageResult & {
  id: string;
  lane: string;
  status: string;
  dueAt: Date | null;
  reviewId: string;
} {
  let flags: string[] = [];
  let checklist: string[] = [];
  try {
    flags = JSON.parse(t.flags);
  } catch {
    /* keep [] */
  }
  try {
    checklist = JSON.parse(t.ownerChecklist);
  } catch {
    /* keep [] */
  }
  return {
    id: t.id,
    reviewId: t.reviewId,
    lane: t.lane,
    status: t.status,
    dueAt: t.dueAt,
    action: t.action as TriageResult["action"],
    sentiment: t.sentiment as TriageResult["sentiment"],
    flags,
    reason: t.reason,
    review_language: t.reviewLanguage,
    language_used: t.languageUsed,
    draft_reply: t.draftReply,
    review_translation: t.reviewTranslation,
    draft_translation: t.draftTranslation,
    report_note: t.reportNote,
    owner_checklist: checklist,
  };
}

// ---------------------------------------------------------------------------
// Workspace bootstrapping
// ---------------------------------------------------------------------------

/** Ensure policy row + demo inbox exist for a user. */
export async function ensureWorkspace(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  const orgId = user?.organizationId ?? null;
  await db.policy.upsert({
    where: { userId },
    update: {},
    create: { userId, organizationId: orgId },
  });
  const count = await db.review.count({ where: { userId, source: "demo" } });
  if (count === 0) {
    await db.review.createMany({
      data: SAMPLE_REVIEWS.map((s) => ({
        userId,
        organizationId: orgId,
        source: "demo",
        stars: s.stars,
        text: s.text,
        author: "Demo Reviewer",
        date: "2026-10-17",
      })),
    });
  }
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export async function audit(
  userId: string,
  event: {
    reviewRef?: string;
    excerpt?: string;
    action: string;
    status: string;
    reasons?: string[];
    actor?: string;
    error?: string;
  },
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  await db.auditEvent.create({
    data: {
      userId,
      organizationId: user?.organizationId ?? null,
      reviewRef: event.reviewRef ?? "",
      excerpt: (event.excerpt ?? "").slice(0, 80),
      action: event.action,
      status: event.status,
      reasons: JSON.stringify(event.reasons ?? []),
      actor: event.actor ?? "owner",
      error: event.error ?? "",
    },
  });
}

// ---------------------------------------------------------------------------
// Triage
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Google access-token resolution (handles refresh for full OAuth connections)
// ---------------------------------------------------------------------------

/**
 * Resolve a currently-valid Google access token for the user's credential.
 * mode "oauth": refresh via the stored refresh token when expired and cache
 * the new access token. mode "oauth_token": decrypt the pasted token as-is.
 * Returns null when no usable Google credential exists.
 */
export async function googleAccessToken(
  userId: string,
): Promise<{ token: string; locationId: string; livePosting: boolean; mode: string } | null> {
  const cred = await db.credential.findUnique({ where: { userId } });
  if (!cred) return null;
  if (cred.mode !== "oauth" && cred.mode !== "oauth_token") return null;

  if (cred.mode === "oauth") {
    if (!cred.refreshTokenEnc) return null;
    const fresh =
      cred.accessTokenEnc &&
      cred.tokenExpiresAt &&
      cred.tokenExpiresAt.getTime() > Date.now() + 60_000;
    if (fresh) {
      try {
        return {
          token: decrypt(cred.accessTokenEnc!),
          locationId: cred.locationId,
          livePosting: cred.livePosting,
          mode: cred.mode,
        };
      } catch {
        /* fall through to refresh */
      }
    }
    try {
      const refreshToken = decrypt(cred.refreshTokenEnc);
      const { accessToken, expiresIn } = await refreshAccessToken(refreshToken);
      await db.credential.update({
        where: { userId },
        data: {
          accessTokenEnc: encrypt(accessToken),
          tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
        },
      });
      return {
        token: accessToken,
        locationId: cred.locationId,
        livePosting: cred.livePosting,
        mode: cred.mode,
      };
    } catch (err) {
      await db.credential.update({
        where: { userId },
        data: {
          status: "error",
          statusMessage: `Token refresh failed: ${err instanceof Error ? err.message : String(err)}`,
        },
      });
      return null;
    }
  }

  // pasted access token
  if (!cred.tokenEnc) return null;
  try {
    return {
      token: decrypt(cred.tokenEnc),
      locationId: cred.locationId,
      livePosting: cred.livePosting,
      mode: cred.mode,
    };
  } catch {
    return null;
  }
}

/**
 * Triage one saved review with the frozen prompt, store the result and
 * assign a lane. Returns the parsed result.
 */
export async function triageReview(
  userId: string,
  reviewId: string,
  opts?: { tone?: Tone; language?: string; ownerLanguage?: string },
): Promise<TriageResult & { id: string }> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { business: true, policy: true },
  });
  if (!user) throw new Error("workspace not found");
  const review = await db.review.findFirst({ where: { id: reviewId, userId } });
  if (!review) throw new Error("review not found");

  const business = user.business;
  const tone = (opts?.tone ?? business?.replyTone ?? "warm") as Tone;
  const language = opts?.language ?? business?.replyLanguage ?? "auto";
  const ownerLanguage = opts?.ownerLanguage ?? business?.ownerLanguage ?? "English";

  const system = buildSystemPrompt(business?.platform ?? "Google");
  const userMsg = buildUserMessage(profileFor(business), review, language, tone, ownerLanguage);

  let result: TriageResult;
  try {
    const raw = await withRetry(() => callModel(system, userMsg));
    result = safeParse(raw);
  } catch (err) {
    result = {
      action: "reply_needs_owner",
      sentiment: "mixed",
      flags: ["other"],
      reason: `The model call failed (${err instanceof Error ? err.message : String(err)}). Review by hand.`,
      review_language: "unknown",
      language_used: "none",
      draft_reply: null,
      review_translation: null,
      draft_translation: null,
      report_note: null,
      owner_checklist: ["Read the review and write the reply yourself"],
    };
  }

  // Lane assignment via the frozen policy (the model never decides this).
  const policy = policyFor(user.policy);
  const [decision, reasons] = decide(
    result,
    review,
    profileFor(business),
    policy,
    0,
    review.hasReply,
  );
  let lane = "queue";
  let dueAt: Date | null = null;
  if (decision === "auto_post") {
    lane = "auto";
    dueAt = new Date(Date.now() + policy.delayMinutes * 60 * 1000);
  } else if (decision === "skip") {
    lane = "skipped";
  }

  // Owner-configured rules. A rule can force the action or raise the
  // priority. It never posts anything; the owner still copies by hand.
  const orgId = user.organizationId ?? null;
  let priority = computePriority(result, review.stars);
  let ruleMatches: RuleMatch[] = [];
  let finalAction = result.action;
  if (orgId) {
    const rules = await db.rule.findMany({ where: { organizationId: orgId, enabled: true } });
    if (rules.length) {
      const evaluation = applyRules(
        rules.map((r) => ({
          id: r.id,
          name: r.name,
          enabled: r.enabled,
          minStars: r.minStars,
          maxStars: r.maxStars,
          keywords: parseKeywords(r.keywords),
          language: r.language,
          forceAction: r.forceAction,
          setPriority: r.setPriority,
        })),
        { text: review.text, stars: review.stars, language: result.review_language },
        priority,
      );
      ruleMatches = evaluation.matches;
      if (evaluation.action) finalAction = evaluation.action as TriageResult["action"];
      priority = evaluation.priority;
      // A forced action must never land in the auto lane; it waits for a human.
      if (evaluation.action) {
        lane = "queue";
        dueAt = null;
      }
    }
  }

  const ruleNote = ruleMatches.length ? ` ${ruleMatches.map((m) => m.reason).join(" ")}` : "";
  const reason =
    finalAction === result.action
      ? `${result.reason}${ruleNote}`
      : `${result.reason} Changed to ${finalAction} by an owner rule.${ruleNote}`;
  const ownerChecklist = ruleMatches.length
    ? [...result.owner_checklist, ...ruleMatches.map((m) => m.reason)]
    : result.owner_checklist;

  // Replace any previous pending triage for this review.
  await db.triage.deleteMany({ where: { reviewId, status: "pending" } });
  const row = await db.triage.create({
    data: {
      userId,
      organizationId: orgId,
      reviewId,
      action: finalAction,
      sentiment: result.sentiment,
      priority,
      flags: JSON.stringify(result.flags),
      reason,
      reviewLanguage: result.review_language,
      languageUsed: result.language_used,
      draftReply: result.draft_reply,
      reviewTranslation: result.review_translation,
      draftTranslation: result.draft_translation,
      reportNote: result.report_note,
      ownerChecklist: JSON.stringify(ownerChecklist),
      lane,
      status: "pending",
      dueAt,
    },
  });

  await audit(userId, {
    reviewRef: review.id,
    excerpt: review.text,
    action: finalAction,
    status: `triaged:${lane}`,
    reasons: [
      ...(decision === "auto_post" ? ["passes all checks"] : reasons),
      ...ruleMatches.map((m) => m.reason),
    ],
    actor: "engine",
  });

  return { ...result, action: finalAction, reason, owner_checklist: ownerChecklist, id: row.id };
}

// ---------------------------------------------------------------------------
// Recording replies (demo) / sending (only when explicitly enabled)
// ---------------------------------------------------------------------------

export async function recordReply(
  userId: string,
  triageId: string,
  draftOverride?: string,
): Promise<{ ok: boolean; mode: "recorded" | "sent"; message: string }> {
  const triage = await db.triage.findFirst({
    where: { id: triageId, userId },
    include: { review: true },
  });
  if (!triage) return { ok: false, mode: "recorded", message: "Triage row not found." };
  if (triage.review.hasReply)
    return { ok: false, mode: "recorded", message: "Review already has a reply." };
  const draft = (draftOverride ?? triage.draftReply ?? "").trim();
  if (!draft) return { ok: false, mode: "recorded", message: "Reply draft is empty." };

  const cred = await db.credential.findUnique({ where: { userId } });
  const canLive =
    cred?.livePosting === true &&
    (cred.mode === "oauth" || cred.mode === "oauth_token") &&
    triage.review.source === "google";

  if (canLive && cred) {
    try {
      const resolved = await googleAccessToken(userId);
      if (!resolved?.token)
        throw new Error("No usable Google token (try reconnecting in Settings).");
      await postGoogleReply(
        resolved.token,
        resolved.locationId,
        triage.review.externalId ?? "",
        draft,
      );
      await db.$transaction([
        db.review.update({
          where: { id: triage.reviewId },
          data: { hasReply: true, replyText: draft, replyMode: "sent", repliedAt: new Date() },
        }),
        db.triage.update({ where: { id: triage.id }, data: { status: "sent", lane: "done" } }),
      ]);
      await audit(userId, {
        reviewRef: triage.reviewId,
        excerpt: triage.review.text,
        action: "owner_approved",
        status: "sent",
        reasons: ["reply sent through the Google Business Profile API"],
        actor: "owner",
      });
      return { ok: true, mode: "sent", message: "Reply sent via the Google Business Profile API." };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await audit(userId, {
        reviewRef: triage.reviewId,
        excerpt: triage.review.text,
        action: "owner_approved",
        status: "failed",
        reasons: ["Google API call failed"],
        actor: "owner",
        error: message,
      });
      return { ok: false, mode: "recorded", message: `Google API call failed: ${message}` };
    }
  }

  // Demo path: record locally. The UI copy around this is explicit:
  // "recorded in your workspace; nothing is sent to Google."
  await db.$transaction([
    db.review.update({
      where: { id: triage.reviewId },
      data: { hasReply: true, replyText: draft, replyMode: "recorded", repliedAt: new Date() },
    }),
    db.triage.update({ where: { id: triage.id }, data: { status: "recorded", lane: "done" } }),
  ]);
  await audit(userId, {
    reviewRef: triage.reviewId,
    excerpt: triage.review.text,
    action: "owner_approved",
    status: "recorded_demo",
    reasons: ["recorded in the workspace; not sent to Google"],
    actor: "owner",
  });
  return {
    ok: true,
    mode: "recorded",
    message: "Recorded in your workspace (demo; nothing is sent to Google).",
  };
}

export async function undoReply(userId: string, reviewId: string): Promise<boolean> {
  const review = await db.review.findFirst({ where: { id: reviewId, userId } });
  if (!review || !review.hasReply) return false;
  await db.$transaction([
    db.review.update({
      where: { id: reviewId },
      data: { hasReply: false, replyText: null, replyMode: null, repliedAt: null },
    }),
    db.triage.updateMany({
      where: { reviewId, status: { in: ["recorded", "sent"] } },
      data: { status: "pending", lane: "queue" },
    }),
  ]);
  await audit(userId, {
    reviewRef: reviewId,
    excerpt: review.text,
    action: "undo",
    status: "undone",
    reasons: ["owner undid the recorded reply"],
    actor: "owner",
  });
  return true;
}

export async function dismissTriage(userId: string, triageId: string): Promise<boolean> {
  const triage = await db.triage.findFirst({ where: { id: triageId, userId } });
  if (!triage) return false;
  await db.triage.update({
    where: { id: triageId },
    data: { status: "dismissed", lane: "skipped" },
  });
  await audit(userId, {
    reviewRef: triage.reviewId,
    excerpt: "",
    action: triage.action,
    status: "dismissed",
    reasons: ["owner dismissed the draft"],
    actor: "owner",
  });
  return true;
}

export async function cancelVeto(userId: string, triageId: string): Promise<boolean> {
  const triage = await db.triage.findFirst({ where: { id: triageId, userId } });
  if (!triage) return false;
  await db.triage.update({
    where: { id: triageId },
    data: { lane: "queue", dueAt: null },
  });
  await audit(userId, {
    reviewRef: triage.reviewId,
    excerpt: "",
    action: triage.action,
    status: "vetoed",
    reasons: ["owner moved the reply to the approval queue"],
    actor: "owner",
  });
  return true;
}

// ---------------------------------------------------------------------------
// Autopilot cycle
// ---------------------------------------------------------------------------

export async function runAutopilotCycle(userId: string): Promise<{
  recorded: number;
  wouldRecord: number;
  failed: number;
}> {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { policy: true, business: true },
  });
  if (!user) return { recorded: 0, wouldRecord: 0, failed: 0 };
  const policy = policyFor(user.policy);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const postedToday = await db.review.count({
    where: { userId, repliedAt: { gte: startOfDay } },
  });

  const due = await db.triage.findMany({
    where: { userId, lane: "auto", status: "pending", dueAt: { lte: new Date() } },
    include: { review: true },
    orderBy: { dueAt: "asc" },
  });

  let recorded = 0;
  let wouldRecord = 0;
  let failed = 0;

  for (const t of due) {
    if (recorded >= policy.dailyCap) {
      await audit(userId, {
        reviewRef: t.reviewId,
        excerpt: t.review.text,
        action: "auto_post",
        status: "deferred",
        reasons: ["daily cap reached"],
        actor: "autopilot",
      });
      continue;
    }
    if (shouldSend("auto_post", policy)) {
      const res = await recordReply(userId, t.id);
      if (res.ok) {
        recorded += 1;
        await audit(userId, {
          reviewRef: t.reviewId,
          excerpt: t.review.text,
          action: "auto_post",
          status: res.mode === "sent" ? "sent" : "recorded_demo",
          reasons: ["autopilot veto window passed without a veto"],
          actor: "autopilot",
        });
      } else {
        failed += 1;
        await db.triage.update({ where: { id: t.id }, data: { lane: "queue", dueAt: null } });
        await audit(userId, {
          reviewRef: t.reviewId,
          excerpt: t.review.text,
          action: "auto_post",
          status: "failed",
          reasons: [res.message],
          actor: "autopilot",
        });
      }
    } else {
      wouldRecord += 1;
      await audit(userId, {
        reviewRef: t.reviewId,
        excerpt: t.review.text,
        action: "auto_post",
        status: "dry_run",
        reasons: ["would record"],
        actor: "autopilot",
      });
    }
  }

  // Promote past-due veto rows that the owner left alone? No: promotion
  // happens on each cycle call above; rows still inside their veto window
  // simply stay in the auto lane.
  return { recorded, wouldRecord, failed };
}
