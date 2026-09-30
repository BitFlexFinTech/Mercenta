/**
 * §BATCH 2h (`AV-043`) — THE ONE OWNER OF THE PURCHASE-ORDER VOCABULARY MAPPING.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * The Phase 0A audit registered `AV-043` — *"two vocabularies with no declared
 * mapping"*:
 *
 *   Mercenta (PO)   `received` · `under_review` · `accepted` · `rejected` ·
 *                   `ready_to_fulfil` · `shipped` · `delivered`
 *   Mercenta (line) `unacknowledged` · `accepted` · `rejected` · `backordered`
 *   the channel     `purchaseOrderState` (`New`/`Acknowledged`/`Closed`) ·
 *                   `purchaseOrderStatus` (`OPEN`/`CLOSED`) ·
 *                   `itemConfirmationStatus` (`ACCEPTED`/`REJECTED`/
 *                   `PARTIALLY_ACCEPTED`) · `poItemState` (`Canceled`)
 *
 * The two sides met at a live integration with nothing in writing between them.
 * One implicit fragment did exist — the acknowledgement window derived the
 * channel's state from hard-coded status checks inside
 * `poAcknowledgementWindow.ts` — and an implicit fragment is worse than none: it
 * cannot be found, cannot be reversed, and silently disagrees the moment a status
 * is added. This module is the ONE place the mapping is written down, in both
 * directions, and the window now ASKS it rather than re-deciding.
 *
 * WHAT "BIDIRECTIONAL" MEANS HERE (and what it honestly cannot mean)
 * -----------------------------------------------------------------
 *   forward  Mercenta status  →  the channel's own values for that status. TOTAL
 *            over `PurchaseOrderStatus`; a status without a row fails the
 *            typecheck and the module-load guard.
 *   reverse  a channel read   →  the Mercenta statuses it could be. This is a SET,
 *            not one value: the channel's `OPEN` genuinely covers both of
 *            Mercenta's un-acknowledged and acknowledged positions, and collapsing
 *            that to a single status would be an invention. Where the channel's two
 *            fields disagree, or either carries an undocumented value, the
 *            resolution FAILS CLOSED and says why — it never picks a status.
 *
 * WHAT IS NEVER DONE
 * ------------------
 *   · No invented channel value. A Mercenta-only concept with no documented channel
 *     equivalent maps to `null` and carries `mercentaSubState: true` (a backordered
 *     line is the live example: the channel confirms it as ACCEPTED and Mercenta's
 *     word never goes on the wire).
 *   · No guessing. An unrecognised value is `unknown`, never a default.
 *   · No network, no clock, no store: pure, so the gate executes it directly.
 *
 * EVIDENCE: `docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md` §5.2, sources S4
 * (the channel's `New` = *"the orders you have not acknowledged or fulfilled"*;
 * `poItemState=Canceled`) and S5 (`purchaseOrderStatus`, `itemConfirmationStatus`).
 */
import type {
  ChannelItemConfirmationStatus,
  ChannelPoOrderState,
  ChannelPoOrderStatus,
  LineAckStatus,
  PurchaseOrderStatus,
} from '@/types';
import {
  CHANNEL_ITEM_CONFIRMATION_STATUSES,
  CHANNEL_PO_ORDER_STATES,
  CHANNEL_PO_ORDER_STATUSES,
} from '@/types';
import type { PoChannelState } from '@/config/purchaseOrders';
import type { ChannelPurchaseOrderStatus } from '@/lib/spapi/client';

