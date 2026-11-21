/**
 * §Batch-14 — Shipping cost estimate display for brands.
 *
 * Shows a real-time estimate of shipping costs when creating a shipment,
 * including the base carrier cost, Mercenta markup, and the total brand price.
 * Used inline in the ASN/shipment creation UI.
 */
import { useMemo } from 'react';
import { DollarSign, Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { CarrierId, ShippingEstimate } from '@/types';
import { computeShippingEstimate } from '@/lib/shipping/shippingCalculator';
import { Badge } from '@/components/ui';

interface ShippingEstimateProps {
  carrier: CarrierId;
  /** Total weight in kg. */
  totalWeightKg: number;
  /** Total volume in cbm. */
  totalCbm: number;
  /** Number of cartons. */
  cartonCount: number;
  /** Whether palletised (for Palletline). */
  palletised?: boolean;
  /** Number of pallets. */
  palletCount?: number;
  /** Compact display mode (inline with the shipment form). */
  compact?: boolean;
}

export function ShippingCostEstimate(props: ShippingEstimateProps) {
  const estimate: ShippingEstimate | null = useMemo(() => {
    if (props.totalWeightKg <= 0 || props.cartonCount <= 0) return null;
    try {
      return computeShippingEstimate({
        carrier: props.carrier,
        totalWeightKg: props.totalWeightKg,
        totalCbm: props.totalCbm,
        cartonCount: props.cartonCount,
        palletised: props.palletised,
        palletCount: props.palletCount,
      });
    } catch {
      return null;
    }
  }, [props.carrier, props.totalWeightKg, props.totalCbm, props.cartonCount, props.palletised, props.palletCount]);

  if (!estimate) return null;

  return (
    <div className={cn(
      'bg-surface rounded-ds-md border border-hairline',
      props.compact ? 'p-2.5' : 'p-3',
    )}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <DollarSign className="w-3.5 h-3.5 text-accent-400" />
        <span className="text-ds-micro font-medium text-strong">Shipping cost estimate</span>
        {estimate.mockRate && (
          <Badge className="text-ds-micro bg-state-warning/10 text-state-warning border-state-warning/20 ml-auto">
            Estimated
          </Badge>
        )}
      </div>
      <div className="space-y-0.5">
        <div className="flex justify-between text-ds-micro">
          <span className="text-muted">Base carrier cost</span>
          <span className="font-mono text-strong">£{estimate.baseCarrierCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-ds-micro">
          <span className="text-muted">Mercenta service fee</span>
          <span className="font-mono text-strong">£{estimate.markupApplied.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-hairline pt-0.5 mt-0.5 text-ds-label font-semibold">
          <span className="text-strong">Total (incl. fee)</span>
          <span className="font-mono text-accent-400">£{estimate.brandPrice.toFixed(2)}</span>
        </div>
      </div>
      {!props.compact && estimate.mockRate && (
        <p className="flex items-start gap-1 mt-1.5 text-ds-micro text-faint">
          <Info className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" />
          Estimated rate — actual cost confirmed when carrier manifest is filed.
        </p>
      )}
    </div>
  );
}