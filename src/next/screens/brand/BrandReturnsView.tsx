import { useState } from 'react';
/* §PORT FIX (2026-11-25) — the canonical type is `BrandReturn`; `ReturnRecord`
     was invented by the snapshot and exists nowhere in `src/types.ts`. */
import type { BrandReturn, ReturnReason } from '@/types';
import {
  ConsoleTable,
  InlineStatus,
  MetricStrip,
  ConsoleHeader,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';
import { formatGbp } from '@/next/components/ConsoleCharts';

const REASON_LABELS: Record<ReturnReason, string> = {
  defective: 'Defective',
  damaged_in_transit: 'Damaged in transit',
  wrong_item: 'Wrong item',
  quality_issue: 'Quality issue',
  customer_return: 'Customer return',
  compliance_issue: 'Compliance issue',
};

const REASON_TONE: Record<ReturnReason, SemanticTone> = {
  defective: 'danger',
  damaged_in_transit: 'warning',
  wrong_item: 'info',
  quality_issue: 'warning',
  customer_return: 'neutral',
  compliance_issue: 'danger',
};

export function BrandReturnsView({
  returns,
  onOpenPo,
  onOpenDeductions,
}: {
  returns: BrandReturn[];
  onOpenPo: (poNumber: string) => void;
  onOpenDeductions: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'quality' | 'deducted'>('all');
  const [selected, setSelected] = useState<BrandReturn | null>(null);

  const filtered = returns.filter((r) => {
    if (
      filterMode === 'quality' &&
      r.reason !== 'defective' &&
      r.reason !== 'quality_issue' &&
      r.reason !== 'compliance_issue'
    ) {
      return false;
    }
    if (filterMode === 'deducted' && !r.linkedDeductionId) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      r.poNumber.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      r.productSku.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q)
    );
  });

  const totalUnits = returns.reduce((s, r) => s + r.quantity, 0);
  const qualityCount = returns.filter(
    (r) => r.reason === 'defective' || r.reason === 'quality_issue' || r.reason === 'compliance_issue'
  ).length;
  const deductedCount = returns.filter((r) => Boolean(r.linkedDeductionId)).length;

  const metrics: MetricItem[] = [
    {
      id: 'ret-all',
      label: 'Total returned units',
      value: String(totalUnits),
      context: `${returns.length} return events`,
      active: filterMode === 'all',
      onClick: () => setFilterMode('all'),
    },
    {
      id: 'ret-quality',
      label: 'Quality / compliance flags',
      value: String(qualityCount),
      context: 'Defective, quality, or compliance',
      active: filterMode === 'quality',
      onClick: () => setFilterMode('quality'),
    },
    {
      id: 'ret-deducted',
      label: 'Deductions linked',
      value: String(deductedCount),
      context: 'Connected to commercial ledger',
      active: filterMode === 'deducted',
      onClick: () => setFilterMode('deducted'),
    },
  ];

  const columns: ConsoleColumn<BrandReturn>[] = [
    {
      key: 'poNumber',
      header: 'PO Ref',
      mobilePrimary: true,
      render: (r) => <span className="font-mono font-medium text-strong">{r.poNumber}</span>,
    },
    {
      key: 'product',
      header: 'Product & SKU',
      render: (r) => (
        <div>
          <div className="font-medium text-strong">{r.productName}</div>
          <div className="font-mono text-ds-micro text-faint">{r.productSku}</div>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (r) => (
        <InlineStatus label={REASON_LABELS[r.reason]} tone={REASON_TONE[r.reason]} />
      ),
    },
    {
      key: 'qty',
      header: 'Units',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{r.quantity}</span>,
    },
    {
      key: 'deduction',
      header: 'Deduction',
      align: 'right',
      hideOnMobile: true,
      render: (r) =>
        r.linkedDeductionId ? (
          <span className="font-mono text-ds-label text-state-warning">{r.linkedDeductionId}</span>
        ) : (
          <span className="text-ds-label text-quiet">—</span>
        ),
    },
    {
      key: 'returnedAt',
      header: 'Recorded',
      align: 'right',
      hideOnMobile: true,
      render: (r) => (
        <span className="font-mono text-ds-label text-muted">{r.returnDate.slice(0, 10)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6" data-testid="brand-returns">
      <ConsoleHeader
        title="Returns"
        description="Returned units per purchase order recorded by the warehouse and channel reconciliation feed."
        meta={
          <>
            <span className="font-mono tabular-nums">{returns.length} return record(s)</span>
            <span className="font-mono tabular-nums">{totalUnits} units returned</span>
          </>
        }
      />

      <MetricStrip items={metrics} columns={3} />

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search PO, SKU, product, or reason…"
          aria-label="Search returns"
          className="w-full sm:w-80 px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-body text-strong"
        />
        {filterMode !== 'all' && (
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className="text-ds-label text-accent hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>

      <ConsoleTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        selectedKey={selected?.id ?? null}
        onRowClick={setSelected}
        emptyTitle="No returns recorded"
        emptyDescription="No returned units match your tenant account or current filter."
      />

      <SlideOverDrawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Return · ${selected.productName}` : 'Return detail'}
        subtitle={selected ? `${selected.poNumber} · SKU ${selected.productSku}` : undefined}
      >
        {selected && (
          <div className="space-y-4 text-ds-body">
            <div className="grid grid-cols-2 gap-3 border border-hairline rounded-ds-md p-3 bg-canvas-50 text-ds-label">
              <div>
                <span className="text-faint block">Quantity returned</span>
                <span className="font-mono text-strong font-semibold">{selected.quantity} units</span>
              </div>
              <div>
                <span className="text-faint block">Reason</span>
                <InlineStatus label={REASON_LABELS[selected.reason]} tone={REASON_TONE[selected.reason]} />
              </div>
              <div>
                {/* §PORT FIX (2026-11-25) — `BrandReturn` has no `stage`; the real
                    relationship is the PO number it came from. */}
                <span className="text-faint block">Purchase order</span>
                <span className="font-mono text-strong">{selected.poNumber}</span>
              </div>
              <div>
                {/* §PORT FIX (2026-11-25) — `BrandReturn` carries no credit amount.
                    The canonical link is the deduction raised against it. */}
                <span className="text-faint block">Linked deduction</span>
                <span className="font-mono text-strong">{selected.linkedDeductionId ?? 'None'}</span>
              </div>
            </div>
            {selected.description && (
              <div>
                <div className="text-ds-micro uppercase tracking-[0.06em] text-faint mb-1">Description</div>
                <p className="text-secondary">{selected.description}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-hairline">
              <button
                type="button"
                onClick={() => onOpenPo(selected.poNumber)}
                className="px-3 py-1.5 rounded-ds-sm bg-accent text-on-dark text-ds-label font-medium hover:bg-accent-600"
              >
                Inspect PO {selected.poNumber}
              </button>
              {selected.linkedDeductionId && (
                <button
                  type="button"
                  onClick={onOpenDeductions}
                  className="px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label font-medium text-ink-900"
                >
                  Open Deduction {selected.linkedDeductionId}
                </button>
              )}
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