/* ══════════════════════════════════════════════════════════════════════════
 * 1. FORWARD — Mercenta's status → the channel's own words
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * THE mapping every reader and writer asks for: which of the channel's own
 * lifecycle positions a Mercenta status occupies.
 *
 * The three positions and the evidence for each:
 *   `new`          — the channel's `New`: *"the orders you have not acknowledged or
 *                    fulfilled"* (S4). Mercenta's `received` (the order has
 *                    arrived, no decision recorded) and `under_review` (the
 *                    decision is being made) are exactly that position.
 *   `acknowledged` — the decision is recorded and the order is in fulfilment:
 *                    `accepted`, `ready_to_fulfil`, `shipped`.
 *   `closed`       — completed or rejected: `rejected`, `delivered`.
 *
 * TOTAL BY CONSTRUCTION: `PurchaseOrderStatus` is a closed union, so a status
 * added without a row here fails the typecheck AND the module-load guard below.
 */
export const PO_CHANNEL_STATE_BY_STATUS: Record<PurchaseOrderStatus, PoChannelState> = {
  received: 'new',
  under_review: 'new',
  accepted: 'acknowledged',
  ready_to_fulfil: 'acknowledged',
  shipped: 'acknowledged',
  rejected: 'closed',
  delivered: 'closed',
};

/** The channel's own `purchaseOrderState` for a normalised channel state. */
export const CHANNEL_ORDER_STATE_BY_CHANNEL_STATE: Record<
  Exclude<PoChannelState, 'unknown'>,
  ChannelPoOrderState
> = {
  new: 'New',
  acknowledged: 'Acknowledged',
  closed: 'Closed',
};
/**
 * THE REVERSE OF `CHANNEL_ORDER_STATE_BY_CHANNEL_STATE`: the raw channel value read
 * off a response, back to the normalised position. Its existence is the point of
 * `AV-043` — without it a caller had to assume that the channel's `New` and
 * Mercenta's `new` were the same thing.
 */
export const CHANNEL_STATE_BY_CHANNEL_ORDER_STATE: Record<
  ChannelPoOrderState,
  Exclude<PoChannelState, 'unknown'>
> = {
  New: 'new',
  Acknowledged: 'acknowledged',
  Closed: 'closed',
};

/** The normalised channel position for the channel's own `purchaseOrderState`. */
export function channelStateForChannelOrderState(
  orderState: ChannelPoOrderState
): Exclude<PoChannelState, 'unknown'> {
  return CHANNEL_STATE_BY_CHANNEL_ORDER_STATE[orderState];
}



/** The channel's own `purchaseOrderStatus` for a normalised channel state. */
export const CHANNEL_ORDER_STATUS_BY_CHANNEL_STATE: Record<
  Exclude<PoChannelState, 'unknown'>,
  ChannelPoOrderStatus
> = {
  new: 'OPEN',
  acknowledged: 'OPEN',
  closed: 'CLOSED',
};

/** The channel's own order values for ONE of Mercenta's lifecycle statuses. */
export interface PoChannelOrderVocabulary {
  /** The channel's own `purchaseOrderState`. */
  orderState: ChannelPoOrderState;
  /** The channel's own `purchaseOrderStatus`. */
  orderStatus: ChannelPoOrderStatus;
}

/**
 * The exact channel values the platform sends for each Mercenta status, DERIVED
 * from `PO_CHANNEL_STATE_BY_STATUS` — never re-typed, so the two cannot disagree.
 */
export const PO_CHANNEL_ORDER_VOCABULARY_BY_STATUS: Record<
  PurchaseOrderStatus,
  PoChannelOrderVocabulary
> = Object.fromEntries(
  (Object.keys(PO_CHANNEL_STATE_BY_STATUS) as PurchaseOrderStatus[]).map((status) => {
    const state = PO_CHANNEL_STATE_BY_STATUS[status] as Exclude<PoChannelState, 'unknown'>;
    return [
      status,
      {
        orderState: CHANNEL_ORDER_STATE_BY_CHANNEL_STATE[state],
        orderStatus: CHANNEL_ORDER_STATUS_BY_CHANNEL_STATE[state],
      },
    ];
  })
) as Record<PurchaseOrderStatus, PoChannelOrderVocabulary>;

