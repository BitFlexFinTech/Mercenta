/**
 * §Phase E4 — operational commerce overview (admin-facing).
 *
 * The admin surface required to OPERATE the commerce simulation: which brand,
 * which PO, fulfilment/shipment state, receiving, invoice/payment state,
 * exceptions — every row labelled with its truthful simulation provenance.
 *
 * Read-only by design: the mutations live in the domain (`commerceLifecycle`)
 * behind tenant + RBAC guards, and are driven from the brand console and the
 * domain API. This panel never re-derives or duplicates operational state; it
 * reads the SAME canonical activity trail the domain writes.
 */
import { useMemo } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useCanonicalStoreVersion } from '@/data/queries';
import {
  getCommercePersistenceStatus,
  listAllCommerceActivity,
  listAllCommerceExceptions,
  listAllCommerceInvoices,
  listAllCommercePayments,
  type CommerceActor,
} from '@/lib/commerce/commerceLifecycle';
import { Badge, Card } from '@/components/ui';
import { cn } from '@/utils/cn';

const MONO = 'font-mono text-[11px]';

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

      {activityRows.length === 0 ? (
        <p className="text-[11px] text-zinc-500">
          No operational commerce activity yet. A brand drives the lifecycle from
          Purchase Orders → “Operational commerce simulation”.
        </p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-zinc-500 text-left">
                <th className="py-1 pr-3">Time</th>
                <th className="py-1 pr-3">Brand</th>
                <th className="py-1 pr-3">Step</th>
                <th className="py-1 pr-3">State</th>
                <th className="py-1 pr-3">Detail</th>
                <th className="py-1 pr-3">Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {activityRows.map((a) => (
                <tr key={a.id} className="text-zinc-400">
                  <td className="py-1 pr-3 text-zinc-500 whitespace-nowrap">
                    {a.at.slice(11, 19)}
                  </td>
                  <td className={cn(MONO, 'py-1 pr-3 text-zinc-300 whitespace-nowrap')}>
                    {a.brandId}
                  </td>
                  <td className={cn(MONO, 'py-1 pr-3 text-zinc-300')}>{a.type}</td>
                  <td className="py-1 pr-3">
                    <Badge className="text-[9px] bg-white/[0.05] text-zinc-300 border-white/[0.08]">
                      {a.status}
                    </Badge>
                  </td>
                  <td className="py-1 pr-3">{a.detail}</td>
                  <td className="py-1 pr-3">
                    {a.simulated ? (
                      <span className="text-[9px] text-brass-400">(sim)</span>
                    ) : (
                      <span className="text-[9px] text-zinc-500">live</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              </div>
            ))}
        </div>
      </div>
    </Card>
  );
}
