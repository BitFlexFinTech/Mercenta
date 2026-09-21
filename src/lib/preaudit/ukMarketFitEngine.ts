/**
 * §PHASE 1 — EXPLORE UK MARKET FIT ENGINE (deterministic, no AI, no network).
 *
 * Turns a pre-audit input plus a research result into a UK MARKET FIT
 * ASSESSMENT: seven dimension findings, THREE SEPARATE indicators, a UK presence
 * classification, an eight-section UK Opportunity Snapshot, the open questions,
 * the captured educational gaps and ONE recommended next step.
 *
 * WHAT THIS ENGINE REFUSES TO DO
 * ------------------------------
 * - It never produces a single "success score". `NO_SINGLE_SUCCESS_SCORE` is a
 *   declared constant and the snapshot type forbids the field.
 * - It never invents a number. A margin is computed ONLY from a supplied cost
 *   and a supplied price; a lead-time verdict ONLY from a supplied lead time.
 *   Everything else is reported as UNKNOWN with the question that would resolve
 *   it.
 * - It never promotes an estimate to a fact. Every evidence record carries its
 *   declared basis, and simulated evidence can never be `high` confidence.
 * - It never promises an outcome. Every generated statement is phrased with a
 *   declared hedge (`PRE_AUDIT_HEDGES`) and the prohibited-promise list is
 *   asserted by the validator.
 * - It never decides. Qualification is a statement about the evidence, and the
 *   next step is a RECOMMENDATION.
 *
 * PURITY: every function here is a pure function of its arguments. The only
 * ambient value read is the pinned demo clock (`demoToday()`), so the same
 * inputs always produce the same assessment.
 */
import {
  APPROVED_CATEGORIES,
  isApprovedCategory,
  type BrandOpportunity,
  type PreAuditAssessment,
  type PreAuditEvidence,
  type PreAuditIndicator,
  type PreAuditInput,
  type PreAuditRule,
  type ProductOpportunity,
  type SupplyProfile,
  type UkMarketFitDimensionResult,
  type UkOpportunitySnapshot,
  type UkOpportunitySnapshotSection,
} from '@/types';
import {
  NO_SINGLE_SUCCESS_SCORE,
  PRE_AUDIT_DISCLAIMER,
  PRE_AUDIT_EDUCATIONAL_GAPS,
  PRE_AUDIT_HEDGES,
  PRE_AUDIT_INDICATORS,
  PRE_AUDIT_QUALIFICATIONS,
  PRE_AUDIT_SIMULATION_LABEL,
  PRE_AUDIT_UNCONFIGURED_LABEL,
  UK_MARKET_FIT_DIMENSIONS,
  UK_MARKET_FIT_THRESHOLDS,
  UK_OPPORTUNITY_SNAPSHOT_SECTIONS,
  UK_PRESENCE_CLASSES,
  UK_PRESENCE_UNKNOWN,
  type PreAuditEducationalGapId,
  type PreAuditIndicatorState,
  type PreAuditQualification,
  type UkPresenceOutcome,
} from '@/config/ukMarketFit';
import { normalizeBrandKey } from '@/lib/intelligence/prospectPipeline';
import { demoToday } from '@/lib/work/workStore';
import type { PreAuditResearchResult } from './researchProvider';

export { NO_SINGLE_SUCCESS_SCORE };

/* ── Evidence construction — one helper, so no evidence can lack its basis ── */

interface EvidenceContext {
  simulated: boolean;
  observedAt: string;
}

/**
 * Build one evidence record. Simulated evidence is capped at `medium`
 * confidence: a fixture can never be reported with the confidence of a verified
 * observation.
 */
function evidence(
  ctx: EvidenceContext,
  e: {
    field: string;
    value: string;
    sourceId: string;
    source: string;
    sourceUrl?: string;
    confidence: PreAuditEvidence['confidence'];
    classification: PreAuditEvidence['classification'];
    note?: string;
  }
): PreAuditEvidence {
  const confidence: PreAuditEvidence['confidence'] =
    ctx.simulated && e.confidence === 'high' ? 'medium' : e.confidence;
  return {
    field: e.field,
    value: e.value,
    sourceId: e.sourceId,
    source: e.source,
    sourceUrl: e.sourceUrl ?? '',
    observedAt: ctx.observedAt,
    basis: ctx.simulated ? 'simulated' : 'external_research',
    confidence,
    classification: e.classification,
    ...(e.note ? { note: e.note } : {}),
  };
}

/** Evidence the BRAND supplied — canonical input, not research. */
function suppliedEvidence(
  ctx: EvidenceContext,
  field: string,
  value: string,
  note?: string
): PreAuditEvidence {
  return {
    field,
    value,
    sourceId: 'brand_supplied',
    source: 'Supplied by the brand in the assessment',
    sourceUrl: '',
    observedAt: ctx.observedAt,
    basis: 'canonical',
    confidence: 'medium',
    classification: 'FACT',
    ...(note ? { note } : {}),
  };
}

const FIXTURE_SOURCE_LABEL = 'Deterministic simulation fixture';

function fixtureEvidence(
  ctx: EvidenceContext,
  field: string,
  value: string,
  fixtureId: string,
  classification: PreAuditEvidence['classification'] = 'ESTIMATE',
  confidence: PreAuditEvidence['confidence'] = 'medium'
): PreAuditEvidence {
  return evidence(ctx, {
    field,
    value,
    sourceId: 'marketplace_listing_data',
    source: `${FIXTURE_SOURCE_LABEL} (${fixtureId})`,
    confidence,
    classification,
    note: 'Simulated observation — not live third-party research.',
  });
}

/** A rule with the value it actually observed — never a bare threshold. */
function rule(id: string, threshold: string, observed: string): PreAuditRule {
  return { id, threshold, observed };
}

function indicator(
  id: PreAuditIndicator['id'],
  state: PreAuditIndicatorState,
  rationale: string,
  basis: PreAuditIndicator['basis'],
  evidenceRows: PreAuditEvidence[],
  observed: string[],
  rules: PreAuditRule[],
  confidence: PreAuditIndicator['confidence'],
  unknowns: string[],
  regulatory = false
): PreAuditIndicator {
  const def = PRE_AUDIT_INDICATORS.find((i) => i.id === id)!;
  return {
    id,
    label: def.label,
    question: def.question,
    state,
    rationale,
    basis,
    evidence: evidenceRows,
    observed,
    rules,
    confidence,
    unknowns,
    regulatory,
  };
}