/**
 * The normalised channel state for a Mercenta status.
 *
 * FAIL CLOSED: a value that is not one of the declared statuses is `unknown` —
 * never `new`, never a default. An unknown status means the platform does not know
 * where the order stands, so no channel action may be derived from it.
 */
export function channelStateForStatus(status: PurchaseOrderStatus | string): PoChannelState {
  if (!Object.prototype.hasOwnProperty.call(PO_CHANNEL_STATE_BY_STATUS, status)) return 'unknown';
  return PO_CHANNEL_STATE_BY_STATUS[status as PurchaseOrderStatus];
}

/** TRUE when the value is one of Mercenta's declared lifecycle statuses. */
export function isPurchaseOrderStatus(value: unknown): value is PurchaseOrderStatus {
  return (
    typeof value === 'string' && Object.prototype.hasOwnProperty.call(PO_CHANNEL_STATE_BY_STATUS, value)
  );
}

/** The channel's own order values for a Mercenta status, or `null` (fail closed). */
export function poChannelOrderVocabularyForStatus(
  status: PurchaseOrderStatus | string
): PoChannelOrderVocabulary | null {
  if (!isPurchaseOrderStatus(status)) return null;
  return PO_CHANNEL_ORDER_VOCABULARY_BY_STATUS[status];
}


/* ══════════════════════════════════════════════════════════════════════════
 * 2. REVERSE — a channel read → the Mercenta statuses it could be
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * The Mercenta statuses each normalised channel state covers. BUILT from the SAME
 * table as the forward direction, so the two can never disagree.
 *
 * A SET on purpose: the channel's `OPEN` really does span Mercenta's
 * un-acknowledged and acknowledged positions, and naming a single Mercenta status
 * from it would be an invention. The caller is told the candidates.
 */
export const MERCENTA_STATUSES_BY_CHANNEL_STATE: Record<
  Exclude<PoChannelState, 'unknown'>,
  readonly PurchaseOrderStatus[]
> = (() => {
  const out: Record<Exclude<PoChannelState, 'unknown'>, PurchaseOrderStatus[]> = {
    new: [],
    acknowledged: [],
    closed: [],
  };
  for (const status of Object.keys(PO_CHANNEL_STATE_BY_STATUS) as PurchaseOrderStatus[]) {
    const state = PO_CHANNEL_STATE_BY_STATUS[status];
    if (state !== 'unknown') out[state].push(status);
  }
  return out;
})();

/** The channel's own `purchaseOrderState` values a `purchaseOrderStatus` can accompany. */
export const CHANNEL_STATES_BY_CHANNEL_ORDER_STATUS: Record<
  ChannelPoOrderStatus,
  readonly Exclude<PoChannelState, 'unknown'>[]
> = {
  /** `OPEN` covers both the un-acknowledged and the acknowledged position (S4). */
  OPEN: ['new', 'acknowledged'],
  CLOSED: ['closed'],
};

/** TRUE when the value is one of the channel's documented `purchaseOrderState` values. */
export function isChannelOrderState(value: unknown): value is ChannelPoOrderState {
  return typeof value === 'string' && (CHANNEL_PO_ORDER_STATES as readonly string[]).includes(value);
}

/** TRUE when the value is one of the channel's documented `purchaseOrderStatus` values. */
export function isChannelOrderStatus(value: unknown): value is ChannelPoOrderStatus {
  return typeof value === 'string' && (CHANNEL_PO_ORDER_STATUSES as readonly string[]).includes(value);
}

/** The Mercenta statuses a normalised channel state covers (empty when unknown). */
export function mercentaStatusesForChannelState(state: PoChannelState): readonly PurchaseOrderStatus[] {
  if (state === 'unknown' || !(state in MERCENTA_STATUSES_BY_CHANNEL_STATE)) return [];
  return MERCENTA_STATUSES_BY_CHANNEL_STATE[state];
}

