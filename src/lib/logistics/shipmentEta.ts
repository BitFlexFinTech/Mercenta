/**
 * §WAVE 3 — SHIPMENT ETA DERIVATION (deterministic, honest, fail-closed).
 *
 * The ETA is a REAL domain capability: it is derived from the consignment's own
 * canonical record (the applicable PO window plus the recorded delay/exception
 * state) and it always carries its BASIS. It never fabricates a carrier ETA and
 * it never invents a date when no window was declared.
 *
 * Pure and side-effect free: the same consignment always yields the same ETA.
 * Zero network calls.
 */
import type { FreightTerm, ShipmentEta, ShipmentStage, ShipmentStatus } from '@/types';

/**
 * The deterministic slip applied to a delayed or exception consignment. It is a
 * SIMULATED allowance, declared here once — never presented as carrier data.
 */
export const SIMULATED_DELAY_SLIP_DAYS = 5;

/** Which PO window governs the ETA for a given freight term. */
export function etaWindowKindFor(freightTerm?: FreightTerm | null): 'ship' | 'delivery' | null {
  if (freightTerm === 'prepaid') return 'delivery';
  if (freightTerm === 'collect') return 'ship';
  return null;
}

export interface ShipmentEtaInput {
  status: ShipmentStatus | string;
  stage: ShipmentStage | string;
  /** The applicable PO window end (`deliveryWindowEnd` or `shipWindowEnd`). */
  windowEnd?: string | null;
  /** Which window that is — rendered in the source line. */
  windowKind: 'ship' | 'delivery' | null;
  delayed?: boolean;
  exception?: boolean;
  /** True when the consignment itself is simulated (always true today). */
  simulated?: boolean;
}

/** Statuses that mean the consignment has already arrived. */
const ARRIVED_STATUSES: readonly string[] = ['live_amazon'];

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Derive a consignment's ETA.
 *
 * Order of precedence (fail closed at every step):
 *   1. already at the destination        → `delivered`   (no forward ETA)
 *   2. a declared PO window exists       → `channel_window` (delayed/exception
 *                                          consignments use `simulated_transit`)
 *   3. no window declared                → `unavailable` (never invented)
 */
export function deriveShipmentEta(input: ShipmentEtaInput): ShipmentEta {
  if (ARRIVED_STATUSES.includes(String(input.status))) {
    return {
      date: null,
      basis: 'delivered',
      simulated: false,
      source:
        'The consignment has already reached the retail-channel destination, so no forward ETA applies.',
    };
  }

  if (!input.windowEnd) {
    return {
      date: null,
      basis: 'unavailable',
      simulated: false,
      source:
        'No ship or delivery window is declared on the purchase order, so no ETA is derived. An ETA is never invented.',
    };
  }

  const windowLabel = input.windowKind === 'ship' ? 'ship window' : 'delivery window';
  const slipped = Boolean(input.delayed || input.exception);

  if (slipped) {
    return {
      date: addDays(input.windowEnd, SIMULATED_DELAY_SLIP_DAYS),
      basis: 'simulated_transit',
      simulated: true,
      source:
        `Simulated transit estimate: the declared ${windowLabel} (${input.windowEnd}) plus a ` +
        `${SIMULATED_DELAY_SLIP_DAYS}-day allowance for the recorded delay/exception. ` +
        'This is Mercenta simulation, not a carrier confirmation.',
    };
  }

  return {
    date: input.windowEnd,
    basis: 'channel_window',
    simulated: true,
    source:
      `Derived from the purchase order's declared ${windowLabel} (${input.windowEnd}). ` +
      'No carrier has confirmed this date.',
  };
}

export interface EtaPresentation {
  label: string;
  /** `verified` only when a provider confirmed the date; else derived/simulated. */
  tone: 'derived' | 'simulated' | 'delivered' | 'unavailable';
  detail: string;
}

/** How an ETA must be presented — the label never overstates its basis. */
export function etaPresentation(eta: ShipmentEta): EtaPresentation {
  if (eta.basis === 'delivered') {
    return { label: 'Delivered', tone: 'delivered', detail: eta.source };
  }
  if (eta.basis === 'unavailable' || !eta.date) {
    return { label: 'ETA unavailable', tone: 'unavailable', detail: eta.source };
  }
  const date = new Date(`${eta.date}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  if (eta.basis === 'simulated_transit') {
    return { label: `${date} (simulated)`, tone: 'simulated', detail: eta.source };
  }
  return { label: `${date} (derived)`, tone: 'derived', detail: eta.source };
}

/** Should the ETA be treated as "at risk" against its own window? */
export function isEtaAtRisk(eta: ShipmentEta, delayed?: boolean, exception?: boolean): boolean {
  return Boolean(delayed || exception) && eta.basis !== 'delivered' && eta.basis !== 'unavailable';
}
