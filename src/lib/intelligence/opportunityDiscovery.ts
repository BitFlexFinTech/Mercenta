/**
 * §9–§14 / Phase M13 — OPPORTUNITY DISCOVERY ENGINE (the ADDITIONAL layer).
 *
 * ARCHITECTURE (master spec §9). The existing ASIN-level Brand Intelligence engine
 * is the CORE and is NOT replaced:
 *
 *   BRAND INTELLIGENCE ENGINE
 *     ├── ASIN / Product Intelligence      ← existing (unchanged)
 *     └── Opportunity Discovery Engine     ← THIS MODULE
 *            ├── UK Brand Opportunities
 *            ├── International Brand Opportunities
 *            ├── Sports / Team / Club Opportunities
 *            ├── Distributor / Channel Opportunities
 *            ├── Trade Programme Opportunities
 *            ├── Embassy / Government Network Opportunities
 *            ├── Strategic Partnership Opportunities
 *            └── New-to-Amazon Opportunities
 *
 * SHARED ENGINE, NOT A SECOND ONE. Every figure comes from what already exists:
 *   • scoring / demand / PO-potential / time-to-revenue / speed-to-revenue
 *     → `./acquisitionStrategy → assessOpportunity` (which itself derives from the
 *       canonical `BrandProspect.score` produced by the existing BI pipeline);
 *   • estimated sales / revenue → the prospect's own ASIN evidence (never invented);
 *   • Mercenta economics → the canonical commercial-model arithmetic
 *     (`@/lib/finance/commercialModel`), so no screen can disagree about money;
 *   • category eligibility → `isApprovedCategory` on `APPROVED_CATEGORIES`
 *     (the ten permitted Amazon UK Vendor Central categories, §6). FAIL-CLOSED:
 *     an unknown or out-of-list category is INELIGIBLE, and the record says why
 *     rather than being silently dropped.
 *
 * CLAIM DISCIPLINE (§5/§12/§13/§20 — non-negotiable):
 *   • every projection is `claim: 'estimate'`;
 *   • the sports/team track produces a POTENTIAL DISTRIBUTION OPPORTUNITY, never a
 *     "confirmed partnership" — `confirmedPartnership` is a required field and is
 *     `false` for every record;
 *   • a channel purchase order is NEVER called guaranteed — the vocabulary is
 *     "PO potential", "estimated PO opportunity", "demand potential";
 *   • no function here contacts a network. Pure derivation over stored data.
 */
import type { BrandProspect } from '@/types';
import { APPROVED_CATEGORIES, isApprovedCategory } from '@/types';
import type { CommercialModel } from '@/config/commercialModel';
import { DEMO_COMMISSION_RATE_PCT } from '@/config/commercialModel';
import { computeCommissionModel } from '@/lib/finance/commercialModel';
import {
  ESTIMATE_LABEL,
  assessOpportunity,
  resolveSourceMarketId,
  strategyForProspect,
  type AcquisitionStrategyId,
  type OpportunityAssessment,
} from './acquisitionStrategy';

/* ── §9 — the opportunity verticals ─────────────────────────────────────── */

export type OpportunityVerticalId =
  | 'uk_brand'
  | 'international_brand'
  | 'sports_team_club'
  | 'distributor_channel'
  | 'trade_programme'
  | 'embassy_government'
  | 'strategic_partnership'
  | 'new_to_channel';

export interface OpportunityVertical {
  id: OpportunityVerticalId;
  label: string;
  summary: string;
  /** What this track is allowed to claim. Never a confirmed relationship. */
  claimDuty: 'potential_distribution_opportunity' | 'prospective_network_opportunity';
  /** Where the approach is routed (§10 contact intelligence / §19 network). */
  approachRoute: string;
}

/** §5 — every Amazon-related claim must be distinguishable as one of these. */
export type ClaimClass =
  | 'confirmed_fact'
  | 'estimate'
  | 'simulation'
  | 'third_party_research'
  | 'pending_confirmation';

export const DEFAULT_CLAIM: ClaimClass = 'estimate';

export const CLAIM_LABELS: Record<ClaimClass, string> = {
  confirmed_fact: 'Confirmed fact',
  estimate: 'Estimate',
  simulation: 'Simulation',
  third_party_research: 'Third-party research',
  pending_confirmation: 'Pending confirmation',
};


