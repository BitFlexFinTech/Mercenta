import type { AuditLogEntry } from '@/types';
import {
  ConsoleTable,
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  PageHeader,
  type ConsoleColumn,
} from '@/next/components/ConsolePrimitives';
import { SectionCard } from '@/next/components/ConsoleCharts';

export type AuditRange = 'all' | '24h' | '7d';

export interface AdminAuditLogViewProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  totalEntries: number;
  distinctActionsCount: number;
  recent24hCount: number;
  brandsTouchedCount: number;
  topAction: { action: string; count: number } | null;
  actions: string[];
  query: string;
  onQueryChange: (next: string) => void;
  actionFilter: string;
  onActionFilterChange: (next: string) => void;
  range: AuditRange;
  onRangeChange: (next: AuditRange) => void;
  rows: AuditLogEntry[];
  onResetFilters: () => void;
}

export function AdminAuditLogView({
  loading,
  error,
  onRetry,
  totalEntries,
  distinctActionsCount,
  recent24hCount,
  brandsTouchedCount,
  topAction,
  actions,
  query,
  onQueryChange,
  actionFilter,
  onActionFilterChange,
  range,
  onRangeChange,
  rows,
  onResetFilters,
}: AdminAuditLogViewProps) {
  const columns: ConsoleColumn<AuditLogEntry>[] = [
    {
      key: 'createdAt',
      header: 'When',
      render: (e) => (
        <span className="font-mono text-[12px] text-ink-600 whitespace-nowrap">
          {new Date(e.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'actorId',
      header: 'Actor',
      render: (e) => <span className="font-mono text-[12px] text-ink-950">{e.actorId}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      mobilePrimary: true,
      render: (e) => <InlineStatus label={e.action} tone="info" />,
    },
    {
      key: 'entityId',
      header: 'Entity',
      render: (e) => (
        <div className="font-mono text-[12px] text-secondary">
          <div>
            {e.entityType}/{e.entityId}
          </div>
          {e.brandId && <div className="text-[11px] text-faint">brand: {e.brandId}</div>}
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (e) => <span className="text-[12px] text-secondary">{e.reason}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Audit Log"
        description="Immutable record of significant operator actions across overrides, CRM updates, compliance reviews, and payouts."
        meta={
          <>
            <span>{loading ? 'Loading…' : `${totalEntries} entries`}</span>
            <span>{distinctActionsCount} distinct actions</span>
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search actor, action, brand, reason…"
              aria-label="Search audit records"
              className="w-60 px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-ink-950"
            />
            <select
              value={actionFilter}
              onChange={(e) => onActionFilterChange(e.target.value)}
              aria-label="Filter by action"
              className="px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-ink-950"
            >
              <option value="all">Action: all</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select
              value={range}
              onChange={(e) => onRangeChange(e.target.value as AuditRange)}
              aria-label="Filter by time range"
              className="px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-ink-950"
            >
              <option value="all">All time</option>
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7 days</option>
            </select>
          </div>
        }
      />

      {error && <ErrorStateBlock message={error} onRetry={onRetry} />}

      <MetricStrip
        loading={loading}
        columns={4}
        items={[
          {
            id: 'audit-total',
            label: 'Audit entries',
            value: String(totalEntries),
            context: `${distinctActionsCount} distinct actions`,
            onClick: onResetFilters,
          },
          {
            id: 'audit-recent',
            label: 'Last 24 hours',
            value: String(recent24hCount),
            context: recent24hCount > 0 ? 'Recent activity' : 'Quiet',
            active: range === '24h',
            onClick: () => onRangeChange(range === '24h' ? 'all' : '24h'),
          },
          {
            id: 'audit-brands',
            label: 'Brands touched',
            value: String(brandsTouchedCount),
            context: 'Tenant-scoped records',
            onClick: () => onRangeChange('all'),
          },
          {
            id: 'audit-top',
            label: 'Most frequent action',
            value: topAction ? String(topAction.count) : '0',
            context: topAction ? topAction.action : 'No entries',
            onClick: () => {
              if (topAction) onActionFilterChange(topAction.action);
            },
          },
        ]}
      />

      <SectionCard
        title="Audit Trail"
        description={`Showing ${rows.length} of ${totalEntries} immutable records. Overrides append new entries without modifying history.`}
      >
        {loading ? (
          <LoadingRows rows={6} label="Loading audit log…" />
        ) : rows.length === 0 ? (
          <EmptyStateBlock
            title="No audit entries match"
            description="Adjust time range, action filter, or search text."
            actionLabel="Reset filters"
            onAction={onResetFilters}
          />
        ) : (
          <ConsoleTable
            rows={rows}
            columns={columns}
            rowKey={(e) => e.id}
            testId="admin-audit-log-table"
          />
        )}
      </SectionCard>
    </div>
  );
}
