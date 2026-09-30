/**
 * §BATCH 2i (`AV-045`) — THE ONE OWNER OF THE DELIVERY-APPOINTMENT CONCEPT.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * The Phase 0A audit registered `AV-045` — *"delivery appointments: add the
 * appointment concept"*. Inbound delivery to a retail-channel fulfilment centre
 * is APPOINTMENT-BASED (source `S15`, Carrier Central): a carrier requests a
 * delivery date, the channel confirms a slot, and the channel documents one hard
 * rule about it —
 *
 *     "Carrier Requested Delivery Date must fall within the PO's Delivery Window"
 *
 * — with a consequence the platform may state but not invent: delivery-window
 * compliance feeds *shipper and carrier performance* (`S15`). Mercenta had no
 * appointment concept at all, so `deliveryWindowEnd` was rendered as a bare
 * "Deliver by" date and the channel's own appointment vocabulary
 * (Pending · Scheduled · Arrived · Deleted · Cancelled · Defect · Closed) existed
 * nowhere in the platform.
 *
 * WHAT THIS MODULE OWNS (and it is the ONLY place each fact is written)
 * --------------------------------------------------------------------
 *   1  the BEHAVIOUR each channel appointment state implies — total over the
 *      vocabulary, guarded at import time so a state can never be added without
 *      a declared meaning;
 *   2  the RESOLUTION of a raw value: an undocumented or absent one is `unknown`
 *      and says why — it is NEVER defaulted to a real state;
 *   3  the WINDOW RULE: a carrier-requested delivery date is checked against the
 *      PO's DECLARED delivery window and either passes or is REFUSED with a
 *      stated reason (before the window, after it, no window declared, or an
 *      undocumented date). It is never assumed compliant;
 *   4  the DERIVATION of a consignment's appointment from its own canonical
 *      record, exactly like `shipmentEta.ts` — deterministic, labelled simulated,
 *      and `unavailable` rather than invented when nothing can be derived.
 *
 * WHAT IS NEVER DONE
 * ------------------
 *   · No guessed appointment state. An unrecognised value is `unknown`.
 *   · No invented window. A PO with no declared delivery window cannot have a
 *     compliant appointment, so the rule fails closed and says so — it does not
 *     fall back to the ship window, which is a different commitment (`AV-012`).
 *   · No invented channel threshold. The Carrier Controllable FPY eligibility
 *     threshold is documented as EXISTING but its value is not public, so this
 *     module records that fact (`CHANNEL_FPY_THRESHOLD_DOCUMENTED = false`) and
 *     computes nothing from it.
 *   · No network, no clock, no store: pure, so the gate can execute it directly.
 *
 * EVIDENCE: `docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md` → S15 (Carrier
 * Central appointment states and the delivery-window rule); `S3`/`S5` for the
 * PO's own `deliveryWindowStart` / `deliveryWindowEnd`.
 */
import {
  CHANNEL_APPOINTMENT_STATES,
  isResolvedShipmentStatus,
  type AppointmentWindowVerdict,
  type ChannelAppointmentState,
  type DeliveryAppointment,
  type ShipmentStatus,
} from '@/types';

/* ══════════════════════════════════════════════════════════════════════════
 * 1. THE CHANNEL'S APPOINTMENT VOCABULARY — behaviour per state (TOTAL)
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * What each channel appointment state implies, in Mercenta's own terms.
 *
 * `live` / `actionable` / `terminal` are MERCENTA'S OPERATIONAL CONSEQUENCE of
 * the channel's state — declared here as Mercenta's judgement, never presented as
 * a channel requirement. The channel documents the STATE (`S15`); what Mercenta
 * does about it is Mercenta's rule.
 */
