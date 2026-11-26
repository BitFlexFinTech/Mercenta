import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { COMMISSION_AUTO_APPROVE_THRESHOLD_PLACEHOLDER_GBP } from '@/config/commercial';
import { CHANNEL_SHIPMENT_LABEL_RULE, channelShipmentLabelsAvailability } from '@/config/shipping';
import { PO_ACK_STATUSES_WITH_OBLIGATION } from '@/config/purchaseOrders';
import { useApp } from '@/context/GlobalStateContext';
import {
  disputeDeduction,
  readChannelReceivingSync,
  recordDisputeOutcome,
  submitCommerceInvoiceToChannel,
} from '@/data/api';
import {
  demoCommerceInvoices,
  demoPurchaseOrders,
  getAllCommerceInvoicesForPo,
  getCommerceInvoiceForPo,
  latestSubmissionForProduct,
  reconcileDelivery,
} from '@/data/demoStore';
import {
  useBrands,
  useCanonicalStoreVersion,
  useCatalogSubmissions,
  useDeductions,
  usePurchaseOrders,
} from '@/data/queries';
import { listChannelInstructions } from '@/lib/commerce/channelInstructions';
import type { ChannelReceivingSyncResult } from '@/lib/commerce/channelReceivingSync';
import {
  acknowledgeCommercePurchaseOrder,
  applyChannelReceivingReadingToStore,
  cancelCommerceInvoice,
  fulfilCommercePurchaseOrder,
  issueCommerceInvoice,
  listAllCommerceActivity,
  openCommerceCase,
  receiveCommercePurchaseOrder,
  recordCommercePayment,
  type CommerceActor,
  type CommerceResult,
} from '@/lib/commerce/commerceLifecycle';
import { INVOICE_NUMBER_RULES } from '@/lib/commerce/invoiceRegistry';
import { INVOICE_TERM_DAYS, invoiceDueDate, invoiceTermDays } from '@/lib/commerce/invoiceTerms';
import { verifyAcknowledgement } from '@/lib/commerce/poAcknowledgementVerification';
import { refreshChannelRoutingInstructions } from '@/lib/commerce/proxyProcessor';
import { RECEIVING_STATUS_LABELS, deriveReceivingStatus } from '@/lib/commerce/receivingStatus';
import { RECEIPT_INVOICE_AUTOMATION_STATEMENT, receiptInvoiceAutomationSummary } from '@/lib/commerce/receiptInvoiceAutomation';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
import { asnBeforeReceiptVerdict, channelReceivingReportsReceived } from '@/lib/shipping/asnBeforeReceipt';
import { pickupLeadTimeVerdict } from '@/lib/shipping/collectChain';
import { UK_MARKETPLACE_ID } from '@/lib/spapi/transform';
import {
  billingDecisionPresentation,
  deductionStatusPresentation,
  poStatusPresentation,
  submissionStatusPresentation,
} from '@/lib/statusPresentation';
import type { InvoiceTermDays } from '@/types';
import {
  RetailPipelineView,
  type ChannelReceivingReadingRow,
  type PipelineDeductionRow,
  type PipelinePoRow,
  type PipelineSubmissionRow,
  type SimulatedPoControlRow,
} from './RetailPipelineView';

function mapTone(t: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (t === 'success' || t === 'warning' || t === 'danger' || t === 'info') return t;
  return 'neutral';
}

