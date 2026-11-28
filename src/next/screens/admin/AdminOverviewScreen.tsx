import { useMemo } from 'react';
import {
  useBrandAgreements,
  useBrands,
  useCatalogSubmissions,
  useCommissions,
  useComplianceDocuments,
  useContracts,
  useDeductions,
  useMessages,
  useProducts,
  usePurchaseOrders,
  useShipmentsAll,
} from '@/data/queries';
import { demoCommerceInvoices, getAllCommercePayments } from '@/data/demoStore';
import { computeBrandNetShare, normalisePayoutTrack, resolveCommissionRatePct } from '@/lib/billing/payouts';
import { summariseInvoiceLedger, UPCOMING_PAYMENTS_HORIZON_DAYS } from '@/lib/commerce/invoiceTerms';
import { poAcknowledgementWindow } from '@/lib/commerce/poAcknowledgementWindow';
import { evaluateComplianceGate } from '@/lib/compliance';
import { renewalUrgency } from '@/lib/contracts';
import { operatingCostSummary } from '@/lib/costs/costSummary';
import { demoTickets } from '@/lib/helpdesk/ticketStore';
import { shipmentStatusPresentation } from '@/lib/statusPresentation';
import { PO_ACK_STATUSES_WITH_OBLIGATION } from '@/config/purchaseOrders';
import { isApprovedCategory, STATUS_LABELS, type ShipmentStatus } from '@/types';
import { AdminOverviewView } from './AdminOverviewView';
import { formatGbp } from '@/next/components/ConsoleCharts';
import type { MetricItem, SemanticTone } from '@/next/components/ConsolePrimitives';

const PO_IN_FLIGHT: ReadonlySet<string> = new Set([
  'accepted',
  'ready_to_fulfil',
  'shipped',
  'delivered',
]);

