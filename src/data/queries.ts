/**
 * React Query hooks over the src/data repositories.
 * UI components should consume entities through these hooks only.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { PaginationParams } from '@/types';
import {
  fetchAdSpendBudgets,
  fetchAdCampaigns,
  fetchAdSpendRecommendations,
  fetchCreativeAssets,
  fetchBrands,
  fetchCommissions,
  fetchComplianceDocuments,
  fetchContracts,
  fetchFulfillmentScores,
  fetchCatalogSubmissions,
  fetchDeductions,
  fetchProducts,
  fetchShippingMargins,
  fetchMessages,
  fetchPurchaseOrders,
  fetchShipmentsAll,
  fetchSubscriptions,
  fetchBrandAgreements,
  fetchProductsPaginated,
  fetchPurchaseOrdersPaginated,
  fetchShipmentsPaginated,
  fetchMessagesPaginated,
  fetchAuditLogPaginated,
  fetchHomepageContent,
  getHomepageLiveVersion,
  subscribeHomepageLive,
} from './api';
import type { ListQueryOptions } from './api';
import {
  getCanonicalStoreVersion,
  subscribeCanonicalStore,
} from './prospectStore';

const STALE_TIME = 30_000;

export function useBrands() {
  return useQuery({ queryKey: ['brands'], queryFn: fetchBrands, staleTime: STALE_TIME });
}

export function useFulfillmentScores() {
  return useQuery({
    queryKey: ['fulfillment-scores'],
    queryFn: fetchFulfillmentScores,
    staleTime: STALE_TIME,
  });
}

export function useContracts() {
  return useQuery({ queryKey: ['contracts'], queryFn: fetchContracts, staleTime: STALE_TIME });
}

export function useComplianceDocuments() {
  return useQuery({
    queryKey: ['compliance-documents'],
    queryFn: fetchComplianceDocuments,
    staleTime: STALE_TIME,
  });
}

export function useSubscriptions() {
  return useQuery({
    queryKey: ['subscriptions'],
    queryFn: fetchSubscriptions,
    staleTime: STALE_TIME,
  });
}

export function useCommissions() {
  return useQuery({ queryKey: ['commissions'], queryFn: fetchCommissions, staleTime: STALE_TIME });
}

export function useShippingMargins() {
  return useQuery({ queryKey: ['shipping-margins'], queryFn: fetchShippingMargins, staleTime: STALE_TIME });
}

export function useProducts() {
  return useQuery({ queryKey: ['products'], queryFn: fetchProducts, staleTime: STALE_TIME });
}

export function useShipmentsAll() {
  return useQuery({ queryKey: ['shipments'], queryFn: fetchShipmentsAll, staleTime: STALE_TIME });
}

export function usePurchaseOrders() {
  return useQuery({ queryKey: ['purchase-orders'], queryFn: fetchPurchaseOrders, staleTime: STALE_TIME });
}

export function useDeductions() {
  return useQuery({ queryKey: ['deductions'], queryFn: fetchDeductions, staleTime: STALE_TIME });
}

export function useCatalogSubmissions() {
  return useQuery({ queryKey: ['catalog-submissions'], queryFn: fetchCatalogSubmissions, staleTime: STALE_TIME });
}


export function useMessages() {
  return useQuery({ queryKey: ['messages'], queryFn: fetchMessages, staleTime: STALE_TIME });
}

export function useAdSpendBudgets() {
  return useQuery({
    queryKey: ['ad-spend'],
    queryFn: fetchAdSpendBudgets,
    staleTime: STALE_TIME,
  });
}

export function useAdCampaigns() {
  return useQuery({
    queryKey: ['ad-campaigns'],
    queryFn: fetchAdCampaigns,
    staleTime: STALE_TIME,
  });
}

export function useAdSpendRecommendations() {
  return useQuery({
    queryKey: ['ad-recommendations'],
    queryFn: fetchAdSpendRecommendations,
    staleTime: STALE_TIME,
  });
}


export function useCreativeAssets(brandId?: string, campaignId?: string) {
  return useQuery({
    queryKey: ['creative-assets', brandId, campaignId],
    queryFn: () => fetchCreativeAssets(),
    staleTime: STALE_TIME,
  });
}



/* ── §Batch-4 — Paginated list hooks ─────────────────────────────── */

/**
 * Hook factory for paginated lists. Query key includes the table name
 * plus all filter/pagination params so cache invalidation is precise.
 */
