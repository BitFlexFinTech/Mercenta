/**
 * §27/§34 (M13 Phase 10) — derived operating-cost + contribution figures.
 *
 * Everything here is DERIVED from one of three real sources, never invented:
 *   1. `OPERATING_COST_LINES` / `COST_MODEL_INPUTS` (founder-editable config),
 *   2. the runtime usage log (real recorded AI calls),
 *   3. the canonical demo/business stores (PO commission, shipping margin, brands,
 *      prospects, leads) — labelled as demo data while DEMO_MODE is on.
 *
 * Revenue is reported per §25 stream and never blended into a single number
 * without its label; `subscription` is 0 because no price has been approved.
 */
import {
  COST_MODEL_INPUTS,
  OPERATING_COST_LINES,
  REVENUE_STREAM_LABELS,
  type CostSourceLabel,
  type RevenueStreamId,
} from '@/config/operatingCosts';
import { demoPurchaseOrders, demoShippingMargins } from '@/data/demoStore';
import { getAcquisitionLeads, getProspects } from '@/data/prospectStore';
import { ALL_DEMO_BRANDS } from '@/data/demoData';
import { aiUsageSummary, type AiUsageSummary } from './usageLog';

export interface ProviderCostRow {
  id: string;
  name: string;
  category: string;
  plan: string;
  billing: string;
  fixedMonthlyGbp: number;
  usageBudgetGbp: number;
  estimatedTotalGbp: number;
  varianceGbp: number;
  source: CostSourceLabel;
  note: string;
  manageUrl?: string;
}