function stateLabel(state: PreAuditIndicatorState): string {
  switch (state) {
    case 'favourable':
      return 'Favourable on the available evidence';
    case 'workable':
      return 'Workable, subject to verification';
    case 'constrained':
      return 'Constrained on the available evidence';
    default:
      return 'Not established';
  }
}

/* ── §8B — UK PRESENCE CLASSIFICATION (the deterministic ladder) ─────────── */

export interface UkPresenceClassification {
  presence: UkPresenceOutcome;
  label: string;
  rationale: string;
  evidence: PreAuditEvidence[];
  confidence: PreAuditEvidence['confidence'];
}

/**
 * The classification ladder, in the canonical order A → B → C → D → F → E.
 * F is checked before E because "demand evidence without availability" is a
 * strictly more informative state than "nothing found", and collapsing the two
 * would hide the strongest apparent opening.
 */
export function classifyUkPresence(
  input: PreAuditInput,
  research: PreAuditResearchResult
): UkPresenceClassification {
  const ctx: EvidenceContext = { simulated: research.simulated, observedAt: research.observedAt };
  const fixture = research.fixture;

  if (!research.ok || !fixture) {
    return {
      presence: UK_PRESENCE_UNKNOWN,
      label: 'Not established',
      rationale: `The UK position ${PRE_AUDIT_HEDGES.couldNotBeEstablished}.`,
      evidence: [],
      confidence: 'low',
    };
  }

  const f = fixture.fixtureId;
  const rows: PreAuditEvidence[] = [
    fixtureEvidence(ctx, 'uk_listings_observed', String(fixture.ukListingCount), f),
    fixtureEvidence(ctx, 'brand_present_in_uk', String(fixture.brandPresentInUk), f, 'INFERENCE', 'low'),
    fixtureEvidence(ctx, 'exact_product_listed_in_uk', String(fixture.exactProductListedInUk), f, 'INFERENCE', 'low'),
  ];
  if (input.productIdentifiers?.length) {
    rows.push(
      suppliedEvidence(
        ctx,
        'product_identifiers_supplied',
        input.productIdentifiers.join(', '),
        'Used to look for an exact UK identity; not independently verified.'
      )
    );
  }

  let presence: UkPresenceOutcome;
  if (fixture.exactProductListedInUk) presence = 'A';
  else if (fixture.equivalentProductListedInUk) presence = 'B';
  else if (fixture.brandPresentInUk && fixture.ukListingCount >= UK_MARKET_FIT_THRESHOLDS.catalogueDepthFloor) presence = 'C';
  else if (fixture.brandPresentInUk && fixture.ukListingCount > 0) presence = 'D';
  else if (!fixture.brandPresentInUk && fixture.ukDemandWithoutAvailability) presence = 'F';
  else presence = 'E';

  const def = UK_PRESENCE_CLASSES.find((c) => c.id === presence)!;
  return {
    presence,
    label: `${presence} — ${def.label}`,
    rationale: `${PRE_AUDIT_HEDGES.evidenceSuggests} ${def.description} This ${PRE_AUDIT_HEDGES.requiresVerification} before it is relied on.`,
    evidence: rows,
    confidence: 'medium',
  };
}

/* ── §9 — INDICATOR 1: CATALOGUE ELIGIBILITY (regulatory, not commercial) ── */

function buildCatalogueEligibility(
  input: PreAuditInput,
  research: PreAuditResearchResult
): PreAuditIndicator {
  const ctx: EvidenceContext = { simulated: research.simulated, observedAt: research.observedAt };
  const rules: PreAuditRule[] = [
    rule(
      'approved_category_gate',
      APPROVED_CATEGORIES.join(' · '),
      input.category || 'not supplied'
    ),
  ];
  const evidenceRows: PreAuditEvidence[] = [];
  const unknowns: string[] = [];

  if (!input.category) {
    return indicator(
      'catalogue_eligibility',
      'unknown',
      `No category was supplied, so the applicable catalogue requirements ${PRE_AUDIT_HEDGES.couldNotBeEstablished}.`,
      'canonical',
      evidenceRows,
      ['category: not supplied'],
      rules,
      'low',
      ['The product category has to be supplied before requirements can be identified.'],
      true
    );
  }

  const approved = isApprovedCategory(input.category);
  if (!approved) {
    return indicator(
      'catalogue_eligibility',
      'constrained',
      `${input.category} is not one of the categories Mercenta can evaluate for this route, so the product is not eligible on the available information.`,
      'canonical',
      [],
      [`category: ${input.category}`, 'eligible: false'],
      rules,
      'high',
      [],
      true
    );
  }

  const docs = (input.knownDocumentation ?? []).filter((d) => d.trim().length > 0);
  if (docs.length > 0) {
    evidenceRows.push(
      suppliedEvidence(
        ctx,
        'known_documentation',
        docs.join(', '),
        'Supplied by the brand. The assessment cannot verify these documents — that is a compliance review, not an assessment.'
      )
    );
    unknowns.push(
      'The supplied documentation has not been reviewed or verified; a compliance review is required.',
      'Category-specific requirements beyond the supplied list have not been identified.'
    );
    return indicator(
      'catalogue_eligibility',
      'workable',
      `${PRE_AUDIT_HEDGES.basedOnAvailableInformation}, documentation was supplied for this product, but it ${PRE_AUDIT_HEDGES.requiresVerification} and a compliance review is required before any product can trade.`,
      'canonical',
      evidenceRows,
      [`category: ${input.category}`, `documentation supplied: ${docs.length}`, 'verified: false'],
      rules,
      'medium',
      unknowns,
      true
    );
  }

  unknowns.push(
    'No product documentation has been supplied, so applicable requirements could not be identified.',
    'This is not a compliance determination — it is the absence of information.'
  );
  return indicator(
    'catalogue_eligibility',
    'unknown',
    `${PRE_AUDIT_HEDGES.couldNotBeEstablished} without product documentation. The category is one Mercenta can evaluate, but no applicable requirement has been confirmed.`,
    'canonical',
    evidenceRows,
    [`category: ${input.category}`, 'documentation supplied: 0'],
    rules,
    'low',
    unknowns,
    true
  );
}