export const OPPORTUNITY_VERTICALS: Record<OpportunityVerticalId, OpportunityVertical> = {
  uk_brand: {
    id: 'uk_brand',
    label: 'UK Brand Opportunities',
    summary:
      'High-demand UK brands in the ten permitted categories that are strong distribution prospects — the shortest path to revenue.',
    claimDuty: 'potential_distribution_opportunity',
    approachRoute: 'Direct brand contact (decision-maker) after operator qualification.',
  },
  international_brand: {
    id: 'international_brand',
    label: 'International Brand Opportunities',
    summary:
      'Brands anywhere in the world whose products could perform in the UK, routed to the UK market through Mercenta.',
    claimDuty: 'potential_distribution_opportunity',
    approachRoute: 'Direct brand contact + published source-market trade routes (prospective).',
  },
  sports_team_club: {
    id: 'sports_team_club',
    label: 'Sports / Team / Club Opportunities',
    summary:
      'UK sports organisations whose merchandise demand on the retail channel is visible, with a distribution gap Mercenta could serve.',
    claimDuty: 'potential_distribution_opportunity',
    approachRoute:
      'Commercial/licensing contact at the club or its venture arm. Mercenta identifies the opportunity; the club has NOT been approached.',
  },
  distributor_channel: {
    id: 'distributor_channel',
    label: 'Distributor / Channel Opportunities',
    summary:
      'Existing distributors and channel partners whose brand portfolios Mercenta can supply or serve.',
    claimDuty: 'potential_distribution_opportunity',
    approachRoute: 'Direct distributor contact.',
  },
  trade_programme: {
    id: 'trade_programme',
    label: 'Trade Programme Opportunities',
    summary:
      'Trade programmes and industry bodies that could introduce export-ready brands to Mercenta.',
    claimDuty: 'prospective_network_opportunity',
    approachRoute: 'Programme/trade-body enquiry. No partnership is claimed.',
  },
  embassy_government: {
    id: 'embassy_government',
    label: 'Embassy / Government Network Opportunities',
    summary:
      'UK embassies, high commissions, trade departments and export agencies that could introduce suitable local brands to the UK market.',
    claimDuty: 'prospective_network_opportunity',
    approachRoute:
      'Trade officer / commercial attaché pitch. PROSPECTIVE only — no embassy relationship exists.',
  },
  strategic_partnership: {
    id: 'strategic_partnership',
    label: 'Strategic Partnership Opportunities',
    summary:
      'Accelerators, investor networks and corporate partners that extend the Mercenta brand pipeline.',
    claimDuty: 'prospective_network_opportunity',
    approachRoute: 'Partnerships Centre (Super Admin) personalised pitch.',
  },
  new_to_channel: {
    id: 'new_to_channel',
    label: 'New-to-Channel Opportunities',
    summary:
      'Brands with no current retail-channel offer — the New Product Launch Programme track (§16), subject to external channel approval.',
    claimDuty: 'potential_distribution_opportunity',
    approachRoute: 'Brand onboarding. Never claims an external programme place.',
  },
};

/** §9 — the display order of the verticals on the operator surface. */
export const OPPORTUNITY_VERTICAL_ORDER: readonly OpportunityVerticalId[] = [
  'uk_brand',
  'international_brand',
  'sports_team_club',
  'distributor_channel',
  'new_to_channel',
  'trade_programme',
  'embassy_government',
  'strategic_partnership',
] as const;


/* ── §6 — category eligibility, fail-closed ─────────────────────────────── */

export type CategoryEligibility = 'eligible' | 'ineligible_unknown_category';

export interface EligibilityVerdict {
  eligibility: CategoryEligibility;
  /** Why, in a sentence an operator can act on. */
  reason: string;
}

/**
 * §6 — ONLY the ten permitted categories may be prospected/evaluated. An unknown
 * value is INELIGIBLE (fail-closed), never treated as "probably fine". The caller
 * gets a reason so the UI can mark it ineligible instead of hiding it.
 */
export function categoryEligibility(category: string | null | undefined): EligibilityVerdict {
  if (isApprovedCategory(category)) {
    return {
      eligibility: 'eligible',
      reason: `Permitted category (one of ${APPROVED_CATEGORIES.length}).`,
    };
  }
  return {
    eligibility: 'ineligible_unknown_category',
    reason: `"${category ?? 'unknown'}" is not one of the ${APPROVED_CATEGORIES.length} permitted retail-channel vendor categories — excluded from prospecting, estimation and ranking.`,
  };
}

