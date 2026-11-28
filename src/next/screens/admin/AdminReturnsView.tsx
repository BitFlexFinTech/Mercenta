import { Boxes, Search } from 'lucide-react';
import { ConsoleTabs, NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';
import {
  ConsoleTable,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  PageHeader,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';
import type { ReturnTrackingEntry, ReturnTrackingStatus } from '@/types';

export interface AdminReturnRow {
  entry: ReturnTrackingEntry;
  brandName: string;
  productName: string;
  quantity?: number;
  statusLabel: string;
  statusTone: SemanticTone;
}

export interface AdminReturnsViewProps {
  loading: boolean;
  totalCount: number;
  confirmedCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  stageFilter: 'all' | ReturnTrackingStatus;
  onStageFilterChange: (s: 'all' | ReturnTrackingStatus) => void;
  stats: { received: number; checked: number; forwarded: number; confirmed: number };
  metrics: MetricItem[];
  rows: AdminReturnRow[];
  selectedRow: AdminReturnRow | null;
  onSelectRow: (id: string | null) => void;
  onAdvanceStage: (id: string) => void;
  notice: string | null;
  warehousePartner: { name: string; address: string; postcode: string; notes: string };
  stageSteps: { status: ReturnTrackingStatus; label: string; count: number; reachedIndex: number }[];
}

export function AdminReturnsView({
  loading,
  totalCount,
  confirmedCount,
  searchQuery,
  onSearchChange,
  stageFilter,
  onStageFilterChange,
  stats,
  metrics,
  rows,
  selectedRow,
  onSelectRow,
  onAdvanceStage,
  notice,
  warehousePartner,
  stageSteps,
}: AdminReturnsViewProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Returns Warehouse Tracking" description="Loading return tracking queue…" />
        <LoadingRows rows={5} />
      </div>
    );
  }

  const columns: ConsoleColumn<AdminReturnRow>[] = [
    {
      key: 'brand',
      header: 'Brand',
      hideOnMobile: true,
      render: (r) => <span className="font-medium text-ink-950">{r.brandName}</span>,
    },
    {
      key: 'return',
      header: 'Return',
      render: (r) => (
        <div>
          <div className="font-medium text-ink-950">{r.productName}</div>
          <div className="font-mono text-[11px] text-faint">
            {r.entry.returnId} · {r.quantity ?? '?'} units
          </div>
        </div>
      ),
    },
    {
      key: 'inbound',
      header: 'Inbound tracking',
      hideOnMobile: true,
      render: (r) => (
        <div>
          <div className="font-mono text-[12px] text-ink-900">{r.entry.inboundTrackingNumber}</div>
          <div className="text-[11px] text-faint">{r.entry.inboundCarrier}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <InlineStatus label={r.statusLabel} tone={r.statusTone} />,
    },
    {
      key: 'forwarded',
      header: 'Forwarded',
      hideOnMobile: true,
      render: (r) =>
        r.entry.forwardedTrackingNumber ? (
          <div>
            <div className="font-mono text-[12px] text-ink-900">{r.entry.forwardedTrackingNumber}</div>
            <div className="text-[11px] text-faint">{r.entry.forwardedCarrier}</div>
          </div>
        ) : (
          <span className="text-quiet">—</span>
        ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (r) =>
        r.entry.status !== 'confirmed_by_brand' ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAdvanceStage(r.entry.id);
            }}
            className="px-2.5 py-1 rounded bg-ink-950 text-on-dark text-[11px] font-medium hover:bg-ink-800"
          >
            Advance
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Returns Warehouse Tracking"
        description="Internal forwarding flow — received at warehouse to quality check, forward to brand, and brand receipt confirmation."
        meta={
          <>
            <span className="font-mono tabular-nums">{totalCount} records</span>
            <span className="font-mono tabular-nums">{confirmedCount} confirmed</span>
          </>
        }
      />

      {notice && <NoticeBanner tone="success" message={notice} />}

      <MetricStrip items={metrics} columns={4} />

      <ConsoleTabs
        tabs={[
          { id: 'all', label: 'All', count: totalCount },
          { id: 'received_at_warehouse', label: 'Received', count: stats.received },
          { id: 'quality_checked', label: 'Checked', count: stats.checked },
          { id: 'forwarded_to_brand', label: 'Forwarded', count: stats.forwarded },
          { id: 'confirmed_by_brand', label: 'Confirmed', count: stats.confirmed },
        ]}
        value={stageFilter}
        onChange={onStageFilterChange}
        ariaLabel="Filter returns by stage"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard
            title="Return queue"
            description="Open any return entry to inspect forwarding condition or advance its stage."
            actions={
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-quiet absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search return or tracking…"
                  aria-label="Search return tracking"
                  className="pl-8 pr-3 py-1.5 rounded border border-hairline-strong text-[12px] bg-surface-raised focus:outline-none focus:border-ink-900"
                />
              </div>
            }
          >
            <ConsoleTable
              rows={rows}
              columns={columns}
              rowKey={(r) => r.entry.id}
              selectedKey={selectedRow?.entry.id}
              onRowClick={(r) => onSelectRow(r.entry.id)}
              emptyTitle="No matching returns"
              emptyDescription="Adjust stage filters or search keywords."
            />
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard title="Warehouse partner">
            <div className="flex items-center gap-2 text-[13px] font-medium text-ink-950">
              <Boxes className="w-4 h-4 text-[var(--mr-accent)]" aria-hidden="true" />
              <span>{warehousePartner.name}</span>
            </div>
            <p className="mt-1.5 text-[12px] text-ink-600">
              {warehousePartner.address}, {warehousePartner.postcode}
            </p>
            <p className="mt-1.5 text-[12px] text-faint">{warehousePartner.notes}</p>
          </SectionCard>

          <SectionCard title="Forwarding stages">
            <ul className="space-y-2 text-[12px]">
              {stageSteps.map((s) => (
                <li key={s.status} className="flex items-center justify-between">
                  <span className="text-secondary">{s.label}</span>
                  <span className="font-mono font-medium text-ink-950">{s.count}</span>
                </li>
              ))}
            </ul>
          </SectionCard>
        </aside>
      </div>

      <SlideOverDrawer
        open={selectedRow !== null}
        onClose={() => onSelectRow(null)}
        title={selectedRow ? selectedRow.entry.returnId : 'Return'}
        subtitle={selectedRow ? selectedRow.brandName : undefined}
        testId="return-record-drawer"
        footer={
          selectedRow &&
          selectedRow.entry.status !== 'confirmed_by_brand' && (
            <button
              type="button"
              onClick={() => onAdvanceStage(selectedRow.entry.id)}
              className="px-3.5 py-2 rounded-md bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)]"
            >
              Advance stage
            </button>
          )
        }
      >
        {selectedRow && (
          <div className="space-y-4 text-[13px]">
            <InlineStatus label={selectedRow.statusLabel} tone={selectedRow.statusTone} />
            <dl className="space-y-2 border border-hairline rounded-md p-3">
              <div className="flex justify-between"><dt className="text-faint">Product</dt><dd>{selectedRow.productName}</dd></div>
              <div className="flex justify-between"><dt className="text-faint">Quantity</dt><dd className="font-mono">{selectedRow.quantity ?? '?'}</dd></div>
              <div className="flex justify-between"><dt className="text-faint">Received</dt><dd className="font-mono">{selectedRow.entry.receivedAtWarehouse}</dd></div>
              <div className="flex justify-between"><dt className="text-faint">Condition</dt><dd>{selectedRow.entry.conditionOnReceipt}</dd></div>
              <div className="flex justify-between"><dt className="text-faint">Inbound carrier</dt><dd className="font-mono">{selectedRow.entry.inboundCarrier} · {selectedRow.entry.inboundTrackingNumber}</dd></div>
              <div className="flex justify-between"><dt className="text-faint">Forward carrier</dt><dd className="font-mono">{selectedRow.entry.forwardedCarrier ?? '—'} {selectedRow.entry.forwardedTrackingNumber ?? ''}</dd></div>
            </dl>
            {selectedRow.entry.qualityCheckNotes && (
              <div className="border border-hairline rounded-md p-3">
                <div className="text-[11px] uppercase tracking-[0.06em] text-faint mb-1">
                  Quality check notes
                </div>
                <p className="text-[12px] text-secondary">{selectedRow.entry.qualityCheckNotes}</p>
              </div>
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
