import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, FileText, MessageSquare, Phone, Search, Truck } from 'lucide-react';
import type { ChannelInstruction, PurchaseOrder, PoRejectionCode } from '@/types';
import { PO_REJECTION_CODES } from '@/types';
import { orderDateLabel } from '@/lib/dates';
import {
  poAcknowledgementWindow,
  poAmendmentWindow,
  poChannelHoldDuty,
  poOnBehalfRejectionDraft,
} from '@/lib/commerce/poAcknowledgementWindow';
import { poAcknowledgementCompleteness } from '@/lib/commerce/poAcknowledgementCompleteness';
import { poOnBehalfAuthority } from '@/lib/commerce/poOnBehalfAuthority';
import {
  ACK_INVOICE_PRICE_RULE_TEXT,
  ACK_PRICE_DISCREPANCY_TITLE,
  ackPriceDivergences,
} from '@/lib/commerce/invoicePriceMatch';
import {
  PO_ACK_COMPLETENESS_RULE_TEXT,
  PO_AMENDMENT_WINDOW_RULE_TEXT,
  PO_CHANNEL_CHANGE_KIND_LABELS,
  PO_REVISION_RULE_TEXT,
} from '@/config/purchaseOrders';
import { fulfillmentTrackLabel } from '@/config/fulfillmentTrack';
import { poRevisionState } from '@/lib/commerce/poRevisions';
import {
  ackDeadlinePresentation,
  ackStatusPresentation,
  poStatusPresentation,
  PO_STATUS_ORDER,
} from '@/lib/statusPresentation';
import { BACKORDER_RESTOCK_TARGET } from '@/config/deductions';
import { downloadCsv } from '@/lib/csv';
import { MERCENTA_CARRIER_LABELS } from '@/config/shipping';
import { selectCarrierForShipment } from '@/lib/shipping/carrierRouting';
import { backOrderAvailabilityLabel, canBackOrderLine } from '@/lib/commerce/backorderGate';
import {
  RoutingRequestIndicator,
  RoutingRequestStatus,
  routingCarrierLabel,
} from '@/components/shared/RoutingRequest';
import { ShippingCostEstimate } from '@/components/shared/ShippingCostEstimate';
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
} from '@/next/components/ConsolePrimitives';

export interface LineAckDraft {
  ackStatus: 'accepted' | 'rejected' | 'backordered';
  acknowledgedQty: number;
  scheduledShipDate?: string;
  rejectionCode?: PoRejectionCode;
  unitPrice?: number;
}

export interface BrandPurchaseOrdersViewProps {
  pos: PurchaseOrder[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;

  tenantId: string | null;
  brandLabel: string;
  isFinancedBrand: boolean;
  instructionsByPoId: Map<string, ChannelInstruction[]>;
  deepLinkPoNumber?: string | null;

  onSubmitAck: (
    po: PurchaseOrder,
    lineAcks: Array<{ sku: string } & LineAckDraft>
  ) => Promise<{ ok: boolean; notice: string }>;
  onSubmitCorrection: (
    po: PurchaseOrder,
    cartons: Record<string, number>,
    note: string
  ) => Promise<{ ok: boolean; notice: string }>;
  onApproveOnBehalf: (
    po: PurchaseOrder,
    draftId: string
  ) => Promise<{ ok: boolean; notice: string }>;
  onAuthoriseOnBehalf: (
    poId: string,
    note: string
  ) => Promise<{ ok: boolean; notice: string }>;
  onWithdrawOnBehalf: (poId: string) => Promise<{ ok: boolean; notice: string }>;
  onOpenLogistics: (poNumber: string) => void;

  /** Optional slot for inline BrandCommPanel rendered by the Screen container. */
  renderCommPanel?: (po: PurchaseOrder) => ReactNode;
  /** Optional slot for CommerceSimulationPanel rendered by the Screen container. */
  simulationFooter?: ReactNode;
}

function shipCarrierLabel(v: string): string {
  return (
    MERCENTA_CARRIER_LABELS[v as keyof typeof MERCENTA_CARRIER_LABELS] ??
    (v === 'amazon_partner' ? 'Partnered carrier' : v)
  );
}

function mapStatusTone(tone: string) {
  if (tone === 'success') return 'success' as const;
  if (tone === 'warning' || tone === 'brass') return 'warning' as const;
  if (tone === 'danger') return 'danger' as const;
  if (tone === 'info') return 'info' as const;
  return 'neutral' as const;
}

export function BrandPurchaseOrdersView({
  pos,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  tenantId,
  brandLabel,
  isFinancedBrand,
  instructionsByPoId,
  deepLinkPoNumber,
  onSubmitAck,
  onSubmitCorrection,
  onApproveOnBehalf,
  onAuthoriseOnBehalf,
  onWithdrawOnBehalf,
  onOpenLogistics,
  renderCommPanel,
  simulationFooter,
}: BrandPurchaseOrdersViewProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');

  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);
  const [previewPoId, setPreviewPoId] = useState<string | null>(null);
  const [ackingPoId, setAckingPoId] = useState<string | null>(null);
  const [lineAcks, setLineAcks] = useState<Record<string, LineAckDraft>>({});

  const [correctionPoId, setCorrectionPoId] = useState<string | null>(null);
  const [correctionCartons, setCorrectionCartons] = useState<Record<string, number>>({});
  const [correctionNote, setCorrectionNote] = useState('');