/* ── §10/§14 — ASIN-level evidence, summarised but never fabricated ─────── */

/** The offer structure of the brand's ASINs, in the existing classification terms. */
export type AmazonPresence =
  | 'direct_retail'
  | 'present_unclear'
  | 'marketplace_only'
  | 'no_current_offer'
  | 'unknown';

export const AMAZON_PRESENCE_LABELS: Record<AmazonPresence, string> = {
  direct_retail: 'Sold directly by the retail channel',
  present_unclear: 'Present, structure unclear',
  marketplace_only: 'Marketplace-only supply observed',
  no_current_offer: 'No current offer observed',
  unknown: 'Unknown',
};

/** §10 — whether the observed sellers look authorised, unauthorised, or unknown. */
export type AuthorisationIndicator =
  | 'appears_authorised'
  | 'appears_unauthorised'
  | 'mixed'
  | 'unknown';

export const AUTHORISATION_LABELS: Record<AuthorisationIndicator, string> = {
  appears_authorised: 'Appears authorised (evidence observed)',
  appears_unauthorised: 'Appears unauthorised (evidence observed)',
  mixed: 'Mixed evidence',
  unknown: 'Unknown — not reliably discoverable from the stored evidence',
};

/** One ASIN, narrowed to what the opportunity list needs (full record stays in BI). */
export interface OpportunityAsinSummary {
  asin: string;
  title: string;
  price: number;
  sellerCount: number;
  bsr: number;
  reviewCount: number;
  retailChannelSeller: boolean;
  offerClass: string;
  subcategory?: string;
  estimatedMonthlyUnits?: number;
  estimatedMonthlyRevenueGbp?: number;
  sourceLabel: string;
}


const PRESENCE_BY_OFFER_CLASS: Record<string, AmazonPresence> = {
  DIRECT_AMAZON_RETAIL: 'direct_retail',
  AMAZON_PRESENT_BUT_UNCLEAR: 'present_unclear',
  MARKETPLACE_HEAVY: 'marketplace_only',
  MARKETPLACE_ONLY_OBSERVED: 'marketplace_only',
  NO_CURRENT_OFFER: 'no_current_offer',
  UNKNOWN: 'unknown',
};

/** §14 — the brand's strongest observed offer structure, in the canonical vocabulary. */
export function amazonPresenceFor(prospect: BrandProspect): AmazonPresence {
  if (!prospect.asins?.length) return 'unknown';
  const order: AmazonPresence[] = [
    'direct_retail',
    'present_unclear',
    'marketplace_only',
    'no_current_offer',
    'unknown',
  ];
  return prospect.asins.reduce<AmazonPresence>((best, a) => {
    const p = PRESENCE_BY_OFFER_CLASS[a.amazonOfferClass] ?? 'unknown';
    return order.indexOf(p) < order.indexOf(best) ? p : best;
  }, 'unknown');
}

/**
 * §10 — "apparent authorised/unauthorised indicators WHERE RELIABLY DISCOVERABLE".
 * This derives ONLY from evidence the platform already holds (observed seller count,
 * whether the channel itself sells the line, and detected restrictions). When that
 * evidence is absent the honest answer is `unknown` — Mercenta does not guess at a
 * brand's seller-authorisation status.
 */
export function authorisationIndicatorFor(prospect: BrandProspect): AuthorisationIndicator {
  const restriction = prospect.restrictions?.find(
    (r) =>
      /unauthoris|unauthoriz|reseller|marketplace/i.test(r.description ?? '') ||
      r.severity === 'hard'
  );
  const sellers = (prospect.asins ?? [])
    .map((a) => a.sellerCount)
    .filter((n) => Number.isFinite(n));
  const directRetail = prospect.asins?.some((a) => a.amazonRetailSeller) ?? false;
  if (!sellers.length) return 'unknown';
  const maxSellers = Math.max(...sellers);
  if (restriction && /unauthoris|unauthoriz/i.test(restriction.description ?? '')) {
    return 'appears_unauthorised';
  }
  if (directRetail && maxSellers <= 3) return 'appears_authorised';
  if (maxSellers >= 6) return 'appears_unauthorised';
  if (maxSellers >= 4) return 'mixed';
  return 'unknown';
}


/* ── §10 — the opportunity record (every field the DOI asks for) ─────────── */