export interface AppointmentStateBehaviour {
  /** How the state is shown to a user. */
  label: string;
  /** True while the appointment still governs an inbound delivery. */
  live: boolean;
  /** True when Mercenta must act (book a new slot / investigate). */
  actionable: boolean;
  /** True when nothing further happens to this appointment. */
  terminal: boolean;
  /**
   * The consignment milestone this state is consistent with, where one is
   * documented. `null` means the state says nothing about the consignment's
   * position — a value is never invented to fill it.
   */
  mercentaMilestone: ShipmentStatus | null;
  /** Plain statement of the state. Rendered; never hidden behind a label alone. */
  meaning: string;
}

export const APPOINTMENT_STATE_BEHAVIOUR: Record<ChannelAppointmentState, AppointmentStateBehaviour> = {
  Pending: {
    label: 'Appointment pending',
    live: true,
    actionable: false,
    terminal: false,
    mercentaMilestone: null,
    meaning:
      'A delivery date has been requested and the channel has not yet confirmed a slot. Nothing can be booked until it does.',
  },
  Scheduled: {
    label: 'Appointment scheduled',
    live: true,
    actionable: false,
    terminal: false,
    mercentaMilestone: null,
    meaning:
      'A slot is confirmed. The carrier-requested delivery date must fall within the purchase order’s delivery window.',
  },
  Arrived: {
    label: 'Carrier arrived',
    live: true,
    actionable: false,
    terminal: false,
    mercentaMilestone: 'destination_fc',
    meaning: 'The carrier has arrived at the fulfilment centre for its booked slot.',
  },
  Deleted: {
    label: 'Appointment deleted',
    live: false,
    actionable: true,
    terminal: false,
    mercentaMilestone: null,
    meaning: 'The appointment was removed. A new slot must be booked before the consignment can be delivered.',
  },
  Cancelled: {
    label: 'Appointment cancelled',
    live: false,
    actionable: true,
    terminal: false,
    mercentaMilestone: null,
    meaning: 'The appointment was cancelled. A new slot must be booked before the consignment can be delivered.',
  },
  Defect: {
    label: 'Appointment did not materialise',
    live: false,
    actionable: true,
    terminal: false,
    mercentaMilestone: null,
    meaning:
      'The booked appointment did not take place. It must be re-booked, and the cause investigated — the channel counts appointments that fail close to the scheduled arrival in its own defect measure.',
  },
  Closed: {
    label: 'Appointment closed',
    live: false,
    actionable: false,
    terminal: true,
    mercentaMilestone: 'destination_fc',
    meaning: 'The appointment completed and was closed out.',
  },
};

/**
 * §BATCH 2i — the channel documents its FPY eligibility threshold as EXISTING
 * (`S15`) but does not publish its value. Recording the absence is the honest
 * position: the platform must never compute a claim from a threshold it does not
 * have.
 */
export const CHANNEL_FPY_THRESHOLD_DOCUMENTED = false;

/**
 * The channel's documented DEFECT RATE definition (`S15`): *"appointments that
 * did not materialise due to changes within 24h of scheduled arrival"*. Declared
 * here as the channel's definition; Mercenta does not compute a channel defect
 * rate (no channel reporting feed exists — `S14`), so this is documentation, not
 * a calculation.
 */
export const CHANNEL_DEFECT_RATE_DEFINITION =
  'Appointments that did not materialise because of a change made within 24 hours of the scheduled arrival ' +
  '(the retail channel’s own definition).';

/** Plain-language attribution for anything derived from the appointment concept. */
export const DELIVERY_APPOINTMENT_ATTRIBUTION = {
  source: 'S15 — the retail channel’s own Carrier Central appointment documentation and client strings',
  verifiedAgainstChannel: true,
  attributionNote:
    'Inbound delivery to the retail channel is appointment-based, and the carrier-requested delivery date must fall ' +
    'within the purchase order’s delivery window. The appointment states and that window rule are the retail ' +
    'channel’s own; whether Mercenta must act on a state is Mercenta’s operational rule.',
} as const;

