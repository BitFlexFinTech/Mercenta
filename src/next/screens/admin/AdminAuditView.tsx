/**
 * §WAVE 3e (2026-11-25) — ADMIN audit log (presentation).
 *
 * The governance view: who acted, on what, and WHY — every canonical record carries
 * a reason. Read-only by nature: an audit trail that could be edited from a screen
 * would not be an audit trail.
 */
import {
  ConsoleHeader,
  ConsoleTable,
  ErrorStateBlock,
  LoadingRows,
  MetricStrip,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { SectionCard } from '@/next/components/ConsoleCharts';
import type { AuditLogEntry } from '@/types';

export interface AdminAuditViewProps {
  entries: AuditLogEntry[];
  totalEntries: number;
  actorOptions: string[];
  actionOptions: string[];
  entityOptions: string[];
  actorFilter: string;
  actionFilter: string;
  entityFilter: string;
  search: string;
  distinctActors: number;
  distinctActions: number;
  selected: AuditLogEntry | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onChangeActor: (value: string) => void;
  onChangeAction: (value: string) => void;
  onChangeEntity: (value: string) => void;
  onChangeSearch: (value: string) => void;
  onSelect: (entry: AuditLogEntry | null) => void;
}

export function AdminAuditView({
  entries,
  totalEntries,
  actorOptions,
  actionOptions,
  entityOptions,
  actorFilter,
  actionFilter,
  entityFilter,
  search,
  distinctActors,
  distinctActions,
  selected,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onChangeActor,
  onChangeAction,
  onChangeEntity,
  onChangeSearch,
  onSelect,
}: AdminAuditViewProps) {
  const metrics: MetricItem[] = [
    {
      id: 'entries',
      label: 'Audit entries',
      value: String(totalEntries),
      context: 'On record',
    },
    { id: 'actors', label: 'Distinct actors', value: String(distinctActors), context: 'Who acted' },
    { id: 'actions', label: 'Distinct actions', value: String(distinctActions), context: 'What was done' },
  ];

  const columns: ConsoleColumn<AuditLogEntry>[] = [
    {
      key: 'when',
      header: 'When',
      mobilePrimary: true,
      render: (entry) => (
        <div className="min-w-0">
          <div className="tabular-nums text-ds-label text-strong">
            {entry.createdAt.slice(0, 19).replace('T', ' ')}
          </div>
          <div className="text-ds-label text-faint truncate">{entry.actorId}</div>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (entry) => <span className="text-ds-body text-ink-900">{entry.action}</span>,
    },
    {
      key: 'entity',
      header: 'Object',
      hideOnMobile: true,
      render: (entry) => (
        <span className="text-ds-label text-muted">
          {entry.entityType} · <span className="font-mono">{entry.entityId}</span>
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (entry) => (
        <span className="text-ds-label text-muted line-clamp-2">{entry.reason}</span>
      ),
    },
  ];
return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Governance"
        title="Audit log"
        description="Who acted, on what, and why — every canonical record carries its reason."
      />

      {isError ? (
        <ErrorStateBlock
          title="The audit log could not be loaded"
          message={errorMessage}
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <LoadingRows rows={10} />
      ) : (
        <>
          <MetricStrip items={metrics} columns={3} />

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => onChangeSearch(event.target.value)}
              placeholder="Search action, object or reason"
              aria-label="Search audit entries"
              className="px-3 py-2 text-ds-body border border-hairline-strong rounded-ds-md bg-surface-raised text-strong w-64"
            />
            <select
              value={actorFilter}
              onChange={(event) => onChangeActor(event.target.value)}
              aria-label="Filter by actor"
              className="px-3 py-2 text-ds-body border border-hairline-strong rounded-ds-md bg-surface-raised text-strong"
            >
              <option value="all">All actors</option>
              {actorOptions.map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
            <select
              value={actionFilter}
              onChange={(event) => onChangeAction(event.target.value)}
              aria-label="Filter by action"
              className="px-3 py-2 text-ds-body border border-hairline-strong rounded-ds-md bg-surface-raised text-strong"
            >
              <option value="all">All actions</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
            <select
              value={entityFilter}
              onChange={(event) => onChangeEntity(event.target.value)}
              aria-label="Filter by object type"
              className="px-3 py-2 text-ds-body border border-hairline-strong rounded-ds-md bg-surface-raised text-strong"
            >
              <option value="all">All object types</option>
              {entityOptions.map((entity) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </select>
          </div>

          <SectionCard title="Entries" description={`${entries.length} of ${totalEntries} shown`}>
            <ConsoleTable
              rows={entries}
              columns={columns}
              rowKey={(entry) => entry.id}
              onRowClick={(entry) => onSelect(entry)}
              emptyTitle="No audit entries match these filters"
              emptyDescription="Clear the filters to see the whole record."
            />
          </SectionCard>
        </>
      )}

      <SlideOverDrawer
        open={Boolean(selected)}
        onClose={() => onSelect(null)}
        title={selected ? selected.action : ''}
        subtitle={selected ? selected.createdAt.slice(0, 19).replace('T', ' ') : undefined}
        testId="admin-audit-drawer"
      >
        {selected && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-ds-body">
              <div>
                <dt className="text-ds-label text-faint">Actor</dt>
                <dd className="font-medium text-strong">{selected.actorId}</dd>
              </div>
              <div>
                <dt className="text-ds-label text-faint">Object</dt>
                <dd className="font-mono text-ds-label text-strong">
                  {selected.entityType} · {selected.entityId}
                </dd>
              </div>
              {selected.brandId && (
                <div className="col-span-2">
                  <dt className="text-ds-label text-faint">Brand</dt>
                  <dd className="font-medium text-strong">{selected.brandId}</dd>
                </div>
              )}
            </dl>

            <div>
              <div className="text-ds-label text-faint mb-1">Reason recorded</div>
              <p className="text-ds-body text-ink-800">{selected.reason}</p>
            </div>

            {selected.metadata && Object.keys(selected.metadata).length > 0 && (
              <div>
                <div className="text-ds-label text-faint mb-1">Metadata</div>
                <ul className="divide-y divide-hairline-06 border border-hairline rounded-ds-md">
                  {Object.entries(selected.metadata).map(([key, value]) => (
                    <li
                      key={key}
                      className="px-3 py-2 flex items-start justify-between gap-3 text-ds-body"
                    >
                      <span className="text-muted">{key}</span>
                      <span className="font-mono text-ds-label text-strong text-right break-all">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}