export interface OpportunityContactIntelligence {
  name?: string;
  jobTitle?: string;
  email?: string;
  linkedin?: string;
  company?: string;
  source?: string;
  /** Never 'verified' unless the stored contact says so. */
  emailConfidence?: string;
}

export interface OpportunityRecord {
  id: string;
  vertical: OpportunityVerticalId;
  claimDuty: OpportunityVertical['claimDuty'];
  brand: string;
  category: string;
  eligibility: EligibilityVerdict;
  strategy: AcquisitionStrategyId;
  geography: {
    countries: string[];
    sourceMarketId: string | null;
    sourceMarketLabel: string;
    destinationMarket: string;
  };
  /** §14 — the ASIN-level evidence this opportunity is built on (top 3 by demand). */
  topAsins: OpportunityAsinSummary[];
  asinCount: number;
  productSummary: string;
  amazonPresence: AmazonPresence;
  sellerCountMax: number;
  sellerStatusEvidence: string;
  authorisationIndicator: AuthorisationIndicator;
  /** §10/§13 — demand, as ESTIMATES. */
  estimatedMonthlyUnits: number;
  estimatedMonthlyRevenueGbp: number;
  priceRangeGbp: { low: number; high: number };
  demandPotential: number;
  competitionHeadroom: number;
  reviewPressure: number;
  /** §13 — PO potential is THE ranking objective. */
  estimatedPoPotentialGbp: number;
  estimatedMercentaRevenueGbp: number;
  estimatedMercentaMarginGbp: number;
  recommendedCommercialModel: CommercialModel;
  timeToRevenueWeeks: number;
  speedToRevenueScore: number;
  opportunityScore: number;
  distributionOpportunity: string;
  existingDistributorEvidence: string;
  contact: OpportunityContactIntelligence | null;
  decisionMaker: string;
  linkedin: string;
  website: string;
  recommendedCta: string;
  /** §5 — never a bare figure: every record states what kind of claim it is. */
  claim: ClaimClass;
  estimateLabel: string;
  /**
   * §12 — REQUIRED and always `false` in this build: Mercenta identifies a
   * potential distribution opportunity. It does not claim a confirmed partnership.
   */
  confirmedPartnership: false;
  basis: 'derivation_over_stored_prospect' | 'seeded_opportunity';
}

export interface DerivedOpportunity extends OpportunityRecord {
  rank: number;
}

/** §10 — the CTA that turns a researched brand into revenue work. */
export function recommendedCtaFor(vertical: OpportunityVerticalId, tier: string): string {
  if (vertical === 'sports_team_club') {
    return 'Review merchandise evidence → generate club proposition';
  }
  if (vertical === 'new_to_channel') {
    return 'Model the New Product Launch Programme → qualify brand';
  }
  if (tier === 'tier_1' || tier === 'tier_2') {
    return 'Open prospect → generate decision-maker outreach';
  }
  return 'Review ASIN evidence → schedule qualification';
}


/* ── §10/§13/§14 — derive ONE opportunity from a stored prospect ─────────── */

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** §13 — PO potential is a NAMED function of the observed channel demand. */
export const PO_POTENTIAL_FORMULA =
  'estimated PO opportunity/month = observed monthly channel revenue × competition factor, where competition factor = max(0.20, 1 − (maxSellers − 1) × 0.08)';

/** §14 — how many ASINs are carried on the opportunity card. */
export const TOP_ASIN_COUNT = 3;

/**
 * Derive an opportunity record from a canonical `BrandProspect`.
 *
 * It reuses `assessOpportunity` for every score/figure so there is exactly ONE
 * scoring engine; it adds the §10 fields (ASIN evidence, authorisation indicator,
 * contact intelligence, PO potential, CTA) and an eligibility verdict. Pure: no
 * network, no mutation of the input.
 */
