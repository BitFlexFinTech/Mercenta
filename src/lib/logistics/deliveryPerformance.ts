/**
 * §WAVE 3 — DELIVERY PERFORMANCE (deterministic aggregation over canonical data).
 *
 * WHAT THIS IS
 * ------------
 * A deterministic projection over the SAME canonical consignment legs the
 * operational map already plots — no new analytics subsystem, no new store, no
 * fabricated history. The legs are already tenant-scoped by the caller, so this
 * module inherits tenant isolation rather than re-implementing it.
 *
 * HONESTY RULES
 * -------------
 * · A rate is `null` when there is no sample to compute it from — a "100%
 *   on-time" figure derived from zero delivered consignments would be a
 *   fabricated claim.
 * · Provider-VERIFIED deliveries are counted separately from derived/simulated
 *   ones, using the same truth classification the map uses. A rate that rests
 *   only on simulated legs says so.
 * · No historical delivery data is invented: everything is counted from the
 *   consignment records that actually exist for this tenant.
 */
import type { OperationalTruth } from '@/config/logisticsGeo';

export interface DeliveryPerformanceLeg {
  status: string;
  stage: string;
  truth: OperationalTruth;
  delayed?: boolean;
  exception?: boolean;
}

export interface DeliveryPerformance {
  total: number;
  delivered: number;
  inTransit: number;
  delayed: number;
  exceptions: number;
  /** Delivered consignments with no recorded delay/exception. */
  onTime: number;
  /** `onTime / delivered`, or null when nothing has been delivered yet. */
  onTimeRate: number | null;
  /** `exceptions / total`, or null when there are no consignments. */
  exceptionRate: number | null;
  /** Delivered legs whose provider positively resolved live. */
  verifiedDelivered: number;
  /** Delivered legs derived from simulation. */
  simulatedDelivered: number;
  /** Which canonical records this was computed from. */
  basis: 'canonical_consignment_records';
  /** Rendered provenance — never hidden. */
  sources: string[];
}

const DELIVERED_STATUSES: readonly string[] = ['live_amazon'];

export function buildDeliveryPerformance(legs: DeliveryPerformanceLeg[]): DeliveryPerformance {
  let delivered = 0;
  let inTransit = 0;
  let delayed = 0;
  let exceptions = 0;
  let onTime = 0;
  let verifiedDelivered = 0;
  let simulatedDelivered = 0;

  for (const leg of legs) {
    const isDelivered = DELIVERED_STATUSES.includes(leg.status);
    if (isDelivered) {
      delivered += 1;
      if (!leg.delayed && !leg.exception) onTime += 1;
      if (leg.truth === 'live_verified') verifiedDelivered += 1;
      else simulatedDelivered += 1;
    } else {
      inTransit += 1;
    }
    if (leg.delayed) delayed += 1;
    if (leg.exception) exceptions += 1;
  }

  const total = legs.length;
  return {
    total,
    delivered,
    inTransit,
    delayed,
    exceptions,
    onTime,
    onTimeRate: delivered > 0 ? onTime / delivered : null,
    exceptionRate: total > 0 ? exceptions / total : null,
    verifiedDelivered,
    simulatedDelivered,
    basis: 'canonical_consignment_records',
    sources: [
      `${total} consignment record(s) for this tenant (${delivered} delivered, ${inTransit} in transit).`,
      delivered === 0
        ? 'No delivered consignment yet, so no on-time rate is reported — a rate is never invented.'
        : `On-time = delivered with no recorded delay/exception (${onTime}/${delivered}).`,
      verifiedDelivered === 0
        ? 'No delivery is provider-verified: every delivered consignment here is simulated/derived, and the figures say so.'
        : `${verifiedDelivered} delivered consignment(s) are provider-verified; ${simulatedDelivered} are simulated.`,
    ],
  };
}

/** A percentage label, or an explicit "no sample" statement. */
export function performanceLabel(rate: number | null): string {
  if (rate === null) return 'No sample yet';
  return `${Math.round(rate * 100)}%`;
}
