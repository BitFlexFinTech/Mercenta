/**
 * §Batch-10 — Admin Purchase Order Management.
 * Shows all POs across all brands with full detail, acknowledgment status,
 * ASN filing, and on-behalf actions. Replaces the old 3PL Terminal view.
 */
import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
/** §P13 — the order DATE is rendered through the ONE display helper. */
import { orderDateLabel } from '@/lib/dates';
import { useApp } from '@/context/GlobalStateContext';
import {
  useBrands,
  usePurchaseOrders,
  useDeductions,
  useShipmentsAll,
} from '@/data/queries';
import { ingestChannelPurchaseOrders } from '@/data/api';
import type { ChannelIngestionResult } from '@/lib/commerce/channelPurchaseOrderIngestion';
/**
 * §BATCH 2c (`AV-024`) — the SIMULATED channel can change one of its own orders.
 * This is the ONLY seam that produces the documented event (the retail channel
 * changing an order after it was issued), so the revision path is reachable from the
 * product rather than only from a validator. Mock-first: deterministic, in-memory,
 * zero live network calls, and refused unless a SIMULATED channel read is active.
 */
import { simulateMockChannelPoRevision } from '@/lib/spapi/mockClient';
import { Button, Card, StatusBadge } from '@/components/ui';
import { cn } from '@/utils/cn';
import { AdminPurchaseOrderDetail } from '@/components/admin/AdminPurchaseOrderDetail';
/** §P13 / S7 — the acknowledgement WINDOW is read from its OWNER, never re-derived. */
import { poAcknowledgementWindow } from '@/lib/commerce/poAcknowledgementWindow';
/**
 * §UI/UX Wave 2 completion — this surface is migrated onto the SAME workspace
 * architecture Operations Overview uses (frame → header → toolbar → metric band →
 * record queue → context rail), and the RecordDrawer is the QUEUE → PREVIEW step
 * in front of the EXISTING full record page (AdminPurchaseOrderDetail). The row
 * contract the existing suites assert (`div.flex.items-center.justify-between`
 * with `button[title="View detail"]`) is deliberately preserved.
 */
import {
  ActivityFeed,
  ContextPanel,
  MetricBand,
  RecordDrawer,
  RecordFieldList,
  SegmentedControl,
  WorkspaceFrame,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceSection,
} from '@/components/shared/workspace';
import {
  ackDeadlinePresentation,
  ackStatusPresentation,
  poStatusPresentation,
} from '@/lib/statusPresentation';
import type { Deduction, PurchaseOrder } from '@/types';
import type { DemoShipment } from '@/data/demoData';
import { Search, Eye, RefreshCw, FlaskConical } from 'lucide-react';

const STATUS_ORDER = ['received', 'under_review', 'accepted', 'ready_to_fulfil', 'shipped', 'delivered', 'rejected'];

