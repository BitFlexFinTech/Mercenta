/**
 * §P12 — THE CHANNEL OPERATIONS CONSOLE (admin).
 *
 * Programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P12;
 * register **`AV-040`**. §P12 extended the ONE SP-API seam with the rest of the
 * channel's documented vendor operations. This surface is where the OPERATOR
 * exercises them, because every one of them is MERCENTA's action — a brand never
 * communicates with the channel:
 *
 *   1. the RECEIVING SYNC (`getPurchaseOrdersStatus`) — the channel's own PO and
 *      receiving state, reported against each canonical purchase order;
 *   2. the ROUTING INSTRUCTIONS (`getShipmentDetails`) — the ARN, which the
 *      channel returns only after carrier assignment, so this is a LATER read
 *      than the one the acknowledgement chain performs;
 *   3. INVOICE SUBMISSION (`submitInvoices`) — an issued invoice handed to the
 *      channel's accounts-payable system as the registry issued it (`AV-022`);
 *   4. the SHIPMENT-LABEL RULE (`getShipmentLabels`) — stated, because the
 *      channel generates labels in NA only and Mercenta must never claim one for
 *      a UK/EU consignment.
 *
 * HONESTY RULES ON THIS SURFACE
 * ----------------------------
 *   · every result states the seam's mode: "Simulated channel read — no live
 *     channel call was made" whenever the mock answered;
 *   · a refusal (from the platform or from the channel) is SHOWN with its code —
 *     never swallowed, and never presented as a success;
 *   · the receiving sync DOES NOT WRITE: a simulated reading is refused by the
 *     canonical write path, and this surface says so rather than implying a
 *     receipt happened.
 */
import { useMemo, useState } from 'react';
import { useRecordDeepLink, useFocusRecordElement } from '@/lib/runtime/recordDeepLink';
import { useApp } from '@/context/GlobalStateContext';
import { useCanonicalStoreVersion } from '@/data/queries';
import { demoCommerceInvoices, demoPurchaseOrders } from '@/data/demoStore';
import { Badge, Button, Card } from '@/components/ui';
import { listChannelInstructions } from '@/lib/commerce/channelInstructions';
import { verifyAcknowledgement } from '@/lib/commerce/poAcknowledgementVerification';
import {
  asnBeforeReceiptVerdict,
  channelReceivingReportsReceived,
} from '@/lib/shipping/asnBeforeReceipt';
import { pickupLeadTimeVerdict } from '@/lib/shipping/collectChain';
import { refreshChannelRoutingInstructions } from '@/lib/commerce/proxyProcessor';
import { applyChannelReceivingReadingToStore } from '@/lib/commerce/commerceLifecycle';
import { readChannelReceivingSync, submitCommerceInvoiceToChannel } from '@/data/api';
import { CHANNEL_SHIPMENT_LABEL_RULE, channelShipmentLabelsAvailability } from '@/config/shipping';
import { RECEIVING_STATUS_LABELS } from '@/lib/commerce/receivingStatus';
import { UK_MARKETPLACE_ID } from '@/lib/spapi/transform';
import type { ChannelReceivingSyncResult } from '@/lib/commerce/channelReceivingSync';
import type { ChannelInvoiceSubmissionRecord } from '@/lib/commerce/channelInvoiceSubmission';