export function deriveOpportunity(
  prospect: BrandProspect,
  opts: { model?: CommercialModel; vertical?: OpportunityVerticalId } = {}
): OpportunityRecord {
  const assessment: OpportunityAssessment = assessOpportunity(prospect, { model: opts.model });
  const model: CommercialModel = opts.model ?? 'commission_agent';
  const eligibility = categoryEligibility(prospect.category);

  const asins = [...(prospect.asins ?? [])].sort(
    (a, b) => (b.estimatedRevenue ?? 0) - (a.estimatedRevenue ?? 0) || a.bsr - b.bsr
  );
  const topAsins: OpportunityAsinSummary[] = asins.slice(0, TOP_ASIN_COUNT).map((a) => ({
    asin: a.asin,
    title: a.title,
    price: a.price,
    sellerCount: a.sellerCount,
    bsr: a.bsr,
    reviewCount: a.reviewCount,
    retailChannelSeller: a.amazonRetailSeller,
    offerClass: a.amazonOfferClass,
    subcategory: a.subcategory,
    estimatedMonthlyUnits: a.estimatedSales,
    estimatedMonthlyRevenueGbp: a.estimatedRevenue,
    sourceLabel: a.sourceLabel,
  }));

  // Observed demand: the stored ASIN estimates when present. An ASIN with no
  // observed figures contributes NOTHING — the engine never invents one.
  const observedUnits = asins.reduce((s, a) => s + (a.estimatedSales ?? 0), 0);
  const observedRevenue = round2(asins.reduce((s, a) => s + (a.estimatedRevenue ?? 0), 0));

  const prices = asins.map((a) => a.price).filter((p) => Number.isFinite(p) && p > 0);
  const priceRangeGbp = prices.length
    ? { low: round2(Math.min(...prices)), high: round2(Math.max(...prices)) }
    : { low: 0, high: 0 };

  const sellerCountMax = asins.length ? Math.max(...asins.map((a) => a.sellerCount)) : 0;
  // More sellers competing ⇒ a smaller share available to Mercenta's brand. The
  // factor is a DECLARED constant so the formula is reproducible (PO_POTENTIAL_FORMULA),
  // and it lives in ONE function shared with the seeded (sports/network) opportunities.
  const estimatedPoPotentialGbp = poPotentialGbp(observedRevenue, sellerCountMax);
  const reviewPressure = asins.reduce((s, a) => s + a.reviewCount, 0);

  const mercentaRevenue = round2(
    model === 'commission_agent'
      ? computeCommissionModel({
          retailChannelRevenueGbp: estimatedPoPotentialGbp,
          commissionRatePct: DEMO_COMMISSION_RATE_PCT,
        }).mercentaCommissionGbp
      : assessment.projectedMercentaMarginGbp
  );

  const contact = prospect.contacts?.[0];
  const vertical: OpportunityVerticalId =
    opts.vertical ??
    (prospect.distributors?.length
      ? 'distributor_channel'
      : strategyForProspect(prospect) === 'uk_brands'
        ? 'uk_brand'
        : 'international_brand');

  const countries = prospect.countries ?? [];
  const sourceMarketId = resolveSourceMarketId(countries[0]);
  const distributor = prospect.distributors?.[0];


  return {
    id: `opp-${prospect.id}`,
    vertical,
    claimDuty: OPPORTUNITY_VERTICALS[vertical].claimDuty,
    brand: prospect.brand,
    category: prospect.category,
    eligibility,
    strategy: assessment.strategy,
    geography: {
      countries,
      sourceMarketId,
      sourceMarketLabel: sourceMarketId ?? countries[0] ?? 'Unknown',
      destinationMarket: assessment.destinationMarket,
    },
    topAsins,
    asinCount: asins.length,
    productSummary: topAsins[0]?.title ?? 'No ASIN observed yet',
    amazonPresence: amazonPresenceFor(prospect),
    sellerCountMax,
    sellerStatusEvidence: asins.length
      ? `${asins.length} ASIN(s) observed; highest competing seller count ${sellerCountMax}; channel-sold line: ${
          asins.some((a) => a.amazonRetailSeller) ? 'yes' : 'no'
        }.`
      : 'No ASIN observed yet — seller status unknown.',
    authorisationIndicator: authorisationIndicatorFor(prospect),
    estimatedMonthlyUnits: observedUnits,
    estimatedMonthlyRevenueGbp: observedRevenue,
    priceRangeGbp,
    demandPotential: assessment.demandPotential,
    competitionHeadroom: assessment.competitionHeadroom,
    reviewPressure,
    estimatedPoPotentialGbp,
    estimatedMercentaRevenueGbp: mercentaRevenue,
    estimatedMercentaMarginGbp: assessment.projectedMercentaMarginGbp,
    recommendedCommercialModel: model,
    timeToRevenueWeeks: assessment.timeToRevenueWeeks,
    speedToRevenueScore: assessment.speedToRevenueScore,
    opportunityScore: assessment.speedToRevenueScore,
    distributionOpportunity: prospect.distributors?.length
      ? 'Distributor(s) already identified — verify territory and exclusivity before proposing Mercenta.'
      : prospect.wholesale?.wholesaleAvailable
        ? 'Wholesale/trade programme published — Mercenta can propose a managed UK channel route.'
        : 'No existing UK distributor identified in the stored evidence — an open distribution opportunity.',
    existingDistributorEvidence: distributor
      ? `${distributor.company} (${distributor.territory}${distributor.exclusive ? ', exclusive' : ''}) — ${distributor.source}`
      : 'None identified in the stored evidence.',
    contact: contact
      ? {
          name: contact.name,
          jobTitle: contact.jobTitle,
          email: contact.email,
          linkedin: contact.linkedInUrl,
          company: contact.company,
          source: contact.source,
          emailConfidence: contact.emailConfidence,
        }
      : null,
    decisionMaker: contact ? `${contact.name} — ${contact.jobTitle}` : 'Not yet identified',
    linkedin: contact?.linkedInUrl ?? '',
    website: prospect.website ?? '',
    recommendedCta: recommendedCtaFor(vertical, prospect.score.tier),
    claim: DEFAULT_CLAIM,
    estimateLabel: ESTIMATE_LABEL,
    confirmedPartnership: false,
    basis: 'derivation_over_stored_prospect',
  };
}

