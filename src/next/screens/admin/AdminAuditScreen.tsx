/**
 * §WAVE 3e (2026-11-25) — admin audit log (data).
 * Reads the canonical audit records through the paginated query. Read-only: an
 * audit trail is never editable from a screen.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuditLogPaginated, useCanonicalStoreVersion } from '@/data/queries';
import type { AuditLogEntry } from '@/types';
import { AdminAuditView } from './AdminAuditView';

export function AdminAuditScreen() {
  const qc = useQueryClient();
  /**
   * §WAVE 3e FIX (2026-11-25) — `PaginationParams.page` is **0-BASED**
   * (`src/data/api.ts → normalizePagination`: `Math.max(0, …)`), and the seed path
   * slices `page * pageSize`. This screen asked for `page: 1` with a page size of
   * 200, so it skipped the first 200 rows and rendered EMPTY even when the log held
   * records — found by approving a document and watching the audit trail stay
   * blank while the approval itself was real.
   */
  const auditQ = useAuditLogPaginated({}, { page: 0, pageSize: 200 });
  const canonicalVersion = useCanonicalStoreVersion();

  /**
   * §WAVE 3e — the trail must not be stale. Every audited action calls
   * `notifyCanonicalStoreChange()`, so the log is re-read whenever the canonical
   * store changes; without this, a decision taken a moment ago could be missing
   * from a governance view, which is exactly the failure this screen exists to
   * prevent.
   */
  useEffect(() => {
    void qc.invalidateQueries({ queryKey: ['audit-log-paginated'] });
  }, [canonicalVersion, qc]);

  const [actorFilter, setActorFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AuditLogEntry | null>(null);

  const allEntries = useMemo<AuditLogEntry[]>(() => {
    const result = auditQ.data;
    return (result?.data ?? []) as AuditLogEntry[];
  }, [auditQ.data]);

  const entries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allEntries
      .filter((entry) => actorFilter === 'all' || entry.actorId === actorFilter)
      .filter((entry) => actionFilter === 'all' || entry.action === actionFilter)
      .filter((entry) => entityFilter === 'all' || entry.entityType === entityFilter)
      .filter((entry) =>
        query
          ? `${entry.action} ${entry.entityType} ${entry.reason}`.toLowerCase().includes(query)
          : true
      )
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [allEntries, actorFilter, actionFilter, entityFilter, search]);

  const actorOptions = useMemo(
    () => Array.from(new Set(allEntries.map((entry) => entry.actorId))).sort(),
    [allEntries]
  );
  const actionOptions = useMemo(
    () => Array.from(new Set(allEntries.map((entry) => entry.action))).sort(),
    [allEntries]
  );
  const entityOptions = useMemo(
    () => Array.from(new Set(allEntries.map((entry) => entry.entityType))).sort(),
    [allEntries]
  );

  return (
    /* The TOTAL comes from the query, not from the rows on this page. */
    <AdminAuditView
      entries={entries}
      totalEntries={auditQ.data?.total ?? allEntries.length}
      actorOptions={actorOptions}
      actionOptions={actionOptions}
      entityOptions={entityOptions}
      actorFilter={actorFilter}
      actionFilter={actionFilter}
      entityFilter={entityFilter}
      search={search}
      distinctActors={actorOptions.length}
      distinctActions={actionOptions.length}
      selected={selected}
      isLoading={auditQ.isPending}
      isError={auditQ.isError}
      errorMessage={String(auditQ.error ?? '') || undefined}
      onRetry={() => void auditQ.refetch()}
      onChangeActor={setActorFilter}
      onChangeAction={setActionFilter}
      onChangeEntity={setEntityFilter}
      onChangeSearch={setSearch}
      onSelect={setSelected}
    />
  );
}