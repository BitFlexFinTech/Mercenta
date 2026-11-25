import { fulfillmentTrackLabel } from '@/config/fulfillmentTrack';
/**
 * §WAVE 3c (2026-11-25) — ADMIN Brand CRM (presentation).
 *
 * The relationship view: each brand, its contract state, its declared contact
 * channel and its message history. There is NO message-send API in the data layer,
 * so this screen does not offer one; it shows the log and flags what needs a human.
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
import type { DemoBrandRow } from '@/data/demoData';
import type { Message } from '@/types';

export interface AdminCrmRow {
  brand: DemoBrandRow;
  messageCount: number;
  needsHuman: number;
  lastContact?: string;
}

export interface AdminCrmViewProps {
  rows: AdminCrmRow[];
  totalBrands: number;
  needsHumanTotal: number;
  messagesTotal: number;
  search: string;
  selected: AdminCrmRow | null;
  selectedMessages: Message[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onChangeSearch: (value: string) => void;
  onSelect: (row: AdminCrmRow | null) => void;
}

export function AdminCrmView({
  rows,
  totalBrands,
  needsHumanTotal,
  messagesTotal,
  search,
  selected,
  selectedMessages,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onChangeSearch,
  onSelect,
}: AdminCrmViewProps) {
  const metrics: MetricItem[] = [
    { id: 'brands', label: 'Brands', value: String(totalBrands), context: 'In the portfolio' },
    {
      id: 'needs-human',
      label: 'Needs a human reply',
      value: String(needsHumanTotal),
      context: 'Messages flagged by automation',
    },
    { id: 'messages', label: 'Messages logged', value: String(messagesTotal), context: 'All channels' },
  ];

  const columns: ConsoleColumn<AdminCrmRow>[] = [
    {
      key: 'brand',
      header: 'Brand',
      mobilePrimary: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-zinc-950 truncate">{row.brand.profile.businessName}</div>
          <div className="text-ds-label text-zinc-500 truncate">{row.brand.category}</div>
        </div>
      ),
    },
    {
      key: 'contract',
      header: 'Contract',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-ds-label text-zinc-600">
          {row.brand.contractStatus.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Contact channel',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-ds-label text-zinc-600">
          {row.brand.profile.phone ? 'Phone declared' : 'Not declared'}
        </span>
      ),
    },
    {
      key: 'messages',
      header: 'Messages',
      align: 'right',
      render: (row) => <span className="tabular-nums">{row.messageCount}</span>,
    },
    {
      key: 'needsHuman',
      header: 'Needs reply',
      align: 'right',
      render: (row) =>
        row.needsHuman > 0 ? (
          <InlineStatus label={String(row.needsHuman)} tone="warning" dataStatus="needs-human" />
        ) : (
          <span className="text-ds-label text-zinc-400">—</span>
        ),
    },
    {
      key: 'last',
      header: 'Last contact',
      align: 'right',
      hideOnMobile: true,
      render: (row) => (
        <span className="tabular-nums text-ds-label text-zinc-600">
          {row.lastContact ? row.lastContact.slice(0, 10) : '—'}
        </span>
      ),
    },
  ];
return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Brands & Growth"
        title="Brand CRM"
        description="Each brand relationship, its contract state, its declared contact channel and its message history."
      />

      {isError ? (
        <ErrorStateBlock
          title="Brand relationships could not be loaded"
          message={errorMessage}
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <LoadingRows rows={8} />
      ) : (
        <>
          <MetricStrip items={metrics} columns={3} />

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => onChangeSearch(event.target.value)}
              placeholder="Search brand or category"
              aria-label="Search brands"
              className="px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950 w-64"
            />
          </div>

          <SectionCard title="Brands" description={`${rows.length} of ${totalBrands} shown`}>
            <ConsoleTable
              rows={rows}
              columns={columns}
              rowKey={(row) => row.brand.id}
              onRowClick={(row) => onSelect(row)}
              emptyTitle="No brands match this search"
              emptyDescription="Clear the search to see the whole portfolio."
            />
          </SectionCard>
        </>
      )}

      <SlideOverDrawer
        open={Boolean(selected)}
        onClose={() => onSelect(null)}
        title={selected ? selected.brand.profile.businessName : ''}
        subtitle={selected ? selected.brand.category : undefined}
        testId="admin-crm-drawer"
      >
        {selected && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-ds-body">
              <div>
                <dt className="text-ds-label text-zinc-500">Contract</dt>
                <dd className="font-medium text-zinc-950">
                  {selected.brand.contractStatus.replace(/_/g, ' ')}
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-zinc-500">Fulfilment track</dt>
                <dd className="font-medium text-zinc-950">
                  {fulfillmentTrackLabel(selected.brand.track)}
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-zinc-500">Nation</dt>
                <dd className="font-medium text-zinc-950">{selected.brand.nation}</dd>
              </div>
              <div>
                <dt className="text-ds-label text-zinc-500">Contact channel</dt>
                <dd className="font-medium text-zinc-950">
                  {selected.brand.profile.phone
                    ? 'Phone declared'
                    : 'Not declared — instant messages fail closed'}
                </dd>
              </div>
            </dl>

            <div>
              <div className="text-ds-label text-zinc-500 mb-1">Recent messages</div>
              {selectedMessages.length === 0 ? (
                <p className="text-ds-body text-zinc-600">No messages are logged for this brand.</p>
              ) : (
                <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-ds-md">
                  {selectedMessages.map((message) => (
                    <li key={message.id} className="px-3 py-2 text-ds-body">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-zinc-950 truncate">
                          {message.subject ?? message.channel.replace(/_/g, ' ')}
                        </span>
                        <span className="text-ds-label text-zinc-500 shrink-0">
                          {message.createdAt.slice(0, 10)}
                        </span>
                      </div>
                      <div className="text-ds-label text-zinc-600 mt-0.5">
                        {message.direction} · {message.sentBy}
                        {message.requiresHuman ? ' · needs a human reply' : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}