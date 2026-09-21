/**
 * §Phase 7C — Admin Operations Overview (dashboard redesign).
 *
 * Operational command centre, not a wall of decorative cards. Every number is
 * derived from real application data at render time (React Query hooks over
 * the canonical demo store / Supabase repositories) — no fabricated trends,
 * no hardcoded counts, no invented business metrics.
 *
 * Hierarchy (single page, no department-tab silos):
 *   1. Page context      — PageHeader (h1) + derived operational summary
 *   2. At a glance       — compact KPI band (one surface, hairline cells)
 *   3. Needs attention   — severity-sorted actionable exceptions
 *   4. Next actions      — operator quick actions to existing destinations
 *   5. Fulfilment motion — live shipments / POs awaiting fulfilment
 *   6. Recent comms      — latest real message threads, human-reply flags
 *
 * Tenant/RBAC: this is the ADMIN overview — it aggregates the whole portfolio
 * (admin tier has full access). All drill-downs use existing AdminShell view
 * ids; the Phase 6 shell keeps enforcing nav visibility + render guards.
 *
 * `department` is retained for AdminShell call-site compatibility (the old
 * department-tab silo was removed in this redesign; the prop is unused).
 */
import { useCallback, useMemo, useState } from 'react';
import {
  useBrands,
  useCatalogSubmissions,
  useCommissions,
  useComplianceDocuments,
  useContracts,
  useDeductions,
  useMessages,
  usePurchaseOrders,
  useShipmentsAll,
} from '@/data/queries';
import { computeBrandNetShare, normalisePayoutTrack, resolveCommissionRatePct } from '@/lib/billing/payouts';
import { demoCommerceInvoices, demoCommercePayments } from '@/data/demoStore';
import { renewalUrgency } from '@/lib/contracts';
import { demoTickets } from '@/lib/helpdesk/ticketStore';
import { Alert, Button, EmptyState, StatusBadge, Skeleton } from '@/components/ui';
import type { StatusTone } from '@/components/ui';
import {
  ActivityFeed,
  ContextPanel,
  MetricBand,
  PipelineTrack,
  Queue,
  SegmentedControl,
  WorkspaceFrame,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceSection,
  type MetricTileData,
  type PipelineStageData,
  type QueueRowData,
} from '@/components/shared/workspace';
import {
  MercentaBars,
  MercentaDoughnut,
  MercentaLineChart,
} from '@/components/shared/charts/MercentaCharts';
import { STATUS_LABELS } from '@/types';
import type { AdminDepartment, ShipmentStatus } from '@/types';
import type { PaletteDomain } from '@/config/themes';
import { CommandCentre } from './CommandCentre';
import { ArrowRight, CreditCard, FileCheck2, FileText, LifeBuoy, Package } from 'lucide-react';

const PO_AWAITING: ReadonlySet<string> = new Set(['received', 'under_review']);
const PO_IN_FLIGHT: ReadonlySet<string> = new Set([
  'accepted',
  'ready_to_fulfil',
  'shipped',
  'delivered',
]);
const REQUIRED_DOC_TYPES: readonly string[] = [
  'letter_of_authorization',
  'product_safety_ukca',
  'insurance_certificate',
  'brand_registry_confirmation',
];
const URGENCY_LABEL: Record<string, string> = {
  expired: 'EXPIRED',
  '7d': '≤7 DAYS',
  '30d': '≤30 DAYS',
  '60d': '≤60 DAYS',
};