/* ── §13 — the ONE PO-potential formula, shared by every producer ───────── */

/** The declared competition factor: more sellers ⇒ a smaller share for Mercenta. */
export function competitionFactorFor(sellerCountMax: number): number {
  return Math.max(0.2, Math.min(1, 1 - (sellerCountMax - 1) * 0.08));
}

/** §13 — estimated PO opportunity for observed monthly channel revenue. */
export function poPotentialGbp(observedMonthlyRevenueGbp: number, sellerCountMax: number): number {
  return round2(observedMonthlyRevenueGbp * competitionFactorFor(sellerCountMax));
}

/* ── §12/§13 — ranking and rollup ───────────────────────────────────────── */

export interface OpportunityRanking {
  ranked: DerivedOpportunity[];
  /** §6 — retained and flagged, never silently dropped. */
  ineligible: OpportunityRecord[];
}

/**
 * §13 — rank by PO potential (the central objective), with speed-to-revenue as the
 * decisive secondary and a deterministic brand-name tiebreak, so replays are stable.
 * Ineligible records are NOT ranked — §6 forbids spending effort outside the ten
 * permitted categories — but they are returned separately rather than discarded.
 */
export function rankOpportunities(
  prospects: readonly BrandProspect[],
  opts: { model?: CommercialModel } = {}
): OpportunityRanking {
  const all = prospects.filter((p) => !p.disqualified).map((p) => deriveOpportunity(p, opts));
  const eligible = all.filter((r) => r.eligibility.eligibility === 'eligible');
  const ineligible = all.filter((r) => r.eligibility.eligibility !== 'eligible');
  const ranked = eligible
    .sort(
      (a, b) =>
        b.estimatedPoPotentialGbp - a.estimatedPoPotentialGbp ||
        b.speedToRevenueScore - a.speedToRevenueScore ||
        a.brand.localeCompare(b.brand)
    )
    .map((r, i) => ({ ...r, rank: i + 1 }));
  return { ranked, ineligible };
}

/** §9 — the vertical rollup the operator dashboard shows. */
export interface VerticalRollup {
  count: number;
  poPotentialGbp: number;
  mercentaRevenueGbp: number;
}

export function rollupByVertical(
  records: readonly OpportunityRecord[]
): Record<OpportunityVerticalId, VerticalRollup> {
  const out = Object.fromEntries(
    OPPORTUNITY_VERTICAL_ORDER.map((v) => [
      v,
      { count: 0, poPotentialGbp: 0, mercentaRevenueGbp: 0 },
    ])
  ) as Record<OpportunityVerticalId, VerticalRollup>;
  for (const r of records) {
    const bucket = out[r.vertical];
    bucket.count += 1;
    bucket.poPotentialGbp = round2(bucket.poPotentialGbp + r.estimatedPoPotentialGbp);
    bucket.mercentaRevenueGbp = round2(bucket.mercentaRevenueGbp + r.estimatedMercentaRevenueGbp);
  }
  return out;
}
/* ── §12 — SEEDED OPPORTUNITIES (sports / team / club, first) ───────────── */