export function RetailPipelineScreen() {
  const qc = useQueryClient();
  const { actingStaffId, canCurrentUserMutate } = useApp();
  const deductionsQuery = useDeductions();
  const posQuery = usePurchaseOrders();
  const submissionsQuery = useCatalogSubmissions();
  const brandsQuery = useBrands();
  const version = useCanonicalStoreVersion();

  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  const [termChoice, setTermChoice] = useState<Record<string, 14 | 30 | 60>>({});
  const [commerceNotice, setCommerceNotice] = useState<string | null>(null);
  const [commerceError, setCommerceError] = useState<string | null>(null);
  const [channelReceivingBusy, setChannelReceivingBusy] = useState(false);
  const [receiving, setReceiving] = useState<ChannelReceivingSyncResult | null>(null);
  const [routingResults, setRoutingResults] = useState<Record<string, string>>({});
  const [invoiceResults, setInvoiceResults] = useState<Record<string, string>>({});

  const deductionsRaw = useMemo(() => deductionsQuery.data?.data ?? [], [deductionsQuery.data]);
  const posRaw = useMemo(() => posQuery.data?.data ?? [], [posQuery.data]);
  const submissionsRaw = useMemo(() => submissionsQuery.data?.data ?? [], [submissionsQuery.data]);
  const brandNames = useMemo(
    () => new Map((brandsQuery.data?.data ?? []).map((b) => [b.id, b.profile.businessName])),
    [brandsQuery.data]
  );

  const deepLinkDeduction = useRecordDeepLink('deduction');
  const deepLinkPo = useRecordDeepLink('po');

  useEffect(() => {
    if (deepLinkDeduction && deductionsRaw.some((d) => d.id === deepLinkDeduction)) {
      setDisputingId(deepLinkDeduction);
    }
  }, [deepLinkDeduction, deductionsRaw]);

  useEffect(() => {
    if (!deepLinkPo) return;
    const match = posRaw.find((p) => p.poNumber === deepLinkPo);
    if (match) setSelectedPoId(match.id);
  }, [deepLinkPo, posRaw]);

  const submissions: PipelineSubmissionRow[] = useMemo(() => {
    void version;
    return submissionsRaw.map((s) => {
      const pres = submissionStatusPresentation(s.status);
      return {
        id: s.id,
        productName: s.productName,
        sku: s.sku,
        asin: s.asin,
        submittedAt: new Date(s.submittedAt).toLocaleDateString('en-GB'),
        statusLabel: pres.label,
        statusTone: mapTone(pres.tone),
        simulated: Boolean(s.simulated),
        superseded: latestSubmissionForProduct(s.brandId, s.sku)?.id !== s.id,
        rejectionReason: s.rejectionReason,
      };
    });
  }, [submissionsRaw, version]);

  const purchaseOrders: PipelinePoRow[] = useMemo(
    () =>
      posRaw.map((po) => {
        const auto = po.poValue < COMMISSION_AUTO_APPROVE_THRESHOLD_PLACEHOLDER_GBP;
        const pPres = poStatusPresentation(po.status);
        const bPres = billingDecisionPresentation(auto, po.commissionAmount);
        return {
          id: po.id,
          poNumber: po.poNumber,
          brandName: brandNames.get(po.brandId) ?? po.brandId,
          statusLabel: pPres.label,
          statusTone: mapTone(pPres.tone),
          poValue: po.poValue,
          commissionAmount: po.commissionAmount,
          billingDecisionLabel: bPres.label,
          billingDecisionTone: mapTone(bPres.tone),
          simulated: po.simulated === true,
          eligibleForReconcile: ['accepted', 'ready_to_fulfil', 'shipped'].includes(po.status),
          lineItems: po.lineItems.map((li) => ({
            sku: li.sku,
            productName: li.productName,
            quantity: li.quantity,
            acknowledgedQty: li.acknowledgedQty ?? (li.ackStatus === 'accepted' ? li.quantity : 0),
            unitCost: li.unitPrice,
          })),
        };
      }),
    [posRaw, brandNames]
  );

  const deductions: PipelineDeductionRow[] = useMemo(
    () =>
      deductionsRaw.map((d) => {
        const pres = deductionStatusPresentation(d.status);
        return {
          id: d.id,
          date: d.date,
          brandName: brandNames.get(d.brandId) ?? d.brandId,
          purchaseOrderId: d.purchaseOrderId,
          typeLabel: d.type.replace(/_/g, ' '),
          reason: d.reason,
          disputeOpenedAt: d.dispute?.openedAt,
          disputeNotes: d.dispute?.notes,
          disputeOutcome: d.dispute?.outcome,
          status: d.status,
          statusLabel: pres.label,
          statusTone: mapTone(pres.tone),
          amountGbp: d.amountGbp,
          simulated: Boolean(d.simulated),
        };
      }),
    [deductionsRaw, brandNames]
  );

  const actor: CommerceActor = useMemo(
    () => ({ staffId: actingStaffId, canMutate: canCurrentUserMutate }),
    [actingStaffId, canCurrentUserMutate]
  );

  const activityCount = useMemo(() => {
    void version;
    const res = listAllCommerceActivity(actor);
    return res.ok ? res.value.length : 0;
  }, [actor, version]);

  const simulatedPos: SimulatedPoControlRow[] = useMemo(() => {
    void version;
    return demoPurchaseOrders
      .filter((p) => p.simulated === true)
      .map((po) => {
        const inv = getCommerceInvoiceForPo(po.id);
        const activeInv = inv && inv.status !== 'cancelled' ? inv : undefined;
        const cancelledInv = getAllCommerceInvoicesForPo(po.id).find((i) => i.status === 'cancelled');
        const rec = deriveReceivingStatus(po);
        return {
          id: po.id,
          poNumber: po.poNumber,
          brandId: po.brandId,
          status: po.status,
          poValue: po.poValue,
          receivingLabel: RECEIVING_STATUS_LABELS[rec],
          receivingTone:
            rec === 'received' ? 'success' : rec === 'partially_received' ? 'warning' : 'neutral',
          invoiceNumber: inv?.number,
          invoiceStatus: inv?.status,
          invoiceTermsLabel:
            inv && inv.status !== 'cancelled'
              ? `${invoiceTermDays(inv)}-day · due ${invoiceDueDate(inv)}`
              : undefined,
          cancelledInvoiceNote: cancelledInv
            ? `${cancelledInv.number} cancelled (${cancelledInv.cancellationReason ?? 'reason recorded'})`
            : undefined,
          canAck: PO_ACK_STATUSES_WITH_OBLIGATION.includes(po.status),
          canFulfil: po.status === 'accepted' || po.status === 'ready_to_fulfil',
          canReceive: po.status === 'shipped' || po.status === 'ready_to_fulfil',
          canIssueInvoice: po.status === 'delivered' && !activeInv,
          canRecordPayment: Boolean(activeInv && activeInv.status !== 'paid'),
          activeInvoiceId: activeInv?.id,
        };
      });
  }, [version]);

  function runCommerce<T>(label: string, fn: () => CommerceResult<T>, describe: (v: T) => string) {
    setCommerceError(null);
    setCommerceNotice(null);
    const res = fn();
    if (!res.ok) {
      setCommerceError(`${label}: ${res.error}`);
      return;
    }
    setCommerceNotice(`${label}: ${describe(res.value)}`);
  }

  const channelReadings: ChannelReceivingReadingRow[] = useMemo(() => {
    void version;
    if (!receiving) return [];
    const instructions = listChannelInstructions();
    const ackAtByPo = new Map<string, string>();
    const asnAtByPo = new Map<string, string>();
    const pickupByPo = new Map<string, { requestedPickUp: string; actionedAt?: string }>();
    for (const i of instructions) {
      if (i.type === 'po_acknowledgement' && i.outcome?.channelAcknowledgement?.submittedAt) {
        ackAtByPo.set(i.purchaseOrderId, i.outcome.channelAcknowledgement.submittedAt);
      }
      if (i.outcome?.asn?.filedAt) asnAtByPo.set(i.purchaseOrderId, i.outcome.asn.filedAt);
      if (i.outcome?.routingRequest?.requestedPickUp) {
        pickupByPo.set(i.poNumber, {
          requestedPickUp: i.outcome.routingRequest.requestedPickUp,
          actionedAt: i.outcome?.actionedAt,
        });
      }
    }
    const poById = new Map(demoPurchaseOrders.map((p) => [p.id, p]));
    return receiving.readings.map((r) => {
      const ack = verifyAcknowledgement({
        submittedAt: ackAtByPo.get(r.poId) ?? null,
        channelState: r.channelStatus,
        simulated: r.simulated,
      });
      const asn = asnBeforeReceiptVerdict({
        asnFiledAt: asnAtByPo.get(r.poId) ?? null,
        channelReportsReceived: channelReceivingReportsReceived(r.channelReceivingStatus),
        receivedAt: r.receivedDate ?? null,
      });
      const po = poById.get(r.poId);
      const pRec = po?.freightTerm === 'collect' ? pickupByPo.get(po.poNumber) : undefined;
      const pickup =
        po?.freightTerm === 'collect'
          ? pickupLeadTimeVerdict(
              pRec?.requestedPickUp ?? null,
              pRec?.actionedAt ? new Date(pRec.actionedAt) : new Date()
            )
          : null;
      return {
        poId: r.poId,
        channelPurchaseOrderId: r.channelPurchaseOrderId,
        channelStatusLabel: RECEIVING_STATUS_LABELS[r.channelReceivingStatus],
        mercentaStatusLabel: RECEIVING_STATUS_LABELS[r.mercentaReceivingStatus],
        unitsReceived: r.lines.reduce((s, l) => s + l.receivedQty, 0),
        differs: r.differs,
        simulated: r.simulated,
        ackSummary: `${ack.stateLabel} — ${ack.statement}`,
        ackAtRisk: ack.atRisk,
        asnSummary: `${asn.stateLabel} — ${asn.statement}`,
        asnExposed: asn.exposed,
        pickupSummary: pickup?.statement,
        pickupAtRisk: pickup ? pickup.state !== 'within_lead_time' : false,
      };
    });
  }, [receiving, version]);

  const routingRows = useMemo(() => {
    void version;
    return listChannelInstructions()
      .filter((i) => i.state === 'actioned' && i.outcome?.routingRequest?.raised)
      .map((i) => ({
        instructionId: i.id,
        poNumber: i.poNumber,
        reqId: i.outcome?.routingRequest?.channelShipmentRequestId ?? 'pending ref',
        arn: i.outcome?.routingInstructions?.arn,
        result: routingResults[i.id],
      }));
  }, [version, routingResults]);

  const invoiceSubmitRows = useMemo(() => {
    void version;
    return demoCommerceInvoices
      .filter((i) => i.status === 'issued')
      .slice()
      .reverse()
      .slice(0, 8)
      .map((i) => ({
        id: i.id,
        number: i.number,
        poNumber: i.poNumber,
        subtotalGbp: i.subtotalGbp,
        result: invoiceResults[i.id],
      }));
  }, [version, invoiceResults]);

  const labels = channelShipmentLabelsAvailability(UK_MARKETPLACE_ID);
  const errObj =
    deductionsQuery.error || posQuery.error || submissionsQuery.error || brandsQuery.error;
  const error =
    errObj instanceof Error ? errObj.message : errObj ? 'Failed to load retail pipeline.' : null;

  return (
    <RetailPipelineView
      loading={
        deductionsQuery.isPending ||
        posQuery.isPending ||
        submissionsQuery.isPending ||
        brandsQuery.isPending
      }
      error={error}
      onRetry={() => {
        void deductionsQuery.refetch();
        void posQuery.refetch();
        void submissionsQuery.refetch();
        void brandsQuery.refetch();
      }}
      marketplaceId={UK_MARKETPLACE_ID}
      canMutate={canCurrentUserMutate}
      submissions={submissions}
      purchaseOrders={purchaseOrders}
      deductions={deductions}
      selectedPo={purchaseOrders.find((p) => p.id === selectedPoId) ?? null}
      onSelectPo={(po) => setSelectedPoId(po?.id ?? null)}
      disputingId={disputingId}
      onDisputingIdChange={setDisputingId}
      onOpenDispute={async (id, notes) => {
        await disputeDeduction(id, notes);
        setDisputingId(null);
        await qc.invalidateQueries({ queryKey: ['deductions'] });
      }}
      onCloseDispute={async (id, outcome) => {
        await recordDisputeOutcome(id, outcome);
        await qc.invalidateQueries({ queryKey: ['deductions'] });
      }}
      onReconcileDelivery={(poId, received) => {
        const res = reconcileDelivery(poId, received);
        if (!res) return { ok: false, message: 'Could not reconcile selected PO.' };
        if (res.shortfalls.length === 0) {
          return {
            ok: true,
            message: 'Received quantities match confirmed quantities — no deduction raised.',
          };
        }
        return {
          ok: false,
          message: `${res.shortfalls.length} shortfall line(s) recorded. ${res.deductionsCreated.length} shortage deduction(s) raised to billing.`,
        };
      }}
      simulatedPos={simulatedPos}
      termChoice={termChoice}
      onTermChoiceChange={(poId, days) => setTermChoice((prev) => ({ ...prev, [poId]: days }))}
      onSimPoAction={(poId, action, reason) => {
        const terms = (termChoice[poId] ?? INVOICE_TERM_DAYS) as InvoiceTermDays;
        const activeInv = getCommerceInvoiceForPo(poId);
        if (action === 'ack') {
          runCommerce('Acknowledge', () => acknowledgeCommercePurchaseOrder(poId, actor), (p) => p.poNumber);
        } else if (action === 'fulfil') {
          runCommerce('Fulfil', () => fulfilCommercePurchaseOrder(poId, actor), (r) => r.shipmentId);
        } else if (action === 'receive') {
          runCommerce(
            'Receive',
            () => receiveCommercePurchaseOrder(poId, actor, undefined, { termDays: terms }),
            (r) => receiptInvoiceAutomationSummary(r.invoiceAutomation)
          );
        } else if (action === 'issue_invoice') {
          runCommerce('Issue invoice', () => issueCommerceInvoice(poId, actor, { termDays: terms }), (i) => i.number);
        } else if (action === 'pay' && activeInv) {
          runCommerce('Record payment', () => recordCommercePayment(activeInv.id, actor), (p) => `£${p.amountGbp.toFixed(2)}`);
        } else if (action === 'cancel_invoice' && activeInv && reason) {
          runCommerce('Cancel invoice', () => cancelCommerceInvoice(activeInv.id, actor, reason), (i) => i.number);
        } else if (action === 'open_case') {
          runCommerce('Open case', () => openCommerceCase(poId, 'Operational review requested (sim)', actor), (r) => r.ticketId);
        }
      }}
      commerceNotice={commerceNotice}
      commerceError={commerceError}
      activityCount={activityCount}
      invoiceRules={[...INVOICE_NUMBER_RULES]}
      receivingAutomationLines={[
        RECEIPT_INVOICE_AUTOMATION_STATEMENT.headline,
        RECEIPT_INVOICE_AUTOMATION_STATEMENT.mercentaProcess,
        RECEIPT_INVOICE_AUTOMATION_STATEMENT.terms,
        RECEIPT_INVOICE_AUTOMATION_STATEMENT.correction,
      ]}
      onReadChannelReceiving={async () => {
        setChannelReceivingBusy(true);
        try {
          const res = await readChannelReceivingSync();
          setReceiving(res);
        } finally {
          setChannelReceivingBusy(false);
        }
      }}
      channelReceivingBusy={channelReceivingBusy}
      channelReceivingModeLabel={
        receiving
          ? receiving.mode === 'mock'
            ? 'Simulation (mock) — simulated channel read; no live call made.'
            : 'Live channel read'
          : null
      }
      channelReadings={channelReadings}
      onApplyChannelReading={(poId) => {
        const match = receiving?.readings.find((r) => r.poId === poId);
        if (!match) return;
        const res = applyChannelReceivingReadingToStore(match, actor);
        setCommerceNotice(res.ok ? `Applied reading for ${match.channelPurchaseOrderId}.` : res.refusal ?? null);
      }}
      routingRows={routingRows}
      onRefreshRouting={async (instructionId, poNumber) => {
        const updated = await refreshChannelRoutingInstructions(instructionId, actingStaffId);
        const arn = updated?.outcome?.routingInstructions?.arn;
        setRoutingResults((prev) => ({
          ...prev,
          [instructionId]: arn ? `ARN ${arn}` : `Pending for ${poNumber}`,
        }));
      }}
      invoiceSubmitRows={invoiceSubmitRows}
      onSendInvoiceToChannel={async (invoiceId, invoiceNumber) => {
        const rec = await submitCommerceInvoiceToChannel({ invoiceId });
        setInvoiceResults((prev) => ({
          ...prev,
          [invoiceId]: rec.refusal ?? `${rec.submissionId ?? invoiceNumber}${rec.simulated ? ' (sim)' : ''}`,
        }));
      }}
      channelLabelsRule={{
        available: labels.available,
        reason: labels.reason,
        ruleLabel: CHANNEL_SHIPMENT_LABEL_RULE.label,
        source: CHANNEL_SHIPMENT_LABEL_RULE.source,
      }}
    />
  );
}
