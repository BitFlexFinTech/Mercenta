import { useState } from 'react';
import {
  ConsoleTable,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  SlideOverDrawer,
  type ConsoleColumn,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';
import { ConsolePageHeader } from '@/next/components/ConsolePageHeader';
import { NoticeBanner, SectionCard, formatGbp } from '@/next/components/ConsoleCharts';

export interface PipelineSubmissionRow {
  id: string;
  productName: string;
  sku: string;
  asin?: string;
  submittedAt: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  simulated: boolean;
  superseded: boolean;
  rejectionReason?: string;
}

export interface PipelinePoRow {
  id: string;
  poNumber: string;
  brandName: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  poValue: number;
  commissionAmount: number;
  billingDecisionLabel: string;
  billingDecisionTone: SemanticTone;
  simulated: boolean;
  eligibleForReconcile: boolean;
  lineItems: {
    sku: string;
    productName: string;
    quantity: number;
    acknowledgedQty: number;
    unitCost: number;
  }[];
}

export interface PipelineDeductionRow {
  id: string;
  date: string;
  brandName: string;
  purchaseOrderId: string;
  typeLabel: string;
  reason: string;
  disputeOpenedAt?: string;
  disputeNotes?: string;
  disputeOutcome?: string;
  status: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  amountGbp: number;
  simulated: boolean;
}

export interface SimulatedPoControlRow {
  id: string;
  poNumber: string;
  brandId: string;
  status: string;
  poValue: number;
  receivingLabel: string;
  receivingTone: 'success' | 'warning' | 'neutral';
  invoiceNumber?: string;
  invoiceStatus?: string;
  invoiceTermsLabel?: string;
  cancelledInvoiceNote?: string;
  canAck: boolean;
  canFulfil: boolean;
  canReceive: boolean;
  canIssueInvoice: boolean;
  canRecordPayment: boolean;
  activeInvoiceId?: string;
}

export interface ChannelReceivingReadingRow {
  poId: string;
  channelPurchaseOrderId: string;
  channelStatusLabel: string;
  mercentaStatusLabel: string;
  unitsReceived: number;
  differs: boolean;
  simulated: boolean;
  ackSummary?: string;
  ackAtRisk?: boolean;
  asnSummary?: string;
  asnExposed?: boolean;
  pickupSummary?: string;
  pickupAtRisk?: boolean;
}

export interface RetailPipelineViewProps {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  marketplaceId: string;
  canMutate: boolean;
  submissions: PipelineSubmissionRow[];
  purchaseOrders: PipelinePoRow[];
  deductions: PipelineDeductionRow[];
  selectedPo: PipelinePoRow | null;
  onSelectPo: (po: PipelinePoRow | null) => void;
  disputingId: string | null;
  onDisputingIdChange: (id: string | null) => void;
  onOpenDispute: (id: string, notes: string) => Promise<void>;
  onCloseDispute: (id: string, outcome: 'won' | 'lost' | 'partial') => Promise<void>;
  onReconcileDelivery: (poId: string, received: Record<string, number>) => {
    ok: boolean;
    message: string;
  };
  simulatedPos: SimulatedPoControlRow[];
  termChoice: Record<string, 14 | 30 | 60>;
  onTermChoiceChange: (poId: string, days: 14 | 30 | 60) => void;
  onSimPoAction: (
    poId: string,
    action: 'ack' | 'fulfil' | 'receive' | 'issue_invoice' | 'pay' | 'cancel_invoice' | 'open_case',
    reason?: string
  ) => void;
  commerceNotice: string | null;
  commerceError: string | null;
  activityCount: number;
  invoiceRules: string[];
  receivingAutomationLines: string[];
  onReadChannelReceiving: () => Promise<void>;
  channelReceivingBusy: boolean;
  channelReceivingModeLabel: string | null;
  channelReadings: ChannelReceivingReadingRow[];
  onApplyChannelReading: (poId: string) => void;
  routingRows: { instructionId: string; poNumber: string; reqId: string; arn?: string; result?: string }[];
  onRefreshRouting: (instructionId: string, poNumber: string) => Promise<void>;
  invoiceSubmitRows: { id: string; number: string; poNumber: string; subtotalGbp: number; result?: string }[];
  onSendInvoiceToChannel: (invoiceId: string, invoiceNumber: string) => Promise<void>;
  channelLabelsRule: { available: boolean; reason: string; ruleLabel: string; source: string };
}

export function RetailPipelineView({
  loading,
  error,
  onRetry,
  marketplaceId,
  canMutate,
  submissions,
  purchaseOrders,
  deductions,
  selectedPo,
  onSelectPo,
  disputingId,
  onDisputingIdChange,
  onOpenDispute,
  onCloseDispute,
  onReconcileDelivery,
  simulatedPos,
  termChoice,
  onTermChoiceChange,
  onSimPoAction,
  commerceNotice,
  commerceError,
  activityCount,
  invoiceRules,
  receivingAutomationLines,
  onReadChannelReceiving,
  channelReceivingBusy,
  channelReceivingModeLabel,
  channelReadings,
  onApplyChannelReading,
  routingRows,
  onRefreshRouting,
  invoiceSubmitRows,
  onSendInvoiceToChannel,
  channelLabelsRule,
}: RetailPipelineViewProps) {
  const [disputeNotes, setDisputeNotes] = useState('');
  const [reconcilePoId, setReconcilePoId] = useState('');
  const [receivedDraft, setReceivedDraft] = useState<Record<string, number>>({});
  const [reconcileResult, setReconcileResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [cancelReasonDraft, setCancelReasonDraft] = useState<Record<string, string>>({});

  const eligibleForReconcile = purchaseOrders.filter((p) => p.eligibleForReconcile);
  const activeReconcilePo = eligibleForReconcile.find((p) => p.id === reconcilePoId) ?? null;

  const deductionCols: ConsoleColumn<PipelineDeductionRow>[] = [
    { key: 'date', header: 'Date', render: (d) => <span className="font-mono text-[12px]">{d.date}</span> },
    { key: 'brand', header: 'Brand', render: (d) => <span className="text-ink-900">{d.brandName}</span> },
    { key: 'po', header: 'PO', render: (d) => <span className="font-mono text-[12px]">{d.purchaseOrderId}</span> },
    {
      key: 'type',
      header: 'Type',
      mobilePrimary: true,
      render: (d) => (
        <span className="capitalize">
          {d.typeLabel}
          {d.simulated ? ' (sim)' : ''}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (d) => (
        <div className="text-[12px]">
          <div className="text-ink-800">{d.reason}</div>
          {d.disputeNotes && (
            <div className="mt-1 text-faint">
              Disputed {d.disputeOpenedAt}: {d.disputeNotes}
              {d.disputeOutcome ? ` → ${d.disputeOutcome}` : ''}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => <InlineStatus label={d.statusLabel} tone={d.statusTone} />,
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      render: (d) => <span className="font-mono text-ink-950">−{formatGbp(d.amountGbp, 2)}</span>,
    },
    {
      key: 'actions',
      header: 'Dispute',
      align: 'right',
      render: (d) => (
        <div className="inline-flex flex-wrap justify-end gap-1.5">
          {d.status === 'open' && (
            <button
              type="button"
              onClick={() => {
                onDisputingIdChange(d.id);
                setDisputeNotes('');
              }}
              className="text-[12px] font-medium text-[var(--mr-accent)] hover:underline"
            >
              Dispute
            </button>
          )}
          {d.status === 'disputed' && !d.disputeOutcome && (
            <>
              {(['won', 'partial', 'lost'] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => void onCloseDispute(d.id, o)}
                  className="px-2 py-0.5 rounded border border-hairline text-[11px] capitalize text-secondary hover:bg-surface"
                >
                  {o}
                </button>
              ))}
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        title="Retail Pipeline"
        description={`Marketplace ${marketplaceId} · catalog submissions, commission board, delivery reconciliation, deductions, and channel operations.`}
        meta={
          <>
            <span className="font-mono">{submissions.length} submissions</span>
            <span className="font-mono">{purchaseOrders.length} POs</span>
            <span className="font-mono">{deductions.length} deductions</span>
          </>
        }
      />

      {error && <ErrorStateBlock message={error} onRetry={onRetry} />}

      {loading ? (
        <LoadingRows rows={6} label="Loading retail pipeline…" />
      ) : (
        <>
          <SectionCard title="Catalog submissions">
            {submissions.length === 0 ? (
              <p className="text-[13px] text-faint">No catalog submissions recorded yet.</p>
            ) : (
              <ul className="divide-y divide-hairline-06">
                {submissions.map((sub) => (
                  <li key={sub.id} className="py-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-ink-950">{sub.productName}</div>
                      <div className="text-[12px] font-mono text-faint">
                        {sub.sku}
                        {sub.asin ? ` · ASIN ${sub.asin}` : ''} · submitted {sub.submittedAt}
                      </div>
                      {sub.rejectionReason && (
                        <p className="mt-1 text-[12px] text-state-danger">
                          {sub.rejectionReason} — Needs human review.
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {sub.superseded && (
                        <span className="text-[11px] font-mono text-quiet">superseded</span>
                      )}
                      <InlineStatus
                        label={`${sub.statusLabel}${sub.simulated ? ' (sim)' : ''}`}
                        tone={sub.statusTone}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Purchase orders — commission board">
            {purchaseOrders.length === 0 ? (
              <p className="text-[13px] text-faint">No purchase orders on record.</p>
            ) : (
              <ul className="divide-y divide-hairline-06">
                {purchaseOrders.map((po) => (
                  <li key={po.id} className="py-2.5 flex flex-wrap items-center justify-between gap-3 text-[13px]">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-medium text-ink-950">{po.poNumber}</span>
                      {po.simulated && <span className="font-mono text-[11px] text-faint">(sim)</span>}
                      <span className="text-ink-600">{po.brandName}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                      <InlineStatus label={po.statusLabel} tone={po.statusTone} />
                      <span className="font-mono text-ink-900">{formatGbp(po.poValue)}</span>
                      <InlineStatus label={po.billingDecisionLabel} tone={po.billingDecisionTone} />
                      <button
                        type="button"
                        onClick={() => onSelectPo(po)}
                        className="text-[12px] font-medium text-[var(--mr-accent)] hover:underline"
                      >
                        Inspect
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Delivery reconciliation — received vs confirmed"
            description="Record what the retail channel actually logged per SKU. Shortfalls against confirmed quantities raise shortage deductions automatically."
          >
            {eligibleForReconcile.length === 0 ? (
              <p className="text-[13px] text-faint">No POs awaiting delivery reconciliation.</p>
            ) : (
              <div className="space-y-4">
                <select
                  value={reconcilePoId}
                  onChange={(e) => {
                    setReconcilePoId(e.target.value);
                    setReceivedDraft({});
                    setReconcileResult(null);
                  }}
                  className="rounded border border-hairline-strong bg-surface-raised px-2.5 py-1.5 text-[13px]"
                >
                  <option value="">Select a PO…</option>
                  {eligibleForReconcile.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.poNumber} · {formatGbp(p.poValue)} · {p.statusLabel}
                    </option>
                  ))}
                </select>

                {activeReconcilePo && (
                  <div className="space-y-2">
                    {activeReconcilePo.lineItems.map((li) => (
                      <div key={li.sku} className="flex flex-wrap items-center gap-3 text-[13px]">
                        <span className="font-mono w-24 truncate text-ink-950">{li.sku}</span>
                        <span className="w-56 truncate text-ink-600">{li.productName}</span>
                        <span className="font-mono text-[12px] text-faint">
                          Confirmed {li.acknowledgedQty || '—'}
                        </span>
                        <input
                          type="number"
                          min={0}
                          disabled={!canMutate}
                          placeholder="Received"
                          value={receivedDraft[li.sku] ?? ''}
                          onChange={(e) =>
                            setReceivedDraft((prev) => ({ ...prev, [li.sku]: Number(e.target.value) }))
                          }
                          className="w-28 rounded border border-hairline-strong px-2 py-1 font-mono text-[12px]"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      disabled={!canMutate}
                      onClick={() => setReconcileResult(onReconcileDelivery(activeReconcilePo.id, receivedDraft))}
                      className="px-3.5 py-1.5 rounded bg-ink-950 text-on-dark text-[12px] font-medium hover:bg-ink-800 disabled:opacity-40"
                    >
                      Record delivery & reconcile
                    </button>
                  </div>
                )}

                {reconcileResult && (
                  <NoticeBanner
                    tone={reconcileResult.ok ? 'success' : 'warning'}
                    message={reconcileResult.message}
                  />
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Deductions & chargebacks">
            <ConsoleTable
              rows={deductions}
              columns={deductionCols}
              rowKey={(d) => d.id}
              emptyTitle="No deductions posted"
              emptyDescription="No chargeback or shortage deductions have been raised."
              testId="deductions-chargebacks"
            />
            {disputingId && (
              <div className="mt-4 border border-hairline rounded bg-surface p-4 space-y-2">
                <div className="text-[12px] font-semibold text-ink-950">
                  Open dispute for {disputingId}
                </div>
                <textarea
                  value={disputeNotes}
                  onChange={(e) => setDisputeNotes(e.target.value)}
                  rows={2}
                  placeholder="Evidence / grounds for the dispute…"
                  className="w-full rounded border border-hairline-strong bg-surface-raised px-3 py-2 text-[13px]"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!disputeNotes.trim()}
                    onClick={async () => {
                      await onOpenDispute(disputingId, disputeNotes);
                      setDisputeNotes('');
                    }}
                    className="px-3.5 py-1.5 rounded bg-ink-950 text-on-dark text-[12px] font-medium disabled:opacity-40"
                  >
                    Record dispute
                  </button>
                  <button
                    type="button"
                    onClick={() => onDisputingIdChange(null)}
                    className="px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title={`Operational commerce (sim) · ${activityCount} ledger step(s)`}
            description="Simulated PO lifecycle transitions, receipt-driven invoice generation, and append-only invoice numbers."
          >
            {commerceError && <div className="mb-3"><NoticeBanner tone="danger" message={commerceError} /></div>}
            {commerceNotice && <div className="mb-3"><NoticeBanner tone="success" message={commerceNotice} /></div>}

            {simulatedPos.length === 0 ? (
              <p className="text-[13px] text-faint">
                No simulated purchase orders yet. Raise one from Brand Purchase Orders → Operational commerce simulation.
              </p>
            ) : (
              <div className="space-y-3">
                {simulatedPos.map((po) => {
                  const chosen = termChoice[po.id] ?? 30;
                  const cReason = cancelReasonDraft[po.id] ?? '';
                  return (
                    <div key={po.id} className="border border-hairline rounded p-3 space-y-2 text-[13px]">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono font-semibold text-ink-950">{po.poNumber}</span>
                        <span className="text-faint">{po.brandId}</span>
                        <InlineStatus label={po.status} tone="info" />
                        <span className="font-mono">{formatGbp(po.poValue, 2)}</span>
                        <InlineStatus label={`Receiving: ${po.receivingLabel}`} tone={po.receivingTone} />
                        {po.invoiceNumber && (
                          <span className="text-[12px] text-ink-600 font-mono">
                            {po.invoiceNumber} ({po.invoiceStatus}) {po.invoiceTermsLabel ?? ''}
                          </span>
                        )}
                      </div>
                      {po.cancelledInvoiceNote && (
                        <p className="text-[12px] text-state-warning">{po.cancelledInvoiceNote}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={chosen}
                          disabled={Boolean(po.activeInvoiceId) || !(po.canReceive || po.canIssueInvoice)}
                          onChange={(e) => onTermChoiceChange(po.id, Number(e.target.value) as 14 | 30 | 60)}
                          className="rounded border border-hairline-strong bg-surface-raised px-2 py-1 text-[12px]"
                        >
                          <option value={14}>14-day terms</option>
                          <option value={30}>30-day terms</option>
                          <option value={60}>60-day terms</option>
                        </select>
                        <button
                          type="button"
                          disabled={!po.canAck}
                          onClick={() => onSimPoAction(po.id, 'ack')}
                          className="px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[12px] disabled:opacity-40"
                        >
                          Acknowledge
                        </button>
                        <button
                          type="button"
                          disabled={!po.canFulfil}
                          onClick={() => onSimPoAction(po.id, 'fulfil')}
                          className="px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[12px] disabled:opacity-40"
                        >
                          Fulfil / ship
                        </button>
                        <button
                          type="button"
                          disabled={!po.canReceive}
                          onClick={() => onSimPoAction(po.id, 'receive')}
                          className="px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[12px] disabled:opacity-40"
                        >
                          Receive
                        </button>
                        <button
                          type="button"
                          disabled={!po.canIssueInvoice}
                          onClick={() => onSimPoAction(po.id, 'issue_invoice')}
                          className="px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[12px] disabled:opacity-40"
                        >
                          Issue invoice
                        </button>
                        <button
                          type="button"
                          disabled={!po.canRecordPayment}
                          onClick={() => onSimPoAction(po.id, 'pay')}
                          className="px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[12px] disabled:opacity-40"
                        >
                          Record payment
                        </button>
                        {po.activeInvoiceId && (
                          <>
                            <input
                              value={cReason}
                              onChange={(e) =>
                                setCancelReasonDraft((prev) => ({ ...prev, [po.id]: e.target.value }))
                              }
                              placeholder="Cancel reason"
                              className="rounded border border-hairline-strong px-2 py-1 text-[12px]"
                            />
                            <button
                              type="button"
                              disabled={!cReason.trim()}
                              onClick={() => onSimPoAction(po.id, 'cancel_invoice', cReason)}
                              className="px-2.5 py-1 rounded border border-state-danger/20 text-state-danger text-[12px] disabled:opacity-40"
                            >
                              Cancel invoice
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => onSimPoAction(po.id, 'open_case')}
                          className="px-2.5 py-1 rounded border border-hairline text-secondary text-[12px]"
                        >
                          Open case
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-hairline grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-faint">
              <ul className="space-y-0.5">
                {invoiceRules.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
              <ul className="space-y-0.5">
                {receivingAutomationLines.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
          </SectionCard>

          <SectionCard
            title="Channel operations (Mercenta account holder)"
            description="Receiving sync, routing ARN read, invoice submission, and shipment label policy."
          >
            <div className="space-y-5 text-[13px]">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-ink-950">1 · Channel receiving sync</h3>
                  <button
                    type="button"
                    disabled={channelReceivingBusy}
                    onClick={() => void onReadChannelReceiving()}
                    className="px-3 py-1.5 rounded bg-ink-950 text-on-dark text-[12px] font-medium disabled:opacity-40"
                  >
                    {channelReceivingBusy ? 'Reading…' : 'Read channel receiving status'}
                  </button>
                </div>
                {channelReceivingModeLabel && (
                  <p className="text-[12px] text-ink-600">{channelReceivingModeLabel}</p>
                )}
                {channelReadings.map((r) => (
                  <div key={r.channelPurchaseOrderId} className="border border-hairline rounded p-2.5 space-y-1 text-[12px]">
                    <div className="font-mono font-medium text-ink-950">
                      {r.channelPurchaseOrderId} · Channel: {r.channelStatusLabel} · Mercenta: {r.mercentaStatusLabel} · {r.unitsReceived} units
                      {r.differs ? ' · Differs' : ''}
                    </div>
                    {r.ackSummary && (
                      <div className={r.ackAtRisk ? 'text-state-warning' : 'text-ink-600'}>Ack: {r.ackSummary}</div>
                    )}
                    {r.asnSummary && (
                      <div className={r.asnExposed ? 'text-state-warning' : 'text-ink-600'}>ASN: {r.asnSummary}</div>
                    )}
                    {r.pickupSummary && (
                      <div className={r.pickupAtRisk ? 'text-state-warning' : 'text-ink-600'}>Pickup: {r.pickupSummary}</div>
                    )}
                    {!r.simulated && (
                      <button
                        type="button"
                        disabled={!canMutate}
                        onClick={() => onApplyChannelReading(r.poId)}
                        className="mt-1 px-2.5 py-1 rounded border border-hairline-strong text-[11px] font-medium"
                      >
                        Apply as canonical receipt
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t border-hairline pt-4 space-y-2">
                <h3 className="font-semibold text-ink-950">2 · Routing instructions (ARN)</h3>
                {routingRows.length === 0 ? (
                  <p className="text-[12px] text-faint">No accepted POs carry a shipment request yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {routingRows.map((rr) => (
                      <li key={rr.instructionId} className="flex flex-wrap items-center justify-between gap-2 border border-hairline rounded px-3 py-2 text-[12px]">
                        <span className="font-mono">
                          {rr.poNumber} · {rr.reqId} · {rr.arn ? `ARN ${rr.arn}` : 'No ARN yet'}
                        </span>
                        <button
                          type="button"
                          disabled={!canMutate}
                          onClick={() => void onRefreshRouting(rr.instructionId, rr.poNumber)}
                          className="text-[var(--mr-accent)] font-medium hover:underline disabled:opacity-40"
                        >
                          Read routing instructions
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-hairline pt-4 space-y-2">
                <h3 className="font-semibold text-ink-950">3 · Invoice submission</h3>
                {invoiceSubmitRows.length === 0 ? (
                  <p className="text-[12px] text-faint">No issued invoices awaiting submission.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {invoiceSubmitRows.map((inv) => (
                      <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 border border-hairline rounded px-3 py-2 text-[12px]">
                        <span className="font-mono">
                          {inv.number} · {formatGbp(inv.subtotalGbp, 2)} · {inv.poNumber}
                        </span>
                        <div className="flex items-center gap-3">
                          {inv.result && <span className="text-ink-600">{inv.result}</span>}
                          <button
                            type="button"
                            onClick={() => void onSendInvoiceToChannel(inv.id, inv.number)}
                            className="text-[var(--mr-accent)] font-medium hover:underline"
                          >
                            Send to channel
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="border-t border-hairline pt-4 text-[12px] text-ink-600">
                <strong className="text-ink-900">4 · Channel shipment labels:</strong>{' '}
                {channelLabelsRule.available ? channelLabelsRule.reason : `Refused by rule: ${channelLabelsRule.reason}`} ({channelLabelsRule.source})
              </div>
            </div>
          </SectionCard>
        </>
      )}

      <SlideOverDrawer
        open={Boolean(selectedPo)}
        onClose={() => onSelectPo(null)}
        title={selectedPo ? `PO ${selectedPo.poNumber}` : 'Purchase order'}
        subtitle={selectedPo ? `${selectedPo.brandName} · ${selectedPo.statusLabel}` : undefined}
      >
        {selectedPo && (
          <div className="space-y-4 text-[13px]">
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-[11px] uppercase text-faint">PO Value</dt>
                <dd className="font-mono font-semibold text-ink-950">{formatGbp(selectedPo.poValue, 2)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase text-faint">Commission</dt>
                <dd className="font-mono text-ink-900">{formatGbp(selectedPo.commissionAmount, 2)}</dd>
              </div>
            </dl>
            <div className="border-t border-hairline pt-3">
              <h4 className="font-semibold text-ink-950 mb-2">Line items</h4>
              <ul className="divide-y divide-hairline-06">
                {selectedPo.lineItems.map((li) => (
                  <li key={li.sku} className="py-2 flex justify-between gap-2">
                    <div>
                      <div className="font-medium text-ink-900">{li.productName}</div>
                      <div className="font-mono text-[11px] text-faint">{li.sku}</div>
                    </div>
                    <div className="font-mono text-right text-[12px]">
                      <div>Ordered {li.quantity} · Ack {li.acknowledgedQty}</div>
                      <div className="text-faint">{formatGbp(li.unitCost, 2)} / unit</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
