/**
 * §Phase 7E — Brand Operations Overview (dashboard redesign).
 *
 * A polished B2B brand portal at the same quality bar as the Admin Operations
 * Overview (Phase 7C). Every number is DERIVED from real, tenant-scoped data
 * at render time through the canonical React Query hooks — no fabricated
 * metrics, no static charts, no hardcoded counts.
 *
 * Hierarchy (§UI/UX REDESIGN — remaining surfaces: ONE workspace system):
 *   FRAME/HEADER  WorkspaceFrame + WorkspaceHeader — eyebrow, contract status,
 *                 the PO summary facts and the primary actions (above the fold).
 *   WORKSPACE     At a glance (your earnings + your account) · Earnings by month
 *                 (your chart) · Purchase orders (Queue) · Fulfilment (Queue) ·
 *                 Payouts (DataTable).
 *   CONTEXT RAIL  Compliance & account health · Recent comms.
 *
 * §P2 (2026-09-22) — OVERVIEW = OBSERVE; THE ACTION LIST MOVES TO OPERATIONS.
 * The Founder's dashboard programme separates what a surface is FOR: the
 * Overview observes (earnings, the account's real numbers, what is moving), and
 * the brand's OPERATIONS group executes. The two action sections that used to sit
 * here — the "Needs your attention" queue and the rail's "Next actions" — are
 * therefore GONE from this surface: the brand's single action list is
 * Operations → **Tasks & Deadlines** (`BrandWorkManagement`), which already
 * derives the same work from the same canonical records (PO acknowledgements and
 * windows, document expiries, contract renewals, deduction disputes, shipment
 * exceptions, returns actions, invoice-due items, commercial-readiness steps),
 * with the rail badges showing the outstanding count. Nothing is lost: every
 * attention GROUP has one authoritative owner —
 *   · PO acknowledgements → Operations → Purchase Orders (and the work list)
 *   · deductions          → Statements & Account (counted on this page)
 *   · out-of-stock        → Product Catalog (counted on this page)
 *   · shipment exceptions → Operations → Logistics Hub (counted on this page)
 *   · support tickets     → Support & Team (counted on this page)
 *   · returns             → Operations → Returns (counted on this page)
 *   · simulated invoices  → the work list's `invoice_due` items + Notifications
 * — and the counts they carried are now observe tiles, so the business picture is
 * COMPLETE rather than removed. This mirrors the admin pass (§Dashboard-cleanup),
 * where the same queue was consolidated onto the work layer and the Control
 * Centre; a second action list on an observe surface is the duplication the
 * programme exists to remove.
 *
 * This surface previously composed the Phase-7 dashboard generation
 * (`PageHeader` / `DashboardSection` / `KpiGroup` / `AttentionPanel`) inside its
 * own `p-6 space-y-6 max-w-[1400px] mx-auto` container, which made the brand
 * portal visibly a different product from the redesigned admin workspace. It is
 * now built from the same canonical workspace primitives as AdminDashboard and
 * the Logistics Hub. The test ids the browser suites pin are preserved
 * (`brand-dashboard-loaded`, `kpi-value-*`, `po-summary-*`, `compliance-summary`)
 * — the `attention-*` / `action-*` ids are deliberately GONE with the action
 * sections they belonged to (§P2 below).
 *
 * Phase 7C's remaining legacy static chart (REVENUE_DATA) is REMOVED — the
 * tenant's real per-month PO series is intentionally thin (POs are created
 * only when a retail order lands), and plotting a sparse "trend" would be a
 * fabricated shape. Real time-series analysis lives in Analytics
 * (SalesAnalytics) and Reports (BrandReports) where the same PO data is
 * charted honestly. §P2 adds the brand's FIRST chart over a source that is
 * genuinely a series — the canonical commission records, grouped by accrual
 * month — and states the position instead of drawing when there is too little
 * history.
 *
 * Tenant/RBAC: ALL lists are narrowed through assertBrandScope / tenantId so
 * a brand never sees another tenant's POs, shipments, docs, messages, or
 * deductions. The previous global activity feed (ActivityLog has no brandId)
 * is gone for this reason.
 */
