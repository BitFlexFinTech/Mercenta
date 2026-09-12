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
import { useCallback, useMemo } from 'react';
import {
  useBrands,
  useCatalogSubmissions,
  useComplianceDocuments,
  useContracts,
  useDeductions,
  useMessages,
  usePurchaseOrders,
  useShipmentsAll,
} from '@/data/queries';
import { demoCommerceInvoices, demoCommercePayments } from '@/data/demoStore';
import { renewalUrgency } from '@/lib/contracts';
import { demoTickets } from '@/lib/helpdesk/ticketStore';
import { Alert, Button, EmptyState, PageHeader, StatusBadge, Skeleton } from '@/components/ui';
import type { StatusTone } from '@/components/ui';
import {
  AttentionPanel,
  DashboardSection,
  KpiGroup,
  type KpiCellData,
} from '@/components/shared/dashboard';
import { STATUS_LABELS } from '@/types';
import type { AdminDepartment, ShipmentStatus } from '@/types';
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
  const q = useMemo(() => ({
    brands: brandsData?.data ?? [] as NonNullable<typeof brandsData>['data'],
    posAll: posData?.data ?? [] as NonNullable<typeof posData>['data'],
    docsAll: docsData?.data ?? [] as NonNullable<typeof docsData>['data'],
    contractsAll: contractsData?.data ?? [] as NonNullable<typeof contractsData>['data'],
    messagesAll: messagesData?.data ?? [] as NonNullable<typeof messagesData>['data'],
    shipmentsAll: shipmentsData?.data ?? [] as NonNullable<typeof shipmentsData>['data'],
    deductionsAll: deductionsData?.data ?? [] as NonNullable<typeof deductionsData>['data'],
    submissionsAll: submissionsData?.data ?? [] as NonNullable<typeof submissionsData>['data'],
  }), [
    brandsData,
    posData,
    docsData,
    contractsData,
    messagesData,
    shipmentsData,
    deductionsData,
    submissionsData,
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

  const kpis: KpiCellData[] = [
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
  ];

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
      <div className="p-6 max-w-[1400px] mx-auto space-y-6" data-testid="dashboard-loading" aria-busy="true">
        <PageHeader title="Operations Overview" description="Loading operational state…" />
        <KpiGroup items={kpis} loading />
        <DashboardSection title="Needs your attention">
          <div className="space-y-2.5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </DashboardSection>
      </div>
    );
  }

  if (!dataReady && (anyError || (posAll.length === 0 && docsAll.length === 0))) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto space-y-6" data-testid="dashboard-error">
        <PageHeader title="Operations Overview" description="Operational state could not be loaded." />
        <Alert tone="error" title="Dashboard data unavailable">
          The overview could not load purchase orders, brands or compliance documents. Check the
          Monitoring view for integration health, then return to the overview.
        </Alert>
        <Button variant="secondary" onClick={go('monitoring')}>Open Monitoring</Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6" data-testid="dashboard-loaded">
      <PageHeader
        title="Operations Overview"
        description={`${brands.length} brands on platform · ${posAll.length} purchase orders · ${docsAll.length} compliance documents · ${messagesAll.length} messages in thread history`}
      />

      {anyError && (
        <Alert tone="error" title="Some dashboard data is unavailable">
          A datasource reported an error; seed data is shown where available. Check Monitoring for
          integration health.
        </Alert>
      )}

      <DashboardSection
        title="Portfolio at a glance"
        description="Derived live from purchase orders, compliance, contracts, support and billing data."
      >
        <KpiGroup items={kpis} />
      </DashboardSection>

      <DashboardSection
        title="Needs your attention"
        description="Priority-ordered exceptions across the portfolio. Each row routes to the existing destination view."
        action={
          activeTickets.length > 0 ? (
            <Button variant="secondary" size="sm" onClick={go('helpdesk')}>
              Open Helpdesk <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Button>
          ) : undefined
        }
      >
        <AttentionPanel items={attention} />
      </DashboardSection>

      <DashboardSection
        title="Next actions"
        description="Highest-value operator moves, pre-counted from current data."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.id}
                type="button"
                onClick={go(a.id)}
                data-testid={`action-${a.id}`}
                className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-ink-850 px-3.5 py-3 text-left hover:border-brass-500/40 hover:bg-white/[0.02] transition-colors min-h-[36px]"
              >
                <Icon className="w-4 h-4 text-brass-400 flex-shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-medium text-white">{a.label}</span>
                  <span className="block text-[11px] text-zinc-500">{a.count} {a.desc}</span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className={
                    a.count === 0
                      ? 'w-3.5 h-3.5 flex-shrink-0 text-zinc-600'
                      : 'w-3.5 h-3.5 flex-shrink-0 text-brass-400'
                  }
                />
              </button>
            );
          })}
        </div>
      </DashboardSection>
<DashboardSection
        title="Fulfilment in motion"
        description={
          shipmentsAll.length > 0
            ? 'Aggregated live shipments across all carriers.'
            : 'Accepted and ready-to-fulfil POs awaiting dispatch.'
        }
      >
        {fulfilmentRows.length === 0 ? (
          <EmptyState
            title="Nothing in fulfilment right now"
            description="Accepted and ready-to-fulfil purchase orders will appear here, and shipments once a PO moves into dispatch."
          />
        ) : (
          <ul className="divide-y divide-white/[0.05] rounded-lg border border-white/[0.06] bg-ink-850">
            {fulfilmentRows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5">
                <span className="font-mono text-[11px] text-zinc-400 flex-shrink-0">{r.ref}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-white truncate">{r.title}</span>
                  <span className="block text-[11px] text-zinc-500 truncate leading-snug">{r.meta}</span>
                </span>
                <StatusBadge tone={r.tone} dataStatus={r.tone}>{r.status}</StatusBadge>
                <Button variant="tertiary" size="sm" onClick={r.onOpen}>
                  Review <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>

      <DashboardSection
        title="Recent communications"
        description="Latest message threads from the shared inbox, newest first."
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
          <ul className="divide-y divide-white/[0.05] rounded-lg border border-white/[0.06] bg-ink-850">
            {recentMessages.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5">
                <StatusBadge
                  tone={m.direction === 'inbound' ? 'info' : 'neutral'}
                  dataStatus={m.direction}
                >
                  {m.channel.toUpperCase()}
                </StatusBadge>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-white truncate">{m.subject ?? m.body}</span>
                  <span className="block text-[11px] text-zinc-500 truncate leading-snug">
                    {brandName.get(m.brandId) ?? m.brandId} · {m.direction} · {m.createdAt.slice(0, 16).replace('T', ' ')}
                  </span>
                </span>
                {m.requiresHuman && (
                  <StatusBadge tone="warning" dataStatus="human">Human reply needed</StatusBadge>
                )}
                <Button variant="tertiary" size="sm" onClick={go('messages')}>
                  Open <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>
    </div>
  );
}