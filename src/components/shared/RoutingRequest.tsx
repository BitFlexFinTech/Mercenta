/**
 * §WAVE 3 — Routing readiness for Freight Collect POs.
 *
 * For POs where the retail channel arranges/pays the carrier
 * (`freightTerm === 'collect'`), Mercenta must have the routing step prepared
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
 * For Freight Prepaid POs (`freightTerm === 'prepaid'`) Mercenta arranges the
 * carrier, so no routing step is required.
 */
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import { Truck, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  ROUTING_READINESS,
  routingReadinessNotice,
  routingReadinessStatus,
} from '@/lib/shipping/routingReadiness';

interface RoutingRequestProps {
  poFreightTerm: 'collect' | 'prepaid' | undefined;
  shipWindowEnd: string | undefined;
  onFileRoutingRequest?: () => void;
  routingRequestFiled?: boolean;
}

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
  poFreightTerm, shipWindowEnd, routingRequestFiled = false,
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

  if (routingRequestFiled) {
    return (
      <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span className="text-ds-label text-emerald-200 font-medium">Routing Request filed</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-2 rounded-lg px-3 py-2 border',
      countdown.overdue ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20'
    )}>
      <Truck className={cn('w-4 h-4 flex-shrink-0', countdown.overdue ? 'text-red-400' : 'text-amber-400')} />
      <div className="flex-1 min-w-0">
        <p className={cn('text-ds-label font-medium', countdown.overdue ? 'text-red-200' : 'text-amber-200')}>
          Routing step required (Freight Collect)
        </p>
        <p className="text-ds-micro text-zinc-500" data-testid="routing-readiness-notice">
          {ROUTING_READINESS.label}: prepare by {ROUTING_READINESS.cutoffHour}:00 (Europe/London) the day before
          the ship window closes. Not a retail-channel deadline.
        </p>
      </div>
      <div className={cn(
        'text-ds-micro font-mono px-2 py-0.5 rounded',
        countdown.overdue ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
      )}>
        <Clock className="w-3 h-3 inline mr-1" />{countdown.label}
      </div>
    </div>
  );
}

/* ── Routing Request Form (inline during ASN creation) ──────────── */

interface RoutingRequestFormProps {
  poFreightTerm: 'collect' | 'prepaid' | undefined;
  shipWindowEnd: string | undefined;
  routingRequestFiled: boolean;
  onFile: () => void;
  onClose: () => void;
}

export function RoutingRequestForm({
  poFreightTerm, shipWindowEnd, routingRequestFiled, onFile, onClose,
}: RoutingRequestFormProps) {
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [filing, setFiling] = useState(false);
  // §7B — hooks must run unconditionally; the useMemo was previously called
  // after the early-return guard below (Rules-of-Hooks violation).
  const deadline = useMemo(() =>
    shipWindowEnd ? getRoutingRequestDeadline(shipWindowEnd) : null, [shipWindowEnd]
  );

  if (poFreightTerm !== 'collect' || routingRequestFiled) return null;

  const isOverdue = deadline && deadline.getTime() < Date.now();

  async function handleFile() {
    setFiling(true);
    await new Promise((r) => setTimeout(r, 500));
    onFile();
    setFiling(false);
  }

  return (
    <div className="border border-white/[0.08] rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Truck className="w-4 h-4 text-brass-400" />
        <span className="text-xs font-medium text-white">Routing Request</span>
      </div>
      <p className="text-ds-micro text-zinc-400">
        This PO has <strong>Freight Collect</strong> terms — the retail channel arranges the carrier.
        Mercenta prepares the routing step before the ship window closes, then ships within it.
      </p>
      <p className="text-ds-micro text-zinc-500" data-testid="routing-readiness-basis">
        {routingReadinessNotice()}
      </p>
      {deadline && (
        <div className="flex items-center gap-2">
          {isOverdue
            ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            : <Clock className="w-3.5 h-3.5 text-amber-400" />
          }
          <span className={cn('text-ds-micro', isOverdue ? 'text-red-300' : 'text-amber-300')}>
            {isOverdue
              ? 'OVERDUE — ship window closed ' + new Date(shipWindowEnd as string).toLocaleDateString('en-GB') + '. Ship at risk of rejection.'
              : 'Mercenta readiness target: ' + deadline!.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' at ' + ROUTING_READINESS.cutoffHour + ':00 (Europe/London)'
            }
          </span>
        </div>
      )}
      <label className="flex items-center gap-2 text-ds-label text-zinc-300 cursor-pointer">
        <input type="checkbox" checked={confirmChecked} onChange={(e) => setConfirmChecked(e.target.checked)} className="rounded border-white/[0.08] bg-ink-900" />
        I confirm the routing step has been prepared for this consignment.
      </label>
      <div className="flex items-center gap-2">
        <Button className="text-xs" disabled={!confirmChecked || filing} onClick={handleFile}>
          {filing ? 'Submitting...' : 'Confirm routing step'}
        </Button>
        <Button variant="ghost" className="text-xs text-zinc-500" onClick={onClose}>
          Skip (not recommended)
        </Button>
      </div>
    </div>
  );
}
