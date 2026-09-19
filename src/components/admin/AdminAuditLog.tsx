import { useEffect, useMemo, useState } from 'react';
import { fetchAuditLog } from '@/data/api';
import type { AuditLogEntry } from '@/types';
import { Badge, Card, DataTable, Input } from '@/components/ui';
import {
  ContextPanel,
  MetricBand,
  RecordFieldList,
  SegmentedControl,
  WorkspaceFrame,
  WorkspaceHeader,
  type MetricTileData,
} from '@/components/shared/workspace';
import { cn } from '@/utils/cn';
import { ScrollText } from 'lucide-react';

/**
 * §Stage-25 — platform-wide admin audit log viewer.
 * Every significant admin action (fulfillment overrides, CRM activity,
 * delivery reconciliation, profile-change reviews) lands in ONE log — who
 * did what, when, against which brand, and why. Searchable by actor/action/
 * brand/entity. Super-admin view; live mode reads the same audit_log table.
 */
export function AdminAuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [range, setRange] = useState<'all' | '24h' | '7d'>('all');

  useEffect(() => {
    let cancelled = false;
    fetchAuditLog()
      .then((res: { data?: AuditLogEntry[] }) => {
        if (!cancelled) setEntries(res.data ?? []);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setLoadError(err instanceof Error ? err.message : 'Failed to load audit log');
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  /* §Sprint — real drill-down metrics over the SAME fetched entries. */
  const metrics: MetricTileData[] = useMemo(() => {
    const rows = entries ?? [];
    const day = Date.now() - 86_400_000;
    const recent = rows.filter((e) => new Date(e.createdAt).getTime() >= day).length;
    const brandsTouched = new Set(rows.map((e) => e.brandId).filter(Boolean)).size;
    const topAction = Object.entries(
      rows.reduce<Record<string, number>>((acc, e) => {
        acc[e.action] = (acc[e.action] ?? 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1])[0];
    return [
      {
        id: 'audit-total',
        label: 'Audit entries',
        value: String(rows.length),
        size: 'hero',
        tone: 'info',
        statusText: `${actions.length} distinct actions`,
        context: 'Every significant action, one immutable record',
        domain: 'catalogue',
        onOpen: () => {
          setRange('all');
          setActionFilter('all');
          setQuery('');
        },
        testId: 'audit-metric-total',
      },
      {
        id: 'audit-recent',
        label: 'Last 24 hours',
        value: String(recent),
        tone: recent > 0 ? 'warning' : 'success',
        statusText: recent > 0 ? 'Recent activity' : 'Quiet',
        context: 'Entries recorded in the last day',
        domain: 'finance',
        onOpen: () => setRange('24h'),
        testId: 'audit-metric-recent',
      },
      {
        id: 'audit-brands',
        label: 'Brands touched',
        value: String(brandsTouched),
        tone: 'neutral',
        statusText: 'Tenant-scoped records',
        context: 'Distinct brands referenced by these entries',
        domain: 'compliance',
        onOpen: () => setRange('all'),
        testId: 'audit-metric-brands',
      },
      {
        id: 'audit-top-action',
        label: 'Most frequent action',
        value: topAction ? String(topAction[1]) : '0',
        tone: 'neutral',
        statusText: topAction ? topAction[0] : 'No entries',
        context: 'Drill down to that action',
        domain: 'logistics',
        onOpen: () => topAction && setActionFilter(topAction[0]),
        testId: 'audit-metric-top-action',
      },
    ];
  }, [entries, actions]);

  if (loadError) {
    return (
      <div className="p-6 max-w-[1100px] mx-auto">
        <Card title="Admin Audit Log">
          <p className="text-xs text-red-300">{loadError}</p>
        </Card>
      </div>
    );
  }

  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="Admin Hub · Governance"
        title="Admin Audit Log"
        description="Who did what, when — every significant admin action in one immutable record, searchable by actor, action, brand, entity and reason."
        meta={
          <>
            <span className="font-mono text-[11px] text-zinc-500">
              {entries === null ? 'Loading…' : `${entries.length} entries`}
            </span>
            <span className="font-mono text-[11px] text-zinc-500">
              {actions.length} distinct actions
            </span>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-brass-400" aria-hidden="true" />
          </div>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              label=""
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search actor, action, brand, entity, reason…"
            />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              aria-label="Action filter"
              data-testid="audit-action-filter"
              className="cursor-pointer rounded-md border border-white/[0.08] bg-ink-900 px-2 py-1.5 text-xs text-zinc-300"
            >
              <option value="all">Action: all</option>
              {actions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <SegmentedControl
              ariaLabel="Audit range"
              active={range}
              onSelect={(v) => setRange(v as 'all' | '24h' | '7d')}
              items={[
                { id: 'all', label: 'All time' },
                { id: '24h', label: '24h' },
                { id: '7d', label: '7 days' },
              ]}
            />
          </div>
        }
      />

      <MetricBand items={metrics} columns={4} loading={entries === null} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
        {/* §Phase D — canonical DataTable: real loading skeletons, labelled
            cards below md (actor/entity/reason all reachable), table at md+. */}
        <DataTable
          dataTable="admin-audit-log"
          caption="Admin audit log"
          loading={entries === null}
          rows={filtered}
          rowKey={(e) => e.id}
          emptyMessage="No audit entries match the current filters."
          columns={[
            {
              key: 'createdAt',
              label: 'When',
              render: (e) => (
                <span className="font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                  {new Date(e.createdAt).toLocaleString()}
                </span>
              ),
            },
            {
              key: 'actorId',
              label: 'Actor',
              render: (e) => <span className="whitespace-nowrap text-zinc-300">{e.actorId}</span>,
            },
            {
              key: 'action',
              label: 'Action',
              primary: true,
              render: (e) => (
                <Badge className="text-[9px] bg-brass-500/10 text-brass-300 border-brass-500/20 whitespace-nowrap">
                  {e.action}
                </Badge>
              ),
            },
            {
              key: 'entityId',
              label: 'Entity',
              render: (e) => (
                <span className={cn('font-mono text-zinc-400')}>
                  {e.entityType}/{e.entityId}
                  {e.brandId && (
                    <span className="block text-[9px] text-zinc-600">brand: {e.brandId}</span>
                  )}
                </span>
              ),
            },
            {
              key: 'reason',
              label: 'Reason',
              render: (e) => <span className="text-zinc-400">{e.reason}</span>,
            },
          ]}
        />
        {entries !== null && (
          <p className="text-[10px] text-zinc-600 pt-2 px-1">
            Showing {filtered.length} of {entries.length} entries.
          </p>
        )}
        </Card>
        <div className="space-y-3">
          <ContextPanel title="What this log is">
            <p className="text-[11px] leading-snug text-zinc-400">
              Every significant action — admin overrides, CRM activity, compliance review, payout
              approval, work-layer resolution — lands here with actor, action, entity, tenant and
              reason. History is never destroyed: an override adds a record, it never edits one.
            </p>
          </ContextPanel>
          <ContextPanel title="Current view">
            <RecordFieldList
              fields={[
                { label: 'Action filter', value: actionFilter },
                { label: 'Range', value: range === 'all' ? 'All time' : range },
                { label: 'Search', value: query.trim() === '' ? '(none)' : query.trim() },
                { label: 'Rows shown', value: `${filtered.length} of ${entries?.length ?? 0}` },
              ]}
            />
          </ContextPanel>
        </div>
      </div>
    </WorkspaceFrame>
  );
}
