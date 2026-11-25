/**
 * §WAVE 3b (2026-11-25) — admin compliance approvals (data + decision).
 * The decision goes through `reviewGateDocument` on the app context — the same
 * canonical command the brand compliance screen calls — so there is one review
 * path and one audit record.
 */
import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useBrands, useComplianceDocuments } from '@/data/queries';
import type { ComplianceDocument } from '@/types';
import { AdminComplianceView, type AdminComplianceRow } from './AdminComplianceView';

const DECIDABLE: ReadonlySet<ComplianceDocument['status']> = new Set(['uploaded', 'under_review']);
const NOT_APPROVED: ReadonlySet<ComplianceDocument['status']> = new Set([
  'missing',
  'rejected',
  'expired',
  'expiring',
  'superseded',
]);

export function AdminComplianceScreen() {
  const { reviewGateDocument } = useApp();
  const brandsQ = useBrands();
  const docsQ = useComplianceDocuments();

  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ComplianceDocument | null>(null);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const brands = brandsQ.data?.data ?? [];
  const docs = docsQ.data?.data ?? [];

  const statusOptions = useMemo(
    () => Array.from(new Set(docs.map((doc) => doc.status))).sort(),
    [docs]
  );

  const rows = useMemo<AdminComplianceRow[]>(() => {
    const query = search.trim().toLowerCase();
    return docs
      .filter((doc) => brandFilter === 'all' || doc.brandId === brandFilter)
      .filter((doc) => {
        /* §WAVE 3b — the metric cards drill down, so two of the values are
           GROUPS of statuses rather than a single status. */
        if (statusFilter === 'all') return true;
        if (statusFilter === 'awaiting') return DECIDABLE.has(doc.status);
        if (statusFilter === 'not_approved') return NOT_APPROVED.has(doc.status);
        return doc.status === statusFilter;
      })
      .filter((doc) => {
        if (!query) return true;
        const name = brands.find((brand) => brand.id === doc.brandId)?.profile.businessName ?? '';
        return `${doc.type} ${name}`.toLowerCase().includes(query);
      })
      .map((doc) => ({
        doc,
        brandName:
          brands.find((brand) => brand.id === doc.brandId)?.profile.businessName ?? doc.brandId,
      }));
  }, [docs, brands, brandFilter, statusFilter, search]);

  function handleDecision(doc: ComplianceDocument, decision: 'approved' | 'rejected'): void {
    setBusyDocId(doc.id);
    reviewGateDocument(doc.id, decision);
    setBusyDocId(null);
    setNotice(
      decision === 'approved'
        ? `Document approved and recorded against the brand.`
        : `Document rejected and recorded against the brand.`
    );
    setSelected(null);
  }

  return (
    <AdminComplianceView
      rows={rows}
      totalCount={docs.length}
      brandOptions={brands.map((brand) => ({
        id: brand.id,
        name: brand.profile.businessName,
      }))}
      statusOptions={statusOptions}
      brandFilter={brandFilter}
      statusFilter={statusFilter}
      search={search}
      awaitingReview={docs.filter((doc) => DECIDABLE.has(doc.status)).length}
      approved={docs.filter((doc) => doc.status === 'approved').length}
      blocked={docs.filter((doc) => NOT_APPROVED.has(doc.status)).length}
      selected={selected}
      selectedBrandName={
        selected
          ? brands.find((brand) => brand.id === selected.brandId)?.profile.businessName ??
            selected.brandId
          : ''
      }
      busyDocId={busyDocId}
      notice={notice}
      isLoading={docsQ.isPending || brandsQ.isPending}
      isError={docsQ.isError || brandsQ.isError}
      errorMessage={String(docsQ.error ?? brandsQ.error ?? '') || undefined}
      onRetry={() => {
        void docsQ.refetch();
        void brandsQ.refetch();
      }}
      onChangeBrand={setBrandFilter}
      onChangeStatus={setStatusFilter}
      onChangeSearch={setSearch}
      onSelect={setSelected}
      onDecision={handleDecision}
    />
  );
}