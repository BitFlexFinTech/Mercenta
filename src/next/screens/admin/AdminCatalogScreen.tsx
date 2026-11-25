/**
 * §WAVE 3d (2026-11-25) — admin global catalog (data).
 * Joins each product to its LATEST canonical submission (by `submittedAt`, never by
 * array order) and reports the product's own eligibility flags. Read-only: the data
 * layer exposes no product or submission mutation.
 */
import { useMemo, useState } from 'react';
import { useBrands, useCatalogSubmissions, useProducts } from '@/data/queries';
import type { CatalogSubmissionStatus } from '@/types';
import { AdminCatalogView, type AdminCatalogRow } from './AdminCatalogView';

const AWAITING_REVIEW: ReadonlySet<CatalogSubmissionStatus> = new Set([
  'submitted',
  'under_amazon_review',
]);

export function AdminCatalogScreen() {
  const productsQ = useProducts();
  const brandsQ = useBrands();
  const submissionsQ = useCatalogSubmissions();

  const [brandFilter, setBrandFilter] = useState('all');
  const [submissionFilter, setSubmissionFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminCatalogRow | null>(null);

  const products = productsQ.data?.data ?? [];
  const brands = brandsQ.data?.data ?? [];
  const submissions = submissionsQ.data?.data ?? [];

  const latestByProductKey = useMemo(() => {
    const map = new Map<string, { status: CatalogSubmissionStatus; rejectionReason?: string }>();
    /* Latest wins: walk in `submittedAt` order, so the last write for a key is the
       most recent submission — never the array's arbitrary order. */
    const ordered = submissions
      .slice()
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
    for (const submission of ordered) {
      const key = submission.productId || submission.sku;
      map.set(key, { status: submission.status, rejectionReason: submission.rejectionReason });
    }
    return map;
  }, [submissions]);

  const allRows = useMemo<AdminCatalogRow[]>(() => {
    return products.map((product) => {
      const submission = latestByProductKey.get(product.id) ?? latestByProductKey.get(product.sku);
      return {
        id: product.id,
        brandId: product.brandId,
        name: product.name,
        sku: product.sku,
        brandName:
          brands.find((brand) => brand.id === product.brandId)?.profile.businessName ??
          product.brandId,
        exWorksPrice: product.exWorksPrice,
        ukRetailPrice: product.ukRetailPrice,
        commodityCode: product.commodityCode,
        vatStatus: product.vatStatus,
        hazmat: product.hazmat,
        available: product.isAvailable !== false,
        submissionStatus: submission?.status,
        rejectionReason: submission?.rejectionReason,
      };
    });
  }, [products, brands, latestByProductKey]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allRows
      .filter((row) => brandFilter === 'all' || row.brandId === brandFilter)
      .filter((row) => {
        if (submissionFilter === 'all') return true;
        if (submissionFilter === 'awaiting') {
          return row.submissionStatus ? AWAITING_REVIEW.has(row.submissionStatus) : false;
        }
        return row.submissionStatus === submissionFilter;
      })
      .filter((row) => {
        if (!query) return true;
        return `${row.name} ${row.sku}`.toLowerCase().includes(query);
      });
  }, [allRows, brands, brandFilter, submissionFilter, search]);

  const submissionStatuses = useMemo(
    () => Array.from(new Set(allRows.map((row) => row.submissionStatus).filter(Boolean))).sort(),
    [allRows]
  ) as string[];

  return (
    <AdminCatalogView
      rows={rows}
      totalProducts={allRows.length}
      brandOptions={brands.map((brand) => ({ id: brand.id, name: brand.profile.businessName }))}
      submissionStatuses={submissionStatuses}
      brandFilter={brandFilter}
      submissionFilter={submissionFilter}
      search={search}
      liveCount={allRows.filter((row) => row.submissionStatus === 'live').length}
      awaitingReviewCount={allRows.filter(
        (row) => row.submissionStatus && AWAITING_REVIEW.has(row.submissionStatus)
      ).length}
      rejectedCount={allRows.filter((row) => row.submissionStatus === 'rejected').length}
      unavailableCount={allRows.filter((row) => !row.available).length}
      selected={selected}
      isLoading={productsQ.isPending || brandsQ.isPending}
      isError={productsQ.isError || brandsQ.isError}
      errorMessage={String(productsQ.error ?? brandsQ.error ?? '') || undefined}
      onRetry={() => {
        void productsQ.refetch();
        void brandsQ.refetch();
      }}
      onChangeBrand={setBrandFilter}
      onChangeSubmission={setSubmissionFilter}
      onChangeSearch={setSearch}
      onSelect={setSelected}
    />
  );
}