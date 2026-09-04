/**
 * §13 Stage-13 — Auto-approval thresholds (human-in-the-loop layer).
 *
 * Two rules from the automation spec:
 *   1. Routine commission invoices BELOW the configured threshold are
 *      auto-generated and sent; at/above it they're held for one-click admin
 *      approval in the daily digest.
 *   2. Fulfillment-track assignment OUTSIDE the 55–74 borderline band applies
 *      immediately with no approval step; inside the band it is held for
 *      human review (batched into the digest).
 */

import { isBorderline, assignTrack, type FulfillmentScoreLike } from './scoringBridge';

export const AUTO_APPROVE_THRESHOLD_GBP =
  // Re-exported placeholder — single source stays in config/commercial.ts.
  10_000;

export type CommissionStatus = 'accrued' | 'invoiced' | 'paid';

export interface AutoApprovalDecision {
  autoApproved: boolean;
  reason: string;
}

/** Rule 1 — commission invoices below the threshold auto-send. */
export function shouldAutoApproveCommission(commissionAmountGbp: number): AutoApprovalDecision {
  if (commissionAmountGbp < AUTO_APPROVE_THRESHOLD_GBP) {
    return {
      autoApproved: true,
      reason: `commission £${commissionAmountGbp.toFixed(2)} below £${AUTO_APPROVE_THRESHOLD_GBP.toLocaleString()} auto-approve threshold`,
    };
  }
  return {
    autoApproved: false,
    reason: `commission £${commissionAmountGbp.toFixed(2)} at/above threshold — held for admin approval`,
  };
}

export interface TrackAssignment {
  brandId: string;
  action: 'applied' | 'held_for_review';
  track?: 'direct_fulfillment' | 'financed' | 'unassigned';
  totalScore: number;
  reason: string;
}

/** Rule 2 — apply auto-assignment outside the band, hold inside it. */
export function applyAutoTrackAssignments(
  scores: FulfillmentScoreLike[]
): TrackAssignment[] {
  return scores
    .filter((s) => !s.manualOverride)
    .map((s): TrackAssignment => {
      if (isBorderline(s.totalScore)) {
        return {
          brandId: s.brandId,
          action: 'held_for_review',
          totalScore: s.totalScore,
          reason: `score ${s.totalScore} in 55–74 borderline band — held for review`,
        };
      }
      const track = assignTrack(s.totalScore);
      return {
        brandId: s.brandId,
        action: 'applied',
        track,
        totalScore: s.totalScore,
        reason: `score ${s.totalScore} outside band — ${track} applied immediately`,
      };
    });
}
