/** Shared types for the ReviewDesk workspace payload and UI bits. */

export interface TriageData {
  id: string;
  action: string;
  sentiment: string;
  priority: string;
  flags: string[];
  reason: string;
  reviewLanguage: string;
  languageUsed: string;
  draftReply: string | null;
  reviewTranslation: string | null;
  draftTranslation: string | null;
  reportNote: string | null;
  ownerChecklist: string[];
  lane: string;
  status: string;
  dueAt: string | null;
}

export interface ReviewData {
  id: string;
  source: string;
  externalId: string | null;
  stars: number | null;
  text: string;
  author: string;
  date: string;
  hasReply: boolean;
  replyText: string | null;
  replyMode: string | null;
  repliedAt: string | null;
  triage: TriageData | null;
}

export interface BusinessData {
  id?: string;
  name: string;
  category: string;
  ownerName: string;
  signOff: string;
  contactLine: string;
  allowedOffers: string;
  description: string;
  platform: string;
  replyTone: string;
  replyLanguage: string;
  ownerLanguage: string;
}

export interface CredentialData {
  mode: string;
  locationId: string;
  keyHint: string;
  status: string;
  statusMessage: string;
  lastCheckedAt: string | null;
  livePosting: boolean;
  grantedEmail?: string;
}

export interface PolicyData {
  enabled: boolean;
  dryRun: boolean;
  minStars: number;
  trustedLanguages: string;
  delayMinutes: number;
  dailyCap: number;
  allowMixedSentiment: boolean;
}

export interface AuditData {
  id: string;
  timestamp: string;
  reviewRef: string;
  excerpt: string;
  action: string;
  status: string;
  reasons: string[];
  actor: string;
  error: string;
}

export interface WorkspaceData {
  user: {
    id: string;
    email: string;
    name: string;
    onboarded: boolean;
    emailVerified: boolean;
    organizationId?: string | null;
  };
  organization?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    _count?: { members: number; rules: number };
  } | null;
  googleOAuthConfigured?: boolean;
  mailConfigured?: boolean;
  business: BusinessData | null;
  credential: CredentialData | null;
  policy: PolicyData | null;
  reviews: ReviewData[];
  stats: { total: number; pending: number; recordedToday: number; replied: number };
  analytics?: {
    actionCounts: Record<string, number>;
    sentimentCounts: Record<string, number>;
    priorityCounts: Record<string, number>;
    sourceCounts: Record<string, number>;
    triaged: number;
    untriaged: number;
  };
  audits: AuditData[];
}

/** One dict keyed by the frozen ACTIONS values, labels + colors live here. */
export const ACTION_META: Record<
  string,
  { label: string; stamp: string; banner: string; blurb: string }
> = {
  reply: {
    label: "Reply",
    stamp: "rd-stamp rd-stamp-reply",
    banner: "rd-banner rd-banner-reply",
    blurb: "A public reply is safe to post.",
  },
  reply_needs_owner: {
    label: "Check facts",
    stamp: "rd-stamp rd-stamp-check",
    banner: "rd-banner rd-banner-check",
    blurb: "Worth replying once the owner checks the facts.",
  },
  hold: {
    label: "Hold",
    stamp: "rd-stamp rd-stamp-hold",
    banner: "rd-banner rd-banner-hold",
    blurb: "Do not reply publicly yet.",
  },
  report: {
    label: "Report",
    stamp: "rd-stamp rd-stamp-report",
    banner: "rd-banner rd-banner-report",
    blurb: "Looks like it breaks the platform's content rules.",
  },
};

export const TONE_LABELS: Record<string, string> = {
  warm: "Warm",
  formal: "Formal",
  apologetic: "Apologetic",
};