export interface OperatingCostSummary {
  monthlyFixedGbp: number;
  monthlyUsageBudgetGbp: number;
  monthlyTotalGbp: number;
  /** Run-rate projection for the current month (ESTIMATE, clearly labelled). */
  projectedMonthGbp: number;
  providers: ProviderCostRow[];
  ai: AiUsageSummary;
  units: { brands: number; opportunities: number; leads: number; aiOperations: number };
  perUnit: {
    perBrandGbp: number;
    perOpportunityGbp: number;
    perLeadGbp: number;
    perAiOperationGbp: number;
  };
  revenue: {
    streams: { id: RevenueStreamId; label: string; gbp: number; source: string }[];
    totalGbp: number;
  };
  contribution: { grossGbp: number; marginPct: number; provisional: boolean };
  derived: {
    minSubscriptionGbp: number | null;
    minSubscriptionNote: string;
    cacToleranceGbp: number;
    cacToleranceNote: string;
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** The AI line's live figure comes from the usage log, not from the config. */
export function providerCostRows(ai: AiUsageSummary): ProviderCostRow[] {
  return OPERATING_COST_LINES.map((line) => {
    const usageActual = line.providerId === 'openrouter' ? ai.estimatedCostGbp : 0;
    return {
      id: line.id,
      name: line.name,
      category: line.category,
      plan: line.plan,
      billing: line.billing,
      fixedMonthlyGbp: line.fixedMonthlyGbp,
      usageBudgetGbp: line.usageBudgetGbp,
      estimatedTotalGbp: round2(line.fixedMonthlyGbp + usageActual),
      varianceGbp: round2(line.usageBudgetGbp - usageActual),
      source: line.source,
      note: line.note,
      manageUrl: line.manageUrl,
    };
  });
}

export function revenueByStream(): { id: RevenueStreamId; label: string; gbp: number; source: string }[] {
  const commission = round2(demoPurchaseOrders.reduce((s, po) => s + (po.commissionAmount ?? 0), 0));
  const shipping = round2(
    demoShippingMargins.reduce((s, m) => s + (m.brandBilledPrice - m.carrierCostPrice), 0)
  );
  return [
    { id: 'subscription', label: REVENUE_STREAM_LABELS.subscription, gbp: 0, source: 'not priced — founder approval required' },
    { id: 'distribution_commission', label: REVENUE_STREAM_LABELS.distribution_commission, gbp: commission, source: 'canonical PO store (demo data)' },
    { id: 'commercial_spread', label: REVENUE_STREAM_LABELS.commercial_spread, gbp: 0, source: 'not modelled separately yet' },
    { id: 'shipping_margin', label: REVENUE_STREAM_LABELS.shipping_margin, gbp: shipping, source: 'canonical shipping-margin ledger (demo data)' },
    { id: 'advertising_commission', label: REVENUE_STREAM_LABELS.advertising_commission, gbp: 0, source: 'no ad spend recorded yet' },
    { id: 'launch_programme_fee', label: REVENUE_STREAM_LABELS.launch_programme_fee, gbp: 0, source: 'no service fee recorded yet' },
    { id: 'optional_services', label: REVENUE_STREAM_LABELS.optional_services, gbp: 0, source: 'not offered yet' },
  ];
}

export function operatingCostSummary(now = new Date()): OperatingCostSummary {
  const ai = aiUsageSummary(now);
  const providers = providerCostRows(ai);
  const monthlyFixedGbp = round2(providers.reduce((s, p) => s + p.fixedMonthlyGbp, 0));
  const monthlyUsageBudgetGbp = round2(providers.reduce((s, p) => s + p.usageBudgetGbp, 0));
  const monthlyTotalGbp = round2(monthlyFixedGbp + ai.estimatedCostGbp);

  const brands = ALL_DEMO_BRANDS.length;
  const opportunities = getProspects().length;
  const leads = getAcquisitionLeads().length;
  const aiOperations = ai.calls;

  const streams = revenueByStream();
  const revenueTotal = round2(streams.reduce((s, x) => s + x.gbp, 0));
  const grossGbp = round2(revenueTotal - monthlyTotalGbp);
  const marginPct = revenueTotal > 0 ? round2((grossGbp / revenueTotal) * 100) : 0;

  const targetMargin = COST_MODEL_INPUTS.find((i) => i.id === 'target_gross_contribution_pct');
  const cac = COST_MODEL_INPUTS.find((i) => i.id === 'cac_tolerance_gbp');
  const subscription = COST_MODEL_INPUTS.find((i) => i.id === 'brand_subscription_gbp');
  // Break-even subscription per brand, at the target contribution margin. Only
  // computable when brands and a target margin exist — otherwise honestly null.
  const minSubscription =
    targetMargin && brands > 0 ? round2(monthlyTotalGbp / brands / (targetMargin.value / 100)) : null;

  return {
    monthlyFixedGbp,
    monthlyUsageBudgetGbp,
    monthlyTotalGbp,
    projectedMonthGbp: round2(monthlyFixedGbp + ai.projectionMonthlyGbp),
    providers,
    ai,
    units: { brands, opportunities, leads, aiOperations },
    perUnit: {
      perBrandGbp: brands > 0 ? round2(monthlyTotalGbp / brands) : 0,
      perOpportunityGbp: opportunities > 0 ? round2(monthlyTotalGbp / opportunities) : 0,
      perLeadGbp: leads > 0 ? round2(monthlyTotalGbp / leads) : 0,
      perAiOperationGbp: aiOperations > 0 ? round2(monthlyTotalGbp / aiOperations) : 0,
    },
    revenue: { streams, totalGbp: revenueTotal },
    contribution: {
      grossGbp,
      marginPct,
      provisional: COST_MODEL_INPUTS.some((i) => i.requiresFounderApproval),
    },
    derived: {
      minSubscriptionGbp: minSubscription,
      minSubscriptionNote:
        subscription?.value === 0
          ? 'No subscription price is set (founder approval required), so this is the break-even requirement at the target margin — not a recommended price.'
          : 'Derived from the current cost base, brand count and the target contribution margin.',
      cacToleranceGbp: cac?.value ?? 0,
      cacToleranceNote: cac?.note ?? '',
    },
  };
}