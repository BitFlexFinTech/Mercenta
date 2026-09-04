/**
 * §4 — Contract Cycle helpers.
 *
 * Renewal windows: contracts entering 60/30/7-day windows are flagged for
 * reminders (batched into the daily digest, §8); a draft renewal contract is
 * created automatically at the 60-day mark for admin review.
 *
 * All functions are pure and take an explicit `now` so they are testable.
 */
import type { Contract } from '@/types';

export type RenewalUrgency = 'expired' | '7d' | '30d' | '60d' | 'ok';

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysUntil(renewalDate: string, now: string): number {
  return Math.ceil((new Date(renewalDate).getTime() - new Date(now).getTime()) / DAY_MS);
}

export function renewalUrgency(renewalDate: string, now: string): RenewalUrgency {
  const days = daysUntil(renewalDate, now);
  if (days < 0) return 'expired';
  if (days <= 7) return '7d';
  if (days <= 30) return '30d';
  if (days <= 60) return '60d';
  return 'ok';
}

/** True when a draft renewal should be created automatically (at 60 days). */
export function shouldCreateRenewalDraft(renewalDate: string, now: string): boolean {
  const days = daysUntil(renewalDate, now);
  return days >= 0 && days <= 60;
}

/** Create the next-version draft renewal from an existing contract. */
export function createRenewalDraft(contract: Contract): Contract {
  const effective = new Date(contract.renewalDate);
  const nextRenewal = new Date(effective.getTime() + 365 * DAY_MS);
  return {
    ...contract,
    id: `${contract.id}-renewal-v${contract.version + 1}`,
    status: 'draft',
    version: contract.version + 1,
    effectiveDate: contract.renewalDate,
    renewalDate: nextRenewal.toISOString().slice(0, 10),
    documentUrl: '', // regenerated from template at send time
    signatories: [],
  };
}

export const CONTRACT_STATUS_LABELS: Record<Contract['status'], string> = {
  draft: 'Draft',
  sent: 'Sent for e-signature',
  under_review: 'Under review',
  signed: 'Signed',
  active: 'Active',
  expiring: 'Expiring',
  terminated: 'Terminated',
};

/* ── §Stage-2 — fulfillment-track amendment flow ─────────────────────── */

/**
 * A signed/active contract whose fulfillmentTrack no longer matches the
 * brand's current track must NOT be silently regenerated. Instead an
 * amendment/addendum draft is issued for review.
 */
export function trackMismatch(
  contract: Pick<Contract, 'fulfillmentTrack' | 'status'>,
  currentTrack: Contract['fulfillmentTrack']
): boolean {
  const binding = contract.status === 'signed' || contract.status === 'active';
  return binding && contract.fulfillmentTrack !== currentTrack;
}

/** Issue the amendment/addendum draft for a track change. */
export function createTrackAmendment(
  contract: Contract,
  newTrack: Contract['fulfillmentTrack'],
  now: string = new Date().toISOString()
): Contract {
  return {
    ...contract,
    id: `${contract.id}-amendment-${new Date(now).getTime()}`,
    type: 'rate_card_addendum',
    status: 'draft',
    version: contract.version + 1,
    fulfillmentTrack: newTrack,
    documentUrl: '',
    signatories: [],
  };
}
