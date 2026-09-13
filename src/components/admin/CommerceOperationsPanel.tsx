/**
 * §Phase E4 → §Phase E5 — operational commerce (admin-facing, OPERABLE).
 *
 * E4 created the canonical operational lifecycle; E5 makes it **admin-operable**
 * through the EXISTING domain (`commerceLifecycle`) behind the EXISTING
 * `CommerceActor` (RBAC + tenant guard in the domain — never UI-only).
 *
 * The panel reads the SAME canonical stores the domain writes (no second store,
 * no re-derived operational state) and shows:
 *   - simulated POs with their legitimate next actions (G1)
 *   - case opening on the existing helpdesk model via `openCommerceCase` (G8)
 *   - the canonical activity trail, invoices, payments and exceptions (E4)
 * All provenance remains truthful: every record is labelled `(sim)`.
 */
import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useCanonicalStoreVersion } from '@/data/queries';
import { demoPurchaseOrders, getCommerceInvoiceForPo } from '@/data/demoStore';
import type { PurchaseOrder } from '@/types';
import {
  acknowledgeCommercePurchaseOrder,
  fulfilCommercePurchaseOrder,
  getCommercePersistenceStatus,
  issueCommerceInvoice,
  listAllCommerceActivity,
  listAllCommerceExceptions,
  listAllCommerceInvoices,
  listAllCommercePayments,
  openCommerceCase,
  receiveCommercePurchaseOrder,
  recordCommercePayment,
  // §Phase E2E — operator-only dispute resolution (a brand may not declare its
  // own outcome; see commerceLifecycle.resolveCommerceDispute).
  resolveCommerceDispute,
  type CommerceActor,
  type CommerceResult,
} from '@/lib/commerce/commerceLifecycle';
import { Badge, Button, Card, DataTable } from '@/components/ui';
import { cn } from '@/utils/cn';

const MONO = 'font-mono text-[11px]';

/** §Phase E5 — the legitimate next actions for a simulated PO, in order. */
function nextActionsFor(po: { status: string }, hasInvoice: boolean, invoicePaid: boolean) {
  return {
    ack: po.status === 'received' || po.status === 'under_review',
    fulfil: po.status === 'accepted' || po.status === 'ready_to_fulfil',
    receive: po.status === 'shipped' || po.status === 'ready_to_fulfil',
    invoice: po.status === 'delivered' && !hasInvoice,
    pay: hasInvoice && !invoicePaid,
  };
}