/** A channel read, using the channel's OWN field names. */
export interface ChannelOrderReadInput {
  /** The channel's `purchaseOrderState`, exactly as the response carries it. */
  purchaseOrderState?: string | null;
  /** The channel's `purchaseOrderStatus`, exactly as the response carries it. */
  purchaseOrderStatus?: string | null;
}

export interface ChannelOrderReadResolution {
  /** The normalised channel state, or `unknown` when the read could not be read. */
  channelState: PoChannelState;
  /** The Mercenta statuses this read could mean — the honest 1:many answer. */
  candidates: readonly PurchaseOrderStatus[];
  /** TRUE when the channel's fields were readable AND consistent with each other. */
  resolved: boolean;
  /** TRUE when more than one Mercenta status remains possible (the channel's `OPEN`). */
  ambiguous: boolean;
  /** Why the read failed closed, when it did. Empty when it resolved. */
  reason: string;
}


/**
 * Resolve a channel order read onto Mercenta's vocabulary.
 *
 * FAIL CLOSED on everything it cannot read: an absent pair, an undocumented value,
 * or two fields that disagree produces `resolved: false` with no candidates and a
 * stated reason. It never picks the first, the most likely or the last-known
 * status — an unrecognised channel read must not become a decision.
 */
export function resolveChannelOrderRead(read: ChannelOrderReadInput): ChannelOrderReadResolution {
  const fail = (reason: string): ChannelOrderReadResolution => ({
    channelState: 'unknown',
    candidates: [],
    resolved: false,
    ambiguous: false,
    reason,
  });

  const state = read.purchaseOrderState ?? null;
  const status = read.purchaseOrderStatus ?? null;

  if (!state && !status) {
    return fail(
      'The channel read carried neither purchaseOrderState nor purchaseOrderStatus, so no Mercenta status can be read from it (fail-closed).'
    );
  }

  let statesFromState: readonly Exclude<PoChannelState, 'unknown'>[] | null = null;
  if (state) {
    if (!isChannelOrderState(state)) {
      return fail(
        `The channel read reported an undocumented purchaseOrderState "${state}" — it is not one of the declared channel values (${CHANNEL_PO_ORDER_STATES.join(
          ', '
        )}), so no Mercenta status is read from it (fail-closed).`
      );
    }
    /**
     * `purchaseOrderState` is SPECIFIC (`New` vs `Acknowledged`), so it maps back
     * to exactly ONE position. Routing it through the `purchaseOrderStatus` column
     * instead would widen it to everything `OPEN` covers — which is precisely the
     * ambiguity this owner exists to remove.
     */
    statesFromState = [channelStateForChannelOrderState(state)];
  }

  let statesFromStatus: readonly Exclude<PoChannelState, 'unknown'>[] | null = null;
  if (status) {
    if (!isChannelOrderStatus(status)) {
      return fail(
        `The channel read reported an undocumented purchaseOrderStatus "${status}" — it is not one of the declared channel values (${CHANNEL_PO_ORDER_STATUSES.join(
          ', '
        )}), so no Mercenta status is read from it (fail-closed).`
      );
    }
    statesFromStatus = CHANNEL_STATES_BY_CHANNEL_ORDER_STATUS[status];
  }

  if (statesFromState && statesFromStatus) {
    const agreed = statesFromState.filter((s) => statesFromStatus.includes(s));
    if (agreed.length === 0) {
      return fail(
        `The channel read contradicts itself: purchaseOrderState "${state}" and purchaseOrderStatus "${status}" do not describe the same order position, so no Mercenta status is read from it (fail-closed).`
      );
    }
    const candidates = agreed.flatMap((s) => MERCENTA_STATUSES_BY_CHANNEL_STATE[s]);
    return {
      channelState: agreed.length === 1 ? agreed[0] : 'unknown',
      candidates,
      resolved: true,
      ambiguous: candidates.length > 1 || agreed.length > 1,
      reason: '',
    };
  }

  const states = (statesFromState ?? statesFromStatus) as readonly Exclude<PoChannelState, 'unknown'>[];
  const candidates = states.flatMap((s) => MERCENTA_STATUSES_BY_CHANNEL_STATE[s]);
  return {
    channelState: states.length === 1 ? states[0] : 'unknown',
    candidates,
    resolved: true,
    ambiguous: candidates.length > 1,
    reason: '',
  };
}


