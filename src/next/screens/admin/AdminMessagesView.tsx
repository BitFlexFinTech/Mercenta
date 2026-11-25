/**
 * §WAVE 3f (2026-11-25) — ADMIN messages (presentation).
 * The portfolio-wide message log: every channel, both directions, with the ones the
 * automation could not answer flagged. There is NO send API in the data layer, so
 * this screen reports and does not offer a reply it cannot deliver.
 */
import {
  ConsoleHeader,
  ConsoleTable,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { SectionCard } from '@/next/components/ConsoleCharts';
import type { Message } from '@/types';

export interface AdminMessageRow {
  message: Message;
  brandName: string;
}

export interface AdminMessagesViewProps {
  rows: AdminMessageRow[];
  totalMessages: number;
  brandOptions: { id: string; name: string }[];
  channelOptions: string[];
  directionOptions: string[];
  brandFilter: string;
  channelFilter: string;
  directionFilter: string;
  needsHumanOnly: boolean;
  search: string;
  needsHumanCount: number;
  inboundCount: number;
  outboundCount: number;
  selected: AdminMessageRow | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onChangeBrand: (value: string) => void;
  onChangeChannel: (value: string) => void;
  onChangeDirection: (value: string) => void;
  onToggleNeedsHuman: () => void;
  onChangeSearch: (value: string) => void;
  onSelect: (row: AdminMessageRow | null) => void;
}

export function AdminMessagesView({
  rows,
  totalMessages,
  brandOptions,
  channelOptions,
  directionOptions,
  brandFilter,
  channelFilter,
  directionFilter,
  needsHumanOnly,
  search,
  needsHumanCount,
  inboundCount,
  outboundCount,
  selected,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onChangeBrand,
  onChangeChannel,
  onChangeDirection,
  onToggleNeedsHuman,
  onChangeSearch,
  onSelect,
}: AdminMessagesViewProps) {
  const metrics: MetricItem[] = [
    { id: 'total', label: 'Messages logged', value: String(totalMessages), context: 'All channels' },
    {
      id: 'needs-human',
      label: 'Needing a human reply',
      value: String(needsHumanCount),
      context: 'Flagged by the automation',
      onClick: onToggleNeedsHuman,
      active: needsHumanOnly,
    },
    { id: 'inbound', label: 'Inbound', value: String(inboundCount), context: 'From brands' },
    { id: 'outbound', label: 'Outbound', value: String(outboundCount), context: 'From Mercenta' },
  ];

  const columns: ConsoleColumn<AdminMessageRow>[] = [
    {
      key: 'message',
      header: 'Message',
      mobilePrimary: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-zinc-950 truncate">
            {row.message.subject ?? row.message.body.slice(0, 60)}
          </div>
          <div className="text-ds-label text-zinc-500 truncate">{row.brandName}</div>
        </div>
      ),
    },
    {
      key: 'channel',
      header: 'Channel',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-ds-label text-zinc-600">
          {row.message.channel.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'direction',
      header: 'Direction',
      render: (row) => (
        <InlineStatus
          label={row.message.direction}
          tone={row.message.direction === 'inbound' ? 'info' : 'neutral'}
          dataStatus={row.message.direction}
        />
      ),
    },
    {
      key: 'sentBy',
      header: 'Sent by',
      hideOnMobile: true,
      render: (row) => <span className="text-ds-label text-zinc-600">{row.message.sentBy}</span>,
    },
    {
      key: 'human',
      header: 'Needs reply',
      align: 'right',
      render: (row) =>
        row.message.requiresHuman ? (
          <InlineStatus label="Yes" tone="warning" dataStatus="needs-human" />
        ) : (
          <span className="text-ds-label text-zinc-400">—</span>
        ),
    },
  ];
return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Governance & Support"
        title="Messages"
        description="Every message across the portfolio, both directions, with the ones the automation could not answer flagged."
      />

      {isError ? (
        <ErrorStateBlock
          title="Messages could not be loaded"
          message={errorMessage}
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <LoadingRows rows={8} />
      ) : (
        <>
          <MetricStrip items={metrics} columns={4} />

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => onChangeSearch(event.target.value)}
              placeholder="Search subject or body"
              aria-label="Search messages"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950 w-64"
            />
            <select
              value={brandFilter}
              onChange={(event) => onChangeBrand(event.target.value)}
              aria-label="Filter by brand"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
            >
              <option value="all">All brands</option>
              {brandOptions.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <select
              value={channelFilter}
              onChange={(event) => onChangeChannel(event.target.value)}
              aria-label="Filter by channel"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
            >
              <option value="all">All channels</option>
              {channelOptions.map((channel) => (
                <option key={channel} value={channel}>
                  {channel.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <select
              value={directionFilter}
              onChange={(event) => onChangeDirection(event.target.value)}
              aria-label="Filter by direction"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
            >
              <option value="all">Both directions</option>
              {directionOptions.map((direction) => (
                <option key={direction} value={direction}>
                  {direction}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onToggleNeedsHuman}
              aria-pressed={needsHumanOnly}
              className={`px-3 py-2 text-ds-label font-medium rounded-ds-md border ${
                needsHumanOnly
                  ? 'border-zinc-900 bg-zinc-950 text-white'
                  : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
              }`}
            >
              Needs a human reply
            </button>
          </div>

          <SectionCard title="Messages" description={`${rows.length} of ${totalMessages} shown`}>
            <ConsoleTable
              rows={rows}
              columns={columns}
              rowKey={(row) => row.message.id}
              onRowClick={(row) => onSelect(row)}
              emptyTitle="No messages match these filters"
              emptyDescription="Clear the filters to see the whole log."
            />
          </SectionCard>
        </>
      )}

      <SlideOverDrawer
        open={Boolean(selected)}
        onClose={() => onSelect(null)}
        title={selected ? (selected.message.subject ?? 'Message') : ''}
        subtitle={selected ? selected.brandName : undefined}
        testId="admin-message-drawer"
      >
        {selected && (
          <div className="space-y-4">
            <p className="text-ds-body text-zinc-800 whitespace-pre-wrap">{selected.message.body}</p>
            <dl className="border-t border-zinc-200 pt-3 grid grid-cols-2 gap-3 text-ds-body">
              <div>
                <dt className="text-ds-label text-zinc-500">Channel</dt>
                <dd className="font-medium text-zinc-950">
                  {selected.message.channel.replace(/_/g, ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-zinc-500">Direction</dt>
                <dd className="font-medium text-zinc-950">{selected.message.direction}</dd>
              </div>
              <div>
                <dt className="text-ds-label text-zinc-500">Sent by</dt>
                <dd className="font-medium text-zinc-950">{selected.message.sentBy}</dd>
              </div>
              <div>
                <dt className="text-ds-label text-zinc-500">Logged</dt>
                <dd className="font-medium text-zinc-950">
                  {selected.message.createdAt.slice(0, 10)}
                </dd>
              </div>
            </dl>
            {selected.message.requiresHuman && (
              <p className="text-ds-body text-state-warning">
                The automation flagged this message as needing a human reply.
              </p>
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}