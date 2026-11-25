/**
 * §WAVE 3f (2026-11-25) — admin monitoring (data).
 *
 * No fabricated health: the rows come from the INTEGRATION_REGISTRY's own order and
 * metadata, the mode from the canonical `defaultIntegrationMode(id)`, and the
 * readiness verdict from `computeReadiness` — the module written precisely because
 * an older dashboard invented probe results.
 */
import { useMemo, useState } from 'react';
import { environmentMode } from '@/config/environment';
import { computeReadiness, type ProviderHealth } from '@/lib/monitoring/health';
import {
  INTEGRATION_META,
  INTEGRATION_ORDER,
  defaultIntegrationMode,
  serverSecretNameFor,
} from '@/integrations/registry';
import { AdminMonitoringView, type AdminProviderRow } from './AdminMonitoringView';

export function AdminMonitoringScreen() {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [selected, setSelected] = useState<AdminProviderRow | null>(null);

  const allRows = useMemo<AdminProviderRow[]>(
    () =>
      INTEGRATION_ORDER.map((id) => {
        const mode = defaultIntegrationMode(id);
        return {
          id,
          /* The registry carries no display name, so the id is humanised for the
             table rather than a second label being invented for it. */
          label: id.replace(/_/g, ' '),
          category: INTEGRATION_META[id].category,
          mode,
          needsAttention: mode === 'degraded' || mode === 'error',
          secretName: serverSecretNameFor(id) ?? undefined,
        };
      }),
    []
  );

  /* `computeReadiness` takes the canonical modes. The two states outside that union
     (`unknown`, `not_registered`) are excluded from the VERDICT — which by design
     only reacts to degraded/error — and are still shown in the table, so nothing is
     hidden from the operator. */
  const readiness = useMemo(
    () =>
      computeReadiness(
        environmentMode(),
        allRows.flatMap<ProviderHealth>((row) =>
          row.mode === 'unknown' || row.mode === 'not_registered'
            ? []
            : [{ id: row.id, mode: row.mode }]
        )
      ),
    [allRows]
  );

  const rows = useMemo(() => {
    return allRows
      .filter((row) => categoryFilter === 'all' || row.category === categoryFilter)
      .filter((row) => modeFilter === 'all' || row.mode === modeFilter)
      .filter((row) => !attentionOnly || row.needsAttention);
  }, [allRows, categoryFilter, modeFilter, attentionOnly]);

  const categoryOptions = useMemo(
    () => Array.from(new Set(allRows.map((row) => row.category))).sort(),
    [allRows]
  );
  const modeOptions = useMemo(
    () => Array.from(new Set(allRows.map((row) => row.mode))).sort(),
    [allRows]
  );

  return (
    <AdminMonitoringView
      rows={rows}
      readiness={readiness}
      totalProviders={allRows.length}
      categoryOptions={categoryOptions}
      modeOptions={modeOptions}
      categoryFilter={categoryFilter}
      modeFilter={modeFilter}
      attentionOnly={attentionOnly}
      liveCount={allRows.filter((row) => row.mode === 'live').length}
      simulationCount={allRows.filter((row) => row.mode === 'simulation').length}
      attentionCount={allRows.filter((row) => row.needsAttention).length}
      selected={selected}
      isLoading={false}
      isError={false}
      onRetry={() => undefined}
      onChangeCategory={setCategoryFilter}
      onChangeMode={setModeFilter}
      onToggleAttention={() => setAttentionOnly((previous) => !previous)}
      onSelect={setSelected}
    />
  );
}