export function ChannelOperationsPanel() {
  const { actingStaffId, canCurrentUserMutate } = useApp();
  const version = useCanonicalStoreVersion();
  void version; // canonical store change signal → re-read the derived rows

  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiving, setReceiving] = useState<ChannelReceivingSyncResult | null>(null);
  const [routingResult, setRoutingResult] = useState<Record<string, string>>({});
  const [invoiceResults, setInvoiceResults] = useState<
    Record<string, ChannelInvoiceSubmissionRecord>
  >({});
  /** §P12 — the outcome of applying a reading to the canonical store, per PO. */
  const [applyResults, setApplyResults] = useState<Record<string, string>>({});

  /**
   * The channel's own instructions that carry a RAISED shipment request — the only
   * ones for which routing instructions can exist. Derived from the canonical
   * instruction store, never cached in state.
   */
  const routingRows = useMemo(
    () => listChannelInstructions().filter((i) => i.state === 'actioned' && i.outcome?.routingRequest?.raised),
    // The canonical store version is the change signal; the derivation is the store's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  );

  /**
   * §BATCH 2k (`AV-011`) — THE ACKNOWLEDGEMENT CONFIRMATION STEP. For every purchase
   * order the channel read reported, verify whether the acknowledgement Mercenta
   * TRANSMITTED actually appeared, using the SAME read's channel state and the
   * transmission instant recorded when Mercenta filed it. No second channel call is
   * made here: the receiving read above is reused, exactly as the owner intends.
   */
  const ackVerification = useMemo(() => {
    const submittedAtByPo = new Map<string, string>();
    for (const instruction of listChannelInstructions({ type: 'po_acknowledgement' })) {
      const at = instruction.outcome?.channelAcknowledgement?.submittedAt;
      if (at && !submittedAtByPo.has(instruction.purchaseOrderId)) {
        submittedAtByPo.set(instruction.purchaseOrderId, at);
      }
    }
    const byPo: Record<string, ReturnType<typeof verifyAcknowledgement>> = {};
    for (const reading of receiving?.readings ?? []) {
      byPo[reading.poId] = verifyAcknowledgement({
        submittedAt: submittedAtByPo.get(reading.poId) ?? null,
        channelState: reading.channelStatus,
        simulated: reading.simulated,
      });
    }
    return byPo;
    // The canonical store version is the change signal for the instruction store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, receiving]);

  /**
   * §BATCH 2l (`AV-015`) — THE ASN-BEFORE-RECEIPT ORDERING. For every purchase order the
   * channel read reported, compare the ASN filing instant against the channel's OWN
   * logged receipt, so the documented chargeback trigger is SURFACED rather than silent.
   * Like the verification above, this REUSES the one receiving read — no second call.
   */
  const asnVerdict = useMemo(() => {
    const filedAtByPo = new Map<string, string>();
    for (const instruction of listChannelInstructions()) {
      const at = instruction.outcome?.asn?.filedAt;
      if (at && !filedAtByPo.has(instruction.purchaseOrderId)) {
        filedAtByPo.set(instruction.purchaseOrderId, at);
      }
    }
    const byPo: Record<string, ReturnType<typeof asnBeforeReceiptVerdict>> = {};
    for (const reading of receiving?.readings ?? []) {
      byPo[reading.poId] = asnBeforeReceiptVerdict({
        asnFiledAt: filedAtByPo.get(reading.poId) ?? null,
        channelReportsReceived: channelReceivingReportsReceived(reading.channelReceivingStatus),
        receivedAt: reading.receivedDate ?? null,
      });
    }
    return byPo;
    // The canonical store version is the change signal for the instruction store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, receiving]);

  /**
   * §BATCH 2m (`AV-014`) — THE CHANNEL PICKUP LEAD TIME, SURFACED. For every Freight
   * Collect purchase order the channel read reported, show whether the pickup Mercenta
   * asked for satisfies the channel's documented lead time (at least two business days'
   * notice). The verdict is computed by the ONE owner (`collectChain.ts`) from the date
   * recorded on the routing request, judged from the instant the request was raised —
   * no second channel call, no re-derived date.
   */
  const pickupVerdict = useMemo(() => {
    const requestedByPoNumber = new Map<string, { requestedPickUp: string; actionedAt?: string }>();
    for (const instruction of listChannelInstructions()) {
      const rr = instruction.outcome?.routingRequest;
      if (rr?.requestedPickUp && !requestedByPoNumber.has(instruction.poNumber)) {
        requestedByPoNumber.set(instruction.poNumber, {
          requestedPickUp: rr.requestedPickUp,
          ...(instruction.outcome?.actionedAt ? { actionedAt: instruction.outcome.actionedAt } : {}),
        });
      }
    }
    const poById = new Map(demoPurchaseOrders.map((p) => [p.id, p]));
    const out: Record<string, ReturnType<typeof pickupLeadTimeVerdict>> = {};
    for (const reading of receiving?.readings ?? []) {
      const po = poById.get(reading.poId);
      if (!po || po.freightTerm !== 'collect') continue;
      const recorded = requestedByPoNumber.get(po.poNumber);
      out[reading.poId] = pickupLeadTimeVerdict(
        recorded?.requestedPickUp ?? null,
        recorded?.actionedAt ? new Date(recorded.actionedAt) : new Date()
      );
    }
    return out;
    // The canonical store version is the change signal for the instruction store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, receiving]);

  /** Every invoice still IN FORCE — the only ones the channel may be sent. */
  const invoiceRows = useMemo(
    () => demoCommerceInvoices.filter((i) => i.status === 'issued').slice().reverse().slice(0, 8),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  );

  /**
   * §BATCH 7 (Part 4.1a) — DEEP LINK. `/admin/retail_pipeline?invoice=<id>` marks
   * and scrolls to THAT invoice's row, so a "simulated invoice awaiting payment"
   * notice lands on the invoice it names rather than on the section. The selector
   * is only built when the id is one of the rows this panel actually renders, so a
   * notice can never focus an element that is not its record.
   */
  const deepLinkInvoice = useRecordDeepLink('invoice');
  useFocusRecordElement(
    deepLinkInvoice && invoiceRows.some((i) => i.id === deepLinkInvoice)
      ? `[data-record-id="${deepLinkInvoice}"]`
      : null
  );

  const labels = channelShipmentLabelsAvailability(UK_MARKETPLACE_ID);

  const actor = useMemo(
    () => ({ staffId: actingStaffId, canMutate: canCurrentUserMutate }),
    [actingStaffId, canCurrentUserMutate]
  );

  /** §P12 — apply ONE live channel reading as the canonical receipt. */
  function applyReading(reading: ChannelReceivingSyncResult['readings'][number]) {
    const result = applyChannelReceivingReadingToStore(reading, actor);
    const message = result.ok
      ? `Applied — canonical receiving status ${result.receivingStatus ?? 'recorded'}.`
      : (result.refusal ?? 'The canonical write was refused.');
    setApplyResults((prev) => ({ ...prev, [reading.poId]: message }));
    if (result.ok) setNotice(`Channel reading applied to ${reading.channelPurchaseOrderId}.`);
    else setError(`Channel reading for ${reading.channelPurchaseOrderId}: ${message}`);
  }

  async function readReceiving() {
    setBusyId('receiving');
    setError(null);
    setNotice(null);
    try {
      const result = await readChannelReceivingSync();
      setReceiving(result);
      if (!result.ok) {
        setError(`Channel receiving read: ${result.error ?? 'the channel refused the read.'}`);
        return;
      }
      setNotice(
        `Channel receiving read: ${result.readings.length} purchase order(s) reported, ` +
          `${result.unknownPurchaseOrderIds.length} unknown to the channel, ${result.refused.length} refused.`
      );
    } finally {
      setBusyId(null);
    }
  }

  async function refreshRouting(instructionId: string, poNumber: string) {
    setBusyId(instructionId);
    setError(null);
    setNotice(null);
    try {
      const updated = await refreshChannelRoutingInstructions(instructionId, actingStaffId);
      const instructions = updated?.outcome?.routingInstructions;
      setRoutingResult((prev) => ({
        ...prev,
        [instructionId]: instructions?.arn
          ? `ARN ${instructions.arn} — assigned by the channel${
              instructions.mode === 'mock' ? ' (simulated channel read)' : ''
            }`
          : 'Carrier assignment still pending — the channel has not returned routing instructions yet.',
      }));
      setNotice(
        `Channel routing read for ${poNumber}: ${
          instructions?.arn ? `ARN ${instructions.arn}` : 'still pending carrier assignment'
        }.`
      );
    } finally {
      setBusyId(null);
    }
  }

  async function sendInvoice(invoiceId: string, invoiceNumber: string) {
    setBusyId(invoiceId);
    setError(null);
    setNotice(null);
    try {
      const record = await submitCommerceInvoiceToChannel({ invoiceId });
      setInvoiceResults((prev) => ({ ...prev, [invoiceId]: record }));
      if (record.refusal) {
        setError(`Invoice ${invoiceNumber}: ${record.refusal}`);
        return;
      }
      setNotice(
        `Invoice ${invoiceNumber} submitted to the channel: ${record.submissionId ?? 'no reference'} — ${
          record.simulated
            ? 'simulated submission, no live channel call was made'
            : 'live channel submission'
        }.`
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="p-4 space-y-4" data-testid="channel-operations">
      <div>
        <h3 className="text-sm font-semibold text-white">
          Channel operations{' '}
          <Badge className="ml-1 text-ds-micro bg-brass-500/15 text-brass-400 border-brass-500/20">
            Mercenta-side
          </Badge>
        </h3>
        <p className="text-ds-label text-zinc-500 mt-0.5">
          The retail channel's documented vendor operations beyond the purchase-order read. A brand
          never calls these — Mercenta performs every channel action as the account holder.
        </p>
      </div>

      {(notice || error) && (
        <p
          data-state={error ? 'channel-ops-error' : 'channel-ops-notice'}
          className={error ? 'text-ds-label text-red-300' : 'text-ds-label text-emerald-300'}
        >
          {error ?? notice}
        </p>
      )}

      {/* ── 1. THE RECEIVING SYNC (`getPurchaseOrdersStatus`) ─────────────── */}
      <section className="space-y-2" data-testid="channel-receiving-sync">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-ds-micro uppercase tracking-wide text-zinc-500">
            1 · Receiving sync — the channel's own status
          </p>
          <Button
            className="text-ds-label"
            data-state="channel-receiving-read"
            disabled={busyId === 'receiving'}
            onClick={readReceiving}
          >
            Read channel receiving status
          </Button>
        </div>
        <p className="text-ds-label text-zinc-500">
          Source S5 / register AV-018: the channel's fulfilment-centre receiving status and received
          quantity. The reading is REPORTED, never written — a simulated reading can never become a
          canonical receipt.
        </p>
        {receiving && (
          <div className="space-y-1">
            <p data-state="channel-receiving-mode" className="text-ds-label text-zinc-300">
              {receiving.mode === 'mock'
                ? 'Simulation (mock) — simulated channel read; no live channel call was made'
                : receiving.mode === 'real'
                  ? 'Live channel read'
                  : 'Read complete — the channel returned no readable purchase-order status; no live channel call was made'}
            </p>
            <ul className="space-y-1" data-testid="channel-receiving-readings">
              {receiving.readings.map((reading) => (
                <li
                  key={reading.channelPurchaseOrderId}
                  data-reading={reading.differs ? 'differs' : 'agrees'}
                  className="rounded-md border border-white/[0.06] bg-ink-850/60 px-2 py-1 text-ds-label text-zinc-300"
                >
                  <span className="font-mono">{reading.channelPurchaseOrderId}</span> · channel:{' '}
                  {RECEIVING_STATUS_LABELS[reading.channelReceivingStatus]} · Mercenta:{' '}
                  {RECEIVING_STATUS_LABELS[reading.mercentaReceivingStatus]} ·{' '}
                  {reading.lines.reduce((sum, l) => sum + l.receivedQty, 0)} unit(s) received
                  {reading.differs ? ' · the two views differ' : ''}
                  {/*
                    §BATCH 2k (`AV-011`) — the CONFIRMATION step that was missing: an
                    acknowledgement could silently fail because nothing checked it
                    appeared. The verdict below comes from the channel's OWN read state
                    (already obtained above) and the recorded transmission instant; a
                    simulated read is labelled, and an unread state is never "confirmed".
                  */}
                  {ackVerification[reading.poId] && (
                    <span
                      data-state={`ack-verification-${ackVerification[reading.poId].state}`}
                      className={
                        ackVerification[reading.poId].atRisk
                          ? 'mt-0.5 block text-ds-micro text-amber-300'
                          : 'mt-0.5 block text-ds-micro text-zinc-400'
                      }
                    >
                      Acknowledgement: {ackVerification[reading.poId].stateLabel} —{' '}
                      {ackVerification[reading.poId].statement}
                    </span>
                  )}
                  {/*
                    §BATCH 2l (`AV-015`) — the ASN-before-receipt ordering, surfaced. The
                    channel documents that the confirmation must reach it BEFORE the goods
                    are received ("missing or delayed shipment confirmations result in
                    chargebacks"); the verdict compares the filing instant against the
                    channel's own logged receipt.
                  */}
                  {asnVerdict[reading.poId] && (
                    <span
                      data-state={`asn-before-receipt-${asnVerdict[reading.poId].state}`}
                      className={
                        asnVerdict[reading.poId].exposed
                          ? 'mt-0.5 block text-ds-micro text-amber-300'
                          : 'mt-0.5 block text-ds-micro text-zinc-400'
                      }
                    >
                      ASN before receipt: {asnVerdict[reading.poId].stateLabel} —{' '}
                      {asnVerdict[reading.poId].statement}
                    </span>
                  )}
                  {/*
                    §BATCH 2m (`AV-014`) — the CHANNEL PICKUP LEAD TIME, surfaced. The
                    channel documents that a collect vendor's requestedPickUp must be "a
                    date at least two business days after the current date"; from P6 the
                    date was DERIVED from the owner but never ENFORCED or SHOWN. The
                    verdict below comes from the ONE owner (`collectChain.ts`) using the
                    date recorded on the routing request.
                  */}
                  {pickupVerdict[reading.poId] && (
                    <span
                      data-state={`pickup-lead-time-${pickupVerdict[reading.poId].state}`}
                      className={
                        pickupVerdict[reading.poId].state === 'within_lead_time'
                          ? 'mt-0.5 block text-ds-micro text-zinc-400'
                          : 'mt-0.5 block text-ds-micro text-amber-300'
                      }
                    >
                      Channel pickup lead time: {pickupVerdict[reading.poId].statement}
                    </span>
                  )}
                  {/*
                    §P12 — the canonical WRITE path is here, not hidden: a LIVE reading is
                    applied through the canonical receiving step, and a SIMULATED one is never
                    offered as an action — its refusal is STATED instead, so there is no control
                    that could only ever fail.
                  */}
                  {reading.simulated ? (
                    <span
                      data-state="channel-apply-refused"
                      className="mt-0.5 block text-ds-micro text-amber-300"
                    >
                      Not applied — this reading is SIMULATED, and a simulated channel reading is
                      never written as a canonical receipt. Configure live channel credentials to
                      apply it.
                    </span>
                  ) : (
                    <span className="mt-0.5 flex flex-wrap items-center gap-2">
                      <Button
                        variant="ghost"
                        className="text-ds-micro"
                        data-testid={`channel-apply-${reading.channelPurchaseOrderId}`}
                        disabled={!canCurrentUserMutate}
                        onClick={() => applyReading(reading)}
                      >
                        Apply as canonical receipt
                      </Button>
                      {applyResults[reading.poId] && (
                        <span data-state="channel-apply-result" className="text-ds-micro text-zinc-400">
                          {applyResults[reading.poId]}
                        </span>
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {receiving.unknownPurchaseOrderIds.length > 0 && (
              <p data-state="channel-receiving-unknown" className="text-ds-label text-zinc-500">
                The channel does not know {receiving.unknownPurchaseOrderIds.length} of the purchase
                orders asked about ({receiving.unknownPurchaseOrderIds.slice(0, 4).join(', ')}
                {receiving.unknownPurchaseOrderIds.length > 4 ? ', …' : ''}) — reported, never read as
                "not received".
              </p>
            )}
            {receiving.refused.length > 0 && (
              <ul className="space-y-1" data-testid="channel-receiving-refusals">
                {receiving.refused.map((refusal) => (
                  <li key={refusal.channelPurchaseOrderId} className="text-ds-label text-amber-300">
                    {refusal.channelPurchaseOrderId}: {refusal.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* ── 2. THE ROUTING INSTRUCTIONS (`getShipmentDetails`) ────────────── */}
      <section className="space-y-2" data-testid="channel-routing-instructions">
        <p className="text-ds-micro uppercase tracking-wide text-zinc-500">
          2 · Routing instructions — the channel's ARN
        </p>
        <p className="text-ds-label text-zinc-500">
          A shipment request is submitted when a purchase order is accepted. The channel returns
          routing instructions — including the ARN — only AFTER carrier assignment, so this read is
          the later step that advances the collect chain. No ARN is ever invented.
        </p>
        {routingRows.length === 0 ? (
          <p className="text-ds-label text-zinc-600">
            No accepted purchase order carries a channel shipment request yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {routingRows.map((instruction) => (
              <li
                key={instruction.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-ink-850/60 px-2 py-1"
              >
                <span className="text-ds-label text-zinc-300">
                  <span className="font-mono">{instruction.poNumber}</span> ·{' '}
                  {instruction.outcome?.routingRequest?.channelShipmentRequestId ?? 'no channel reference'}{' '}
                  ·{' '}
                  {instruction.outcome?.routingInstructions?.arn
                    ? `ARN ${instruction.outcome.routingInstructions.arn}`
                    : 'no ARN yet'}
                </span>
                <Button
                  variant="ghost"
                  className="text-ds-label"
                  data-testid={`channel-routing-refresh-${instruction.poNumber}`}
                  disabled={busyId === instruction.id || !canCurrentUserMutate}
                  onClick={() => refreshRouting(instruction.id, instruction.poNumber)}
                >
                  Read channel routing instructions
                </Button>
                {routingResult[instruction.id] && (
                  <span data-state="channel-routing-result" className="text-ds-label text-zinc-400">
                    {routingResult[instruction.id]}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        {!canCurrentUserMutate && routingRows.length > 0 && (
          <p className="text-ds-micro text-zinc-600">
            view-only staff — recording the channel's response changes canonical state, so the domain
            refuses it
          </p>
        )}
      </section>

      {/* ── 3. INVOICE SUBMISSION (`submitInvoices`) ──────────────────────── */}
      <section className="space-y-2" data-testid="channel-invoice-submission">
        <p className="text-ds-micro uppercase tracking-wide text-zinc-500">
          3 · Invoice submission — hand an issued invoice to the channel
        </p>
        <p className="text-ds-label text-zinc-500">
          The invoice goes AS THE REGISTRY ISSUED IT: its number, date and total are the canonical
          record's. A cancelled invoice is never sent, and a reused number is refused by the channel
          (AV-022).
        </p>
        {invoiceRows.length === 0 ? (
          <p className="text-ds-label text-zinc-600">No issued invoice is waiting to be sent.</p>
        ) : (
          <ul className="space-y-1">
            {invoiceRows.map((invoice) => {
              const result = invoiceResults[invoice.id];
              return (
                <li
                  key={invoice.id}
                  data-record-id={invoice.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/[0.06] bg-ink-850/60 px-2 py-1"
                >
                  <span className="text-ds-label text-zinc-300">
                    <span className="font-mono">{invoice.number}</span> · £
                    {invoice.subtotalGbp.toFixed(2)} · {invoice.poNumber}
                  </span>
                  <Button
                    variant="ghost"
                    className="text-ds-label"
                    data-testid={`channel-invoice-submit-${invoice.number}`}
                    disabled={busyId === invoice.id}
                    onClick={() => sendInvoice(invoice.id, invoice.number)}
                  >
                    Send to channel
                  </Button>
                  {result && (
                    <span
                      data-state={result.refusal ? 'channel-invoice-refused' : 'channel-invoice-submitted'}
                      className={
                        result.refusal ? 'text-ds-label text-amber-300' : 'text-ds-label text-zinc-400'
                      }
                    >
                      {result.refusal ??
                        `${result.submissionId ?? 'submitted'}${
                          result.simulated ? ' (simulated — no live channel call)' : ''
                        }`}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── 4. THE SHIPMENT-LABEL RULE (`getShipmentLabels`) ─────────────── */}
      <section className="space-y-1" data-testid="channel-shipment-labels">
        <p className="text-ds-micro uppercase tracking-wide text-zinc-500">
          4 · Channel shipment labels — not available in this region
        </p>
        <p data-state="channel-labels-rule" className="text-ds-label text-zinc-400">
          {labels.available ? labels.reason : `Refused by rule: ${labels.reason}`}
        </p>
        <p className="text-ds-micro text-zinc-600">
          {CHANNEL_SHIPMENT_LABEL_RULE.label} — {CHANNEL_SHIPMENT_LABEL_RULE.source}
        </p>
      </section>
    </Card>
  );
}