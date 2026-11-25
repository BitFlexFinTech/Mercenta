/**
 * §WAVE 3c (2026-11-25) — admin contract cycle (data).
 * Read-only oversight: the data layer exposes no contract mutation, so the cycle
 * is reported from the canonical records rather than advanced from here.
 */
import { useMemo, useState } from 'react';
import { useBrandAgreements, useBrands, useContracts } from '@/data/queries';
import type { Contract } from '@/types';
import { AdminContractsView, type AdminContractRow } from './AdminContractsView';

const AWAITING: ReadonlySet<Contract['status']> = new Set(['draft', 'sent', 'under_review']);
const ENDED: ReadonlySet<Contract['status']> = new Set(['expiring', 'terminated']);

export function AdminContractsScreen() {
  const brandsQ = useBrands();
  const contractsQ = useContracts();
  const agreementsQ = useBrandAgreements();

  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminContractRow | null>(null);

  const brands = brandsQ.data?.data ?? [];
  const contracts = contractsQ.data?.data ?? [];
  const agreements = agreementsQ.data?.data ?? [];

  const brandName = (brandId: string): string =>
    brands.find((brand) => brand.id === brandId)?.profile.businessName ?? brandId;

  const statusOptions = useMemo(
    () => Array.from(new Set(contracts.map((c) => c.status))).sort(),
    [contracts]
  );

  const rows = useMemo<AdminContractRow[]>(() => {
    const query = search.trim().toLowerCase();
    return contracts
      .filter((contract) => brandFilter === 'all' || contract.brandId === brandFilter)
      .filter((contract) => statusFilter === 'all' || contract.status === statusFilter)
      .filter((contract) => {
        if (!query) return true;
        return `${contract.type} ${brandName(contract.brandId)}`.toLowerCase().includes(query);
      })
      .map((contract) => ({ contract, brandName: brandName(contract.brandId) }));
  }, [contracts, brands, brandFilter, statusFilter, search]);

  const selectedAgreements = selected
    ? agreements.filter((agreement) => agreement.brandId === selected.contract.brandId)
    : [];

  return (
    <AdminContractsView
      rows={rows}
      totalContracts={contracts.length}
      brandOptions={brands.map((brand) => ({ id: brand.id, name: brand.profile.businessName }))}
      statusOptions={statusOptions}
      brandFilter={brandFilter}
      statusFilter={statusFilter}
      search={search}
      activeCount={contracts.filter((c) => c.status === 'signed' || c.status === 'active').length}
      awaitingSignatureCount={contracts.filter((c) => AWAITING.has(c.status)).length}
      endedCount={contracts.filter((c) => ENDED.has(c.status)).length}
      selected={selected}
      selectedAgreements={selectedAgreements}
      isLoading={contractsQ.isPending || brandsQ.isPending}
      isError={contractsQ.isError || brandsQ.isError}
      errorMessage={String(contractsQ.error ?? brandsQ.error ?? '') || undefined}
      onRetry={() => {
        void contractsQ.refetch();
        void brandsQ.refetch();
      }}
      onChangeBrand={setBrandFilter}
      onChangeStatus={setStatusFilter}
      onChangeSearch={setSearch}
      onSelect={setSelected}
    />
  );
}