/* ══════════════════════════════════════════════════════════════════════════
 * 3. LINES — Mercenta's acknowledgement vocabulary ↔ the channel's
 * ══════════════════════════════════════════════════════════════════════════ */

export interface ChannelLineVocabularyEntry {
  /** The channel's documented per-line confirmation status, or `null` when none applies. */
  itemConfirmationStatus: ChannelItemConfirmationStatus | null;
  /** TRUE when the Mercenta word has NO channel equivalent and is Mercenta's own sub-state. */
  mercentaSubState: boolean;
  /** Why this row is what it is, in one sentence. */
  note: string;
}

/**
 * The channel's own interpretation of each Mercenta line decision.
 *
 * `unacknowledged` → `null`: the channel has received no confirmation for the line,
 * and an empty confirmation is never transmitted as one.
 *
 * `backordered` → the channel's `ACCEPTED`, marked `mercentaSubState: true`. The
 * channel's confirmation vocabulary has no backorder value (S4/S5), but a
 * backordered line is still a line the vendor ACCEPTS and schedules a later ship
 * date for — the acknowledgement must be submitted *"including backordered items"*
 * (S2). So the wire carries ACCEPTED; Mercenta's own word "backordered" describes
 * its internal position and is never sent as a channel status.
 */
export const CHANNEL_LINE_VOCABULARY_BY_ACK_STATUS: Record<LineAckStatus, ChannelLineVocabularyEntry> = {
  unacknowledged: {
    itemConfirmationStatus: null,
    mercentaSubState: false,
    note: 'No acknowledgement decision has been recorded, so the channel has received no confirmation for this line — nothing is sent, and an empty confirmation is never transmitted as one.',
  },
  accepted: {
    itemConfirmationStatus: 'ACCEPTED',
    mercentaSubState: false,
    note: 'The line is accepted at the acknowledged quantity — the channel’s own `ACCEPTED` (S5).',
  },
  rejected: {
    itemConfirmationStatus: 'REJECTED',
    mercentaSubState: false,
    note: 'The line is rejected with a real reason code — the channel’s own `REJECTED` (S5).',
  },
  backordered: {
    itemConfirmationStatus: 'ACCEPTED',
    mercentaSubState: true,
    note: 'The channel’s confirmation vocabulary has NO backorder value (S4/S5), but the acknowledgement must cover backordered items too (S2), so the line is confirmed as the channel’s `ACCEPTED` and Mercenta’s own word "backordered" is never put on the wire.',
  },
};

/**
 * The channel's AGGREGATE decision for a submission.
 *
 * `PARTIALLY_ACCEPTED` is an aggregate value in the channel's vocabulary: it says a
 * submission mixed acceptances and rejections. It is NOT a per-line status, which is
 * why the reverse line map below refuses to read one per-line status from it.
 */
export const CHANNEL_AGGREGATE_STATUS_BY_DECISION: Record<
  'accepted' | 'partially_accepted' | 'rejected',
  ChannelItemConfirmationStatus
> = {
  accepted: 'ACCEPTED',
  partially_accepted: 'PARTIALLY_ACCEPTED',
  rejected: 'REJECTED',
};

/** The channel's per-line confirmation status for a Mercenta line decision. */
export function channelItemConfirmationStatusFor(
  ackStatus: LineAckStatus | string
): ChannelItemConfirmationStatus | null {
  if (!Object.prototype.hasOwnProperty.call(CHANNEL_LINE_VOCABULARY_BY_ACK_STATUS, ackStatus)) return null;
  return CHANNEL_LINE_VOCABULARY_BY_ACK_STATUS[ackStatus as LineAckStatus].itemConfirmationStatus;
}

