/**
 * §WAVE 3 / §P4 — Routing readiness for Freight Collect POs.
 *
 * For POs where the retail channel arranges/pays the carrier
 * (`freightTerm === 'collect'`), MERCENTA must have the routing step prepared
 * BEFORE the ship window closes, so the consignment is never dispatched against
 * a window that has already ended.
 *
 * ⚠ WHAT THIS DEADLINE IS — AND IS NOT
 * ------------------------------------
 * It is **Mercenta's own operational readiness target**, declared once in
 * `src/lib/shipping/routingReadiness.ts`. It is **NOT** a retail-channel rule:
 * the earlier "10am Pacific the day before the ship window closes" claim was
 * unsupported (`docs/AMAZON_VENDOR_TRUTH_VALIDATION_2026-09-20.md` → `AV-013`)
 * and has been removed rather than relabelled as fact. No replacement channel
 * deadline is asserted anywhere in this component.
 *
 * §P4 — WHO ACTS. This component is READ-ONLY STATUS for the brand. Under the
 * proxy model **MERCENTA raises the routing/shipment request and files the ASN**;
 * a brand never communicates with the retail channel. The previous
 * `RoutingRequestForm` was a brand-side "Confirm routing step" control that only
 * set local component state — it performed no domain action at all, i.e. a
 * placeholder. It is replaced here by the canonical Mercenta-raised status, read
 * from `ChannelInstructionOutcome.routingRequest`
 * (`src/lib/commerce/proxyProcessor.ts`), so what the brand sees is what
 * actually happened.
 */
import { useMemo } from 'react';
import { cn } from '@/utils/cn';
import { Truck, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  ROUTING_READINESS,
  routingReadinessNotice,
  routingReadinessStatus,
} from '@/lib/shipping/routingReadiness';
import { AMAZON_PARTNERED_CARRIER, MERCENTA_CARRIER_LABELS } from '@/config/shipping';
import type { ChannelInstructionOutcome } from '@/types';

/** The carrier label for a routing outcome — the channel's carrier, or Mercenta's. */
export function routingCarrierLabel(routing: ChannelInstructionOutcome['routingRequest']): string {
  if (!routing) return '—';
  if (routing.channelArrangesCarrier) return 'Retail-channel-arranged freight (carrier assigned by the channel)';
  if (routing.carrier === AMAZON_PARTNERED_CARRIER) return 'Partnered carrier';
  return MERCENTA_CARRIER_LABELS[routing.carrier as keyof typeof MERCENTA_CARRIER_LABELS] ?? routing.carrier;
}

/** §P4 — the indicator reads the CANONICAL routing outcome; it files nothing. */
interface RoutingRequestProps {
  poFreightTerm: 'collect' | 'prepaid' | undefined;
  shipWindowEnd: string | undefined;
  /** The Mercenta-raised routing outcome from the brand's instruction, if any. */
  routing?: ChannelInstructionOutcome['routingRequest'];
}

/**
 * The readiness moment for a ship window end date.
 *
 * Kept as a named export because callers and tests already reference it; the
 * implementation now delegates to the canonical Mercenta-owned declaration.
 */
/**
 * The readiness moment for a ship window end date.
 *
 * Kept as a named export because callers and tests already reference it; the
 * implementation now delegates to the canonical Mercenta-owned declaration.
 */
export function getRoutingRequestDeadline(shipWindowEnd: string): Date {
  return routingReadinessStatus(shipWindowEnd).deadline;
}

function formatCountdown(deadline: Date): { label: string; overdue: boolean } {
  const now = Date.now();
  const diff = deadline.getTime() - now;
  if (diff <= 0) return { label: 'OVERDUE', overdue: true };
  const hours = Math.ceil(diff / (1000 * 60 * 60));
  if (hours > 48) {
    const days = Math.floor(hours / 24);
    return { label: `${days}d ${hours % 24}h`, overdue: false };
  }
  return { label: `${hours}h`, overdue: false };
}

