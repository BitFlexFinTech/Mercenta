import { useState } from 'react';
import { cn } from '@/utils/cn';
import {
  AlertTriangle,
  Bell,
  CreditCard,
  FileWarning,
  Gavel,
  Inbox,
  RefreshCcw,
  Truck,
} from 'lucide-react';
import { useApp } from '@/context/GlobalStateContext';
import { demoCommerceInvoices, demoCommercePayments, demoPurchaseOrders } from '@/data/demoStore';
import {
  useBrands,
  useCatalogSubmissions,
  useComplianceDocuments,
  useContracts,
  useDeductions,
  useFulfillmentScores,
  usePurchaseOrders,
  useShipmentsAll,
} from '@/data/queries';
import { isBorderline } from '@/lib/automation/scoringBridge';
import { renewalUrgency } from '@/lib/contracts';

/**
 * §Stage-19.3 — In-app notification center.
 * Real-time "needs attention" items in the admin shell. Reads the SAME event
 * data the Stage-13 daily digest batches — never a second pipeline.
 *
 * §Stage-20.3 SECURITY FIX — tenant scoping: when the session is a BRAND
 * login, every list is filtered to that brand's own records BEFORE rendering.
 * A brand must never see another brand's PO values, renewal dates, deduction
 * reasons, or compliance status.
 */

/** Tenant scope helper: null = staff/admin (sees all), else the brand id. */
function useTenantScope(): string | null {
  const { session } = useApp();
  return session?.tier === 'brand' ? (session.tenantId ?? null) : null;
}

export interface NotificationItem {
  id: string;
  kind: 'po' | 'contract' | 'compliance' | 'deduction' | 'score' | 'submission' | 'shipment' | 'commerce';
  title: string;
  detail: string;
  severity: 'high' | 'medium';
  /** §Batch-10 — navigation target when clicked. */
  navTarget?: string;
}

function useNotifications(): NotificationItem[] {
  const tenantId = useTenantScope();
  const { session } = useApp();
  // Resolve nav targets based on session role
  const isBrandSession = session?.tier === 'brand';
  const poTarget = isBrandSession ? 'purchase_orders' : 'purchase_orders_admin';
  const contractTarget = isBrandSession ? 'contracts' : 'contracts_admin';
  const inScope = <T extends { brandId: string }>(rows: T[]): T[] =>
    tenantId ? rows.filter((r) => r.brandId === tenantId) : rows;

  const brands = useBrands().data?.data ?? [];
  const brandName = (id: string) =>
    brands.find((b) => b.id === id)?.profile.businessName ?? id;
  const pos = inScope(usePurchaseOrders().data?.data ?? []);
  const contracts = inScope(useContracts().data?.data ?? []);
  const scores = inScope(useFulfillmentScores().data?.data ?? []);

  return ([] as NotificationItem[])
    .concat(
      pos
        .filter((p) => p.status === 'received' || p.status === 'under_review')
        .map((p) => ({
          id: `po-${p.id}`,
          kind: 'po' as const,
          title: `PO ${p.poNumber} awaiting action`,
          detail: `${brandName(p.brandId)} · £${p.poValue.toLocaleString()} · ${p.status.replace(/_/g, ' ')}`,
          severity: 'high' as const,
          navTarget: poTarget,
        }))
    )
    .concat(
      // §Batch-0.5 — Cross-role PO notifications: brand's acknowledgment visible to admin
      tenantId === null // admin/staff sees all; brand login sees only its own
        ? pos
            .filter((p) => p.acknowledgedAt && ['accepted', 'ready_to_fulfil'].includes(p.status))
            .map((p) => ({
              id: `po-ack-${p.id}`,
              kind: 'po' as const,
              title: `PO ${p.poNumber} acknowledged by brand`,
              detail: `${brandName(p.brandId)} · £${p.poValue.toLocaleString()} · lines: ${p.lineItems.filter((l) => l.ackStatus === 'accepted' || l.ackStatus === 'backordered').length}/${p.lineItems.length} accepted`,
              severity: 'medium' as const,
              navTarget: poTarget,
            }))
        : []
    )
    .concat(
      pos
        .filter((p) => p.status === 'rejected')
        .map((p) => ({
          id: `po-rej-${p.id}`,
          kind: 'po' as const,
          title: `PO ${p.poNumber} was REJECTED`,
          detail: `${brandName(p.brandId)} · £${p.poValue.toLocaleString()} · all lines rejected`,
          severity: 'high' as const,
          navTarget: poTarget,
        }))
    )
    .concat(
      contracts
        .map((c) => ({ c, urgency: renewalUrgency(c.renewalDate, new Date().toISOString()) }))
        .filter(({ urgency }) => urgency !== 'ok')
        .map(({ c, urgency }) => ({
          id: `contract-${c.id}`,
          kind: 'contract' as const,
          title: `Contract ${c.type.replace(/_/g, ' ')} ${urgency === 'expired' ? 'EXPIRED' : `renews ≤ ${urgency.replace('d', '')} days`}`,
          detail: `${brandName(c.brandId)} · renews ${c.renewalDate}`,
          severity:
            urgency === 'expired' || urgency === '7d'
              ? ('high' as const)
              : ('medium' as const),
        }))
    )
    .concat(
      scores
        .filter((s) => !s.manualOverride && isBorderline(s.totalScore))
        .map((s) => ({
          id: `score-${s.brandId}`,
          kind: 'score' as const,
          title: `Fulfillment score borderline (${s.totalScore})`,
          detail: `${brandName(s.brandId)} · held for manual review`,
          severity: 'medium' as const,
        }))
    );
}

