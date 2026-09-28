/**
 * §Phase G1 — brand-facing DEDUCTIONS LEDGER (Analytics / Reports).
 *
 * Closes the documented product gap behind Tour 5 ("Deductions & Disputes"),
 * whose four declared anchors ([data-tour="deductions-ledger"],
 * "deductions-categories", "deductions-dispute-btn", "deductions-outcome-info")
 * previously existed in NO component — the tour could start but had nothing to
 * highlight, so `e2e/tours.spec.ts` t5 could only skip.
 *
 * This is NOT a second workflow and NOT a new store:
 *  - reads through the CANONICAL E4 tenant-scoped domain read model
 *    (`listBrandCommerceExceptions`), so a brand physically cannot see another
 *    tenant's deductions (the tenant check is inside the domain, not the UI);
 *  - the Dispute action calls the CANONICAL `openCommerceDispute` with a
 *    brand-pinned `CommerceActor`, so RBAC + tenant isolation + the audit step
 *    are enforced in the domain and a refusal is surfaced verbatim;
 *  - disputes open with real evidence notes; the OUTCOME (won/lost/partial) is
 *    recorded by the retail channel — this surface REPORTS the real recorded
 *    outcome rather than letting a brand declare its own win, so nothing here
 *    fabricates a result. The outcome-recording control already exists on the
 *    operator ledger (`RetailPipeline`) and the brand console
 *    (`CommerceSimulationPanel`) — no third path is created;
 *  - provenance is truthful: a record raised by the commerce simulation is
 *    marked `(sim)` from the canonical `Deduction.simulated` flag.
 *
 * Uses the existing primitives (`Card`/`Badge`/`Button`) and the existing
 * derived-store re-render signal (`useCanonicalStoreVersion`). No new visual
 * language, no new layout system, no new store, no migration.
 */
import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useCanonicalStoreVersion } from '@/data/queries';
import {
  listBrandCommerceExceptions,
  openCommerceDispute,
  type CommerceActor,
} from '@/lib/commerce/commerceLifecycle';
import { Badge, Button, Card, DataTable, StatusBadge } from '@/components/ui';
import { deductionStatusPresentation } from '@/lib/statusPresentation';
import {
  DEDUCTION_DISPUTE_WINDOW,
  DEDUCTION_TAXONOMY,
  deductionTypeLabel,
} from '@/config/deductions';
import { cn } from '@/utils/cn';

const MONO = 'font-mono text-ds-label';

