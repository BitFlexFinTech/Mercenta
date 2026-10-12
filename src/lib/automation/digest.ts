/**
 * §13 Stage-13 — Daily digest builder (pure, fully testable).
 *
 * Batches everything that does NOT need real-time attention:
 *   new leads · non-urgent replies · fulfillment scores in the 55–74 band ·
 *   contracts inside the 60-day renewal window · overnight POs with
 *   auto-calculated commissions (auto-approved vs held) · rejected catalog
 *   submissions.
 * The ONLY real-time channel is the hot-lead notification (see discovery/
 * engine.handleInboundReply) — never this digest.
 */

import { isBorderline } from './scoringBridge';
import { shouldAutoApproveCommission } from './autoApprove';

export const RENEWAL_WINDOW_DAYS = 60;

export interface DigestScore {
  brandId: string;
  totalScore: number;
  manualOverride?: boolean;
}
export interface DigestContract {
  id: string;
  brandId: string;
  renewalDate: string; // ISO date
}
export interface DigestCommission {
  purchaseOrderId: string;
  poValue: number;
  commissionAmount: number;
  status: CommissionLike;
}
export type DigestCadence = 'morning' | 'evening';
type CommissionLike = 'accrued' | 'invoiced' | 'paid';
export interface DigestRejectedSubmission {
  id: string;
  rejectionReason: string;
}

export interface DailyDigestInput {
  date: Date;
  cadence: DigestCadence;
  newLeads: { id: string; company: string }[];
  nonUrgentReplies: { id: string; subject: string }[];
  scores: DigestScore[];
  contracts: DigestContract[];
  commissions: DigestCommission[];
  rejectedSubmissions: DigestRejectedSubmission[];
  /** Chief of Staff briefing fields */
  emailsSent?: number;
  hotLeadsToday?: number;
  codePushSummary?: string;
  platformPerformance?: string;
  completedYesterday?: string[];
  plannedToday?: string[];
}

export interface DailyDigest {
  date: string;
  cadence: DigestCadence;
  newLeads: { count: number; companies: string[] };
  nonUrgentReplies: { count: number; subjects: string[] };
  fulfillmentNeedsReview: { brandId: string; totalScore: number }[];
  contractsInRenewalWindow: { id: string; brandId: string; renewalDate: string; daysLeft: number }[];
  commissionsOvernight: {
    po: string;
    value: number;
    commission: number;
    decision: 'auto_sent' | 'held_for_approval' | 'already_processed';
    reason: string;
  }[];
  rejectedSubmissionsNeedingHuman: DigestRejectedSubmission[];
  chiefOfStaffBriefing?: {
    completedYesterday: string[];
    plannedToday: string[];
    emailsSent: number;
    hotLeadsToday: number;
    codePushSummary: string;
    platformPerformance: string;
  };
}

export function buildDailyDigest(input: DailyDigestInput): DailyDigest {
  const dayMs = 24 * 60 * 60 * 1000;
  const today = input.date.getTime();

  // Scores in the borderline band, not already manually overridden.
  const fulfillmentNeedsReview = input.scores
    .filter((s) => !s.manualOverride && isBorderline(s.totalScore))
    .map((s) => ({ brandId: s.brandId, totalScore: s.totalScore }));

  const contractsInRenewalWindow = input.contracts
    .map((c) => ({
      ...c,
      daysLeft: Math.ceil((new Date(c.renewalDate).getTime() - today) / dayMs),
    }))
    .filter((c) => c.daysLeft >= 0 && c.daysLeft <= RENEWAL_WINDOW_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const commissionsOvernight = input.commissions.map((c) => {
    if (c.status !== 'accrued') {
      return {
        po: c.purchaseOrderId,
        value: c.poValue,
        commission: c.commissionAmount,
        decision: 'already_processed' as const,
        reason: `status ${c.status} — no action`,
      };
    }
    const decision = shouldAutoApproveCommission(c.commissionAmount);
    return {
      po: c.purchaseOrderId,
      value: c.poValue,
      commission: c.commissionAmount,
      decision: decision.autoApproved ? ('auto_sent' as const) : ('held_for_approval' as const),
      reason: decision.reason,
    };
  });

  const base: DailyDigest = {
    date: input.date.toISOString(),
    cadence: input.cadence,
    newLeads: {
      count: input.newLeads.length,
      companies: input.newLeads.map((l) => l.company),
    },
    nonUrgentReplies: {
      count: input.nonUrgentReplies.length,
      subjects: input.nonUrgentReplies.map((r) => r.subject),
    },
    fulfillmentNeedsReview,
    contractsInRenewalWindow,
    commissionsOvernight,
    rejectedSubmissionsNeedingHuman: input.rejectedSubmissions,
  };

  // Add Chief of Staff briefing if any of the fields are provided.
  if (input.emailsSent !== undefined || input.hotLeadsToday !== undefined) {
    base.chiefOfStaffBriefing = {
      completedYesterday: input.completedYesterday ?? [],
      plannedToday: input.plannedToday ?? [],
      emailsSent: input.emailsSent ?? 0,
      hotLeadsToday: input.hotLeadsToday ?? 0,
      codePushSummary: input.codePushSummary ?? 'No pushes today',
      platformPerformance: input.platformPerformance ?? 'No performance data',
    };
  }

  return base;
}

/**
 * Format a digest as human-readable text (for email rendering).
 * Cadence-aware: morning digests are more forward-looking, evening ones retrospective.
 */
export function formatDigestAsText(digest: DailyDigest): string {
  const greeting = digest.cadence === 'morning' ? '☀️ Good morning' : '🌙 Good evening';
  const lines: string[] = [
    `${greeting} — Mercenta Digest`,
    `📅 ${new Date(digest.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`,
    '',
  ];

  if (digest.chiefOfStaffBriefing) {
    const b = digest.chiefOfStaffBriefing;
    if (b.completedYesterday.length > 0) {
      lines.push('✅ Completed yesterday:', ...b.completedYesterday.map((i) => `  • ${i}`), '');
    }
    if (b.plannedToday.length > 0) {
      lines.push('📋 Planned today:', ...b.plannedToday.map((i) => `  • ${i}`), '');
    }
    lines.push(`📧 Emails sent: ${b.emailsSent}`);
    lines.push(`🔥 Hot leads today: ${b.hotLeadsToday}`);
    lines.push(`💻 Code: ${b.codePushSummary}`);
    lines.push(`📊 Platform: ${b.platformPerformance}`);
    lines.push('');
  }

  lines.push(`📬 New leads: ${digest.newLeads.count} — ${digest.newLeads.companies.join(', ') || 'none'}`);
  lines.push(`💬 Non-urgent replies: ${digest.nonUrgentReplies.count} — ${digest.nonUrgentReplies.subjects.join(', ') || 'none'}`);
  lines.push(`📋 Fulfillment needing review: ${digest.fulfillmentNeedsReview.length} brands`);
  lines.push(`📄 Contracts in renewal window: ${digest.contractsInRenewalWindow.length}`);
  if (digest.commissionsOvernight.length > 0) {
    const autoSent = digest.commissionsOvernight.filter((c) => c.decision === 'auto_sent').length;
    const held = digest.commissionsOvernight.filter((c) => c.decision === 'held_for_approval').length;
    lines.push(`💰 Commissions: ${autoSent} auto-sent, ${held} held for approval`);
  }
  lines.push(`❌ Rejected submissions needing human: ${digest.rejectedSubmissionsNeedingHuman.length}`);

  return lines.join('\n');
}