/**
 * The Mercenta line decisions a channel per-line confirmation could mean.
 *
 * `ACCEPTED` → two candidates on purpose: the channel cannot distinguish an accepted
 * line from a backordered one, because a backorder is Mercenta's own internal
 * sub-state (that is exactly why the forward row is marked `mercentaSubState`).
 *
 * `PARTIALLY_ACCEPTED` → EMPTY. It is the channel's aggregate result, not a per-line
 * value; reading a per-line Mercenta status from it would be an invention.
 */
export function mercentaAckStatusesForChannelConfirmation(
  status: ChannelItemConfirmationStatus
): readonly LineAckStatus[] {
  if (status === 'REJECTED') return ['rejected'];
  if (status === 'ACCEPTED') return ['accepted', 'backordered'];
  return [];
}

/** TRUE when the value is one of the channel's documented per-line confirmation values. */
export function isChannelItemConfirmationStatus(
  value: unknown
): value is ChannelItemConfirmationStatus {
  return (
    typeof value === 'string' && (CHANNEL_ITEM_CONFIRMATION_STATUSES as readonly string[]).includes(value)
  );
}


/* ══════════════════════════════════════════════════════════════════════════
 * 4. THE SEAM'S NORMALISED READ → the same normalised channel state
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * The SP-API seam reports the channel's PO state in its OWN normalised words
 * (`src/lib/spapi/client.ts → ChannelPurchaseOrderStatus['status']`). That shape is
 * fixed and the translation from the raw channel values into it is the seam's, so
 * the correspondence between the two is declared HERE, once, rather than left for
 * each caller to assume.
 *
 * The compile-time assertion below proves this union IS the seam's — if the seam's
 * vocabulary ever changes, the typecheck fails and this table must be corrected
 * rather than silently drifting.
 */
export type SeamChannelPoStatus = 'open' | 'acknowledged' | 'received' | 'closed' | 'cancelled';

type SeamStatusIsCanonical = SeamChannelPoStatus extends ChannelPurchaseOrderStatus['status']
  ? ChannelPurchaseOrderStatus['status'] extends SeamChannelPoStatus
    ? true
    : never
  : never;

/** Compile-time proof that the seam's status vocabulary is exactly the one declared here. */
export const SEAM_CHANNEL_STATUS_IS_CANONICAL: SeamStatusIsCanonical = true;

/**
 * The correspondence, with the channel's raw values each seam state stands for.
 * `received` and `cancelled` both land on the channel's completed position: an order
 * whose fulfilment centre has logged the goods, and an order the channel cancelled,
 * are both past fulfilment.
 */
export const SEAM_CHANNEL_STATUS_MAP: Record<
  SeamChannelPoStatus,
  { channelState: PoChannelState; rawOrderStates: readonly ChannelPoOrderState[] }
> = {
  open: { channelState: 'new', rawOrderStates: ['New'] },
  acknowledged: { channelState: 'acknowledged', rawOrderStates: ['Acknowledged'] },
  received: { channelState: 'closed', rawOrderStates: ['Closed'] },
  closed: { channelState: 'closed', rawOrderStates: ['Closed'] },
  cancelled: { channelState: 'closed', rawOrderStates: ['Closed'] },
};

