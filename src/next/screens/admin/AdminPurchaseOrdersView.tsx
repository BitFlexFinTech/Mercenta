import { Eye, FlaskConical, Gavel, RefreshCw, Search, Truck } from 'lucide-react';
import {
  NoticeBanner,
  SectionCard,
  formatGbp,
} from '@/next/components/ConsoleCharts';
import {
  ConsoleTable,
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  PageHeader,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';
import { orderDateLabel } from '@/lib/dates';
import type {
  ChannelInstruction,
  Deduction,
  PoChannelHoldStatement,
  PurchaseOrder,
} from '@/types';
import { PO_REJECTION_CODES } from '@/types';
import type { ChannelIngestionResult } from '@/lib/commerce/channelPurchaseOrderIngestion';
import type { PoAcknowledgementWindow, PoOnBehalfRejectionDraft } from '@/lib/commerce/poAcknowledgementWindow';

export interface AdminPoRowView {
  po: PurchaseOrder;
  brandName: string;
  deductionsCount: number;
  statusLabel: string;
  statusTone: SemanticTone;
}

export interface AdminPoDetailModel {
  po: PurchaseOrder;
  brandName: string;
  brandCategory: string;
  ackWindow: PoAcknowledgementWindow;
  onBehalfAuthority: { permitted: string; statement: string; ruleText: string };
  onBehalfRejectDraft: PoOnBehalfRejectionDraft | null;
  instruction: ChannelInstruction | undefined;
  deductions: Deduction[];
  priceDivergences: { sku: string; poUnitPrice: number; acknowledgedUnitPrice: number }[];
  carrierOptions: { value: string; label: string }[];
  channelCancelled: boolean;
  acknowledgementStale: boolean;
}

export interface AdminPurchaseOrdersViewProps {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  totalPos: number;
  totalBrands: number;
  queueValueGbp: number;
  awaitingCount: number;
  simulatedCount: number;
  metrics: MetricItem[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  statusOrder: string[];
  simOnly: boolean;
  onToggleSimOnly: () => void;
  rows: AdminPoRowView[];
  canMutate: boolean;
  ingestBusy: boolean;
  ingestResult: ChannelIngestionResult | null;
  ingestError: string | null;
  onReadChannel: () => void;
  revisionBusy: boolean;
  revisionNotice: string | null;
  onSimulateRevision: () => void;
  holdBusy: boolean;
  holdNotice: string | null;
  onSimulateHold: (state: PoChannelHoldStatement) => void;
  brandNameFor: (id: string) => string;
  selectedDetail: AdminPoDetailModel | null;
  onOpenDetail: (poId: string | null) => void;
  onBehalfAckOpen: boolean;
  onBeginBehalfAck: () => void;
  onCancelBehalfAck: () => void;
  ackStatuses: Record<string, 'accepted' | 'rejected' | 'backordered'>;
  onAckStatusChange: (sku: string, next: 'accepted' | 'rejected' | 'backordered') => void;
  ackQtys: Record<string, number>;
  onAckQtyChange: (sku: string, next: number) => void;
  ackPrices: Record<string, number>;
  onAckPriceChange: (sku: string, next: number) => void;
  ackRejectionCodes: Record<string, string>;
  onAckRejectionCodeChange: (sku: string, next: string) => void;
  onSubmitBehalfAck: () => void;
  ackNotice: string | null;
  onApproveBehalfRejection: () => void;
  behalfRejectNotice: string | null;
  onRetryInstruction: () => void;
  proxyNotice: string | null;
  onBehalfAsnOpen: boolean;
  onBeginBehalfAsn: () => void;
  asnCarrier: string;
  onAsnCarrierChange: (c: string) => void;
  asnShipDate: string;
  onAsnShipDateChange: (d: string) => void;
  asnLot: string;
  onAsnLotChange: (l: string) => void;
  asnExpiry: string;
  onAsnExpiryChange: (e: string) => void;
  onSubmitBehalfAsn: () => void;
  asnNotice: string | null;
}

export function AdminPurchaseOrdersView({
  loading,
  error,
  onRetry,
  totalPos,
  totalBrands,
  queueValueGbp,
  awaitingCount,
  simulatedCount,
  metrics,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  statusOrder,
  simOnly,
  onToggleSimOnly,
  rows,
  canMutate,
  ingestBusy,
  ingestResult,
  ingestError,
  onReadChannel,
  revisionBusy,
  revisionNotice,
  onSimulateRevision,
  holdBusy,
  holdNotice,
  onSimulateHold,
  brandNameFor,
  selectedDetail,
  onOpenDetail,
  onBehalfAckOpen,
  onBeginBehalfAck,
  onCancelBehalfAck,
  ackStatuses,
  onAckStatusChange,
  ackQtys,
  onAckQtyChange,
  ackPrices,
  onAckPriceChange,
  ackRejectionCodes,
  onAckRejectionCodeChange,
  onSubmitBehalfAck,
  ackNotice,
  onApproveBehalfRejection,
  behalfRejectNotice,
  onRetryInstruction,
  proxyNotice,
  onBehalfAsnOpen,
  onBeginBehalfAsn,
  asnCarrier,
  onAsnCarrierChange,
  asnShipDate,
  onAsnShipDateChange,
  asnLot,
  onAsnLotChange,
  asnExpiry,
  onAsnExpiryChange,
  onSubmitBehalfAsn,
  asnNotice,
}: AdminPurchaseOrdersViewProps) {
  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Purchase Orders" description="Loading purchase order queue…" />
        <LoadingRows rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Purchase Orders" description="Unable to load purchase orders." />
        <ErrorStateBlock message="Could not read purchase order records." onRetry={onRetry} />
      </div>
    );
  }

  const columns: ConsoleColumn<AdminPoRowView>[] = [
    {
      key: 'poNumber',
      header: 'PO Reference',
      render: (r) => (
        <div className="font-mono text-[12px] font-medium text-zinc-950">
          {r.po.poNumber}
          {r.po.simulated === true && <span className="ml-1.5 text-[11px] text-[#C2410C]">(sim)</span>}
        </div>
      ),
    },
    {
      key: 'brand',
      header: 'Brand',
      render: (r) => <span className="font-medium text-zinc-950">{r.brandName}</span>,
    },
    {
      key: 'orderDate',
      header: 'Order date',
      hideOnMobile: true,
      render: (r) => <span className="font-mono text-[12px] text-zinc-600">{orderDateLabel(r.po.orderDate)}</span>,
    },
    {
      key: 'items',
      header: 'Lines',
      align: 'right',
      hideOnMobile: true,
      render: (r) => <span>{r.po.lineItems.length}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      align: 'right',
      render: (r) => formatGbp(r.po.poValue),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <InlineStatus label={r.statusLabel} tone={r.statusTone} />
          {r.deductionsCount > 0 && (
            <span className="text-[11px] text-amber-800">{r.deductionsCount} deduction(s)</span>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(r.po.id);
          }}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-[#C2410C] hover:underline"
          title="View detail"
        >
          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          Inspect
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description={`${totalPos} POs across ${totalBrands} brands — read from the retail channel, routed by line items, acknowledged, and filed as ASNs on brand behalf.`}
        meta={
          <>
            <span className="font-mono tabular-nums">Queue {formatGbp(queueValueGbp)}</span>
            <span className="font-mono tabular-nums">{awaitingCount} awaiting action</span>
            {simulatedCount > 0 && <span className="font-mono tabular-nums">{simulatedCount} simulated</span>}
          </>
        }
        actions={
          <button
            type="button"
            data-state="admin-po-ingest"
            disabled={!canMutate || ingestBusy}
            onClick={onReadChannel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-zinc-950 text-white text-[12px] font-medium hover:bg-zinc-800 disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            {ingestBusy ? 'Reading…' : 'Read channel POs'}
          </button>
        }
      />

      <MetricStrip items={metrics} columns={4} />

      <SectionCard
        title="Channel purchase-order ingestion"
        description="Mercenta never fabricates a PO — orders arrive from the retail channel, are routed to matching brands, or fail closed for manual review."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-state="admin-po-simulate-change"
              disabled={!canMutate || revisionBusy || ingestResult?.mode !== 'mock'}
              onClick={onSimulateRevision}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-[11px] font-medium text-zinc-900 disabled:opacity-40 hover:bg-zinc-50"
            >
              <FlaskConical className="w-3 h-3" aria-hidden="true" />
              Simulate channel change
            </button>
            <button
              type="button"
              data-state="admin-po-simulate-hold"
              disabled={!canMutate || holdBusy || ingestResult?.mode !== 'mock'}
              onClick={() => onSimulateHold('declared')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-[11px] font-medium text-zinc-900 disabled:opacity-40 hover:bg-zinc-50"
            >
              Simulate hold
            </button>
            <button
              type="button"
              data-state="admin-po-simulate-hold-lift"
              disabled={!canMutate || holdBusy || ingestResult?.mode !== 'mock'}
              onClick={() => onSimulateHold('cleared')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-[11px] font-medium text-zinc-900 disabled:opacity-40 hover:bg-zinc-50"
            >
              Lift hold
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-[12px]" data-testid="channel-po-ingestion">
          <div className="flex items-center gap-3 text-zinc-600">
            <span>
              Channel read:{' '}
              <strong className="font-mono text-zinc-950" data-state="channel-mode">
                {ingestResult ? (ingestResult.mode === 'mock' ? 'Simulation (mock)' : 'Live') : 'Not yet read'}
              </strong>
            </span>
          </div>
          {ingestError && <NoticeBanner tone="danger" message={ingestError} />}
          {revisionNotice && <NoticeBanner tone="info" message={revisionNotice} />}
          {holdNotice && <NoticeBanner tone="info" message={holdNotice} />}
          {ingestResult && (
            <div className="border border-zinc-200 rounded-md p-3 space-y-2" data-testid="channel-po-outcomes">
              <div className="font-mono text-zinc-800">
                Read {ingestResult.polled} · Filed {ingestResult.ingested} · Already held {ingestResult.alreadyPresent} · Refused {ingestResult.refused}
              </div>
              {ingestResult.outcomes.length > 0 && (
                <ul className="divide-y divide-zinc-200">
                  {ingestResult.outcomes.map((o) => (
                    <li key={o.channelPurchaseOrderId} className="py-1.5 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-zinc-950">
                        {o.channelPurchaseOrderId} — {o.status.replace(/_/g, ' ')} ({o.brandId ? brandNameFor(o.brandId) : 'Not routed'})
                      </span>
                      {o.reason && <span className="text-zinc-600">{o.reason}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Order queue"
        description="Filter across canonical status families or open any PO for on-behalf acknowledgement, rejection override, instruction retry, or ASN filing."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search PO or brand…"
                aria-label="Search purchase orders"
                className="pl-8 pr-3 py-1.5 rounded border border-zinc-300 text-[12px] text-zinc-950 bg-white focus:outline-none focus:border-zinc-900"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              aria-label="Filter by status"
              className="px-2.5 py-1.5 rounded border border-zinc-300 text-[12px] text-zinc-950 bg-white"
            >
              <option value="all">All statuses</option>
              {statusOrder.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onToggleSimOnly}
              data-testid="po-sim-filter"
              className={`px-2.5 py-1.5 rounded border text-[12px] font-medium ${
                simOnly ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-300 bg-white text-zinc-700'
              }`}
            >
              Simulated only
            </button>
          </div>
        }
      >
        <ConsoleTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.po.id}
          selectedKey={selectedDetail?.po.id}
          onRowClick={(r) => onOpenDetail(r.po.id)}
          emptyTitle="No matching purchase orders"
          emptyDescription="Adjust status filters or read pending channel orders."
        />
      </SectionCard>

      <SlideOverDrawer
        open={selectedDetail !== null}
        onClose={() => onOpenDetail(null)}
        title={selectedDetail ? selectedDetail.po.poNumber : 'Purchase Order'}
        subtitle={selectedDetail ? `${selectedDetail.brandName} · ${formatGbp(selectedDetail.po.poValue)}` : undefined}
        testId="po-record-drawer"
      >
        {selectedDetail && (
          <div className="space-y-5 text-[13px]">
            <dl className="grid grid-cols-2 gap-3 border border-zinc-200 rounded-md p-3">
              <div>
                <dt className="text-[11px] uppercase text-zinc-500">Order date</dt>
                <dd className="font-mono text-zinc-950">{orderDateLabel(selectedDetail.po.orderDate)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-zinc-500">Status</dt>
                <dd className="capitalize text-zinc-950">{selectedDetail.po.status.replace(/_/g, ' ')}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[11px] uppercase text-zinc-500">Acknowledgement window</dt>
                <dd className="text-[12px] text-zinc-700">{selectedDetail.ackWindow.reason}</dd>
              </div>
            </dl>

            <NoticeBanner
              tone={selectedDetail.onBehalfAuthority.permitted === 'any_decision' ? 'info' : 'warning'}
              title="On-behalf authority"
              message={`${selectedDetail.onBehalfAuthority.statement} ${selectedDetail.onBehalfAuthority.ruleText}`}
            />

            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500 mb-2">
                Line items ({selectedDetail.po.lineItems.length})
              </div>
              <div className="border border-zinc-200 rounded-md divide-y divide-zinc-200">
                {selectedDetail.po.lineItems.map((li) => (
                  <div key={li.sku} className="p-2.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-[12px] text-zinc-950">{li.sku}</span>
                        <div className="text-[12px] text-zinc-600">{li.productName}</div>
                      </div>
                      <div className="text-right font-mono text-[12px]">
                        <div>{li.quantity} × £{li.unitPrice.toFixed(2)}</div>
                        <div className="text-[11px] text-zinc-500 capitalize">{li.ackStatus ?? 'pending'}</div>
                      </div>
                    </div>
                    {onBehalfAckOpen && (
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-100">
                        <select
                          value={ackStatuses[li.sku] ?? 'accepted'}
                          onChange={(e) =>
                            onAckStatusChange(li.sku, e.target.value as 'accepted' | 'rejected' | 'backordered')
                          }
                          className="border border-zinc-300 rounded px-2 py-1 text-[12px] bg-white"
                        >
                          <option value="accepted">Accept</option>
                          <option value="backordered">Backorder</option>
                          <option value="rejected">Reject</option>
                        </select>
                        <input
                          type="number"
                          value={ackQtys[li.sku] ?? li.quantity}
                          onChange={(e) => onAckQtyChange(li.sku, Number(e.target.value))}
                          className="border border-zinc-300 rounded px-2 py-1 text-[12px] font-mono bg-white"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={ackPrices[li.sku] ?? li.unitPrice}
                          onChange={(e) => onAckPriceChange(li.sku, Number(e.target.value))}
                          className="border border-zinc-300 rounded px-2 py-1 text-[12px] font-mono bg-white"
                        />
                        {ackStatuses[li.sku] === 'rejected' && (
                          <select
                            value={ackRejectionCodes[li.sku] ?? ''}
                            onChange={(e) => onAckRejectionCodeChange(li.sku, e.target.value)}
                            className="col-span-3 border border-zinc-300 rounded px-2 py-1 text-[12px] bg-white"
                          >
                            <option value="">Select rejection code…</option>
                            {Object.entries(PO_REJECTION_CODES).map(([code, label]) => (
                              <option key={code} value={code}>
                                {code} — {label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {selectedDetail.ackWindow.inQueue &&
              !onBehalfAckOpen &&
              selectedDetail.onBehalfAuthority.permitted === 'any_decision' && (
                <button
                  type="button"
                  onClick={onBeginBehalfAck}
                  className="px-3.5 py-2 rounded-md bg-zinc-950 text-white text-[12px] font-medium hover:bg-zinc-800"
                >
                  Acknowledge on behalf of {selectedDetail.brandName}
                </button>
              )}

            {onBehalfAckOpen && (
              <div className="border border-zinc-200 rounded-md p-3 space-y-2 bg-zinc-50">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={onSubmitBehalfAck}
                    className="px-3 py-1.5 rounded bg-[#C2410C] text-white text-[12px] font-medium hover:bg-[#9A3412]"
                  >
                    Submit on-behalf acknowledgement
                  </button>
                  <button
                    type="button"
                    onClick={onCancelBehalfAck}
                    className="px-3 py-1.5 rounded border border-zinc-300 bg-white text-[12px]"
                  >
                    Cancel
                  </button>
                </div>
                {ackNotice && <NoticeBanner tone="info" message={ackNotice} />}
              </div>
            )}

            {selectedDetail.onBehalfRejectDraft?.available && (
              <div className="border border-red-200 bg-red-50/60 rounded-md p-3 space-y-2">
                <div className="font-semibold text-red-950">On-behalf rejection draft</div>
                <p className="text-[12px] text-zinc-700">{selectedDetail.onBehalfRejectDraft.ruleText}</p>
                <button
                  type="button"
                  onClick={onApproveBehalfRejection}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-700 text-white text-[12px] font-medium hover:bg-red-800"
                >
                  <Gavel className="w-3.5 h-3.5" aria-hidden="true" />
                  Approve rejection override
                </button>
              </div>
            )}
            {behalfRejectNotice && <NoticeBanner tone="info" message={behalfRejectNotice} />}

            {selectedDetail.instruction && (
              <div className="border border-zinc-200 rounded-md p-3 space-y-2">
                <div className="text-[11px] uppercase text-zinc-500">Proxy channel instruction</div>
                <div className="text-[12px]">
                  State: <strong className="font-mono">{selectedDetail.instruction.state.replace(/_/g, ' ')}</strong>
                </div>
                {selectedDetail.instruction.outcome?.refusedReason && (
                  <p className="text-[12px] text-red-800">{selectedDetail.instruction.outcome.refusedReason}</p>
                )}
                {(selectedDetail.instruction.state === 'refused' ||
                  selectedDetail.instruction.state === 'pending_mercenta_action') && (
                  <button
                    type="button"
                    onClick={onRetryInstruction}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-300 bg-white text-[12px] font-medium"
                  >
                    <Truck className="w-3.5 h-3.5" aria-hidden="true" />
                    Retry channel action
                  </button>
                )}
                {proxyNotice && <p className="text-[12px] text-zinc-700">{proxyNotice}</p>}
              </div>
            )}

            {selectedDetail.po.acknowledgedAt && !onBehalfAsnOpen && (
              <button
                type="button"
                onClick={onBeginBehalfAsn}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-zinc-300 bg-white text-[12px] font-medium text-zinc-900 hover:bg-zinc-50"
              >
                <Truck className="w-3.5 h-3.5" aria-hidden="true" />
                File / correct ASN on behalf of {selectedDetail.brandName}
              </button>
            )}

            {onBehalfAsnOpen && (
              <div className="border border-zinc-200 rounded-md p-3 space-y-2.5 bg-zinc-50">
                <div className="text-[12px] font-medium text-zinc-950">On-behalf ASN filing</div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={asnCarrier}
                    onChange={(e) => onAsnCarrierChange(e.target.value)}
                    className="border border-zinc-300 rounded px-2 py-1.5 text-[12px] bg-white"
                  >
                    {selectedDetail.carrierOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={asnShipDate}
                    onChange={(e) => onAsnShipDateChange(e.target.value)}
                    className="border border-zinc-300 rounded px-2 py-1.5 text-[12px] bg-white"
                  />
                  <input
                    type="text"
                    value={asnLot}
                    onChange={(e) => onAsnLotChange(e.target.value)}
                    placeholder="Lot number (Grocery / H&PC)"
                    className="border border-zinc-300 rounded px-2 py-1.5 text-[12px] bg-white"
                  />
                  <input
                    type="date"
                    value={asnExpiry}
                    onChange={(e) => onAsnExpiryChange(e.target.value)}
                    className="border border-zinc-300 rounded px-2 py-1.5 text-[12px] bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={onSubmitBehalfAsn}
                  className="px-3 py-1.5 rounded bg-[#C2410C] text-white text-[12px] font-medium hover:bg-[#9A3412]"
                >
                  Submit On-Behalf ASN
                </button>
                {asnNotice && <NoticeBanner tone="info" message={asnNotice} />}
              </div>
            )}

            {selectedDetail.priceDivergences.length > 0 && (
              <NoticeBanner
                tone="warning"
                title="Invoice price divergence detected"
                message={selectedDetail.priceDivergences
                  .map(
                    (d) =>
                      `${d.sku}: PO £${d.poUnitPrice.toFixed(2)} vs Ack £${d.acknowledgedUnitPrice.toFixed(2)}`
                  )
                  .join(' · ')}
              />
            )}

            {selectedDetail.deductions.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.06em] text-zinc-500 mb-1.5">
                  Deductions ({selectedDetail.deductions.length})
                </div>
                <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-md">
                  {selectedDetail.deductions.map((d) => (
                    <li key={d.id} className="px-3 py-2 flex items-center justify-between text-[12px]">
                      <span>{d.type.replace(/_/g, ' ')}</span>
                      <span className="font-mono">£{d.amountGbp.toFixed(2)} · {d.status}</span>
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