function usePaginatedList<T>(
  key: string,
  fetcher: (opts: ListQueryOptions, pagination?: PaginationParams) => Promise<import('@/types').PaginatedResult<T>>,
  opts: ListQueryOptions = {},
  pagination?: PaginationParams
) {
  const queryKey = [key, opts, pagination] as const;
  const staleTime = 30_000;
  return useQuery({
    queryKey,
    queryFn: ({ queryKey: [, _opts, _p] }) => fetcher(_opts as ListQueryOptions, _p as PaginationParams | undefined),
    staleTime,
  });
}

export function useProductsPaginated(opts: ListQueryOptions = {}, pagination?: PaginationParams) {
  return usePaginatedList('products-paginated', fetchProductsPaginated, opts, pagination);
}

export function usePurchaseOrdersPaginated(opts: ListQueryOptions = {}, pagination?: PaginationParams) {
  return usePaginatedList('purchase-orders-paginated', fetchPurchaseOrdersPaginated, opts, pagination);
}

export function useShipmentsPaginated(opts: ListQueryOptions = {}, pagination?: PaginationParams) {
  return usePaginatedList('shipments-paginated', fetchShipmentsPaginated, opts, pagination);
}

export function useMessagesPaginated(opts: ListQueryOptions = {}, pagination?: PaginationParams) {
  return usePaginatedList('messages-paginated', fetchMessagesPaginated, opts, pagination);
}

export function useBrandAgreements() {
  return useQuery({
    queryKey: ['brand-agreements'],
    queryFn: fetchBrandAgreements,
    staleTime: STALE_TIME,
  });
}

export function useAuditLogPaginated(opts: ListQueryOptions = {}, pagination?: PaginationParams) {
  return usePaginatedList('audit-log-paginated', fetchAuditLogPaginated, opts, pagination);
}

/* ── §Phase C — canonical BI/acquisition store subscription ─────────── */

/**
 * Subscribes a component to the canonical BI prospect store + acquisition
 * store change signal, so BI/ICP/CRM panels all re-render from the same truth
 * (the stores are synchronous in-memory singletons, so a version bump is the
 * correct re-read trigger).
 */
export function useCanonicalStoreVersion(): number {
  const [version, setVersion] = useState(getCanonicalStoreVersion);
  useEffect(() => subscribeCanonicalStore(() => setVersion(getCanonicalStoreVersion())), []);
  return version;
}

/* ── §CANONICAL PROPAGATION — every canonical read re-reads on change ── */

/**
 * §CANONICAL CHANGE PROPAGATION — THE ONE subscriber that keeps every
 * React Query read of canonical state in step with the domain.
 *
 * WHY: the repositories in `src/data/api.ts` read canonical stores through the
 * `queryOrSeed` seam (Supabase when configured, the seeded canonical fixtures
 * otherwise). React Query caches each read. Before this hook those caches were
 * never invalidated when the DOMAIN changed, so a projection built on them (the
 * Logistics operational map and list, dashboards, queues, ledgers) showed the
 * snapshot taken at mount even though it was derived from canonical data. A
 * shipment created, a PO acknowledged, a deduction raised or a case opened in
 * the same session did not appear until a reload or a manual refetch — which is
 * exactly the "interactive but static presentation" the platform must not ship.
 *
 * HOW: one subscription to the canonical change signal, mounted once for the
 * whole application (`App.tsx`). On each version bump it invalidates the query
 * cache, so every ACTIVE canonical read refetches and every projection derived
 * from it re-renders from the new canonical state. No query key is duplicated,
 * no component needs its own subscription, and an invalidation that finds no
 * change re-renders identically (the signal is a version bump, not an event).
 */
export function useCanonicalQuerySync(): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    let seen = getCanonicalStoreVersion();
    return subscribeCanonicalStore(() => {
      const now = getCanonicalStoreVersion();
      if (now === seen) return;
      seen = now;
      void queryClient.invalidateQueries();
    });
  }, [queryClient]);
}

/* ── §Phase 7E — Homepage content ───────────────────────────────────── */

/**
 * Subscribes to the homepage publish version (module-level listener, same
 * pattern as TourEngine). Re-renders subscribed hooks whenever a publish
 * promotes a new live copy, so an already-mounted public Home refreshes
 * without a page reload.
 */
function useHomepageLiveVersion(): number {
  const [version, setVersion] = useState(getHomepageLiveVersion());
  useEffect(() => subscribeHomepageLive(() => setVersion(getHomepageLiveVersion())), []);
  return version;
}

/** Live/draft homepage content, keyed by publish version for instant refresh. */
export function useHomepageContent() {
  const version = useHomepageLiveVersion();
  return useQuery({
    queryKey: ['homepage-content', version],
    queryFn: fetchHomepageContent,
    staleTime: STALE_TIME,
  });
}