/* ── §9 — INDICATOR 2: COMMERCIAL OPPORTUNITY (never an invented margin) ─── */

function buildCommercialOpportunity(
  input: PreAuditInput,
  research: PreAuditResearchResult
): PreAuditIndicator {
  const ctx: EvidenceContext = { simulated: research.simulated, observedAt: research.observedAt };
  const T = UK_MARKET_FIT_THRESHOLDS;
  const rules: PreAuditRule[] = [
    rule('workable_margin_pct', `≥ ${T.workableMarginPct}%`, 'no margin computed'),
    rule('constrained_margin_pct', `< ${T.constrainedMarginPct}%`, 'no margin computed'),
  ];
  const evidenceRows: PreAuditEvidence[] = [];
  const observed: string[] = [];
  const unknowns: string[] = [];

  if (research.fixture) {
    const band = research.fixture.observedPriceBandGbp;
    evidenceRows.push(
      fixtureEvidence(
        ctx,
        'observed_price_band_gbp',
        `£${band[0]}–£${band[1]}`,
        research.fixture.fixtureId,
        'ESTIMATE',
        'low'
      )
    );
    observed.push(`observed source-market price band: £${band[0]}–£${band[1]}`);
  }

  const hasCost = typeof input.wholesaleCost === 'number' && input.wholesaleCost > 0;
  const hasPrice = typeof input.retailPrice === 'number' && input.retailPrice > 0;

  if (hasCost && hasPrice) {
    const cost = input.wholesaleCost as number;
    const price = input.retailPrice as number;
    const marginGbp = price - cost;
    const marginPct = Math.round(((price - cost) / price) * 1000) / 10;
    evidenceRows.push(
      suppliedEvidence(ctx, 'wholesale_cost', `£${cost}`, 'Supplied by the brand — not verified.'),
      suppliedEvidence(ctx, 'intended_retail_price', `£${price}`, 'Supplied by the brand — not verified.')
    );
    observed.push(
      `supplied cost £${cost}`,
      `supplied price £${price}`,
      `gross spread £${marginGbp}`,
      `gross spread share ${marginPct}%`
    );
    rules[0] = rule('workable_margin_pct', `≥ ${T.workableMarginPct}%`, `${marginPct}%`);
    rules[1] = rule('constrained_margin_pct', `< ${T.constrainedMarginPct}%`, `${marginPct}%`);

    // The additional costs are ALWAYS declared as unknown: a spread is not a margin.
    unknowns.push(
      'Carrier cost, payment fees, other agreed fees, VAT and deductions have not been applied, so this is a GROSS spread and not a net margin.',
      'The supplied figures have not been verified against an invoice or a price list.'
    );

    const state: PreAuditIndicatorState =
      marginPct >= T.workableMarginPct ? 'favourable' : marginPct >= T.constrainedMarginPct ? 'workable' : 'constrained';
    return indicator(
      'commercial_opportunity',
      state,
      `${PRE_AUDIT_HEDGES.basedOnAvailableInformation}, the supplied cost and price give a gross spread of ${marginPct}% (${stateLabel(state)}). Every additional cost is listed separately and has NOT been applied.`,
      'canonical',
      evidenceRows,
      observed,
      rules,
      'medium',
      unknowns
    );
  }

  unknowns.push(
    hasCost
      ? 'No intended retail price was supplied, so no spread could be calculated.'
      : hasPrice
        ? 'No wholesale/cost price was supplied, so no spread could be calculated.'
        : 'Neither a wholesale/cost price nor an intended retail price was supplied, so no spread could be calculated.',
    'Carrier cost, payment fees, other agreed fees, VAT and deductions are unknown.'
  );
  return indicator(
    'commercial_opportunity',
    'unknown',
    `No commercial spread was calculated: ${PRE_AUDIT_HEDGES.couldNotBeEstablished} without a supplied cost and price. No figure has been invented.`,
    research.fixture ? 'simulated' : 'canonical',
    evidenceRows,
    observed,
    rules,
    'low',
    unknowns
  );
}


/* ── §9 — INDICATOR 3: SUPPLY / REPLENISHMENT VIABILITY ──────────────────── */