export function AdminOverviewScreen({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const brandsQuery = useBrands();
  const posQuery = usePurchaseOrders();
  const docsQuery = useComplianceDocuments();
  const contractsQuery = useContracts();
  const agreementsQuery = useBrandAgreements();
  const messagesQuery = useMessages();
  const shipmentsQuery = useShipmentsAll();
  const deductionsQuery = useDeductions();
  const submissionsQuery = useCatalogSubmissions();
  const commissionsQuery = useCommissions();
  const productsQuery = useProducts();

  const brands = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const posAll = useMemo(() => posQuery.data?.data ?? [], [posQuery.data]);
  const docsAll = useMemo(() => docsQuery.data?.data ?? [], [docsQuery.data]);
  const contractsAll = useMemo(() => contractsQuery.data?.data ?? [], [contractsQuery.data]);
  const agreementsAll = useMemo(() => agreementsQuery.data?.data ?? [], [agreementsQuery.data]);
  const messagesAll = useMemo(() => messagesQuery.data?.data ?? [], [messagesQuery.data]);
  const shipmentsAll = useMemo(() => shipmentsQuery.data?.data ?? [], [shipmentsQuery.data]);
  const commissionsAll = useMemo(() => commissionsQuery.data?.data ?? [], [commissionsQuery.data]);
  const productsAll = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data]);

  const dataReady = posAll.length > 0 && brands.length > 0;
  const anyError =
    brandsQuery.isError ||
    posQuery.isError ||
    docsQuery.isError ||
    contractsQuery.isError ||
    agreementsQuery.isError ||
    messagesQuery.isError ||
    shipmentsQuery.isError ||
    submissionsQuery.isError ||
    commissionsQuery.isError ||
    deductionsQuery.isError ||
    productsQuery.isError;

  const loading =
    !dataReady &&
    (brandsQuery.isPending ||
      posQuery.isPending ||
      docsQuery.isPending ||
      contractsQuery.isPending ||
      agreementsQuery.isPending ||
      messagesQuery.isPending ||
      shipmentsQuery.isPending ||
      deductionsQuery.isPending ||
      productsQuery.isPending);

  const brandName = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of brands) m.set(b.id, b.profile?.businessName ?? b.id);
    return m;
  }, [brands]);

  const posAwaitingAction = posAll.filter((p) => poAcknowledgementWindow(p).inQueue);
  const awaitingValue = posAwaitingAction.reduce((s, p) => s + p.poValue, 0);
  const posInFulfilment = posAll.filter((p) => PO_IN_FLIGHT.has(p.status));

  const productsByBrand = new Set(productsAll.map((p) => p.brandId)).size;
  const lifetimePoValue = posAll.reduce((s, p) => s + p.poValue, 0);
  const orderLineCount = posAll.reduce((s, p) => s + p.lineItems.length, 0);
  const orderedUnits = posAll.reduce(
    (s, p) => s + p.lineItems.reduce((a, l) => a + l.quantity, 0),
    0
  );
  const unitsInFulfilment = posInFulfilment.reduce(
    (s, p) => s + p.lineItems.reduce((a, l) => a + l.quantity, 0),
    0
  );
  const valueInMotion = shipmentsAll.reduce((s, x) => s + (x.value ?? 0), 0);
  const delayedShipments = shipmentsAll.filter((s) => s.delayed).length;
  const shipmentExceptions = shipmentsAll.filter((s) => s.exception).length;

  const todayIso = new Date().toISOString().slice(0, 10);
  const invoiceLedger = summariseInvoiceLedger(
    demoCommerceInvoices,
    getAllCommercePayments(),
    todayIso
  );

  const docsPending = docsAll.filter(
    (d) => d.status === 'under_review' || d.status === 'uploaded'
  );
  const brandsWithPendingDocs = new Set(docsPending.map((d) => d.brandId)).size;

  const complianceCleared = brands.filter((b) => {
    const brandDocs = docsAll.filter((d) => d.brandId === b.id);
    const hasContract = contractsAll.some(
      (c) => c.brandId === b.id && (c.status === 'signed' || c.status === 'active')
    );
    const brandAgreements = agreementsAll.filter((a) => a.brandId === b.id);
    return evaluateComplianceGate(
      brandDocs,
      isApprovedCategory(b.category) ? b.category : undefined,
      hasContract,
      brandAgreements.some((a) => a.agreementType === 'logistics_sla'),
      brandAgreements.some((a) => a.agreementType === 'chargeback_indemnity')
    ).cleared;
  }).length;
  const complianceBlocked = Math.max(brands.length - complianceCleared, 0);

  const nowIso = new Date().toISOString();
  const renewalsDue = contractsAll
    .map((c) => ({ c, urgency: renewalUrgency(c.renewalDate, nowIso) }))
    .filter(({ urgency }) => urgency !== 'ok');
  const earliestRenewal =
    renewalsDue.length > 0 ? renewalsDue.map((r) => r.c.renewalDate).sort()[0] : '';

  const activeTickets = demoTickets.filter((t) => t.status === 'open' || t.status === 'pending');
  const urgentTickets = activeTickets.filter(
    (t) => t.priority === 'urgent' || t.priority === 'high'
  );

  const brandTrackById = useMemo(() => {
    const m = new Map<string, 'direct_fulfillment' | 'financed'>();
    for (const b of brands) m.set(b.id, normalisePayoutTrack(b.track));
    return m;
  }, [brands]);

  const pendingPayouts = commissionsAll.filter((c) => c.status !== 'paid');
  const pendingPayoutValue = pendingPayouts.reduce(
    (s, c) =>
      s +
      computeBrandNetShare({
        poValue: c.poValue,
        commissionRatePct: resolveCommissionRatePct({
          commissionRate: c.commissionRate,
          commissionAmount: c.commissionAmount,
          poValue: c.poValue,
        }),
        fulfillmentTrack: brandTrackById.get(c.brandId) ?? 'financed',
      }),
    0
  );

  const costs = useMemo(() => operatingCostSummary(), []);

  const moneyMetrics: MetricItem[] = [
    {
      id: 'open-po-value',
      label: 'Open PO value',
      value: formatGbp(awaitingValue),
      context:
        posAwaitingAction.length > 0
          ? `${posAwaitingAction.length} PO(s) awaiting action`
          : 'Nothing awaiting action',
      onClick: () => onNavigate?.('purchase_orders_admin'),
    },
    {
      id: 'revenue',
      label: 'Recorded revenue',
      value: formatGbp(costs.revenue.totalGbp),
      context: 'Canonical streams',
      onClick: () => onNavigate?.('super_admin'),
    },
    {
      id: 'contribution',
      label: 'Gross contribution',
      value: formatGbp(costs.contribution.grossGbp),
      context: `${costs.contribution.provisional ? 'Provisional · ' : ''}Cost base ${formatGbp(costs.monthlyTotalGbp)}`,
      onClick: () => onNavigate?.('super_admin'),
    },
    {
      id: 'margin',
      label: 'Contribution margin',
      value: `${costs.contribution.marginPct}%`,
      context: costs.contribution.provisional ? 'Provisional until founder-approved' : 'Derived',
      onClick: () => onNavigate?.('super_admin'),
    },
    {
      id: 'receivables',
      label: 'Receivables',
      value: formatGbp(invoiceLedger.receivablesGbp, 2),
      context:
        invoiceLedger.overdue.length > 0
          ? `${invoiceLedger.overdue.length} past terms`
          : `${invoiceLedger.outstanding.length} unpaid (derived terms)`,
      onClick: () => onNavigate?.('super_admin'),
    },
  ];

  const operationalMetrics: MetricItem[] = [
    {
      id: 'pending-pos',
      label: 'POs awaiting action',
      value: String(posAwaitingAction.length),
      context: `${formatGbp(awaitingValue)} open value`,
      onClick: () => onNavigate?.('purchase_orders_admin'),
    },
    {
      id: 'in-fulfilment',
      label: 'POs in fulfilment',
      value: String(posInFulfilment.length),
      context: shipmentsAll.length > 0 ? `${shipmentsAll.length} live shipments` : 'No shipments yet',
      onClick: () => onNavigate?.('logistics'),
    },
    {
      id: 'docs-pending',
      label: 'Compliance docs pending',
      value: String(docsPending.length),
      context: `${brandsWithPendingDocs} brand(s) affected`,
      onClick: () => onNavigate?.('compliance'),
    },
    {
      id: 'gate',
      label: 'Compliance-gate cleared',
      value: `${complianceCleared} / ${brands.length}`,
      context: complianceBlocked === 0 ? 'All cleared' : `${complianceBlocked} not cleared`,
      onClick: () => onNavigate?.('compliance'),
    },
    {
      id: 'renewals',
      label: 'Contract renewals due',
      value: String(renewalsDue.length),
      context: renewalsDue.length > 0 ? `Soonest ${earliestRenewal}` : 'Beyond 60 days',
      onClick: () => onNavigate?.('contracts_admin'),
    },
    {
      id: 'tickets',
      label: 'Open support tickets',
      value: String(activeTickets.length),
      context: `${urgentTickets.length} urgent / high`,
      onClick: () => onNavigate?.('helpdesk'),
    },
    {
      id: 'payouts-pending',
      label: 'Brand payouts pending',
      value: String(pendingPayouts.length),
      context: `${formatGbp(pendingPayoutValue, 2)} net owed`,
      onClick: () => onNavigate?.('super_admin'),
    },
  ];

  const volumeMetrics: MetricItem[] = [
    {
      id: 'brands',
      label: 'Brands on platform',
      value: String(brands.length),
      context: `${complianceCleared} compliance-cleared`,
      onClick: () => onNavigate?.('crm'),
    },
    {
      id: 'products',
      label: 'Products listed',
      value: String(productsAll.length),
      context: `Across ${productsByBrand} brand(s)`,
      onClick: () => onNavigate?.('catalog'),
    },
    {
      id: 'pos-count',
      label: 'Purchase orders',
      value: String(posAll.length),
      context: `${formatGbp(lifetimePoValue)} lifetime`,
      onClick: () => onNavigate?.('purchase_orders_admin'),
    },
    {
      id: 'order-lines',
      label: 'Order lines',
      value: String(orderLineCount),
      context: `${orderedUnits.toLocaleString('en-GB')} units ordered`,
      onClick: () => onNavigate?.('purchase_orders_admin'),
    },
    {
      id: 'shipments',
      label: 'Shipments',
      value: String(shipmentsAll.length),
      context: `${formatGbp(valueInMotion)} in motion`,
      onClick: () => onNavigate?.('logistics'),
    },
    {
      id: 'volume',
      label: 'Operational volume',
      value: unitsInFulfilment.toLocaleString('en-GB'),
      context: `${posInFulfilment.length} PO(s) in flight`,
      onClick: () => onNavigate?.('logistics'),
    },
    {
      id: 'upcoming-payments',
      label: 'Upcoming payments',
      value: formatGbp(invoiceLedger.upcomingGbp, 2),
      context: `${invoiceLedger.upcoming.length} due within ${UPCOMING_PAYMENTS_HORIZON_DAYS}d`,
      onClick: () => onNavigate?.('super_admin'),
    },
    {
      id: 'exceptions',
      label: 'Fulfilment exceptions',
      value: String(shipmentExceptions),
      context: `${delayedShipments} delayed · ${shipmentsAll.length} tracked`,
      onClick: () => onNavigate?.('logistics'),
    },
  ];

  const pipelineStages = useMemo(() => {
    const buckets: { id: string; label: string; statuses: readonly string[] }[] = [
      { id: 'awaiting', label: 'Awaiting action', statuses: PO_ACK_STATUSES_WITH_OBLIGATION },
      { id: 'committed', label: 'Committed', statuses: ['accepted', 'ready_to_fulfil'] },
      { id: 'in-transit', label: 'In transit', statuses: ['shipped'] },
      { id: 'delivered', label: 'Delivered', statuses: ['delivered'] },
      { id: 'closed', label: 'Closed / other', statuses: [] },
    ];
    const classified = new Set(buckets.flatMap((b) => b.statuses));
    const total = Math.max(1, posAll.length);
    return buckets.map((b) => {
      const count =
        b.statuses.length === 0
          ? posAll.filter((p) => !classified.has(p.status)).length
          : posAll.filter((p) => b.statuses.includes(p.status)).length;
      return {
        id: b.id,
        label: b.label,
        count,
        sharePct: Math.round((count / total) * 100),
      };
    });
  }, [posAll]);

  const { orderValueTrend, orderCountTrend } = useMemo(() => {
    const byMonth = new Map<string, { val: number; cnt: number }>();
    for (const p of posAll) {
      const m = (p.orderDate ?? '').slice(0, 7);
      if (!m) continue;
      const cur = byMonth.get(m) ?? { val: 0, cnt: 0 };
      cur.val += p.poValue;
      cur.cnt += 1;
      byMonth.set(m, cur);
    }
    const months = [...byMonth.keys()].sort().slice(-6);
    return {
      orderValueTrend: months.map((m) => ({
        label: `${m.slice(5)}/${m.slice(2, 4)}`,
        value: Math.round(byMonth.get(m)?.val ?? 0),
      })),
      orderCountTrend: months.map((m) => ({
        label: `${m.slice(5)}/${m.slice(2, 4)}`,
        value: byMonth.get(m)?.cnt ?? 0,
      })),
    };
  }, [posAll]);

  const valueByBrand = useMemo(() => {
    const byBrand = new Map<string, number>();
    for (const p of posAll) byBrand.set(p.brandId, (byBrand.get(p.brandId) ?? 0) + p.poValue);
    return [...byBrand.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, value]) => ({
        label: (brandName.get(id) ?? id).split(' ')[0] ?? id,
        value: Math.round(value),
        hint: brandName.get(id) ?? id,
      }));
  }, [posAll, brandName]);

  const docStatusBreakdown = useMemo(() => {
    const order = ['approved', 'under_review', 'uploaded', 'missing', 'expired', 'rejected'];
    const counts = new Map<string, number>();
    for (const d of docsAll) counts.set(d.status, (counts.get(d.status) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([status, value]) => ({ label: status.replace(/_/g, ' '), value }));
  }, [docsAll]);

  const shipmentStatusBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of shipmentsAll) {
      const label = shipmentStatusPresentation(s.status).label;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  }, [shipmentsAll]);

  const carrierBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of shipmentsAll) {
      const label = s.carrier ? s.carrier.toUpperCase() : 'UNASSIGNED';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  }, [shipmentsAll]);

  const fulfilmentRows = useMemo(() => {
    if (shipmentsAll.length > 0) {
      return shipmentsAll.map((s) => ({
        id: s.id,
        ref: s.reference,
        title: s.title,
        meta: `${s.carrier.toUpperCase()} · ${s.origin} → ${s.destination}`,
        status: STATUS_LABELS[s.status as ShipmentStatus] ?? s.status,
        tone: (s.status === 'live_amazon' || s.status === 'uk_customs_cleared' ? 'success' : 'info') as SemanticTone,
        targetView: 'logistics',
      }));
    }
    return posInFulfilment.map((p) => ({
      id: p.id,
      ref: p.poNumber,
      title: brandName.get(p.brandId) ?? p.brandId,
      meta: `Awaiting fulfilment · ${p.status.replace(/_/g, ' ')}`,
      status: p.status.replace(/_/g, ' '),
      tone: 'info' as SemanticTone,
      targetView: 'purchase_orders_admin',
    }));
  }, [shipmentsAll, posInFulfilment, brandName]);

  const recentMessages = useMemo(
    () =>
      [...messagesAll]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6)
        .map((m) => ({
          id: m.id,
          subject: m.subject ?? m.body,
          meta: `${brandName.get(m.brandId) ?? m.brandId} · ${m.direction} · ${m.createdAt.slice(0, 16).replace('T', ' ')}`,
          badgeLabel: m.requiresHuman ? 'HUMAN REPLY' : m.channel.toUpperCase(),
          tone: (m.requiresHuman ? 'warning' : m.direction === 'inbound' ? 'info' : 'neutral') as SemanticTone,
        })),
    [messagesAll, brandName]
  );

  function retryAll() {
    void brandsQuery.refetch();
    void posQuery.refetch();
    void docsQuery.refetch();
    void contractsQuery.refetch();
    void shipmentsQuery.refetch();
  }

  return (
    <AdminOverviewView
      loading={loading}
      error={!dataReady && (anyError || (posAll.length === 0 && docsAll.length === 0))}
      partialError={dataReady && anyError}
      onRetry={retryAll}
      onNavigate={onNavigate}
      headerSummary={`${brands.length} brands on platform · ${posAll.length} purchase orders · ${docsAll.length} compliance documents · ${messagesAll.length} messages`}
      awaitingActionCount={posAwaitingAction.length}
      awaitingValueGbp={awaitingValue}
      shipmentsCount={shipmentsAll.length}
      renewalsCount={renewalsDue.length}
      moneyMetrics={moneyMetrics}
      operationalMetrics={operationalMetrics}
      volumeMetrics={volumeMetrics}
      pipelineTotal={posAll.length}
      pipelineStages={pipelineStages}
      revenueStreams={costs.revenue.streams}
      totalRevenueGbp={costs.revenue.totalGbp}
      monthlyCostGbp={costs.monthlyTotalGbp}
      providerCount={costs.providers.length}
      grossProfitGbp={costs.contribution.grossGbp}
      marginPct={costs.contribution.marginPct}
      provisional={costs.contribution.provisional}
      orderValueTrend={orderValueTrend}
      orderCountTrend={orderCountTrend}
      valueByBrand={valueByBrand}
      docStatusBreakdown={docStatusBreakdown}
      totalDocs={docsAll.length}
      shipmentStatusBreakdown={shipmentStatusBreakdown}
      carrierBreakdown={carrierBreakdown}
      shipmentExceptions={shipmentExceptions}
      delayedShipments={delayedShipments}
      valueInMotionGbp={valueInMotion}
      fulfilmentRows={fulfilmentRows}
      recentMessages={recentMessages}
    />
  );
}
