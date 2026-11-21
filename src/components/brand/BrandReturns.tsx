import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { Card, Badge, DataTable } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { cn } from '@/utils/cn';
import { demoReturns } from '@/data/api';
import type { ReturnReason } from '@/types';
import {
  AlertTriangle,
  Truck,
  XCircle,
  ThumbsDown,
  RotateCcw,
  ShieldAlert,
  Search,
  X,
} from 'lucide-react';

const REASON_ICONS: Record<ReturnReason, typeof AlertTriangle> = {
  defective: AlertTriangle,
  damaged_in_transit: Truck,
  wrong_item: XCircle,
  quality_issue: ThumbsDown,
  customer_return: RotateCcw,
  compliance_issue: ShieldAlert,
};

const REASON_LABELS: Record<ReturnReason, string> = {
  defective: 'Defective',
  damaged_in_transit: 'Damaged in Transit',
  wrong_item: 'Wrong Item',
  quality_issue: 'Quality Issue',
  customer_return: 'Customer Return',
  compliance_issue: 'Compliance Issue',
};

const REASON_BADGES: Record<ReturnReason, string> = {
  defective: 'bg-red-500/15 text-red-300 border-red-500/20',
  damaged_in_transit: 'bg-state-warning/10 text-state-warning border-state-warning/20',
  wrong_item: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  quality_issue: 'bg-orange-500/15 text-orange-300 border-orange-500/20',
  customer_return: 'bg-state-info/10 text-state-info border-blue-500/20',
  compliance_issue: 'bg-state-danger/10 text-state-danger border-state-danger/20',
};

/**
 * §Batch-2 — Brand-facing Returns workflow.
 * Shows returned units per PO/product with quantity and reason.
 * Feeds the Deductions module when a return indicates a quality/compliance issue.
 * Tenant-scoped through session pin — never client-supplied ids.
 */