import { useCallback, useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
/** §P13 — the order DATE is rendered through the ONE display helper. */
import { orderDateLabel } from '@/lib/dates';
import {
  useCommissions,
  useComplianceDocuments,
  useContracts,
  useDeductions,
  useMessages,
  usePurchaseOrders,
  useShipmentsAll,
} from '@/data/queries';
import { computeBrandNetShare, normalisePayoutTrack, resolveCommissionRatePct } from '@/lib/billing/payouts';
import { demoReturns } from '@/data/api';
import { demoCommerceInvoices, demoCommercePayments } from '@/data/demoStore';
import { invoiceIsOutstanding } from '@/lib/commerce/invoiceTerms';
import { demoTickets } from '@/lib/helpdesk/ticketStore';
import { assertBrandScope } from '@/lib/auth/rbac';
import { Alert, Button, DataTable, EmptyState, StatusBadge } from '@/components/ui';
import {
  ActivityFeed,
  ContextPanel,
  MetricBand,
  Queue,
  WorkspaceFrame,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceSection,
  type ActivityEntry,
  type MetricTileData,
  type QueueRowData,
} from '@/components/shared/workspace';
import type { PurchaseOrderStatus } from '@/types';
import {
  MercentaBars,
} from '@/components/shared/charts/MercentaCharts';
import {
  commissionStatusPresentation,
  complianceGatePresentation,
  poStatusPresentation,
  shipmentStatusPresentation,
} from '@/lib/statusPresentation';
/** §P13 / S6–S7 — the acknowledgement QUEUE is read from its OWNER, never re-derived. */
import { poAcknowledgementWindow } from '@/lib/commerce/poAcknowledgementWindow';
import { ArrowRight, FileText, ShieldCheck } from 'lucide-react';

const PO_OPEN: ReadonlySet<PurchaseOrderStatus> = new Set([
  'received', 'under_review', 'accepted', 'ready_to_fulfil',
]);
const PO_IN_FLIGHT: ReadonlySet<PurchaseOrderStatus> = new Set([
  'accepted', 'ready_to_fulfil', 'shipped',
]);

const DOC_LABELS: Record<string, string> = {
  letter_of_authorization: 'Letter of authorization',
  brand_registry_confirmation: 'Brand ownership confirmation (Mercenta control)',
  product_safety_ukca: 'Product safety (UKCA)',
  insurance_certificate: 'Insurance certificate',
  cosmetic_notification_cpnp: 'Cosmetic notification (CPNP)',
  food_contact_material: 'Food contact material',
  weee_compliance: 'WEEE compliance',
  type_approval: 'Type approval',
  food_safety_certificate: 'Food safety certificate',
  textile_labelling_compliance: 'Textile labelling compliance',
  baby_product_safety: 'Baby product safety',
};

/**
 * Shipment rows served by the demo store carry a looser shape than the
 * canonical Shipment type (status is a string, no committed `date`).
 */
interface BrandShipmentRow {
  id: string;
  brandId?: string;
  poNumber?: string;
  carrier: string;
  reference: string;
  title: string;
  value: number;
  status: string;
  origin: string;
  destination: string;
  delayed?: boolean;
  exception?: boolean;
}

function shipmentStatusLabel(status: string): string {
  return shipmentStatusPresentation(status).label;
}

export function BrandDashboard({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { session, brandProfile, products } = useApp();
  const tenantId = session?.tenantId;
  /** §Dashboard-cleanup P0 — brief highlight when a payout tile takes the operator to the ledger. */
  const [payoutsPulse, setPayoutsPulse] = useState(false);

  const poQuery = usePurchaseOrders();
  const shipmentsQuery = useShipmentsAll();
  const docsQuery = useComplianceDocuments();
  const contractsQuery = useContracts();
  const messagesQuery = useMessages();
  const deductionsQuery = useDeductions();
  // §Phase D6 — the brand's own payout state (canonical commission store).
  const commissionsQuery = useCommissions();

  /** Navigate to an existing brand shell view — no-op when rendered without a shell. */
  const go = useCallback((view: string) => () => onNavigate?.(view), [onNavigate]);

  const pos = useMemo(
    () => assertBrandScope(session, poQuery.data?.data ?? []),
    [session, poQuery.data]
  );
  const brandShipments = useMemo(
    () => ((shipmentsQuery.data?.data ?? []) as unknown as BrandShipmentRow[]).filter((s) => s.brandId === tenantId),
    [shipmentsQuery.data, tenantId]
  );
  const docs = useMemo(
    () => (docsQuery.data?.data ?? []).filter((d) => d.brandId === tenantId),
    [docsQuery.data, tenantId]
  );
  const brandContracts = useMemo(
    () => assertBrandScope(session, contractsQuery.data?.data ?? []),
    [session, contractsQuery.data]
  );
  const brandMessages = useMemo(
    () => [...(messagesQuery.data?.data ?? [])]
      .filter((m) => m.brandId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [messagesQuery.data, tenantId]
  );
  const deductions = useMemo(
    () => (deductionsQuery.data?.data ?? []).filter((d) => d.brandId === tenantId),
    [deductionsQuery.data, tenantId]
  );

  const openDeductions = useMemo(() => deductions.filter((d) => d.status === 'open'), [deductions]);
  const brandReturns = useMemo(() => demoReturns.filter((r) => r.brandId === tenantId), [tenantId]);
  /**
   * §P2 — the brand's own issued-and-unpaid invoices (canonical commerce ledger,
   * the same rows the work layer derives its `invoice_due` items from). The
   * Overview OBSERVES the position; the action is owned by the work list.
   *
   * §P7 — REPOINTED to the ONE owner. The rule used to be re-implemented here
   * (`i.status !== 'paid' && !payments.some(...)`), which is exactly the kind of
   * second copy §03 forbids: the receivable predicate is now
   * `invoiceIsOutstanding` in `src/lib/commerce/invoiceTerms.ts`, so the brand's
   * observe tile, the admin Overview, the founder console and the work layer can
   * never disagree — and a CANCELLED invoice stops being a receivable everywhere
   * at once (`AV-022`).
   */
  const brandUnpaidInvoices = useMemo(
    () =>
      tenantId
        ? demoCommerceInvoices.filter(
            (i) => i.brandId === tenantId && invoiceIsOutstanding(i, demoCommercePayments)
          )
        : [],
    [tenantId]
  );

  /**
   * §Phase D6 — the brand's PAYOUT visibility, tenant-scoped exactly like every
   * other list on this dashboard (a brand only ever reads its own commissions).
   * Net share uses the canonical fee maths and the canonical brand track, so the
   * figure here and the figure the operator settles in Accounting are computed
   * by the same function — they cannot drift.
   */
  const brandCommissions = useMemo(
    () => (commissionsQuery.data?.data ?? []).filter((c) => c.brandId === tenantId),
    [commissionsQuery.data, tenantId]
  );
  const pendingPayouts = brandCommissions.filter((c) => c.status !== 'paid');
  const settledPayouts = brandCommissions.filter((c) => c.status === 'paid');
  const netPayoutOf = useCallback(
    (c: { poValue: number; commissionRate: number; commissionAmount: number }) =>
      computeBrandNetShare({
        poValue: c.poValue,
        commissionRatePct: resolveCommissionRatePct({
          commissionRate: c.commissionRate,
          commissionAmount: c.commissionAmount,
          poValue: c.poValue,
        }),
        fulfillmentTrack: normalisePayoutTrack(brandProfile?.fulfillmentTrack ?? 'financed'),
      }),
    [brandProfile?.fulfillmentTrack]
  );
  const pendingPayoutValue = pendingPayouts.reduce((s, c) => s + netPayoutOf(c), 0);
  const settledPayoutValue = settledPayouts.reduce((s, c) => s + netPayoutOf(c), 0);
  const brandTickets = useMemo(
    () => tenantId ? demoTickets.filter((t) => t.brandId === tenantId && t.status !== 'resolved') : [],
    [tenantId]
  );

  /* ── Derived brand KPIs (all real, all tenant-scoped) ─────────────── */
  const openPos = useMemo(() => pos.filter((p) => PO_OPEN.has(p.status)), [pos]);
  /**
   * §P13 / S6–S7 — THE ACKNOWLEDGEMENT QUEUE IS THE RULE'S OWNER'S.
   *
   * REPOINTED (the old contract is recorded here): this KPI hand-rolled the
   * obligation family (`PO_AWAITING_ACK = new Set(['received', 'under_review'])`,
   * removed) AND its own unacknowledged-line check, and it never consulted the
   * 24-hour window — so a purchase order PAST its limit still counted as "Awaiting
   * acknowledgement" with "Action needed", and a per-line decision was judged by a
   * second, different rule from the one the domain writer enforces.
   *
   * The owner's `inQueue` is Amazon's `New` set INSIDE the window — unacknowledged
   * and inside the limit — which IS what this KPI claims, so the Overview observes
   * exactly the work the work layer (Operations → Tasks & Deadlines) derives.
   */
  const awaitingAck = useMemo(
    () => pos.filter((p) => poAcknowledgementWindow(p).inQueue),
    [pos]
  );
  const inFlightPos = useMemo(() => pos.filter((p) => PO_IN_FLIGHT.has(p.status)), [pos]);
  const outOfStock = useMemo(() => products.filter((p) => p.isAvailable === false), [products]);
  const approvedDocs = useMemo(() => docs.filter((d) => d.status === 'approved'), [docs]);
  const activeContract = useMemo(
    () => brandContracts.find((c) => c.status === 'active' || c.status === 'signed'),
    [brandContracts]
  );
  const openPosValue = useMemo(() => openPos.reduce((s, p) => s + p.poValue, 0), [openPos]);
  const recentPos = useMemo(() => [...pos].sort((a, b) => b.orderDate.localeCompare(a.orderDate)), [pos]);

  const loading = poQuery.isLoading || shipmentsQuery.isLoading || docsQuery.isLoading;


  const complianceLabel =
    docs.length === 0
      ? 'No compliance documents on file'
      : `${approvedDocs.length}/${docs.length} documents approved`;

  /**
   * §Dashboard-cleanup P0 (2026-09-22) — the payout tiles used to route to
   * `documents` ("Documents & Account"), which contains NO payout content at all:
   * a dead end the Founder hit directly. The brand's own payout ledger is the
   * "Payouts" section ON THIS PAGE, so the tiles now take the operator to it —
   * no new screen, no new navigation, no moved function (settlement stays an
   * Admin → Accounting action).
   */
  const focusPayouts = () => {
    const el = typeof document === 'undefined' ? null : document.getElementById('brand-payouts');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setPayoutsPulse(true);
    window.setTimeout(() => setPayoutsPulse(false), 1600);
  };

  const kpiCells: MetricTileData[] = [
    {
      id: 'active-pos',
      domain: 'orders',
      label: 'Active purchase orders',
      value: String(openPos.length),
      context: `£${openPosValue.toLocaleString()} across ${openPos.length} PO${openPos.length === 1 ? '' : 's'}`,
      onOpen: go('purchase_orders'),
    },
    {
      id: 'awaiting-ack',
      domain: 'orders',
      label: 'Awaiting acknowledgement',
      value: String(awaitingAck.length),
      context: awaitingAck.length > 0 ? 'Acknowledge within 24 hours of receipt' : 'No POs pending your confirmation',
      tone: awaitingAck.length > 0 ? 'warning' : 'success',
      statusText: awaitingAck.length > 0 ? 'Action needed' : 'Up to date',
      onOpen: go('purchase_orders'),
    },
    {
      id: 'in-fulfilment',
      domain: 'logistics',
      label: 'POs in fulfilment',
      value: String(inFlightPos.length),
      context: 'Accepted, ready-to-fulfil and shipped POs',
      onOpen: go('logistics'),
    },
    {
      id: 'products-listed',
      domain: 'catalogue',
      label: 'Live products',
      value: String(products.length),
      context: `${products.length} SKU${products.length === 1 ? '' : 's'} in your catalogue`,
      onOpen: go('catalog'),
    },
    {
      id: 'out-of-stock',
      domain: 'catalogue',
      label: 'Out of stock',
      value: String(outOfStock.length),
      context: 'Products unavailable to new orders',
      tone: outOfStock.length > 0 ? 'warning' : 'success',
      statusText: outOfStock.length > 0 ? 'Review catalogue' : 'All stocked',
      onOpen: go('catalog'),
    },
    {
      /*
        §P2 — the two payout tiles MOVED into the earnings hero band above (they
        are the brand's money, and the money reads first). They are not duplicated
        here: one tile, one place. The §Dashboard-cleanup P0 behaviour (both tiles
        land on the brand's own payout ledger, never on a dead end) is preserved
        by `focusPayouts` in `earningsCells`.
      */
      id: 'open-deductions',
      domain: 'finance',
      label: 'Open deductions',
      value: String(openDeductions.length),
      context:
        openDeductions.length === 0
          ? 'No open deductions on your account.'
          : `£${openDeductions.reduce((s, d) => s + d.amountGbp, 0).toFixed(2)} awaiting a decision — work them in Statements & Account.`,
      tone: openDeductions.length > 0 ? 'warning' : 'success',
      statusText: openDeductions.length > 0 ? 'Decision needed' : 'None open',
      onOpen: go('documents'),
    },
    {
      id: 'open-tickets',
      domain: 'communications',
      label: 'Open support tickets',
      value: String(brandTickets.length),
      context:
        brandTickets.length === 0
          ? 'No open tickets with Mercenta support.'
          : 'Handled by Mercenta support in Support & Team.',
      tone: brandTickets.length > 0 ? 'warning' : 'success',
      statusText: brandTickets.length > 0 ? 'With support' : 'None open',
      onOpen: go('team'),
    },
    {
      id: 'returns-recorded',
      domain: 'logistics',
      label: 'Returns recorded',
      value: String(brandReturns.length),
      context: `${brandReturns.length} inbound return(s) on your account — track them in Returns.`,
      onOpen: go('returns'),
    },
    {
      id: 'invoices-outstanding',
      domain: 'finance',
      label: 'Invoices outstanding',
      value: String(brandUnpaidInvoices.length),
      context:
        brandUnpaidInvoices.length === 0
          ? 'No issued-and-unpaid invoice recorded for your account.'
          : `£${brandUnpaidInvoices.reduce((s, i) => s + i.subtotalGbp, 0).toFixed(2)} · (sim) simulated invoice(s) — no live payment provider contacted.`,
      tone: brandUnpaidInvoices.length > 0 ? 'warning' : 'success',
      statusText: brandUnpaidInvoices.length > 0 ? 'Payment outstanding' : 'Nothing outstanding',
      onOpen: go('documents'),
    },
    {
      id: 'contract-status',
      domain: 'compliance',
      label: 'Contract status',
      value: activeContract ? 'Active' : '—',
      context: activeContract ? `Distribution agreement v${activeContract.version} signed` : 'No active contract on file',
      tone: activeContract ? 'success' : 'warning',
      statusText: activeContract ? 'Contract active' : 'Action required',
      onOpen: go('contracts'),
    },
  ];

  /**
   * §P2 — THE BRAND'S EARNINGS BAND (hero row) + ITS FIRST CHART.
   *
   * `totalEarningsValue` is the brand's own money: the net share of every
   * commission accrued on its account (pending + settled), computed with the
   * canonical fee maths and the brand's canonical fulfilment track, so the number
   * here and the number Accounting settles are the same number.
   * `earningsSeries` groups those same records by accrual month — it is a REAL
   * series over real records, never a fabricated trend.
   */
  const totalEarningsValue = pendingPayoutValue + settledPayoutValue;
  const earningsSeries = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const c of brandCommissions) {
      const month = c.createdAt.slice(0, 7);
      byMonth.set(month, (byMonth.get(month) ?? 0) + netPayoutOf(c));
    }
    return [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, value]) => ({ label: month, value: Math.round(value * 100) / 100 }));
  }, [brandCommissions, netPayoutOf]);

  const earningsCells: MetricTileData[] = [
    {
      id: 'earnings-total',
      domain: 'finance',
      label: 'Total earnings',
      value: `£${totalEarningsValue.toFixed(2)}`,
      context: `Net of Mercenta's commission across ${brandCommissions.length} accrued payout(s) — pending and settled together.`,
      tone: brandCommissions.length > 0 ? 'info' : 'neutral',
      statusText: brandCommissions.length > 0 ? 'Net of commission' : 'No accrual yet',
      onOpen: focusPayouts,
    },
    {
      id: 'open-po-value',
      domain: 'orders',
      label: 'Open PO value',
      value: `£${openPosValue.toLocaleString('en-GB')}`,
      context: `Purchase-order value across your ${openPos.length} active PO(s) — received, under review, accepted or ready-to-fulfil.`,
      onOpen: go('purchase_orders'),
    },
    {
      id: 'payouts-due',
      domain: 'finance',
      label: 'Payouts due',
      value: String(pendingPayouts.length),
      context: `£${pendingPayoutValue.toFixed(2)} net owed to you`,
      tone: pendingPayouts.length > 0 ? 'info' : 'success',
      statusText: pendingPayouts.length > 0 ? 'Awaiting settlement' : 'Nothing outstanding',
      onOpen: focusPayouts,
    },
    {
      id: 'payouts-settled',
      domain: 'finance',
      label: 'Payouts settled',
      value: String(settledPayouts.length),
      context: `£${settledPayoutValue.toFixed(2)} net paid`,
      tone: 'success',
      statusText: settledPayouts.length > 0 ? 'Paid' : 'None settled yet',
      onOpen: focusPayouts,
    },
  ];

  const recentMessages = brandMessages.slice(0, 4);
  const messageEntries: ActivityEntry[] = recentMessages.map((m) => ({
    id: m.id,
    title: m.subject ?? m.body,
    meta: `${m.direction} · ${m.channel.toUpperCase()}`,
    at: m.createdAt,
    tone: m.direction === 'inbound' ? 'info' : undefined,
    onOpen: go('team'),
  }));

  const poRows: QueueRowData[] = recentPos.slice(0, 4).map((p) => {
    const s = poStatusPresentation(p.status);
    return {
      id: p.id,
      ref: p.poNumber,
      title: `${p.lineItems.length} line${p.lineItems.length === 1 ? '' : 's'} · £${p.poValue.toLocaleString()}`,
      meta: `ordered ${orderDateLabel(p.orderDate)}`,
      status: { tone: s.tone, label: s.label },
      domain: 'orders',
      onOpen: go('purchase_orders'),
      actionLabel: 'Review',
    };
  });

  const shipmentRows: QueueRowData[] = brandShipments.slice(0, 5).map((s) => {
    const p = shipmentStatusPresentation(s.status);
    return {
      id: s.id,
      ref: s.reference,
      title: s.title,
      meta: `£${s.value.toLocaleString()} · ${s.origin} → ${s.destination} · ${s.carrier}`,
      status: { tone: p.tone, label: p.label },
      domain: 'logistics',
      onOpen: go('logistics'),
      actionLabel: 'Track',
    };
  });

  return (
    <WorkspaceFrame testId="brand-dashboard" busy={loading} className="space-y-4">
      {!loading ? (
        <div data-testid="brand-dashboard-loaded" className="hidden" />
      ) : (
        <div data-testid="brand-dashboard-loading" className="hidden" />
      )}

      <WorkspaceHeader
        eyebrow="BRAND PORTAL · OPERATIONS"
        title="Brand Overview"
        description={`${brandProfile.businessName || 'Brand portal'}${brandProfile.category ? ` · ${brandProfile.category}` : ''} — your earnings, what is moving and what is blocked. The work itself is in Operations.`}
        status={
          activeContract ? (
            <StatusBadge tone="success" dataStatus="success">
              Contract active
            </StatusBadge>
          ) : (
            <StatusBadge tone="warning" dataStatus="warning">
              No contract on file
            </StatusBadge>
          )
        }
        meta={
          <div
            data-testid="po-summary"
            className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-ds-label text-zinc-500"
          >
            <span data-testid="po-summary-active">{openPos.length} active</span>
            <span aria-hidden="true" className="text-zinc-600">
              ·
            </span>
            <span data-testid="po-summary-awaiting">
              {awaitingAck.length} awaiting acknowledgement
            </span>
            <span aria-hidden="true" className="text-zinc-600">
              ·
            </span>
            <span data-testid="po-summary-in-fulfilment">{inFlightPos.length} in fulfilment</span>
          </div>
        }
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={go('compliance')}>
              Compliance
            </Button>
            <Button size="sm" onClick={go('purchase_orders')}>
              Review purchase orders <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
          </>
        }
      />

      {(poQuery.isError || shipmentsQuery.isError || docsQuery.isError) && (
        <Alert tone="error" title="Some dashboard data could not be loaded">
          One or more data sources failed to load. Sections that depend on them are hidden; reload the portal to retry.
        </Alert>
      )}

      <WorkspaceGrid
        rail={
          <>
            <ContextPanel title="Compliance & account health">
              <div
                data-testid="compliance-summary"
                className="flex flex-wrap items-center gap-x-2 gap-y-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-brass-400" aria-hidden="true" />
                <span className="text-xs text-zinc-300">{complianceLabel}</span>
                <StatusBadge
                  tone={complianceGatePresentation(docs.length > 0 && approvedDocs.length === docs.length, docs.length).tone}
                  dataStatus={complianceGatePresentation(docs.length > 0 && approvedDocs.length === docs.length, docs.length).dataStatus}
                >
                  {complianceGatePresentation(docs.length > 0 && approvedDocs.length === docs.length, docs.length).label}
                </StatusBadge>
              </div>
              <div className="mt-2.5 flex items-start gap-2 border-t border-hairline pt-2.5">
                <FileText className="w-4 h-4 flex-shrink-0 text-zinc-500" aria-hidden="true" />
                <span className="text-ds-label leading-snug text-zinc-400">
                  {activeContract
                    ? `Distribution agreement v${activeContract.version} — ${activeContract.status}`
                    : 'No active distribution agreement on file'}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <Button variant="tertiary" size="sm" onClick={go('compliance')}>
                  Open compliance
                </Button>
                <Button variant="tertiary" size="sm" onClick={go('contracts')}>
                  Contract
                </Button>
              </div>
            </ContextPanel>

            {/*
              §P2 — the "Next actions" rail panel is REMOVED (not relocated):
              every destination it offered is in the Operations nav group, and the
              outstanding-work counts are carried by the rail badges. The brand's
              single action list is Operations → Tasks & Deadlines.
            */}

            <ContextPanel title="Recent communications">
              <ActivityFeed
                entries={messageEntries}
                empty={<p className="text-xs text-zinc-500">No recent communications recorded.</p>}
              />
            </ContextPanel>
          </>
        }
      >
        <WorkspaceSection
          title="At a glance"
          description="Live numbers from your real purchase orders, catalogue, contract and documents."
          domain="orders"
        >
          <h3 className="text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Your earnings
          </h3>
          <MetricBand items={earningsCells} loading={loading} columns={4} />
          <h3 className="pt-1 text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Your account
          </h3>
          <MetricBand items={kpiCells} loading={loading} />
        </WorkspaceSection>

        {/*
          §P2 — the brand's FIRST CHART: its own earnings over time, derived from
          the canonical commission records (the same store and the same fee maths
          the operator settles with). It is plotted only when there is more than
          one month of real accrual; otherwise the section states the position
          instead of drawing a fabricated shape.
        */}
        <WorkspaceSection
          title="Earnings by month"
          description="Your net payout accrued per month — derived from the canonical commission records behind your accepted purchase orders."
          domain="finance"
        >
          {earningsSeries.length < 2 ? (
            <EmptyState
              title="Not enough history to chart yet"
              description={`Your net payout accrues as purchase orders are accepted. ${pendingPayouts.length} payout(s) totalling £${pendingPayoutValue.toFixed(2)} are outstanding; a monthly trend appears once more than one month carries accrual.`}
            />
          ) : (
            <div className="rounded-ds-lg border border-hairline bg-ink-900 px-2 pb-2 pt-3">
              <MercentaBars
                bars={earningsSeries}
                height={180}
                paletteIndex={0}
                valueFormat={(v) => `£${v.toFixed(2)}`}
                ariaLabel={`Net payout accrued by month: ${earningsSeries
                  .map((b) => `${b.label} £${b.value.toFixed(2)}`)
                  .join(', ')}`}
              />
            </div>
          )}
        </WorkspaceSection>

      <WorkspaceSection
        title="Purchase orders"
        description="Commercial activity on your account — the most recent POs needing action."
        domain="orders"
        action={
          <Button variant="secondary" size="sm" onClick={go('purchase_orders')}>
            Open all POs <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
        }
      >
        <Queue
          rows={poRows}
          empty={
            <EmptyState
              title="No purchase orders yet"
              description="When a retail order is placed for your brand it will appear here for acknowledgment."
            />
          }
        />
      </WorkspaceSection>
