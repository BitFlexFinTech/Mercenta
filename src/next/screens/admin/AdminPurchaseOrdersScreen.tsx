import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import { useBrands, useCanonicalStoreVersion, useDeductions, usePurchaseOrders } from '@/data/queries';
import {
  acknowledgePurchaseOrder,
  approveOnBehalfRejection,
  createShipmentForPO,
  draftOnBehalfRejection,
  ingestChannelPurchaseOrders,
  recordChannelPurchaseOrderHold,
} from '@/data/api';
import { listChannelInstructions, requeueChannelInstruction } from '@/lib/commerce/channelInstructions';
import { ackPriceDivergences } from '@/lib/commerce/invoicePriceMatch';
import {
  poAcknowledgementWindow,
  poNeedsAutoRejection,
  poOnBehalfRejectionDraft,
} from '@/lib/commerce/poAcknowledgementWindow';
import { poOnBehalfAuthority } from '@/lib/commerce/poOnBehalfAuthority';
import { poRevisionState } from '@/lib/commerce/poRevisions';
import { beginProxyProcessing, processChannelInstruction } from '@/lib/commerce/proxyProcessor';
import type { ChannelIngestionResult } from '@/lib/commerce/channelPurchaseOrderIngestion';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
import { carrierOptionsForLane, selectCarrierForShipment } from '@/lib/shipping/carrierRouting';
import { simulateMockChannelPoRevision } from '@/lib/spapi/mockClient';
import { poStatusPresentation } from '@/lib/statusPresentation';
import type { PoChannelHoldStatement, PoRejectionCode, PurchaseOrder } from '@/types';
import { formatGbp } from '@/next/components/ConsoleCharts';
import type { MetricItem } from '@/next/components/ConsolePrimitives';
import { AdminPurchaseOrdersView, type AdminPoDetailModel } from './AdminPurchaseOrdersView';

const STATUS_ORDER = [
  'received',
  'under_review',
  'accepted',
  'ready_to_fulfil',
  'shipped',
  'delivered',
  'rejected',
];

