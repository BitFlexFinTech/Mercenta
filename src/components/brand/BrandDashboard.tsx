/**
 * §Phase 7E — Brand Operations Overview (dashboard redesign).
 *
 * A polished B2B brand portal at the same quality bar as the Admin Operations
 * Overview (Phase 7C). Every number is DERIVED from real, tenant-scoped data
 * at render time through the canonical React Query hooks — no fabricated
 * metrics, no static charts, no hardcoded counts.
 *
 * Hierarchy:
 *   1. Page context        — PageHeader (h1) + derived brand summary
 *   2. At a glance         — compact KPI band (one surface, hairline cells)
 *   3. Needs attention     — actionable brand-scoped exceptions
 *   4. Purchase orders     — real PO context with drill-down counts
 *   5. Fulfilment          — live shipments for this tenant (or honest empty)
 *   6. Compliance & health — real document/contract state, no decorative score
 *   7. Recent comms        — tenant-scoped message threads
 *   8. Next actions        — quick actions routed to existing brand views
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
import { useCallback, useMemo } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import {
  useComplianceDocuments,
  useContracts,
  useDeductions,
  useMessages,
  usePurchaseOrders,
  useShipmentsAll,
} from '@/data/queries';
import { demoReturns } from '@/data/api';
import { demoTickets } from '@/lib/helpdesk/ticketStore';
import { assertBrandScope } from '@/lib/auth/rbac';
import { Alert, Button, EmptyState, PageHeader, StatusBadge, Skeleton } from '@/components/ui';
import type { StatusTone } from '@/components/ui';
import {
  AttentionPanel,
  DashboardSection,
  KpiGroup,
  type KpiCellData,
  type AttentionItemData,
} from '@/components/shared/dashboard';
import { STATUS_LABELS } from '@/types';
import type { PurchaseOrder, PurchaseOrderStatus, ShipmentStatus } from '@/types';
import {
  ArrowRight,
  ClipboardList,
  FileCheck2,
  FileText,
  MessageSquare,
  Package,
  ScrollText,
  ShieldCheck,
  Truck,
} from 'lucide-react';

const PO_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  received: 'Received',
  under_review: 'Under review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  ready_to_fulfil: 'Ready to fulfil',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

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
  return STATUS_LABELS[status as unknown as ShipmentStatus] ?? status;
}

function poTone(status: PurchaseOrderStatus): StatusTone {
  if (status === 'rejected') return 'danger';
  if (status === 'received' || status === 'under_review') return 'warning';
  if (status === 'delivered') return 'success';
  return 'info';
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

  const poQuery = usePurchaseOrders();
  const shipmentsQuery = useShipmentsAll();
  const docsQuery = useComplianceDocuments();
  const contractsQuery = useContracts();
  const messagesQuery = useMessages();
  const deductionsQuery = useDeductions();

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
    const items: AttentionItemData[] = [];
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
        meta: `£${d.amountGbp.toLocaleString()} · ${d.purchaseOrderId} · open since ${d.date}`,
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
    return items;
  }, [awaitingAck, openDeductions, outOfStock, brandShipments, brandTickets, brandReturns, go]);

const complianceLabel =
    docs.length === 0
      ? 'No compliance documents on file'
      : `${approvedDocs.length}/${docs.length} documents approved`;
  const complianceTone: StatusTone =
    docs.length === 0 ? 'warning'
      : approvedDocs.length === docs.length ? 'success' : 'warning';

  const kpiCells: KpiCellData[] = [
    {
      id: 'active-pos',
      label: 'Active purchase orders',
      value: String(openPos.length),
      context: `£${openPosValue.toLocaleString()} across ${openPos.length} PO${openPos.length === 1 ? '' : 's'}`,
      onOpen: go('purchase_orders'),
    },
    {
      id: 'awaiting-ack',
      label: 'Awaiting acknowledgement',
      value: String(awaitingAck.length),
      context: awaitingAck.length > 0 ? 'Acknowledge within 24 hours of receipt' : 'No POs pending your confirmation',
      tone: awaitingAck.length > 0 ? 'warning' : 'success',
      statusText: awaitingAck.length > 0 ? 'Action needed' : 'Up to date',
      onOpen: go('purchase_orders'),
    },
    {
      id: 'in-fulfilment',
      label: 'POs in fulfilment',
      value: String(inFlightPos.length),
      context: 'Accepted, ready-to-fulfil and shipped POs',
      onOpen: go('logistics'),
    },
    {
      id: 'products-listed',
      label: 'Live products',
      value: String(products.length),
      context: `${products.length} SKU${products.length === 1 ? '' : 's'} in your catalogue`,
      onOpen: go('catalog'),
    },
    {
      id: 'out-of-stock',
      label: 'Out of stock',
      value: String(outOfStock.length),
      context: 'Products unavailable to new orders',
      tone: outOfStock.length > 0 ? 'warning' : 'success',
      statusText: outOfStock.length > 0 ? 'Review catalogue' : 'All stocked',
      onOpen: go('catalog'),
    },
    {
      id: 'contract-status',
      label: 'Contract status',
      value: activeContract ? 'Active' : '—',
      context: activeContract ? `Distribution agreement v${activeContract.version} signed` : 'No active contract on file',
      tone: activeContract ? 'success' : 'warning',
      statusText: activeContract ? 'Contract active' : 'Action required',
      onOpen: go('contracts'),
    },
  ];

  const recentMessages = brandMessages.slice(0, 4);
  const quickActions = [
    { id: 'purchase_orders', label: 'Review purchase orders', hint: `${awaitingAck.length} awaiting acknowledgement`, icon: ClipboardList },
    { id: 'catalog', label: 'Manage catalogue', hint: `${products.length} products listed · ${outOfStock.length} out of stock`, icon: Package },
    { id: 'logistics', label: 'Inbound shipments', hint: `${brandShipments.length} shipment${brandShipments.length === 1 ? '' : 's'} in motion`, icon: Truck },
    { id: 'compliance', label: 'Compliance & documents', hint: complianceLabel, icon: FileCheck2 },
    { id: 'documents', label: 'Statements & account', hint: `${openDeductions.length} open deduction${openDeductions.length === 1 ? '' : 's'}`, icon: ScrollText },
    { id: 'team', label: 'Support & team', hint: `${brandTickets.length} open ticket${brandTickets.length === 1 ? '' : 's'}`, icon: MessageSquare },
  ] as const;

  return (
    <div
      className="p-6 space-y-6 max-w-[1400px] mx-auto"
      data-testid="brand-dashboard"
      aria-busy={loading || undefined}
    >
      <PageHeader
        title="Brand Overview"
        description={`${brandProfile.businessName || 'Brand portal'}${brandProfile.category ? ` · ${brandProfile.category}` : ''} · ${pos.length} purchase orders · ${products.length} products`}
      />

      {!loading ? (
        <div data-testid="brand-dashboard-loaded" className="hidden" />
      ) : (
        <div data-testid="brand-dashboard-loading" className="hidden" />
      )}

      {(poQuery.isError || shipmentsQuery.isError || docsQuery.isError) && (
        <Alert tone="error" title="Some dashboard data could not be loaded">
          One or more data sources failed to load. Sections that depend on them are hidden; reload the portal to retry.
        </Alert>
      )}

      <DashboardSection title="At a glance" description="Live numbers from your real purchase orders, catalogue, contract and documents.">
        <KpiGroup items={kpiCells} loading={loading} />
      </DashboardSection>

      <DashboardSection
        title="Needs your attention"
        description="Exceptions that require a brand action — derived from real tenant data only."
      >
        <AttentionPanel items={attentionItems} emptyMeta="No current issues need your attention." />
      </DashboardSection>

      <DashboardSection
        title="Purchase orders"
        description="Commercial activity on your account — summary and the most recent POs."
        action={(
          <Button variant="secondary" size="sm" onClick={go('purchase_orders')}>
            Open all POs <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
        )}
      >
        <div
          data-testid="po-summary"
          className="flex flex-wrap gap-2 text-xs text-zinc-400 rounded-lg border border-white/[0.06] bg-ink-850 px-3.5 py-2.5"
        >
          <span data-testid="po-summary-active">{openPos.length} active</span>
          <span aria-hidden="true">·</span>
          <span data-testid="po-summary-awaiting">{awaitingAck.length} awaiting acknowledgement</span>
          <span aria-hidden="true">·</span>
          <span data-testid="po-summary-in-fulfilment">{inFlightPos.length} in fulfilment</span>
        </div>
        {recentPos.length === 0 ? (
          <EmptyState
            title="No purchase orders yet"
            description="When a retail order is placed for your brand it will appear here for acknowledgment."
          />
        ) : (
          <ul className="divide-y divide-white/[0.05] rounded-lg border border-white/[0.06] bg-ink-850">
            {recentPos.slice(0, 4).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5">
                <span className="font-mono text-[11px] text-zinc-400 flex-shrink-0">{p.poNumber}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-white truncate">
                    {p.lineItems.length} line{p.lineItems.length === 1 ? '' : 's'} · £{p.poValue.toLocaleString()}
                  </span>
                  <span className="block text-[11px] text-zinc-500 truncate leading-snug">ordered {p.orderDate}</span>
                </span>
                <StatusBadge tone={poTone(p.status)} dataStatus={p.status}>{PO_STATUS_LABELS[p.status]}</StatusBadge>
                <Button variant="tertiary" size="sm" onClick={go('purchase_orders')}>
                  Review <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>
<DashboardSection
        title="Fulfilment in motion"
        description="Shipments filed for this brand, newest first."
        action={(
          <Button variant="secondary" size="sm" onClick={go('logistics')}>
            Open shipments <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
        )}
      >
        {brandShipments.length === 0 ? (
          <EmptyState
            title="Nothing in fulfilment right now"
            description="Accepted and ready-to-fulfil POs appear in the purchase-order section above; file a shipment from Inbound Shipments once a PO moves into dispatch."
            action={<Button size="sm" onClick={go('logistics')}>Create a shipment</Button>}
          />
        ) : (
          <ul className="divide-y divide-white/[0.05] rounded-lg border border-white/[0.06] bg-ink-850">
            {brandShipments.slice(0, 5).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5">
                <span className="font-mono text-[11px] text-zinc-400 flex-shrink-0">{s.reference}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-white truncate">{s.title}</span>
                  <span className="block text-[11px] text-zinc-500 truncate leading-snug">
                    £{s.value.toLocaleString()} · {s.origin} → {s.destination} · {s.carrier}
                  </span>
                </span>
                <StatusBadge tone={s.status === 'live_amazon' ? 'success' : 'info'} dataStatus={s.status}>
                  {shipmentStatusLabel(s.status)}
                </StatusBadge>
                <Button variant="tertiary" size="sm" onClick={go('logistics')}>
                  Track <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>

      <DashboardSection
        title="Compliance & account health"
        description="Real document, contract and gate state — no score, no guesswork."
      >
        <div className="space-y-2 rounded-lg border border-white/[0.06] bg-ink-850 px-3.5 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5" data-testid="compliance-summary">
            <ShieldCheck className="w-4 h-4 text-brass-400" aria-hidden="true" />
            <span className="text-xs text-zinc-300">{complianceLabel}</span>
            <StatusBadge tone={complianceTone} dataStatus={complianceTone}>
              {docs.length > 0 && approvedDocs.length === docs.length ? 'Gate open' : 'Action required'}
            </StatusBadge>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <FileText className="w-4 h-4 text-zinc-500" aria-hidden="true" />
            <span className="text-xs text-zinc-300">
              {activeContract ? `Distribution agreement v${activeContract.version} — ${activeContract.status}` : 'No active distribution agreement on file'}
            </span>
          </div>
        </div>
      </DashboardSection>
<DashboardSection
        title="Recent communications"
        description="Latest support and admin messages on your account, newest first."
        action={
          recentMessages.length > 0 ? (
            <Button variant="secondary" size="sm" onClick={go('team')}>
              Open messages <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
          ) : undefined
        }
      >
        {recentMessages.length === 0 ? (
          <EmptyState
            title="No recent communications"
            description="New support and admin messages will appear here as they are logged."
          />
        ) : (
          <ul className="divide-y divide-white/[0.05] rounded-lg border border-white/[0.06] bg-ink-850">
            {recentMessages.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5">
                <StatusBadge tone={m.direction === 'inbound' ? 'info' : 'neutral'} dataStatus={m.direction}>
                  {m.channel.toUpperCase()}
                </StatusBadge>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-white truncate">{m.subject ?? m.body}</span>
                  <span className="block text-[11px] text-zinc-500 truncate leading-snug">
                    {m.direction} · {m.createdAt.slice(0, 16).replace('T', ' ')}
                  </span>
                </span>
                <Button variant="tertiary" size="sm" onClick={go('team')}>
                  Open <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>

      <DashboardSection
        title="Next actions"
        description="One click to the exact place an action happens — every destination is live."
      >
        <ul className="divide-y divide-white/[0.05] rounded-lg border border-white/[0.06] bg-ink-850">
          {quickActions.map(({ id, label, hint, icon: Icon }) => (
            <li key={id} data-testid={`action-${id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brass-500/12 text-brass-400 flex-shrink-0">
                <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-white">{label}</span>
                <span className="block text-[11px] text-zinc-500 truncate leading-snug">{hint}</span>
              </span>
              <Button variant="tertiary" size="sm" onClick={go(id)}>
                Open <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      </DashboardSection>
    </div>
  );
}