export function AdminPurchaseOrderList() {
  const qc = useQueryClient();
  /*
   * §P11 — REPOINTED (old contract recorded). The Phase E5 G3 guard was written
   * for the on-behalf "Create PO" action, which decision 3 REMOVED. The guard
   * itself is unchanged and still necessary: reading the channel and filing its
   * purchase orders is a MUTATION, so a view-only staff session must be refused
   * by the SURFACE exactly as before (the domain refuses it too).
   */
  const { canCurrentUserMutate, session } = useApp();
  const brandsQuery = useBrands();
  const posQuery = usePurchaseOrders();
  const deductionsQuery = useDeductions();
  const brands = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const pos = useMemo(() => posQuery.data?.data ?? [], [posQuery.data]);
  const deductions = useMemo(() => deductionsQuery.data?.data ?? [], [deductionsQuery.data]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);
  /* §P11 — channel purchase-order ingestion state (the ONLY way a PO arrives). */
  const [ingestBusy, setIngestBusy] = useState(false);
  const [ingestResult, setIngestResult] = useState<ChannelIngestionResult | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  /* §BATCH 2c (`AV-024`) — the simulated channel-change control's own state. */
  const [revisionBusy, setRevisionBusy] = useState(false);
  const [revisionNotice, setRevisionNotice] = useState<string | null>(null);
  /* §UI/UX Wave 2 completion — workspace state: queue density (REAL — it changes
     the rendered row padding), the simulated-only filter, and the record preview. */
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');
  const [simOnly, setSimOnly] = useState(false);
  const [previewPoId, setPreviewPoId] = useState<string | null>(null);

  const brandName = (id: string) => brands.find((b) => b.id === id)?.profile.businessName ?? id;

  /* Canonical shipment → PO join is `DemoShipment.poNumber` (the same join
     Logistics Control uses) — never a re-derived guess. */
  const shipments = useShipmentsAll().data?.data ?? [];

  /**
   * Queue metrics — every figure derived from the canonical stores above.
   *
   * §P13 / S7 — THE ACTIONABLE SET IS THE OWNER'S OWN `inQueue`.
   *
   * REPOINTED (the old contract is recorded here): this figure previously
   * hand-rolled `p.status === 'received' || p.status === 'under_review'` — a second
   * copy of a rule whose owner is `src/lib/commerce/poAcknowledgementWindow.ts`, and
   * a second copy of the config's own obligation set
   * (`PO_ACK_STATUSES_WITH_OBLIGATION`). The owner's `inQueue` is Amazon's `New` set
   * INSIDE the window, so "Awaiting action" can no longer count a purchase order
   * past its limit — or one whose order date cannot be read at all.
   */
  const queueMetrics = useMemo(() => {
    const awaiting = pos.filter((p) => poAcknowledgementWindow(p).inQueue);
    return {
      total: pos.length,
      value: pos.reduce((sum, p) => sum + p.poValue, 0),
      awaiting: awaiting.length,
      simulated: pos.filter((p) => p.simulated === true).length,
      deductions: deductions.length,
    };
  }, [pos, deductions]);

  const previewPo = pos.find((p) => p.id === previewPoId) ?? null;

  const grouped = useMemo(() => {
    const map = new Map<string, typeof pos>();
    let list = [...pos];
    if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter);
    if (simOnly) list = list.filter((p) => p.simulated === true);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((p) => p.poNumber.toLowerCase().includes(q) || (brands.find((b) => b.id === p.brandId)?.profile.businessName ?? p.brandId).toLowerCase().includes(q));
    }
    list.sort(function(a, b) { return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status); });
    for (const po of list) {
      if (!map.has(po.brandId)) map.set(po.brandId, []);
      map.get(po.brandId)!.push(po);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [pos, statusFilter, searchQuery, brands, simOnly]);

  /**
   * §P11 — READ THE RETAIL CHANNEL FOR PURCHASE ORDERS.
   *
   * This replaces the removed "Create PO" action. Mercenta never creates a PO
   * (decision 3): it reads the channel through the SP-API seam (the Mock client
   * until real credentials exist) and files every routable PO in the brand's
   * workspace, refusing anything it cannot route.
   */
  async function handleReadChannelPos() {
    // §Phase E5 (G3) guard, repointed to the P11 ingestion action — still a mutation.
    if (!canCurrentUserMutate) return;
    if (ingestBusy) return;
    setIngestBusy(true);
    setIngestError(null);
    try {
      const result = await ingestChannelPurchaseOrders({
        actorId: session?.role ?? 'Mercenta Admin',
      });
      setIngestResult(result);
      qc.invalidateQueries();
    } catch (err) {
      setIngestError(
        err instanceof Error ? err.message : 'The retail channel read failed; nothing was ingested.'
      );
    } finally {
      setIngestBusy(false);
    }
  }

  /**
   * §BATCH 2c (`AV-024`) — THE SIMULATED CHANNEL CHANGES ONE OF ITS ORDERS.
   *
   * The documented event is the retail channel changing a purchase order AFTER it was
   * issued (the vendor must then fulfil the UPDATED one). Nothing else in the product
   * can produce that event, so without this control the whole revision path — the
   * derivation, the record, the audit line, the brand's notice and this console's
   * revision history — would be unreachable and could only ever be proved by a
   * script. This is that event, SIMULATED.
   *
   * It is refused unless a SIMULATED channel read is active (a live channel is never
   * assumed to be simulated — the platform's standing fail-closed rule), and it never
   * writes a second path: the change goes through the mock channel seam and is then
   * RE-READ through the ONE ingestion owner, so the revision is derived, recorded and
   * audited by exactly the code a real channel change would use. No live call is made.
   */
  async function handleSimulateChannelChange() {
    if (!canCurrentUserMutate || revisionBusy) return;
    if (ingestResult?.mode !== 'mock') {
      setRevisionNotice(
        'Refused: read the retail channel first — a simulated change is only available while a simulated channel read is active.'
      );
      return;
    }
    setRevisionBusy(true);
    setRevisionNotice(null);
    try {
      /**
       * The simulated channel knows only its own orders, and it states which are its
       * own (`CHANNEL_PO_UNKNOWN`), so the first order it recognises is changed. A
       * demo-seeded record it does not own is never counted as a change.
       */
      let changed: ReturnType<typeof simulateMockChannelPoRevision> | null = null;
      let target: PurchaseOrder | null = null;
      for (const candidate of pos.filter((p) => p.simulated === true)) {
        const attempt = simulateMockChannelPoRevision(candidate.poNumber);
        if (attempt.ok) {
          changed = attempt;
          target = candidate;
          break;
        }
      }
      if (!changed || !target) {
        setRevisionNotice(
          'No order this simulated channel owns is held yet — read the retail channel, then try again. No live channel call was made.'
        );
        return;
      }
      const read = await ingestChannelPurchaseOrders({ actorId: session?.role ?? 'Mercenta Admin' });
      setIngestResult(read);
      const outcome = read.outcomes.find(
        (o) => o.channelPurchaseOrderId === target!.poNumber
      );
      const version = outcome?.po?.revisionNumber;
      setRevisionNotice(
        outcome?.status === 'revised'
          ? `The simulated retail channel changed ${target.poNumber}; Mercenta's re-read recorded version ${version} (${
              outcome.po?.revisions?.[outcome.po.revisions.length - 1]?.changeKinds.join(', ') ?? 'change recorded'
            }). No live channel call was made.`
          : `The simulated retail channel changed ${target.poNumber}, but the re-read did not record a revision (${outcome?.status ?? 'no outcome stated'}). No live channel call was made.`
      );
      qc.invalidateQueries();
    } catch (err) {
      setRevisionNotice(
        err instanceof Error
          ? `The simulated channel change failed: ${err.message}. No live channel call was made.`
          : 'The simulated channel change failed. No live channel call was made.'
      );
    } finally {
      setRevisionBusy(false);
    }
  }

