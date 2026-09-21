/**
 * §Phase E4 — operational commerce simulation console (brand-facing).
 *
 * The MINIMUM UI needed to make the commerce lifecycle genuinely operable by a
 * brand: eligibility → simulated PO → acknowledgement → fulfilment → receiving
 * → simulated invoice → simulated payment → exceptions → dispute.
 *
 * Uses the EXISTING primitives (`Card`/`Badge`/`Button`) and the existing
 * derived-store re-render signal (`useCanonicalStoreVersion`). No new visual
 * language, no new layout system, no new store. Every record shown is labelled
 * `(sim)` because no live provider is contacted in this environment.
 */
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useCanonicalStoreVersion } from '@/data/queries';
import { demoPurchaseOrders, productsForBrandFromStore } from '@/data/demoStore';
import type { CommerceEligibility, PurchaseOrder } from '@/types';
import {
  acknowledgeCommercePurchaseOrder,
  createCommercePurchaseOrder,
  evaluateCommerceEligibility,
  fulfilCommercePurchaseOrder,
  getCommercePersistenceStatus,
  issueCommerceInvoice,
  listBrandCommerceActivity,
  listBrandCommerceExceptions,
  listBrandCommerceInvoices,
  listBrandCommercePayments,
  openCommerceDispute,
  raiseCommerceException,
  receiveCommercePurchaseOrder,
  recordCommercePayment,
  type CommerceActor,
  type CommerceResult,
} from '@/lib/commerce/commerceLifecycle';
import { Badge, Button, Card } from '@/components/ui';
import { cn } from '@/utils/cn';

const MONO = 'font-mono text-ds-label';

