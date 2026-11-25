/**
 * §WAVE 3d (2026-11-25) — admin fulfilment track (data).
 * Read-only: the score and the track are the domain's own derivation, shown as
 * they are. Nothing is recomputed and no track is set from here.
 */
import { useMemo, useState } from 'react';
import { useBrands, useFulfillmentScores } from '@/data/queries';
import { AdminFulfillmentView, type AdminFulfillmentRow } from './AdminFulfillmentView';

export function AdminFulfillmentScreen() {
  const scoresQ = useFulfillmentScores();
  const brandsQ = useBrands();

  const [search, setSearch] = useState('');
  const [trackFilter, setTrackFilter] = useState('all');
  const [selected, setSelected] = useState<AdminFulfillmentRow | null>(null);

  const scores = scoresQ.data?.data ?? [];
  const brands = brandsQ.data?.data ?? [];

  const allRows = useMemo<AdminFulfillmentRow[]>(
    () =>
      scores.map((score) => ({
        score,
        brandName:
          brands.find((brand) => brand.id === score.brandId)?.profile.businessName ??
          score.brandId,
      })),
    [scores, brands]
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allRows
      .filter((row) => trackFilter === 'all' || row.score.track === trackFilter)
      .filter((row) => (query ? row.brandName.toLowerCase().includes(query) : true));
  }, [allRows, trackFilter, search]);

  const trackOptions = useMemo(
    () => Array.from(new Set(allRows.map((row) => row.score.track))).sort(),
    [allRows]
  );

  return (
    <AdminFulfillmentView
      rows={rows}
      totalScored={allRows.length}
      trackOptions={trackOptions}
      search={search}
      trackFilter={trackFilter}
      directCount={allRows.filter((row) => row.score.track === 'direct_fulfillment').length}
      financedCount={allRows.filter((row) => row.score.track === 'financed').length}
      overriddenCount={allRows.filter((row) => row.score.manualOverride).length}
      selected={selected}
      isLoading={scoresQ.isPending || brandsQ.isPending}
      isError={scoresQ.isError || brandsQ.isError}
      errorMessage={String(scoresQ.error ?? brandsQ.error ?? '') || undefined}
      onRetry={() => {
        void scoresQ.refetch();
        void brandsQ.refetch();
      }}
      onChangeSearch={setSearch}
      onChangeTrack={setTrackFilter}
      onSelect={setSelected}
    />
  );
}