/**
 * A hand-seeded opportunity that is NOT derived from a `BrandProspect` (a sports
 * club is not a brand prospect). It carries the same discipline: every element
 * declares its claim class, and `confirmedPartnership` is always `false`.
 *
 * EVIDENCE HONESTY (non-negotiable): the ASIN evidence for a seeded opportunity is
 * EMPTY until an operator runs the existing Brand Intelligence discovery for that
 * club's merchandise. `evidenceStatus` says so in words, so the surface can explain
 * exactly what is missing instead of showing a fabricated number.
 */
export interface SeededOpportunityInput {
  id: string;
  brand: string;
  /** Must be one of the ten permitted categories (§6) — Apparel for merchandise. */
  category: string;
  vertical: OpportunityVerticalId;
  productSummary: string;
  /** Empty until the BI engine has observed real ASINs. NEVER fabricated. */
  asins: OpportunityAsinSummary[];
  evidenceStatus: string;
  geography: { countries: string[]; sourceMarketId: string | null };
  /** Founder-supplied / public context, each tagged with its own claim class. */
  networkRoutes: { label: string; claim: ClaimClass; note: string }[];
  contact?: OpportunityContactIntelligence;
  linkedin?: string;
  website?: string;
  distributionOpportunity: string;
  existingDistributorEvidence: string;
  nextAction: string;
  /** Deliberately unused figures must stay zero rather than being invented. */
  estimatedMonthlyRevenueGbp: number;
  sellerCountMax: number;
}

/**
 * The FIRST seeded opportunity (§12). The opportunity is NOT that the club asked
 * Mercenta to distribute anything — the club has not been approached. The
 * opportunity is that Mercenta has identified visible merchandise demand on the
 * retail channel with a possible distribution gap, and can propose a managed UK
 * channel route.
 */
export const TOTTENHAM_OPPORTUNITY: SeededOpportunityInput = {
  id: 'opp-seed-tottenham',
  brand: 'Tottenham Hotspur',
  category: 'Apparel',
  vertical: 'sports_team_club',
  productSummary:
    'Club merchandise (replica/apparel lines) — retail-channel demand not yet captured at ASIN level.',
  asins: [],
  evidenceStatus:
    'ASIN-level evidence NOT captured yet. Run the existing Brand Intelligence discovery for this club\u2019s merchandise before quoting any demand or PO-potential figure. No number is shown until that evidence exists.',
  geography: { countries: ['UK'], sourceMarketId: 'GB' },
  networkRoutes: [
    {
      label: 'Tottenham Hotspur (the club)',
      claim: 'confirmed_fact',
      note: 'Publicly known UK Premier League club. This is the identity of the organisation, nothing more.',
    },
    {
      label: 'Hotspur Labs',
      claim: 'pending_confirmation',
      note: 'Founder-supplied context (owner folder: Parterships/Tottenham Hotspurs Ventures.jpeg). NOT independently verified — treat as a research lead, not an established relationship.',
    },
    {
      label: 'Players Fund / network connection',
      claim: 'pending_confirmation',
      note: 'Founder-supplied context. NOT verified. Any contact route must be confirmed by the founder before it is used.',
    },
    {
      label: 'LinkedIn / contact source',
      claim: 'pending_confirmation',
      note: 'A commercial/licensing decision-maker has not yet been identified in the stored evidence.',
    },
  ],
  contact: undefined,
  linkedin: '',
  website: 'https://www.tottenhamhotspur.com',
  distributionOpportunity:
    'Identified potential distribution opportunity: club merchandise demand is visible on the retail channel, and no exclusive UK channel distributor is recorded in Mercenta\u2019s evidence. Mercenta could propose managed retail-channel operations for selected lines.',
  existingDistributorEvidence:
    'Not established from Mercenta\u2019s stored evidence. The club\u2019s own licensing/distribution structure must be researched before any proposition is sent.',
  nextAction:
    'Run Brand Intelligence discovery for the club\u2019s merchandise ASINs, then generate a club proposition from the Partnerships Centre.',
  estimatedMonthlyRevenueGbp: 0,
  sellerCountMax: 0,
};

/** §12 — the sports vertical seed list. Tottenham is FIRST, as specified. */
export const SPORTS_OPPORTUNITY_SEEDS: readonly SeededOpportunityInput[] = [
  TOTTENHAM_OPPORTUNITY,
];

/** The standing honesty line shown with every seeded opportunity surface. */
export const SEEDED_OPPORTUNITY_DISCLAIMER =
  'Mercenta has NOT been approached by, and holds no agreement with, any organisation listed here. These are opportunities Mercenta has IDENTIFIED. Distribution potential is not a confirmed partnership.';

