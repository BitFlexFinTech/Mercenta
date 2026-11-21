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
import { demoPurchaseOrders, getAllCommerceInvoicesForPo, getCommerceInvoiceForPo } from '@/data/demoStore';
import type { CommerceInvoice, InvoiceTermDays, PurchaseOrder } from '@/types';
/** §P13 / S7 — which statuses owe an acknowledgement has ONE owner (the config). */
import { PO_ACK_STATUSES_WITH_OBLIGATION } from '@/config/purchaseOrders';
import { INVOICE_TERM_CHOICES, INVOICE_TERM_DAYS, invoiceDueDate, invoiceTermDays } from '@/lib/commerce/invoiceTerms';
import { INVOICE_NUMBER_RULES } from '@/lib/commerce/invoiceRegistry';
import { deriveReceivingStatus, RECEIVING_STATUS_LABELS } from '@/lib/commerce/receivingStatus';
/**
 * §S9 — the receipt → invoice automation is stated from its ONE owner (the
 * statement, the outcome wording and the automatic identity are never re-typed
 * here).
 */
import {
  receiptInvoiceAutomationSummary,
  RECEIPT_INVOICE_AUTOMATION_STATEMENT,
} from '@/lib/commerce/receiptInvoiceAutomation';
import type { ReceiptInvoiceAutomationOutcome } from '@/lib/commerce/receiptInvoiceAutomation';
import {
  acknowledgeCommercePurchaseOrder,
  cancelCommerceInvoice,
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

const MONO = 'font-mono text-ds-label';

/**
 * §S9 — the receipt result's automation fields, as this surface needs them: the
 * outcome is READ from the canonical result, never re-derived here.
 */
type ReceiveInvoiceResult = {
  po: PurchaseOrder;
  shortfalls: unknown[];
  invoiceAutomation: ReceiptInvoiceAutomationOutcome;
};

/**
 * §Phase E5 — the legitimate next actions for a simulated PO, in order.
 *
 * §P13 / S7 — `ack` reads the CONFIG-owned obligation family instead of re-typing
 * `'received' || 'under_review'`: which statuses owe an acknowledgement has ONE
 * owner (`src/config/purchaseOrders.ts → PO_ACK_STATUSES_WITH_OBLIGATION`, the same
 * input the window owner consumes). The value is unchanged.
 */
function nextActionsFor(
  po: Pick<PurchaseOrder, 'status'>,
  hasInvoice: boolean,
  invoicePaid: boolean
) {
  return {
    ack: PO_ACK_STATUSES_WITH_OBLIGATION.includes(po.status),
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

  /**
   * §P7 — the terms chosen for each PO BEFORE its invoice is issued (`14/30/60`
   * — programme decision 2). Held as ONE map, never as a hook inside the row
   * loop: a hook in a loop is a rules-of-hooks violation, and the terms are
   * per-PO UI state rather than component state.
   */
  const [termChoice, setTermChoice] = useState<Record<string, InvoiceTermDays>>({});
  /** §P7 — the STATED cancellation reason per PO (required by `AV-022`). */
  const [cancelReason, setCancelReason] = useState<Record<string, string>>({});

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
          <h3 className="text-sm font-semibold text-strong">
            Operational commerce{' '}
            <Badge className="ml-1 text-ds-micro bg-accent-500/15 text-accent-400 border-accent-500/20">
              (sim)
            </Badge>
          </h3>
          <p className="text-ds-label text-muted mt-0.5">
            Simulated purchase orders, shipments, receiving, invoices, payments and
            exceptions across every tenant. No live provider is contacted.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="text-ds-micro bg-tint text-strong border-hairline">
            {activityRows.length} activity step(s) · {simulatedCount} simulated
          </Badge>
          <Badge className="text-ds-micro bg-tint text-muted border-hairline">
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
          <p className="text-ds-micro uppercase tracking-wide text-muted">
            Operable simulated purchase orders ({simulatedPos.length})
          </p>
          {!canCurrentUserMutate && (
            <span className="text-ds-micro text-faint">
              view-only staff — the domain refuses every mutation
            </span>
          )}
        </div>

        {simulatedPos.length === 0 && (
          <p className="text-ds-label text-faint">
            No simulated purchase orders yet. A brand raises one from Purchase Orders →
            “Operational commerce simulation”.
          </p>
        )}

        {simulatedPos.map((po) => {
          /* §P7 — `getCommerceInvoiceForPo` returns the invoice still IN FORCE. A
             cancelled invoice therefore does not count as "has an invoice", so the
             PO can be corrected under a NEW number (`AV-022`). */
          const invoice = getCommerceInvoiceForPo(po.id);
          const activeInvoice = invoice && invoice.status !== 'cancelled' ? invoice : undefined;
          const n = nextActionsFor(po, !!activeInvoice, activeInvoice?.status === 'paid');
          const busy = busyId === po.id;
          const receiving = deriveReceivingStatus(po);
          const chosenTerms = termChoice[po.id] ?? INVOICE_TERM_DAYS;
          const journal = getAllCommerceInvoicesForPo(po.id);
          const cancelledInvoice = journal.find((i) => i.status === 'cancelled');
          const reason = cancelReason[po.id] ?? '';
          return (
            <div key={po.id} className="rounded-ds-md border border-hairline bg-surface-raised/60 p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn(MONO, 'text-accent')}>{po.poNumber}</span>
                <span className="text-ds-micro text-muted">{po.brandId}</span>
                <Badge className="text-ds-micro bg-tint text-strong border-hairline">
                  {po.status}
                </Badge>
                <Badge className="text-ds-micro bg-accent-500/15 text-accent-400 border-accent-500/20">(sim)</Badge>
                <span className="text-ds-micro text-muted">£{po.poValue.toFixed(2)}</span>
                {/* §P7 — the channel's receiving status, derived from the received
                    quantities. An unreceived PO cannot be invoiced (AV-018). */}
                <span data-state="admin-commerce-receiving-status">
                  <Badge
                    className={cn(
                      'text-ds-micro border-hairline',
                      receiving === 'received'
                        ? 'bg-state-success/10 text-state-success'
                        : receiving === 'partially_received'
                          ? 'bg-state-warning/10 text-state-warning'
                          : 'bg-tint text-muted'
                    )}
                  >
                    receiving: {RECEIVING_STATUS_LABELS[receiving]}
                  </Badge>
                </span>
                {invoice && (
                  <span data-state="admin-commerce-invoice-terms" className="text-ds-micro text-muted">
                    · {invoice.number} ({invoice.status}){invoice.status !== 'cancelled' && (
                      <> · {invoiceTermDays(invoice)}-day terms · due {invoiceDueDate(invoice)} (derived)</>
                    )}
                  </span>
                )}
                {cancelledInvoice && (
                  <span data-state="admin-commerce-cancelled-note" className="text-ds-micro text-state-warning/80">
                    · {cancelledInvoice.number} cancelled{cancelledInvoice.cancellationReason ? `: ${cancelledInvoice.cancellationReason}` : ''} —
                    the number stays consumed; the correction needs a NEW Invoice ID
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {/* §S9 — the terms the invoice will carry, chosen HERE (14/30/60).
                    REPOINTED (the old contract recorded): this control used to be
                    enabled only on a DELIVERED PO, because the invoice was a
                    separate manual step performed after receipt. The receipt now
                    RAISES the invoice, so the choice is made AT THE RECEIPT and the
                    control is offered exactly while an invoice can still be raised
                    — disabled once one is in force, because an issued invoice's
                    terms are its own and AV-022's correction is a cancellation,
                    never an edit. */}
                <select
                  data-state="admin-commerce-terms-select"
                  aria-label={`Payment terms for ${po.poNumber} — carried on the invoice raised at receipt`}
                  className="text-ds-label rounded-ds-sm border border-hairline bg-surface-raised px-2 py-1 text-strong disabled:opacity-50"
                  value={chosenTerms}
                  disabled={busy || !!activeInvoice || !(n.receive || n.invoice)}
                  onChange={(e) =>
                    setTermChoice((prev) => ({
                      ...prev,
                      [po.id]: Number(e.target.value) as InvoiceTermDays,
                    }))
                  }
                >
                  {INVOICE_TERM_CHOICES.map((t) => (
                    <option key={t} value={t}>
                      {t}-day terms
                    </option>
                  ))}
                </select>
                <Button
                  className="text-ds-label"
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
                  className="text-ds-label"
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
                  className="text-ds-label"
                  data-state="admin-commerce-receive"
                  disabled={busy || !n.receive}
                  onClick={() =>
                    /* §S9 — the receipt RAISES the invoice: the terms chosen above
                       travel with it, and the outcome (raised / already in force /
                       refused) is STATED rather than implied. */
                    run(
                      po.id,
                      'Receive',
                      () =>
                        receiveCommercePurchaseOrder(po.id, actor, undefined, {
                          termDays: chosenTerms,
                        }),
                      (r: ReceiveInvoiceResult) =>
                        `PO ${r.po.status}, ${r.shortfalls.length} shortfall(s) — ${receiptInvoiceAutomationSummary(r.invoiceAutomation)}`
                    )
                  }
                >
                  Receive
                </Button>
                {/* §S9 — the MANUAL issue is now the FALLBACK, not the happy path:
                    a PO received outside the automation, and AV-022's correction
                    path (cancel, then re-issue under a NEW Invoice ID). */}
                <Button
                  variant="ghost"
                  className="text-ds-label"
                  data-state="admin-commerce-issue-invoice"
                  disabled={busy || !n.invoice}
                  onClick={() =>
                    run(po.id, 'Issue simulated invoice', () => issueCommerceInvoice(po.id, actor, { termDays: chosenTerms }), (i: CommerceInvoice) => `${i.number} — £${i.subtotalGbp.toFixed(2)} · ${invoiceTermDays(i)}-day terms, due ${invoiceDueDate(i)} (derived, sim)`)
                  }
                >
                  Issue invoice
                </Button>
                <Button
                  variant="ghost"
                  className="text-ds-label"
                  data-state="admin-commerce-record-payment"
                  disabled={busy || !n.pay || !activeInvoice}
                  onClick={() =>
                    activeInvoice &&
                    run(po.id, 'Record simulated payment', () => recordCommercePayment(activeInvoice.id, actor), (p: { amountGbp: number; invoiceId: string }) => `£${p.amountGbp.toFixed(2)} against ${p.invoiceId} (sim)`)
                  }
                >
                  Record payment
                </Button>
                {/* §P7 / AV-022 — a WRONG invoice is cancelled (with a stated
                    reason) and re-issued under a NEW number. The old number stays
                    consumed for ever, which is why the registry exists. */}
                {activeInvoice && (
                  <>
                    <input
                      data-state="admin-commerce-cancel-reason"
                      aria-label={`Cancellation reason for ${activeInvoice.number}`}
                      className="text-ds-label rounded-ds-sm border border-hairline bg-surface-raised px-2 py-1 text-strong placeholder:text-faint"
                      placeholder="Cancellation reason (required)"
                      value={reason}
                      disabled={busy}
                      onChange={(e) =>
                        setCancelReason((prev) => ({ ...prev, [po.id]: e.target.value }))
                      }
                    />
                    <Button
                      variant="ghost"
                      className="text-ds-label"
                      data-state="admin-commerce-cancel-invoice"
                      disabled={busy || reason.trim().length === 0}
                      onClick={() =>
                        run(
                          po.id,
                          'Cancel simulated invoice',
                          () => cancelCommerceInvoice(activeInvoice.id, actor, reason),
                          (i: CommerceInvoice) =>
                            `${i.number} cancelled — the number stays consumed for ever (AV-022)`
                        )
                      }
                    >
                      Cancel invoice
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  className="text-ds-label"
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
        <div className="bg-state-danger/10 border border-state-danger/20 rounded-ds-md p-3 text-ds-label text-state-danger">{error}</div>
      )}
      {notice && (
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-ds-md p-3 text-ds-label text-state-info">{notice}</div>
      )}

      {activityRows.length === 0 ? (
        <p className="text-ds-label text-muted">
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
                <span className="font-mono text-muted whitespace-nowrap">{a.at.slice(11, 19)}</span>
              ),
            },
            {
              key: 'brandId',
              label: 'Brand',
              render: (a) => <span className={cn(MONO, 'text-strong whitespace-nowrap')}>{a.brandId}</span>,
            },
            {
              key: 'type',
              label: 'Step',
              primary: true,
              render: (a) => <span className={cn(MONO, 'text-strong')}>{a.type}</span>,
            },
            {
              key: 'status',
              label: 'State',
              render: (a) => (
                <Badge className="text-ds-micro bg-tint text-strong border-hairline">
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
                  <span className="text-ds-micro text-accent-400">(sim)</span>
                ) : (
                  <span className="text-ds-micro text-muted">live</span>
                ),
            },
          ]}
        />
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <p className="text-ds-micro uppercase tracking-wide text-muted">
            Simulated invoices ({invoices.ok ? invoices.value.length : 0})
          </p>
          {invoices.ok && invoices.value.length === 0 && (
            <p className="text-ds-label text-faint">None issued yet.</p>
          )}
          {invoices.ok &&
            invoices.value.slice(0, 5).map((i) => (
              <div key={i.id} className="text-ds-label text-muted">
                <span className={cn(MONO, 'text-accent')}>{i.number}</span> · {i.brandId} ·{' '}
                <Badge className="text-ds-micro bg-tint text-strong border-hairline">
                  {i.status}
                </Badge>{' '}
                £{i.subtotalGbp.toFixed(2)}
                {i.status !== 'cancelled' && (
                  <>
                    {' '}· {invoiceTermDays(i)}d terms · due {invoiceDueDate(i)}{' '}
                    <span className="text-ds-micro text-faint">(derived)</span>
                  </>
                )}{' '}
                <span className="text-ds-micro text-accent-400">(sim)</span>
              </div>
            ))}
          {/* §P7 / AV-022 — the invoice-number rules, stated where the numbers
              are handled (they are the reason this ledger is append-only). */}
          <ul data-state="admin-invoice-number-rules" className="mt-1 space-y-0.5">
            {INVOICE_NUMBER_RULES.map((rule) => (
              <li key={rule} className="text-ds-micro text-faint">
                {rule}
              </li>
            ))}
          </ul>
          {/* §S9 — the receipt → invoice automation, stated from its ONE owner. */}
          <ul data-state="admin-receipt-invoice-automation" className="mt-2 space-y-0.5">
            {[
              RECEIPT_INVOICE_AUTOMATION_STATEMENT.headline,
              RECEIPT_INVOICE_AUTOMATION_STATEMENT.mercentaProcess,
              RECEIPT_INVOICE_AUTOMATION_STATEMENT.terms,
              RECEIPT_INVOICE_AUTOMATION_STATEMENT.correction,
            ].map((line) => (
              <li key={line} className="text-ds-micro text-faint">
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-1">
          <p className="text-ds-micro uppercase tracking-wide text-muted">
            Simulated payments ({payments.ok ? payments.value.length : 0})
          </p>
          {payments.ok && payments.value.length === 0 && (
            <p className="text-ds-label text-faint">None recorded yet.</p>
          )}
          {payments.ok &&
            payments.value.slice(0, 5).map((p) => (
              <div key={p.id} className="text-ds-label text-muted">
                <span className={MONO}>{p.invoiceId}</span> · {p.brandId} · £
                {p.amountGbp.toFixed(2)} · {p.method}{' '}
                <span className="text-ds-micro text-accent-400">(sim)</span>
              </div>
            ))}
        </div>

        <div className="space-y-1">
          <p className="text-ds-micro uppercase tracking-wide text-muted">
            Exceptions / chargebacks ({exceptions.ok ? exceptions.value.length : 0})
          </p>
          {exceptions.ok && exceptions.value.length === 0 && (
            <p className="text-ds-label text-faint">None raised yet.</p>
          )}
          {exceptions.ok &&
            exceptions.value.slice(0, 5).map((d) => (
              <div key={d.id} className="text-ds-label text-muted">
                <span className={MONO}>{d.id}</span> · {d.brandId} · {d.type} ·{' '}
                <Badge className="text-ds-micro bg-tint text-strong border-hairline">
                  {d.status}
                </Badge>{' '}
                £{d.amountGbp.toFixed(2)}
                {d.simulated && <span className="text-ds-micro text-accent-400"> (sim)</span>}
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
                    <span className="text-ds-micro text-muted">Resolve:</span>
                    {(['won', 'partial', 'lost'] as const).map((outcome) => (
                      <Button
                        key={outcome}
                        variant="ghost"
                        className="text-ds-micro px-2 py-0.5"
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