function buildSupplyViability(input: PreAuditInput, research: PreAuditResearchResult): PreAuditIndicator {
  const ctx: EvidenceContext = { simulated: research.simulated, observedAt: research.observedAt };
  const T = UK_MARKET_FIT_THRESHOLDS;
  const evidenceRows: PreAuditEvidence[] = [];
  const observed: string[] = [];
  const unknowns: string[] = [];
  const rules: PreAuditRule[] = [
    rule('short_lead_time_days', `≤ ${T.shortLeadTimeDays}`, 'no lead time supplied'),
    rule('long_lead_time_days', `> ${T.longLeadTimeDays}`, 'no lead time supplied'),
    rule('low_friction_moq', `≤ ${T.lowFrictionMoq}`, 'no MOQ supplied'),
    rule('high_friction_moq', `> ${T.highFrictionMoq}`, 'no MOQ supplied'),
  ];

  if (input.origin) {
    evidenceRows.push(suppliedEvidence(ctx, 'origin', input.origin));
    observed.push(`origin: ${input.origin}`);
  } else {
    unknowns.push('The origin / ship-from country has not been supplied, so no route can be planned.');
  }

  let verdict: PreAuditIndicatorState = 'unknown';
  let anySupplied = false;

  if (typeof input.leadTimeDays === 'number' && input.leadTimeDays > 0) {
    anySupplied = true;
    const days = input.leadTimeDays;
    evidenceRows.push(
      suppliedEvidence(ctx, 'lead_time_days', String(days), 'Supplied by the brand — not verified against a carrier schedule.')
    );
    observed.push(`supplied production/lead time: ${days} days`);
    rules[0] = rule('short_lead_time_days', `≤ ${T.shortLeadTimeDays}`, `${days}`);
    rules[1] = rule('long_lead_time_days', `> ${T.longLeadTimeDays}`, `${days}`);
    verdict = days <= T.shortLeadTimeDays ? 'favourable' : days <= T.longLeadTimeDays ? 'workable' : 'constrained';
    // The declared bar is Mercenta's PLANNING bar, never a channel rule.
    unknowns.push(
      'Freight transit, customs clearance and a safety buffer have not been added to the supplied lead time.',
      `The ${T.longLeadTimeDays}-day bar is Mercenta's declared planning threshold, not a rule imposed by any carrier or retail channel.`
    );
  }

  if (typeof input.moq === 'number' && input.moq > 0) {
    anySupplied = true;
    const moq = input.moq;
    evidenceRows.push(suppliedEvidence(ctx, 'moq', String(moq), 'Supplied by the brand — not verified.'));
    observed.push(`supplied MOQ: ${moq}`);
    rules[2] = rule('low_friction_moq', `≤ ${T.lowFrictionMoq}`, `${moq}`);
    rules[3] = rule('high_friction_moq', `> ${T.highFrictionMoq}`, `${moq}`);
    if (moq > T.highFrictionMoq) verdict = 'constrained';
    else if (verdict === 'unknown') verdict = moq <= T.lowFrictionMoq ? 'favourable' : 'workable';
    else if (verdict === 'favourable' && moq > T.lowFrictionMoq) verdict = 'workable';
  } else {
    unknowns.push('No minimum order quantity was supplied, so first-order friction is unknown.');
  }

  if (!input.casePack) {
    unknowns.push('No case pack was supplied, so carton and pallet planning could not be considered.');
  } else {
    evidenceRows.push(suppliedEvidence(ctx, 'case_pack', String(input.casePack)));
    observed.push(`supplied case pack: ${input.casePack}`);
  }

  if (!anySupplied) {
    return indicator(
      'supply_viability',
      'unknown',
      `Supply viability ${PRE_AUDIT_HEDGES.couldNotBeEstablished}: no lead time or MOQ was supplied, so no route can be judged. No lead-time limit has been assumed.`,
      'canonical',
      evidenceRows,
      observed,
      rules,
      'low',
      unknowns
    );
  }

  return indicator(
    'supply_viability',
    verdict,
    `${PRE_AUDIT_HEDGES.basedOnAvailableInformation}, supply appears ${
      verdict === 'constrained' ? 'constrained' : 'workable, subject to verification'
    } on the supplied lead time and order quantity. Freight, customs and a safety buffer are NOT included.`,
    'canonical',
    evidenceRows,
    observed,
    rules,
    'medium',
    unknowns
  );
}



/* ── §8 — THE SEVEN DIMENSION FINDINGS ───────────────────────────────────── */

function buildDimensions(
  input: PreAuditInput,
  research: PreAuditResearchResult,
  presence: UkPresenceClassification,
  indicators: PreAuditIndicator[]
): UkMarketFitDimensionResult[] {
  const ctx: EvidenceContext = { simulated: research.simulated, observedAt: research.observedAt };
  const fixture = research.fixture;
  const T = UK_MARKET_FIT_THRESHOLDS;
  const out: UkMarketFitDimensionResult[] = [];

  const push = (
    id: UkMarketFitDimensionResult['id'],
    finding: string,
    basis: UkMarketFitDimensionResult['basis'],
    rows: PreAuditEvidence[],
    confidence: UkMarketFitDimensionResult['confidence'],
    unknowns: string[],
    indeterminate = false
  ) => {
    const def = UK_MARKET_FIT_DIMENSIONS.find((d) => d.id === id)!;
    out.push({ id, label: def.label, finding, basis, evidence: rows, confidence, unknowns, indeterminate });
  };

  /* 1. Source-market demand — simulated observations only. */
  if (fixture) {
    const traction =
      fixture.sourceMarketReviewVolume >= T.reviewTractionStrong
        ? 'strong'
        : fixture.sourceMarketReviewVolume >= T.reviewTractionFloor
          ? 'some'
          : 'little';
    const rows = [
      fixtureEvidence(ctx, 'source_market_review_volume', String(fixture.sourceMarketReviewVolume), fixture.fixtureId),
      fixtureEvidence(ctx, 'source_market_rating', String(fixture.sourceMarketRating), fixture.fixtureId, 'ESTIMATE', 'low'),
      fixtureEvidence(ctx, 'source_market_listing_count', String(fixture.sourceMarketListingCount), fixture.fixtureId),
    ];
    push(
      'source_market_demand',
      `${PRE_AUDIT_HEDGES.evidenceSuggests} ${traction} traction for the brand where it already trades (${fixture.sourceMarketReviewVolume} reviews observed across ${fixture.sourceMarketListingCount} listing(s)). Source-market traction is NOT evidence of UK demand.`,
      'simulated',
      rows,
      'medium',
      [
        'Review volume is a proxy for traction, not a measure of sales.',
        'No transfer of demand from the source market to the UK has been established.',
        `rule review_traction_floor: ≥ ${T.reviewTractionFloor} vs observed ${fixture.sourceMarketReviewVolume}`,
        `rule review_traction_strong: ≥ ${T.reviewTractionStrong} vs observed ${fixture.sourceMarketReviewVolume}`,
      ]
    );
  } else {
    push(
      'source_market_demand',
      `Source-market demand ${PRE_AUDIT_HEDGES.couldNotBeEstablished}.`,
      'canonical',
      [],
      'low',
      ['No research result was available, so no demand evidence could be assessed.'],
      true
    );
  }

  /* 2. UK market presence — the classification itself. */
  push(
    'uk_market_presence',
    presence.rationale,
    presence.evidence.some((e) => e.basis === 'simulated') ? 'simulated' : 'canonical',
    presence.evidence,
    presence.confidence,
    presence.presence === UK_PRESENCE_UNKNOWN
      ? ['The UK position could not be classified from the available evidence.']
      : ['The classification is what the available evidence suggests and requires verification.']
  );

  /* 3. UK category opportunity. */
  if (fixture) {
    push(
      'uk_category_opportunity',
      `${PRE_AUDIT_HEDGES.evidenceSuggests} the UK category is ${
        fixture.ukCategoryCrowded ? 'already well served' : 'not obviously saturated'
      }${
        fixture.differentiationApparent
          ? ', with an apparent route to differentiation'
          : ', with no obvious differentiation identified'
      }. Competition has not been measured directly.`,
      'simulated',
      [fixtureEvidence(ctx, 'uk_category_crowded', String(fixture.ukCategoryCrowded), fixture.fixtureId, 'INFERENCE', 'low')],
      'low',
      [
        'Competition has not been measured directly; this is an impression from simulated observations.',
        'Category-specific UK requirements have not been identified.',
      ]
    );
  } else {
    push(
      'uk_category_opportunity',
      `The UK category opportunity ${PRE_AUDIT_HEDGES.couldNotBeEstablished}.`,
      'canonical',
      [],
      'low',
      ['No research result was available, so the category could not be assessed.'],
      true
    );
  }

  /* 4. Product fit. */
  push(
    'product_fit',
    input.productName
      ? `${PRE_AUDIT_HEDGES.basedOnAvailableInformation}, "${input.productName}" ${
          presence.presence === 'F'
            ? 'appears to have UK demand evidence without an available UK listing'
            : presence.presence === 'A' || presence.presence === 'B'
              ? 'appears to already be represented in the UK'
              : 'has no established UK position'
        }. Whether the product will be accepted, listed or sold is not something this assessment can establish.`
      : `Product fit ${PRE_AUDIT_HEDGES.couldNotBeEstablished}: no specific product was named, so the assessment covers the brand's catalogue as a whole.`,
    presence.evidence.some((e) => e.basis === 'simulated') ? 'simulated' : 'canonical',
    presence.evidence,
    input.productName ? 'medium' : 'low',
    input.productName
      ? ['Brand strength and catalogue-expansion potential have not been assessed.']
      : ['Name a specific product to assess product-level fit.'],
    !input.productName
  );

  /* 5. Commercial opportunity — reads the indicator, never re-derives it. */
  const commercial = indicators.find((i) => i.id === 'commercial_opportunity')!;
  push(
    'commercial_opportunity',
    commercial.rationale,
    commercial.basis,
    commercial.evidence,
    commercial.confidence,
    commercial.unknowns,
    commercial.state === 'unknown'
  );

  /* 6. Supply / replenishment viability — reads the indicator. */
  const supply = indicators.find((i) => i.id === 'supply_viability')!;
  push(
    'supply_replenishment_viability',
    supply.rationale,
    supply.basis,
    supply.evidence,
    supply.confidence,
    supply.unknowns,
    supply.state === 'unknown'
  );

  /* 7. Compliance / readiness — reads the indicator. */
  const compliance = indicators.find((i) => i.id === 'catalogue_eligibility')!;
  push(
    'compliance_readiness',
    compliance.rationale,
    compliance.basis,
    compliance.evidence,
    compliance.confidence,
    compliance.unknowns,
    compliance.state === 'unknown'
  );

  return out;
}

