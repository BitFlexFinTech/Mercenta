/**
 * §27/§34 (M13 Phase 10) — OPERATING COST MODEL: single source of truth.
 *
 * Every figure here is a FOUNDER-EDITABLE PLACEHOLDER with an explicit source
 * label. Nothing in this file claims a live billing integration, and no number
 * is presented as real spend:
 *   MANUAL        — the founder typed it in (this file)
 *   ESTIMATED     — modelled from a usage rate, not a bill
 *   SIMULATED     — produced by the simulation-first seam
 *   NOT CONNECTED — no credential, so no figure is claimed at all
 *   LIVE          — reserved for a real, connected billing API (none yet)
 *
 * Commercial pricing (subscription price, commission rates) is deliberately NOT
 * finalised here: §25 forbids hard-coding final pricing without founder approval,
 * so the pricing inputs are marked `requiresFounderApproval`.
 */
import type { IntegrationId } from '@/integrations/types';

export type CostSourceLabel = 'MANUAL' | 'ESTIMATED' | 'SIMULATED' | 'NOT CONNECTED' | 'LIVE';

export type CostCategory =
  | 'ai'
  | 'infrastructure'
  | 'data'
  | 'communications'
  | 'marketing'
  | 'finance'
  | 'compliance';

export interface OperatingCostLine {
  id: string;
  name: string;
  /** The integration whose connection state governs whether spend is possible. */
  providerId?: IntegrationId;
  category: CostCategory;
  plan: string;
  billing: 'monthly' | 'usage' | 'annual' | 'free';
  /** Recurring cost per month (GBP). 0 for usage-only and free lines. */
  fixedMonthlyGbp: number;
  /** The monthly usage ceiling already enforced by the budget module (GBP). */
  usageBudgetGbp: number;
  source: CostSourceLabel;
  note: string;
  manageUrl?: string;
}

/**
 * §27 — the platform's own costs. PLACEHOLDER VALUES: the founder confirms each
 * one; none of them is read from a live billing API (none is connected yet).
 */
export const OPERATING_COST_LINES: OperatingCostLine[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter (runtime AI)',
    providerId: 'openrouter',
    category: 'ai',
    plan: 'Pay-as-you-go',
    billing: 'usage',
    fixedMonthlyGbp: 0,
    usageBudgetGbp: 25,
    source: 'ESTIMATED',
    note: 'Usage is logged per call by the runtime usage log; the ceiling is enforced before any paid call. Maximum paid runtime model is DeepSeek V4 Flash.',
    manageUrl: 'https://openrouter.ai/activity',
  },
  {
    id: 'supabase',
    name: 'Supabase (database, auth, storage)',
    category: 'infrastructure',
    plan: 'Placeholder — confirm the actual plan',
    billing: 'monthly',
    fixedMonthlyGbp: 0,
    usageBudgetGbp: 0,
    source: 'MANUAL',
    note: 'Enter the real plan price in this config once the founder confirms it.',
  },
  {
    id: 'hosting',
    name: 'Hosting / VPS + demo host',
    category: 'infrastructure',
    plan: 'Placeholder — VPS + Namecheap demo hosting',
    billing: 'monthly',
    fixedMonthlyGbp: 0,
    usageBudgetGbp: 0,
    source: 'MANUAL',
    note: 'Two hosting surfaces (VPS services + demo.mercenta.co.uk). Confirm both prices.',
  },
  {
    id: 'email',
    name: 'Transactional email (Postmark / Resend)',
    providerId: 'email',
    category: 'communications',
    plan: 'Placeholder — provider not connected',
    billing: 'monthly',
    fixedMonthlyGbp: 0,
    usageBudgetGbp: 0,
    source: 'NOT CONNECTED',
    note: 'No provider credential is configured, so no figure is claimed.',
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl (research fetch)',
    providerId: 'firecrawl',
    category: 'data',
    plan: 'Placeholder — usage-capped',
    billing: 'usage',
    fixedMonthlyGbp: 0,
    usageBudgetGbp: 15,
    source: 'ESTIMATED',
    note: 'Ceiling enforced by the existing discovery budget module.',
  },
  {
    id: 'keepa',
    name: 'Keepa (price/BSR history)',
    providerId: 'keepa',
    category: 'data',
    plan: 'Placeholder — plan not connected',
    billing: 'usage',
    fixedMonthlyGbp: 0,
    usageBudgetGbp: 0,
    source: 'NOT CONNECTED',
    note: 'No Keepa credential is configured, so no figure is claimed.',
  },
  {
    id: 'hunter',
    name: 'Hunter (email verification)',
    providerId: 'hunter',
    category: 'data',
    plan: 'Placeholder — usage-capped',
    billing: 'usage',
    fixedMonthlyGbp: 0,
    usageBudgetGbp: 10,
    source: 'ESTIMATED',
    note: 'Ceiling enforced by the existing discovery budget module.',
  },
  {
    id: 'instantly',
    name: 'Instantly (outreach sequencing)',
    providerId: 'instantly',
    category: 'marketing',
    plan: 'Placeholder — usage-capped',
    billing: 'usage',
    fixedMonthlyGbp: 0,
    usageBudgetGbp: 40,
    source: 'ESTIMATED',
    note: 'Ceiling enforced by the existing discovery budget module.',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp / Twilio messaging',
    providerId: 'twilio_whatsapp',
    category: 'communications',
    plan: 'Placeholder — not connected',
    billing: 'usage',
    fixedMonthlyGbp: 0,
    usageBudgetGbp: 0,
    source: 'NOT CONNECTED',
    note: 'No Twilio messaging credential is configured for the platform.',
  },
  {
    id: 'google',
    name: 'Google (Drive/Docs/Sheets/Slides/Calendar)',
    providerId: 'google',
    category: 'infrastructure',
    plan: 'Personal Google account — no Workspace subscription',
    billing: 'free',
    fixedMonthlyGbp: 0,
    usageBudgetGbp: 0,
    source: 'MANUAL',
    note: 'Consumer quotas only. If the founder later upgrades to Workspace, add the price here.',
  },
  {
    id: 'companies_house',
    name: 'Companies House API',
    providerId: 'companies_house',
    category: 'compliance',
    plan: 'Free tier',
    billing: 'free',
    fixedMonthlyGbp: 0,
    usageBudgetGbp: 0,
    source: 'MANUAL',
    note: 'Free public API for company reads. No electronic-filing channel is connected.',
  },
  {
    id: 'hmrc',
    name: 'HMRC (Making Tax Digital)',
    providerId: 'hmrc',
    category: 'compliance',
    plan: 'Not connected',
    billing: 'free',
    fixedMonthlyGbp: 0,
    usageBudgetGbp: 0,
    source: 'NOT CONNECTED',
    note: 'READY / NOT CONNECTED until VAT registration and MTD credentials exist.',
  },
];

