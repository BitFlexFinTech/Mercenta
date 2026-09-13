import { useEffect, useMemo, useState } from 'react';
import { fetchAuditLog } from '@/data/api';
import type { AuditLogEntry } from '@/types';
import { Badge, Card, DataTable, Input } from '@/components/ui';
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
    return rows.filter(
      (e) =>
        (actionFilter === 'all' || e.action === actionFilter) &&
        (q === '' ||
          e.actorId.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q) ||
          (e.brandId ?? '').toLowerCase().includes(q) ||
          e.entityId.toLowerCase().includes(q) ||
          e.reason.toLowerCase().includes(q))
    );
  }, [entries, query, actionFilter]);

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
    <div className="p-6 space-y-4 max-w-[1100px] mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brass-500/15 flex items-center justify-center">
          <ScrollText className="w-5 h-5 text-brass-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Admin Audit Log</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Who did what, when — every significant admin action, one immutable record
          </p>
        </div>
      </div>

      <Card>
        <div className="flex flex-col sm:flex-row gap-2 px-1 pb-1">
          <Input
            label=""
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search actor, action, brand, entity, reason…"
          />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1.5 text-xs text-zinc-300 cursor-pointer"
          >
            <option value="all">Action: all</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* §Phase D — canonical DataTable: real loading skeletons, labelled
            cards below md (actor/entity/reason all reachable), table at md+. */}
        <DataTable
          dataTable="admin-audit-log"
          caption="Admin audit log"
          loading={entries === null}
          rows={filtered}
          rowKey={(e) => e.id}
          emptyMessage="No matching audit entries."
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
    </div>
  );
}
