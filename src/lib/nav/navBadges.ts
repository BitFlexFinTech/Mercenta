/**
 * §UI/UX Wave 2 — NAVIGATION ATTENTION COUNTS.
 *
 * The navigation rail shows how much outstanding work sits behind a
 * destination. The counts are derived from the SAME canonical stores and the
 * SAME canonical status presentations the surfaces themselves use
 * (`src/lib/statusPresentation.ts` → `actionable`), so a badge can never
 * disagree with the queue behind it.
 *
 * TENANT ISOLATION (mandatory check): the admin hook is only ever mounted by
 * AdminShell (environment === 'admin'), where full-portfolio access is the
 * documented design. The brand hook narrows EVERY row through
 * `assertBrandScope` + the session's own `tenantId`, so a brand can never
 * receive another tenant's count.
 *
 * Presentation only: these hooks fetch nothing new (React Query caches by key)
 * and change no business state.
 */
import { useQuery } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import {
  useComplianceDocuments,
  useContracts,
  usePurchaseOrders,
} from '@/data/queries';
import { fetchComplianceDocuments, fetchPurchaseOrders } from '@/data/api';
import { assertBrandScope } from '@/lib/auth/rbac';
import { complianceDocStatusPresentation, poStatusPresentation } from '@/lib/statusPresentation';
import { renewalUrgency } from '@/lib/contracts';
import { documentsAwaitingDownload } from '@/lib/documents/poDocumentPack';
import { demoTickets } from '@/lib/helpdesk/ticketStore';
import {
  overdueWorkItems,
  subscribeWork,
  workAttentionCount,
  workVersion,
} from '@/lib/work/workStore';

/** Matches the canonical React Query stale time so the cache is shared. */
const STALE_TIME = 30_000;

/**
 * §Sprint — the canonical work layer's attention counts. Subscribed (not
 * fetched) so resolving a task anywhere updates the rail immediately. Scoping is
 * enforced inside the store: `brand` scope filters by the session's tenantId.
 *
 * §P3 — `superAdmin` is threaded through so the Work Management badge counts
 * EXACTLY what the list shows: for a Super Admin it includes the founder-console
 * items, and for every other session those items are excluded (the store fails
 * closed). A badge that disagreed with its list would be a defect.
 */
function useWorkBadges(
  scope: 'admin' | 'brand',
  tenantId?: string | null,
  opts?: { superAdmin?: boolean }
): { work: number; calendar: number } {
  const version = useSyncExternalStore(subscribeWork, workVersion, workVersion);
  void version;
  return {
    work: workAttentionCount(scope, tenantId, opts),
    calendar: overdueWorkItems(scope, tenantId, opts).length,
  };
}

/** Views whose badge counts outstanding operator work. */
export type NavBadgeMap = Record<string, number>;

/** Admin / Super Admin — full-portfolio counts (admin tier has full access). */
/** Admin / Super Admin — full-portfolio counts (admin tier has full access). */
export function useAdminNavBadges(opts?: { superAdmin?: boolean }): NavBadgeMap {
  const pos = usePurchaseOrders();
  const docs = useComplianceDocuments();
  const contracts = useContracts();
  const workBadges = useWorkBadges('admin', undefined, opts);

  const posAll = pos.data?.data ?? [];
  const docsAll = docs.data?.data ?? [];
  const contractsAll = contracts.data?.data ?? [];

  const nowIso = new Date().toISOString();

  return {
    purchase_orders_admin: posAll.filter((p) => poStatusPresentation(p.status).actionable).length,
    compliance: docsAll.filter((d) => complianceDocStatusPresentation(d.status).actionable).length,
    contracts_admin: contractsAll.filter((c) => renewalUrgency(c.renewalDate, nowIso) !== 'ok')
      .length,
    helpdesk: demoTickets.filter((t) => t.status === 'open' || t.status === 'pending').length,
    /**
     * §P6 — DELIBERATELY NO `logistics` badge in the ADMIN map.
     *
     * The brand's Logistics Hub IS the document-download destination (decision 6),
     * so its badge counts the download queue. The admin rail's `logistics`
     * destination renders the OPERATIONS control surface (`LogisticsControl`),
     * which does not list a document queue — and §P3's rule is that a badge counts
     * the SAME item set its destination renders. A badge here would therefore
     * point at something the destination does not show, so it is not declared.
     */
    work: workBadges.work,
    calendar: workBadges.calendar,
  };
}

/**
 * Brand portal — counts strictly narrowed to the signed-in brand's own rows.
 * `enabled` lets the shell skip the fetch entirely for a brand that has not
 * finished onboarding (whose portal renders the wizard without the shell).
 */
export function useBrandNavBadges(enabled = true): NavBadgeMap {
  const { session } = useApp();
  const pos = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: fetchPurchaseOrders,
    staleTime: STALE_TIME,
    enabled,
  });
  const docs = useQuery({
    queryKey: ['compliance-documents'],
    queryFn: fetchComplianceDocuments,
    staleTime: STALE_TIME,
    enabled,
  });

  const tenantId = session?.tenantId;
  // assertBrandScope is fail-closed: a brand session only ever sees its own rows.
  const ownPos = assertBrandScope(session, pos.data?.data ?? []);
  const ownDocs = (docs.data?.data ?? []).filter((d) => d.brandId === tenantId);
  const workBadges = useWorkBadges('brand', tenantId);

  return {
    purchase_orders: ownPos.filter((p) => poStatusPresentation(p.status).actionable).length,
    compliance: ownDocs.filter((d) => complianceDocStatusPresentation(d.status).actionable).length,
    /**
     * §P6 — the brand's OWN document-download queue (same ONE rule as admin, but
     * narrowed to this tenant by `assertBrandScope`, which fails closed).
     */
    logistics: ownPos.filter(documentsAwaitingDownload).length,
    work: workBadges.work,
    calendar: workBadges.calendar,
  };
}
