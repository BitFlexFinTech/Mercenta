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
 *   WORKSPACE     At a glance (MetricBand) · Needs your attention (Queue) ·
 *                 Purchase orders (Queue) · Fulfilment (Queue) ·
 *                 Payouts (DataTable).
 *   CONTEXT RAIL  Compliance & account health · Next actions · Recent comms.
 *
 * This surface previously composed the Phase-7 dashboard generation
 * (`PageHeader` / `DashboardSection` / `KpiGroup` / `AttentionPanel`) inside its
 * own `p-6 space-y-6 max-w-[1400px] mx-auto` container, which made the brand
 * portal visibly a different product from the redesigned admin workspace. It is
 * now built from the same canonical workspace primitives as AdminDashboard and
 * the Logistics Hub. Every test id the browser suites pin is preserved
 * (`brand-dashboard-loaded`, `kpi-value-*`, `attention-*`, `po-summary-*`,
 * `action-*`, `compliance-summary`).
 *
 * Phase 7C's remaining legacy static chart (REVENUE_DATA) is REMOVED — the
 * tenant's real per-month PO series is intentionally thin (POs are created
 * only when a retail order lands), and plotting a sparse "trend" would be a
 * fabricated shape. Real time-series analysis lives in Analytics
 * (SalesAnalytics) and Reports (BrandReports) where the same PO data is
 * charted honestly.
 *
 * Tenant/RBAC: ALL lists are narrowed through assertBrandScope / tenantId so
 * a brand never sees another tenant's POs, shipments, docs, messages, or
 * deductions. The previous global activity feed (ActivityLog has no brandId)
 * is gone for this reason.
 */
