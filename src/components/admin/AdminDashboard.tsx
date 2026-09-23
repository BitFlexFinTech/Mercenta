/**
 * §Phase 7C — Admin Overview (dashboard redesign).
 *
 * A READ-ONLY BUSINESS OVERVIEW of Mercenta, not an action surface. Every number
 * is derived from real application data at render time (React Query hooks over
 * the canonical demo store / Supabase repositories) — no fabricated trends, no
 * hardcoded counts, no invented business metrics.
 *
 * Hierarchy (single page, no department-tab silos):
 *   1. Page context      — WorkspaceHeader (h1) + derived operational summary
 *   2. Portfolio at a glance — the BUSINESS POSITION: the money band (open PO
 *      value, recorded revenue, gross profit, contribution margin, receivables),
 *      the operational KPI band (portfolio, orders, compliance, contracts,
 *      support, billing) and the business-volume band (brands, products, POs,
 *      order lines, shipments, operational volume, upcoming payments, fulfilment
 *      exceptions)
 *   3. Order pipeline    — PO stage distribution
 *   4. Financial performance — revenue composition by canonical stream + the
 *      cost base / contribution the figures are derived from
 *   5. Trends            — order value by month, value by brand
 *   6. Logistics status  — shipments by status and carrier (real consignment state)
 *   7. Fulfilment motion — live shipments / POs awaiting fulfilment
 *   8. Recent comms      — latest real message threads, human-reply flags
 *
 * §P2 (2026-09-22) — OVERVIEW = OBSERVE, ADDITIVE ONLY. The Founder's dashboard
 * programme adds the business picture to this surface WITHOUT removing any card:
 * every band existing before P2 is still rendered. The new content is derived
 * from the SAME canonical stores the rest of the platform reads (POs, brands,
 * products, shipments, compliance documents, contracts, messages, commissions,
 * the commerce invoice ledger and the canonical cost model) — no new store, no
 * invented metric, no fabricated trend. Where the store is empty the band says
 * so honestly instead of plotting or implying a shape.
 *
 * §Dashboard-cleanup (2026-09-22) — REMOVED from this surface (consolidation, not
 * relocation): the Command Centre (now rendered on the Control Centre), the
 * "Needs your attention" queue, the "Next actions" tiles and the rail "Activity"
 * panel. Those answered "what needs doing" or repeated the messages summary; the
 * authoritative owners are the work layer (Work Management / Calendar), the
 * Control Centre and the Messages destination. No replacement table was added.
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
  useProducts,
  usePurchaseOrders,
  useShipmentsAll,
} from '@/data/queries';
import { computeBrandNetShare, normalisePayoutTrack, resolveCommissionRatePct } from '@/lib/billing/payouts';
import { renewalUrgency } from '@/lib/contracts';
import { demoTickets } from '@/lib/helpdesk/ticketStore';
import {
  demoCommerceInvoices,
  getCommercePaymentsForInvoice,
} from '@/data/demoStore';
import { INVOICE_TERM_DAYS, addDays } from '@/lib/work/workStore';
import { Alert, Button, EmptyState, StatusBadge, Skeleton } from '@/components/ui';
import type { StatusTone } from '@/components/ui';
import {
  ContextPanel,
  MetricBand,
  PipelineTrack,
  Queue,
  WorkspaceFrame,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceSection,
  type MetricTileData,
  type PipelineStageData,
} from '@/components/shared/workspace';
import {
  MercentaBars,
  MercentaDoughnut,
  MercentaLineChart,
} from '@/components/shared/charts/MercentaCharts';
import { STATUS_LABELS } from '@/types';
import type { AdminDepartment, ShipmentStatus } from '@/types';
import type { PaletteDomain } from '@/config/themes';
import { operatingCostSummary } from '@/lib/costs/costSummary';
import { shipmentStatusPresentation } from '@/lib/statusPresentation';
import { ArrowRight } from 'lucide-react';

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
  /**
   * §Dashboard-cleanup (2026-09-22) — the operator display preferences that
   * existed ONLY for the removed Overview attention queue (row density, row
   * grouping) are gone with it. The queue itself lives on in Work Management and
   * the Control Centre, which own the work list.
   */
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
   * §P2 — the canonical catalog (products with their owning brandId). Read for
   * the business-volume band only ("products listed", "order lines", "units");
   * it is the same query Global Catalog and the brand's Product Catalog read.
   */
  const productsQuery = useProducts();

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
  const commissionsData = commissionsQuery.data;
  const productsData = productsQuery.data;
  /**
   * §Dashboard-cleanup (2026-09-22) — the deductions and catalogue-submission
   * query RESULTS are no longer read by the Overview (their only consumers were
   * the removed attention/next-action surfaces). The queries themselves are kept
   * because they still contribute to the shared `anyError` state; only the
   * unused projections were removed.
   */
  const q = useMemo(() => ({
    brands: brandsData?.data ?? [] as NonNullable<typeof brandsData>['data'],
    posAll: posData?.data ?? [] as NonNullable<typeof posData>['data'],
    docsAll: docsData?.data ?? [] as NonNullable<typeof docsData>['data'],
    contractsAll: contractsData?.data ?? [] as NonNullable<typeof contractsData>['data'],
    messagesAll: messagesData?.data ?? [] as NonNullable<typeof messagesData>['data'],
    shipmentsAll: shipmentsData?.data ?? [] as NonNullable<typeof shipmentsData>['data'],
    commissionsAll: commissionsData?.data ?? [] as NonNullable<typeof commissionsData>['data'],
    /** §P2 — the canonical catalog rows (each carries its owning `brandId`). */
    productsAll: productsData?.data ?? [] as NonNullable<typeof productsData>['data'],
  }), [
    brandsData,
    posData,
    docsData,
    contractsData,
    messagesData,
    shipmentsData,
    commissionsData,
    productsData,
  ]);
  const {
    brands,
    posAll,
    docsAll,
    contractsAll,
    messagesAll,
    shipmentsAll,
    commissionsAll,
    productsAll,
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
    deductionsQuery.isError ||
    // §P2 — the catalog query now feeds the business-volume band.
    productsQuery.isError;
  const loading =
    !dataReady &&
    (brandsQuery.isPending ||
      posQuery.isPending ||
      docsQuery.isPending ||
      contractsQuery.isPending ||
      messagesQuery.isPending ||
      shipmentsQuery.isPending ||
      deductionsQuery.isPending ||
      productsQuery.isPending);

  const brandName = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of brands) m.set(b.id, b.profile?.businessName ?? b.id);
    return m;
  }, [brands]);

  /* ── Real, derivable operational measures (no invented metrics) ──────── */
  const posAwaitingAction = posAll.filter((p) => PO_AWAITING.has(p.status));
  const awaitingValue = posAwaitingAction.reduce((sum, p) => sum + p.poValue, 0);
  const posInFulfilment = posAll.filter((p) => PO_IN_FLIGHT.has(p.status));

  /* ── §P2 — THE BUSINESS PICTURE (every figure derived, nothing invented) ──
   * Each value below is read from a canonical store the platform already owns:
   * the PO store, the catalog, the shipment rows, the commerce invoice ledger
   * and the declared payment terms. No new store, no hardcoded count, no
   * fabricated trend. An empty ledger produces 0 with an honest basis line.
   */
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

  /**
   * RECEIVABLES / UPCOMING PAYMENTS — the P7 definition applied to the CURRENT
   * canonical ledger: an issued invoice with no settled payment is outstanding;
   * its due date is DERIVED from its own issue date plus the declared terms
   * (`INVOICE_TERM_DAYS`, the same constant the work layer and the reminder
   * sweep use). No Vendor Payments API exists (register S14), so a due date can
   * only ever be derived — and it is labelled as derived wherever it is shown.
   */
  const todayIso = new Date().toISOString().slice(0, 10);
  const invoiceDueDate = (issuedAt: string) => addDays(issuedAt.slice(0, 10), INVOICE_TERM_DAYS);
  const unpaidInvoices = demoCommerceInvoices.filter(
    (i) => i.status !== 'paid' && getCommercePaymentsForInvoice(i.id).length === 0
  );
  const receivablesGbp = unpaidInvoices.reduce((s, i) => s + i.subtotalGbp, 0);
  const overdueInvoices = unpaidInvoices.filter((i) => invoiceDueDate(i.issuedAt) < todayIso);
  const dueWithinHorizon = unpaidInvoices.filter(
    (i) => invoiceDueDate(i.issuedAt) <= addDays(todayIso, 30)
  );
  const upcomingPaymentsGbp = dueWithinHorizon.reduce((s, i) => s + i.subtotalGbp, 0);

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

  /**
   * §Dashboard-cleanup (2026-09-22) — REMOVED with the Overview attention queue
   * and next-action tiles, which were their only consumers:
   *   · `openDeductions`        → the deductions ledger is owned by Billing;
   *   · `rejectedSubmissions`   → rejected catalogue submissions are owned by
   *                               Global Catalog;
   *   · `commerceInvoicesPending` → simulated invoices awaiting payment are owned
   *                               by Retail Pipeline.
   * Their destinations are unchanged and still reachable from the shell nav.
   * The underlying queries are untouched (they still feed the shared error state).
   */

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

  /**
   * §Dashboard-cleanup (2026-09-22) — the business figures the Overview was
   * missing. These are NOT new: `operatingCostSummary()` is the canonical derived
   * cost/revenue/contribution model (`src/lib/costs/costSummary.ts`), already
   * rendered in the Control Centre. The Overview surfaces the same canonical
   * numbers so it reads as a business overview rather than only an operations
   * queue. Nothing is recomputed here and nothing is blended: the streams, their
   * sources and the provisional flag all come from that one module.
   */
  const costs = useMemo(() => operatingCostSummary(), []);
  const revenueStreams = costs.revenue.streams.filter((s) => s.gbp > 0);

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
    /*
      §P2 — the money tiles moved into their OWN hero band (below) so the
      business position reads first. Nothing was removed: the three
      §Dashboard-cleanup figures (recorded revenue, gross contribution,
      contribution margin) are unchanged, and two more are ADDED — open PO value
      and receivables. Values come from `operatingCostSummary()` and the
      canonical commerce invoice ledger; each tile states its own basis so a
      provisional figure can never be read as audited.
    */
  ];

  /**
   * §P2 — THE MONEY BAND (hero row). Every figure is derived from a canonical
   * source: open PO value from the PO store, the three business figures from the
   * canonical cost model, and receivables from the commerce invoice ledger using
   * the P7 definition (issued and unpaid) with its due date derived from the
   * declared terms.
   */
  const moneyKpis: MetricTileData[] = [
    {
      id: 'open-po-value',
      label: 'Open PO value',
      value: `£${awaitingValue.toLocaleString('en-GB')}`,
      tone: awaitingValue > 0 ? 'warning' : 'success',
      statusText:
        posAwaitingAction.length > 0
          ? `${posAwaitingAction.length} awaiting action`
          : 'Nothing awaiting action',
      context: `Purchase-order value on ${posAwaitingAction.length} PO(s) received but not yet actioned.`,
      onOpen: go('purchase_orders_admin'),
    },
    {
      id: 'revenue',
      label: 'Recorded revenue',
      value: `£${costs.revenue.totalGbp.toLocaleString('en-GB')}`,
      tone: costs.revenue.totalGbp > 0 ? 'info' : 'neutral',
      statusText: 'Canonical streams',
      context:
        revenueStreams.length > 0
          ? revenueStreams.map((s) => `${s.label}: £${s.gbp.toLocaleString('en-GB')}`).join(' · ')
          : 'No revenue recorded in the canonical streams yet.',
      onOpen: go('super_admin'),
    },
    {
      id: 'contribution',
      label: 'Gross contribution',
      value: `£${costs.contribution.grossGbp.toLocaleString('en-GB')}`,
      tone: costs.contribution.grossGbp >= 0 ? 'success' : 'danger',
      statusText: costs.contribution.provisional ? 'Provisional' : 'Derived',
      context: `Recorded revenue less the monthly operating cost base (£${costs.monthlyTotalGbp.toLocaleString('en-GB')}).`,
      onOpen: go('super_admin'),
    },
    {
      id: 'margin',
      label: 'Contribution margin',
      value: `${costs.contribution.marginPct}%`,
      tone: costs.revenue.totalGbp > 0 ? 'neutral' : 'neutral',
      statusText: costs.contribution.provisional ? 'Provisional' : 'Derived',
      context: 'Gross profit as a share of recorded revenue — provisional until the cost model is founder-approved.',
      onOpen: go('super_admin'),
    },
    {
      id: 'receivables',
      label: 'Receivables',
      value: `£${receivablesGbp.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      tone: overdueInvoices.length > 0 ? 'danger' : receivablesGbp > 0 ? 'info' : 'success',
      statusText:
        unpaidInvoices.length === 0
          ? 'Nothing outstanding'
          : overdueInvoices.length > 0
            ? `${overdueInvoices.length} past terms`
            : `${unpaidInvoices.length} unpaid`,
      context:
        unpaidInvoices.length === 0
          ? 'No issued-and-unpaid invoices recorded in the canonical ledger.'
          : `${unpaidInvoices.length} issued-and-unpaid invoice(s) · due ${INVOICE_TERM_DAYS} days from issue (derived — no Vendor Payments API exists).`,
      // §P2 — Accounting lives inside Super Admin (Accounting → Brand Payouts /
      // receivables); `super_admin` is the real shell view id (there is no
      // `accounting` nav id, and a dead id would be a dead end).
      onOpen: go('super_admin'),
    },
  ];

  /**
   * §P2 — THE BUSINESS-VOLUME BAND. The portfolio's real size: how many brands
   * and products the platform carries, what has been ordered, what is moving and
   * what is owed. Every number is a count or a sum over the canonical stores.
   */
  const businessKpis: MetricTileData[] = [
    {
      id: 'brands',
      label: 'Brands on platform',
      value: String(brands.length),
      tone: 'neutral',
      statusText: complianceBlocked === 0 ? 'All gate-cleared' : `${complianceBlocked} not cleared`,
      context: `${complianceCleared} brand(s) clear the compliance gate (required docs + signed contract).`,
      // §P2 — the brand relationship surface is Brand CRM (`crm`); there is no
      // `brands` shell view id, and a dead id would be a dead end.
      onOpen: go('crm'),
    },
    {
      id: 'products',
      label: 'Products listed',
      value: String(productsAll.length),
      tone: 'neutral',
      statusText: 'Canonical catalog',
      context: `${productsAll.length} SKU(s) across ${productsByBrand} brand(s) in the canonical catalog.`,
      // §P2 — the catalog destination is Global Catalog (`catalog`); there is no
      // `catalog_admin` shell view id, and a dead id would be a dead end.
      onOpen: go('catalog'),
    },
    {
      id: 'pos-count',
      label: 'Purchase orders',
      value: String(posAll.length),
      tone: 'neutral',
      statusText: posInFulfilment.length > 0 ? `${posInFulfilment.length} in fulfilment` : 'None in fulfilment',
      context: `£${lifetimePoValue.toLocaleString('en-GB')} lifetime purchase-order value.`,
      onOpen: go('purchase_orders_admin'),
    },
    {
      id: 'order-lines',
      label: 'Order lines',
      value: String(orderLineCount),
      tone: 'neutral',
      statusText: 'All POs',
      context: `${orderedUnits.toLocaleString('en-GB')} units ordered across ${posAll.length} purchase order(s).`,
      onOpen: go('purchase_orders_admin'),
    },
    {
      id: 'shipments',
      label: 'Shipments',
      value: String(shipmentsAll.length),
      tone: 'neutral',
      statusText: shipmentsAll.length > 0 ? 'In the logistics layer' : 'None created yet',
      context: `£${valueInMotion.toLocaleString('en-GB')} consignment value recorded across all shipments.`,
      onOpen: go('logistics'),
    },
    {
      id: 'volume',
      label: 'Operational volume',
      value: unitsInFulfilment.toLocaleString('en-GB'),
      tone: 'neutral',
      statusText: posInFulfilment.length > 0 ? 'In fulfilment' : 'Nothing in fulfilment',
      context: `Units on the ${posInFulfilment.length} purchase order(s) currently accepted, ready-to-fulfil or shipped.`,
      onOpen: go('logistics'),
    },
    {
      id: 'upcoming-payments',
      label: 'Upcoming payments',
      value: `£${upcomingPaymentsGbp.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      tone: 'info',
      statusText: 'Derived',
      context:
        dueWithinHorizon.length === 0
          ? `No invoice falls due within 30 days at the declared ${INVOICE_TERM_DAYS}-day terms.`
          : `${dueWithinHorizon.length} invoice(s) fall due within 30 days at the declared ${INVOICE_TERM_DAYS}-day terms (derived from the invoice date — no Vendor Payments API exists).`,
      // §P2 — receivables/payments drill into Super Admin → Accounting (the real
      // shell view id); no dead `accounting` id.
      onOpen: go('super_admin'),
    },
    {
      id: 'exceptions',
      label: 'Fulfilment exceptions',
      value: String(shipmentExceptions),
      tone: shipmentExceptions > 0 ? 'danger' : 'success',
      statusText: shipmentExceptions > 0 ? 'Carrier action' : 'No exceptions',
      context: `${delayedShipments} shipment(s) flagged delayed · ${shipmentsAll.length} consignment(s) tracked.`,
      onOpen: go('logistics'),
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
    revenue: 'finance',
    contribution: 'finance',
    margin: 'finance',
    /* §P2 — the money band and the business-volume band. */
    'open-po-value': 'orders',
    receivables: 'finance',
    'upcoming-payments': 'finance',
    brands: 'catalogue',
    products: 'catalogue',
    'pos-count': 'orders',
    'order-lines': 'orders',
    shipments: 'logistics',
    volume: 'logistics',
    exceptions: 'logistics',
  };
  /**
   * §P2 — three bands, one section: the money band is the hero row (the business
   * position first), then the operational KPI band, then the business-volume
   * band. `pending-pos` keeps its own tile but is no longer the single hero
   * value — the hero row is the money.
   */
  const moneyTiles: MetricTileData[] = moneyKpis.map((k) => ({
    ...k,
    domain: KPI_DOMAIN[k.id] ?? 'finance',
    size: 'hero' as const,
  }));
  const kpiTiles: MetricTileData[] = kpis.map((k) => ({
    ...k,
    domain: KPI_DOMAIN[k.id] ?? 'orders',
  }));
  const businessTiles: MetricTileData[] = businessKpis.map((k) => ({
    ...k,
    domain: KPI_DOMAIN[k.id] ?? 'catalogue',
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

  /**
   * §P2 — LOGISTICS STATUS. The real consignment distribution, grouped by the
   * canonical shipment-status presentation (never a local label map) plus the
   * carrier split (the lane rule decides DHL / Palletline; a freight-collect PO
   * carries the channel-arranged partner). Both are counts over the same rows
   * the Logistics Control surface reads.
   */
  const shipmentStatusSegments = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of shipmentsAll) {
      const label = shipmentStatusPresentation(s.status).label;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));
  }, [shipmentsAll]);

  const carrierSegments = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of shipmentsAll) {
      const label = s.carrier ? s.carrier.toUpperCase() : 'UNASSIGNED';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value }));
  }, [shipmentsAll]);

  /*
   * §Dashboard-cleanup (2026-09-22) — REMOVED from the Overview:
   *   · the local `attention[]` queue and its "Needs your attention" section;
   *   · the local `actions[]` tiles and their "Next actions" section.
   *
   * Both answered "what needs doing", which other surfaces already own
   * authoritatively — the work layer (Work Management / Calendar), the Control
   * Centre, and the Command Centre (now rendered on the Control Centre).
   * Nothing was replaced here and nothing was lost: every destination they
   * linked to (Purchase Orders, Compliance, Contracts, Helpdesk, Billing,
   * Logistics Control, Global Catalog, Retail Pipeline) is unchanged and still
   * reachable from the shell nav, and the counts they showed still appear in
   * the KPI band above and in the owning queues.
   */

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
          <MetricBand items={moneyTiles} columns={4} loading />
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
              {/*
                §Dashboard-cleanup (2026-09-22) — the Density and Group-rows
                controls were removed with the attention queue they only served
                (both were `Queue` presentation options). The overview is a
                read-only business view; row-density controls belong to the
                surfaces that own a table (Work Management, Control Centre).
              */}
              <span className="hidden font-mono text-ds-micro text-zinc-600 sm:inline">
                ⌘K for records and destinations
              </span>
            </div>
          }
        />

        {/*
          §Dashboard-cleanup (2026-09-22) — the Command Centre was REMOVED from
          the Overview. It answers "what needs my attention, and what do I do
          next" — an action surface, not overview content — and it now renders on
          the Control Centre, its intended home. The component and its model are
          UNCHANGED; reconciling it with the Control Centre's own attention list
          is a separate pass.
        */}

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

              {/*
                §Dashboard-cleanup (2026-09-22) — the rail "Activity" panel was
                REMOVED: it rendered the same `recentMessages` data as the
                "Recent communications" section below it, on the same screen, and
                the Messages destination owns the full list. One summary remains.
              */}
            </>
          }
        >
          {/*
            §Dashboard-cleanup (2026-09-22) — "Portfolio at a glance" is now the
            FIRST section of the Overview: the business position before any
            activity detail. It already contains the derived KPI band (portfolio,
            orders, compliance, contracts, support, billing AND the business
            figures: recorded revenue, gross contribution, contribution margin).
          */}
          <WorkspaceSection
            title="Portfolio at a glance"
            description="Derived live from purchase orders, the canonical catalog, shipments, compliance, contracts, support, billing and the canonical revenue/cost streams."
            domain="orders"
          >
            {/*
              §P2 — three bands, one section, ADDITIVE ONLY:
                1. THE MONEY BAND (hero) — the business position first;
                2. the operational KPI band (unchanged tiles);
                3. the business-volume band (new: brands · products · POs · order
                   lines · shipments · operational volume · upcoming payments ·
                   fulfilment exceptions).
              Every card that existed before P2 is still rendered.
            */}
            <h3 className="text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Business position
            </h3>
            <MetricBand items={moneyTiles} columns={4} />
            <h3 className="pt-1 text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Operations
            </h3>
            <MetricBand items={kpiTiles} columns={4} />
            <h3 className="pt-1 text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Portfolio volume
            </h3>
            <MetricBand items={businessTiles} columns={4} />
          </WorkspaceSection>

          <WorkspaceSection
            title="Order pipeline"
            description="Where every purchase order currently sits. Select a stage to open its queue."
            domain="orders"
          >
            <PipelineTrack stages={pipelineStages} onSelect={() => go('purchase_orders_admin')()} />
          </WorkspaceSection>

          {/*
            §P2 — FINANCIAL PERFORMANCE (new, additive). The composition behind the
            money band: every canonical revenue stream with its own value and its
            own source label, then the cost base the contribution figure is derived
            from. Streams with no recorded value are shown as £0 WITH their reason
            rather than hidden — a zero that is stated is information; a zero that
            is omitted looks like a missing number.
          */}
          <WorkspaceSection
            title="Financial performance"
            description="The canonical revenue streams and the monthly cost base behind the business position. Provisional until the cost model is founder-approved."
            domain="finance"
            action={
              <Button variant="secondary" size="sm" onClick={go('super_admin')}>
                Open Accounting <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>
            }
          >
            <div className="overflow-hidden rounded-ds-lg border border-white/[0.06] bg-ink-900">
              <table className="w-full text-left">
                <caption className="sr-only">
                  Recorded revenue by canonical stream, with each stream's source
                </caption>
                <thead>
                  <tr className="border-b border-white/[0.06] text-ds-micro uppercase tracking-[0.14em] text-zinc-500">
                    <th scope="col" className="px-3 py-2 font-semibold">Revenue stream</th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">Recorded</th>
                    <th scope="col" className="hidden px-3 py-2 font-semibold sm:table-cell">Basis</th>
                  </tr>
                </thead>
                <tbody>
                  {costs.revenue.streams.map((s) => (
                    <tr key={s.id} className="border-b border-white/[0.04] last:border-b-0">
                      <td className="px-3 py-2 text-xs text-zinc-200">{s.label}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-white">
                        £{s.gbp.toLocaleString('en-GB')}
                      </td>
                      <td className="hidden px-3 py-2 text-ds-label text-zinc-500 sm:table-cell">{s.source}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-white/[0.06] text-xs">
                    <td className="px-3 py-2 text-zinc-400">Total recorded revenue</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-white">
                      £{costs.revenue.totalGbp.toLocaleString('en-GB')}
                    </td>
                    <td className="hidden px-3 py-2 text-ds-label text-zinc-500 sm:table-cell">
                      canonical streams only
                    </td>
                  </tr>
                  <tr className="border-t border-white/[0.06] text-xs">
                    <td className="px-3 py-2 text-zinc-400">Monthly operating cost base</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-white">
                      £{costs.monthlyTotalGbp.toLocaleString('en-GB')}
                    </td>
                    <td className="hidden px-3 py-2 text-ds-label text-zinc-500 sm:table-cell">
                      {costs.providers.length} provider line(s) + recorded AI usage
                    </td>
                  </tr>
                  <tr className="border-t border-white/[0.06] text-xs">
                    <td className="px-3 py-2 text-zinc-400">
                      Gross profit {costs.contribution.provisional ? '(provisional)' : ''}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-white">
                      £{costs.contribution.grossGbp.toLocaleString('en-GB')}
                    </td>
                    <td className="hidden px-3 py-2 text-ds-label text-zinc-500 sm:table-cell">
                      margin {costs.contribution.marginPct}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </WorkspaceSection>

          {/*
            §Dashboard-cleanup (2026-09-22) — "Needs your attention" and
            "Next actions" were REMOVED here. Both duplicated surfaces that own
            this purpose authoritatively:
              · Work Management / Operations Calendar (the canonical work layer),
              · the Control Centre (founder attention + approvals),
              · the Command Centre (now on the Control Centre).
            No replacement table was added, and every destination they linked to
            remains reachable from the shell nav.
          */}

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

          {/*
            §P2 — LOGISTICS STATUS (new, additive). The real consignment state:
            a distribution by canonical shipment status plus the carrier split.
            Nothing is plotted when no consignment exists — the section says so.
          */}
          <WorkspaceSection
            title="Logistics status"
            description="Every consignment by canonical shipment status and carrier — the same rows Logistics Control reads."
            domain="logistics"
            action={
              shipmentsAll.length > 0 ? (
                <Button variant="secondary" size="sm" onClick={go('logistics')}>
                  Open Logistics <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Button>
              ) : undefined
            }
          >
            {shipmentsAll.length === 0 ? (
              <EmptyState
                title="No consignments yet"
                description="Shipment status and carrier distribution appear here once a purchase order moves into dispatch."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-ds-lg border border-white/[0.06] bg-ink-900 px-3 py-3">
                  <h3 className="text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    By status
                  </h3>
                  <div className="pt-2">
                    <MercentaDoughnut
                      segments={shipmentStatusSegments}
                      centerValue={String(shipmentsAll.length)}
                      centerLabel="consignments"
                      legend
                      ariaLabel={`Shipments by status: ${shipmentStatusSegments
                        .map((s) => `${s.label} ${s.value}`)
                        .join(', ')}`}
                    />
                  </div>
                </div>
                <div className="rounded-ds-lg border border-white/[0.06] bg-ink-900 px-3 py-3">
                  <h3 className="text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    By carrier
                  </h3>
                  <ul className="mt-2 space-y-1.5">
                    {carrierSegments.map((c) => (
                      <li key={c.label} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-zinc-300">{c.label}</span>
                        <span className="font-mono text-zinc-200">{c.value}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2.5 border-t border-white/[0.06] pt-2 text-ds-label text-zinc-500">
                    {shipmentExceptions} exception(s) · {delayedShipments} delayed · £
                    {valueInMotion.toLocaleString('en-GB')} consignment value
                  </p>
                </div>
              </div>
            )}
          </WorkspaceSection>

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