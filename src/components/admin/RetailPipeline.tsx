import { useEffect, useMemo, useState } from 'react';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
import { useQueryClient } from '@tanstack/react-query';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { useBrands, useDeductions, usePurchaseOrders, useCatalogSubmissions } from '@/data/queries';
import { disputeDeduction, recordDisputeOutcome } from '@/data/api';
import { COMMISSION_AUTO_APPROVE_THRESHOLD_PLACEHOLDER_GBP } from '@/config/commercial';
import { DemoBanner } from "@/components/shared/DemoBanner";
import { latestSubmissionForProduct, reconcileDelivery, type DeliveryReconciliationResult } from '@/data/demoStore';
import { useApp } from '@/context/GlobalStateContext';
import { UK_MARKETPLACE_ID } from '@/lib/spapi/transform';
import { Badge, Button, Card, DataTable, StatusBadge } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import {
  billingDecisionPresentation,
  deductionStatusPresentation,
  poStatusPresentation,
  submissionStatusPresentation,
} from '@/lib/statusPresentation';
import { cn } from '@/utils/cn';
import { AdminPurchaseOrderDetail } from '@/components/admin/AdminPurchaseOrderDetail';
import { CommerceOperationsPanel } from '@/components/admin/CommerceOperationsPanel';
import { ChannelOperationsPanel } from '@/components/admin/ChannelOperationsPanel';
import {
  AlertTriangle,
  Eye,
  PlugZap,
} from 'lucide-react';

/* §Phase D2 — the local StatusBadge duplicated the canonical status
   presentation (and collided with the kit's name); submissions now render
   through the canonical StatusBadge with the shared submission tones. */

function LockedPipeline({ onGoToIntegrations }: { onGoToIntegrations?: () => void }) {
  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="ADMIN HUB · COMMERCE"
        title="Retail Pipeline"
        description="Catalog submissions, purchase orders and deductions."
      />

      <Card className="p-8 bg-ink-850 border-hairline">
        <div className="max-w-md mx-auto text-center">
          <div className="w-12 h-12 rounded-full bg-tint flex items-center justify-center mx-auto mb-4">
            <PlugZap className="w-6 h-6 text-zinc-500" />
          </div>
          <h3 className="text-sm font-semibold text-strong mb-2">
            Connect Amazon SP-API to enable this
          </h3>
          <p className="text-xs text-zinc-500 leading-relaxed mb-5">
            Catalog submission, purchase-order polling and shipment confirmation all run
            through the Selling Partner API connection managed in Integration Settings.
            Every feature on this page stays locked until that card shows a verified
            Connected status.
          </p>
          {onGoToIntegrations && (
            <Button onClick={onGoToIntegrations} className="text-xs">
              Open Integration Settings
            </Button>
          )}
        </div>
      </Card>
    </WorkspaceFrame>
  );
}