/* ── §7/§9 — QUALIFICATION (a statement about evidence, never a promise) ──── */

export interface QualificationVerdict {
  qualification: PreAuditQualification;
  label: string;
  rationale: string;
}

/**
 * Deterministic qualification. The rule is deliberately conservative: a
 * `qualified` verdict requires BOTH the regulatory indicator and the supply
 * indicator to have reached a workable-or-better state, because "the evidence
 * suggests a credible UK opportunity" is not a statement the assessment is
 * entitled to make while either of those is still unknown.
 */
export function deriveQualification(
  input: PreAuditInput,
  research: PreAuditResearchResult,
  indicators: PreAuditIndicator[]
): QualificationVerdict {
  const def = (id: PreAuditQualification) => PRE_AUDIT_QUALIFICATIONS.find((q) => q.id === id)!;

  if (input.category && !isApprovedCategory(input.category)) {
    return {
      qualification: 'ineligible',
      label: def('ineligible').label,
      rationale: `${input.category} is not one of the categories Mercenta can evaluate for this route, so the opportunity cannot be taken further on this route.`,
    };
  }

  if (!research.ok) {
    return {
      qualification: 'unqualified',
      label: def('unqualified').label,
      rationale: `No assessment could be formed: ${research.reason}`,
    };
  }

  const eligibility = indicators.find((i) => i.id === 'catalogue_eligibility')!;
  const supply = indicators.find((i) => i.id === 'supply_viability')!;
  const commercial = indicators.find((i) => i.id === 'commercial_opportunity')!;

  if (eligibility.state === 'constrained' || supply.state === 'constrained') {
    return {
      qualification: 'needs_information',
      label: def('needs_information').label,
      rationale: `A constrained indicator has to be resolved before this can be treated as a credible opportunity: ${
        eligibility.state === 'constrained' ? 'catalogue eligibility' : 'supply viability'
      }.`,
    };
  }

  const unresolved = [eligibility, supply, commercial].filter((i) => i.state === 'unknown');
  if (unresolved.length > 0) {
    return {
      qualification: 'needs_information',
      label: def('needs_information').label,
      rationale: `The assessment is workable, but ${unresolved.map((i) => i.label.toLowerCase()).join(' and ')} ${
        unresolved.length === 1 ? 'is' : 'are'
      } not yet established. Supplying the open questions resolves them.`,
    };
  }

  return {
    qualification: 'qualified',
    label: def('qualified').label,
    rationale:
      'On the available evidence, a credible UK opportunity appears to exist and the assessment is complete enough to be reviewed. This is a recommendation for review — not a promise of purchase orders, acceptance, sales or a listing.',
  };
}



/* ── §10 — THE UK OPPORTUNITY SNAPSHOT (eight sections) ──────────────────── */

