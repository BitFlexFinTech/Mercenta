/**
 * React Query hooks over the src/data repositories.
 * UI components should consume entities through these hooks only.
 */
import { useQuery } from '@tanstack/react-query';
import type { PaginationParams } from '@/types';
import {
  fetchAdSpendBudgets,
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
} from './api';
import type { ListQueryOptions } from './api';

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