function UnlockedPipeline() {
  const qc = useQueryClient();
  const deductionsQuery = useDeductions();
  const posQuery = usePurchaseOrders();
  const submissionsQuery = useCatalogSubmissions();
  const brandsQuery = useBrands();
  const deductions = useMemo(() => deductionsQuery.data?.data ?? [], [deductionsQuery.data]);
  const purchaseOrders = useMemo(() => posQuery.data?.data ?? [], [posQuery.data]);
  const submissions = submissionsQuery.data?.data ?? [];
  const brandNames = new Map(
    (brandsQuery.data?.data ?? []).map((b) => [b.id, b.profile.businessName] as const)
  );
  /**
   * §Wave 3 Part 5 — ONE LOADING FLAG for this surface. Every read used to
   * destructure `.data` only, so while the queries resolved the surface stated
   * "No deductions posted." (measured in a real browser with a slow data source:
   * painted during load, gone once the deductions arrived).
   */
  const pipelinePending =
    deductionsQuery.isPending || posQuery.isPending || submissionsQuery.isPending || brandsQuery.isPending;
  /** §19.1 — dispute workflow state per deduction row. */
  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [disputeNotes, setDisputeNotes] = useState('');
  /** §Batch-0.5 — PO detail drill-down (full line-item, ASN, deductions). */
  const [detailPoId, setDetailPoId] = useState<string | null>(null);

  /**
   * §BATCH 7 (Part 4.1a) — DEEP LINKS, on the operator's commerce surface.
   *
   * `/admin/retail_pipeline?deduction=<id>` opens THAT deduction's dispute row and
   * `?po=<poNumber>` opens THAT purchase order's drill-down, so a notice about a
   * deduction or an outstanding-invoice PO lands on the record it names rather
   * than on this section. Both are applied ONCE per value by the shared reader.
   */
  const deepLinkDeduction = useRecordDeepLink('deduction');
  const deepLinkPo = useRecordDeepLink('po');
  useEffect(() => {
    if (!deepLinkDeduction) return;
    if (!deductions.some((d) => d.id === deepLinkDeduction)) return;
    setDisputingId(deepLinkDeduction);
  }, [deepLinkDeduction, deductions]);
  useEffect(() => {
    if (!deepLinkPo) return;
    const match = purchaseOrders.find((p) => p.poNumber === deepLinkPo);
    if (!match) return;
    setDetailPoId(match.id);
  }, [deepLinkPo, purchaseOrders]);

  async function openDispute(id: string) {
    if (!disputeNotes.trim()) return;
    await disputeDeduction(id, disputeNotes);
    setDisputingId(null);
    setDisputeNotes('');
    await qc.invalidateQueries({ queryKey: ['deductions'] });
  }

  async function closeDispute(id: string, outcome: 'won' | 'lost' | 'partial') {
    await recordDisputeOutcome(id, outcome);
    await qc.invalidateQueries({ queryKey: ['deductions'] });
  }
  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="ADMIN HUB · COMMERCE"
        title="Retail Pipeline"
        description={`Marketplace ${UK_MARKETPLACE_ID} · catalog, orders and deductions.`}
      />

      <DemoBanner />

      {/* ASIN-level submission status list */}
      <Card title="Catalog Submissions">
        <div className="divide-y divide-hairline-06">
          {submissions.map((sub) => (
            <div key={sub.id} className="flex items-start justify-between gap-4 px-1 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-strong truncate">{sub.productName}</div>
                <div className="text-ds-label font-mono text-zinc-600 mt-0.5">
                  {sub.sku}
                  {sub.asin ? ` · ASIN ${sub.asin}` : ''} · submitted{' '}
                  {new Date(sub.submittedAt).toLocaleDateString()}
                </div>
                {sub.status === 'rejected' && sub.rejectionReason && (
                  <div className="mt-1.5 bg-red-500/10 border border-red-500/20 rounded-ds-sm p-2 text-ds-label text-red-300 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>
                      {sub.rejectionReason}
                      <br />
                      <span className="text-red-400/70">
                        Needs human review — never auto-resubmitted.
                      </span>
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge
                  className="text-ds-micro"
                  dataStatus={submissionStatusPresentation(sub.status).dataStatus}
                  tone={submissionStatusPresentation(sub.status).tone}
                >
                  {submissionStatusPresentation(sub.status).label}
                </StatusBadge>
                {/* §Phase E5 (G2) — truthful provenance on the admin submission list. */}
                {sub.simulated && (
                  <span className="text-ds-micro px-1.5 py-0.5 rounded-ds-sm bg-brass-500/15 text-brass-400 border border-brass-500/20">(sim)</span>
                )}
                {/* §Phase E5 (G9) — ONE canonical latest-submission derivation: the
                    SAME `demoStore.latestSubmissionForProduct` the E3 domain and the
                    Global Catalog use, so a superseded record can never be mistaken
                    for the product's current state. */}
                {latestSubmissionForProduct(sub.brandId, sub.sku)?.id !== sub.id && (
                  <span className="text-ds-micro text-zinc-500">superseded</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Purchase order board — REAL data (single source of truth), auto-approve per §13 */}
      <Card title="Purchase Orders — Commission Board">
        <div className="divide-y divide-hairline-06">
          {purchaseOrders.map((po) => {
            // §13 threshold applies to PO VALUE (consistent with invoice.ts +
            // spapi/transform.ts), not the commission amount.
            const auto =
              po.poValue < COMMISSION_AUTO_APPROVE_THRESHOLD_PLACEHOLDER_GBP;
            return (
              <div key={po.id} className="flex items-center justify-between px-1 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-strong">{po.poNumber}</span>
                  {/* §Phase E5 (G2) — simulated POs are identified, never implied real. */}
                  {po.simulated === true && (
                    <span className="text-ds-micro px-1.5 py-0.5 rounded-ds-sm bg-brass-500/15 text-brass-400 border border-brass-500/20">(sim)</span>
                  )}
                  <span className="text-ds-micro text-zinc-500">{brandNames.get(po.brandId) ?? po.brandId}</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    className="text-ds-micro"
                    dataStatus={poStatusPresentation(po.status).dataStatus}
                    tone={poStatusPresentation(po.status).tone}
                  >
                    {poStatusPresentation(po.status).label}
                  </StatusBadge>
                  <span className="font-mono text-xs text-zinc-400">
                    £{po.poValue.toLocaleString()}
                  </span>
                  <StatusBadge
                    className="text-ds-micro"
                    dataStatus={billingDecisionPresentation(auto, po.commissionAmount).dataStatus}
                    tone={billingDecisionPresentation(auto, po.commissionAmount).tone}
                  >
                    {billingDecisionPresentation(auto, po.commissionAmount).label}
                  </StatusBadge>
                  <button
                    onClick={() => setDetailPoId(po.id)}
                    className="p-1 text-zinc-500 hover:text-strong transition-colors"
                    title="View PO detail"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* §Stage-25 — delivery-time reconciliation (confirmed vs received) */}
      <DeliveryReconciliation purchaseOrders={purchaseOrders} />

      {/* Deduction / chargeback log */}
      <Card title="Deductions & Chargebacks">
        {/* §Phase D — canonical DataTable. Column order is UNCHANGED (the
            deduction assertions read td indices 5/6), the status stays
            canonical, and every Dispute/outcome control is reachable at all
            widths via labelled cards below md. */}
        <DataTable
          dataTable="deductions-chargebacks"
          caption="Deductions and chargebacks"
          rows={deductions}
          rowKey={(d) => d.id}
          emptyMessage="No deductions posted."
          loading={pipelinePending}
          columns={[
            {
              key: 'date',
              label: 'Date',
              render: (d) => <span className="font-mono text-xs">{d.date}</span>,
            },
            {
              key: 'brandId',
              label: 'Brand',
              render: (d) => <span className="text-xs">{brandNames.get(d.brandId) ?? d.brandId}</span>,
            },
            {
              key: 'purchaseOrderId',
              label: 'PO',
              render: (d) => <span className="font-mono text-xs">{d.purchaseOrderId}</span>,
            },
            {
              key: 'type',
              label: 'Type',
              primary: true,
              render: (d) => (
                <span className="text-xs capitalize">
                  {d.type.replace(/_/g, ' ')}
                  {/* §Phase E5 (G2) — in-cell marker only: column indices are
                      deliberately unchanged for the existing dispute assertions. */}
                  {d.simulated && <span className="ml-1 text-ds-micro text-brass-400">(sim)</span>}
                </span>
              ),
            },
            {
              key: 'reason',
              label: 'Reason',
              render: (d) => (
                <span className="text-xs">
                  {d.reason}
                  {d.dispute && (
                    <span className="mt-1 block text-ds-micro text-zinc-500">
                      Disputed {d.dispute.openedAt}: {d.dispute.notes}
                      {d.dispute.outcome && (
                        <span className="ml-1 capitalize text-zinc-400">
                          → outcome: {d.dispute.outcome}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (d) => (
                <StatusBadge
                  className="text-ds-micro capitalize"
                  dataStatus={deductionStatusPresentation(d.status).dataStatus}
                  tone={deductionStatusPresentation(d.status).tone}
                >
                  {deductionStatusPresentation(d.status).label}
                </StatusBadge>
              ),
            },
            {
              key: 'amountGbp',
              label: 'Amount',
              align: 'right',
              render: (d) => <span className="font-mono text-xs">−£{d.amountGbp.toFixed(2)}</span>,
            },
            {
              key: 'dispute',
              label: 'Dispute',
              align: 'right',
              render: (d) => (
                <span className="inline-flex flex-wrap items-center justify-end gap-1">
                  {d.status === 'open' && disputingId !== d.id && (
                    <Button
                      variant="ghost"
                      className="text-ds-label text-blue-300"
                      onClick={() => {
                        setDisputingId(d.id);
                        setDisputeNotes('');
                      }}
                    >
                      Dispute
                    </Button>
                  )}
                  {d.status === 'disputed' && !d.dispute?.outcome && (
                    <span className="flex gap-1 justify-end">
                      {(['won', 'partial', 'lost'] as const).map((o) => (
                        <Button
                          key={o}
                          variant="ghost"
                          className="text-ds-micro capitalize text-zinc-400 hover:text-strong"
                          onClick={() => void closeDispute(d.id, o)}
                        >
                          {o}
                        </Button>
                      ))}
                    </span>
                  )}
                </span>
              ),
            },
          ]}
        />

        {/* Dispute note entry */}
        {disputingId && (
          <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-ds-md p-3 space-y-2">
            <p className="text-ds-label text-blue-200">
              Opening a dispute marks this deduction as disputed and records your
              pushback notes for tracking against the retail channel.
            </p>
            <textarea
              value={disputeNotes}
              onChange={(e) => setDisputeNotes(e.target.value)}
              rows={2}
              placeholder="Evidence / grounds for the dispute…"
              className="w-full bg-ink-900 border border-hairline rounded-ds-sm px-3 py-2 text-xs text-strong"
            />
            <Button className="text-xs" disabled={!disputeNotes.trim()} onClick={() => void openDispute(disputingId)}>
              Record dispute
            </Button>
          </div>
        )}
      </Card>

      {/* §Batch-0.5 — PO detail drill-down modal */}
      {detailPoId && (
        <AdminPurchaseOrderDetail poId={detailPoId} onClose={() => setDetailPoId(null)} />
      )}

      {/* §Phase E4 — the operational commerce simulation overview (admin-facing).
          Deliberately rendered AFTER the existing pipeline sections so the
          pre-existing catalog/PO/deduction DOM order — and every existing
          browser assertion that selects by order — is unchanged. */}
      <CommerceOperationsPanel />

      {/* §P12 — the CHANNEL OPERATIONS the seam now covers (`AV-040`): the
          receiving sync, the routing instructions (the ARN), invoice submission
          and the shipment-label rule. Rendered after the pre-existing sections,
          for the same DOM-order reason. */}
      <ChannelOperationsPanel />
    </WorkspaceFrame>
  );
}

export function RetailPipelinePanel(props: { onGoToIntegrations?: () => void }) {
  const { integrations } = useIntegrations();
  const spApi = integrations.amazon_sp_api;
  // Demo mode: always show the pipeline with demo data and a banner.
  // The locked state was hiding all the functionality from investors.
  // In production, this would check for a real connected SP-API.
  return <UnlockedPipeline />;
}

/**
 * §Stage-25 — delivery-time reconciliation (the SECOND reconciliation point).
 * ASN filing already validates against acknowledged quantities; here staff
 * record what the retail channel's receiving system ACTUALLY logged per
 * SKU, and any confirmed-vs-received shortfall automatically raises a
 * shortage_claim Deduction in the billing ledger. Gated on staff tier.
 */
export function DeliveryReconciliation({
  purchaseOrders,
}: {
  purchaseOrders: import('@/types').PurchaseOrder[];
}) {
  const { canCurrentUserMutate } = useApp();
  const [selectedPoId, setSelectedPoId] = useState('');
  const [received, setReceived] = useState<Record<string, number>>({});
  const [result, setResult] = useState<DeliveryReconciliationResult | null>(null);

  const eligible = purchaseOrders.filter((p) =>
    ['accepted', 'ready_to_fulfil', 'shipped'].includes(p.status)
  );
  const selected = eligible.find((p) => p.id === selectedPoId) ?? null;

  return (
    <Card title="Delivery Reconciliation — received vs confirmed">
      <div className="px-1 pb-2 space-y-2">
        <p className="text-ds-micro text-zinc-600 max-w-2xl">
          When the retail channel logs what actually arrived, record it here.
          Shortfalls against confirmed quantities raise shortage deductions
          automatically — operations and billing stay reconciled by construction.
        </p>
        {eligible.length === 0 ? (
          <p className="text-ds-label text-zinc-600">No POs awaiting delivery reconciliation.</p>
        ) : (
          <>
            <select
              value={selectedPoId}
              onChange={(e) => {
                setSelectedPoId(e.target.value);
                setReceived({});
                setResult(null);
              }}
              className="bg-ink-900 border border-hairline rounded-ds-sm px-2 py-1.5 text-xs text-zinc-300"
            >
              <option value="">Select a PO…</option>
              {eligible.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.poNumber} · £{p.poValue.toLocaleString()} · {p.status.replace(/_/g, ' ')}
                </option>
              ))}
            </select>

            {selected && (
              <div className="space-y-1">
                {selected.lineItems.map((li) => {
                  const confirmed =
                    li.acknowledgedQty ?? (li.ackStatus === 'accepted' ? li.quantity : 0);
                  return (
                    <div key={li.sku} className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-ds-label text-zinc-300 w-24 truncate">{li.sku}</span>
                      <span className="text-ds-micro text-zinc-500 w-56 truncate">{li.productName}</span>
                      <Badge className="text-ds-micro bg-tint text-zinc-400 border-hairline">
                        confirmed {confirmed || '—'}
                      </Badge>
                      <input
                        type="number"
                        min={0}
                        placeholder="received qty"
                        value={received[li.sku] ?? ''}
                        onChange={(e) =>
                          setReceived((prev) => ({ ...prev, [li.sku]: Number(e.target.value) }))
                        }
                        disabled={!canCurrentUserMutate}
                        className="w-28 bg-ink-900 border border-hairline rounded-ds-sm px-2 py-1 text-ds-label text-strong disabled:opacity-50"
                      />
                    </div>
                  );
                })}
                <Button
                  className="text-xs"
                  disabled={!canCurrentUserMutate}
                  onClick={() => {
                    const r = reconcileDelivery(selected.id, received);
                    if (r) setResult(r);
                  }}
                >
                  Record delivery & reconcile
                </Button>
                {!canCurrentUserMutate && (
                  <span className="text-ds-micro text-zinc-600 ml-2">view-only staff</span>
                )}
              </div>
            )}

            {result && (
              <div
                className={cn(
                  'rounded-ds-md p-3 text-ds-label border',
                  result.shortfalls.length === 0
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
                )}
              >
                {result.shortfalls.length === 0 ? (
                  <>Received quantities match confirmed quantities — no deduction raised.</>
                ) : (
                  <>
                    {result.shortfalls.length} shortfall line(s):{' '}
                    {result.shortfalls
                      .map((s) => `${s.sku} (${s.receivedQty}/${s.confirmedQty})`)
                      .join(', ')}
                    . {result.deductionsCreated.length} shortage deduction(s) raised to the billing ledger.
                  </>
                )}
              </div>
            )}

          </>
        )}
      </div>
    </Card>
  );
}