function buildSnapshotSections(
  input: PreAuditInput,
  research: PreAuditResearchResult,
  presence: UkPresenceClassification,
  indicators: PreAuditIndicator[],
  dimensions: UkMarketFitDimensionResult[],
  qualification: QualificationVerdict,
  openQuestions: string[],
  nextStep: string
): UkOpportunitySnapshotSection[] {
  const dim = (id: UkMarketFitDimensionResult['id']) => dimensions.find((d) => d.id === id)!;
  const ind = (id: PreAuditIndicator['id']) => indicators.find((i) => i.id === id)!;
  const section = (
    id: UkOpportunitySnapshotSection['id'],
    statements: string[],
    basis: UkOpportunitySnapshotSection['basis'],
    confidence: UkOpportunitySnapshotSection['confidence'],
    unknowns: string[]
  ): UkOpportunitySnapshotSection => {
    const def = UK_OPPORTUNITY_SNAPSHOT_SECTIONS.find((s) => s.id === id)!;
    return { id, title: def.title, statements, basis, confidence, unknowns };
  };

  return [
    section(
      'uk_market_presence',
      [
        `Current UK position: ${presence.label}.`,
        presence.rationale,
        input.existingUkPresence
          ? `You told us: ${input.existingUkPresence}. This has not been independently verified.`
          : `No existing UK presence was supplied by the brand, so the classification rests on the research alone.`,
      ],
      presence.evidence.some((e) => e.basis === 'simulated') ? 'simulated' : 'canonical',
      presence.confidence,
      dim('uk_market_presence').unknowns
    ),
    section(
      'product_opportunity',
      [dim('product_fit').finding, dim('uk_category_opportunity').finding],
      dim('product_fit').basis,
      dim('product_fit').confidence,
      [...dim('product_fit').unknowns, ...dim('uk_category_opportunity').unknowns]
    ),
    section(
      'market_evidence',
      [
        dim('source_market_demand').finding,
        `Evidence basis: ${dim('source_market_demand').basis}. ${
          research.simulated ? PRE_AUDIT_SIMULATION_LABEL : 'The research result was not simulated.'
        }`,
        ...research.sources.filter((s) => s.used).map((s) => `Source consulted: ${s.label} — ${s.note}`),
      ],
      dim('source_market_demand').basis,
      dim('source_market_demand').confidence,
      dim('source_market_demand').unknowns
    ),
    section(
      'commercial_considerations',
      [ind('commercial_opportunity').rationale],
      ind('commercial_opportunity').basis,
      ind('commercial_opportunity').confidence,
      ind('commercial_opportunity').unknowns
    ),
    section(
      'supply_considerations',
      [ind('supply_viability').rationale],
      ind('supply_viability').basis,
      ind('supply_viability').confidence,
      ind('supply_viability').unknowns
    ),
    section(
      'product_readiness',
      [
        ind('catalogue_eligibility').rationale,
        'This is a readiness view, not a compliance determination. A full compliance review is a separate, gated step.',
      ],
      ind('catalogue_eligibility').basis,
      ind('catalogue_eligibility').confidence,
      ind('catalogue_eligibility').unknowns
    ),
    section(
      'open_questions',
      openQuestions.length > 0 ? openQuestions : ['No open questions remain from the information supplied.'],
      'canonical',
      'high',
      []
    ),
    section(
      'recommended_next_step',
      [`${qualification.rationale}`, nextStep],
      'canonical',
      'high',
      []
    ),
  ];
}

/* ── §10/§16 — OPEN QUESTIONS, GAPS AND THE NEXT STEP ────────────────────── */

/** Deduplicated open questions, in a stable order. */
export function buildOpenQuestions(indicators: PreAuditIndicator[], input: PreAuditInput): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const i of indicators) {
    for (const u of i.unknowns) {
      if (!seen.has(u)) {
        seen.add(u);
        out.push(u);
      }
    }
  }
  if (!input.productName) {
    const q = 'Which specific product should be assessed first? The assessment currently covers the catalogue as a whole.';
    if (!seen.has(q)) out.push(q);
  }
  if (!input.contactEmail) {
    const q = 'A contact email is only needed if you want Mercenta to review this assessment.';
    if (!seen.has(q)) out.push(q);
  }
  return out;
}

/** The educational gaps the assessment could NOT confirm the brand already has. */
export function captureEducationalGaps(
  input: PreAuditInput
): { id: PreAuditEducationalGapId; label: string; academyStage: number }[] {
  const missing = new Set<PreAuditEducationalGapId>();
  if (!input.wholesaleCost) missing.add('wholesale_cost_price');
  if (!input.moq) missing.add('moq');
  if (!input.casePack) missing.add('case_pack');
  if (!input.productIdentifiers?.length) missing.add('product_identifiers');
  if (!input.knownDocumentation?.length) missing.add('compliance_documentation');
  if (!input.category) missing.add('category_requirements');
  // The downstream operational concepts are not confirmable at pre-audit time,
  // so they are always captured — the Academy starts from the brand's real gaps.
  missing.add('master_carton');
  missing.add('sellable_unit');
  missing.add('packaging_hierarchy');
  missing.add('labelling');
  missing.add('dimensions_weight');
  missing.add('product_images');
  missing.add('purchase_orders');
  missing.add('po_acknowledgement');
  missing.add('shipping_fulfilment');
  missing.add('invoices_payments');
  missing.add('returns_deductions');

  return PRE_AUDIT_EDUCATIONAL_GAPS.filter((g) => missing.has(g.id)).map((g) => ({
    id: g.id,
    label: g.label,
    academyStage: g.academyStage,
  }));
}

/** ONE recommended next step — deterministic, and never a promise. */
export function recommendNextStep(qualification: QualificationVerdict): string {
  switch (qualification.qualification) {
    case 'ineligible':
      return 'Recommended next step: this product is outside the categories Mercenta evaluates for this route, so no further assessment is recommended on this route.';
    case 'unqualified':
      return 'Recommended next step: complete the assessment so a view can be formed, then re-run it.';
    case 'needs_information':
      return 'Recommended next step: supply the information listed under Open Questions and re-run the assessment. Mercenta can then form a view.';
    default:
      return 'Recommended next step: ask Mercenta to review this assessment. If the review supports it, the next stage is a commercial conversation about onboarding — which is a separate, gated process. This assessment does not start onboarding and does not make your brand a Mercenta partner.';
  }
}


/* ── §7 — THE CANONICAL RECORDS THE ASSESSMENT PRODUCES ──────────────────── */

export function buildBrandOpportunity(
  input: PreAuditInput,
  research: PreAuditResearchResult,
  presence: UkPresenceClassification,
  qualification: QualificationVerdict,
  nextStep: string,
  evidenceRefs: string[]
): BrandOpportunity {
  const now = demoToday();
  const dedupeKey = normalizeBrandKey(input.brandName);
  return {
    id: `brand-opportunity-${dedupeKey || 'unnamed'}`,
    dedupeKey,
    brand: input.brandName,
    website: input.website,
    sourceMarket: input.country,
    category: input.category,
    researchStatus: research.ok ? (research.simulated ? 'simulated' : 'live') : 'unavailable',
    ukMarketStatus: presence.presence,
    opportunityEvidence: presence.evidence.map((e) => `${e.field}=${e.value} (${e.basis})`),
    qualification: qualification.qualification,
    nextAction: nextStep,
    owner: 'staff:mercenta-ops',
    createdAt: now,
    updatedAt: now,
    evidenceRefs,
  };
}

