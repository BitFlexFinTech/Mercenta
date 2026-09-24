/**
 * §P10 (programme §4 P10) — CONSOLIDATION POSTURE PANEL (programme decision 11).
 *
 * The Founder deferred consolidation but required that it is **not designed out**. The
 * posture lives in ONE owner (`src/lib/shipping/consolidation.ts`); this component renders
 * it — and, when it is given a consignment's PO, the DECLARED SET that consignment
 * carries (normalised by the owner, so the 1..n shape is executed rather than described).
 *
 * It is rendered by BOTH logistics workspaces: a brand must be able to see that its PO is
 * shipped on its own consignment today and why, rather than wondering where a grouped
 * consignment is.
 */
import { StatusBadge } from '@/components/ui';
import {
  CONSOLIDATION_POSTURE,
  consignmentPurchaseOrders,
} from '@/lib/shipping/consolidation';

export interface ConsolidationPosturePanelProps {
  /** The consignment's own purchase order, when one is in scope. */
  poNumber?: string | null;
}

export function ConsolidationPosturePanel({ poNumber }: ConsolidationPosturePanelProps) {
  const declared = poNumber ? consignmentPurchaseOrders({ poNumber }) : null;

  return (
    <div className="space-y-2 p-3" data-testid="consolidation-posture">
      <div className="flex flex-wrap items-center gap-2">
        <span data-testid="consolidation-status" data-status={CONSOLIDATION_POSTURE.status}>
          <StatusBadge tone="neutral">Deferred by Founder decision</StatusBadge>
        </span>
        <span className="text-ds-micro text-zinc-500">{CONSOLIDATION_POSTURE.decision}</span>
      </div>

      <p className="text-ds-micro leading-relaxed text-zinc-300" data-testid="consolidation-today">
        {CONSOLIDATION_POSTURE.today}
      </p>

      {declared && (
        <p className="text-ds-micro leading-relaxed text-zinc-400" data-testid="consolidation-declared">
          This consignment declares{' '}
          <span className="font-mono text-zinc-300">{declared.poNumbers.join(', ')}</span> —{' '}
          {declared.grouped
            ? 'a grouped consignment (1..n purchase orders).'
            : 'one purchase order today; the model accepts 1..n.'}
        </p>
      )}

      <p className="text-ds-micro leading-relaxed text-zinc-400" data-testid="consolidation-model-support">
        {CONSOLIDATION_POSTURE.modelSupports}
      </p>

      <div>
        <p className="text-ds-micro uppercase tracking-[0.12em] text-zinc-500">
          Documented channel evidence
        </p>
        <ul className="mt-1 space-y-0.5" data-testid="consolidation-evidence">
          {CONSOLIDATION_POSTURE.evidence.map((entry) => (
            <li key={entry} className="text-ds-micro leading-relaxed text-zinc-500">
              {entry}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-ds-micro uppercase tracking-[0.12em] text-zinc-500">
          Invariants a grouping must honour
        </p>
        <ul className="mt-1 space-y-0.5" data-testid="consolidation-invariants">
          {CONSOLIDATION_POSTURE.invariants.map((entry) => (
            <li key={entry} className="text-ds-micro leading-relaxed text-zinc-500">
              {entry}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-ds-micro leading-relaxed text-zinc-500" data-testid="consolidation-activation">
        {CONSOLIDATION_POSTURE.activation}
      </p>
    </div>
  );
}