  const [contacting, setContacting] = useState<{ id: string; mode: 'message' | 'call' } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyPoId, setBusyPoId] = useState<string | null>(null);

  useEffect(() => {
    if (!deepLinkPoNumber) return;
    const match = pos.find((p) => p.poNumber === deepLinkPoNumber);
    if (match) setExpandedPoId(match.id);
  }, [deepLinkPoNumber, pos]);

  const filteredPos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pos
      .filter((p) => statusFilter === 'all' || p.status === statusFilter)
      .filter((p) => !q || p.poNumber.toLowerCase().includes(q));
  }, [pos, statusFilter, search]);

  const previewRecord = useMemo(
    () => pos.find((p) => p.id === previewPoId) ?? null,
    [pos, previewPoId]
  );

  const instructionFor = (poId: string): ChannelInstruction | undefined => {
    const list = instructionsByPoId.get(poId) ?? [];
    return list.find((i) => i.type === 'po_acknowledgement') ?? list[0];
  };

  function beginAck(po: PurchaseOrder) {
    setAckingPoId(po.id);
    setExpandedPoId(po.id);
    const init: Record<string, LineAckDraft> = {};
    for (const l of po.lineItems) {
      init[l.sku] = {
        ackStatus: l.ackStatus && l.ackStatus !== 'unacknowledged' ? l.ackStatus : 'accepted',
        acknowledgedQty: l.acknowledgedQty ?? l.quantity,
        unitPrice: l.acknowledgedUnitPrice ?? l.unitPrice,
        ...(l.scheduledShipDate ? { scheduledShipDate: l.scheduledShipDate } : {}),
        ...(l.rejectionCode ? { rejectionCode: l.rejectionCode } : {}),
      };
    }
    setLineAcks(init);
  }

  async function handleAckSubmit(po: PurchaseOrder) {
    if (busyPoId) return;
    setBusyPoId(po.id);
    const payload = Object.entries(lineAcks).map(([sku, a]) => ({ sku, ...a }));
    const res = await onSubmitAck(po, payload);
    setBusyPoId(null);
    setNotice(res.notice);
    if (res.ok) setAckingPoId(null);
  }

  function beginCorrection(po: PurchaseOrder) {
    setCorrectionPoId(po.id);
    setExpandedPoId(po.id);
    setCorrectionNote('');
    const init: Record<string, number> = {};
    for (const l of po.lineItems) {
      if (l.ackStatus !== 'rejected') {
        init[l.sku] = l.acknowledgedQty ?? l.quantity;
      }
    }
    setCorrectionCartons(init);
  }

  async function handleCorrectionSubmit(po: PurchaseOrder) {
    if (busyPoId) return;
    setBusyPoId(po.id);
    const res = await onSubmitCorrection(po, correctionCartons, correctionNote);
    setBusyPoId(null);
    setNotice(res.notice);
    if (res.ok) setCorrectionPoId(null);
  }

  const queueValue = pos.reduce((s, p) => s + p.poValue, 0);

  const metrics: MetricItem[] = [
    {
      id: 'po-total',
      label: 'Purchase orders',
      value: String(pos.length),
      context: 'All orders',
      active: statusFilter === 'all' && !search,
      onClick: () => {
        setStatusFilter('all');
        setSearch('');
      },
      testId: 'brand-po-total',
    },
    {
      id: 'po-received',
      label: poStatusPresentation('received').label,
      value: String(pos.filter((p) => p.status === 'received').length),
      context: 'Awaiting decision',
      active: statusFilter === 'received',
      onClick: () => setStatusFilter((s) => (s === 'received' ? 'all' : 'received')),
      testId: 'brand-po-actionable',
    },
    {
      id: 'po-review',
      label: 'Under review',
      value: String(pos.filter((p) => p.status === 'under_review').length),
      context: 'Decision in progress',
      active: statusFilter === 'under_review',
      onClick: () => setStatusFilter((s) => (s === 'under_review' ? 'all' : 'under_review')),
      testId: 'brand-po-review',
    },
    {
      id: 'po-value',
      label: 'Queue value',
      value: `£${queueValue.toLocaleString('en-GB')}`,
      context: 'Net order value',
      onClick: () => {
        setStatusFilter('all');
        setSearch('');
      },
      testId: 'brand-po-value',
    },
  ];

  const columns: ConsoleColumn<PurchaseOrder>[] = [
    {
      key: 'po',
      header: 'PO Reference',
      render: (po) => (
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedPoId((curr) => (curr === po.id ? null : po.id));
              }}
              className="font-mono font-semibold text-zinc-950 hover:text-[#C2410C] text-left focus-visible:outline-2 focus-visible:outline-[#C2410C]"
            >
              {po.poNumber}
            </button>
            {po.simulated === true && (
              <span className="text-[11px] font-mono text-zinc-500">(sim)</span>
            )}
          </div>
          <div className="text-[12px] text-zinc-500">
            {orderDateLabel(po.orderDate)} · {po.lineItems.length} line(s)
            {po.freightTerm
              ? ` · ${po.freightTerm === 'collect' ? 'Freight Collect' : 'Freight Prepaid'}`
              : ''}
          </div>
          {po.freightTerm === 'collect' && (
            <div className="pt-0.5">
              <RoutingRequestIndicator
                poFreightTerm={po.freightTerm}
                shipWindowEnd={po.shipWindowEnd}
                routing={instructionFor(po.id)?.outcome?.routingRequest}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (po) => {
        const pres = poStatusPresentation(po.status);
        return (
          <div className="space-y-1">
            <InlineStatus
              label={pres.label}
              tone={mapStatusTone(pres.tone)}
              dataStatus={pres.dataStatus}
            />
            <AckDeadlineText po={po} />
            {po.status === 'rejected' && po.rejectionReason && (
              <div className="text-[12px] text-red-700 max-w-[220px] truncate">
                {po.rejectionReason}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'window',
      header: 'Ship / Delivery Window',
      hideOnMobile: true,
      render: (po) => {
        if (po.freightTerm === 'collect' && po.shipWindowEnd) {
          return (
            <span className="text-[12px] text-zinc-700">
              Ship by {new Date(po.shipWindowEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          );
        }
        if (po.freightTerm === 'prepaid' && po.deliveryWindowEnd) {
          return (
            <span className="text-[12px] text-zinc-700">
              Deliver by {new Date(po.deliveryWindowEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          );
        }
        return <span className="text-[12px] text-zinc-400">—</span>;
      },
    },
    {
      key: 'value',
      header: 'Order Value',
      align: 'right',
      render: (po) => (
        <span className="font-mono font-semibold text-zinc-950">
          £{po.poValue.toLocaleString('en-GB')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (po) => {
        const canAct = poAcknowledgementWindow(po).inQueue;
        const canAmend = !canAct && poAmendmentWindow(po).open && po.status !== 'rejected';
        const showPacking =
          !canAct &&
          (po.status === 'accepted' || po.status === 'ready_to_fulfil') &&
          !isFinancedBrand;
        return (
          <div
            className="flex flex-wrap items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              data-state={`brand-po-preview-${po.id}`}
              onClick={() => setPreviewPoId(po.id)}
              className="px-2.5 py-1 rounded border border-zinc-200 bg-white text-[12px] font-medium text-zinc-800 hover:bg-zinc-50 whitespace-nowrap"
            >
              Preview
            </button>
            {(po.status === 'accepted' || po.status === 'ready_to_fulfil') && (
              <button
                type="button"
                data-testid={`po-open-documents-${po.poNumber}`}
                onClick={() => onOpenLogistics(po.poNumber)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-200 bg-white text-[12px] font-medium text-zinc-900 hover:bg-zinc-50 whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                Docs
              </button>
            )}
            {canAct && (
              <button
                type="button"
                onClick={() =>
                  ackingPoId === po.id ? void handleAckSubmit(po) : beginAck(po)
                }
                disabled={busyPoId === po.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#C2410C] text-white text-[12px] font-medium hover:bg-[#9A3412] whitespace-nowrap disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                {ackingPoId === po.id ? 'Submit ack' : 'Acknowledge'}
              </button>
            )}
            {canAmend && (
              <button
                type="button"
                data-testid={`po-amend-${po.poNumber}`}
                onClick={() =>
                  ackingPoId === po.id ? void handleAckSubmit(po) : beginAck(po)
                }
                disabled={busyPoId === po.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-300 bg-white text-[12px] font-medium text-zinc-900 hover:bg-zinc-50 whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                {ackingPoId === po.id ? 'Submit amendment' : 'Amend'}
              </button>
            )}
            {showPacking && (
              <button
                type="button"
                data-testid={`po-packing-correction-${po.poNumber}`}
                onClick={() =>
                  correctionPoId === po.id ? setCorrectionPoId(null) : beginCorrection(po)
                }
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-200 bg-white text-[12px] font-medium text-zinc-700 hover:bg-zinc-50 whitespace-nowrap"
              >
                <Truck className="w-3.5 h-3.5" aria-hidden="true" />
                Packing differs
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setExpandedPoId(po.id);
                setContacting((c) =>
                  c?.id === po.id && c.mode === 'message' ? null : { id: po.id, mode: 'message' }
                );
              }}
              aria-label={`Message Mercenta about ${po.poNumber}`}
              className="p-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-950"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setExpandedPoId(po.id);
                setContacting((c) =>
                  c?.id === po.id && c.mode === 'call' ? null : { id: po.id, mode: 'call' }
                );
              }}
              aria-label={`Log call about ${po.poNumber}`}
              className="p-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-950"
            >
              <Phone className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
  ];

  if (isError) {
    return (
      <div>
        <PageHeader
          title="Purchase Orders"
          description="Review, accept, amend, or reject purchase orders from the UK retail network."
        />
        <ErrorStateBlock
          title="Unable to load purchase orders"
          message={errorMessage}
          onRetry={onRetry}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Review, accept, amend, or reject purchase orders from the UK retail network."
        meta={
          isLoading ? (
            <span>Loading order queue…</span>
          ) : (
            <>
              <span>
                Showing <strong className="font-mono text-zinc-950">{filteredPos.length}</strong> of{' '}
                <strong className="font-mono text-zinc-950">{pos.length}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Queue value{' '}
                <strong className="font-mono text-zinc-950">
                  £{queueValue.toLocaleString('en-GB')}
                </strong>
              </span>
            </>
          )
        }
        actions={
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `mercenta-pos-${tenantId ?? 'all'}.csv`,
                ['PO', 'Date', 'Status', 'Lines', 'Value GBP'],
                filteredPos.map((p) => [
                  p.poNumber,
                  orderDateLabel(p.orderDate),
                  poStatusPresentation(p.status).label,
                  p.lineItems.length,
                  p.poValue,
                ])
              )
            }
            className="px-3.5 py-2 rounded-md border border-zinc-300 bg-white text-[12px] font-medium text-zinc-900 hover:bg-zinc-50 whitespace-nowrap"
          >
            Export CSV
          </button>
        }
      />

      <MetricStrip items={metrics} loading={isLoading} columns={4} />

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PO number…"
              aria-label="Search purchase orders"
              className="pl-9 pr-3 py-1.5 text-[14px] border border-zinc-300 rounded-md bg-white text-zinc-950 w-56 focus:outline-2 focus:outline-[#C2410C]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="px-3 py-1.5 text-[14px] border border-zinc-300 rounded-md bg-white text-zinc-950 focus:outline-2 focus:outline-[#C2410C]"
          >
            <option value="all">Status: all</option>
            {PO_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {poStatusPresentation(s).label}
              </option>
            ))}
          </select>
        </div>

        <div className="inline-flex rounded-md border border-zinc-200 bg-white p-0.5 self-start sm:self-auto">
          {(['compact', 'comfortable'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setDensity(mode)}
              className={`px-3 py-1 text-[12px] font-medium rounded capitalize ${
                density === mode ? 'bg-zinc-950 text-white' : 'text-zinc-600 hover:text-zinc-950'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className="border border-blue-200 bg-blue-50/70 rounded-md px-4 py-3 text-[14px] text-zinc-900"
        >
          {notice}
        </div>
      )}

      {isLoading ? (
        <LoadingRows rows={5} label="Loading purchase orders…" />
      ) : (
        <ConsoleTable
          rows={filteredPos}
          columns={columns}
          rowKey={(po) => po.id}
          expandedKey={expandedPoId}
          onRowClick={(po) => setExpandedPoId((curr) => (curr === po.id ? null : po.id))}
          emptyTitle="No purchase orders match"
          emptyDescription={
            pos.length === 0
              ? 'No purchase orders have been issued for your brand yet.'
              : 'Clear search or status filters to view all purchase orders.'
          }
          emptyActionLabel={statusFilter !== 'all' || search ? 'Clear filters' : undefined}
          onEmptyAction={
            statusFilter !== 'all' || search
              ? () => {
                  setStatusFilter('all');
                  setSearch('');
                }
              : undefined
          }
          renderExpanded={(po) => {
            const canAct = poAcknowledgementWindow(po).inQueue;
            const canAmend = !canAct && poAmendmentWindow(po).open && po.status !== 'rejected';
            const draft = poOnBehalfRejectionDraft(po);
            const onBehalfDraft = draft.available ? draft : null;
            const list = instructionsByPoId.get(po.id) ?? [];
            const primaryInst = instructionFor(po.id);
            const correctionInst = list.find((i) => i.type === 'packing_correction');

            return (
              <div
                className={density === 'comfortable' ? 'space-y-5 py-2' : 'space-y-4'}
                data-density={density}
              >
                <ChannelRevisionNotice po={po} />
                <AckPriceNotice po={po} />
                <ChannelHoldNotice po={po} />
                <ImplicitRejectionNotice po={po} />
                <OnBehalfAuthorisationBlock
                  po={po}
                  onAuthorise={async (note) => {
                    const res = await onAuthoriseOnBehalf(po.id, note);
                    return res.notice;
                  }}
                  onWithdraw={async () => {
                    const res = await onWithdrawOnBehalf(po.id);
                    return res.notice;
                  }}
                />

                {contacting?.id === po.id && renderCommPanel && (
                  <div className="border border-zinc-200 bg-white rounded-md p-4">
                    {renderCommPanel(po)}
                  </div>
                )}

                {/* Inline Ack / Amend Panel */}
                {ackingPoId === po.id && (canAct || canAmend) && (
                  <div className="border border-zinc-300 bg-white rounded-md p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-[14px] font-semibold text-zinc-950">
                        {canAmend ? 'Amend line acknowledgements' : 'Line-item acknowledgement'}
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void handleAckSubmit(po)}
                          disabled={busyPoId === po.id}
                          className="px-3.5 py-1.5 rounded-md bg-[#C2410C] text-white text-[12px] font-medium hover:bg-[#9A3412] disabled:opacity-50"
                        >
                          {canAmend ? 'Submit amendment' : 'Submit acknowledgment'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAckingPoId(null)}
                          className="px-3 py-1.5 rounded-md border border-zinc-200 text-[12px] font-medium text-zinc-700 hover:bg-zinc-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    {canAmend && (
                      <p className="text-[12px] text-blue-800" data-testid={`po-amend-window-state-${po.poNumber}`}>
                        {PO_AMENDMENT_WINDOW_RULE_TEXT}
                      </p>
                    )}
                    <p className="text-[12px] text-zinc-600" data-testid={`po-ack-window-state-${po.poNumber}`}>
                      {poAcknowledgementWindow(po).reason}
                    </p>
                    <HoldDutyLine po={po} />
                    <SubmitCompletenessNotice po={po} lineAcks={lineAcks} />

                    <div className="divide-y divide-zinc-200 border border-zinc-200 rounded-md">
                      {po.lineItems.map((li) => {
                        const draftLine = lineAcks[li.sku];
                        if (!draftLine) return null;
                        const backOrderAllowed = canBackOrderLine(li);
                        return (
                          <div key={li.sku} className="p-3 flex flex-wrap items-center gap-3 text-[12px]">
                            <span className="font-mono font-semibold text-zinc-950 w-24">{li.sku}</span>
                            <span className="text-zinc-600 w-44 truncate">{li.productName}</span>
                            <select
                              value={draftLine.ackStatus}
                              data-testid={`po-ack-status-${li.sku}`}
                              data-backorder-allowed={backOrderAllowed ? 'true' : 'false'}
                              onChange={(e) =>
                                setLineAcks((prev) => ({
                                  ...prev,
                                  [li.sku]: {
                                    ...prev[li.sku],
                                    ackStatus: e.target.value as 'accepted' | 'rejected' | 'backordered',
                                  },
                                }))
                              }
                              className="px-2 py-1 border border-zinc-300 rounded bg-white text-zinc-950"
                            >
                              <option value="accepted">Accepted</option>
                              {backOrderAllowed && <option value="backordered">Backordered</option>}
                              <option value="rejected">Rejected</option>
                            </select>
                            {!backOrderAllowed && (
                              <span className="text-[11px] text-zinc-500" data-testid={`po-backorder-blocked-${li.sku}`}>
                                {backOrderAvailabilityLabel(li)}
                              </span>
                            )}
                            {draftLine.ackStatus !== 'rejected' && (
                              <>
                                <label className="flex items-center gap-1 text-zinc-600">
                                  Qty
                                  <input
                                    type="number"
                                    min={1}
                                    max={li.quantity}
                                    value={draftLine.acknowledgedQty}
                                    onChange={(e) =>
                                      setLineAcks((prev) => ({
                                        ...prev,
                                        [li.sku]: {
                                          ...prev[li.sku],
                                          acknowledgedQty: Number(e.target.value),
                                        },
                                      }))
                                    }
                                    className="w-16 px-2 py-1 border border-zinc-300 rounded bg-white text-zinc-950 font-mono"
                                  />
                                  <span className="font-mono">/ {li.quantity}</span>
                                </label>
                                <label className="flex items-center gap-1 text-zinc-600">
                                  Unit £
                                  <input
                                    type="number"
                                    min={0.01}
                                    step={0.01}
                                    value={draftLine.unitPrice ?? li.unitPrice}
                                    onChange={(e) =>
                                      setLineAcks((prev) => ({
                                        ...prev,
                                        [li.sku]: {
                                          ...prev[li.sku],
                                          unitPrice: Number(e.target.value),
                                        },
                                      }))
                                    }
                                    className="w-20 px-2 py-1 border border-zinc-300 rounded bg-white text-zinc-950 font-mono"
                                  />
                                </label>
                              </>
                            )}
                            {draftLine.ackStatus === 'backordered' && (
                              <label className="flex items-center gap-1 text-zinc-600">
                                Ship by
                                <input
                                  type="date"
                                  value={draftLine.scheduledShipDate ?? ''}
                                  onChange={(e) =>
                                    setLineAcks((prev) => ({
                                      ...prev,
                                      [li.sku]: {
                                        ...prev[li.sku],
                                        scheduledShipDate: e.target.value,
                                      },
                                    }))
                                  }
                                  className="px-2 py-1 border border-zinc-300 rounded bg-white text-zinc-950"
                                />
                              </label>
                            )}
                            {draftLine.ackStatus === 'rejected' && (
                              <select
                                value={draftLine.rejectionCode ?? ''}
                                onChange={(e) => {
                                  const code = e.target.value as PoRejectionCode | '';
                                  setLineAcks((prev) => ({
                                    ...prev,
                                    [li.sku]: {
                                      ...prev[li.sku],
                                      rejectionCode: code === '' ? undefined : code,
                                    },
                                  }));
                                }}
                                className="px-2 py-1 border border-zinc-300 rounded bg-white text-zinc-950"
                              >
                                <option value="">Rejection code…</option>
                                {PO_REJECTION_CODES.map((c) => (
                                  <option key={c} value={c}>
                                    {c.replace(/([A-Z])/g, ' $1').trim()}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* On-behalf rejection draft */}
                {onBehalfDraft && (
                  <div
                    className="border border-red-200 bg-red-50/70 rounded-md p-4 space-y-2"
                    data-testid={`po-onbehalf-draft-${po.poNumber}`}
                  >
                    <div className="text-[14px] font-semibold text-red-900">
                      Mercenta draft — required channel rejection
                    </div>
                    <p className="text-[12px] text-zinc-700">{onBehalfDraft.ruleText}</p>
                    <p className="text-[12px] text-zinc-700 font-mono">
                      Draft {onBehalfDraft.draftId} · reason {onBehalfDraft.rejectionCode}
                    </p>
                    <p className="text-[12px] text-amber-900">
                      {onBehalfDraft.brandMayStillDecide
                        ? 'You may still decide inside the 24-hour window, or approve this draft so Mercenta submits the rejection.'
                        : 'The 24-hour window has closed: acceptance is refused and rejection is required.'}
                    </p>
                    <button
                      type="button"
                      data-testid={`po-onbehalf-approve-${po.poNumber}`}
                      onClick={async () => {
                        const res = await onApproveOnBehalf(po, onBehalfDraft.draftId);
                        setNotice(res.notice);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-700 text-white text-[12px] font-medium hover:bg-red-800"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve — reject all lines on my behalf
                    </button>
                  </div>
                )}

                {po.onBehalfDraft?.approvedAt && (
                  <p className="text-[12px] text-zinc-600" data-testid={`po-onbehalf-approved-${po.poNumber}`}>
                    On-behalf rejection draft <span className="font-mono">{po.onBehalfDraft.id}</span> approved by{' '}
                    {po.onBehalfDraft.approvedBy} at {new Date(po.onBehalfDraft.approvedAt).toLocaleString('en-GB')}
                    {po.onBehalfDraft.approvedByAdmin ? ' (Mercenta admin override)' : ''} · reason{' '}
                    {po.onBehalfDraft.rejectionCode}
                  </p>
                )}

                {/* Mercenta channel instruction outcome */}
                {primaryInst && (
                  <div
                    className="border border-zinc-200 bg-white rounded-md p-4 space-y-1.5 text-[12px]"
                    data-testid={`po-mercenta-status-${po.poNumber}`}
                  >
                    <div className="font-semibold text-zinc-950">
                      Mercenta channel action — you are not required to file anything
                    </div>
                    {primaryInst.state === 'pending_mercenta_action' && (
                      <p className="text-amber-800">Pending — Mercenta is submitting the acknowledgement to the retail channel.</p>
                    )}
                    {primaryInst.state === 'refused' && (
                      <p className="text-red-800">
                        Mercenta could not complete the channel action: {primaryInst.outcome?.refusedReason ?? 'reason not recorded'}.
                      </p>
                    )}
                    {primaryInst.outcome?.channelAcknowledgement?.ok && (
                      <p className="text-zinc-800">
                        Acknowledgement transmitted — {primaryInst.outcome.channelAcknowledgement.acknowledgementId} ·{' '}
                        {primaryInst.outcome.channelAcknowledgement.status}
                        {primaryInst.outcome.channelAcknowledgement.mode === 'mock' ? ' · simulated (no live call)' : ''}
                      </p>
                    )}
                    {primaryInst.outcome?.routingRequest && (
                      <p className="text-zinc-800">
                        {primaryInst.outcome.routingRequest.raised
                          ? `Routing request raised — ${primaryInst.outcome.routingRequest.reference} · ${routingCarrierLabel(primaryInst.outcome.routingRequest)}`
                          : `Routing request not applicable — ${primaryInst.outcome.routingRequest.reference}`}
                      </p>
                    )}
                    {primaryInst.outcome?.asn && (
                      <p className="text-zinc-800">
                        {primaryInst.outcome.asn.filed
                          ? `ASN filed — ${primaryInst.outcome.asn.reference}${primaryInst.outcome.asn.shipmentId ? ` · consignment ${primaryInst.outcome.asn.shipmentId}` : ''}`
                          : `ASN — ${primaryInst.outcome.asn.note ?? 'not filed'}`}
                      </p>
                    )}
                    {correctionInst && correctionInst !== primaryInst && (
                      <p className="text-zinc-800">
                        {correctionInst.outcome?.asn?.filed
                          ? `Packing correction recorded — ASN filed (${correctionInst.outcome.asn.reference}).`
                          : correctionInst.outcome?.refusedReason
                            ? `Packing correction refused: ${correctionInst.outcome.refusedReason}`
                            : 'Packing correction recorded — Mercenta is acting on it.'}
                      </p>
                    )}
                  </div>
                )}

                {/* Packing correction panel */}
                {correctionPoId === po.id && (
                  <div className="border border-zinc-300 bg-white rounded-md p-4 space-y-3">
                    <p className="text-[12px] text-zinc-700">
                      State actual packed quantities so Mercenta re-files the ASN. You do not file the ASN or select a carrier.
                    </p>
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500">
                          <th className="text-left py-1.5">SKU</th>
                          <th className="text-right py-1.5">Acknowledged</th>
                          <th className="text-right py-1.5">Packed qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {po.lineItems
                          .filter((l) => l.ackStatus !== 'rejected')
                          .map((l) => (
                            <tr key={l.sku}>
                              <td className="py-2 font-mono text-zinc-800">{l.sku}</td>
                              <td className="py-2 text-right font-mono text-zinc-600">
                                {l.acknowledgedQty ?? l.quantity}
                              </td>
                              <td className="py-2 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  max={l.acknowledgedQty ?? l.quantity}
                                  value={correctionCartons[l.sku] ?? 0}
                                  onChange={(e) =>
                                    setCorrectionCartons((prev) => ({
                                      ...prev,
                                      [l.sku]: Number(e.target.value),
                                    }))
                                  }
                                  className="w-20 px-2 py-1 border border-zinc-300 rounded text-right font-mono"
                                />
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    <input
                      type="text"
                      value={correctionNote}
                      onChange={(e) => setCorrectionNote(e.target.value)}
                      placeholder="Note for Mercenta (optional)"
                      aria-label="Packing correction note"
                      className="w-full px-3 py-1.5 text-[14px] border border-zinc-300 rounded-md"
                    />
                    <RoutingRequestStatus
                      poFreightTerm={po.freightTerm}
                      shipWindowEnd={po.shipWindowEnd}
                      routing={primaryInst?.outcome?.routingRequest}
                    />
                    <ShippingCostEstimate
                      carrier={(po.freightTerm === 'collect' ? 'amazon_partner' : 'dhl') as 'dhl'}
                      totalWeightKg={po.lineItems.reduce(
                        (s, l) => s + (l.acknowledgedQty ?? l.quantity) * 0.4,
                        0
                      )}
                      totalCbm={po.lineItems.length * 0.05}
                      cartonCount={po.lineItems.filter((l) => l.ackStatus !== 'rejected').length}
                      compact
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleCorrectionSubmit(po)}
                        disabled={busyPoId === po.id}
                        className="px-3.5 py-1.5 rounded-md bg-[#C2410C] text-white text-[12px] font-medium hover:bg-[#9A3412]"
                      >
                        Send packing correction to Mercenta
                      </button>
                      <button
                        type="button"
                        onClick={() => setCorrectionPoId(null)}
                        className="px-3 py-1.5 rounded-md border border-zinc-200 text-[12px] font-medium text-zinc-700"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {/* Line items & History table */}
                <div className="border border-zinc-200 bg-white rounded-md overflow-hidden">
                  <table className="w-full text-[12px]">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium uppercase tracking-[0.06em]">SKU</th>
                        <th className="text-left px-3 py-2 font-medium uppercase tracking-[0.06em]">Product</th>
                        <th className="text-right px-3 py-2 font-medium uppercase tracking-[0.06em]">Qty</th>
                        <th className="text-right px-3 py-2 font-medium uppercase tracking-[0.06em]">Unit</th>
                        <th className="text-right px-3 py-2 font-medium uppercase tracking-[0.06em]">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {po.lineItems.map((li) => (
                        <tr key={li.sku}>
                          <td className="px-3 py-2 font-mono text-zinc-700">{li.sku}</td>
                          <td className="px-3 py-2 text-zinc-950">{li.productName}</td>
                          <td className="px-3 py-2 text-right font-mono">{li.quantity}</td>
                          <td className="px-3 py-2 text-right font-mono">£{li.unitPrice.toFixed(2)}</td>
                          <td className="px-3 py-2 text-right font-mono">£{(li.quantity * li.unitPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {po.lineItems.some((l) => l.ackStatus === 'backordered' && l.backorderRestockDeadline) && (
                  <div className="border border-amber-200 bg-amber-50/70 rounded-md p-3 text-[12px] space-y-1">
                    <div className="font-semibold text-amber-900">{BACKORDER_RESTOCK_TARGET.heading}</div>
                    {po.lineItems
                      .filter((l) => l.ackStatus === 'backordered' && l.backorderRestockDeadline)
                      .map((l) => {
                        const deadline = new Date(`${l.backorderRestockDeadline}T00:00:00Z`);
                        const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / 86400000);
                        return (
                          <div key={l.sku} className="flex justify-between font-mono">
                            <span>{l.sku}</span>
                            <span>
                              {daysLeft <= 0
                                ? BACKORDER_RESTOCK_TARGET.overdueLabel
                                : `${daysLeft} day(s) to target (${deadline.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })})`}
                            </span>
                          </div>
                        );
                      })}
                    <p className="text-zinc-600">{BACKORDER_RESTOCK_TARGET.attributionNote}</p>
                  </div>
                )}

                {po.lineItems.some((l) => l.ackHistory && l.ackHistory.length > 0) && (
                  <div className="border border-zinc-200 bg-white rounded-md p-3 space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
                      Acknowledgment History
                    </div>
                    <table className="w-full text-[12px]">
                      <thead className="border-b border-zinc-200 text-zinc-500">
                        <tr>
                          <th className="text-left py-1">SKU</th>
                          <th className="text-left py-1">Date</th>
                          <th className="text-left py-1">Status</th>
                          <th className="text-right py-1">Qty</th>
                          <th className="text-right py-1">£/u</th>
                          <th className="text-left py-1">Code</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {po.lineItems
                          .filter((l) => l.ackHistory && l.ackHistory.length > 0)
                          .flatMap((l) =>
                            l.ackHistory!.map((h) => {
                              const ackPres = ackStatusPresentation(h.ackStatus);
                              return (
                                <tr key={`${l.sku}-${h.acknowledgedAt}`}>
                                  <td className="py-1.5 font-mono">{l.sku}</td>
                                  <td className="py-1.5 font-mono text-zinc-600">{h.acknowledgedAt.slice(0, 16).replace('T', ' ')}</td>
                                  <td className="py-1.5">
                                    <InlineStatus label={ackPres.label} tone={mapStatusTone(ackPres.tone)} dataStatus={ackPres.dataStatus} />
                                  </td>
                                  <td className="py-1.5 text-right font-mono">{h.acknowledgedQty}</td>
                                  <td className="py-1.5 text-right font-mono">£{h.unitPrice.toFixed(2)}</td>
                                  <td className="py-1.5 text-zinc-600">{h.rejectionCode ?? '—'}</td>
                                </tr>
                              );
                            })
                          )}
                      </tbody>
                    </table>
                  </div>
                )}

                {isFinancedBrand && (po.status === 'accepted' || po.status === 'ready_to_fulfil') && (
                  <div className="border border-emerald-200 bg-emerald-50/70 rounded-md p-3 text-[12px] text-emerald-900">
                    Accepted — Mercenta handles fulfilment and financing for this purchase order. Payouts follow your financed payment terms.
                  </div>
                )}
                {!isFinancedBrand && po.status === 'accepted' && (
                  <div className="border border-blue-200 bg-blue-50/70 rounded-md p-3 text-[12px] text-blue-900">
                    {fulfillmentTrackLabel('direct_fulfillment')} — Mercenta raises the shipment request and files the ASN. Ship on time or submit a packing correction if physical counts differ.
                  </div>
                )}
              </div>
            );
          }}
          testId="brand-po-table"
        />
      )}

      {simulationFooter && <div className="pt-2">{simulationFooter}</div>}

      {/* Preview Slide-Over Drawer */}
      <SlideOverDrawer
        open={previewRecord !== null}
        onClose={() => setPreviewPoId(null)}
        title={previewRecord?.poNumber ?? ''}
        subtitle={previewRecord ? poStatusPresentation(previewRecord.status).label : undefined}
        testId="brand-po-record-drawer"
        footer={
          previewRecord ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12px] text-zinc-500">
                {previewRecord.simulated === true ? 'Operational simulation record' : 'Recorded purchase order'}
              </span>
              <div className="flex items-center gap-2">
                {poAcknowledgementWindow(previewRecord).inQueue && (
                  <button
                    type="button"
                    data-state="brand-po-drawer-acknowledge"
                    onClick={() => {
                      beginAck(previewRecord);
                      setPreviewPoId(null);
                    }}
                    className="px-3.5 py-1.5 rounded-md bg-[#C2410C] text-white text-[12px] font-medium hover:bg-[#9A3412]"
                  >
                    Acknowledge
                  </button>
                )}
                <button
                  type="button"
                  data-state="brand-po-drawer-open-record"
                  onClick={() => {
                    setExpandedPoId(previewRecord.id);
                    setPreviewPoId(null);
                  }}
                  className="px-3.5 py-1.5 rounded-md border border-zinc-300 bg-white text-zinc-900 text-[12px] font-medium hover:bg-zinc-50"
                >
                  Open full record
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        {previewRecord && <BrandPoPreviewBody po={previewRecord} />}
      </SlideOverDrawer>
    </div>
  );
}

function AckDeadlineText({ po }: { po: PurchaseOrder }) {
  const win = poAcknowledgementWindow(po);
  if (win.channelState === 'acknowledged' || win.channelState === 'closed') return null;
  if (win.channelState === 'unknown' || win.hoursLeft === null) {
    return (
      <div className="text-[11px] text-zinc-500" title={win.reason}>
        Ack window unreadable
      </div>
    );
  }
  const ack = ackDeadlinePresentation(win.hoursLeft);
  return (
    <div title={win.reason}>
      <InlineStatus
        label={`${ack.label}${win.onBehalfAvailable ? ' · closing window' : ''}`}
        tone={mapStatusTone(ack.tone)}
        dataStatus={ack.dataStatus}
      />
    </div>
  );
}

function ChannelRevisionNotice({ po }: { po: PurchaseOrder }) {
  const state = poRevisionState(po);
  if (state.revisionNumber === 0) return null;
  const latest = state.latest;
  return (
    <div className="border border-blue-200 bg-blue-50/70 rounded-md p-3 text-[12px] space-y-1" data-testid={`po-revision-notice-${po.poNumber}`}>
      <p className="font-medium text-blue-900">
        The retail channel changed this purchase order — version {state.revisionNumber}.
      </p>
      {state.channelCancelled && (
        <p className="text-red-800 font-medium">The retail channel cancelled this order.</p>
      )}
      {latest && latest.changes.length > 0 && (
        <ul className="space-y-0.5 text-blue-800">
          {latest.changes.map((c, idx) => (
            <li key={`${c.kind}-${c.subject}-${idx}`}>
              {PO_CHANNEL_CHANGE_KIND_LABELS[c.kind]} — {c.detail}
            </li>
          ))}
        </ul>
      )}
      {state.acknowledgementStale && (
        <p className="text-amber-900">
          Your acknowledgement answers an earlier version of this order and must be updated before shipping.
        </p>
      )}
      <p className="text-zinc-600">{PO_REVISION_RULE_TEXT}</p>
    </div>
  );
}

function AckPriceNotice({ po }: { po: PurchaseOrder }) {
  const divergences = ackPriceDivergences(po);
  if (divergences.length === 0) return null;
  return (
    <div className="border border-amber-200 bg-amber-50/70 rounded-md p-3 text-[12px] space-y-1" data-testid={`ack-price-notice-${po.poNumber}`}>
      <p className="font-medium text-amber-900">{ACK_PRICE_DISCREPANCY_TITLE}</p>
      <ul className="space-y-0.5 text-amber-800">
        {divergences.map((d) => (
          <li key={d.sku}>
            {d.sku}: PO £{d.poUnitPrice.toFixed(2)} → acknowledged £{d.acknowledgedUnitPrice.toFixed(2)}
          </li>
        ))}
      </ul>
      <p className="text-zinc-600">{ACK_INVOICE_PRICE_RULE_TEXT}</p>
    </div>
  );
}

function ChannelHoldNotice({ po }: { po: PurchaseOrder }) {
  const duty = poChannelHoldDuty(po);
  if (!po.channelHold) return null;
  return (
    <div className="border border-amber-200 bg-amber-50/70 rounded-md p-3 text-[12px] space-y-1" data-testid={`po-channel-hold-${po.poNumber}`}>
      <p className="font-medium text-zinc-900">
        {duty.held ? 'Retail channel hold: this order is on hold' : 'Retail channel hold lifted'}
      </p>
      <p className="text-zinc-700">{duty.statement}</p>
      <p className="text-zinc-600">{duty.ruleText}</p>
    </div>
  );
}

function ImplicitRejectionNotice({ po }: { po: PurchaseOrder }) {
  const lines = po.implicitlyRejectedLines ?? [];
  if (lines.length === 0) return null;
  return (
    <div className="border border-amber-200 bg-amber-50/70 rounded-md p-3 text-[12px] space-y-1" data-testid={`po-implicit-rejections-${po.poNumber}`}>
      <p className="font-medium text-amber-900">
        The acknowledgement omitted {lines.length} of {po.lineItems.length} lines
      </p>
      <ul className="text-amber-800">
        {lines.map((sku) => (
          <li key={sku}>{sku} — rejected because omitted</li>
        ))}
      </ul>
      <p className="text-zinc-600">{PO_ACK_COMPLETENESS_RULE_TEXT}</p>
    </div>
  );
}

function OnBehalfAuthorisationBlock({
  po,
  onAuthorise,
  onWithdraw,
}: {
  po: PurchaseOrder;
  onAuthorise: (note: string) => Promise<string>;
  onWithdraw: () => Promise<string>;
}) {
  const authority = poOnBehalfAuthority(po);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (authority.closingWindow || authority.pastLimit) return null;

  return (
    <div className="border border-zinc-200 bg-white rounded-md p-3 text-[12px] space-y-2" data-testid={`po-on-behalf-authorisation-${po.poNumber}`}>
      <p className="font-medium text-zinc-900">
        Mercenta deciding this order for you: {authority.stateLabel}
      </p>
      <p className="text-zinc-600">{authority.statement}</p>
      {authority.state !== 'granted' ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Say what Mercenta may do (your own words)"
            aria-label="On-behalf instruction"
            className="min-w-[220px] flex-1 px-2.5 py-1.5 border border-zinc-300 rounded text-[12px]"
          />
          <button
            type="button"
            disabled={busy || !note.trim()}
            onClick={async () => {
              setBusy(true);
              setFeedback(await onAuthorise(note));
              setBusy(false);
            }}
            className="px-3 py-1.5 rounded bg-zinc-950 text-white font-medium disabled:opacity-40"
          >
            Authorise Mercenta
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setFeedback(await onWithdraw());
            setBusy(false);
          }}
          className="px-3 py-1.5 rounded border border-zinc-300 bg-white text-zinc-800 font-medium"
        >
          Withdraw authorisation
        </button>
      )}
      {feedback && <p className="text-zinc-800 font-medium">{feedback}</p>}
    </div>
  );
}

function HoldDutyLine({ po }: { po: PurchaseOrder }) {
  const duty = poChannelHoldDuty(po);
  return (
    <p className="text-[12px] text-amber-900" data-testid={`po-hold-duty-${po.poNumber}`}>
      {duty.statement} {duty.ruleText}
    </p>
  );
}

function SubmitCompletenessNotice({
  po,
  lineAcks,
}: {
  po: PurchaseOrder;
  lineAcks: Record<string, { ackStatus: string }>;
}) {
  const verdict = poAcknowledgementCompleteness(
    po,
    Object.entries(lineAcks).map(([sku, a]) => ({ sku, ackStatus: a.ackStatus }))
  );
  return (
    <p
      className={`text-[12px] ${verdict.statement ? 'text-amber-900' : 'text-zinc-500'}`}
      data-testid={`po-submit-completeness-${po.poNumber}`}
    >
      {verdict.statement ?? verdict.ruleText}
    </p>
  );
}

function BrandPoPreviewBody({ po }: { po: PurchaseOrder }) {
  const status = poStatusPresentation(po.status);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <InlineStatus label={status.label} tone={mapStatusTone(status.tone)} dataStatus={status.dataStatus} />
        <AckDeadlineText po={po} />
      </div>
      <ChannelRevisionNotice po={po} />
      <AckPriceNotice po={po} />
      <ChannelHoldNotice po={po} />
      <ImplicitRejectionNotice po={po} />
      <dl className="grid grid-cols-2 gap-3 text-[12px] border border-zinc-200 rounded-md p-3">
        <div>
          <dt className="text-zinc-500">Order date</dt>
          <dd className="font-mono text-zinc-950 mt-0.5">{orderDateLabel(po.orderDate)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Order value</dt>
          <dd className="font-mono font-semibold text-zinc-950 mt-0.5">£{po.poValue.toLocaleString('en-GB')}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Freight term</dt>
          <dd className="text-zinc-950 mt-0.5">
            {po.freightTerm === 'collect' ? 'Freight Collect' : po.freightTerm === 'prepaid' ? 'Freight Prepaid' : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Carrier route</dt>
          <dd className="text-zinc-950 mt-0.5">{shipCarrierLabel(selectCarrierForShipment({}).carrier)}</dd>
        </div>
      </dl>
      {po.rejectionReason && (
        <div className="border border-red-200 bg-red-50/70 rounded-md p-3 text-[12px] text-red-900">
          <strong>Rejection reason:</strong> {po.rejectionReason}
        </div>
      )}
      <div className="border border-zinc-200 rounded-md overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
            <tr>
              <th className="text-left px-3 py-2">SKU</th>
              <th className="text-left px-3 py-2">Product</th>
              <th className="text-right px-3 py-2">Qty</th>
              <th className="text-left px-3 py-2">Ack</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {po.lineItems.map((line) => {
              const ack = ackStatusPresentation(line.ackStatus);
              return (
                <tr key={line.sku}>
                  <td className="px-3 py-2 font-mono">{line.sku}</td>
                  <td className="px-3 py-2">{line.productName}</td>
                  <td className="px-3 py-2 text-right font-mono">{line.quantity}</td>
                  <td className="px-3 py-2">
                    <InlineStatus label={ack.label} tone={mapStatusTone(ack.tone)} dataStatus={ack.dataStatus} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