export function RoutingRequestIndicator({
  poFreightTerm, shipWindowEnd, routing,
}: RoutingRequestProps) {
  // §7B — hooks must run unconditionally (previously the useMemo below was
  // gated behind an early return: a genuine Rules-of-Hooks violation that
  // can crash at render time when the branch flips).
  const deadline = useMemo(
    () => (shipWindowEnd ? getRoutingRequestDeadline(shipWindowEnd) : null),
    [shipWindowEnd]
  );
  if (poFreightTerm !== 'collect' || !shipWindowEnd || !deadline) return null;
  const countdown = formatCountdown(deadline);

  /**
   * §P4 — MERCENTA raises the routing step; when it has, the brand sees the
   * canonical outcome (carrier + reference), never a filing control.
   */
  if (routing?.raised) {
    return (
      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-ds-md px-3 py-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span className="text-ds-label text-emerald-200 font-medium" data-testid="routing-raised-by-mercenta">
          Routing step raised by Mercenta · {routingCarrierLabel(routing)} · {routing.reference}
        </span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-2 rounded-ds-md px-3 py-2 border',
      countdown.overdue ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'
    )}>
      <Truck className={cn('w-4 h-4 flex-shrink-0', countdown.overdue ? 'text-red-400' : 'text-amber-400')} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-ds-label font-medium', countdown.overdue ? 'text-red-200' : 'text-amber-200')}>
          Routing step — Mercenta raises it (Freight Collect)
        </p>
        <p className="text-ds-micro text-zinc-500" data-testid="routing-readiness-notice">
          {ROUTING_READINESS.label}: prepare by {ROUTING_READINESS.cutoffHour}:00 (Europe/London) the day before
          the ship window closes. Not a retail-channel deadline.
        </p>
      </div>
      <div className={cn(
        'text-ds-micro font-mono px-2 py-0.5 rounded-ds-sm',
        countdown.overdue ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
      )}>
        <Clock className="w-3 h-3 inline mr-1" />{countdown.label}
      </div>
    </div>
  );
}

/* ── §P4 — Mercenta's routing status (READ-ONLY for the brand) ───── */

interface RoutingRequestStatusProps {
  poFreightTerm: 'collect' | 'prepaid' | undefined;
  shipWindowEnd: string | undefined;
  /** The canonical Mercenta-raised routing outcome, when it exists. */
  routing?: ChannelInstructionOutcome['routingRequest'];
}

/**
 * §P4 REPLACED `RoutingRequestForm`.
 *
 * The old component was a brand-side "Confirm routing step" control: it set
 * `routingRequestFiled` in local component state and called an `onFile` callback
 * that wrote NOTHING to the domain — a placeholder that looked like a channel
 * action. Under the proxy model the routing step is MERCENTA's, so this renders
 * STATUS instead of a control.
 */
export function RoutingRequestStatus({
  poFreightTerm, shipWindowEnd, routing,
}: RoutingRequestStatusProps) {
  // §7B — hooks must run unconditionally (the useMemo must not sit behind the
  // early return below).
  const deadline = useMemo(
    () => (shipWindowEnd ? getRoutingRequestDeadline(shipWindowEnd) : null),
    [shipWindowEnd]
  );

  if (poFreightTerm !== 'collect') return null;

  const isOverdue = !!deadline && deadline.getTime() < Date.now();

  return (
    <div className="border border-hairline rounded-ds-md p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Truck className="w-4 h-4 text-brass-400" />
        <span className="text-xs font-medium text-strong">Routing step — raised by Mercenta</span>
      </div>
      <p className="text-ds-micro text-zinc-400">
        This PO has <strong>Freight Collect</strong> terms — the retail channel arranges the carrier.
        Mercenta raises the routing step before the ship window closes, then files the ASN within it.
        You are not required to action this step.
      </p>
      <p className="text-ds-micro text-zinc-500" data-testid="routing-readiness-basis">
        {routingReadinessNotice()}
      </p>
      {routing?.raised ? (
        <p className="text-ds-micro text-emerald-300" data-testid="routing-status-raised">
          Raised {routing.reference} · {routingCarrierLabel(routing)}
        </p>
      ) : (
        deadline && (
          <div className="flex items-center gap-2">
            {isOverdue
              ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              : <Clock className="w-3.5 h-3.5 text-amber-400" />
            }
            <span className={cn('text-ds-micro', isOverdue ? 'text-red-300' : 'text-amber-300')}>
              {isOverdue
                ? 'OVERDUE — ship window closed ' + new Date(shipWindowEnd as string).toLocaleDateString('en-GB') + '. Ship at risk of rejection.'
                : 'Mercenta readiness target: ' + deadline.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' at ' + ROUTING_READINESS.cutoffHour + ':00 (Europe/London)'}
            </span>
          </div>
        )
      )}
    </div>
  );
}
