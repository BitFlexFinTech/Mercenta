/**
 * §Phase 2 — DETERMINISTIC COMMERCIAL READINESS DEMO SEED.
 *
 * Builds the FOUR commercial readiness cases the Phase 2 surfaces and the
 * work/automation integration are exercised against — one per declared route —
 * from REAL canonical records:
 *
 *   - the brand comes from the canonical demo brand list (`ALL_DEMO_BRANDS`),
 *   - the products come from the canonical catalog (`DEMO_PRODUCTS`),
 *   - the Phase 1 assessment + product opportunity + supply profile are created
 *     through the REAL pre-audit store (`startAssessment` / `attachAssessmentResult`)
 *     with the REAL deterministic research seam
 *     (`MockPreAuditResearchProvider.researchSync` — ZERO network), so the
 *     readiness record references records that genuinely exist rather than
 *     invented ids,
 *   - the commercial terms are declared here ONCE, with their value basis.
 *
 * This is NOT an isolated demo: the records land in the canonical store, are
 * projected into the canonical work layer, are read by the Control Centre, and
 * are reassessed through the same gate a real brand action uses.
 *
 * Determinism: no clock, no randomness. Calling the builder twice inside one
 * session is prevented by the store's own `booted` guard, because
 * `startAssessment` allocates the next per-brand run number.
 */
import {
  ALL_DEMO_BRANDS,
  DEMO_MODEL_A_BRAND_ID,
  DEMO_MODEL_B_BRAND_ID,
  DEMO_PRODUCTS,
} from './demoData';
import { assessUkMarketFit } from '@/lib/preaudit/ukMarketFitEngine';
import { MockPreAuditResearchProvider } from '@/lib/preaudit/researchProvider';
import { attachAssessmentResult, startAssessment } from './preAuditStore';
import { commercialTermValue } from '@/lib/commercial/economics';
import { normalizeBrandKey } from '@/lib/intelligence/prospectPipeline';
import type { CommercialViabilityInput } from '@/lib/commercial/commercialGate';
import type { CommercialViabilityRoute } from '@/config/commercialReadiness';
import type {
  CommercialReadinessAssessmentInput,
  CommercialTermValue,
  PreAuditInput,
} from '@/types';

/** The declared demo commercial terms + assessment basis for ONE case. */
interface DemoCase {
  /** The route this case is DESIGNED to produce (asserted by the validator). */
  expectedRoute: CommercialViabilityRoute;
  productIndex: number;
  terms: CommercialTermValue[];
  pack: CommercialViabilityInput['pack'];
  basis: CommercialReadinessAssessmentInput;
}

function term(
  field: Parameters<typeof commercialTermValue>[0]['field'],
  value: number | string,
  basis: Parameters<typeof commercialTermValue>[0]['basis'],
  source: string | null = null
): CommercialTermValue {
  return commercialTermValue({ field, value, basis, source });
}

/**
 * The four declared scenarios. Each is chosen so the DECLARED condition
 * catalogue + precedence ladder produce exactly one route:
 *
 *   ready        — every condition satisfied.
 *   remediation  — a required term is genuinely missing (fixable).
 *   human_review — every evaluable condition passes, but volume/pack/capacity/
 *                  lead-time cannot be judged, so the gate fails closed.
 *   blocked      — the observed economics are negative: definitively unmet.
 */
