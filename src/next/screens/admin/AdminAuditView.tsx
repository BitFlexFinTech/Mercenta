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
          <div className="tabular-nums text-ds-label text-zinc-950">
            {entry.createdAt.slice(0, 19).replace('T', ' ')}
          </div>
          <div className="text-ds-label text-zinc-500 truncate">{entry.actorId}</div>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (entry) => <span className="text-ds-body text-zinc-900">{entry.action}</span>,
    },
    {
      key: 'entity',
      header: 'Object',
      hideOnMobile: true,
      render: (entry) => (
        <span className="text-ds-label text-zinc-600">
          {entry.entityType} · <span className="font-mono">{entry.entityId}</span>
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (entry) => (
        <span className="text-ds-label text-zinc-600 line-clamp-2">{entry.reason}</span>
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
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950 w-64"
            />
            <select
              value={actorFilter}
              onChange={(event) => onChangeActor(event.target.value)}
              aria-label="Filter by actor"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
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
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
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
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
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
                <dt className="text-ds-label text-zinc-500">Actor</dt>
                <dd className="font-medium text-zinc-950">{selected.actorId}</dd>
              </div>
              <div>
                <dt className="text-ds-label text-zinc-500">Object</dt>
                <dd className="font-mono text-ds-label text-zinc-950">
                  {selected.entityType} · {selected.entityId}
                </dd>
              </div>
              {selected.brandId && (
                <div className="col-span-2">
                  <dt className="text-ds-label text-zinc-500">Brand</dt>
                  <dd className="font-medium text-zinc-950">{selected.brandId}</dd>
                </div>
              )}
            </dl>

            <div>
              <div className="text-ds-label text-zinc-500 mb-1">Reason recorded</div>
              <p className="text-ds-body text-zinc-800">{selected.reason}</p>
            </div>

            {selected.metadata && Object.keys(selected.metadata).length > 0 && (
              <div>
                <div className="text-ds-label text-zinc-500 mb-1">Metadata</div>
                <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-ds-md">
                  {Object.entries(selected.metadata).map(([key, value]) => (
                    <li
                      key={key}
                      className="px-3 py-2 flex items-start justify-between gap-3 text-ds-body"
                    >
                      <span className="text-zinc-600">{key}</span>
                      <span className="font-mono text-ds-label text-zinc-950 text-right break-all">
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