export function AdminDashboard({
  onNavigate,
  department,
}: {
  /** @deprecated kept for AdminShell call-site compatibility — unused by the new overview. */
  department?: AdminDepartment;
  onNavigate?: (view: string) => void;
}) {
  void department;
  /** §UI/UX Wave 2 — operator display preferences (presentation only). */
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  const [groupAttention, setGroupAttention] = useState(true);
  /** Navigate to an existing shell view — no-op when rendered without a shell. */
  const go = useCallback((view: string) => () => onNavigate?.(view), [onNavigate]);

  const brandsQuery = useBrands();
  const posQuery = usePurchaseOrders();
  const docsQuery = useComplianceDocuments();
  const contractsQuery = useContracts();
  const messagesQuery = useMessages();
  const shipmentsQuery = useShipmentsAll();
  const deductionsQuery = useDeductions();
  // §Phase E5 (G5) — the canonical catalog-submission state (E3).
  const submissionsQuery = useCatalogSubmissions();
  // §Phase D6 — the canonical commission/payout state (the payout tile below).
  const commissionsQuery = useCommissions();

  /**
   * Stable snapshot of the resolved query data. Arrays are memoised so derived
   * useMemo hooks below keep stable dependencies (exhaustive-deps).
   */
  const brandsData = brandsQuery.data;
  const posData = posQuery.data;
  const docsData = docsQuery.data;
  const contractsData = contractsQuery.data;
  const messagesData = messagesQuery.data;
  const shipmentsData = shipmentsQuery.data;
  const deductionsData = deductionsQuery.data;
  const submissionsData = submissionsQuery.data;
  const commissionsData = commissionsQuery.data;
  const q = useMemo(() => ({
    brands: brandsData?.data ?? [] as NonNullable<typeof brandsData>['data'],
    posAll: posData?.data ?? [] as NonNullable<typeof posData>['data'],
    docsAll: docsData?.data ?? [] as NonNullable<typeof docsData>['data'],
    contractsAll: contractsData?.data ?? [] as NonNullable<typeof contractsData>['data'],
    messagesAll: messagesData?.data ?? [] as NonNullable<typeof messagesData>['data'],
    shipmentsAll: shipmentsData?.data ?? [] as NonNullable<typeof shipmentsData>['data'],
    deductionsAll: deductionsData?.data ?? [] as NonNullable<typeof deductionsData>['data'],
    submissionsAll: submissionsData?.data ?? [] as NonNullable<typeof submissionsData>['data'],
    commissionsAll: commissionsData?.data ?? [] as NonNullable<typeof commissionsData>['data'],
  }), [
    brandsData,
    posData,
    docsData,
    contractsData,
    messagesData,
    shipmentsData,
    deductionsData,
    submissionsData,
    commissionsData,
  ]);
  const {
    brands,
    posAll,
    docsAll,
    contractsAll,
    messagesAll,
    shipmentsAll,
    deductionsAll,
    submissionsAll,
    commissionsAll,
  } = q;

  const dataReady = posAll.length > 0 && brands.length > 0;
  const anyError =
    brandsQuery.isError ||
    posQuery.isError ||
    docsQuery.isError ||
    contractsQuery.isError ||
    messagesQuery.isError ||
    shipmentsQuery.isError ||
    submissionsQuery.isError ||
    commissionsQuery.isError ||
    deductionsQuery.isError;
  const loading =
    !dataReady &&
    (brandsQuery.isPending ||
      posQuery.isPending ||
      docsQuery.isPending ||
      contractsQuery.isPending ||
      messagesQuery.isPending ||
      shipmentsQuery.isPending ||
      deductionsQuery.isPending);

  const brandName = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of brands) m.set(b.id, b.profile?.businessName ?? b.id);
    return m;
  }, [brands]);

  /* ── Real, derivable operational measures (no invented metrics) ──────── */
  const posAwaitingAction = posAll.filter((p) => PO_AWAITING.has(p.status));
  const awaitingValue = posAwaitingAction.reduce((sum, p) => sum + p.poValue, 0);
  const posInFulfilment = posAll.filter((p) => PO_IN_FLIGHT.has(p.status));

  const docsPending = docsAll.filter(
    (d) => d.status === 'under_review' || d.status === 'uploaded'
  );
  const brandsWithPendingDocs = new Set(docsPending.map((d) => d.brandId)).size;

  /** Gate: every required doc approved AND a signed/active contract (existing rule). */
  const complianceCleared = brands.filter((b) => {
    const brandDocs = docsAll.filter((d) => d.brandId === b.id);
    const hasContract = contractsAll.some(
      (c) => c.brandId === b.id && (c.status === 'signed' || c.status === 'active')
    );
    return (
      REQUIRED_DOC_TYPES.every((t) =>
        brandDocs.some((d) => d.type === t && d.status === 'approved')
      ) &&
      hasContract
    );
  }).length;
  const complianceBlocked = Math.max(brands.length - complianceCleared, 0);

  const nowIso = new Date().toISOString();
  const renewalsDue = contractsAll
    .map((c) => ({ c, urgency: renewalUrgency(c.renewalDate, nowIso) }))
    .filter(({ urgency }) => urgency !== 'ok');
  const earliestRenewal =
    renewalsDue.length > 0 ? renewalsDue.map((r) => r.c.renewalDate).sort()[0] : '';

  const activeTickets = demoTickets.filter(
    (t) => t.status === 'open' || t.status === 'pending'
  );
  const urgentTickets = activeTickets.filter(
    (t) => t.priority === 'urgent' || t.priority === 'high'
  );

  const openDeductions = deductionsAll.filter(
    (d) => d.status === 'open' || d.status === 'disputed'
  );

  /**
   * §Phase E5 (G5) — canonical catalogue + commerce measures.
   *
   * DERIVED from the E3 submission store and the E4 commerce stores (no invented
   * metrics, no duplicate store). Empty state honestly produces no rows.
   */
  const rejectedSubmissions = submissionsAll.filter((s) => s.status === 'rejected');
  const commerceInvoicesPending = demoCommerceInvoices.filter(
    (i) => i.status === 'issued' && !demoCommercePayments.some((p) => p.invoiceId === i.id)
  );

  /**
   * §Phase D6 — pending brand payouts, DERIVED from the canonical commission
   * store with the canonical fee maths (no invented money, no second store).
   * The settlement destination is Super Admin → Accounting → Brand Payouts.
   */
  const brandTrackById = useMemo(() => {
    const m = new Map<string, 'direct_fulfillment' | 'financed'>();
    for (const b of brands) m.set(b.id, normalisePayoutTrack(b.track));
    return m;
  }, [brands]);
  const netPayoutOf = useCallback(
    (c: { poValue: number; commissionRate: number; commissionAmount: number; brandId: string }) =>
      computeBrandNetShare({
        poValue: c.poValue,
        commissionRatePct: resolveCommissionRatePct({
          commissionRate: c.commissionRate,
          commissionAmount: c.commissionAmount,
          poValue: c.poValue,
        }),
        fulfillmentTrack: brandTrackById.get(c.brandId) ?? 'financed',
      }),
    [brandTrackById]
  );
  const pendingPayouts = commissionsAll.filter((c) => c.status !== 'paid');
  const pendingPayoutValue = pendingPayouts.reduce((s, c) => s + netPayoutOf(c), 0);

  const kpis: MetricTileData[] = [
    {
      id: 'pending-pos',
      label: 'POs awaiting action',
      value: String(posAwaitingAction.length),
      tone: posAwaitingAction.length > 0 ? 'warning' : 'success',
      statusText: posAwaitingAction.length > 0 ? 'Action needed' : 'None pending',
      context: `£${awaitingValue.toLocaleString()} open value`,
      onOpen: go('purchase_orders_admin'),
    },
    {
      id: 'in-fulfilment',
      label: 'POs in fulfilment',
      value: String(posInFulfilment.length),
      tone: posInFulfilment.length > 0 ? 'info' : 'neutral',
      statusText: posInFulfilment.length > 0 ? 'Active' : 'No active POs',
      context:
        shipmentsAll.length > 0 ? `${shipmentsAll.length} live shipments` : 'No shipments created yet',
      // §Phase E5 (G5) — REAL DEFECT FIXED: this drilled to Fulfillment Track,
      // which is the brand score/track-placement surface, not shipments. The
      // fulfilment destination is Logistics Control.
      onOpen: go('logistics'),
    },
    {
      id: 'docs-pending',
      label: 'Compliance docs pending',
      value: String(docsPending.length),
      tone: docsPending.length > 0 ? 'warning' : 'success',
      statusText: docsPending.length > 0 ? 'Review needed' : 'All reviewed',
      context: `${brandsWithPendingDocs} brand(s) affected`,
      onOpen: go('compliance'),
    },
    {
      id: 'gate',
      label: 'Brands compliance-gate cleared',
      value: `${complianceCleared} / ${brands.length}`,
      tone: complianceBlocked === 0 ? 'success' : 'info',
      statusText: complianceBlocked === 0 ? 'All clear' : `${complianceBlocked} not cleared`,
      context: 'Required docs + signed contract',
      onOpen: go('compliance'),
    },
    {
      id: 'renewals',
      label: 'Contract renewals due',
      value: String(renewalsDue.length),
      tone:
        renewalsDue.some((r) => r.urgency === 'expired')
          ? 'danger'
          : renewalsDue.length > 0
            ? 'warning'
            : 'success',
      statusText:
        renewalsDue.some((r) => r.urgency === 'expired')
          ? 'Expired'
          : renewalsDue.length > 0
            ? 'Inside window'
            : 'None due',
      context:
        renewalsDue.length > 0
          ? `soonest ${earliestRenewal}`
          : 'Next renewals beyond 60 days',
      onOpen: go('contracts_admin'),
    },
    {
      id: 'tickets',
      label: 'Open support tickets',
      value: String(activeTickets.length),
      tone:
        urgentTickets.some((t) => t.priority === 'urgent')
          ? 'danger'
          : activeTickets.length > 0
            ? 'warning'
            : 'success',
      statusText:
        urgentTickets.some((t) => t.priority === 'urgent')
          ? 'Urgent'
          : activeTickets.length > 0
            ? 'Open'
            : 'Inbox clear',
      context: `${urgentTickets.length} urgent / high priority`,
      onOpen: go('helpdesk'),
    },
    {
      id: 'payouts-pending',
      label: 'Brand payouts pending',
      value: String(pendingPayouts.length),
      tone: pendingPayouts.length > 0 ? 'warning' : 'success',
      statusText: pendingPayouts.length > 0 ? 'Settle in Accounting' : 'All settled',
      context: `£${pendingPayoutValue.toFixed(2)} net owed to brands`,
      onOpen: go('super_admin'),
    },
  ];

  /* ── §UI/UX Wave 2 — domain binding, pipeline and REAL chart series ──────
   * Every value below is DERIVED from the same canonical stores the sections
   * above use. No invented metric, no decorative chart: if the store is empty
   * the chart is honestly empty. Hue → domain comes from
   * src/config/themes.ts (`DOMAIN_COLOURS`), never a local hex.
   */
  const KPI_DOMAIN: Record<string, PaletteDomain> = {
    'pending-pos': 'orders',
    'in-fulfilment': 'logistics',
    'docs-pending': 'compliance',
    gate: 'compliance',
    renewals: 'compliance',
    tickets: 'communications',
    'payouts-pending': 'finance',
  };
  const kpiTiles: MetricTileData[] = kpis.map((k) => ({
    ...k,
    domain: KPI_DOMAIN[k.id] ?? 'orders',
    size: k.id === 'pending-pos' ? 'hero' : 'default',
  }));

  /** PO pipeline: the real status families this platform moves work through. */
  const pipelineStages: PipelineStageData[] = useMemo(() => {
    const buckets: { id: string; label: string; domain: PaletteDomain; statuses: string[] }[] = [
      { id: 'awaiting', label: 'Awaiting action', domain: 'orders', statuses: ['received', 'under_review'] },
      { id: 'committed', label: 'Committed', domain: 'catalogue', statuses: ['accepted', 'ready_to_fulfil'] },
      { id: 'in-transit', label: 'In transit', domain: 'logistics', statuses: ['shipped'] },
      { id: 'delivered', label: 'Delivered', domain: 'finance', statuses: ['delivered'] },
      { id: 'closed', label: 'Closed / other', domain: 'intelligence', statuses: [] },
    ];
    const classified = new Set(buckets.flatMap((b) => b.statuses));
    const total = Math.max(1, posAll.length);
    return buckets.map((b) => {
      const rows =
        b.statuses.length === 0
          ? posAll.filter((p) => !classified.has(p.status))
          : posAll.filter((p) => b.statuses.includes(p.status));
      return {
        id: b.id,
        label: b.label,
        count: rows.length,
        share: rows.length / total,
        domain: b.domain,
        attention: b.id === 'awaiting' && rows.length > 0,
      };
    });
  }, [posAll]);

  /** Real order-value time series (PO `orderDate`), newest 6 months. */
  const orderValueSeries = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const p of posAll) {
      const month = (p.orderDate ?? '').slice(0, 7);
      if (!month) continue;
      byMonth.set(month, (byMonth.get(month) ?? 0) + p.poValue);
    }
    const months = [...byMonth.keys()].sort().slice(-6);
    const points = months.map((m) => ({
      label: m.slice(5) + '/' + m.slice(2, 4),
      value: Math.round(byMonth.get(m) ?? 0),
    }));
    const orderCount = months.map(
      (m) => posAll.filter((p) => (p.orderDate ?? '').slice(0, 7) === m).length
    );
    return [
      { name: 'Order value (£)', points },
      ...(points.length > 0
        ? [
            {
              name: 'Orders (#)',
              points: points.map((p, i) => ({ label: p.label, value: orderCount[i] ?? 0 })),
            },
          ]
        : []),
    ];
  }, [posAll]);

  /** Real value by brand (top 6 by purchase-order value). */
  const valueByBrand = useMemo(() => {
    const byBrand = new Map<string, number>();
    for (const p of posAll) byBrand.set(p.brandId, (byBrand.get(p.brandId) ?? 0) + p.poValue);
    return [...byBrand.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, value]) => ({
        label: (brandName.get(id) ?? id).split(' ')[0] ?? id,
        value: Math.round(value),
      }));
  }, [posAll, brandName]);

  /** Real compliance-document posture (documents by status). */
  const docStatusSegments = useMemo(() => {
    const order = ['approved', 'under_review', 'uploaded', 'missing', 'expired', 'rejected'];
    const counts = new Map<string, number>();
    for (const d of docsAll) counts.set(d.status, (counts.get(d.status) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([status, value]) => ({ label: status.replace(/_/g, ' '), value }));
  }, [docsAll]);

  /* ── Exceptions / attention — severity ordered, actionable ────────────── */
  const attention: {
    id: string;
    group: string;
    tone: StatusTone;
    statusLabel: string;
    title: string;
    meta?: string;
    onOpen: () => void;
  }[] = [];

  urgentTickets.slice(0, 3).forEach((t) => {
    attention.push({
      id: `ticket-${t.id}`,
      group: 'Support',
      tone: t.priority === 'urgent' ? 'danger' : 'warning',
      statusLabel: t.priority === 'urgent' ? 'URGENT' : 'HIGH',
      title: t.subject,
      meta: `${brandName.get(t.brandId) ?? t.brandId} · ${t.id} · ${t.lastMessagePreview}`,
      onOpen: go('helpdesk'),
    });
  });

  posAwaitingAction.forEach((p) => {
    attention.push({
      id: `po-${p.id}`,
      group: 'Purchase orders',
      tone: 'warning',
      statusLabel: 'ACTION NEEDED',
      title: `${p.poNumber} — ${brandName.get(p.brandId) ?? p.brandId}`,
      meta: `£${p.poValue.toLocaleString()} · ${p.status.replace(/_/g, ' ')}`,
      onOpen: go('purchase_orders_admin'),
    });
  });

  const pendingBrandIds = [...new Set(docsPending.map((d) => d.brandId))];
  pendingBrandIds.slice(0, 4).forEach((bid) => {
    const pending = docsPending.filter((d) => d.brandId === bid);
    attention.push({
      id: `docs-${bid}`,
      group: 'Compliance',
      tone: 'warning',
      statusLabel: 'REVIEW NEEDED',
      title: `${brandName.get(bid) ?? bid} — ${pending.length} document${pending.length > 1 ? 's' : ''} pending`,
      meta: pending.map((d) => d.type.replace(/_/g, ' ')).slice(0, 2).join(' · '),
      onOpen: go('compliance'),
    });
  });
if (pendingBrandIds.length > 4) {
    attention.push({
      id: 'docs-more',
      group: 'Compliance',
      tone: 'info',
      statusLabel: 'MORE',
      title: `${pendingBrandIds.length - 4} more brand(s) with pending documents`,
      meta: 'View the full queue in Compliance Approvals',
      onOpen: go('compliance'),
    });
  }

  renewalsDue.forEach(({ c, urgency }) => {
    attention.push({
      id: `renewal-${c.id}`,
      group: 'Contracts',
      tone: urgency === 'expired' ? 'danger' : 'warning',
      statusLabel: URGENCY_LABEL[urgency] ?? 'DUE',
      title: `${brandName.get(c.brandId) ?? c.brandId} — distribution agreement`,
      meta: `renews ${c.renewalDate}`,
      onOpen: go('contracts_admin'),
    });
  });

  openDeductions.slice(0, 3).forEach((d) => {
    attention.push({
      id: `ded-${d.id}`,
      group: 'Finance',
      tone: d.status === 'disputed' ? 'danger' : 'warning',
      statusLabel: d.status === 'disputed' ? 'DISPUTED' : 'OPEN',
      title: `${d.type.replace(/_/g, ' ')} — £${d.amountGbp.toFixed(2)}`,
      meta: `${brandName.get(d.brandId) ?? d.brandId} · ${d.purchaseOrderId} · ${d.date}`,
      onOpen: go('billing'),
    });
  });
  if (openDeductions.length > 3) {
    attention.push({
      id: 'ded-more',
      group: 'Finance',
      tone: 'info',
      statusLabel: 'MORE',
      title: `${openDeductions.length - 3} more deduction(s) unresolved`,
      meta: 'Review the full ledger in Billing',
      onOpen: go('billing'),
    });
  }

  /* §Phase D6 — pending brand payouts are money the platform owes, so they belong
     in the SAME Finance attention band as deductions. Destination is the real
     settlement surface (Super Admin → Accounting → Brand Payouts). */
  pendingPayouts.slice(0, 3).forEach((c) => {
    attention.push({
      id: `payout-${c.id}`,
      group: 'Finance',
      tone: 'warning',
      statusLabel: 'PAYOUT PENDING',
      title: `${brandName.get(c.brandId) ?? c.brandId} — £${netPayoutOf(c).toFixed(2)} net payout`,
      meta: `${c.purchaseOrderId} · Super Admin → Accounting → Brand Payouts`,
      onOpen: go('super_admin'),
    });
  });
  if (pendingPayouts.length > 3) {
    attention.push({
      id: 'payout-more',
      group: 'Finance',
      tone: 'info',
      statusLabel: 'MORE',
      title: `${pendingPayouts.length - 3} more brand payout(s) pending`,
      meta: 'Settle them in Super Admin → Accounting → Brand Payouts',
      onOpen: go('super_admin'),
    });
  }

  /* §Phase E5 (G5) — canonical catalogue + commerce attention rows. Additive:
     existing row ids/prefixes (attention-po-*, attention-ded-*, …) are
     deliberately unchanged so existing browser assertions stay valid. */
  rejectedSubmissions.slice(0, 3).forEach((s) => {
    attention.push({
      id: `sub-${s.id}`,
      group: 'Catalogue',
      tone: 'danger',
      statusLabel: 'REJECTED',
      title: `${s.productName} — ${s.sku}`,
      meta: `${brandName.get(s.brandId) ?? s.brandId} · ${s.rejectionReason ?? 'no reason recorded'}${s.simulated ? ' · (sim)' : ''}`,
      onOpen: go('catalog'),
    });
  });
  if (rejectedSubmissions.length > 3) {
    attention.push({
      id: 'sub-more',
      group: 'Catalogue',
      tone: 'info',
      statusLabel: 'MORE',
      title: `${rejectedSubmissions.length - 3} more rejected submission(s)`,
      meta: 'Review the full catalogue in Global Catalog',
      onOpen: go('catalog'),
    });
  }

  commerceInvoicesPending.slice(0, 3).forEach((i) => {
    attention.push({
      id: `commerce-inv-${i.id}`,
      group: 'Commerce',
      tone: 'warning',
      statusLabel: 'SIM',
      title: `Simulated invoice ${i.number} awaiting payment`,
      meta: `${brandName.get(i.brandId) ?? i.brandId} · £${i.subtotalGbp.toFixed(2)} · (sim) — no live payment provider contacted`,
      onOpen: go('retail_pipeline'),
    });
  });

  /* ── Next actions — operator quick actions to existing destinations ───── */
  const actions: {
    id: string;
    label: string;
    count: number;
    desc: string;
    icon: typeof Package;
  }[] = [
    { id: 'purchase_orders_admin', label: 'Review purchase orders', count: posAwaitingAction.length, desc: 'awaiting action', icon: Package },
    { id: 'compliance', label: 'Approve compliance documents', count: docsPending.length, desc: 'pending review', icon: FileCheck2 },
    { id: 'contracts_admin', label: 'Run contract renewals', count: renewalsDue.length, desc: 'inside window', icon: FileText },
    { id: 'helpdesk', label: 'Handle support tickets', count: activeTickets.length, desc: 'open tickets', icon: LifeBuoy },
    { id: 'billing', label: 'Review deductions & billing', count: openDeductions.length, desc: 'unresolved', icon: CreditCard },
  ];

  /* ── Fulfilment in motion ────────────────────────────────────────────── */
  const fulfilmentRows = useMemo(() => {
    if (shipmentsAll.length > 0) {
      return shipmentsAll.map((s) => ({
        id: s.id,
        ref: s.reference,
        title: s.title,
        meta: `${s.carrier.toUpperCase()} · ${s.origin} → ${s.destination}`,
        status: STATUS_LABELS[s.status as ShipmentStatus] ?? s.status,
        tone:
          s.status === 'live_amazon' || s.status === 'uk_customs_cleared'
            ? ('success' as StatusTone)
            : ('info' as StatusTone),
        onOpen: go('logistics'),
      }));
    }
    return posInFulfilment.map((p) => ({
      id: p.id,
      ref: p.poNumber,
      title: brandName.get(p.brandId) ?? p.brandId,
      meta: `awaiting fulfilment · ${p.status.replace(/_/g, ' ')}`,
      status: p.status.replace(/_/g, ' ').toUpperCase(),
      tone: 'info' as StatusTone,
      onOpen: go('purchase_orders_admin'),
    }));
  }, [shipmentsAll, posInFulfilment, brandName, go]);

  /* ── Recent communications (real message store) ──────────────────────── */
  const recentMessages = useMemo(
    () =>
      [...messagesAll]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6),
    [messagesAll]
  );
  if (loading) {
    return (
      <div data-testid="dashboard-loading" aria-busy="true">
        <WorkspaceFrame>
          <WorkspaceHeader title="Operations Overview" description="Loading operational state…" />
          <MetricBand items={kpiTiles} columns={4} loading />
          <div className="mt-4 space-y-2.5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </WorkspaceFrame>
      </div>
    );
  }

  if (!dataReady && (anyError || (posAll.length === 0 && docsAll.length === 0))) {
    return (
      <div data-testid="dashboard-error">
        <WorkspaceFrame>
          <WorkspaceHeader
            title="Operations Overview"
            description="Operational state could not be loaded."
          />
          <Alert tone="error" title="Dashboard data unavailable">
            The overview could not load purchase orders, brands or compliance documents. Check the
            Monitoring view for integration health, then return to the overview.
          </Alert>
          <Button variant="secondary" className="mt-3" onClick={go('monitoring')}>
            Open Monitoring
          </Button>
        </WorkspaceFrame>
      </div>
    );
  }

  return (
    <div data-testid="dashboard-loaded">
      <WorkspaceFrame>
        <WorkspaceHeader
          eyebrow="Admin Hub · Portfolio"
          title="Operations Overview"
          description={`${brands.length} brands on platform · ${posAll.length} purchase orders · ${docsAll.length} compliance documents · ${messagesAll.length} messages in thread history`}
          status={
            posAwaitingAction.length > 0 ? (
              <StatusBadge tone="warning" dataStatus="warning">
                {posAwaitingAction.length} awaiting action
              </StatusBadge>
            ) : (
              <StatusBadge tone="success" dataStatus="success">
                Queue clear
              </StatusBadge>
            )
          }
          meta={
            <>
              <span className="font-mono text-ds-label text-zinc-500">
                £{awaitingValue.toLocaleString()} open PO value
              </span>
              <span className="font-mono text-ds-label text-zinc-500">
                {shipmentsAll.length} shipments in motion
              </span>
              <span className="font-mono text-ds-label text-zinc-500">
                {renewalsDue.length} renewals in window
              </span>
            </>
          }
          actions={
            <Button onClick={go('purchase_orders_admin')}>
              Review purchase orders <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          }
          toolbar={
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Density
              </span>
              <SegmentedControl
                ariaLabel="Row density"
                active={density}
                onSelect={(v) => setDensity(v as 'compact' | 'comfortable')}
                items={[
                  { id: 'compact', label: 'Compact' },
                  { id: 'comfortable', label: 'Comfortable' },
                ]}
              />
              <button
                type="button"
                onClick={() => setGroupAttention((g) => !g)}
                aria-pressed={groupAttention}
                data-testid="toggle-group-attention"
                className="rounded-ds-sm border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-ds-label font-medium text-zinc-400 transition-ds duration-ds-fast hover:text-zinc-200"
              >
                {groupAttention ? 'Group rows' : 'Flat rows'}
              </button>
              <span className="hidden font-mono text-ds-micro text-zinc-600 sm:inline">
                ⌘K for records and destinations
              </span>
            </div>
          }
        />

        {/* §32 (M13 Phase 11) — the founder's command centre: what needs attention
            now and the exact next action, with tab-aware CTA routing. */}
        <CommandCentre onNavigate={onNavigate} />

        {anyError && (
          <Alert tone="error" title="Some dashboard data is unavailable" className="mt-3">
            A datasource reported an error; seed data is shown where available. Check Monitoring for
            integration health.
          </Alert>
        )}

        <WorkspaceGrid
          rail={
            <>
              <ContextPanel
                title="Compliance posture"
                action={
                  <Button variant="ghost" size="sm" onClick={go('compliance')}>
                    Open
                  </Button>
                }
              >
                {docStatusSegments.length === 0 ? (
                  <p className="text-xs text-zinc-500">No compliance documents recorded yet.</p>
                ) : (
                  <MercentaDoughnut
                    segments={docStatusSegments}
                    centerValue={String(docsAll.length)}
                    centerLabel="documents"
                    legend
                    ariaLabel={`Compliance documents by status: ${docStatusSegments
                      .map((s) => `${s.label} ${s.value}`)
                      .join(', ')}`}
                  />
                )}
              </ContextPanel>

              <ContextPanel
                title="Activity"
                action={
                  <Button variant="ghost" size="sm" onClick={go('messages')}>
                    All
                  </Button>
                }
              >
                <ActivityFeed
                  entries={recentMessages.slice(0, 5).map((m) => ({
                    id: m.id,
                    title: m.subject ?? m.body,
                    meta: `${brandName.get(m.brandId) ?? m.brandId} · ${m.channel.toUpperCase()}`,
                    at: m.createdAt,
                    tone: m.requiresHuman ? 'warning' : 'info',
                    onOpen: go('messages'),
                  }))}
                  empty={<p className="text-xs text-zinc-500">No messages recorded yet.</p>}
                />
              </ContextPanel>
            </>
          }
        >
          <WorkspaceSection
            title="Portfolio at a glance"
            description="Derived live from purchase orders, compliance, contracts, support and billing data."
            domain="orders"
          >
            <MetricBand items={kpiTiles} columns={4} />
          </WorkspaceSection>

          <WorkspaceSection
            title="Order pipeline"
            description="Where every purchase order currently sits. Select a stage to open its queue."
            domain="orders"
          >
            <PipelineTrack stages={pipelineStages} onSelect={() => go('purchase_orders_admin')()} />
          </WorkspaceSection>

          <WorkspaceSection
            title="Needs your attention"
            description="Priority-ordered exceptions across the portfolio. Each row routes to the existing destination view."
            domain="risk"
            action={
              activeTickets.length > 0 ? (
                <Button variant="secondary" size="sm" onClick={go('helpdesk')}>
                  Open Helpdesk <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Button>
              ) : undefined
            }
          >
            {attention.length === 0 ? (
              <EmptyState
                title="No open exceptions"
                description="Purchase orders, compliance documents, contracts, deductions and support tickets are all clear."
              />
            ) : (
              <Queue
                rows={attention.map((a, i) => ({
                  id: a.id,
                  testId: `attention-${a.id}`,
                  group: groupAttention && a.group !== attention[i - 1]?.group ? a.group : undefined,
                  status: { tone: a.tone, label: a.statusLabel },
                  title: a.title,
                  meta: a.meta,
                  domain: 'risk',
                  onOpen: a.onOpen,
                }))}
                density={density}
              />
            )}
          </WorkspaceSection>

          <WorkspaceSection
            title="Next actions"
            description="Highest-value operator moves, pre-counted from current data."
            domain="intelligence"
          >
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {actions.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={go(a.id)}
                    data-testid={`action-${a.id}`}
                    className="flex min-h-[36px] items-center gap-2.5 rounded-ds-md border border-white/[0.06] bg-ink-850 px-3.5 py-2.5 text-left transition-ds duration-ds-fast hover:border-palette-indigo/50 hover:bg-white/[0.02]"
                  >
                    <Icon className="h-4 w-4 flex-shrink-0 text-feature-intel" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-medium text-white">{a.label}</span>
                      <span className="block text-ds-label text-zinc-500">
                        {a.count} {a.desc}
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="h-3.5 w-3.5 flex-shrink-0 text-zinc-500"
                    />
                  </button>
                );
              })}
            </div>
          </WorkspaceSection>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <WorkspaceSection
              title="Order value by month"
              description="Real purchase-order value and order count by order date (latest six months)."
              domain="finance"
            >
              {orderValueSeries[0]?.points.length === 0 ? (
                <EmptyState
                  title="No dated purchase orders yet"
                  description="Once purchase orders carry an order date this chart plots real value and volume."
                />
              ) : (
                <div className="px-2 pb-2 pt-3">
                  <MercentaLineChart
                    series={orderValueSeries}
                    height={180}
                    yFormat={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                    ariaLabel={`Purchase order value by month: ${orderValueSeries[0].points
                      .map((p) => `${p.label} £${p.value}`)
                      .join(', ')}`}
                  />
                </div>
              )}
            </WorkspaceSection>

            <WorkspaceSection
              title="Value by brand"
              description="Top six brands by purchase-order value — click through to Purchase Orders."
              domain="catalogue"
            >
              {valueByBrand.length === 0 ? (
                <EmptyState
                  title="No purchase-order value yet"
                  description="Brand-level order value appears here as soon as purchase orders exist."
                />
              ) : (
                <div className="px-2 pb-2 pt-3">
                  <MercentaBars
                    bars={valueByBrand}
                    height={180}
                    paletteIndex={0}
                    valueFormat={(v) => (v >= 1000 ? `£${Math.round(v / 1000)}k` : `£${v}`)}
                    ariaLabel={`Purchase order value by brand: ${valueByBrand
                      .map((b) => `${b.label} £${b.value}`)
                      .join(', ')}`}
                  />
                </div>
              )}
            </WorkspaceSection>
          </div>

          <WorkspaceSection
            title="Fulfilment in motion"
            description={
              shipmentsAll.length > 0
                ? 'Aggregated live shipments across all carriers.'
                : 'Accepted and ready-to-fulfil POs awaiting dispatch.'
            }
            domain="logistics"
          >
            {fulfilmentRows.length === 0 ? (
              <EmptyState
                title="Nothing in fulfilment right now"
                description="Accepted and ready-to-fulfil purchase orders will appear here, and shipments once a PO moves into dispatch."
              />
            ) : (
              <Queue
                rows={fulfilmentRows.map((r) => ({
                  id: r.id,
                  ref: r.ref,
                  title: r.title,
                  meta: r.meta,
                  status: { tone: r.tone, label: r.status },
                  domain: 'logistics',
                  onOpen: r.onOpen,
                }))}
              />
            )}
          </WorkspaceSection>

          <WorkspaceSection
            title="Recent communications"
            description="Latest message threads from the shared inbox, newest first."
            domain="communications"
            action={
              recentMessages.length > 0 ? (
                <Button variant="secondary" size="sm" onClick={go('messages')}>
                  Open Messages <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Button>
              ) : undefined
            }
          >
        {recentMessages.length === 0 ? (
          <EmptyState
            title="No recent communications"
            description="New inbound and outbound message threads will appear here as they are logged."
          />
        ) : (
          <Queue
            rows={recentMessages.map((m) => ({
              id: m.id,
              status: {
                tone: m.requiresHuman ? 'warning' : m.direction === 'inbound' ? 'info' : 'neutral',
                label: m.requiresHuman ? 'HUMAN REPLY' : m.channel.toUpperCase(),
              },
              title: m.subject ?? m.body,
              meta: `${brandName.get(m.brandId) ?? m.brandId} · ${m.direction} · ${m.createdAt
                .slice(0, 16)
                .replace('T', ' ')}`,
              domain: 'communications',
              actionLabel: 'Open',
              onOpen: go('messages'),
            }))}
          />
        )}
          </WorkspaceSection>
        </WorkspaceGrid>
      </WorkspaceFrame>
    </div>
  );
}