export function BrandReturns() {
  const { session } = useApp();
  const brandId = session?.tenantId ?? '';
  const [drillCard, setDrillCard] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const returns = useMemo(() => demoReturns.filter((r) => r.brandId === brandId), [brandId]);
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return returns;
    const q = searchQuery.toLowerCase();
    return returns.filter((r) =>
      r.poNumber.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      r.productSku.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q)
    );
  }, [returns, searchQuery]);

  const totalUnits = filtered.reduce((s, r) => s + r.quantity, 0);
  const qualityIssues = filtered.filter((r) => r.reason === 'defective' || r.reason === 'quality_issue' || r.reason === 'compliance_issue');
  const deductedReturns = filtered.filter((r) => r.linkedDeductionId);

  if (returns.length === 0) {
    return (
      <WorkspaceFrame className="space-y-4">
        <WorkspaceHeader
          eyebrow="BRAND PORTAL · RETURNS"
          title="Returns"
          description="Returned units per purchase order, sourced from the canonical returns record."
        />
        <Card title="Returns">
          <p className="text-xs text-faint">No returns recorded for your brand.</p>
        </Card>
      </WorkspaceFrame>
    );
  }

  return (
    <WorkspaceFrame className="space-y-6">
      <WorkspaceHeader
        eyebrow="BRAND PORTAL · RETURNS"
        title="Returns"
        description={`Returned units per PO — ${totalUnits} total units returned`}
      />

      {/* Summary cards — §Batch-3 UX: every card opens drill-down detail */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setDrillCard('Total returned units')}
          className="w-full text-left bg-surface-raised border border-hairline rounded-ds-lg p-3 hover:bg-tint hover:border-hairline-strong transition-all cursor-pointer"
        >
          <p className="text-ds-micro text-muted">Total returned units</p>
          <p className="text-lg font-semibold text-strong">{totalUnits}</p>
        </button>
        <button
          onClick={() => setDrillCard('Quality/compliance flags')}
          className="w-full text-left bg-surface-raised border border-hairline rounded-ds-lg p-3 hover:bg-tint hover:border-hairline-strong transition-all cursor-pointer"
        >
          <p className="text-ds-micro text-muted">Quality/compliance flags</p>
          <p className="text-lg font-semibold text-strong">{qualityIssues.length}</p>
        </button>
        <button
          onClick={() => setDrillCard('Deductions linked')}
          className="w-full text-left bg-surface-raised border border-hairline rounded-ds-lg p-3 hover:bg-tint hover:border-hairline-strong transition-all cursor-pointer"
        >
          <p className="text-ds-micro text-muted">Deductions linked</p>
          <p className="text-lg font-semibold text-strong">{deductedReturns.length}</p>
        </button>
      </div>

      {/* §Batch-3 UX — search + filtered returns table */}
      <Card title="Returned Items">
        <div className="px-4 pb-3">
          <div className="relative mb-3 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-faint" />
            <input
              type="text"
              placeholder="Search by PO, product, or reason…"
              aria-label="Search returns by PO, product or reason"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface border border-hairline rounded-ds-md pl-9 pr-4 py-1.5 text-xs text-strong placeholder-faint focus:outline-none focus:border-accent-500/40 transition-all"
            />
          </div>
          {/* §Phase D — canonical DataTable: labelled cards below md (every
              field + the reason are reachable), semantic table at md+. */}
          <DataTable
            dataTable="brand-returns"
            caption="Brand returns"
            rows={filtered}
            rowKey={(r) => r.id}
            emptyMessage={
              searchQuery ? 'No returns match your search.' : 'No returns recorded for your brand.'
            }
            columns={[
              {
                key: 'returnDate',
                label: 'Date',
                hideBelow: 'lg',
                render: (r) => <span className="font-mono text-xs text-muted">{r.returnDate}</span>,
              },
              {
                key: 'poNumber',
                label: 'PO',
                primary: true,
                render: (r) => <span className="font-mono text-xs text-muted">{r.poNumber}</span>,
              },
              {
                key: 'productName',
                label: 'Product',
                render: (r) => (
                  <div>
                    <div className="font-medium text-strong">{r.productName}</div>
                    <div className="text-ds-micro text-muted">{r.productSku}</div>
                  </div>
                ),
              },
              {
                key: 'quantity',
                label: 'Qty',
                align: 'right',
                render: (r) => <span className="text-xs text-muted">{r.quantity}</span>,
              },
              {
                key: 'reason',
                label: 'Reason',
                render: (r) => {
                  const Icon = REASON_ICONS[r.reason];
                  return (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3 h-3 text-muted" />
                        <Badge className={cn('text-ds-micro', REASON_BADGES[r.reason])}>
                          {REASON_LABELS[r.reason]}
                        </Badge>
                      </div>
                      <p className="text-ds-micro text-faint mt-0.5 max-w-[200px]">{r.description}</p>
                    </div>
                  );
                },
              },
              {
                key: 'linkedDeductionId',
                label: 'Deduction',
                render: (r) =>
                  r.linkedDeductionId ? (
                    <Badge className="text-ds-micro bg-red-500/15 text-red-300">{r.linkedDeductionId}</Badge>
                  ) : (
                    <span className="text-faint">—</span>
                  ),
              },
            ]}
          />
          <div className="text-ds-micro text-faint pt-2 border-t border-hairline mt-1">
            {filtered.length} of {returns.length} return record{returns.length === 1 ? '' : 's'}
          </div>
        </div>
      </Card>

      {/* §Batch-3 — Summary card drill-down modals */}
      {drillCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-hover" onClick={() => setDrillCard(null)}>
          <div className="bg-surface-raised border border-hairline rounded-ds-lg p-5 w-[480px] max-h-[80vh] overflow-y-auto shadow-ds-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-strong">{drillCard}</h3>
              <button onClick={() => setDrillCard(null)} className="text-muted hover:text-strong transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {drillCard === 'Total returned units' && (
              <div className="space-y-2">
                <p className="text-xs text-muted mb-2">Returns by reason:</p>
                <div className="space-y-1">
                  {(Object.keys(REASON_LABELS) as ReturnReason[]).map((reason) => {
                    const count = filtered.filter((r) => r.reason === reason).reduce((s, r) => s + r.quantity, 0);
                    const Icon = REASON_ICONS[reason];
                    if (count === 0) return null;
                    return (
                      <div key={reason} className="flex items-center justify-between text-xs border-b border-hairline py-1.5">
                        <span className="flex items-center gap-2 text-strong">
                          <Icon className="w-3 h-3 text-muted" />
                          {REASON_LABELS[reason]}
                        </span>
                        <span className="font-mono text-muted">{count} units</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {drillCard === 'Quality/compliance flags' && (
              <div className="space-y-2">
                <p className="text-xs text-muted mb-2">Returns flagged with quality or compliance issues:</p>
                {qualityIssues.length === 0 ? (
                  <p className="text-xs text-faint">No quality/compliance flagged returns.</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {qualityIssues.map((r) => {
                      const Icon = REASON_ICONS[r.reason];
                      return (
                        <div key={r.id} className="flex items-center justify-between text-xs border-b border-hairline py-1.5">
                          <span className="flex items-center gap-2 text-strong">
                            <Icon className="w-3 h-3 text-muted" />
                            {r.productName}
                          </span>
                          <span className="font-mono text-muted">{r.quantity} u</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {drillCard === 'Deductions linked' && (
              <div className="space-y-2">
                <p className="text-xs text-muted mb-2">Returns that triggered deductions:</p>
                {deductedReturns.length === 0 ? (
                  <p className="text-xs text-faint">No returns with linked deductions.</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {deductedReturns.map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-xs border-b border-hairline py-1.5">
                        <span className="text-strong">{r.productName} — {r.poNumber}</span>
                        <span className="text-muted font-mono">{r.linkedDeductionId}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </WorkspaceFrame>
  );
}