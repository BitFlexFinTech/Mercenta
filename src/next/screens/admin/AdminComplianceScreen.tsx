/**
 * §WAVE 3b (2026-11-25) — admin compliance approvals (data + decision).
 * The decision goes through `reviewGateDocument` on the app context — the same
 * canonical command the brand compliance screen calls — so there is one review
 * path and one audit record.
 */
import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/GlobalStateContext';
import { useBrands, useComplianceDocuments } from '@/data/queries';
import { recordManualDocumentVerification } from '@/lib/verification/documentVerification';
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
  const qc = useQueryClient();
  const { actingStaffId, canCurrentUserMutate } = useApp();
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

  /**
   * §WAVE 3e FIX (2026-11-25) — REPOINTED TO THE CANONICAL PATH.
   *
   * This used to call the app context's `reviewGateDocument`, which only re-mapped
   * a BRAND-SCOPED in-memory array (`gateDocs`) that is EMPTY in an admin session.
   * So an admin "approval" changed nothing in the domain and yet showed a success
   * notice — a false claim, and no audit record either. Found by approving a
   * document in a real browser and then opening the audit trail.
   *
   * It now calls `recordManualDocumentVerification` — the first-class staff decision
   * path (documented as the Founder / Super Admin route), which mutates the
   * CANONICAL document store, requires a recorded reason, refuses an account that
   * cannot mutate, and audits the decision. The notice reports what actually
   * happened, including a refusal.
   */
  async function handleDecision(
    doc: ComplianceDocument,
    decision: 'approve' | 'reject',
    reason: string
  ): Promise<void> {
    setBusyDocId(doc.id);
    const result = await recordManualDocumentVerification(
      doc.id,
      { staffId: actingStaffId, canMutate: canCurrentUserMutate },
      decision,
      reason
    );
    setBusyDocId(null);

    if (!result.ok) {
      setNotice(`Nothing was recorded: ${result.error}`);
      return;
    }

    setNotice(
      decision === 'approve'
        ? 'Document approved — verification recorded against the brand, and the decision is in the audit trail.'
        : 'Document rejected — the decision is recorded against the brand and in the audit trail.'
    );
    await qc.invalidateQueries({ queryKey: ['compliance-documents'] });
    await qc.invalidateQueries({ queryKey: ['audit-log-paginated'] });
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