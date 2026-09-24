/**
 * §P7 — THE ONE OWNER of a purchase order's RECEIVING STATUS and of the
 * "invoice only after receipt" gate.
 *
 * The retail channel's own concept (source `S5`, register `AV-018`:
 * `receivingStatus` = *"the Amazon fulfillment center received status and
 * received quantity"*). Mercenta models it per PO as:
 *
 *   `not_received` · `partially_received` · `received`
 *
 * DERIVED, never stored: the status is computed from the per-line `receivedQty`
 * the ONE receiving path logs (`commerceLifecycle.receiveCommercePurchaseOrder`
 * → `demoStore.reconcileDelivery`). A stored copy would be a second source of
 * truth that could drift from the quantities it claims to describe — the §P6
 * rule applies here too.
 *
 * The INVOICE GATE lives here so "an invoice is raised only AFTER receipt" is
 * ONE rule, enforced at the domain boundary rather than in a button's `disabled`
 * attribute. It FAILS CLOSED: an absent or unrecognised quantity state is
 * `not_received`, and `not_received` can never be invoiced.
 *
 * HONEST LIMIT: in this environment the status is established by Mercenta's OWN
 * receiving step (the channel's receiving system is simulated). Reading the
 * channel's status directly — `getPurchaseOrdersStatus` — is **P12's** seam work
 * (`AV-040`); this module never claims a live channel reading.
 */
import type { PurchaseOrder, ReceivingStatus } from '@/types';

/**
 * The per-line quantity that counts as "confirmed" — exactly the rule
 * `demoStore.reconcileDelivery` compares against, so the status can never
 * disagree with the deduction arithmetic raised beside it.
 */
function confirmedQty(line: PurchaseOrder['lineItems'][number]): number {
  return line.acknowledgedQty ?? (line.ackStatus === 'accepted' ? line.quantity : 0);
}

/** Whether a line was rejected outright (never expected to arrive). */
function lineWasRejected(line: PurchaseOrder['lineItems'][number]): boolean {
  return line.ackStatus === 'rejected';
}

export interface ReceivingSummary {
  status: ReceivingStatus;
  /** Units the PO ordered. */
  orderedUnits: number;
  /** Units Mercenta confirmed (acknowledged) for the lines still in scope. */
  confirmedUnits: number;
  /** Units the receiving step logged as actually arrived. */
  receivedUnits: number;
  /** Confirmed − received, floored at 0 (what the channel did not get). */
  shortfallUnits: number;
  /** Lines in scope that have not yet been received in full. */
  linesAwaiting: number;
}

/**
 * The receiving status of a PO, derived from its own line quantities.
 *
 * - no line has any received quantity ⇒ `not_received`
 * - every in-scope line received in full ⇒ `received`
 * - anything in between ⇒ `partially_received`
 */
export function deriveReceivingStatus(po: Pick<PurchaseOrder, 'lineItems'>): ReceivingStatus {
  const lines = po.lineItems.filter((l) => !lineWasRejected(l));
  if (lines.length === 0) return 'not_received';
  let anyReceived = false;
  let allComplete = true;
  for (const line of lines) {
    const received = Math.max(0, line.receivedQty ?? 0);
    if (received > 0) anyReceived = true;
    if (received < confirmedQty(line)) allComplete = false;
  }
  if (!anyReceived) return 'not_received';
  return allComplete ? 'received' : 'partially_received';
}

/** The full receipt picture, in ONE place, for the surfaces and the validator. */
export function summariseReceiving(po: Pick<PurchaseOrder, 'lineItems'>): ReceivingSummary {
  const lines = po.lineItems.filter((l) => !lineWasRejected(l));
  let orderedUnits = 0;
  let confirmedUnits = 0;
  let receivedUnits = 0;
  let shortfallUnits = 0;
  let linesAwaiting = 0;
  for (const line of lines) {
    const confirmed = confirmedQty(line);
    const received = Math.max(0, line.receivedQty ?? 0);
    orderedUnits += line.quantity;
    confirmedUnits += confirmed;
    receivedUnits += received;
    shortfallUnits += Math.max(0, confirmed - received);
    if (received < confirmed) linesAwaiting += 1;
  }
  return {
    status: deriveReceivingStatus(po),
    orderedUnits,
    confirmedUnits,
    receivedUnits,
    shortfallUnits,
    linesAwaiting,
  };
}

export const RECEIVING_STATUS_LABELS: Record<ReceivingStatus, string> = {
  not_received: 'Not received',
  partially_received: 'Partially received',
  received: 'Received',
};

/** The receiving-status presentation token used by the shared StatusBadge. */
export const RECEIVING_STATUS_TONES: Record<ReceivingStatus, string> = {
  not_received: 'neutral',
  partially_received: 'warning',
  received: 'success',
};

export interface InvoiceReceiptGate {
  allowed: boolean;
  status: ReceivingStatus;
  /** A stated reason when the invoice is refused — never a silent no-op. */
  reason: string;
}

/**
 * §P7 — "an invoice per PO **after receipt**".
 *
 * Fail closed: an unreceived PO cannot be invoiced, and the refusal NAMES the
 * status. A PARTIAL receipt may be invoiced (the invoice bills the units that
 * were received — `commerceLifecycle` uses `receivedQty` on every line), but a
 * complete absence of receipt may not.
 */
export function invoiceReceiptGate(po: Pick<PurchaseOrder, 'lineItems'>): InvoiceReceiptGate {
  const summary = summariseReceiving(po);
  if (summary.status === 'not_received') {
    return {
      allowed: false,
      status: summary.status,
      reason:
        'RECEIPT_REQUIRED — an invoice is raised only AFTER receipt: the channel’s receiving system has logged no received quantity on this purchase order (register AV-018).',
    };
  }
  return {
    allowed: true,
    status: summary.status,
    reason:
      summary.status === 'received'
        ? 'received in full'
        : `partially received — ${summary.shortfallUnits} unit(s) short, invoiced on the received quantity`,
  };
}