export function buildProductOpportunities(
  assessmentId: string,
  input: PreAuditInput,
  research: PreAuditResearchResult,
  presence: UkPresenceClassification,
  indicators: PreAuditIndicator[]
): ProductOpportunity[] {
  const fixture = research.fixture;
  const identifiers = input.productIdentifiers ?? [];
  const asinLike = identifiers.filter((v) => /^B0[A-Z0-9]{8}$/i.test(v.trim()));
  const gtinLike = identifiers.filter((v) => /^\d{8,14}$/.test(v.trim()));

  const readiness: ProductOpportunity['readinessState'] = input.knownDocumentation?.length
    ? 'partially_documented'
    : 'not_documented';

  const matchRelationship: ProductOpportunity['matchRelationship'] = !fixture
    ? 'unknown'
    : fixture.exactProductListedInUk
      ? 'exact'
      : fixture.equivalentProductListedInUk
        ? 'probable'
        : 'none';

  const supply = indicators.find((i) => i.id === 'supply_viability')!;
  const commercial = indicators.find((i) => i.id === 'commercial_opportunity')!;

  const ctx: EvidenceContext = { simulated: research.simulated, observedAt: research.observedAt };
  const evidenceRows: PreAuditEvidence[] = [...presence.evidence];
  if (identifiers.length) {
    evidenceRows.push(suppliedEvidence(ctx, 'product_identifiers', identifiers.join(', ')));
  }

  return [
    {
      id: `product-opportunity-${assessmentId}-1`,
      assessmentId,
      brand: input.brandName,
      sourceMarket: input.country,
      productName: input.productName ?? null,
      sourceAsin: asinLike[0] ?? null,
      ukAsin: null,
      gtin: gtinLike[0] ?? null,
      ean: gtinLike.find((v) => v.trim().length === 13) ?? null,
      upc: gtinLike.find((v) => v.trim().length === 12) ?? null,
      model: null,
      matchRelationship,
      category: input.category,
      demandEvidence: fixture
        ? [`${fixture.sourceMarketReviewVolume} source-market reviews observed (simulated fixture ${fixture.fixtureId})`]
        : [],
      ukPresence: presence.presence,
      ukOpportunity: `${presence.label}. ${presence.rationale}`,
      pricingEvidence: fixture
        ? [`observed source-market price band £${fixture.observedPriceBandGbp[0]}–£${fixture.observedPriceBandGbp[1]} (simulated)`]
        : [],
      competitionEvidence: fixture
        ? [`UK category crowded: ${fixture.ukCategoryCrowded} (simulated impression, not a direct measurement)`]
        : [],
      readinessState: readiness,
      supplyConsiderations: supply.unknowns,
      confidence: commercial.confidence,
      evidence: evidenceRows,
      createdAt: demoToday(),
    },
  ];
}

export function buildSupplyProfile(
  assessmentId: string,
  input: PreAuditInput,
  research: PreAuditResearchResult
): SupplyProfile {
  const ctx: EvidenceContext = { simulated: research.simulated, observedAt: research.observedAt };
  const unknowns: string[] = [];
  const evidenceRows: PreAuditEvidence[] = [];

  if (!input.origin) unknowns.push('Origin / ship-from country not supplied.');
  else evidenceRows.push(suppliedEvidence(ctx, 'origin', input.origin));
  if (typeof input.leadTimeDays !== 'number') unknowns.push('Production lead time not supplied.');
  if (!input.moq) unknowns.push('Minimum order quantity not supplied.');
  if (!input.casePack) unknowns.push('Case pack not supplied.');

  unknowns.push(
    'Freight mode, transit estimate, customs clearance time and the UK final mile have not been supplied.',
    'No safety buffer has been assumed — a buffer is a planning decision, not a rule.'
  );

  return {
    id: `supply-profile-${assessmentId}`,
    assessmentId,
    origin: input.origin ?? null,
    shipFrom: input.origin ?? null,
    productionLeadTimeDays: typeof input.leadTimeDays === 'number' ? input.leadTimeDays : null,
    exportLeadTimeDays: null,
    freightMode: 'unknown',
    transitEstimateDays: null,
    customsRequired: Boolean(input.origin && input.origin.toLowerCase() !== 'united kingdom'),
    ukFinalMile: true,
    safetyBufferDays: null,
    planningLeadTimeDays: null,
    variability: 'unknown',
    moq: input.moq ?? null,
    casePack: input.casePack ?? null,
    unknowns,
    evidence: evidenceRows,
  };
}

/* ── §6 — INPUT VALIDATION (required fields only; everything else optional) ─ */

export interface PreAuditValidationResult {
  valid: boolean;
  /** Field-level messages, keyed by the canonical field name. */
  errors: Record<string, string>;
}