const DEMO_CASES: Record<string, DemoCase> = {
  [`${DEMO_MODEL_A_BRAND_ID}#1`]: {
    expectedRoute: 'ready',
    productIndex: 0,
    terms: [
      term('expected_uk_retail', 33, 'observed', 'demo catalog ukRetailPrice'),
      term('wholesale_cost', 12, 'actual', 'demo catalog exWorksPrice'),
      term('currency', 'GBP', 'actual', 'demo commercial terms'),
      term('rrp', 39.99, 'observed', 'demo catalog listing'),
      term('moq', 300, 'actual', 'brand declaration'),
    ],
    pack: {
      brandMoq: 300,
      productionMoq: 300,
      casePack: 6,
      casesPerCarton: 4,
      poQuantity: 600,
      cartonsPerPallet: 48,
    },
    basis: {
      perUnitLogisticsCostGbp: 2.4,
      perUnitChannelCostGbp: 3.6,
      intendedOrderQuantity: 600,
      projectedDemandUnits: 420,
      declaredSupplyCapacityUnits: 1200,
      supplyVariability: 'low',
      planningLeadTimeDays: 30,
      agreedMaxLeadTimeDays: 45,
    },
  },
  [`${DEMO_MODEL_A_BRAND_ID}#2`]: {
    expectedRoute: 'remediation',
    productIndex: 1,
    // Deliberately MISSING the required `currency` term — the fixable gap.
    terms: [
      term('expected_uk_retail', 42, 'observed', 'demo catalog ukRetailPrice'),
      term('wholesale_cost', 16, 'actual', 'demo catalog exWorksPrice'),
      term('moq', 240, 'actual', 'brand declaration'),
    ],
    pack: { brandMoq: 240, casePack: 6 },
    basis: {
      perUnitLogisticsCostGbp: 2.8,
      perUnitChannelCostGbp: 4.2,
      intendedOrderQuantity: 480,
      projectedDemandUnits: 380,
      declaredSupplyCapacityUnits: 900,
      supplyVariability: 'medium',
      planningLeadTimeDays: 35,
      agreedMaxLeadTimeDays: 45,
    },
  },
  [`${DEMO_MODEL_B_BRAND_ID}#1`]: {
    expectedRoute: 'human_review',
    productIndex: 0,
    terms: [
      term('expected_uk_retail', 35, 'estimated', 'demo catalog ukRetailPrice'),
      term('wholesale_cost', 13, 'actual', 'demo catalog exWorksPrice'),
      term('currency', 'GBP', 'actual', 'demo commercial terms'),
      term('rrp', 34.99, 'observed', 'demo catalog listing'),
    ],
    pack: {},
    basis: {
      perUnitLogisticsCostGbp: null,
      perUnitChannelCostGbp: null,
      intendedOrderQuantity: null,
      projectedDemandUnits: null,
      declaredSupplyCapacityUnits: null,
      supplyVariability: 'unknown',
      planningLeadTimeDays: 28,
      agreedMaxLeadTimeDays: null,
    },
  },
  [`${DEMO_MODEL_B_BRAND_ID}#2`]: {
    expectedRoute: 'blocked',
    productIndex: 1,
    terms: [
      term('expected_uk_retail', 20, 'observed', 'demo catalog ukRetailPrice'),
      term('wholesale_cost', 22, 'actual', 'demo catalog exWorksPrice'),
      term('currency', 'GBP', 'actual', 'demo commercial terms'),
    ],
    pack: {},
    basis: {
      perUnitLogisticsCostGbp: 2,
      perUnitChannelCostGbp: 3,
      intendedOrderQuantity: null,
      projectedDemandUnits: null,
      declaredSupplyCapacityUnits: null,
      supplyVariability: 'unknown',
      planningLeadTimeDays: null,
      agreedMaxLeadTimeDays: null,
    },
  },
};

const provider = new MockPreAuditResearchProvider();

function brandFor(brandId: string) {
  const brand = ALL_DEMO_BRANDS.find((b) => b.id === brandId);
  if (!brand) throw new Error(`[commercial-readiness-seed] unknown demo brand ${brandId}`);
  return brand;
}

/**
 * Create the Phase 1 assessment chain for ONE case through the REAL stores and
 * return the assembled commercial viability input.
 */
function buildCaseInput(brandId: string, spec: DemoCase): CommercialViabilityInput {
  const brand = brandFor(brandId);
  const product = DEMO_PRODUCTS.filter((p) => p.brandId === brandId)[spec.productIndex];
  if (!product) throw new Error(`[commercial-readiness-seed] no demo product for ${brandId}`);

  const owner = { kind: 'brand' as const, tenantId: brandId };

  const input: PreAuditInput = {
    brandName: brand.name,
    website: brand.website,
    country: brand.nation,
    category: brand.category,
    productName: product.name,
    productIdentifiers: [product.barcode],
    origin: brand.nation,
    wholesaleCost: product.exWorksPrice,
    retailPrice: product.ukRetailPrice,
  };

  const research = provider.researchSync({
    brandName: input.brandName,
    website: input.website,
    country: input.country,
    category: input.category,
    productName: input.productName,
    productIdentifiers: input.productIdentifiers,
    origin: input.origin,
  });

  const created = startAssessment(owner, input);
  const result = assessUkMarketFit(created.id, input, research);
  attachAssessmentResult(created.id, result);

  const assembled: CommercialViabilityInput = {
    owner,
    actor: 'system:commercial-readiness-seed',
    subject: {
      type: 'product_opportunity',
      id: product.id,
      label: `${brand.name} — ${product.name}`,
    },
    assessmentId: created.id,
    supplyProfileId: result.supplyProfile.id,
    productOpportunityId: result.productOpportunities[0]?.id ?? null,
    productRef: product.id,
    productLabel: `${brand.name} — ${product.name}`,
    dedupeKey: normalizeBrandKey(brand.name),
    terms: spec.terms,
    pack: spec.pack,
    ...spec.basis,
  };
  return assembled;
}

/** The declared demo cases, in a deterministic order (brand A then brand B). */
export function buildCommercialReadinessDemoInputs(): CommercialViabilityInput[] {
  const out: CommercialViabilityInput[] = [];
  for (const brandId of [DEMO_MODEL_A_BRAND_ID, DEMO_MODEL_B_BRAND_ID]) {
    for (let i = 1; i <= 2; i += 1) {
      const spec = DEMO_CASES[`${brandId}#${i}`];
      if (spec) out.push(buildCaseInput(brandId, spec));
    }
  }
  return out;
}

/** The route each seeded case is designed to produce — pinned by the validator. */
export const COMMERCIAL_READINESS_DEMO_EXPECTATIONS: readonly {
  brandId: string;
  caseIndex: number;
  expectedRoute: CommercialViabilityRoute;
}[] = Object.entries(DEMO_CASES).map(([key, spec]) => {
  const [brandId, index] = key.split('#');
  return { brandId, caseIndex: Number(index), expectedRoute: spec.expectedRoute };
});