export function CommerceOperationsPanel() {
  const { actingStaffId, canCurrentUserMutate } = useApp();
  const version = useCanonicalStoreVersion();
  void version; // canonical store change signal → re-read the derived rows

  const actor = useMemo<CommerceActor>(
    () => ({ staffId: actingStaffId, canMutate: canCurrentUserMutate }),
    [actingStaffId, canCurrentUserMutate]
  );

  const activities = listAllCommerceActivity(actor);
  const invoices = listAllCommerceInvoices(actor);
  const payments = listAllCommercePayments(actor);
  const exceptions = listAllCommerceExceptions(actor);
  const persistence = getCommercePersistenceStatus();

  const activityRows = activities.ok ? [...activities.value].reverse() : [];
  const simulatedCount = activityRows.filter((a) => a.simulated).length;

  /** §Phase E5 (G1) — only SIMULATED POs belong to the commerce simulation. */
  const simulatedPos = demoPurchaseOrders.filter((p) => p.simulated === true);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * ONE outcome handler for every domain call. The refusal text is whatever the
   * DOMAIN returned (`CROSS_TENANT` / `FORBIDDEN` / `ILLEGAL_TRANSITION`), so a
   * refused action is never silently swallowed.
   */
  function run<T>(poId: string, label: string, fn: () => CommerceResult<T>, describe: (v: T) => string) {
    setBusyId(poId);
    setError(null);
    setNotice(null);
    const res = fn();
    setBusyId(null);
    if (!res.ok) {
      setError(`${label}: ${res.error}${res.reasons?.length ? ` — ${res.reasons.join('; ')}` : ''}`);
      return;
    }
    setNotice(`${label}: ${describe(res.value)}`);
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Operational commerce{' '}
            <Badge className="ml-1 text-[9px] bg-brass-500/15 text-brass-400 border-brass-500/20">
              (sim)
            </Badge>
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Simulated purchase orders, shipments, receiving, invoices, payments and
            exceptions across every tenant. No live provider is contacted.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="text-[9px] bg-white/[0.05] text-zinc-300 border-white/[0.08]">
            {activityRows.length} activity step(s) · {simulatedCount} simulated
          </Badge>
          <Badge className="text-[9px] bg-white/[0.05] text-zinc-400 border-white/[0.08]">
            persistence: {persistence.state} · durable {String(persistence.durable)}
          </Badge>
        </div>
      </div>

      {/* ── §Phase E5 (G1/G8) — ADMIN OPERATION of the simulated lifecycle ──
          Every action below calls the CANONICAL domain function with the
          admin `CommerceActor`. RBAC and tenant scope are enforced INSIDE the
          domain; the disabled state is an affordance, never the authorisation. */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            Operable simulated purchase orders ({simulatedPos.length})
          </p>
          {!canCurrentUserMutate && (
            <span className="text-[10px] text-zinc-600">
              view-only staff — the domain refuses every mutation
            </span>
          )}
        </div>

        {simulatedPos.length === 0 && (
          <p className="text-[11px] text-zinc-600">
            No simulated purchase orders yet. A brand raises one from Purchase Orders →
            “Operational commerce simulation”.
          </p>
        )}

        {simulatedPos.map((po) => {
          const invoice = getCommerceInvoiceForPo(po.id);
          const n = nextActionsFor(po, !!invoice, invoice?.status === 'paid');
          const busy = busyId === po.id;
          return (
            <div key={po.id} className="rounded-lg border border-white/[0.06] bg-ink-850/60 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn(MONO, 'text-brass')}>{po.poNumber}</span>
                <span className="text-[10px] text-zinc-500">{po.brandId}</span>
                <Badge className="text-[9px] bg-white/[0.05] text-zinc-300 border-white/[0.08]">
                  {po.status}
                </Badge>
                <Badge className="text-[9px] bg-brass-500/15 text-brass-400 border-brass-500/20">(sim)</Badge>
                <span className="text-[10px] text-zinc-500">£{po.poValue.toFixed(2)}</span>
                {invoice && (
                  <span className="text-[10px] text-zinc-500">
                    · {invoice.number} ({invoice.status})
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  className="text-[11px]"
                  data-state="admin-commerce-acknowledge"
                  disabled={busy || !n.ack}
                  onClick={() =>
                    run(po.id, 'Acknowledge', () => acknowledgeCommercePurchaseOrder(po.id, actor), (p: PurchaseOrder) => `${p.poNumber} — ${p.status} (sim)`)
                  }
                >
                  Acknowledge
                </Button>
                <Button
                  variant="ghost"
                  className="text-[11px]"
                  data-state="admin-commerce-fulfil"
                  disabled={busy || !n.fulfil}
                  onClick={() =>
                    run(po.id, 'Fulfil', () => fulfilCommercePurchaseOrder(po.id, actor), (r: { po: PurchaseOrder; shipmentId: string }) => `${r.shipmentId} — PO ${r.po.status} (sim)`)
                  }
                >
                  Fulfil / ship
                </Button>
                <Button
                  variant="ghost"
                  className="text-[11px]"
                  data-state="admin-commerce-receive"
                  disabled={busy || !n.receive}
                  onClick={() =>
                    run(po.id, 'Receive', () => receiveCommercePurchaseOrder(po.id, actor), (r: { po: PurchaseOrder; shortfalls: unknown[] }) => `PO ${r.po.status}, ${r.shortfalls.length} shortfall(s) (sim)`)
                  }
                >
                  Receive
                </Button>
                <Button
                  variant="ghost"
                  className="text-[11px]"
                  data-state="admin-commerce-issue-invoice"
                  disabled={busy || !n.invoice}
                  onClick={() =>
                    run(po.id, 'Issue simulated invoice', () => issueCommerceInvoice(po.id, actor), (i: { number: string; subtotalGbp: number }) => `${i.number} — £${i.subtotalGbp.toFixed(2)} (sim)`)
                  }
                >
                  Issue invoice
                </Button>
                <Button
                  variant="ghost"
                  className="text-[11px]"
                  data-state="admin-commerce-record-payment"
                  disabled={busy || !n.pay || !invoice}
                  onClick={() =>
                    invoice &&
                    run(po.id, 'Record simulated payment', () => recordCommercePayment(invoice.id, actor), (p: { amountGbp: number; invoiceId: string }) => `£${p.amountGbp.toFixed(2)} against ${p.invoiceId} (sim)`)
                  }
                >
                  Record payment
                </Button>
                <Button
                  variant="ghost"
                  className="text-[11px]"
                  data-state="admin-commerce-open-case"
                  disabled={busy}
                  onClick={() =>
                    run(po.id, 'Open case', () => openCommerceCase(po.id, 'Operational review requested (sim)', actor), (r: { ticketId: string }) => `case ${r.ticketId}`)
                  }
                >
                  Open case
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-[11px] text-red-200">{error}</div>
      )}
      {notice && (
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 text-[11px] text-sky-200">{notice}</div>
      )}

      {activityRows.length === 0 ? (
        <p className="text-[11px] text-zinc-500">
          No operational commerce activity yet. A brand drives the lifecycle from
          Purchase Orders → “Operational commerce simulation”.
        </p>
      ) : (
        /* §Phase D — canonical DataTable: the full activity trail is readable on
           a phone as labelled cards (state, detail and mode never clipped). */
        <DataTable
          dataTable="commerce-activity"
          caption="Operational commerce activity"
          rows={activityRows}
          rowKey={(a) => a.id}
          columns={[
            {
              key: 'at',
              label: 'Time',
              hideBelow: 'lg',
              render: (a) => (
                <span className="font-mono text-zinc-500 whitespace-nowrap">{a.at.slice(11, 19)}</span>
              ),
            },
            {
              key: 'brandId',
              label: 'Brand',
              render: (a) => <span className={cn(MONO, 'text-zinc-300 whitespace-nowrap')}>{a.brandId}</span>,
            },
            {
              key: 'type',
              label: 'Step',
              primary: true,
              render: (a) => <span className={cn(MONO, 'text-zinc-300')}>{a.type}</span>,
            },
            {
              key: 'status',
              label: 'State',
              render: (a) => (
                <Badge className="text-[9px] bg-white/[0.05] text-zinc-300 border-white/[0.08]">
                  {a.status}
                </Badge>
              ),
            },
            {
              key: 'detail',
              label: 'Detail',
              render: (a) => <span>{a.detail}</span>,
            },
            {
              key: 'simulated',
              label: 'Mode',
              render: (a) =>
                a.simulated ? (
                  <span className="text-[9px] text-brass-400">(sim)</span>
                ) : (
                  <span className="text-[9px] text-zinc-500">live</span>
                ),
            },
          ]}
        />
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            Simulated invoices ({invoices.ok ? invoices.value.length : 0})
          </p>
          {invoices.ok && invoices.value.length === 0 && (
            <p className="text-[11px] text-zinc-600">None issued yet.</p>
          )}
          {invoices.ok &&
            invoices.value.slice(0, 5).map((i) => (
              <div key={i.id} className="text-[11px] text-zinc-400">
                <span className={cn(MONO, 'text-brass')}>{i.number}</span> · {i.brandId} ·{' '}
                <Badge className="text-[9px] bg-white/[0.05] text-zinc-300 border-white/[0.08]">
                  {i.status}
                </Badge>{' '}
                £{i.subtotalGbp.toFixed(2)} <span className="text-[9px] text-brass-400">(sim)</span>
              </div>
            ))}
        </div>

        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            Simulated payments ({payments.ok ? payments.value.length : 0})
          </p>
          {payments.ok && payments.value.length === 0 && (
            <p className="text-[11px] text-zinc-600">None recorded yet.</p>
          )}
          {payments.ok &&
            payments.value.slice(0, 5).map((p) => (
              <div key={p.id} className="text-[11px] text-zinc-400">
                <span className={MONO}>{p.invoiceId}</span> · {p.brandId} · £
                {p.amountGbp.toFixed(2)} · {p.method}{' '}
                <span className="text-[9px] text-brass-400">(sim)</span>
              </div>
            ))}
        </div>

        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">
            Exceptions / chargebacks ({exceptions.ok ? exceptions.value.length : 0})
          </p>
          {exceptions.ok && exceptions.value.length === 0 && (
            <p className="text-[11px] text-zinc-600">None raised yet.</p>
          )}
          {exceptions.ok &&
            exceptions.value.slice(0, 5).map((d) => (
              <div key={d.id} className="text-[11px] text-zinc-400">
                <span className={MONO}>{d.id}</span> · {d.brandId} · {d.type} ·{' '}
                <Badge className="text-[9px] bg-white/[0.05] text-zinc-300 border-white/[0.08]">
                  {d.status}
                </Badge>{' '}
                £{d.amountGbp.toFixed(2)}
                {d.simulated && <span className="text-[9px] text-brass-400"> (sim)</span>}
                {/*
                 * §Phase E2E — operator resolution. The outcome of a disputed
                 * deduction is a Mercenta operations decision, so it is made
                 * HERE (unpinned operator actor), never by the brand. Each
                 * outcome writes the real canonical state via the domain.
                 */}
                {d.status === 'disputed' && (
                  <span
                    className="ml-2 inline-flex flex-wrap items-center gap-1"
                    data-state="commerce-operator-dispute"
                    data-deduction={d.id}
                  >
                    <span className="text-[10px] text-zinc-500">Resolve:</span>
                    {(['won', 'partial', 'lost'] as const).map((outcome) => (
                      <Button
                        key={outcome}
                        variant="ghost"
                        className="text-[10px] px-2 py-0.5"
                        data-state={`commerce-operator-resolve-${outcome}`}
                        disabled={busyId === d.id || !canCurrentUserMutate}
                        onClick={() =>
                          run(
                            d.id,
                            `Resolve dispute (${outcome})`,
                            () => resolveCommerceDispute(d.id, outcome, actor),
                            (x) => `${x.id} — ${x.status} · outcome ${x.dispute?.outcome ?? 'n/a'}`
                          )
                        }
                      >
                        {outcome}
                      </Button>
                    ))}
                  </span>
                )}
              </div>
            ))}
        </div>
      </div>
    </Card>
  );
}