/* ══════════════════════════════════════════════════════════════════════════
 * 2. RESOLUTION — fail closed on an undocumented value
 * ══════════════════════════════════════════════════════════════════════════ */

/** True only for one of the channel's seven documented appointment states. */
export function isChannelAppointmentState(value: unknown): value is ChannelAppointmentState {
  return typeof value === 'string' && (CHANNEL_APPOINTMENT_STATES as readonly string[]).includes(value);
}

export interface ResolvedAppointmentState {
  state: ChannelAppointmentState | 'unknown';
  recognised: boolean;
  /** Why this resolution was reached. Always stated, never empty. */
  reason: string;
}

/**
 * Resolve a raw appointment value the channel sent.
 *
 * An undocumented value — or an absent one — resolves to `unknown` and says why.
 * It is NEVER mapped onto a real state, because the difference between "the
 * channel did not send this" and "the channel sent something we do not know" is
 * exactly the difference that makes a live integration lie.
 */
export function resolveChannelAppointmentState(raw: unknown): ResolvedAppointmentState {
  if (raw === null || raw === undefined || raw === '') {
    return {
      state: 'unknown',
      recognised: false,
      reason: 'No appointment state was supplied, so none is assumed.',
    };
  }
  if (!isChannelAppointmentState(raw)) {
    return {
      state: 'unknown',
      recognised: false,
      reason:
        `"${String(raw)}" is not one of the channel’s documented appointment states ` +
        `(${CHANNEL_APPOINTMENT_STATES.join(' / ')}), so it is not interpreted as one.`,
    };
  }
  /**
   * §BATCH 2i — DEFENSIVE FAIL-CLOSED (found by mutation-proving this gate): the
   * guard above is the recognition step, but the lookup must not DEPEND on it.
   * With the guard alone, an unregistered state crashed here instead of resolving
   * to `unknown` — a recognition bug would have become a runtime error on the
   * read path. The behaviour is re-checked, and its absence fails closed.
   */
  const behaviour = APPOINTMENT_STATE_BEHAVIOUR[raw];
  if (!behaviour) {
    return {
      state: 'unknown',
      recognised: false,
      reason:
        `"${raw}" is in the channel’s appointment vocabulary but has no declared behaviour, so it is not ` +
        'interpreted as a usable state.',
    };
  }
  return {
    state: raw,
    recognised: true,
    reason: behaviour.meaning,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 3. THE WINDOW RULE — carrier-requested delivery date vs the PO delivery window
 * ══════════════════════════════════════════════════════════════════════════ */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export interface AppointmentWindowInput {
  /** The date the carrier asked to deliver (ISO YYYY-MM-DD). */
  carrierRequestedDeliveryDate?: string | null;
  /** The PO's declared delivery window bounds (freight-prepaid commitment). */
  deliveryWindowStart?: string | null;
  deliveryWindowEnd?: string | null;
}

/**
 * Apply the channel's documented rule: the carrier-requested delivery date must
 * fall WITHIN the purchase order's delivery window.
 *
 * Every outcome is stated. A request before the window, after it, with no window
 * declared, or with an undocumented date is REFUSED (`ok: false`) with a reason —
 * the function never returns "fine" because it could not tell.
 */
export function validateAppointmentWithinDeliveryWindow(
  input: AppointmentWindowInput
): AppointmentWindowVerdict {
  const start = isIsoDate(input.deliveryWindowStart) ? input.deliveryWindowStart : null;
  const end = isIsoDate(input.deliveryWindowEnd) ? input.deliveryWindowEnd : null;

  if (!start && !end) {
    return {
      ok: false,
      code: 'no-delivery-window',
      reason:
        'The purchase order declares no delivery window, so a carrier-requested delivery date cannot be ' +
        'shown to fall within one. A ship window is a different commitment and is not used as a substitute.',
    };
  }

  if (!isIsoDate(input.carrierRequestedDeliveryDate)) {
    return {
      ok: false,
      code: 'undocumented-date',
      reason:
        'No valid carrier-requested delivery date is declared, so compliance with the purchase order’s ' +
        'delivery window cannot be established.',
    };
  }

  if (start && input.carrierRequestedDeliveryDate < start) {
    return {
      ok: false,
      code: 'before-window',
      reason:
        `The requested delivery date (${input.carrierRequestedDeliveryDate}) is before the purchase order’s ` +
        `delivery window opens (${start}).`,
    };
  }
  if (end && input.carrierRequestedDeliveryDate > end) {
    return {
      ok: false,
      code: 'after-window',
      reason:
        `The requested delivery date (${input.carrierRequestedDeliveryDate}) is after the purchase order’s ` +
        `delivery window closes (${end}).`,
    };
  }

  const bounds = start && end ? `${start} to ${end}` : `${start ?? end}`;
  return {
    ok: true,
    code: 'within-window',
    reason: `The requested delivery date (${input.carrierRequestedDeliveryDate}) falls within the purchase order’s delivery window (${bounds}).`,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 4. DERIVATION — the consignment's appointment, from its own canonical record
 * ══════════════════════════════════════════════════════════════════════════ */

const KNOWN_MILESTONES: readonly ShipmentStatus[] = [
  'factory_intake',
  'bak_depot',
  'sea_transit',
  'air_transit',
  'uk_customs_cleared',
  'destination_fc',
  'live_amazon',
];

export interface DeliveryAppointmentInput {
  /** The consignment's current milestone (Mercenta's own `ShipmentStatus`). */
  milestone: ShipmentStatus | string;
  delayed?: boolean;
  exception?: boolean;
  deliveryWindowStart?: string | null;
  deliveryWindowEnd?: string | null;
  /** True when the consignment itself is simulated (always true today). */
  simulated?: boolean;
}

/**
 * Derive a consignment's appointment.
 *
 * Precedence (fail closed at every step):
 *   1. an unrecognised milestone          → `unknown` / `unavailable`
 *   2. already at the destination         → `Arrived`
 *   3. a recorded delay or exception      → `Defect` (the slot did not materialise)
 *   4. a declared delivery window exists  → `Scheduled`, with the requested date
 *                                           derived from the window's opening
 *   5. nothing declared                   → `Pending` (a date is never invented,
 *                                           so the window rule cannot pass)
 *
 * The `simulated` flag is true for every derived appointment: no carrier has
 * confirmed a slot, and the `source` string says exactly that.
 */
export function deriveDeliveryAppointment(input: DeliveryAppointmentInput): DeliveryAppointment {
  const simulated = input.simulated ?? true;

  if (!(KNOWN_MILESTONES as readonly string[]).includes(String(input.milestone))) {
    return {
      state: 'unknown',
      basis: 'unavailable',
      carrierRequestedDeliveryDate: null,
      window: validateAppointmentWithinDeliveryWindow({
        carrierRequestedDeliveryDate: null,
        deliveryWindowStart: input.deliveryWindowStart,
        deliveryWindowEnd: input.deliveryWindowEnd,
      }),
      simulated,
      source:
        `The consignment's milestone "${String(input.milestone)}" is not one of Mercenta's declared shipment ` +
        'statuses, so no appointment is derived from it.',
    };
  }

  if (isResolvedShipmentStatus(String(input.milestone))) {
    return {
      state: 'Arrived',
      basis: 'derived',
      carrierRequestedDeliveryDate: null,
      window: validateAppointmentWithinDeliveryWindow({
        carrierRequestedDeliveryDate: null,
        deliveryWindowStart: input.deliveryWindowStart,
        deliveryWindowEnd: input.deliveryWindowEnd,
      }),
      simulated,
      source:
        'The consignment has reached the destination fulfilment centre, so its appointment has been used. ' +
        'This is Mercenta simulation, not a channel confirmation.',
    };
  }

  if (input.delayed || input.exception) {
    const requested = isIsoDate(input.deliveryWindowStart) ? input.deliveryWindowStart : null;
    return {
      state: 'Defect',
      basis: 'derived',
      carrierRequestedDeliveryDate: requested,
      window: validateAppointmentWithinDeliveryWindow({
        carrierRequestedDeliveryDate: requested,
        deliveryWindowStart: input.deliveryWindowStart,
        deliveryWindowEnd: input.deliveryWindowEnd,
      }),
      simulated,
      source:
        'Simulated appointment projection: the consignment carries a recorded delay/exception, so its booked ' +
        'slot is treated as one that did not materialise. This is Mercenta simulation, not a channel confirmation.',
    };
  }

  const requested = isIsoDate(input.deliveryWindowStart) ? input.deliveryWindowStart : null;
  if (requested || isIsoDate(input.deliveryWindowEnd)) {
    return {
      state: 'Scheduled',
      basis: 'derived',
      carrierRequestedDeliveryDate: requested,
      window: validateAppointmentWithinDeliveryWindow({
        carrierRequestedDeliveryDate: requested,
        deliveryWindowStart: input.deliveryWindowStart,
        deliveryWindowEnd: input.deliveryWindowEnd,
      }),
      simulated,
      source:
        'Simulated appointment projection derived from the purchase order’s declared delivery window. ' +
        'No carrier has confirmed this slot.',
    };
  }

  return {
    state: 'Pending',
    basis: 'derived',
    carrierRequestedDeliveryDate: null,
    window: validateAppointmentWithinDeliveryWindow({
      carrierRequestedDeliveryDate: null,
      deliveryWindowStart: input.deliveryWindowStart,
      deliveryWindowEnd: input.deliveryWindowEnd,
    }),
    simulated,
    source:
      'The purchase order declares no delivery window, so no appointment date can be derived. A date is never invented.',
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 5. PRESENTATION — the label never overstates the basis
 * ══════════════════════════════════════════════════════════════════════════ */

export interface AppointmentPresentation {
  label: string;
  tone: 'confirmed' | 'derived' | 'action' | 'unknown';
  detail: string;
  /** The window rule's own words, ready to render. */
  windowDetail: string;
}

export function appointmentPresentation(appointment: DeliveryAppointment): AppointmentPresentation {
  if (appointment.state === 'unknown') {
    return {
      label: 'Appointment unknown',
      tone: 'unknown',
      detail: appointment.source,
      windowDetail: appointment.window.reason,
    };
  }
  const behaviour = APPOINTMENT_STATE_BEHAVIOUR[appointment.state];
  const tone: AppointmentPresentation['tone'] =
    appointment.state === 'Closed' || appointment.state === 'Arrived'
      ? 'confirmed'
      : behaviour.actionable
        ? 'action'
        : 'derived';
  return {
    label: behaviour.label,
    tone,
    detail: appointment.source,
    windowDetail: appointment.window.reason,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 6. MODULE-LOAD GUARD — a state can never lack a declared meaning
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * The `Record<…>` type already forces every state to have a behaviour, but a
 * type is erased at runtime. This guard fails at IMPORT time (and is asserted by
 * `scripts/validate-delivery-appointment.mjs`) if the channel's vocabulary and
 * the behaviour table ever disagree — so no consignment can reach a surface with
 * an appointment state Mercenta cannot explain.
 */
for (const state of CHANNEL_APPOINTMENT_STATES) {
  const behaviour = APPOINTMENT_STATE_BEHAVIOUR[state];
  if (!behaviour || !behaviour.label || !behaviour.meaning) {
    throw new Error(
      `[deliveryAppointment] the channel appointment state "${state}" has no declared behaviour. Every documented ` +
        `state must say what it means, or Mercenta would be silently unable to explain a real appointment.`
    );
  }
}