import { useCallback, useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
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
import { demoTickets } from '@/lib/helpdesk/ticketStore';
import { assertBrandScope } from '@/lib/auth/rbac';
import { Alert, Button, DataTable, EmptyState, StatusBadge, type StatusTone } from '@/components/ui';
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
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types';
import type { PaletteDomain } from '@/config/themes';
import {
  commissionStatusPresentation,
  complianceGatePresentation,
  poStatusPresentation,
  shipmentStatusPresentation,
} from '@/lib/statusPresentation';
import { ArrowRight, FileText, ShieldCheck } from 'lucide-react';

/**
 * §UI/UX REDESIGN (remaining surfaces) — internal attention-row shape.
 *
 * The brand overview previously consumed the Phase-7 `AttentionPanel`
 * primitive, which was the ONE remaining consumer of that legacy
 * presentation generation. The rows are now projected onto the canonical
 * `QueueRowData` (src/components/shared/workspace.tsx) that every migrated
 * operational surface uses, so the platform has a single workspace system.
 * The projection keeps the exact `attention-<id>` test ids the browser suites
 * pin (including the pinned FIRST row `attention-unacked-*`).
 */
interface BrandAttentionItem {
  id: string;
  group: string;
  tone: StatusTone;
  statusLabel: string;
  title: string;
  meta: string;
  onOpen: () => void;
}

const PO_OPEN: ReadonlySet<PurchaseOrderStatus> = new Set([
  'received', 'under_review', 'accepted', 'ready_to_fulfil',
]);
const PO_AWAITING_ACK: ReadonlySet<PurchaseOrderStatus> = new Set([
  'received', 'under_review',
]);
const PO_IN_FLIGHT: ReadonlySet<PurchaseOrderStatus> = new Set([
  'accepted', 'ready_to_fulfil', 'shipped',
]);

const DOC_LABELS: Record<string, string> = {
  letter_of_authorization: 'Letter of authorization',
  brand_registry_confirmation: 'Brand registry confirmation',
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

/**
 * A brand-side line counts as unacknowledged until the brand explicitly
 * accepts/rejects/backorders every line (the same rule Vendor Central
 * applies; seed POs arrive with no ackStatus).
 */
function isUnacknowledged(po: PurchaseOrder): boolean {
  return po.lineItems.some((l) => !l.ackStatus || l.ackStatus === 'unacknowledged');
}

/** PO receipt older than the 24-hour acknowledgement window. */
const overdue = (orderDate: string): boolean =>
  new Date(orderDate).getTime() < Date.now() - 24 * 60 * 60 * 1000;

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
  const awaitingAck = useMemo(
    () => pos.filter((p) => PO_AWAITING_ACK.has(p.status) && isUnacknowledged(p)),
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

  /* ── Needs-attention items (brand-scoped, actionable) ─────────────── */
  const attentionItems = useMemo(() => {
    const items: BrandAttentionItem[] = [];
    awaitingAck.forEach((p) => {
      items.push({
        id: `unacked-${p.poNumber}`,
        group: 'Purchase orders',
        tone: overdue(p.orderDate) ? 'danger' : 'warning',
        statusLabel: overdue(p.orderDate) ? 'ACKNOWLEDGEMENT OVERDUE' : 'ACKNOWLEDGEMENT NEEDED',
        title: `${p.poNumber} — ${p.lineItems.length} line${p.lineItems.length === 1 ? '' : 's'}`,
        meta: `£${p.poValue.toLocaleString()} · ordered ${p.orderDate} · must be acknowledged within 24h of receipt`,
        onOpen: go('purchase_orders'),
      });
    });
    openDeductions.slice(0, 3).forEach((d) => {
      items.push({
        id: `deduction-${d.id}`,
        group: 'Deductions',
        tone: 'warning',
        statusLabel: 'OPEN DEDUCTION',
        title: d.reason || d.type.replace(/_/g, ' '),
        // §Phase E6 (G2c) — truthful provenance from the canonical `Deduction` flag.
        meta: `£${d.amountGbp.toLocaleString()} · ${d.purchaseOrderId} · open since ${d.date}${d.simulated ? ' · (sim)' : ''}`,
        onOpen: go('documents'),
      });
    });
    outOfStock.slice(0, 3).forEach((p) => {
      items.push({
        id: `oos-${p.sku}`,
        group: 'Catalogue',
        tone: 'warning',
        statusLabel: 'OUT OF STOCK',
        title: p.name,
        meta: `${p.sku} — not currently available to orders`,
        onOpen: go('catalog'),
      });
    });
    brandShipments.filter((s) => s.exception).slice(0, 3).forEach((s) => {
      items.push({
        id: `shipment-exc-${s.id}`,
        group: 'Fulfilment',
        tone: 'danger',
        statusLabel: 'EXCEPTION',
        title: s.title,
        meta: `${s.reference} · ${shipmentStatusLabel(s.status)} · flagged for review`,
        onOpen: go('logistics'),
      });
    });
    brandTickets.forEach((t) => {
      items.push({
        id: `ticket-${t.id}`,
        group: 'Support',
        tone: t.priority === 'urgent' ? 'danger' : 'warning',
        statusLabel: 'OPEN TICKET',
        title: t.subject,
        meta: `${t.lastMessagePreview} — ${t.category ?? 'general'}`,
        onOpen: go('team'),
      });
    });
    brandReturns.slice(0, 3).forEach((r) => {
      items.push({
        id: `return-${r.id}`,
        group: 'Returns',
        tone: 'warning',
        statusLabel: 'RETURN RECORDED',
        title: `${r.productName} × ${r.quantity}`,
        meta: `${r.poNumber} · ${r.returnDate} · ${r.reason.replace(/_/g, ' ')}`,
        onOpen: go('returns'),
      });
    });
    /* §Phase E6 (G2a/G2b) — canonical E4 commerce awareness for THIS tenant.
       Derived from the SAME canonical stores the E4 lifecycle writes
       (`demoCommerceInvoices` / `demoCommercePayments` and the already
       tenant-scoped PO list) — no new store, no duplicated state. APPENDED after
       every existing group so the existing attention order (and the dashboard
       tests' pinned FIRST row) is unchanged, and no `unacked-` id is reused. */
    const brandCommerceInvoices = demoCommerceInvoices.filter((i) => i.brandId === tenantId);
    const invoicedPoIds = new Set(brandCommerceInvoices.map((i) => i.purchaseOrderId));

    brandCommerceInvoices
      .filter(
        (i) => i.status === 'issued' && !demoCommercePayments.some((p) => p.invoiceId === i.id)
      )
      .slice(0, 3)
      .forEach((i) => {
        items.push({
          id: `commerce-inv-${i.id}`,
          group: 'Commerce',
          tone: 'warning',
          statusLabel: 'SIM INVOICE DUE',
          title: `Simulated invoice ${i.number} awaiting payment`,
          meta: `£${i.subtotalGbp.toFixed(2)} · (sim) — no live payment provider contacted`,
          onOpen: go('purchase_orders'),
        });
      });

    pos
      .filter(
        (p) => p.simulated === true && p.status === 'delivered' && !invoicedPoIds.has(p.id)
      )
      .slice(0, 3)
      .forEach((p) => {
        items.push({
          id: `commerce-po-inv-${p.id}`,
          group: 'Commerce',
          tone: 'warning',
          statusLabel: 'INVOICE OUTSTANDING',
          title: `${p.poNumber} delivered — simulated invoice outstanding`,
          meta: `£${p.poValue.toLocaleString()} · (sim)`,
          onOpen: go('purchase_orders'),
        });
      });

    return items;
  }, [awaitingAck, openDeductions, outOfStock, brandShipments, brandTickets, brandReturns, pos, tenantId, go]);

  /**
   * §UI/UX REDESIGN — projected onto the canonical workspace Queue. The group
   * order is unchanged (Purchase orders → Deductions → Catalogue → Fulfilment →
   * Support → Returns → Commerce), so the pinned first row is still
   * `attention-unacked-*`.
   */
  const attentionRows: QueueRowData[] = useMemo(
    () =>
      attentionItems.map((it) => ({
        id: it.id,
        group: it.group,
        title: it.title,
        meta: it.meta,
        status: { tone: it.tone, label: it.statusLabel },
        testId: `attention-${it.id}`,
        onOpen: it.onOpen,
        actionLabel: 'Review',
      })),
    [attentionItems]
  );

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

  const recentMessages = brandMessages.slice(0, 4);
  /**
   * §UI/UX REDESIGN — the quick actions are now canonical Queue rows in the
   * context rail (domain-accented, keyboard-reachable, one clear action) rather
   * than a bespoke list of icon rows. The `action-<view>` test ids and the
   * "Open" action label are unchanged.
   */
  const quickActions: readonly {
    id: string;
    label: string;
    hint: string;
    domain: PaletteDomain;
  }[] = [
    { id: 'purchase_orders', label: 'Review purchase orders', hint: `${awaitingAck.length} awaiting acknowledgement`, domain: 'orders' },
    { id: 'catalog', label: 'Manage catalogue', hint: `${products.length} products listed · ${outOfStock.length} out of stock`, domain: 'catalogue' },
    { id: 'logistics', label: 'Logistics Hub', hint: `${brandShipments.length} shipment${brandShipments.length === 1 ? '' : 's'} in motion`, domain: 'logistics' },
    { id: 'compliance', label: 'Compliance & documents', hint: complianceLabel, domain: 'compliance' },
    { id: 'documents', label: 'Statements & account', hint: `${openDeductions.length} open deduction${openDeductions.length === 1 ? '' : 's'}`, domain: 'finance' },
    { id: 'team', label: 'Support & team', hint: `${brandTickets.length} open ticket${brandTickets.length === 1 ? '' : 's'}`, domain: 'communications' },
  ];

  const actionRows: QueueRowData[] = quickActions.map((a) => ({
    id: a.id,
    title: a.label,
    meta: a.hint,
    domain: a.domain,
    testId: `action-${a.id}`,
    onOpen: go(a.id),
    actionLabel: 'Open',
  }));

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
      meta: `ordered ${p.orderDate}`,
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
        description={`${brandProfile.businessName || 'Brand portal'}${brandProfile.category ? ` · ${brandProfile.category}` : ''} — what needs your attention, what is moving and what is blocked.`}
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
              <div className="mt-2.5 flex items-start gap-2 border-t border-white/[0.06] pt-2.5">
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

            <ContextPanel title="Next actions">
              <Queue rows={actionRows} density="comfortable" />
            </ContextPanel>

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
          <MetricBand items={kpiCells} loading={loading} />
        </WorkspaceSection>

        <WorkspaceSection
          title="Needs your attention"
          description="Exceptions that require a brand action — derived from real tenant data only."
          domain="risk"
        >
          <Queue
            rows={attentionRows}
            empty={
              <div className="flex items-center gap-2.5 px-3.5 py-3">
                <StatusBadge tone="success" dataStatus="success">
                  All clear
                </StatusBadge>
                <p className="text-xs text-zinc-400">No current issues need your attention.</p>
              </div>
            }
          />
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
              action={<Button size="sm" onClick={go('logistics')}>Create a shipment</Button>}
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
        className={payoutsPulse ? 'rounded-ds-lg ring-1 ring-white/20' : undefined}
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
                      <span className="font-mono text-xs text-white">{c.purchaseOrderId}</span>
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
                    <span className="font-mono text-xs font-semibold text-white">
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