/**
 * Build the canonical `OpportunityRecord` for a seeded opportunity, using the SAME
 * PO-potential formula and the SAME commercial-model arithmetic as the derived
 * records — so a seeded sport opportunity can never disagree with the rest of the
 * platform about money.
 */
export function buildSeededOpportunity(
  input: SeededOpportunityInput,
  opts: { model?: CommercialModel } = {}
): OpportunityRecord {
  const model: CommercialModel = opts.model ?? 'commission_agent';
  const eligibility = categoryEligibility(input.category);
  const estimatedPoPotentialGbp = poPotentialGbp(
    input.estimatedMonthlyRevenueGbp,
    input.sellerCountMax
  );
  const mercentaRevenue = round2(
    model === 'commission_agent'
      ? computeCommissionModel({
          retailChannelRevenueGbp: estimatedPoPotentialGbp,
          commissionRatePct: DEMO_COMMISSION_RATE_PCT,
        }).mercentaCommissionGbp
      : estimatedPoPotentialGbp
  );
  const vertical = input.vertical;

  return {
    id: input.id,
    vertical,
    claimDuty: OPPORTUNITY_VERTICALS[vertical].claimDuty,
    brand: input.brand,
    category: input.category,
    eligibility,
    strategy: 'uk_brands',
    geography: {
      countries: input.geography.countries,
      sourceMarketId: input.geography.sourceMarketId,
      sourceMarketLabel: input.geography.sourceMarketId ?? input.geography.countries[0] ?? 'Unknown',
      destinationMarket: 'United Kingdom',
    },
    topAsins: input.asins,
    asinCount: input.asins.length,
    productSummary: input.productSummary,
    amazonPresence: input.asins.length ? amazonPresenceForSeed(input) : 'unknown',
    sellerCountMax: input.sellerCountMax,
    sellerStatusEvidence: input.evidenceStatus,
    authorisationIndicator: 'unknown',
    estimatedMonthlyUnits: input.asins.reduce((s, a) => s + (a.estimatedMonthlyUnits ?? 0), 0),
    estimatedMonthlyRevenueGbp: input.estimatedMonthlyRevenueGbp,
    priceRangeGbp: { low: 0, high: 0 },
    demandPotential: 0,
    competitionHeadroom: 0,
    reviewPressure: input.asins.reduce((s, a) => s + a.reviewCount, 0),
    estimatedPoPotentialGbp,
    estimatedMercentaRevenueGbp: mercentaRevenue,
    estimatedMercentaMarginGbp: 0,
    recommendedCommercialModel: model,
    timeToRevenueWeeks: 0,
    speedToRevenueScore: 0,
    opportunityScore: 0,
    distributionOpportunity: input.distributionOpportunity,
    existingDistributorEvidence: input.existingDistributorEvidence,
    contact: input.contact ?? null,
    decisionMaker: 'Not yet identified',
    linkedin: input.linkedin ?? '',
    website: input.website ?? '',
    recommendedCta: input.nextAction,
    claim: 'pending_confirmation',
    estimateLabel: ESTIMATE_LABEL,
    confirmedPartnership: false,
    basis: 'seeded_opportunity',
  };
}

/** A seeded opportunity's offer structure, derived from its own ASIN evidence. */
function amazonPresenceForSeed(input: SeededOpportunityInput): AmazonPresence {
  if (!input.asins.length) return 'unknown';
  const order: AmazonPresence[] = [
    'direct_retail',
    'present_unclear',
    'marketplace_only',
    'no_current_offer',
    'unknown',
  ];
  return input.asins.reduce<AmazonPresence>((best, a) => {
    const p = PRESENCE_BY_OFFER_CLASS[a.offerClass] ?? 'unknown';
    return order.indexOf(p) < order.indexOf(best) ? p : best;
  }, 'unknown');
}

/**
 * §12 — the sports/team/club opportunities ready for the operator surface. No
 * ranking is applied while their ASIN evidence is empty: an unranked opportunity is
 * honest, a ranked one with no evidence would not be.
 */
export function sportsOpportunities(
  opts: { model?: CommercialModel } = {}
): OpportunityRecord[] {
  return SPORTS_OPPORTUNITY_SEEDS.map((s) => buildSeededOpportunity(s, opts));
}