function useNotificationsRest(brandName: (id: string) => string): NotificationItem[] {
  const tenantId = useTenantScope();
  const { session } = useApp();
  const isBrandSession = session?.tier === 'brand';
  const shipTarget = isBrandSession ? 'logistics' : 'logistics'; // both brand+admin use 'logistics' view
  /** §Phase E5 (G7) — where the operational commerce surface lives per session. */
  const commerceTarget = isBrandSession ? 'purchase_orders' : 'retail_pipeline';
  const inScope = <T extends { brandId: string }>(rows: T[]): T[] =>
    tenantId ? rows.filter((r) => r.brandId === tenantId) : rows;

  const submissions = inScope(useCatalogSubmissions().data?.data ?? []);
  const deductions = inScope(useDeductions().data?.data ?? []);
  const complianceDocs = inScope(useComplianceDocuments().data?.data ?? []);
  const shipments = inScope(useShipmentsAll().data?.data ?? []);

  /**
   * §Phase E5 (G7) — canonical operational-commerce items.
   *
   * Derived from the SAME canonical stores the E4 lifecycle writes
   * (`demoCommerceInvoices` / `demoCommercePayments` / `demoPurchaseOrders`).
   * No second notification store, nothing re-derived, and every item states its
   * simulation provenance truthfully — nothing claims a live provider acted.
   * Only states NOT already covered by the `po`/`deduction` kinds are surfaced,
   * so nothing is double-counted.
   */
  const commerceInvoices = tenantId
    ? demoCommerceInvoices.filter((i) => i.brandId === tenantId)
    : demoCommerceInvoices;
  const paidInvoiceIds = new Set(demoCommercePayments.map((p) => p.invoiceId));
  const invoicedPoIds = new Set(demoCommerceInvoices.map((i) => i.purchaseOrderId));
  const simulatedPos = tenantId
    ? demoPurchaseOrders.filter((p) => p.brandId === tenantId && p.simulated === true)
    : demoPurchaseOrders.filter((p) => p.simulated === true);

  return ([] as NotificationItem[])
    .concat(
      submissions
        .filter((s) => s.status === 'rejected')
        .map((s) => ({
          id: `sub-${s.id}`,
          kind: 'submission' as const,
          title: 'Rejected catalog submission needs human',
          detail: `${s.productName} · ${s.rejectionReason ?? 'no reason recorded'}`,
          severity: 'medium' as const,
        }))
    )
    .concat(
      deductions
        .filter((d) => d.status === 'open' || d.status === 'disputed')
        .map((d) => ({
          id: `ded-${d.id}`,
          kind: 'deduction' as const,
          title: `Deduction −£${d.amountGbp.toFixed(2)} ${d.status}`,
          detail: `${brandName(d.brandId)} · ${d.purchaseOrderId} · ${d.reason}`,
          severity: d.status === 'open' ? ('high' as const) : ('medium' as const),
        }))
    )
    .concat(
      complianceDocs
        .filter((d) => d.status === 'under_review' || d.status === 'uploaded')
        .map((d) => ({
          id: `comp-${d.id}`,
          kind: 'compliance' as const,
          title: `Compliance doc awaiting review (${d.type.replace(/_/g, ' ')})`,
          detail: brandName(d.brandId),
          severity: 'medium' as const,
        }))
    )
    .concat(
      // §Batch-0.5 — cross-role shipment/ASN notifications
      // Show active (in-transit) shipments as cross-role notifications for admin
      tenantId === null
        ? shipments
            .filter((s) => s.status === 'factory_intake' || s.status === 'sea_transit')
            .map((s) => ({
              id: `ship-${s.id}`,
              kind: 'shipment' as const,
              title: `ASN filed for ${s.poNumber}`,
              detail: `${brandName(s.brandId)} · ${s.carrier} · ${s.status.replace(/_/g, ' ')} · £${s.value.toLocaleString()}`,
              severity: 'medium' as const,
              navTarget: shipTarget,
            }))
        : []
    )
    .concat(
      commerceInvoices
        .filter((i) => i.status === 'issued' && !paidInvoiceIds.has(i.id))
        .map((i) => ({
          id: `commerce-pay-${i.id}`,
          kind: 'commerce' as const,
          title: `Simulated invoice ${i.number} awaiting payment`,
          detail: `${brandName(i.brandId)} · £${i.subtotalGbp.toFixed(2)} · (sim) — no live payment provider contacted`,
          severity: 'medium' as const,
          navTarget: commerceTarget,
        }))
    )
    .concat(
      simulatedPos
        .filter((p) => p.status === 'delivered' && !invoicedPoIds.has(p.id))
        .map((p) => ({
          id: `commerce-inv-${p.id}`,
          kind: 'commerce' as const,
          title: `Simulated PO ${p.poNumber} delivered — invoice outstanding`,
          detail: `${brandName(p.brandId)} · £${p.poValue.toFixed(2)} · (sim)`,
          severity: 'medium' as const,
          navTarget: commerceTarget,
        }))
    );
}

