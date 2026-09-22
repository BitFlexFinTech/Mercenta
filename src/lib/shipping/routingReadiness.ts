/**
 * §WAVE 3 — MERCENTA'S OWN ROUTING-READINESS TARGET.
 *
 * WHY THIS MODULE EXISTS (and why it says "Mercenta")
 * ---------------------------------------------------
 * An earlier implementation asserted, as a retail-channel rule, that "the vendor
 * must submit a Routing Request by 10am Pacific the day before the ship window
 * closes". That claim is NOT established by any Amazon source reached:
 * `docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md` records it as `AV-013`
 * ("UNKNOWN — reclassify to a Mercenta operational target, or remove until
 * Amazon confirms"), and the discrepancy register lists it under contradicted
 * areas. Presenting it as a channel deadline was therefore an unsupported
 * product truth.
 *
 * The product still needs an operational deadline — a consignment must not be
 * dispatched against a window that has already closed. So the target is declared
 * HERE, ONCE, as what it actually is: **Mercenta's own readiness target**.
 *
 *   · It is never attributed to the retail channel.
 *   · No replacement channel deadline is invented.
 *   · It uses Mercenta's own working day (Europe/London), not a channel timezone.
 */
export const ROUTING_READINESS = {
  /** Who owns this target. Rendered in the UI — never implied to be the channel. */
  owner: 'Mercenta' as const,
  /** Days before the ship window closes by which the routing step is prepared. */
  leadDays: 1,
  /** Local cut-off hour (Europe/London) on the readiness day. */
  cutoffHour: 17,
  label: 'Mercenta operational readiness target',
  /** The authoritative basis for treating this as Mercenta-owned. */
  basis:
    'Mercenta-internal operational target (AV-013). NOT a retail-channel deadline — no channel routing deadline is asserted, because none is established by the research.',
} as const;

/** The readiness moment for a ship window end date (ISO `YYYY-MM-DD`). */
export function routingReadinessDeadline(shipWindowEnd: string): Date {
  const deadline = new Date(`${shipWindowEnd}T00:00:00Z`);
  deadline.setUTCDate(deadline.getUTCDate() - ROUTING_READINESS.leadDays);
  deadline.setUTCHours(ROUTING_READINESS.cutoffHour - 1, 0, 0, 0);
  return deadline;
}

export interface RoutingReadinessStatus {
  deadline: Date;
  /** True when the readiness target has passed. */
  overdue: boolean;
  /** A short countdown label (`3d 4h`, `6h`, `OVERDUE`). */
  label: string;
}

export function routingReadinessStatus(shipWindowEnd: string): RoutingReadinessStatus {
  const deadline = routingReadinessDeadline(shipWindowEnd);
  const diff = deadline.getTime() - Date.now();
  if (diff <= 0) return { deadline, overdue: true, label: 'OVERDUE' };
  const hours = Math.ceil(diff / 3_600_000);
  if (hours > 48) return { deadline, overdue: false, label: `${Math.floor(hours / 24)}d ${hours % 24}h` };
  return { deadline, overdue: false, label: `${hours}h` };
}

/** A truthful sentence for the UI: whose target this is, and what it is not. */
export function routingReadinessNotice(): string {
  return (
    `${ROUTING_READINESS.label}: prepare and file the routing step by ${ROUTING_READINESS.cutoffHour}:00 ` +
    `(Europe/London) the day before the ship window closes. ${ROUTING_READINESS.basis}`
  );
}