export function CommerceSimulationPanel() {
  const { session } = useApp();
  const version = useCanonicalStoreVersion();
  void version; // canonical store change signal → re-read derived rows

  const brandId = session?.tier === 'brand' ? session.tenantId ?? null : null;
  const actor = useMemo<CommerceActor>(
    () => ({ staffId: `brand:${brandId ?? 'none'}`, canMutate: true, tenantId: brandId ?? undefined }),
    [brandId]
  );

  const products = brandId ? productsForBrandFromStore(brandId) : [];
  const [sku, setSku] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(100);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<CommerceEligibility | null>(null);
  const [busy, setBusy] = useState(false);

  const effectiveSku = sku || products[0]?.sku || '';

  /** Eligibility is DERIVED (E3 readiness + latest submission), never assumed. */
  useEffect(() => {
    if (!brandId || !effectiveSku) {
      setEligibility(null);
      return;
    }
    let cancelled = false;
    void evaluateCommerceEligibility(brandId, effectiveSku, actor).then((res) => {
      if (!cancelled) setEligibility(res.ok ? res.value : null);
    });
    return () => {
      cancelled = true;
    };
  }, [brandId, effectiveSku, actor]);

  const product = products.find((p) => p.sku === effectiveSku);
  /** Only SIMULATED POs belong to this console — legacy/seed POs are untouched. */
  const simulatedPos = demoPurchaseOrders.filter(
    (p) => p.brandId === brandId && p.simulated === true
  );
  const po = simulatedPos.find((p) => p.originProductId === product?.id) ?? null;
  const invoices = brandId ? listBrandCommerceInvoices(brandId, actor) : null;
  const commerceInvoice =
    invoices?.ok && po ? invoices.value.find((i) => i.purchaseOrderId === po.id) ?? null : null;
  const payments = brandId ? listBrandCommercePayments(brandId, actor) : null;
  const activities = brandId ? listBrandCommerceActivity(brandId, actor) : null;
  const exceptions = brandId ? listBrandCommerceExceptions(brandId, actor) : null;
  const persistence = getCommercePersistenceStatus();

  /** ONE outcome handler for every domain call — keeps error reporting honest. */
  async function act<T>(
    label: string,
    run: () => Promise<CommerceResult<T>>,
    describe: (value: T) => string
  ) {
    if (!brandId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await run();
    setBusy(false);
    if (!res.ok) {
      setError(`${res.error}${res.reasons?.length ? ` — ${res.reasons.join('; ')}` : ''}`);
      return;
    }
    setNotice(`${label}: ${describe(res.value)}`);
  }

  if (!brandId) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Operational commerce simulation{' '}
            <Badge className="ml-1 text-ds-micro bg-brass-500/15 text-brass-400 border-brass-500/20">(sim)</Badge>
          </h3>
          <p className="text-ds-label text-zinc-500 mt-0.5">
            Simulated purchase orders, fulfilment, receiving, invoicing, payments and
            exceptions. No live provider is contacted and no email is sent.
          </p>
        </div>
        <Badge className="text-ds-micro bg-white/[0.05] text-zinc-400 border-white/[0.08]">
          persistence: {persistence.state} · durable {String(persistence.durable)}
        </Badge>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-ds-label text-zinc-500">
          Product
          <select
            value={effectiveSku}
            onChange={(e) => setSku(e.target.value)}
            className="block mt-1 bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1.5 text-xs text-zinc-300 max-w-[280px]"
          >
            {products.length === 0 && <option value="">No catalog products</option>}
            {products.map((p) => (
              <option key={p.sku} value={p.sku}>
                {p.sku} — {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-ds-label text-zinc-500">
          Units
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="block mt-1 w-24 bg-ink-900 border border-white/[0.08] rounded-md px-2 py-1.5 text-xs text-white"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          className="text-xs"
          data-state="commerce-raise-po"
          disabled={busy || !eligibility?.eligible || !!po}
          onClick={() =>
            act(
              'Raise simulated PO',
              () => createCommercePurchaseOrder(brandId, effectiveSku, quantity, actor),
              (p: PurchaseOrder) => `${p.poNumber} — ${p.status} (sim)`
            )
          }
        >
          Raise simulated PO
        </Button>
        <Button
          variant="ghost"
          className="text-xs"
          data-state="commerce-acknowledge"
          disabled={busy || !po || po.status !== 'received'}
          onClick={() =>
            po &&
            act(
              'Acknowledge',
              () => Promise.resolve(acknowledgeCommercePurchaseOrder(po.id, actor)),
              (p: PurchaseOrder) => `${p.poNumber} — ${p.status} (sim)`
            )
          }
        >
          Acknowledge
        </Button>
        <Button
          variant="ghost"
          className="text-xs"
          data-state="commerce-fulfil"
          disabled={busy || !po || (po.status !== 'accepted' && po.status !== 'ready_to_fulfil')}
          onClick={() =>
            po &&
            act(
              'Fulfil',
              () => Promise.resolve(fulfilCommercePurchaseOrder(po.id, actor)),
              (r: { po: PurchaseOrder; shipmentId: string }) => `${r.shipmentId} — PO ${r.po.status} (sim)`
            )
          }
        >
          Fulfil / ship
        </Button>
        <Button
          variant="ghost"
          className="text-xs"
          data-state="commerce-receive"
          disabled={busy || !po || (po.status !== 'shipped' && po.status !== 'ready_to_fulfil' && po.status !== 'accepted')}
          onClick={() =>
            po &&
            act(
              'Receive',
              () => Promise.resolve(receiveCommercePurchaseOrder(po.id, actor)),
              (r: { po: PurchaseOrder; shortfalls: unknown[] }) => `PO ${r.po.status}, ${r.shortfalls.length} shortfall(s) (sim)`
            )
          }
        >
          Receive
        </Button>
        <Button
          variant="ghost"
          className="text-xs"
          data-state="commerce-raise-exception"
          disabled={busy || !po || po.status !== 'delivered'}
          onClick={() =>
            po &&
            act(
              'Raise exception',
              () => Promise.resolve(raiseCommerceException(po.id, 'shortage_claim', 42.5, 'Simulated receiving discrepancy (demonstration)', actor)),
              (d: { id: string; type: string }) => `${d.id} — ${d.type} (sim)`
            )
          }
        >
          Raise exception
        </Button>
        <Button
          variant="ghost"
          className="text-xs"
          data-state="commerce-issue-invoice"
          disabled={busy || !po || po.status !== 'delivered' || !!commerceInvoice}
          onClick={() =>
            po &&
            act(
              'Issue simulated invoice',
              () => Promise.resolve(issueCommerceInvoice(po.id, actor)),
              (i: { number: string; subtotalGbp: number }) => `${i.number} — £${i.subtotalGbp.toFixed(2)} (sim)`
            )
          }
        >
          Issue invoice
        </Button>
        <Button
          variant="ghost"
          className="text-xs"
          data-state="commerce-record-payment"
          disabled={busy || !commerceInvoice || commerceInvoice.status === 'paid'}
          onClick={() =>
            commerceInvoice &&
            act(
              'Record simulated payment',
              () => Promise.resolve(recordCommercePayment(commerceInvoice.id, actor)),
              (p: { amountGbp: number; invoiceId: string }) => `£${p.amountGbp.toFixed(2)} settled against ${p.invoiceId} (sim)`
            )
          }
        >
          Record payment
        </Button>
      </div>

      {eligibility && (
        <div
          className={cn(
            'rounded-lg p-3 text-ds-label border',
            eligibility.eligible
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
              : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
          )}
        >
          {eligibility.eligible ? (
            <>
              Eligible for the commerce simulation — catalog submission state:{' '}
              {eligibility.submissionStatus ?? 'none'}.
            </>
          ) : (
            <>
              <span className="font-semibold">Not eligible:</span>{' '}
              {eligibility.reasons.join(' ')}
            </>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-ds-label text-red-200">
          {error}
        </div>
      )}
      {notice && (
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 text-ds-label text-sky-200">
          {notice}
        </div>
      )}

      {po && (
        <div className="rounded-lg border border-white/[0.06] bg-ink-850/60 p-3 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(MONO, 'text-brass')}>{po.poNumber}</span>
            <Badge className="text-ds-micro bg-white/[0.05] text-zinc-300 border-white/[0.08]">{po.status}</Badge>
            <Badge className="text-ds-micro bg-brass-500/15 text-brass-400 border-brass-500/20">(sim)</Badge>
            <span className="text-ds-micro text-zinc-500">
              £{po.poValue.toFixed(2)} · {po.lineItems.length} line(s)
            </span>
          </div>
          <div className="text-ds-micro text-zinc-500">
            {po.lineItems
              .map(
                (l) =>
                  `${l.sku} ×${l.quantity} (ack ${l.ackStatus ?? 'pending'}${
                    l.receivedQty !== undefined ? `, received ${l.receivedQty}` : ''
                  })`
              )
              .join(' · ')}
          </div>
        </div>
      )}

      {commerceInvoice && (
        <div className="rounded-lg border border-white/[0.06] bg-ink-850/60 p-3 text-ds-label space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(MONO, 'text-brass')}>{commerceInvoice.number}</span>
            <Badge className="text-ds-micro bg-white/[0.05] text-zinc-300 border-white/[0.08]">
              {commerceInvoice.status}
            </Badge>
            <Badge className="text-ds-micro bg-brass-500/15 text-brass-400 border-brass-500/20">(sim)</Badge>
            <span className="text-zinc-400">£{commerceInvoice.subtotalGbp.toFixed(2)}</span>
          </div>
          {commerceInvoice.lines.map((l) => (
            <div key={l.description} className="text-ds-micro text-zinc-500">
              {l.description} — £{l.amountGbp.toFixed(2)}
            </div>
          ))}
          {payments?.ok &&
            payments.value
              .filter((p) => p.invoiceId === commerceInvoice.id)
              .map((p) => (
                <div key={p.id} className="text-ds-micro text-emerald-300">
                  (sim) payment {p.id} — £{p.amountGbp.toFixed(2)} {p.status} via {p.method}
                </div>
              ))}
        </div>
      )}

      {exceptions?.ok && exceptions.value.length > 0 && (
        <div className="space-y-1">
          <p className="text-ds-micro uppercase tracking-wide text-zinc-500">
            Exceptions (chargebacks)
          </p>
          {exceptions.value.slice(0, 6).map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-2 text-ds-label">
              <span className={cn(MONO, 'text-zinc-400')}>{d.id}</span>
              <Badge className="text-ds-micro bg-white/[0.05] text-zinc-300 border-white/[0.08]">{d.type}</Badge>
              <Badge className="text-ds-micro bg-white/[0.05] text-zinc-300 border-white/[0.08]">{d.status}</Badge>
              <span className="text-zinc-500">
                £{d.amountGbp.toFixed(2)} · {d.purchaseOrderId}
              </span>
              {d.simulated && <span className="text-ds-micro text-brass-400">(sim)</span>}
              {!d.dispute && (
                <Button
                  variant="ghost"
                  className="text-ds-micro px-2 py-0.5"
                  data-state="commerce-open-dispute"
                  disabled={busy}
                  onClick={() =>
                    act(
                      'Open dispute',
                      () =>
                        Promise.resolve(
                          openCommerceDispute(
                            d.id,
                            'Simulated dispute opened from the brand console',
                            actor
                          )
                        ),
                      (x: { id: string; status: string }) => `${x.id} — ${x.status} (sim)`
                    )
                  }
                >
                  Dispute
                </Button>
              )}
              {d.dispute && d.status === 'disputed' && (
                /*
                 * §Phase E2E — the brand EVIDENCES a dispute but never declares
                 * its outcome. Resolution is a Mercenta operations decision (see
                 * `resolveCommerceDispute`), so the brand surface states that
                 * truthfully instead of offering a self-award control.
                 */
                <span
                  className="text-ds-micro text-amber-300/90"
                  data-state="commerce-dispute-awaiting-operations"
                >
                  Awaiting Mercenta operations decision
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {activities?.ok && activities.value.length > 0 && (
        <div className="space-y-1">
          <p className="text-ds-micro uppercase tracking-wide text-zinc-500">
            Operational activity trail
          </p>
          <div className="max-h-56 overflow-auto divide-y divide-white/[0.04]">
            {[...activities.value].reverse().map((a) => (
              <div key={a.id} className="py-1 text-ds-label text-zinc-400">
                <span className="text-zinc-500">{a.at.slice(11, 19)}</span>{' '}
                <span className={cn(MONO, 'text-zinc-300')}>{a.type}</span>{' '}
                <span className="text-zinc-500">[{a.status}]</span> {a.detail}
                {a.simulated && <span className="text-ds-micro text-brass-400"> (sim)</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
