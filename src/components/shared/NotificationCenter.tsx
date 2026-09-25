import { useEffect, useState, useSyncExternalStore } from 'react';
import { cn } from '@/utils/cn';
import {
  AlertTriangle,
  Bell,
  CreditCard,
  FileText,
  FileWarning,
  Gavel,
  Inbox,
  ListChecks,
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
import {
  PO_ACK_CHANNEL_LABELS,
  poAckInAppDeliveries,
  poAckNotificationVersion,
  subscribePoAckNotifications,
} from '@/lib/commerce/poAcknowledgementNotifications';
import { renewalUrgency } from '@/lib/contracts';
import { documentsAwaitingDownload } from '@/lib/documents/poDocumentPack';
import { useWorkItems } from '@/lib/work/useWork';
import { WORK_SOURCE_LABELS } from '@/lib/work/workStore';

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
  kind: 'po' | 'contract' | 'compliance' | 'deduction' | 'score' | 'submission' | 'shipment' | 'commerce' | 'work' | 'documents';
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
    )
    .concat(
      /**
       * §P6 — THE DOCUMENT PACK IS READY AND NOT YET DOWNLOADED.
       *
       * Programme decisions 6/9: the pack is the Logistics Hub's core deliverable
       * and it is produced automatically on acceptance, so the brand's remaining
       * job is to download & print it before dispatch. Derived from the SAME ONE
       * rule the Logistics Hub nav badge uses
       * (`src/lib/documents/poDocumentPack.ts → documentsAwaitingDownload`), so a
       * notification can never disagree with the badge or with the pack itself.
       *
       * BRAND SESSIONS ONLY (`tenantId !== null`): downloading and printing the
       * documents is the BRAND's job, not Mercenta's — Mercenta has already filed
       * the ASN and produced the pack, so surfacing it to admin as "attention"
       * would be a false queue.
       */
      tenantId === null
        ? []
        : pos
            .filter(documentsAwaitingDownload)
            .map((p) => ({
              id: `docs-${p.id}`,
              kind: 'documents' as const,
              title: `Shipping documents ready — ${p.poNumber}`,
              detail: `${brandName(p.brandId)} · download & print before dispatch`,
              severity: 'medium' as const,
              navTarget: 'logistics',
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

  /* §Sprint — the canonical work layer, scoped by the session's own tier. */
  const workScope: 'admin' | 'brand' = isBrandSession ? 'brand' : 'admin';
  const workItems = useWorkItems(workScope, tenantId);

  /**
   * §P13 / S5 — THE IN-APP CHANNEL OF THE ACKNOWLEDGEMENT FAN-OUT.
   *
   * The declared reminder schedule (12/6/2h remaining) reaches the brand through the
   * SAME ledger the fan-out writes
   * (`src/lib/commerce/poAcknowledgementNotifications.ts`) — no second notification
   * store, and no re-derivation of the window or of the rule's wording.
   *
   * TENANT SCOPING: `poAckInAppDeliveries(scope, tenantId)` filters INSIDE the
   * domain and fails closed for a brand scope with no tenant, so this shared shell
   * can never present another brand's notification.
   */
  const fanoutVersion = useSyncExternalStore(
    subscribePoAckNotifications,
    poAckNotificationVersion,
    poAckNotificationVersion
  );
  void fanoutVersion;
  const poAckReminders = poAckInAppDeliveries(workScope, tenantId);
  const poTarget = isBrandSession ? 'purchase_orders' : 'purchase_orders_admin';

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
          // §Phase E6 (G4) — truthful provenance from the canonical `Deduction`
          // flag (never inferred from text). Non-simulated rows are unchanged.
          detail: `${brandName(d.brandId)} · ${d.purchaseOrderId} · ${d.reason}${d.simulated ? ' · (sim)' : ''}`,
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
    )
    .concat(
      /**
       * §Sprint — the canonical WORK layer. Only the sources NOT already surfaced
       * by another kind are included, so nothing is double-counted. Because the
       * list comes from `getWorkItems` (which excludes resolved items), completing
       * the action — or resolving the item — REMOVES the notification. That is the
       * reminder-stops-on-resolution rule, enforced by the store rather than by a
       * second, drifting list here.
       */
      workItems
        .filter((w) => WORK_NOTIFY_SOURCES.has(w.source))
        .map((w) => ({
          id: `work-${w.id}`,
          kind: 'work' as const,
          title: w.title,
          detail: `${w.detail} · ${WORK_SOURCE_LABELS[w.source]}${w.dueDate ? ` · due ${w.dueDate}` : ''}`,
          severity: w.priority === 'critical' ? ('high' as const) : ('medium' as const),
          navTarget: workScope === 'brand' ? 'work' : 'work',
        }))
    )
    /**
     * §P13 / S5 — the DELIVERED acknowledgement reminders (the in-app channel).
     *
     * These are NOT derived from the purchase orders a second time: they are the
     * messages the fan-out actually delivered, so the brand sees the schedule
     * Mercenta sent it — with the channel it arrived on and the stage it belongs to.
     */
    .concat(
      poAckReminders.map((d) => ({
        id: d.id,
        kind: 'po' as const,
        title: d.subject,
        detail: `${brandName(d.brandId)} · ${PO_ACK_CHANNEL_LABELS[d.channel]} · ${d.stage}h reminder · sent by Mercenta`,
        severity: d.finalStage ? ('high' as const) : ('medium' as const),
        navTarget: poTarget,
      }))
    );
}

/** Work sources that no other notification kind already covers. */
const WORK_NOTIFY_SOURCES = new Set<string>([
  'shipment_exception',
  'return_action',
  'outreach_followup',
  'manual',
]);

const KIND_ICON = {
  po: Inbox,
  contract: RefreshCcw,
  compliance: FileWarning,
  deduction: Gavel,
  score: AlertTriangle,
  submission: FileWarning,
  shipment: Truck,
  commerce: CreditCard,
  work: ListChecks,
  documents: FileText,
} as const;

/**
 * §UI/UX Wave 1 — severity presentation. The underlying event data is
 * unchanged; only the visual expression is severity-driven:
 *   high   → critical (red)
 *   medium → warning  (yellow)
 *   none   → success  (green "all clear")
 */
const SEVERITY_TONE = {
  high: 'critical',
  medium: 'warning',
} as const;

export function NotificationCenter({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [open, setOpen] = useState(false);
  const brands = useBrands().data?.data ?? [];
  const brandName = (id: string) =>
    brands.find((b) => b.id === id)?.profile.businessName ?? id;
  // Both halves read the same event stream the daily digest batches.
  const items = [...useNotifications(), ...useNotificationsRest(brandName)];
  const highCount = items.filter((i) => i.severity === 'high').length;
  const mediumCount = items.length - highCount;

  // §UI/UX — Escape closes the popover (parity with the shell drawer).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function handleClick(n: NotificationItem) {
    setOpen(false);
    if (n.navTarget && onNavigate) {
      onNavigate(n.navTarget);
    }
  }

  const ariaSummary = items.length === 0
    ? 'Notifications — all clear'
    : `Notifications — ${highCount} critical, ${mediumCount} follow-up`;

  return (
    <div className="relative" data-testid="notification-center">
      <button
        type="button"
        className={cn(
          'relative p-1.5 rounded-ds-md transition-colors',
          items.length === 0
            ? 'text-zinc-500 hover:text-zinc-300'
            : highCount > 0
              ? 'text-state-critical'
              : 'text-state-warning'
        )}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="notification-panel"
        aria-label={ariaSummary}
      >
        <Bell className="w-4 h-4" aria-hidden="true" />
        {items.length > 0 && (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full text-ds-micro font-bold flex items-center justify-center px-0.5',
              highCount > 0 ? 'bg-state-critical text-white' : 'bg-state-warning text-white'
            )}
          >
            {items.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            id="notification-panel"
            role="dialog"
            aria-label={ariaSummary}
            className="absolute right-0 top-9 z-50 w-[380px] bg-ink-900 border border-white/[0.08] rounded-xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <span className="text-xs font-semibold text-white">Needs attention</span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-ds-micro font-medium border',
                  items.length === 0
                    ? 'bg-state-success/10 border-state-success/20 text-state-success'
                    : highCount > 0
                      ? 'bg-state-critical/10 border-state-critical/20 text-state-critical'
                      : 'bg-state-warning/10 border-state-warning/20 text-state-warning'
                )}
              >
                {items.length === 0
                  ? 'All clear'
                  : `${highCount} critical · ${mediumCount} follow-up`}
              </span>
            </div>
            <div className="max-h-[420px] overflow-y-auto divide-y divide-white/[0.04]" data-testid="notification-list">
              {items.length === 0 && (
                <p className="text-xs text-zinc-600 text-center py-8">
                  No open exceptions across the portfolio. Everything is being tracked.
                </p>
              )}
              {items.map((n) => {
                const Icon = KIND_ICON[n.kind];
                const tone = SEVERITY_TONE[n.severity];
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    data-severity={tone}
                    data-notification={n.kind}
                    className="w-full flex items-start gap-2.5 px-4 py-2.5 hover:bg-white/[0.05] text-left transition-colors"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-0.5 w-4 h-4 rounded-full flex items-center justify-center',
                        tone === 'critical' ? 'bg-state-critical/10 text-state-critical' : 'bg-state-warning/10 text-state-warning'
                      )}
                    >
                      <Icon className="w-3 h-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-ds-label font-medium text-white leading-snug">{n.title}</span>
                      <span className="block text-ds-micro text-zinc-500 truncate">{n.detail}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-2 border-t border-white/[0.06] text-ds-micro text-zinc-600">
              Same event stream as the daily email digest — no second pipeline.
            </div>
          </div>
        </>
      )}
    </div>
  );
}


