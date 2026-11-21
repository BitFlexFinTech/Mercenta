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
import { EmptyState } from '@/components/ui';
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
  poAckNotificationVersion,
  poAckReminderChannelDetail,
  poAckReminderViews,
  subscribePoAckNotifications,
} from '@/lib/commerce/poAcknowledgementNotifications';
/** §P13 / S7 — the acknowledgement QUEUE is read from its OWNER, never re-derived. */
import { poAcknowledgementWindow } from '@/lib/commerce/poAcknowledgementWindow';
import { renewalUrgency } from '@/lib/contracts';
import { documentsAwaitingDownload } from '@/lib/documents/poDocumentPack';
import { useWorkItems } from '@/lib/work/useWork';
import { WORK_SOURCE_LABELS } from '@/lib/work/workStore';
/**
 * §BATCH 7 (Part 4.1a) — THE ONE ADDRESS LAYER.
 *
 * A notice is a DEEP LINK: clicking it opens the RECORD it names, through the
 * same address mechanism the rest of the product uses (`navigateProductView` +
 * the record-link registry), never a second navigation path.
 */
import {
  navigateProductView,
  recordLinkQuery,
  type ProductEnvironment,
  type RecordLinkKind,
} from '@/lib/runtime/productRoutes';

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
  /**
   * §P13 / S6 — the optional SECOND line, carrying the item's own record detail
   * where the one-line `detail` cannot state it honestly (the acknowledgement
   * reminder's per-channel disposition: which channel reached which destination,
   * and which could not be used, with its reason). Absent = no second line.
   */
  meta?: string;
  severity: 'high' | 'medium';
  /**
   * §BATCH 7 (Part 4.1a) — WHERE THIS NOTICE LEADS: the RECORD it is about.
   *
   * `kind` selects the query key through the ONE registry
   * (`RECORD_LINK_PARAMS` in `src/lib/runtime/productRoutes.ts`), `view` is the
   * surface that OWNS the record for THIS session (the role-resolved view id),
   * and `id` is the record's own identifier — never a view name, never a
   * section.
   *
   * It is REQUIRED, deliberately. Before this change five of the centre's
   * fourteen item builders did NOTHING when clicked (contract, score,
   * submission, deduction, compliance) and the other nine landed on a SECTION,
   * never the record. Because the field is now required, a builder that forgets
   * a destination is a TYPE error — a dead click cannot be written by accident.
   */
  record: { kind: RecordLinkKind; view: string; id: string };
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
        /**
         * §P13 / S7 — REPOINTED (the old contract is recorded here): this previously
         * hand-rolled `p.status === 'received' || p.status === 'under_review'` — a
         * second copy of the 24-hour rule and of the config's own obligation set. The
         * owner's `inQueue` is Amazon's `New` set INSIDE the window, so a purchase
         * order past its limit is no longer announced as "awaiting action".
         */
        .filter((p) => poAcknowledgementWindow(p).inQueue)
        .map((p) => ({
          id: `po-${p.id}`,
          kind: 'po' as const,
          title: `PO ${p.poNumber} awaiting action`,
          detail: `${brandName(p.brandId)} · £${p.poValue.toLocaleString()} · ${p.status.replace(/_/g, ' ')}`,
          severity: 'high' as const,
          record: { kind: 'po', view: poTarget, id: p.poNumber },
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
              record: { kind: 'po', view: poTarget, id: p.poNumber },
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
          record: { kind: 'po', view: poTarget, id: p.poNumber },
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
          /**
           * §BATCH 7 (Part 4.1a) — this builder was one of the five that did
           * NOTHING when clicked. The notice names ONE agreement record, so the
           * destination is that contract on the surface that owns it.
           */
          record: { kind: 'contract', view: contractTarget, id: c.id },
        }))
    )
    .concat(
      /**
       * §BATCH 7 (Part 4.1a) — ADMIN/STAFF ONLY.
       *
       * A borderline score is Mercenta's OWN manual-review queue: the score is
       * held for an OPERATOR decision. The brand portal has no surface that owns
       * a fulfillment score, so a brand notice about one could only ever be a
       * dead click — which is exactly what it was. It is therefore not built for
       * a brand session, the mirror image of the rule the shipping-documents
       * builder below applies in the other direction.
       */
      tenantId === null
        ? scores
            .filter((s) => !s.manualOverride && isBorderline(s.totalScore))
            .map((s) => ({
              id: `score-${s.brandId}`,
              kind: 'score' as const,
              title: `Fulfillment score borderline (${s.totalScore})`,
              detail: `${brandName(s.brandId)} · held for manual review`,
              severity: 'medium' as const,
              /** That brand's scorecard row on Fulfillment Track, by brand id. */
              record: { kind: 'score', view: 'fulfillment_track', id: s.brandId },
            }))
        : []
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
              /**
               * §BATCH 7 (Part 4.1a) — the record is the PURCHASE ORDER whose
               * document pack is ready. The Logistics Hub already opens a PO from
               * `?po=`, so the notice and the pack land on the same record.
               */
              record: { kind: 'po', view: 'logistics', id: p.poNumber },
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
  /**
   * §BATCH 7 (Part 4.1a) — the surface that OWNS each remaining record kind for
   * THIS session, so every notice can open its record:
   *   · a deduction lives on the operator ledger (`retail_pipeline`) or the
   *     brand's own ledger, which renders on Analytics and Reports;
   *   · a commerce invoice is listed by the operator channel-operations panel
   *     (inside `retail_pipeline`) and, for a brand, on its Overview, which is
   *     the surface that states the brand's receivable.
   */
  const deductionTarget = isBrandSession ? 'reports' : 'retail_pipeline';
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
   * §P13 / S5 / S6 — THE IN-APP CHANNEL OF THE ACKNOWLEDGEMENT FAN-OUT.
   *
   * The declared reminder schedule (12/6/2h remaining) reaches the brand through the
   * SAME ledger the fan-out writes
   * (`src/lib/commerce/poAcknowledgementNotifications.ts`) — no second notification
   * store, and no re-derivation of the window or of the rule's wording.
   *
   * §S6 — the reminder carries its OWN brand-side record detail: the channel the
   * message travelled on, the DESTINATION it reached, and — verbatim — the reason a
   * channel the brand subscribed to could not be used (`poAckReminderChannelDetail`,
   * derived entirely from the ledger). The surface writes none of that copy itself.
   *
   * TENANT SCOPING: `poAckReminderViews(scope, tenantId)` filters INSIDE the
   * domain and fails closed for a brand scope with no tenant, so this shared shell
   * can never present another brand's notification.
   */
  const fanoutVersion = useSyncExternalStore(
    subscribePoAckNotifications,
    poAckNotificationVersion,
    poAckNotificationVersion
  );
  void fanoutVersion;
  const poAckReminders = poAckReminderViews(workScope, tenantId);
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
          /**
           * §BATCH 7 (Part 4.1a) — was one of the five that did NOTHING. The
           * record is the submission; the catalog surface (operator or brand)
           * opens the submission's product row.
           */
          record: { kind: 'submission', view: 'catalog', id: s.id },
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
          /**
           * §BATCH 7 (Part 4.1a) — was one of the five that did NOTHING. The
           * record is the deduction; its own ledger opens it (the operator's
           * dispute row, or the brand's deduction row).
           */
          record: { kind: 'deduction', view: deductionTarget, id: d.id },
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
          /**
           * §BATCH 7 (Part 4.1a) — was one of the five that did NOTHING. The
           * record is the compliance document; the compliance surface opens its
           * review drawer (operator) / its document row (brand).
           */
          record: { kind: 'compliance', view: 'compliance', id: d.id },
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
              /** The consignment itself, opened in the Logistics Hub inspector. */
              record: { kind: 'shipment', view: shipTarget, id: s.id },
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
          /** The invoice record itself, on the surface that lists receivables. */
          record: isBrandSession
            ? /**
               * §BATCH 7 (Part 4.1a) — a BRAND has no per-invoice surface: its
               * only invoice view is the Overview receivable tile, which is a
               * COUNT, not a record. So the brand's destination is the PURCHASE
               * ORDER the invoice was raised against — a real record that carries
               * the invoice's state — rather than a dead click. Recorded as an
               * honest limitation in the batch report.
               */
              { kind: 'po', view: 'purchase_orders', id: i.poNumber }
            : { kind: 'invoice', view: 'retail_pipeline', id: i.id },
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
          /** The purchase order the outstanding invoice was raised against. */
          record: { kind: 'po', view: commerceTarget, id: p.poNumber },
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
          /** The work item itself — the work workspace opens its drawer. */
          record: { kind: 'work', view: 'work', id: w.id },
        }))
    )
    /**
     * §P13 / S5 — the DELIVERED acknowledgement reminders (the in-app channel).
     *
     * These are NOT derived from the purchase orders a second time: they are the
     * messages the fan-out actually delivered, so the brand sees the schedule
     * Mercenta sent it — with the channel it arrived on and the stage it belongs to.
     *
     * §P13 / S6 — each one also carries its OWN record detail on the second line:
     * the destination the message reached, and the reason any channel it subscribed
     * to could not be used. Both come from the ledger through the domain's own
     * `poAckReminderChannelDetail`, so this surface never states a channel outcome
     * itself.
     */
    .concat(
      poAckReminders.map((view) => ({
        id: view.delivery.id,
        kind: 'po' as const,
        title: view.delivery.subject,
        detail: `${brandName(view.delivery.brandId)} · ${PO_ACK_CHANNEL_LABELS[view.delivery.channel]} · ${view.delivery.stage}h reminder · sent by Mercenta`,
        meta: poAckReminderChannelDetail(view),
        severity: view.delivery.finalStage ? ('high' as const) : ('medium' as const),
        /**
         * §BATCH 7 (Part 4.1a) — the delivered reminder names a PURCHASE ORDER,
         * so it opens that order (the delivery record carries its own
         * `poNumber`), not merely the purchase-order section.
         */
        record: { kind: 'po', view: poTarget, id: view.delivery.poNumber },
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
  const { session } = useApp();
  /**
   * §BATCH 7 (Part 4.1a) — the environment a notice's address belongs to. The
   * session's tier decides it, exactly as the shells decide their own prefix.
   */
  const environment: ProductEnvironment = session?.tier === 'brand' ? 'brand' : 'admin';
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

  /**
   * §BATCH 7 (Part 4.1a) — A NOTICE IS A DEEP LINK.
   *
   * The click opens the RECORD the notice names, through the ONE address layer:
   * the environment's view is written to the address WITH the record's own
   * identifier, so the owning surface opens that record and the address is
   * shareable, bookmarkable and reloadable. No second navigation mechanism is
   * introduced — this is the same `navigateProductView` the Logistics Hub's
   * document hand-off and the Work drawer's "Open record" already use.
   */
  function handleClick(n: NotificationItem) {
    setOpen(false);
    navigateProductView(environment, n.record.view, recordLinkQuery(n.record.kind, n.record.id));
    /**
     * Outside the browser `navigateProductView` is a documented no-op (it is what
     * lets validators SSR-render this shell), so the host's own view setter is
     * the only way to move the shell there. In the browser the address layer has
     * already moved it, and the shell's `popstate` handler is what applies it.
     */
    if (typeof window === 'undefined') onNavigate?.(n.record.view);
  }

  const ariaSummary = items.length === 0
    ? 'Notifications — all clear'
    : `Notifications — ${highCount} critical, ${mediumCount} follow-up`;

  return (
    <div className="relative" data-testid="notification-center">
      <button
        type="button"
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-ds-md transition-colors hover:bg-tint',
          items.length === 0
            ? 'text-muted hover:text-strong'
            : highCount > 0
              ? 'text-state-danger'
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
              highCount > 0 ? 'bg-state-danger text-strong' : 'bg-state-warning text-on-fill'
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
            className="ds-card absolute right-0 top-9 z-50 w-[380px] overflow-hidden rounded-ds-lg border bg-surface shadow-ds-overlay"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
              <span className="text-xs font-semibold text-strong">Needs attention</span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-ds-micro font-medium border',
                  items.length === 0
                    ? 'bg-state-success/10 border-state-success/20 text-state-success'
                    : highCount > 0
                      ? 'bg-state-danger/10 border-state-danger/20 text-state-danger'
                      : 'bg-state-warning/10 border-state-warning/20 text-state-warning'
                )}
              >
                {items.length === 0
                  ? 'All clear'
                  : `${highCount} critical · ${mediumCount} follow-up`}
              </span>
            </div>
            <div className="max-h-[420px] overflow-y-auto divide-y divide-hairline-06" data-testid="notification-list">
              {items.length === 0 && (
                <EmptyState
                  title="Everything is tracked"
                  description="No open exceptions across the portfolio."
                />
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
                    /**
                     * §BATCH 7 (Part 4.1a) — the notice's DESTINATION is OBSERVABLE:
                     * the record kind, the owning view and the record's own id. A
                     * browser test (and an operator inspecting the DOM) can see where
                     * a notice leads without reading React state — and a notice that
                     * led nowhere would have no id to show.
                     */
                    data-record-kind={n.record.kind}
                    data-record-view={n.record.view}
                    data-record-id={n.record.id}
                    className="w-full flex items-start gap-2.5 px-4 py-2.5 hover:bg-tint text-left transition-colors"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-0.5 w-4 h-4 rounded-full flex items-center justify-center',
                        tone === 'critical' ? 'bg-state-danger/10 text-state-danger' : 'bg-state-warning/10 text-state-warning'
                      )}
                    >
                      <Icon className="w-3 h-3" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-ds-label font-medium text-strong leading-snug">{n.title}</span>
                      <span className="block text-ds-micro text-muted truncate" title={n.detail}>{n.detail}</span>
                      {/* §P13 / S6 — the reminder's OWN record detail (channel →
                          destination, and any channel that could not be used). */}
                      {n.meta && (
                        <span
                          className="block text-ds-micro text-faint mt-0.5 line-clamp-2"
                          title={n.meta}
                          data-notification-meta={n.kind}
                        >
                          {n.meta}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-2 border-t border-hairline text-ds-micro text-faint">
              Same event stream as the daily email digest — no second pipeline.
            </div>
          </div>
        </>
      )}
    </div>
  );
}