<WorkspaceSection
        title="Fulfilment in motion"
        description="Shipments filed for this brand, newest first."
        domain="logistics"
        action={
          <Button variant="secondary" size="sm" onClick={go('logistics')}>
            Open shipments <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
        }
      >
        <Queue
          rows={shipmentRows}
          empty={
            <EmptyState
              title="Nothing in fulfilment right now"
              description="Accepted and ready-to-fulfil POs appear in the purchase-order section above; download its shipping documents from the Logistics Hub once a PO is accepted."
              action={<Button variant="accent" size="sm" onClick={go('logistics')}>Create a shipment</Button>}
            />
          }
        />
      </WorkspaceSection>

      {/* §Phase D6 — the brand's own payout ledger. Until this existed a brand
          could see an invoice and a deduction but never what it was actually
          OWED; the figures come from the canonical commission store and the
          canonical fee maths, so the brand's number and the operator's number
          are the same number.

          §Dashboard-cleanup P0 — anchored + pulse target for the payout tiles
          above, so "Payouts due" lands HERE instead of on Documents & Account. */}
      <div
        id="brand-payouts"
        data-payouts-pulse={payoutsPulse ? 'true' : undefined}
        className={payoutsPulse ? 'rounded-ds-lg ring-1 ring-hairline-strong' : undefined}
      >
      <WorkspaceSection
        title="Payouts"
        description="Your net share per settled commission — computed with the same fee maths the platform settles with."
        domain="finance"
      >
        {brandCommissions.length === 0 ? (
          <EmptyState
            title="No payouts yet"
            description="A payout appears here as soon as one of your purchase orders is accepted and its commission accrues."
          />
        ) : (
          <div className="space-y-2">
            <DataTable
              dataTable="brand-payouts"
              caption="Brand payout ledger"
              rows={brandCommissions}
              rowKey={(c) => c.id}
              emptyMessage="No payouts yet."
              columns={[
                {
                  key: 'purchaseOrderId',
                  label: 'Purchase order',
                  primary: true,
                  render: (c) => (
                    <span>
                      <span className="font-mono text-xs text-strong">{c.purchaseOrderId}</span>
                      <span className="block font-mono text-ds-micro text-zinc-500">{c.id}</span>
                    </span>
                  ),
                },
                {
                  key: 'poValue',
                  label: 'PO value',
                  align: 'right',
                  hideBelow: 'lg',
                  render: (c) => <span className="font-mono text-xs">£{c.poValue.toLocaleString()}</span>,
                },
                {
                  key: 'commissionAmount',
                  label: 'Commission',
                  align: 'right',
                  hideBelow: 'lg',
                  render: (c) => (
                    <span className="font-mono text-xs text-zinc-500">−£{c.commissionAmount.toFixed(2)}</span>
                  ),
                },
                {
                  key: 'netShare',
                  label: 'Net payout',
                  align: 'right',
                  render: (c) => (
                    <span className="font-mono text-xs font-semibold text-strong">
                      £{netPayoutOf(c).toFixed(2)}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  label: 'Status',
                  align: 'center',
                  render: (c) => {
                    const p = commissionStatusPresentation(c.status);
                    return (
                      <StatusBadge dataStatus={p.dataStatus} tone={p.tone}>
                        {p.label}
                      </StatusBadge>
                    );
                  },
                },
                {
                  key: 'createdAt',
                  label: 'Accrued',
                  align: 'right',
                  hideBelow: 'lg',
                  render: (c) => (
                    <span className="font-mono text-ds-label text-zinc-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  ),
                },
              ]}
            />
            <p className="text-ds-label text-zinc-500">
              Payout transfers run through the platform's payout seam in simulation until live
              payment credentials are configured — a settlement is labelled simulated wherever it is
              shown.
            </p>
          </div>
        )}
      </WorkspaceSection>
      </div>
      </WorkspaceGrid>
    </WorkspaceFrame>
  );
}