export function AdminPurchaseOrdersScreen({
  initialBrandId = null,
}: {
  /**
   * §FRONTEND-REDESIGN BATCH 3 — v1's screen accepted NO props, which meant the
   * shell's brand-scoped deep link (`adminPoBrandId` → "open this brand's POs")
   * had nothing to bind to, and the capability was silently lost. Restored here
   * as a SEEDED filter: the brand arrives pre-selected and the operator can widen
   * it back to "All brands" in the toolbar, so it is a filter, never a lock.
   */
  initialBrandId?: string | null;
}) {
  const qc = useQueryClient();
  const { canCurrentUserMutate, session, actingStaff } = useApp();
  const canonicalVersion = useCanonicalStoreVersion();
  void canonicalVersion;

  const brandsQuery = useBrands();
  const posQuery = usePurchaseOrders();
  const deductionsQuery = useDeductions();

  const brands = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const pos = useMemo(() => posQuery.data?.data ?? [], [posQuery.data]);
  const deductions = useMemo(() => deductionsQuery.data?.data ?? [], [deductionsQuery.data]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  /** Seeded from the deep link, then owned by the operator. */
  const [brandFilter, setBrandFilter] = useState(initialBrandId ?? 'all');
  const [simOnly, setSimOnly] = useState(false);
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  const deepLinkPo = useRecordDeepLink('po');
  useEffect(() => {
    if (!deepLinkPo) return;
    const match = pos.find((p) => p.poNumber === deepLinkPo);
    if (match) setSelectedPoId(match.id);
  }, [deepLinkPo, pos]);

  const [ingestBusy, setIngestBusy] = useState(false);
  const [ingestResult, setIngestResult] = useState<ChannelIngestionResult | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [revisionBusy, setRevisionBusy] = useState(false);
  const [revisionNotice, setRevisionNotice] = useState<string | null>(null);
  const [holdBusy, setHoldBusy] = useState(false);
  const [holdNotice, setHoldNotice] = useState<string | null>(null);

  const [onBehalfAckOpen, setOnBehalfAckOpen] = useState(false);
  const [ackStatuses, setAckStatuses] = useState<Record<string, 'accepted' | 'rejected' | 'backordered'>>({});
  const [ackQtys, setAckQtys] = useState<Record<string, number>>({});
  const [ackPrices, setAckPrices] = useState<Record<string, number>>({});
  const [ackRejectionCodes, setAckRejectionCodes] = useState<Record<string, string>>({});
  const [ackNotice, setAckNotice] = useState<string | null>(null);
  const [behalfRejectNotice, setBehalfRejectNotice] = useState<string | null>(null);
  const [proxyNotice, setProxyNotice] = useState<string | null>(null);

  const [onBehalfAsnOpen, setOnBehalfAsnOpen] = useState(false);
  const [asnCarrier, setAsnCarrier] = useState('dhl');
  const [asnShipDate, setAsnShipDate] = useState(new Date().toISOString().slice(0, 10));
  const [asnLot, setAsnLot] = useState('');
  const [asnExpiry, setAsnExpiry] = useState('');
  const [asnNotice, setAsnNotice] = useState<string | null>(null);

  const brandName = (id: string) =>
    brands.find((b) => b.id === id)?.profile.businessName ?? id;

  const selectedPo = useMemo(() => pos.find((p) => p.id === selectedPoId) ?? null, [pos, selectedPoId]);

  useEffect(() => {
    if (selectedPo && poNeedsAutoRejection(selectedPo)) draftOnBehalfRejection(selectedPo.id);
    setOnBehalfAckOpen(false);
    setOnBehalfAsnOpen(false);
    setAckNotice(null);
    setBehalfRejectNotice(null);
    setProxyNotice(null);
    setAsnNotice(null);
  }, [selectedPo?.id]);

  const queueMetrics = useMemo(() => {
    const awaiting = pos.filter((p) => poAcknowledgementWindow(p).inQueue);
    return {
      total: pos.length,
      value: pos.reduce((sum, p) => sum + p.poValue, 0),
      awaiting: awaiting.length,
      simulated: pos.filter((p) => p.simulated === true).length,
    };
  }, [pos]);

  const metrics: MetricItem[] = [
    {
      id: 'po-queue-total',
      label: 'Purchase orders',
      value: String(queueMetrics.total),
      context: `${brands.length} brands`,
      onClick: () => {
        setStatusFilter('all');
        setSearchQuery('');
        setSimOnly(false);
      },
    },
    {
      id: 'po-queue-value',
      label: 'Value in queue',
      value: formatGbp(queueMetrics.value),
      context: 'Net order value',
      onClick: () => {
        setStatusFilter('all');
        setSearchQuery('');
      },
    },
    {
      id: 'po-queue-awaiting',
      label: 'Awaiting action',
      value: String(queueMetrics.awaiting),
      context: queueMetrics.awaiting > 0 ? 'Needs review' : 'All actioned',
      onClick: () => setStatusFilter('received'),
    },
    {
      id: 'po-queue-simulated',
      label: 'Simulated (sim)',
      value: String(queueMetrics.simulated),
      context: 'Operational simulation',
      onClick: () => setSimOnly(true),
    },
  ];

  const rows = useMemo(() => {
    let list = [...pos];
    if (brandFilter !== 'all') list = list.filter((p) => p.brandId === brandFilter);
    if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter);
    if (simOnly) list = list.filter((p) => p.simulated === true);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.poNumber.toLowerCase().includes(q) ||
          brandName(p.brandId).toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
    return list.map((po) => {
      const pres = poStatusPresentation(po.status);
      return {
        po,
        brandName: brandName(po.brandId),
        deductionsCount: deductions.filter((d) => d.purchaseOrderId === po.id).length,
        statusLabel: pres.label,
        statusTone: pres.tone as 'neutral' | 'success' | 'warning' | 'danger' | 'info',
      };
    });
  }, [pos, brandFilter, statusFilter, simOnly, searchQuery, brands, deductions]);

  const selectedDetail: AdminPoDetailModel | null = useMemo(() => {
    if (!selectedPo) return null;
    const brand = brands.find((b) => b.id === selectedPo.brandId);
    const ackWindow = poAcknowledgementWindow(selectedPo);
    const onBehalfAuthority = poOnBehalfAuthority(selectedPo);
    const onBehalfRejectDraft = poOnBehalfRejectionDraft(selectedPo);
    const revState = poRevisionState(selectedPo);
    const instruction = listChannelInstructions({ purchaseOrderId: selectedPo.id }).find(
      (i) => i.type === 'po_acknowledgement'
    );
    const laneOptions: { value: string; label: string }[] = carrierOptionsForLane(
      selectCarrierForShipment({}).lane
    ).map((o) => ({
      value: o.value,
      label: o.label,
    }));
    if (selectedPo.freightTerm === 'collect') {
      laneOptions.push({ value: 'amazon_partner', label: 'Partnered carrier (channel freight)' });
    }
    return {
      po: selectedPo,
      brandName: brand?.profile.businessName ?? selectedPo.brandId,
      brandCategory: brand?.category ?? '',
      ackWindow,
      onBehalfAuthority,
      onBehalfRejectDraft,
      instruction,
      deductions: deductions.filter((d) => d.purchaseOrderId === selectedPo.id),
      priceDivergences: ackPriceDivergences(selectedPo),
      carrierOptions: laneOptions,
      channelCancelled: revState.channelCancelled,
      acknowledgementStale: revState.acknowledgementStale,
    };
  }, [selectedPo, brands, deductions]);

  async function handleReadChannel() {
    if (!canCurrentUserMutate || ingestBusy) return;
    setIngestBusy(true);
    setIngestError(null);
    try {
      const result = await ingestChannelPurchaseOrders({
        actorId: session?.role ?? 'Mercenta Admin',
      });
      setIngestResult(result);
      void qc.invalidateQueries();
    } catch (err) {
      setIngestError(err instanceof Error ? err.message : 'Channel read failed.');
    } finally {
      setIngestBusy(false);
    }
  }

  async function handleSimulateRevision() {
    if (!canCurrentUserMutate || revisionBusy) return;
    if (ingestResult?.mode !== 'mock') {
      setRevisionNotice('Refused: read the retail channel first.');
      return;
    }
    setRevisionBusy(true);
    try {
      let target: PurchaseOrder | null = null;
      for (const candidate of pos.filter((p) => p.simulated === true)) {
        if (simulateMockChannelPoRevision(candidate.poNumber).ok) {
          target = candidate;
          break;
        }
      }
      if (!target) {
        setRevisionNotice('No simulated order available to revise.');
        return;
      }
      const read = await ingestChannelPurchaseOrders({ actorId: session?.role ?? 'Mercenta Admin' });
      setIngestResult(read);
      setRevisionNotice(`Simulated revision ingested for ${target.poNumber}.`);
      void qc.invalidateQueries();
    } finally {
      setRevisionBusy(false);
    }
  }

  function handleSimulateHold(state: PoChannelHoldStatement) {
    if (!canCurrentUserMutate || holdBusy) return;
    if (ingestResult?.mode !== 'mock') {
      setHoldNotice('Refused: read the retail channel first.');
      return;
    }
    setHoldBusy(true);
    try {
      const target = pos.find((p) => p.simulated === true) ?? null;
      if (!target) {
        setHoldNotice('No simulated order held yet.');
        return;
      }
      const res = recordChannelPurchaseOrderHold(target.id, state, {
        recordedBy: session?.role ?? 'Mercenta Admin',
        simulated: true,
      });
      setHoldNotice(res.ok ? `Recorded hold state "${state}" for ${target.poNumber}.` : `Refused: ${res.error}`);
      void qc.invalidateQueries();
    } finally {
      setHoldBusy(false);
    }
  }

  function beginBehalfAck() {
    if (!selectedPo) return;
    setOnBehalfAckOpen(true);
    const st: Record<string, 'accepted' | 'rejected' | 'backordered'> = {};
    const qt: Record<string, number> = {};
    const pr: Record<string, number> = {};
    for (const li of selectedPo.lineItems) {
      st[li.sku] = (li.ackStatus as 'accepted' | 'rejected' | 'backordered') || 'accepted';
      qt[li.sku] = li.acknowledgedQty ?? li.quantity;
      pr[li.sku] = li.acknowledgedUnitPrice ?? li.unitPrice;
    }
    setAckStatuses(st);
    setAckQtys(qt);
    setAckPrices(pr);
  }

  function submitBehalfAck() {
    if (!selectedPo) return;
    const lineAcks = selectedPo.lineItems.map((li) => ({
      sku: li.sku,
      ackStatus: ackStatuses[li.sku] ?? 'accepted',
      acknowledgedQty: ackStatuses[li.sku] === 'rejected' ? 0 : (ackQtys[li.sku] ?? li.quantity),
      unitPrice: ackPrices[li.sku],
      ...(ackStatuses[li.sku] === 'rejected'
        ? { rejectionCode: (ackRejectionCodes[li.sku] || undefined) as PoRejectionCode | undefined }
        : {}),
    }));
    const result = acknowledgePurchaseOrder(selectedPo.id, lineAcks, actingStaff?.id ?? 'unknown-admin');
    if (!result.ok) {
      setAckNotice(result.error ?? 'Failed.');
      return;
    }
    if (result.instructionId) beginProxyProcessing(result.instructionId);
    setAckNotice(`Acknowledgment recorded on behalf of ${brandName(selectedPo.brandId)}.`);
    void qc.invalidateQueries({ queryKey: ['purchase_orders'] });
    setOnBehalfAckOpen(false);
  }

  function submitBehalfAsn() {
    if (!selectedPo) return;
    const brand = brands.find((b) => b.id === selectedPo.brandId);
    const needsLot = brand && ['Grocery', 'Health & Personal Care'].includes(brand.category);
    if (needsLot && (!asnLot.trim() || !asnExpiry)) {
      setAsnNotice('Lot number and expiry date are required for Grocery / H&PC categories.');
      return;
    }
    const cartons = selectedPo.lineItems
      .filter((li) => li.ackStatus !== 'rejected')
      .map((li) => {
        const qty = li.acknowledgedQty ?? li.quantity;
        return {
          sku: li.sku,
          quantity: qty,
          weightKg: Math.max(1, Math.round(qty * 0.4)),
          lengthCm: 40,
          widthCm: 30,
          heightCm: 25,
        };
      });
    const res = createShipmentForPO(
      selectedPo.id,
      {
        cartons,
        shipDate: asnShipDate,
        carrier: asnCarrier,
        proNumber: `PRO-${selectedPo.poNumber}`,
        bolNumber: `BOL-${selectedPo.poNumber}`,
        lotNumber: asnLot || undefined,
        expiryDate: asnExpiry || undefined,
      },
      actingStaff?.id ?? 'unknown-admin'
    );
    if (!res.ok) {
      setAsnNotice(res.error ?? 'Failed.');
      return;
    }
    setAsnNotice(`ASN filed on behalf of ${brandName(selectedPo.brandId)}.`);
    void qc.invalidateQueries({ queryKey: ['purchase_orders', 'shipments'] });
    setOnBehalfAsnOpen(false);
  }

  return (
    <AdminPurchaseOrdersView
      loading={posQuery.isPending && pos.length === 0}
      error={posQuery.isError && pos.length === 0}
      onRetry={() => {
        void posQuery.refetch();
        void brandsQuery.refetch();
      }}
      totalPos={pos.length}
      totalBrands={brands.length}
      queueValueGbp={queueMetrics.value}
      awaitingCount={queueMetrics.awaiting}
      simulatedCount={queueMetrics.simulated}
      metrics={metrics}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      statusOrder={STATUS_ORDER}
      brandOptions={brands.map((b) => ({ id: b.id, name: brandName(b.id) }))}
      brandFilter={brandFilter}
      onBrandFilterChange={setBrandFilter}
      simOnly={simOnly}
      onToggleSimOnly={() => setSimOnly((v) => !v)}
      rows={rows}
      canMutate={canCurrentUserMutate}
      ingestBusy={ingestBusy}
      ingestResult={ingestResult}
      ingestError={ingestError}
      onReadChannel={() => void handleReadChannel()}
      revisionBusy={revisionBusy}
      revisionNotice={revisionNotice}
      onSimulateRevision={() => void handleSimulateRevision()}
      holdBusy={holdBusy}
      holdNotice={holdNotice}
      onSimulateHold={handleSimulateHold}
      brandNameFor={brandName}
      selectedDetail={selectedDetail}
      onOpenDetail={setSelectedPoId}
      onBehalfAckOpen={onBehalfAckOpen}
      onBeginBehalfAck={beginBehalfAck}
      onCancelBehalfAck={() => setOnBehalfAckOpen(false)}
      ackStatuses={ackStatuses}
      onAckStatusChange={(sku, next) => setAckStatuses((p) => ({ ...p, [sku]: next }))}
      ackQtys={ackQtys}
      onAckQtyChange={(sku, next) => setAckQtys((p) => ({ ...p, [sku]: next }))}
      ackPrices={ackPrices}
      onAckPriceChange={(sku, next) => setAckPrices((p) => ({ ...p, [sku]: next }))}
      ackRejectionCodes={ackRejectionCodes}
      onAckRejectionCodeChange={(sku, next) => setAckRejectionCodes((p) => ({ ...p, [sku]: next }))}
      onSubmitBehalfAck={submitBehalfAck}
      ackNotice={ackNotice}
      onApproveBehalfRejection={() => {
        if (!selectedDetail) return;
        const res = approveOnBehalfRejection(selectedDetail.po.id, {
          actorStaffId: actingStaff?.id ?? 'unknown-admin',
          actorLabel: actingStaff?.name ?? 'Unknown admin',
          draftId: selectedDetail.onBehalfRejectDraft?.draftId,
        });
        setBehalfRejectNotice(
          res.ok ? `On-behalf rejection approved (${res.draftId}).` : `Refused: ${res.error}`
        );
        void qc.invalidateQueries({ queryKey: ['purchase_orders'] });
      }}
      behalfRejectNotice={behalfRejectNotice}
      onRetryInstruction={() => {
        if (!selectedDetail?.instruction) return;
        requeueChannelInstruction(
          selectedDetail.instruction.id,
          actingStaff?.name ?? 'Unknown admin',
          'Retry requested from PO detail.'
        );
        void processChannelInstruction(selectedDetail.instruction.id).then((out) => {
          setProxyNotice(
            out?.state === 'actioned'
              ? 'Channel action completed.'
              : `Not completed: ${out?.outcome?.refusedReason ?? 'no reason recorded'}`
          );
          void qc.invalidateQueries({ queryKey: ['purchase_orders', 'shipments'] });
        });
      }}
      proxyNotice={proxyNotice}
      onBehalfAsnOpen={onBehalfAsnOpen}
      onBeginBehalfAsn={() => setOnBehalfAsnOpen(true)}
      asnCarrier={asnCarrier}
      onAsnCarrierChange={setAsnCarrier}
      asnShipDate={asnShipDate}
      onAsnShipDateChange={setAsnShipDate}
      asnLot={asnLot}
      onAsnLotChange={setAsnLot}
      asnExpiry={asnExpiry}
      onAsnExpiryChange={setAsnExpiry}
      onSubmitBehalfAsn={submitBehalfAsn}
      asnNotice={asnNotice}
    />
  );
}
