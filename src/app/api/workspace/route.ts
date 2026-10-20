import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { requireUserId } from "@/lib/server/auth";
import { ensureWorkspace } from "@/lib/server/workspace";
import { computePriority } from "@/lib/engine/priority";
import { oauthConfigured } from "@/lib/server/google";
import { mailConfigured } from "@/lib/server/mail";

/**
 * GET /api/workspace, boot payload for the single-page app:
 * user, business, credential (masked), policy, reviews (with triages),
 * stats and audit ledger.
 */
export async function GET() {
  try {
    const userId = await requireUserId();
    await ensureWorkspace(userId);
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        business: true,
        credential: true,
        policy: true,
        reviews: {
          orderBy: { createdAt: "asc" },
          include: { triages: { orderBy: { createdAt: "desc" } } },
        },
        audits: { orderBy: { timestamp: "desc" }, take: 200 },
      },
    });
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const reviews = user.reviews.map((r) => {
      const active = r.triages.find((t) => t.status === "pending") ?? r.triages[0] ?? null;
      let flags: string[] = [];
      let checklist: string[] = [];
      if (active) {
        try {
          flags = JSON.parse(active.flags);
        } catch {
          /* [] */
        }
        try {
          checklist = JSON.parse(active.ownerChecklist);
        } catch {
          /* [] */
        }
      }
      return {
        id: r.id,
        source: r.source,
        externalId: r.externalId,
        stars: r.stars,
        text: r.text,
        author: r.author,
        date: r.date,
        hasReply: r.hasReply,
        replyText: r.replyText,
        replyMode: r.replyMode,
        repliedAt: r.repliedAt,
        triage: active
          ? {
              id: active.id,
              action: active.action,
              sentiment: active.sentiment,
              priority:
                active.priority ??
                computePriority(
                  { action: active.action, sentiment: active.sentiment, flags },
                  r.stars,
                ),
              flags,
              reason: active.reason,
              reviewLanguage: active.reviewLanguage,
              languageUsed: active.languageUsed,
              draftReply: active.draftReply,
              reviewTranslation: active.reviewTranslation,
              draftTranslation: active.draftTranslation,
              reportNote: active.reportNote,
              ownerChecklist: checklist,
              lane: active.lane,
              status: active.status,
              dueAt: active.dueAt,
            }
          : null,
      };
    });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const stats = {
      total: reviews.length,
      pending: reviews.filter((r) => r.triage && r.triage.status === "pending" && !r.hasReply)
        .length,
      recordedToday: user.reviews.filter((r) => r.repliedAt && r.repliedAt >= startOfDay).length,
      replied: reviews.filter((r) => r.hasReply).length,
    };

    // Action, sentiment and priority distribution across every triaged review.
    const actionCounts: Record<string, number> = {
      reply: 0,
      reply_needs_owner: 0,
      hold: 0,
      report: 0,
    };
    const sentimentCounts: Record<string, number> = { positive: 0, mixed: 0, negative: 0 };
    const priorityCounts: Record<string, number> = { urgent: 0, normal: 0, low: 0 };
    for (const r of reviews) {
      const t = r.triage;
      if (!t) continue;
      if (t.action in actionCounts) actionCounts[t.action] += 1;
      if (t.sentiment in sentimentCounts) sentimentCounts[t.sentiment] += 1;
      if (t.priority in priorityCounts) priorityCounts[t.priority] += 1;
    }
    const sourceCounts: Record<string, number> = {};
    for (const r of reviews) {
      sourceCounts[r.source] = (sourceCounts[r.source] ?? 0) + 1;
    }
    const analytics = {
      actionCounts,
      sentimentCounts,
      priorityCounts,
      sourceCounts,
      triaged: reviews.filter((r) => r.triage).length,
      untriaged: reviews.filter((r) => !r.triage).length,
    };

    const audits = user.audits.map((a) => {
      let reasons: string[] = [];
      try {
        reasons = JSON.parse(a.reasons);
      } catch {
        /* [] */
      }
      return {
        id: a.id,
        timestamp: a.timestamp,
        reviewRef: a.reviewRef,
        excerpt: a.excerpt,
        action: a.action,
        status: a.status,
        reasons,
        actor: a.actor,
        error: a.error,
      };
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        onboarded: Boolean(user.onboardedAt),
        emailVerified: Boolean(user.emailVerifiedAt),
        organizationId: user.organizationId,
      },
      organization: user.organizationId
        ? await db.organization.findUnique({
            where: { id: user.organizationId },
            include: { _count: { select: { members: true, rules: true } } },
          })
        : null,
      googleOAuthConfigured: oauthConfigured(),
      mailConfigured: mailConfigured(),
      business: user.business,
      credential: user.credential
        ? {
            mode: user.credential.mode,
            locationId: user.credential.locationId,
            keyHint: user.credential.keyHint,
            status: user.credential.status,
            statusMessage: user.credential.statusMessage,
            lastCheckedAt: user.credential.lastCheckedAt,
            livePosting: user.credential.livePosting,
            grantedEmail: user.credential.grantedEmail,
          }
        : null,
      policy: user.policy,
      reviews,
      stats,
      analytics,
      audits,
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    if (status === 401) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    console.error("workspace load failed:", err);
    return NextResponse.json({ error: "Could not load the workspace." }, { status: 500 });
  }
}