export function validatePreAuditInput(input: Partial<PreAuditInput>): PreAuditValidationResult {
  const errors: Record<string, string> = {};
  if (!input.brandName || input.brandName.trim().length < 2) {
    errors.brandName = 'A brand name is required to start research.';
  }
  if (!input.website || !/^https?:\/\/.+\..+/i.test(input.website.trim())) {
    errors.website = 'A website address is required — it is the primary research anchor.';
  }
  if (!input.country || input.country.trim().length < 2) {
    errors.country = 'The country you trade from is required.';
  }
  if (!input.category || input.category.trim().length < 2) {
    errors.category = 'A product category is required.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/* ── THE TOP-LEVEL ENGINE ENTRY POINT ───────────────────────────────────── */

export interface UkMarketFitAssessmentResult {
  snapshot: UkOpportunitySnapshot;
  indicators: PreAuditIndicator[];
  dimensions: UkMarketFitDimensionResult[];
  brandOpportunity: BrandOpportunity;
  productOpportunities: ProductOpportunity[];
  supplyProfile: SupplyProfile;
  qualification: PreAuditQualification;
  researchUnavailableReason: string | null;
  /** Every evidence record the assessment produced, in one place. */
  evidence: PreAuditEvidence[];
}

/**
 * Run the assessment. PURE: the same input and the same research result always
 * produce the same output. No AI, no network, no clock beyond the pinned demo
 * date, and no ambient state.
 */
export function assessUkMarketFit(
  assessmentId: string,
  input: PreAuditInput,
  research: PreAuditResearchResult
): UkMarketFitAssessmentResult {
  const presence = classifyUkPresence(input, research);
  const indicators: PreAuditIndicator[] = [
    buildCatalogueEligibility(input, research),
    buildCommercialOpportunity(input, research),
    buildSupplyViability(input, research),
  ];
  const dimensions = buildDimensions(input, research, presence, indicators);
  const qualification = deriveQualification(input, research, indicators);
  const openQuestions = buildOpenQuestions(indicators, input);
  const educationalGaps = captureEducationalGaps(input);
  const nextStep = recommendNextStep(qualification);
  const sections = buildSnapshotSections(
    input,
    research,
    presence,
    indicators,
    dimensions,
    qualification,
    openQuestions,
    nextStep
  );

  const rawEvidence = [
    ...presence.evidence,
    ...indicators.flatMap((i) => i.evidence),
    ...dimensions.flatMap((d) => d.evidence),
  ];
  // Deduplicate evidence by (field + value + source) so the same observation is
  // never counted twice across the indicator and dimension views.
  const seen = new Set<string>();
  const uniqueEvidence = rawEvidence.filter((e) => {
    const k = `${e.field}|${e.value}|${e.source}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const couldNotEstablish = dimensions
    .filter((d) => d.indeterminate)
    .map((d) => `${d.label}: ${PRE_AUDIT_HEDGES.couldNotBeEstablished}.`);

  const headline =
    qualification.qualification === 'qualified'
      ? `${PRE_AUDIT_HEDGES.evidenceSuggests} a credible UK opportunity for ${input.brandName}, subject to the open questions below.`
      : qualification.qualification === 'ineligible'
        ? `${input.brandName} does not appear to be eligible for this route on the information supplied.`
        : qualification.qualification === 'needs_information'
          ? `${PRE_AUDIT_HEDGES.evidenceSuggests} a workable UK opportunity for ${input.brandName}, but the assessment is not complete.`
          : `No assessment could be formed for ${input.brandName} from the information available.`;

  const snapshot: UkOpportunitySnapshot = {
    headline,
    presence: presence.presence,
    presenceLabel: presence.label,
    qualification: qualification.qualification,
    qualificationLabel: qualification.label,
    indicators,
    dimensions,
    sections,
    openQuestions,
    educationalGaps,
    recommendedNextStep: nextStep,
    couldNotEstablish,
    disclaimer: PRE_AUDIT_DISCLAIMER,
    researchMode: research.simulated ? 'simulated' : 'live',
    simulationLabel: research.simulated
      ? research.mode === 'simulation'
        ? PRE_AUDIT_SIMULATION_LABEL
        : PRE_AUDIT_UNCONFIGURED_LABEL
      : null,
  };

  const brandOpportunity = buildBrandOpportunity(
    input,
    research,
    presence,
    qualification,
    nextStep,
    uniqueEvidence.map((e) => `${e.field}:${e.value}`)
  );
  const productOpportunities = buildProductOpportunities(assessmentId, input, research, presence, indicators);
  const supplyProfile = buildSupplyProfile(assessmentId, input, research);

  return {
    snapshot,
    indicators,
    dimensions,
    brandOpportunity,
    productOpportunities,
    supplyProfile,
    qualification: qualification.qualification,
    researchUnavailableReason: research.ok ? null : research.reason,
    evidence: uniqueEvidence,
  };
}

/** Assertion helper: a snapshot must never carry a single success score. */
export function snapshotHasNoSuccessScore(snapshot: UkOpportunitySnapshot): boolean {
  return NO_SINGLE_SUCCESS_SCORE && !('successScore' in snapshot && snapshot.successScore !== undefined);
}

/**
 * Assertion helper: every generated statement in a CLAIM-BEARING section uses
 * the declared hedged vocabulary (or is a declared fact line).
 *
 * The `open_questions` and `recommended_next_step` sections are exempt BY
 * DECLARATION: a question is not a claim, and a recommendation is not a claim
 * either. They are instead covered by `statementsAvoidProhibitedPromises`.
 */
export function statementsUseDeclaredVocabulary(snapshot: UkOpportunitySnapshot): boolean {
  const hedges = Object.values(PRE_AUDIT_HEDGES) as string[];
  const factPrefixes = [
    'Current UK position:',
    'Evidence basis:',
    'Source consulted:',
    'You told us:',
    'No existing UK presence was supplied',
    'This is a readiness view',
  ];
  const nonClaimSections: UkOpportunitySnapshotSection['id'][] = ['open_questions', 'recommended_next_step'];
  return snapshot.sections
    .filter((s) => !nonClaimSections.includes(s.id))
    .every((s) =>
      s.statements.every((t) => hedges.some((h) => t.includes(h)) || factPrefixes.some((p) => t.startsWith(p)))
    );
}

/** Assertion helper: no statement may contain a prohibited promise. */
export function statementsAvoidProhibitedPromises(snapshot: UkOpportunitySnapshot, prohibited: readonly string[]): boolean {
  const text = [
    snapshot.headline,
    snapshot.recommendedNextStep,
    snapshot.disclaimer,
    ...snapshot.sections.flatMap((s) => s.statements),
  ]
    .join(' ')
    .toLowerCase();
  return prohibited.every((p) => !text.includes(p.toLowerCase()));
}

/** The canonical assessment record the store persists. */
export function buildAssessmentRecord(
  assessmentId: string,
  owner: PreAuditAssessment['owner'],
  input: PreAuditInput,
  result: UkMarketFitAssessmentResult,
  createdAt: string
): PreAuditAssessment {
  return {
    id: assessmentId,
    owner,
    status: result.researchUnavailableReason ? 'research_unavailable' : 'assessed',
    input,
    brandOpportunity: result.brandOpportunity,
    productOpportunities: result.productOpportunities,
    supplyProfile: result.supplyProfile,
    snapshot: result.snapshot,
    researchUnavailableReason: result.researchUnavailableReason,
    fedProspectId: null,
    createdAt,
    updatedAt: createdAt,
  };
}

