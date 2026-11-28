import { useEffect, useMemo, useState } from 'react';
import { fetchAuditLog } from '@/data/api';
import type { AuditLogEntry } from '@/types';
import { AdminAuditLogView, type AuditRange } from './AdminAuditLogView';

export function AdminAuditLogScreen() {
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [range, setRange] = useState<AuditRange>('all');
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchAuditLog()
      .then((res: { data?: AuditLogEntry[] }) => {
        if (!cancelled) {
          setEntries(res.data ?? []);
          setLoadError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load audit log');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const actions = useMemo(
    () => [...new Set((entries ?? []).map((e) => e.action))].sort(),
    [entries]
  );

  const filtered = useMemo(() => {
    const rows = entries ?? [];
    const q = query.trim().toLowerCase();
    const cutoff =
      range === 'all'
        ? null
        : Date.now() - (range === '24h' ? 86_400_000 : 7 * 86_400_000);
    return rows.filter(
      (e) =>
        (actionFilter === 'all' || e.action === actionFilter) &&
        (cutoff === null || new Date(e.createdAt).getTime() >= cutoff) &&
        (q === '' ||
          e.actorId.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q) ||
          (e.brandId ?? '').toLowerCase().includes(q) ||
          e.entityId.toLowerCase().includes(q) ||
          e.reason.toLowerCase().includes(q))
    );
  }, [entries, query, actionFilter, range]);

  const stats = useMemo(() => {
    const rows = entries ?? [];
    const day = Date.now() - 86_400_000;
    const recent24hCount = rows.filter((e) => new Date(e.createdAt).getTime() >= day).length;
    const brandsTouchedCount = new Set(rows.map((e) => e.brandId).filter(Boolean)).size;
    const counts = rows.reduce<Record<string, number>>((acc, e) => {
      acc[e.action] = (acc[e.action] ?? 0) + 1;
      return acc;
    }, {});
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return {
      recent24hCount,
      brandsTouchedCount,
      topAction: sorted[0] ? { action: sorted[0][0], count: sorted[0][1] } : null,
    };
  }, [entries]);

  return (
    <AdminAuditLogView
      loading={entries === null && !loadError}
      error={loadError}
      onRetry={() => setReloadTick((t) => t + 1)}
      totalEntries={(entries ?? []).length}
      distinctActionsCount={actions.length}
      recent24hCount={stats.recent24hCount}
      brandsTouchedCount={stats.brandsTouchedCount}
      topAction={stats.topAction}
      actions={actions}
      query={query}
      onQueryChange={setQuery}
      actionFilter={actionFilter}
      onActionFilterChange={setActionFilter}
      range={range}
      onRangeChange={setRange}
      rows={filtered}
      onResetFilters={() => {
        setQuery('');
        setActionFilter('all');
        setRange('all');
      }}
    />
  );
}