return (
    <WorkspaceFrame>
      <WorkspaceHeader
        eyebrow="Admin Hub · Commerce operations"
        title="Purchase Orders"
        description={`${pos.length} POs across ${brands.length} brands — read from the retail channel, routed to the correct brand, acknowledged, and filed as ASNs on their behalf`}
        meta={
          <>
            <span className="text-ds-label text-zinc-500">
              Queue value{' '}
              <span className="font-mono text-zinc-300">
                GBP {queueMetrics.value.toLocaleString()}
              </span>
            </span>
            <span className="text-ds-label text-zinc-500">
              Awaiting action <span className="font-mono text-zinc-300">{queueMetrics.awaiting}</span>
            </span>
            {queueMetrics.simulated > 0 && (
              <span className="text-ds-label text-zinc-500">
                Simulated <span className="font-mono text-zinc-300">{queueMetrics.simulated}</span>
              </span>
            )}
          </>
        }
        actions={
          <>
            {ingestError && (
              <span className="text-ds-micro text-red-400" role="alert">
                {ingestError}
              </span>
            )}
            {ingestResult && !ingestError && (
              <span className="text-ds-micro text-emerald-400" role="status" data-state="po-ingest-summary">
                {ingestResult.ok
                  ? `${ingestResult.polled} read · ${ingestResult.ingested} filed · ${ingestResult.alreadyPresent} already held · ${ingestResult.refused} refused`
                  : 'Channel read failed'}
              </span>
            )}
            <Button
              className="text-ds-micro"
              data-state="admin-po-ingest"
              disabled={!canCurrentUserMutate || ingestBusy}
              title={
                canCurrentUserMutate
                  ? 'Read the retail channel for purchase orders addressed to Mercenta'
                  : 'View-only staff cannot file purchase orders'
              }
              onClick={handleReadChannelPos}
            >
              <RefreshCw className="w-3 h-3 mr-1" /> Read channel POs
            </Button>
          </>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1 sm:max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
              <input type="text" value={searchQuery} onChange={function(e) { setSearchQuery(e.target.value); }}
                aria-label="Search purchase orders"
                placeholder="Search by PO number or brand…"
                className="w-full bg-ink-900 border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40" />
            </div>
            <select value={statusFilter} onChange={function(e) { setStatusFilter(e.target.value); }}
              aria-label="Filter by status"
              className="bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brass-500/40">
              <option value="all">All Statuses</option>
              {STATUS_ORDER.map(function(s) { return (<option key={s} value={s}>{s.replace(/_/g, ' ')}</option>); })}
            </select>
            <button
              type="button"
              data-testid="po-sim-filter"
              aria-pressed={simOnly}
              onClick={function() { setSimOnly(function(v) { return !v; }); }}
              className={cn(
                'rounded-ds-md border px-2.5 py-1.5 text-ds-label font-medium transition-ds duration-ds-fast',
                simOnly
                  ? 'border-brass-500/40 bg-brass-500/15 text-brass-300'
                  : 'border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-zinc-200'
              )}
            >
              Simulated only
            </button>
            <span className="ml-auto flex items-center gap-2">
              <span className="hidden text-ds-micro uppercase tracking-[0.14em] text-zinc-600 sm:inline">
                Density
              </span>
              <SegmentedControl
                ariaLabel="Row density"
                active={density}
                onSelect={function(id) { setDensity(id as 'compact' | 'comfortable'); }}
                items={[
                  { id: 'compact', label: 'Compact' },
                  { id: 'comfortable', label: 'Comfortable' },
                ]}
              />
            </span>
          </div>
        }
      />

      <WorkspaceGrid
        rail={
          <>
            <ContextPanel title="Queue posture">
              <dl className="space-y-2">
                {[
                  { label: 'Awaiting action', value: queueMetrics.awaiting },
                  { label: 'Acknowledged / later', value: queueMetrics.total - queueMetrics.awaiting },
                  { label: 'Deductions raised', value: queueMetrics.deductions },
                  { label: 'Simulated (sim)', value: queueMetrics.simulated },
                ].map(function(row) {
                  return (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <dt className="text-ds-label text-zinc-500">{row.label}</dt>
                      <dd className="font-mono text-ds-label text-zinc-200">{row.value}</dd>
                    </div>
                  );
                })}
              </dl>
              <p className="mt-2 border-t border-white/[0.06] pt-2 text-ds-micro leading-snug text-zinc-600">
                Every figure is derived from the canonical purchase-order and deduction
                stores — nothing is estimated.
              </p>
            </ContextPanel>
            <ContextPanel title="Status distribution">
              {queueMetrics.total === 0 ? (
                <p className="text-ds-label text-zinc-500">No purchase orders to summarise.</p>
              ) : (
                <ul className="space-y-1.5" data-testid="po-status-distribution">
                  {STATUS_ORDER.map(function(s) {
                    const n = pos.filter(function(p) { return p.status === s; }).length;
                    const p = poStatusPresentation(s);
                    return (
                      <li key={s} className="flex items-center justify-between gap-2">
                        <StatusBadge className="text-ds-micro" dataStatus={p.dataStatus} tone={p.tone}>
                          {p.label}
                        </StatusBadge>
                        <span className="font-mono text-ds-label text-zinc-300">{n}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ContextPanel>
          </>
        }
      >
        <MetricBand
          columns={4}
          items={[
            {
              id: 'po-queue-total',
              label: 'Purchase orders',
              value: String(queueMetrics.total),
              context: `${brands.length} brands`,
              onOpen: function() { setStatusFilter('all'); setSearchQuery(''); setSimOnly(false); },
            },
            {
              id: 'po-queue-value',
              label: 'Value in queue',
              value: `GBP ${queueMetrics.value.toLocaleString()}`,
              context: 'Net order value',
              onOpen: function() { setStatusFilter('all'); setSearchQuery(''); },
            },
            {
              id: 'po-queue-awaiting',
              label: 'Awaiting action',
              value: String(queueMetrics.awaiting),
              tone: queueMetrics.awaiting > 0 ? 'warning' : 'success',
              statusText: queueMetrics.awaiting > 0 ? 'Needs review' : 'All actioned',
              onOpen: function() { setStatusFilter('received'); },
            },
            {
              id: 'po-queue-simulated',
              label: 'Simulated (sim)',
              value: String(queueMetrics.simulated),
              context: 'Operational simulation',
              onOpen: function() { setSimOnly(true); },
            },
          ]}
        />
        {/* §P11 — THE CHANNEL READ: the ONLY way a purchase order arrives.
            Mercenta never creates a PO (decision 3). It reads the retail channel,
            identifies the brand from the PO's own lines, files it in that brand's
            workspace — and REFUSES anything it cannot route. The panel states the
            seam's mode truthfully and lists every outcome, refusals included. */}
        <WorkspaceSection
          title="Channel purchase orders"
          domain="orders"
          description="The retail channel issues purchase orders to Mercenta. Mercenta identifies the brand from the PO's own lines and files it in that brand's workspace; a PO that cannot be routed is refused and held for review."
        >
          <div className="space-y-2" data-testid="channel-po-ingestion">
            <div className="flex flex-wrap items-center gap-2 text-ds-label">
              <span className="text-zinc-500">
                Channel read{' '}
                <span className="font-mono text-zinc-300" data-state="channel-mode">
                  {ingestResult
                    ? ingestResult.mode === 'mock'
                      ? 'Simulation (mock)'
                      : 'Live'
                    : ingestBusy
                      ? 'Reading…'
                      : 'Not yet read'}
                </span>
              </span>
              {ingestResult?.mode === 'mock' && (
                <span className="rounded border border-brass-500/20 bg-brass-500/15 px-1.5 py-0.5 text-ds-micro text-brass-400">
                  Simulated read — no live channel call was made
                </span>
              )}
            </div>

            {/* §BATCH 2c (`AV-024`) — THE SIMULATED CHANNEL CHANGES ONE OF ITS ORDERS.
                The retail channel may change a purchase order after it was issued, and
                the vendor must fulfil the UPDATED one; the change is discovered by
                re-reading the channel. This issues that event through the mock channel
                seam and re-reads through the ONE ingestion owner, so the revision is
                derived, recorded and audited by the real code path. Refused unless a
                SIMULATED channel read is active: a live channel is never assumed to be
                simulated, and no live call is ever made from here. */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                className="text-ds-micro"
                data-state="admin-po-simulate-change"
                disabled={!canCurrentUserMutate || revisionBusy || ingestResult?.mode !== 'mock'}
                title={
                  !canCurrentUserMutate
                    ? 'View-only staff cannot change channel data'
                    : ingestResult?.mode !== 'mock'
                      ? 'Read the retail channel first — this control stays refused until a simulated channel read is active'
                      : 'The simulated retail channel changes one of its orders, then Mercenta re-reads it (no live channel call)'
                }
                onClick={handleSimulateChannelChange}
              >
                <FlaskConical className="w-3 h-3 mr-1" />
                Simulate a channel order change (sim)
              </Button>
              {revisionNotice && (
                <span
                  className="text-ds-micro text-brass-400"
                  role="status"
                  data-state="po-revision-simulate-summary"
                >
                  {revisionNotice}
                </span>
              )}
            </div>

            {ingestError ? (
              <p className="text-ds-label text-red-400" role="alert">
                {ingestError}
              </p>
            ) : !ingestResult ? (
              <p className="text-ds-label text-zinc-500">
                No channel read has been performed in this session. Nothing is created inside Mercenta —
                purchase orders arrive from the retail channel.
              </p>
            ) : (
              <>
                <dl className="flex flex-wrap gap-x-5 gap-y-1 text-ds-label" data-testid="channel-po-outcomes">
                  {[
                    { label: 'Read', value: ingestResult.polled },
                    { label: 'Filed', value: ingestResult.ingested },
                    { label: 'Already held', value: ingestResult.alreadyPresent },
                    { label: 'Refused', value: ingestResult.refused },
                  ].map(function(row) {
                    return (
                      <div key={row.label} className="flex items-center gap-2">
                        <dt className="text-zinc-500">{row.label}</dt>
                        <dd className="font-mono text-zinc-200">{row.value}</dd>
                      </div>
                    );
                  })}
                </dl>
                {ingestResult.outcomes.length === 0 ? (
                  <p className="text-ds-label text-zinc-500">
                    The channel returned no purchase orders for this read.
                  </p>
                ) : (
                  <ul className="divide-y divide-white/[0.04]" data-testid="channel-po-outcome-rows">
                    {ingestResult.outcomes.map(function(o) {
                      const filed = o.status === 'ingested' && o.po;
                      return (
                        <li
                          key={o.channelPurchaseOrderId}
                          data-outcome={o.status}
                          className="flex flex-wrap items-center justify-between gap-2 py-1.5"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {filed ? (
                              <button
                                type="button"
                                data-testid={`channel-po-open-${o.channelPurchaseOrderId}`}
                                onClick={function() { setPreviewPoId(o.po!.id); }}
                                className="font-mono text-ds-label text-zinc-200 underline-offset-2 hover:underline"
                                title="Open the filed purchase order"
                              >
                                {o.channelPurchaseOrderId}
                              </button>
                            ) : (
                              <span className="font-mono text-ds-label text-zinc-400">
                                {o.channelPurchaseOrderId}
                              </span>
                            )}
                            <span
                              data-status={o.status}
                              className={cn(
                                'rounded px-1.5 py-0.5 text-ds-micro capitalize',
                                o.status === 'ingested'
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : o.status === 'already_present'
                                    ? 'bg-white/[0.06] text-zinc-400'
                                    : 'bg-red-500/15 text-red-300'
                              )}
                            >
                              {o.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-ds-micro text-zinc-500">
                              {o.brandId ? brandName(o.brandId) : 'Not routed'}
                            </span>
                          </span>
                          {o.reason && (
                            <span className="max-w-[56ch] text-ds-micro leading-snug text-zinc-500">
                              {o.reason}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        </WorkspaceSection>




        <WorkspaceSection
          title="Order queue"
          domain="orders"
          description="Grouped by brand. Preview a record without leaving the queue, or open the full record page to act."
        >
          <div className="space-y-3">
        {grouped.map(function([brandId, brandPos]) { return (
          <Card key={brandId} title={brandName(brandId)}>
            <div className="divide-y divide-white/[0.04]">
              {brandPos.map(function(po) {
                const poDeductions = deductions.filter(function(d) { return d.purchaseOrderId === po.id; });
                return (
                  <div key={po.id} data-density={density} className={cn('flex items-center justify-between px-1 hover:bg-white/[0.02]', density === 'compact' ? 'py-2' : 'py-2.5')}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs text-white font-medium">{po.poNumber}</span>
                      {/* §Phase E5 (G2) — truthful provenance on the admin PO list. */}
                      {po.simulated === true && (
                        <span className="text-ds-micro px-1.5 py-0.5 rounded bg-brass-500/15 text-brass-400 border border-brass-500/20">(sim)</span>
                      )}
                      <span className={cn('text-ds-micro px-1.5 py-0.5 rounded capitalize',
                        po.status === 'received' ? 'bg-blue-500/15 text-blue-300' :
                        po.status === 'accepted' ? 'bg-emerald-500/15 text-emerald-300' :
                        po.status === 'rejected' ? 'bg-red-500/15 text-red-300' :
                        po.status === 'shipped' || po.status === 'delivered' ? 'bg-purple-500/15 text-purple-300' :
                        'bg-amber-500/15 text-amber-300'
                      )}>{po.status.replace(/_/g, ' ')}</span>
                      <span className="font-mono text-ds-micro text-zinc-500">GBP {po.poValue.toLocaleString()}</span>
                      <span className="text-ds-micro text-zinc-600">{po.lineItems.length} items</span>
                      {po.acknowledgedAt && <span className="text-ds-micro text-emerald-500/70">Acknowledged</span>}
                      {poDeductions.length > 0 && <span className="text-ds-micro text-amber-500/70">{poDeductions.length} deduction(s)</span>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        data-testid={`po-preview-${po.id}`}
                        onClick={function() { setPreviewPoId(po.id); }}
                        className="rounded-ds-sm border border-white/[0.08] px-2 py-1 text-ds-micro font-medium text-zinc-300 transition-ds duration-ds-fast hover:border-white/[0.16] hover:text-white"
                        title="Preview record"
                      >
                        Preview
                      </button>
                      <button onClick={function() { setSelectedPoId(po.id); }}
                        className="p-1.5 text-zinc-500 hover:text-white" title="View detail">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );})}
        {grouped.length === 0 && (
          <Card className="p-8 text-center"><p className="text-xs text-zinc-600">No purchase orders match your filters.</p></Card>
        )}
          </div>
        </WorkspaceSection>
      </WorkspaceGrid>

      {/* ── QUEUE → PREVIEW → RECORD PAGE ──────────────────────────────────
          The drawer is the preview step over the REAL PO record; the existing
          full record page (`AdminPurchaseOrderDetail`) is still reached by the
          row's "View detail" control, so no workflow was replaced. */}
      <RecordDrawer
        open={previewPo !== null}
        onClose={function() { setPreviewPoId(null); }}
        title={previewPo ? previewPo.poNumber : ''}
        subtitle={previewPo ? brandName(previewPo.brandId) : undefined}
        testId="po-record-drawer"
        footer={
          previewPo ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-ds-micro text-zinc-600">
                {previewPo.simulated === true
                  ? 'Operational simulation record'
                  : 'Recorded purchase order'}
              </span>
              <Button
                className="text-ds-micro"
                data-state="po-drawer-open-record"
                onClick={function() { setSelectedPoId(previewPo.id); setPreviewPoId(null); }}
              >
                Open full record
              </Button>
            </div>
          ) : undefined
        }
      >
        {previewPo ? (
          <PoPreviewBody
            po={previewPo}
            brandName={brandName(previewPo.brandId)}
            deductions={deductions.filter(function(d) { return d.purchaseOrderId === previewPo.id; })}
            shipments={shipments.filter(function(s) { return s.poNumber === previewPo.poNumber; })}
          />
        ) : null}
      </RecordDrawer>

      {selectedPoId && (
        <AdminPurchaseOrderDetail poId={selectedPoId} onClose={function() { setSelectedPoId(null); qc.invalidateQueries(); }} />
      )}

      {/* §P11 — REMOVED (decision 3): the "Create Purchase Order on Behalf of
          Brand" dialogue. Mercenta never creates a purchase order; POs arrive
          from the retail channel and are filed by the channel-read action above
          (`ingestChannelPurchaseOrders`). */}
    </WorkspaceFrame>
  );
}

/* ── RECORD PREVIEW BODY ────────────────────────────────────────────────────
 * Only the sections a purchase order genuinely supports are rendered (summary,
 * lines, finance, logistics, activity). Nothing is invented and no empty
 * placeholder section is shown: a section with no real rows simply does not
 * appear.
 */
function PoPreviewBody({
  po,
  brandName,
  deductions,
  shipments,
}: {
  po: PurchaseOrder;
  brandName: string;
  deductions: Deduction[];
  shipments: DemoShipment[];
}) {
  const status = poStatusPresentation(po.status);
  /**
   * §P13 / S7 — THE WINDOW COMES FROM ITS OWNER.
   *
   * REPOINTED (the old contract is recorded here): this preview hand-rolled
   * `Math.floor((orderDate + 24 * 3600 * 1000 − Date.now()) / 3600000)` with
   * `Math.max(0, …)` clamps, its own minutes arithmetic (`(hoursLeft % 1) * 60`,
   * which is ALWAYS 0 once `hoursLeft` has been floored), and its own
   * acknowledged flag from `po.acknowledgedAt` — a second copy of an Amazon rule and
   * a second presentation of it. The owner derives the window, the presentation
   * owner classifies the urgency, a decided or closed order renders NO window badge
   * (nothing is owed), and an unreadable order date is STATED rather than rendered
   * as a figure.
   */
  const ackWindow = poAcknowledgementWindow(po);
  const ackPresentation =
    ackWindow.hoursLeft === null ? null : ackDeadlinePresentation(ackWindow.hoursLeft);
  const ackBadge =
    ackWindow.channelState === 'acknowledged' || ackWindow.channelState === 'closed'
      ? null
      : ackPresentation
        ? {
            dataStatus: ackPresentation.dataStatus,
            tone: ackPresentation.tone,
            label: ackPresentation.label,
          }
        : {
            dataStatus: 'ack_unknown',
            tone: 'neutral' as const,
            label: 'Ack window unreadable',
          };
  const deductionsTotal = deductions.reduce(function(sum, d) { return sum + d.amountGbp; }, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge dataStatus={status.dataStatus} tone={status.tone}>
          {status.label}
        </StatusBadge>
        {ackBadge && (
          <span title={ackWindow.reason}>
            <StatusBadge dataStatus={ackBadge.dataStatus} tone={ackBadge.tone}>
              {ackBadge.label}
            </StatusBadge>
          </span>
        )}
        {po.simulated === true && (
          <span className="rounded border border-brass-500/20 bg-brass-500/15 px-1.5 py-0.5 text-ds-micro text-brass-400">
            (sim)
          </span>
        )}
      </div>

      <RecordFieldList
        fields={[
          { label: 'Brand', value: brandName },
          { label: 'Order date', value: orderDateLabel(po.orderDate) },
          { label: 'Order value', value: `GBP ${po.poValue.toLocaleString()}` },
          { label: 'Commission', value: `${po.commissionRate}% · GBP ${po.commissionAmount.toLocaleString()}` },
          { label: 'Line items', value: String(po.lineItems.length) },
          { label: 'Freight term', value: po.freightTerm ? po.freightTerm.replace(/_/g, ' ') : '—' },
          { label: 'Acknowledged', value: po.acknowledgedAt ? po.acknowledgedAt.slice(0, 16).replace('T', ' ') : 'Not yet' },
          {
            label: 'Ship / delivery window',
            value:
              po.freightTerm === 'collect'
                ? [po.shipWindowStart, po.shipWindowEnd].filter(Boolean).join(' → ') || '—'
                : [po.deliveryWindowStart, po.deliveryWindowEnd].filter(Boolean).join(' → ') || '—',
          },
        ]}
      />

      <section aria-label="Lines">
        <h3 className="mb-1.5 text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Lines
        </h3>
        <div className="overflow-hidden rounded-ds-md border border-white/[0.06]">
          <table className="w-full text-left text-ds-label">
            <thead className="bg-white/[0.02] text-ds-micro uppercase tracking-wider text-zinc-500">
              <tr>
                <th scope="col" className="px-2 py-1.5">SKU</th>
                <th scope="col" className="px-2 py-1.5">Product</th>
                <th scope="col" className="px-2 py-1.5 text-right">Qty</th>
                <th scope="col" className="px-2 py-1.5 text-right">Unit</th>
                <th scope="col" className="px-2 py-1.5">Ack</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {po.lineItems.map(function(line) {
                const ack = ackStatusPresentation(line.ackStatus);
                return (
                  <tr key={line.sku}>
                    <td className="px-2 py-1.5 font-mono text-zinc-400">{line.sku}</td>
                    <td className="px-2 py-1.5 text-zinc-200">{line.productName}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-zinc-300">{line.quantity}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-zinc-300">
                      {line.unitPrice.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5">
                      <StatusBadge className="text-ds-micro" dataStatus={ack.dataStatus} tone={ack.tone}>
                        {ack.label}
                      </StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {(deductions.length > 0 || shipments.length > 0) && (
        <section aria-label="Finance and logistics">
          <h3 className="mb-1.5 text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Finance &amp; logistics
          </h3>
          <RecordFieldList
            fields={[
              { label: 'Deductions', value: `${deductions.length} · GBP ${deductionsTotal.toFixed(2)}` },
              { label: 'Shipments', value: String(shipments.length) },
            ]}
          />
          {shipments.length > 0 && (
            <ul className="mt-2 space-y-1">
              {shipments.map(function(s) {
                return (
                  <li key={s.id} className="flex flex-wrap items-center gap-2 text-ds-label">
                    <span className="font-mono text-zinc-400">{s.reference}</span>
                    <span className="text-zinc-300">{s.carrier}</span>
                    <span className="text-zinc-500">{s.status}</span>
                    {s.delayed && <span className="text-amber-400">delayed</span>}
                    {s.exception && <span className="text-red-400">exception</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section aria-label="Activity">
        <h3 className="mb-1.5 text-ds-label font-semibold uppercase tracking-[0.14em] text-zinc-400">
          Activity
        </h3>
        <ActivityFeed
          entries={[
            ...(po.orderDate
              ? [{ id: 'raised', title: 'Purchase order raised', meta: brandName, at: po.orderDate }]
              : []),
            ...(po.acknowledgedAt
              ? [{ id: 'ack', title: 'Acknowledged', meta: 'Line-level acknowledgment recorded', at: po.acknowledgedAt }]
              : []),
          ]}
        />
      </section>
    </div>
  );
}