const KIND_ICON = {
  po: Inbox,
  contract: RefreshCcw,
  compliance: FileWarning,
  deduction: Gavel,
  score: AlertTriangle,
  submission: FileWarning,
  shipment: Truck,
  commerce: CreditCard,
} as const;

export function NotificationCenter({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [open, setOpen] = useState(false);
  const brands = useBrands().data?.data ?? [];
  const brandName = (id: string) =>
    brands.find((b) => b.id === id)?.profile.businessName ?? id;
  // Both halves read the same event stream the daily digest batches.
  const items = [...useNotifications(), ...useNotificationsRest(brandName)];
  const highCount = items.filter((i) => i.severity === 'high').length;

  function handleClick(n: NotificationItem) {
    setOpen(false);
    if (n.navTarget && onNavigate) {
      onNavigate(n.navTarget);
    }
  }

  return (
    <div className="relative">
      <button
        className="relative p-1.5 text-zinc-500 hover:text-white transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications — ${items.length} items need attention`}
      >
        <Bell className="w-4 h-4" />
        {items.length > 0 && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full text-[8px] font-bold flex items-center justify-center px-0.5',
              highCount > 0 ? 'bg-red-500 text-white' : 'bg-brass-500 text-black'
            )}
          >
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 w-[380px] bg-ink-900 border border-white/[0.08] rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <span className="text-xs font-semibold text-white">Needs attention</span>
              <span className="text-[10px] text-zinc-500">
                {items.length} item{items.length === 1 ? '' : 's'} · {highCount} high priority
              </span>
            </div>
            <div className="max-h-[420px] overflow-y-auto divide-y divide-white/[0.04]">
              {items.length === 0 && (
                <p className="text-xs text-zinc-600 text-center py-8">
                  Nothing needs attention right now.
                </p>
              )}
              {items.map((n) => {
                const Icon = KIND_ICON[n.kind];
                return (
                  <button key={n.id} onClick={() => handleClick(n)} className="w-full flex items-start gap-2.5 px-4 py-2.5 hover:bg-white/[0.04] text-left transition-colors">
                    <Icon
                      className={cn(
                        'w-3.5 h-3.5 mt-0.5 flex-shrink-0',
                        n.severity === 'high' ? 'text-red-400' : 'text-amber-400'
                      )}
                    />
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-white leading-snug">{n.title}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{n.detail}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-2 border-t border-white/[0.06] text-[9px] text-zinc-600">
              Same event stream as the daily email digest — no second pipeline.
            </div>
          </div>
        </>
      )}
    </div>
  );
}


