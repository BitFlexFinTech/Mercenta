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
      'bg-ink-900 rounded-lg border border-white/[0.06]',
      props.compact ? 'p-2.5' : 'p-3',
    )}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <DollarSign className="w-3.5 h-3.5 text-brass-400" />
        <span className="text-[10px] font-medium text-zinc-300">Shipping cost estimate</span>
        {estimate.mockRate && (
          <Badge className="text-[8px] bg-amber-500/15 text-amber-300 border-amber-500/20 ml-auto">
            Estimated
          </Badge>
        )}
      </div>
      <div className="space-y-0.5">
        <div className="flex justify-between text-[10px]">
          <span className="text-zinc-500">Base carrier cost</span>
          <span className="font-mono text-zinc-300">£{estimate.baseCarrierCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span className="text-zinc-500">Mercenta service fee</span>
          <span className="font-mono text-zinc-300">£{estimate.markupApplied.toFixed(2)}</span>
        </div>
        <div className="flex justify-between border-t border-white/[0.06] pt-0.5 mt-0.5 text-[11px] font-semibold">
          <span className="text-white">Total (incl. fee)</span>
          <span className="font-mono text-brass-400">£{estimate.brandPrice.toFixed(2)}</span>
        </div>
      </div>
      {!props.compact && estimate.mockRate && (
        <p className="flex items-start gap-1 mt-1.5 text-[9px] text-zinc-600">
          <Info className="w-2.5 h-2.5 flex-shrink-0 mt-0.5" />
          Estimated rate — actual cost confirmed when carrier manifest is filed.
        </p>
      )}
    </div>
  );
}