/* ── §25 — revenue streams (modelled separately, never blended) ───────── */

export type RevenueStreamId =
  | 'subscription'
  | 'distribution_commission'
  | 'commercial_spread'
  | 'shipping_margin'
  | 'advertising_commission'
  | 'launch_programme_fee'
  | 'optional_services';

export const REVENUE_STREAM_LABELS: Record<RevenueStreamId, string> = {
  subscription: 'Brand subscription',
  distribution_commission: 'Distribution / commission',
  commercial_spread: 'Commercial spread',
  shipping_margin: 'Shipping margin',
  advertising_commission: 'Advertising management commission',
  launch_programme_fee: 'Launch programme / service fee',
  optional_services: 'Optional services',
};

/**
 * §25/§27 — pricing + margin inputs. `requiresFounderApproval: true` means the
 * value is NOT a decision; the dashboard must present it as an assumption the
 * founder has not yet confirmed, and must never hard-code final pricing.
 */
export interface CostModelInput {
  id: string;
  label: string;
  value: number;
  unit: 'GBP' | 'GBP/month' | 'percent';
  requiresFounderApproval: boolean;
  note: string;
}

export const COST_MODEL_INPUTS: CostModelInput[] = [
  {
    id: 'brand_subscription_gbp',
    label: 'Brand subscription (default plan)',
    value: 0,
    unit: 'GBP/month',
    requiresFounderApproval: true,
    note: 'Not set. §25 forbids finalising subscription pricing without founder approval — the dashboard shows it as unset rather than inventing a price.',
  },
  {
    id: 'target_gross_contribution_pct',
    label: 'Target gross contribution margin',
    value: 35,
    unit: 'percent',
    requiresFounderApproval: true,
    note: 'Planning assumption only. Used to derive the minimum subscription; confirm before it informs pricing.',
  },
  {
    id: 'cac_tolerance_gbp',
    label: 'Customer acquisition cost tolerance (per brand)',
    value: 120,
    unit: 'GBP',
    requiresFounderApproval: true,
    note: 'Planning assumption only. Derived against the modelled contribution per brand.',
  },
  {
    id: 'ai_cost_per_operation_budget_gbp',
    label: 'AI cost budget per operation',
    value: 0.02,
    unit: 'GBP',
    requiresFounderApproval: true,
    note: 'Per-operation ceiling enforced by the runtime usage log (see modelPolicy.ts / usageLog.ts).',
  },
];

/** §27 — the monthly / daily ceilings the runtime refuses to exceed. */
export const AI_SPEND_CEILINGS = {
  dailyGbp: 2,
  monthlyGbp: 25,
  /** Above this share of the monthly ceiling the dashboard warns. */
  warningShare: 0.8,
} as const;

export const OPERATING_COSTS_DISCLAIMER =
  'Every figure is labelled MANUAL, ESTIMATED, SIMULATED or NOT CONNECTED. No live billing API is connected, so nothing here is presented as confirmed spend.';