/** The normalised channel state for the seam's own status word (fail closed). */
export function channelStateForSeamStatus(status: string): PoChannelState {
  if (!Object.prototype.hasOwnProperty.call(SEAM_CHANNEL_STATUS_MAP, status)) return 'unknown';
  return SEAM_CHANNEL_STATUS_MAP[status as SeamChannelPoStatus].channelState;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 5. THE OPERATOR-FACING STATEMENT (ONE wording, rendered from here)
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * The ONE statement of how the two vocabularies relate, so no surface or
 * integration log invents its own explanation. Attributed to the channel's own
 * documentation (S4/S5) because that is where the channel's words come from —
 * `verifiedAgainstChannel: true` is honest here in a way it is not for Mercenta's
 * own service standards.
 */
export const PO_CHANNEL_VOCABULARY_ATTRIBUTION = {
  /**
   * The exact sources are recorded in the project's own research
   * (`docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md` → S4/S5). The string
   * rendered to a user stays channel-neutral, like every other outward-facing
   * value in this platform (`npm run validate:wording`).
   */
  source: 'S4/S5 — the retail channel’s own vendor retail-procurement developer documentation',
  verifiedAgainstChannel: true,
  attributionNote:
    'The retail channel’s purchase-order and line statuses are its own vocabulary, documented in its vendor ' +
    'procurement API. Mercenta translates between that vocabulary and its own internal statuses in ONE place, ' +
    'in both directions, and never sends one side’s word as the other’s.',
} as const;


/* ══════════════════════════════════════════════════════════════════════════
 * 6. MODULE-LOAD GUARDS — the tables cannot disagree with themselves
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * The reverse tables are BUILT from the forward one, so they cannot drift. What
 * CAN drift is a hand-written table here or a status added to the lifecycle: these
 * checks fail at import time (and are asserted by
 * `scripts/validate-po-channel-vocabulary.mjs`) rather than letting one order end
 * up with no channel position anywhere in the platform.
 */
for (const status of Object.keys(PO_CHANNEL_STATE_BY_STATUS) as PurchaseOrderStatus[]) {
  const state = PO_CHANNEL_STATE_BY_STATUS[status];
  if (state === 'unknown') {
    throw new Error(
      `[poChannelVocabulary] Mercenta status "${status}" maps to the channel state "unknown". Every lifecycle ` +
        `status must name a real channel position, so no integration has to guess.`
    );
  }
  if (
    !CHANNEL_ORDER_STATE_BY_CHANNEL_STATE[state as Exclude<PoChannelState, 'unknown'>] ||
    !CHANNEL_ORDER_STATUS_BY_CHANNEL_STATE[state as Exclude<PoChannelState, 'unknown'>]
  ) {
    throw new Error(
      `[poChannelVocabulary] the channel state "${state}" has no declared purchaseOrderState / ` +
        `purchaseOrderStatus counterpart. Both directions must be declared, or the mapping is one-way.`
    );
  }
}

for (const status of CHANNEL_PO_ORDER_STATUSES) {
  if (!CHANNEL_STATES_BY_CHANNEL_ORDER_STATUS[status]?.length) {
    throw new Error(
      `[poChannelVocabulary] the channel's purchaseOrderStatus "${status}" resolves to no channel state, so a ` +
        `read carrying it could never be interpreted (fail-closed would swallow a real value).`
    );
  }
}

for (const ackStatus of Object.keys(CHANNEL_LINE_VOCABULARY_BY_ACK_STATUS) as LineAckStatus[]) {
  const line = CHANNEL_LINE_VOCABULARY_BY_ACK_STATUS[ackStatus];
  if (line.mercentaSubState && line.itemConfirmationStatus === null) {
    throw new Error(
      `[poChannelVocabulary] line decision "${ackStatus}" is marked as Mercenta's own sub-state but declares no ` +
        `channel confirmation — a sub-state must still be sent to the channel as something.`
    );
  }
  if (line.itemConfirmationStatus !== null && !isChannelItemConfirmationStatus(line.itemConfirmationStatus)) {
    throw new Error(
      `[poChannelVocabulary] line decision "${ackStatus}" maps to "${line.itemConfirmationStatus}", which is not ` +
        `one of the channel's documented confirmation values — an invented channel word is never sent.`
    );
  }
}