export function DeductionsLedger() {
  const { session } = useApp();
  const version = useCanonicalStoreVersion();
  void version; // canonical store change signal → re-read derived rows

  const brandId = session?.tier === 'brand' ? session.tenantId ?? null : null;
  const actor = useMemo<CommerceActor>(
    () => ({ staffId: `brand:${brandId ?? 'none'}`, canMutate: true, tenantId: brandId ?? undefined }),
    [brandId]
  );

  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Canonical, tenant-scoped read model. `version` is a dependency because the
   * domain store is an in-memory singleton: a version bump (any lifecycle step,
   * including one that raises a NEW deduction) is the correct re-read trigger,
   * so the ledger can never show a stale set of rows.
   */
  const rows = useMemo(() => {
    // `version` is referenced deliberately: it is the canonical store's change
    // signal, so every lifecycle step — including one that raises a NEW
    // deduction — re-reads the rows and the ledger can never go stale.
    void version;
    if (!brandId) return [];
    const res = listBrandCommerceExceptions(brandId, actor);
    return res.ok ? res.value : [];
  }, [brandId, actor, version]);

  /** Only deductions with no dispute yet, and not already settled, can be disputed. */
  const disputable = rows.filter((d) => d.status === 'open' && !d.dispute);
  const totalDeducted = rows.reduce((sum, d) => sum + d.amountGbp, 0);
  const recordedOutcomes = rows.filter((d) => d.dispute?.outcome);

  const categories = useMemo(() => {
    const map = new Map<string, { count: number; amount: number }>();
    for (const d of rows) {
      const c = map.get(d.type) ?? { count: 0, amount: 0 };
      c.count += 1;
      c.amount += d.amountGbp;
      map.set(d.type, c);
    }
    return [...map.entries()].sort((a, b) => b[1].amount - a[1].amount);
  }, [rows]);

  if (!brandId) return null;

  async function recordDispute() {
    if (!disputingId || !notes.trim()) return;
    setError(null);
    setNotice(null);
    const res = await openCommerceDispute(disputingId, notes, actor);
    if (!res.ok) {
      setError(`${res.error}${res.reasons?.length ? ` — ${res.reasons.join('; ')}` : ''}`);
      return;
    }
    setNotice(
      `${res.value.purchaseOrderId} — ${deductionTypeLabel(res.value.type)} marked ${res.value.status}. Your evidence notes are recorded against the deduction.`
    );
    setDisputingId(null);
    setNotes('');
  }

  return (
    <section data-tour="deductions-ledger" className="space-y-4">
      <Card
        title="Deductions Ledger"
        subtitle={
          rows.length === 0
            ? 'No deductions have been applied to your POs.'
            : `${rows.length} deduction${rows.length === 1 ? '' : 's'} · £${totalDeducted.toFixed(2)} applied`
        }
      >
        {/* ── Categories ─────────────────────────────────────────────── */}
        <div data-tour="deductions-categories" className="px-5 py-3 border-b border-white/[0.06]">
          <p className="text-ds-micro uppercase tracking-wide text-zinc-500">{DEDUCTION_TAXONOMY.heading}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {categories.map(([type, c]) => (
              <span
                key={type}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-ds-micro text-zinc-300"
              >
                <span>{deductionTypeLabel(type)}</span>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-400">{c.count}</span>
                <span className="text-zinc-500">·</span>
                <span className={cn(MONO, 'text-zinc-400')}>£{c.amount.toFixed(2)}</span>
              </span>
            ))}
            {categories.length === 0 && (
              <span className="text-ds-label text-zinc-600">
                No deductions recorded for your account.
              </span>
            )}
          </div>
          {/* §BATCH 2a (`AV-019`) — the attribution: these are Mercenta's own
              working categories, never presented as the channel's codes. */}
          <p className="text-ds-micro text-zinc-600 mt-2">{DEDUCTION_TAXONOMY.attributionNote}</p>
        </div>

        {/* ── Ledger rows — canonical DataTable: labelled cards below md (so no
            action or amount is ever hidden behind a horizontal scroll) and the
            semantic table at md+; statuses come from the canonical layer. ── */}
        <DataTable
          caption="Deductions ledger"
          rows={rows}
          rowKey={(d) => d.id}
          emptyMessage="No deductions posted."
          columns={[
            {
              key: 'date',
              label: 'Date',
              hideBelow: 'sm',
              render: (d) => <span className={cn(MONO, 'text-zinc-400')}>{d.date}</span>,
            },
            {
              key: 'po',
              label: 'PO',
              primary: true,
              render: (d) => <span className={cn(MONO, 'text-zinc-200')}>{d.purchaseOrderId}</span>,
            },
            {
              key: 'type',
              label: 'Type',
              render: (d) => (
                <span className="text-xs capitalize">
                  {deductionTypeLabel(d.type)}
                  {d.simulated && <span className="ml-1 text-ds-micro text-brass-400">(sim)</span>}
                </span>
              ),
            },
            {
              key: 'reason',
              label: 'Reason',
              hideBelow: 'lg',
              render: (d) => (
                <span className="block max-w-[280px] text-xs">
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
              key: 'amount',
              label: 'Amount',
              align: 'right',
              render: (d) => <span className={cn(MONO, 'text-zinc-300')}>−£{d.amountGbp.toFixed(2)}</span>,
            },
          ]}
        />

        {/* ── Dispute workflow ───────────────────────────────────────── */}
        <div
          data-tour="deductions-dispute-btn"
          className="px-5 py-3 border-t border-white/[0.06] space-y-2"
        >
          <p className="text-ds-micro uppercase tracking-wide text-zinc-500">Dispute a deduction</p>
          {disputable.length === 0 ? (
            <p className="text-ds-label text-zinc-600">
              {rows.length === 0
                ? 'No deductions to dispute.'
                : 'Every deduction on your account is already disputed or settled.'}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {disputable.map((d) => (
                <Button
                  key={d.id}
                  variant="ghost"
                  className="text-ds-label text-blue-300"
                  data-state="brand-deduction-dispute"
                  onClick={() => {
                    setDisputingId(d.id);
                    setNotes('');
                    setNotice(null);
                    setError(null);
                  }}
                >
                  Dispute {d.purchaseOrderId} — £{d.amountGbp.toFixed(2)}
                </Button>
              ))}
            </div>
          )}
          {disputingId && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-2">
              <p className="text-ds-label text-blue-200">
                {DEDUCTION_DISPUTE_WINDOW.attributionNote} Provide the evidence
                that supports your claim — shipping documents, proof of delivery, or carton photos.
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Evidence / grounds for the dispute…"
                className="w-full bg-ink-900 border border-white/[0.08] rounded-md px-3 py-2 text-xs text-white"
              />
              <div className="flex gap-2">
                <Button
                  className="text-xs"
                  data-state="brand-deduction-record-dispute"
                  disabled={!notes.trim()}
                  onClick={() => void recordDispute()}
                >
                  Record dispute
                </Button>
                <Button
                  variant="ghost"
                  className="text-xs"
                  onClick={() => {
                    setDisputingId(null);
                    setNotes('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          {notice && <p className="text-ds-label text-emerald-300">{notice}</p>}
          {error && <p className="text-ds-label text-red-300">{error}</p>}
        </div>

        {/* ── Outcomes ───────────────────────────────────────────────── */}
        <div
          data-tour="deductions-outcome-info"
          className="px-5 py-3 border-t border-white/[0.06] space-y-2"
        >
          <p className="text-ds-micro uppercase tracking-wide text-zinc-500">Dispute Outcomes</p>
          <p className="text-ds-label text-zinc-400">
            A dispute is decided by the retail channel, not by you. It can be{' '}
            <span className="text-emerald-300">Won</span> (the deduction is refunded),{' '}
            <span className="text-red-300">Lost</span> (the deduction stands) or{' '}
            <span className="text-amber-300">Partially resolved</span> (part of the amount is
            refunded). The recorded outcome is shown against the deduction in the ledger above.
          </p>
          {recordedOutcomes.length > 0 ? (
            <div className="space-y-1">
              {recordedOutcomes.map((d) => (
                <div key={d.id} className="flex flex-wrap items-center gap-2 text-ds-label">
                  <span className={cn(MONO, 'text-zinc-400')}>{d.purchaseOrderId}</span>
                  <span className="text-zinc-500">{deductionTypeLabel(d.type)}</span>
                  <Badge className="text-ds-micro bg-white/[0.05] text-zinc-300 border-white/[0.08]">
                    outcome: {d.dispute?.outcome}
                  </Badge>
                  <span className="text-zinc-500">£{d.amountGbp.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-ds-label text-zinc-600">
              No dispute outcomes have been recorded on your account yet.
            </p>
          )}
        </div>
      </Card>
    </section>
  );
}

