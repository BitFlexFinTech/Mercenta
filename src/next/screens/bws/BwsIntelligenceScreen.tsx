/**
 * §BWS INTELLIGENCE — WIRED TO THE OWNER'S DASH-1 RECORDS (2026-11-28).
 *
 * BEFORE THIS CHANGE the screen read CORE hooks (`useBrands`, `useProducts`,
 * `usePurchaseOrders`, `useAcquisitionSummary`, `getTamSamReport`, the outreach lifecycle
 * writers, `useBrandComms`) — i.e. it showed Mercenta's CORE brands and markets under a BWS
 * heading, and offered write actions against a store the Dash-1 data does not use. All of
 * those imports are GONE. `useBwsDemo()` now supplies this vertical's own records, and
 * `buildBwsIntelligence` maps them field-for-field (mapping table:
 * `docs/BWS_INTELLIGENCE_FIELD_MAPPING.md`).
 *
 * The owner's decisions, honoured here and in the adapter/view:
 *   D5 market sizing is replaced by a plain notice — no TAM/SAM figure is shown;
 *   D6 text indicators only — no readiness score, tier or computed number;
 *   D7 the "Run discovery" action is deleted, not disabled;
 *   D8 `INITIAL_OUTREACH_LOGS` renders as a READ-ONLY log — no prepare/approve/send actions;
 *   D9 `OPPORTUNITY_ASSESSMENTS.status` renders as a READ-ONLY badge — no stage mutation.
 *
 * `allowedBrandIds` is deliberately NOT applied: it carries CORE brand ids, and filtering the
 * Dash-1 brands by them would hide almost every BWS brand (D1 — all 88 are listed).
 */
import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useBwsDemo } from '@/data/queries';
import { buildBwsIntelligence } from '@/data/bws/bwsIntelligenceAdapter';
import { BwsIntelligenceView, type BwsIntelligenceSection } from './BwsIntelligenceView';

export function BwsIntelligenceScreen({
  section,
  onNavigateView,
}: {
  section: BwsIntelligenceSection;
  /** Kept in the signature because the shell passes it; intentionally not applied (see header). */
  allowedBrandIds?: Set<string> | null;
  onNavigateView?: (viewId: string) => void;
}) {
  const { canCurrentUserMutate } = useApp();
  const [retryToken, setRetryToken] = useState(0);
  const bws = useBwsDemo(retryToken);

  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [outreachFilter, setOutreachFilter] = useState('');

  const model = useMemo(
    () => (bws.data?.vertical === 'bws' && bws.data.data ? buildBwsIntelligence(bws.data.data) : null),
    [bws.data]
  );

  const filtered = useMemo(() => {
    const rows = model?.prospects ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.brand.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
    );
  }, [model, searchQuery]);

  const selectedProspect = filtered.find((p) => p.id === selectedProspectId) ?? null;

  return (
    <BwsIntelligenceView
      section={section}
      loading={bws.loading}
      error={bws.error}
      onRetry={() => setRetryToken((n) => n + 1)}
      canMutate={canCurrentUserMutate}
      metrics={model?.metrics ?? []}
      countryRows={model?.countryRows ?? []}
      prospects={filtered}
      selectedProspect={selectedProspect}
      onSelectProspect={setSelectedProspectId}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      outreachFilter={outreachFilter}
      onOutreachFilterChange={setOutreachFilter}
      onNavigateSection={(viewId) => onNavigateView?.(viewId)}
    />
  );
}