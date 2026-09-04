import { useEffect, useMemo, useState } from 'react';
import { fetchAuditLog } from '@/data/api';
import type { AuditLogEntry } from '@/types';
import { Badge, Card, Input } from '@/components/ui';
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

        {entries === null ? (
          <p className="text-xs text-zinc-500 px-1 pb-1">Loading audit trail…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-zinc-600 px-1 pb-1">No matching audit entries.</p>
        ) : (
          <div className="px-1 pb-1">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] text-zinc-600 border-b border-white/[0.06]">
                  <th className="py-1.5 pr-2 font-medium">When</th>
                  <th className="py-1.5 pr-2 font-medium">Actor</th>
                  <th className="py-1.5 pr-2 font-medium">Action</th>
                  <th className="py-1.5 pr-2 font-medium">Entity</th>
                  <th className="py-1.5 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="text-[11px] border-b border-white/[0.03] align-top">
                    <td className="py-1.5 pr-2 font-mono text-zinc-500 whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-2 text-zinc-300 whitespace-nowrap">{e.actorId}</td>
                    <td className="py-1.5 pr-2">
                      <Badge className="text-[9px] bg-brass-500/10 text-brass-300 border-brass-500/20 whitespace-nowrap">
                        {e.action}
                      </Badge>
                    </td>
                    <td className={cn('py-1.5 pr-2 text-zinc-400 font-mono')}>
                      {e.entityType}/{e.entityId}
                      {e.brandId && (
                        <span className="block text-[9px] text-zinc-600">brand: {e.brandId}</span>
                      )}
                    </td>
                    <td className="py-1.5 text-zinc-400">{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-zinc-600 pt-2">
              Showing {filtered.length} of {entries?.length ?? 0} entries.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
