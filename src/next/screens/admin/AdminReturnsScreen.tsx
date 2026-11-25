/**
 * §WAVE 3b (2026-11-25) — admin returns tracking (data).
 * The returns themselves are read from the canonical API surface; the deduction a
 * return raised is joined on `linkedDeductionId`, never guessed.
 */
import { useMemo, useState } from 'react';
import { demoReturns } from '@/data/api';
import { useBrands, useDeductions } from '@/data/queries';
import { AdminReturnsView, type AdminReturnRow } from './AdminReturnsView';

export function AdminReturnsScreen() {
  const brandsQ = useBrands();
  const dedQ = useDeductions();

  const [brandFilter, setBrandFilter] = useState('all');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminReturnRow | null>(null);

  const brands = brandsQ.data?.data ?? [];
  const deductions = dedQ.data?.data ?? [];

  const reasonOptions = useMemo(
    () => Array.from(new Set(demoReturns.map((ret) => ret.reason))).sort(),
    []
  );

  const rows = useMemo<AdminReturnRow[]>(() => {
    const query = search.trim().toLowerCase();
    return demoReturns
      .filter((ret) => brandFilter === 'all' || ret.brandId === brandFilter)
      .filter((ret) => reasonFilter === 'all' || ret.reason === reasonFilter)
      .filter((ret) => {
        if (!query) return true;
        return [ret.poNumber, ret.productSku, ret.productName]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .map((ret) => ({
        ret,
        brandName: brands.find((brand) => brand.id === ret.brandId)?.profile.businessName ?? ret.brandId,
        deduction: ret.linkedDeductionId
          ? deductions.find((deduction) => deduction.id === ret.linkedDeductionId)
          : undefined,
      }));
  }, [brands, deductions, brandFilter, reasonFilter, search]);

  const openDeductionValue = rows.reduce((total, row) => {
    if (!row.deduction) return total;
    const status = row.deduction.status;
    return status === 'open' || status === 'disputed' ? total + row.deduction.amountGbp : total;
  }, 0);

  return (
    <AdminReturnsView
      rows={rows}
      totalCount={demoReturns.length}
      brandOptions={brands.map((brand) => ({
        id: brand.id,
        name: brand.profile.businessName,
      }))}
      reasonOptions={reasonOptions}
      brandFilter={brandFilter}
      reasonFilter={reasonFilter}
      search={search}
      unitsReturned={rows.reduce((total, row) => total + row.ret.quantity, 0)}
      openDeductionValue={openDeductionValue}
      selected={selected}
      isLoading={brandsQ.isPending || dedQ.isPending}
      isError={brandsQ.isError || dedQ.isError}
      errorMessage={String(brandsQ.error ?? dedQ.error ?? '') || undefined}
      onRetry={() => {
        void brandsQ.refetch();
        void dedQ.refetch();
      }}
      onChangeBrand={setBrandFilter}
      onChangeReason={setReasonFilter}
      onChangeSearch={setSearch}
      onSelect={setSelected}
    />
  );
}