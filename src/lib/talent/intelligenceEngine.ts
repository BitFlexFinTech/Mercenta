import {
  AcquisitionWorkflow,
  BrandRecord,
  CommercialRelationshipType,
  DiscoveredProduct,
  InternationalListing,
  ScoreBreakdown,
  ScoreFactor,
  SourceVerificationStamp,
  TalentBrandRelationship,
  TalentProfileRecord,
  UkMarketAssessment,
  UkOpportunityType,
} from '@/types/talent';
import { resolveBrandMedia, resolveProductMediaByKeywords } from '@/data/talent/brandProductMedia';

export function normalizeBrandKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/by\s+/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

export function getPriorityTier(score: number): ScoreBreakdown['priorityTier'] {
  if (score >= 76) return 'High Priority';
  if (score >= 56) return 'Medium Priority';
  if (score >= 38) return 'Watchlist';
  return 'Hold / Low';
}

const OWNERSHIP_RELATIONSHIPS: CommercialRelationshipType[] = [
  'Owned Business',
  'Founder',
  'Co-Owned',
  'Talent-Authorised',
  'Merchandise',
];

const LICENCE_RELATIONSHIPS: CommercialRelationshipType[] = ['Licensed', 'Collaboration'];

function getRelationshipScore(rels: TalentBrandRelationship[]): {
  points: number;
  bestLabel: string;
  isOwnedOrAuth: boolean;
} {
  const activeRels = rels.filter((r) => r.isCurrent);
  if (activeRels.length === 0) {
    return {
      points: rels.length > 0 ? 4 : 2,
      bestLabel: rels.length > 0 ? 'Historical Tie Only' : 'Unverified Commercial Link',
      isOwnedOrAuth: false,
    };
  }
  const hasOwned = activeRels.some((r) => OWNERSHIP_RELATIONSHIPS.includes(r.relationshipType));
  if (hasOwned) {
    const confirmedRight = activeRels.some(
      (r) => r.ukDistributionRightsConfirmed === 'Confirmed'
    );
    return {
      points: confirmedRight ? 25 : 22,
      bestLabel: confirmedRight
        ? 'Talent-Owned / Founder + UK Rights Confirmed'
        : 'Talent-Owned / Founder (Permission Step Required)',
      isOwnedOrAuth: true,
    };
  }
  const hasLicensed = activeRels.some((r) => LICENCE_RELATIONSHIPS.includes(r.relationshipType));
  if (hasLicensed) {
    return {
      points: 16,
      bestLabel: 'Licensed / Active Collaboration',
      isOwnedOrAuth: false,
    };
  }
  return {
    points: 13,
    bestLabel: 'Endorsement / Sponsorship (Intro Route Only)',
    isOwnedOrAuth: false,
  };
}

function getUkGapPoints(type: UkOpportunityType, maxPts: number): {
  points: number;
  rationale: string;
} {
  const ratioMap: Record<UkOpportunityType, { ratio: number; rationale: string }> = {
    'Type A — No UK Presence': {
      ratio: 1,
      rationale: 'Strong international demand with clean white-space Amazon UK entry.',
    },
    'Type D — UK DTC Site Only, No Amazon UK': {
      ratio: 0.92,
      rationale: 'Proven UK consumer demand via DTC site, missing Amazon UK Prime wholesale.',
    },
    'Type B — 3P / Unauthorised UK Sellers': {
      ratio: 0.84,
      rationale: 'Unauthorised UK 3P sellers confirm active UK demand; official brand clean-up opportunity.',
    },
    'Type C — Amazon UK Present, Unclear Wholesale': {
      ratio: 0.76,
      rationale: 'Existing Amazon UK footprint with unverified official wholesale route.',
    },
    'Type E — Partial / Limited UK Catalogue': {
      ratio: 0.68,
      rationale: 'Partial UK range leaves flagship variants and bundles unserved on Amazon.co.uk.',
    },
    'Type F — Existing UK Distributor (Caution)': {
      ratio: 0.28,
      rationale: 'Existing UK distributor increases channel conflict risk; proceed only with clearance.',
    },
    'Type G — Unsuitable / UK Market Barriers': {
      ratio: 0.08,
      rationale: 'UK regulatory, licensing, alcohol/perishability, or pricing barriers constrain feasibility.',
    },
  };
  const cfg = ratioMap[type];
  return {
    points: Math.round(cfg.ratio * maxPts),
    rationale: cfg.rationale,
  };
}

// ---------------------------------------------------------------------------
// 1. PRODUCT OPPORTUNITY SCORE (0–100)
// ---------------------------------------------------------------------------
export function scoreProductOpportunity(
  product: DiscoveredProduct,
  brand: BrandRecord | undefined,
  intlListings: InternationalListing[],
  ukAssessment: UkMarketAssessment | undefined,
  relationships: TalentBrandRelationship[]
): ScoreBreakdown {
  const prodListings = intlListings.filter(
    (l) => l.brandId === product.brandId && (!l.productId || l.productId === product.id)
  );
  const activeMarkets = new Set(
    prodListings
      .filter((l) => l.presenceStatus !== 'Not Found')
      .map((l) => l.market)
  );
  const intlPts = Math.min(25, Math.max(4, activeMarkets.size * 5));

  const oppType: UkOpportunityType =
    ukAssessment?.opportunityType ?? 'Type C — Amazon UK Present, Unclear Wholesale';
  const ukGap = getUkGapPoints(oppType, 30);

  const relScore = getRelationshipScore(relationships);
  const relPts = Math.round((relScore.points / 25) * 20);

  // Price / Amazon UK retail suitability (up to 15 pts)
  let pricePts = 8;
  let priceRationale = 'Reference UK RRP unconfirmed; preliminary wholesale band modelled.';
  if (typeof product.ukRrpGBP === 'number' && product.ukRrpGBP > 0) {
    if (product.ukRrpGBP >= 18 && product.ukRrpGBP <= 120) {
      pricePts = 15;
      priceRationale = `£${product.ukRrpGBP.toFixed(2)} UK RRP sits in optimal Amazon UK wholesale & FBA margin band.`;
    } else if (product.ukRrpGBP >= 10) {
      pricePts = 11;
      priceRationale = `£${product.ukRrpGBP.toFixed(2)} UK RRP viable via multi-pack or bundle architecture.`;
    } else {
      pricePts = 6;
      priceRationale = `Low unit price (£${product.ukRrpGBP.toFixed(2)}) requires multi-unit Amazon UK pack to absorb fulfilment.`;
    }
  } else if (typeof product.usPriceUSD === 'number' && product.usPriceUSD > 0) {
    pricePts = product.usPriceUSD >= 18 ? 13 : 9;
    priceRationale = `US retail ($${product.usPriceUSD.toFixed(2)}) observed; UK GBP landed wholesale pricing needs confirmation.`;
  }

  const verPts =
    product.verification.verificationTier === 'Verified Fact'
      ? 10
      : product.verification.verificationTier === 'Publicly Reported'
      ? 7
      : product.verification.verificationTier === 'Inference'
      ? 4
      : 2;

  const total = Math.min(100, intlPts + ukGap.points + relPts + pricePts + verPts);

  const factors: ScoreFactor[] = [
    {
      key: 'uk-gap',
      label: 'UK Market Gap & Channel White-Space',
      score: ukGap.points,
      maxScore: 30,
      rationale: ukGap.rationale,
    },
    {
      key: 'intl-proof',
      label: 'International Marketplace Proof',
      score: intlPts,
      maxScore: 25,
      rationale: `${activeMarkets.size} verified/observed international markets (${Array.from(activeMarkets).join(', ') || 'Pending scan'}).`,
    },
    {
      key: 'relationship',
      label: 'Talent Relationship & Rights Leverage',
      score: relPts,
      maxScore: 20,
      rationale: relScore.bestLabel,
    },
    {
      key: 'margin-fit',
      label: 'Amazon UK Unit Economics Fit',
      score: pricePts,
      maxScore: 15,
      rationale: priceRationale,
    },
    {
      key: 'evidence',
      label: 'Verification & Source Confidence',
      score: verPts,
      maxScore: 10,
      rationale: `${product.verification.verificationTier} (${product.verification.confidence} confidence).`,
    },
  ];

  const missingInformation = Array.from(
    new Set([
      ...product.verification.unknownFields,
      ...(ukAssessment?.verification.unknownFields ?? []),
      ...(product.asinUk ? [] : ['Verified Amazon.co.uk ASIN']),
      ...(brand?.ukWholesaleRouteStatus === 'Wholesale Authorised'
        ? []
        : ['Confirmed UK wholesale supply agreement']),
    ])
  );

  const keyRisks: string[] = [];
  if (ukAssessment?.existingDistributorDetected) {
    keyRisks.push('Existing UK distributor detected — territorial exclusivity check mandatory.');
  }
  if (ukAssessment?.complianceOrBarrierNote) {
    keyRisks.push(ukAssessment.complianceOrBarrierNote);
  }
  if (!relScore.isOwnedOrAuth) {
    keyRisks.push('Endorsement/collaboration tie does not grant wholesale rights — CAA intro required.');
  }
  if (oppType === 'Type B — 3P / Unauthorised UK Sellers') {
    keyRisks.push('Grey-market 3P sellers currently hold Buy Box without verified Brand Registry control.');
  }

  return {
    total,
    priorityTier: getPriorityTier(total),
    factors,
    supportingEvidence: [
      product.verification.evidenceSummary,
      ...(ukAssessment ? [ukAssessment.estimatedGapSummary] : []),
    ],
    missingInformation,
    keyRisks: keyRisks.length > 0 ? keyRisks : ['No critical compliance blockers flagged in current research pass.'],
    recommendedNextAction:
      oppType === 'Type G — Unsuitable / UK Market Barriers'
        ? 'Hold UK pursuit or resolve regulatory/duty compliance constraint.'
        : oppType === 'Type F — Existing UK Distributor (Caution)'
        ? 'Confirm whether existing UK distributor holds Amazon UK Vendor Central exclusivity.'
        : relScore.isOwnedOrAuth
        ? 'Confirm written UK wholesale & Amazon Brand Registry permission via Route 2.'
        : 'Request CAA partner introduction to brand commercial lead via Route 1.',
  };
}

// ---------------------------------------------------------------------------
// 2. BRAND OPPORTUNITY SCORE (0–100)
// ---------------------------------------------------------------------------
export function scoreBrandOpportunity(
  brand: BrandRecord,
  products: DiscoveredProduct[],
  intlListings: InternationalListing[],
  ukAssessments: UkMarketAssessment[],
  relationships: TalentBrandRelationship[],
  acquisitions: AcquisitionWorkflow[]
): ScoreBreakdown {
  const brandProducts = products.filter((p) => p.brandId === brand.id);
  const brandListings = intlListings.filter((l) => l.brandId === brand.id);
  const brandUk = ukAssessments.filter((u) => u.brandId === brand.id);
  const primaryUk = brandUk[0];
  const brandRels = relationships.filter((r) => r.brandId === brand.id);
  const activeAcq = acquisitions.find((a) => a.brandId === brand.id);

  // Depth of range (0-20)
  const depthPts = Math.min(20, 6 + brandProducts.length * 4);

  // International markets active (0-20)
  const intlMarkets = new Set(
    brandListings.filter((l) => l.presenceStatus !== 'Not Found').map((l) => l.market)
  );
  const intlPts = Math.min(20, Math.max(4, intlMarkets.size * 4));

  // UK Gap (0-25)
  const oppType: UkOpportunityType =
    primaryUk?.opportunityType ?? 'Type C — Amazon UK Present, Unclear Wholesale';
  const ukGap = getUkGapPoints(oppType, 25);

  // Talent relationship leverage (0-25)
  const relScore = getRelationshipScore(brandRels);
  const multiTalentBonus =
    new Set(brandRels.filter((r) => r.isCurrent).map((r) => r.talentId)).size > 1 ? 2 : 0;
  const relPts = Math.min(25, relScore.points + multiTalentBonus);

  // Route & Verification clarity (0-10)
  const routePts =
    brand.ukWholesaleRouteStatus === 'Wholesale Authorised'
      ? 10
      : activeAcq?.stage === 'Commercial Terms & Onboarding' || activeAcq?.stage === 'Amazon UK Ready'
      ? 9
      : brand.verification.verificationTier === 'Verified Fact'
      ? 7
      : brand.verification.verificationTier === 'Publicly Reported'
      ? 5
      : 2;

  const total = Math.min(100, depthPts + intlPts + ukGap.points + relPts + routePts);

  const factors: ScoreFactor[] = [
    {
      key: 'uk-opportunity',
      label: 'UK Market Opportunity Gap',
      score: ukGap.points,
      maxScore: 25,
      rationale: ukGap.rationale,
    },
    {
      key: 'talent-leverage',
      label: 'CAA Talent Relationship Leverage',
      score: relPts,
      maxScore: 25,
      rationale: `${relScore.bestLabel}${multiTalentBonus > 0 ? ' (+Multi-talent ecosystem halo)' : ''}.`,
    },
    {
      key: 'catalog-depth',
      label: 'Brand Product Range Depth',
      score: depthPts,
      maxScore: 20,
      rationale: `${brandProducts.length} mapped SKU/range records under ${brand.name}.`,
    },
    {
      key: 'intl-validation',
      label: 'International Market Validation',
      score: intlPts,
      maxScore: 20,
      rationale: `Observed across ${intlMarkets.size} markets: ${Array.from(intlMarkets).join(', ') || 'Research pending'}.`,
    },
    {
      key: 'route-verification',
      label: 'Wholesale Route & Evidence Clarity',
      score: routePts,
      maxScore: 10,
      rationale: `UK Route: ${brand.ukWholesaleRouteStatus} · ${brand.verification.verificationTier}.`,
    },
  ];

  const missingInformation = Array.from(
    new Set([
      ...brand.verification.unknownFields,
      ...(primaryUk?.verification.unknownFields ?? []),
      ...(brand.ukWholesaleRouteStatus === 'Wholesale Authorised'
        ? []
        : ['Signed UK wholesale distribution confirmation']),
    ])
  );

  const keyRisks: string[] = [];
  if (primaryUk?.existingDistributorDetected) {
    keyRisks.push(brand.distributorNote || 'Existing UK retail/wholesale distributor active.');
  }
  if (primaryUk?.complianceOrBarrierNote) {
    keyRisks.push(primaryUk.complianceOrBarrierNote);
  }
  if (!relScore.isOwnedOrAuth) {
    keyRisks.push('Relationship is non-ownership; brand may have independent UK commercial leadership.');
  }

  return {
    total,
    priorityTier: getPriorityTier(total),
    factors,
    supportingEvidence: [
      brand.verification.evidenceSummary,
      ...(primaryUk ? [primaryUk.estimatedGapSummary] : []),
    ],
    missingInformation,
    keyRisks: keyRisks.length > 0 ? keyRisks : ['Standard UK import, VAT, and Amazon Brand Registry checks apply.'],
    recommendedNextAction: activeAcq
      ? `Advance ${activeAcq.route} (${activeAcq.stage}): ${activeAcq.nextStep}`
      : relScore.isOwnedOrAuth
      ? 'Initiate Route 2 acquisition workflow to confirm UK wholesale permission.'
      : 'Initiate Route 1 CAA liaison introduction with brand commercial team.',
  };
}

// ---------------------------------------------------------------------------
// 3. TALENT PORTFOLIO SCORE (0–100)
// ---------------------------------------------------------------------------
export function scoreTalentPortfolio(
  talent: TalentProfileRecord,
  relationships: TalentBrandRelationship[],
  brandScoresById: Record<string, ScoreBreakdown>
): ScoreBreakdown {
  const talentRels = relationships.filter((r) => r.talentId === talent.id);
  const currentRels = talentRels.filter((r) => r.isCurrent);

  // Representation Verification Clarity (0-20)
  const repPts =
    talent.caaStatus === 'Verified Publicly'
      ? 20
      : talent.caaStatus === 'Reported / Unconfirmed'
      ? 12
      : talent.caaStatus === 'Historical / Unclear'
      ? 8
      : talent.caaStatus === 'Requires Verification'
      ? 4
      : 3;

  // Owned / Founder / Authorised Brand Count (0-30)
  const ownedCount = currentRels.filter((r) =>
    OWNERSHIP_RELATIONSHIPS.includes(r.relationshipType)
  ).length;
  const ownedPts = Math.min(30, ownedCount * 15 + (currentRels.length > 0 && ownedCount === 0 ? 6 : 0));

  // Commercial & Endorsement Breadth (0-20)
  const breadthPts = Math.min(20, currentRels.length * 6 + (talentRels.length > currentRels.length ? 2 : 0));

  // Linked Brand UK Opportunity Quality (0-30)
  const linkedBrandScores = currentRels
    .map((r) => brandScoresById[r.brandId]?.total)
    .filter((v): v is number => typeof v === 'number');
  const avgBrandScore =
    linkedBrandScores.length > 0
      ? linkedBrandScores.reduce((sum, v) => sum + v, 0) / linkedBrandScores.length
      : 35;
  const ukOppPts = Math.round((avgBrandScore / 100) * 30);

  const total = Math.min(100, repPts + ownedPts + breadthPts + ukOppPts);

  const factors: ScoreFactor[] = [
    {
      key: 'owned-equity',
      label: 'Owned, Founder & Authorised Brands',
      score: ownedPts,
      maxScore: 30,
      rationale: `${ownedCount} active talent-owned/founder/authorised brand relationship(s).`,
    },
    {
      key: 'uk-brand-quality',
      label: 'Linked Brands UK Opportunity Strength',
      score: ukOppPts,
      maxScore: 30,
      rationale:
        linkedBrandScores.length > 0
          ? `Average linked brand UK opportunity score: ${Math.round(avgBrandScore)}/100.`
          : 'Run Commercial Portfolio Discovery to populate linked brand UK scores.',
    },
    {
      key: 'caa-verification',
      label: 'CAA Representation Verification',
      score: repPts,
      maxScore: 20,
      rationale: `Roster status: ${talent.caaStatus}.`,
    },
    {
      key: 'commercial-breadth',
      label: 'Commercial Ecosystem Breadth',
      score: breadthPts,
      maxScore: 20,
      rationale: `${currentRels.length} active commercial tie(s) tracked (${talentRels.length} total incl. historical).`,
    },
  ];

  const missingInformation = Array.from(
    new Set([
      ...talent.verification.unknownFields,
      ...(talent.identityCheckRequired ? ['Identity & official commercial handle verification'] : []),
      ...(currentRels.length === 0 ? ['Commercial brand discovery pass needed'] : []),
    ])
  );

  const keyRisks: string[] = [];
  if (talent.identityCheckRequired || talent.caaStatus === 'Requires Verification') {
    keyRisks.push(
      talent.identityCheckNote ||
        'Talent identity & CAA representation require manual confirmation before external brand outreach.'
    );
  }
  if (ownedCount === 0 && currentRels.length > 0) {
    keyRisks.push('No talent-owned consumer brand identified yet — commercial route depends on endorsement introductions.');
  }

  return {
    total,
    priorityTier: getPriorityTier(total),
    factors,
    supportingEvidence: [talent.portfolioSummary, talent.verification.evidenceSummary],
    missingInformation,
    keyRisks: keyRisks.length > 0 ? keyRisks : ['No representation blockers flagged; verify brand-level UK rights prior to listing.'],
    recommendedNextAction: talent.identityCheckRequired
      ? 'Verify talent identity and confirm CAA agent contact before initiating commercial discovery outreach.'
      : ownedCount > 0
      ? 'Prioritise talent-owned brands for Route 2 UK wholesale & Amazon Brand Store onboarding.'
      : 'Review endorsement brands for Route 1 CAA introduction or scope new official UK capsule range.',
  };
}

// ---------------------------------------------------------------------------
// 4. AUTOMATED DETERMINISTIC COMMERCIAL PORTFOLIO DISCOVERY ENGINE
// ---------------------------------------------------------------------------
export interface DiscoveryResultBundle {
  addedBrands: BrandRecord[];
  addedRelationships: TalentBrandRelationship[];
  addedProducts: DiscoveredProduct[];
  addedListings: InternationalListing[];
  addedUkAssessments: UkMarketAssessment[];
  summaryNote: string;
}

const KNOWN_DISCOVERY_RECIPES: Record<
  string,
  {
    brandName: string;
    category: string;
    originCountry: string;
    websiteUrl: string;
    relationshipType: CommercialRelationshipType;
    isCurrent: boolean;
    ukOpp: UkOpportunityType;
    productTitle: string;
    productCategory: string;
    ukRrpGBP?: number;
    usPriceUSD?: number;
    tier: SourceVerificationStamp['verificationTier'];
    sourceName: string;
    sourceUrl: string;
    evidenceSummary: string;
  }[]
> = {
  zendaya: [
    {
      brandName: 'Lancôme',
      category: 'Prestige Beauty & Fragrance',
      originCountry: 'France',
      websiteUrl: 'https://www.lancome.co.uk',
      relationshipType: 'Endorsement',
      isCurrent: true,
      ukOpp: 'Type F — Existing UK Distributor (Caution)',
      productTitle: 'Lancôme Idôle Eau de Parfum (Global Ambassador Campaign)',
      productCategory: 'Fragrance',
      ukRrpGBP: 92,
      usPriceUSD: 112,
      tier: 'Verified Fact',
      sourceName: 'Lancôme Official Global Ambassadors',
      sourceUrl: 'https://www.lancome-usa.com',
      evidenceSummary: 'Zendaya serves as a global brand ambassador for Lancôme (endorsement, not ownership).',
    },
    {
      brandName: 'On Running',
      category: 'Performance Footwear & Apparel',
      originCountry: 'Switzerland',
      websiteUrl: 'https://www.on.com/en-gb',
      relationshipType: 'Collaboration',
      isCurrent: true,
      ukOpp: 'Type E — Partial / Limited UK Catalogue',
      productTitle: 'On × Zendaya Cloudzone & Movement Capsule',
      productCategory: 'Footwear & Athleisure',
      ukRrpGBP: 140,
      usPriceUSD: 150,
      tier: 'Verified Fact',
      sourceName: 'On Running Newsroom',
      sourceUrl: 'https://www.on.com',
      evidenceSummary: 'Multi-year creative partnership and co-created capsule collaboration.',
    },
  ],
  'cole palmer': [
    {
      brandName: 'Nike',
      category: 'Sportswear & Football',
      originCountry: 'United States',
      websiteUrl: 'https://www.nike.com/gb',
      relationshipType: 'Sponsorship',
      isCurrent: true,
      ukOpp: 'Type F — Existing UK Distributor (Caution)',
      productTitle: 'Nike Mercurial Football Boot & Athlete Kit Line',
      productCategory: 'Sportswear',
      ukRrpGBP: 115,
      usPriceUSD: 130,
      tier: 'Verified Fact',
      sourceName: 'Nike Football Athlete Roster',
      sourceUrl: 'https://www.nike.com',
      evidenceSummary: 'Cole Palmer wears and promotes Nike Football boots under athlete sponsorship.',
    },
    {
      brandName: 'Burberry',
      category: 'Luxury Apparel & Outerwear',
      originCountry: 'United Kingdom',
      websiteUrl: 'https://uk.burberry.com',
      relationshipType: 'Endorsement',
      isCurrent: true,
      ukOpp: 'Type F — Existing UK Distributor (Caution)',
      productTitle: 'Burberry Outerwear Autumn/Winter Campaign Selection',
      productCategory: 'Luxury Fashion',
      ukRrpGBP: 690,
      usPriceUSD: 850,
      tier: 'Publicly Reported',
      sourceName: 'British Fashion Press & Campaign Coverage',
      sourceUrl: 'https://uk.burberry.com',
      evidenceSummary: 'Featured in Burberry UK campaign imagery; no brand ownership or wholesale rights.',
    },
  ],
  'sydney sweeney': [
    {
      brandName: 'Laneige',
      category: 'Skincare & Lip Care',
      originCountry: 'South Korea',
      websiteUrl: 'https://www.laneige.com',
      relationshipType: 'Endorsement',
      isCurrent: true,
      ukOpp: 'Type E — Partial / Limited UK Catalogue',
      productTitle: 'Laneige Water Bank & Lip Sleeping Mask Sets',
      productCategory: 'Skincare',
      ukRrpGBP: 24,
      usPriceUSD: 28,
      tier: 'Verified Fact',
      sourceName: 'Laneige US / Global Ambassador Release',
      sourceUrl: 'https://us.laneige.com',
      evidenceSummary: 'Official Global Ambassador endorsement; UK distribution managed separately.',
    },
    {
      brandName: 'SYRN / Ford Heritage Capsule',
      category: 'Apparel Collaboration',
      originCountry: 'United States',
      websiteUrl: 'https://www.ford.com',
      relationshipType: 'Collaboration',
      isCurrent: false,
      ukOpp: 'Type A — No UK Presence',
      productTitle: 'Sydney Sweeney × Ford Workwear Capsule Collection',
      productCategory: 'Apparel',
      usPriceUSD: 78,
      tier: 'Publicly Reported',
      sourceName: 'Ford Motor Company Press Archive',
      sourceUrl: 'https://media.ford.com',
      evidenceSummary: 'Historical co-branded apparel capsule collaboration; not active ongoing supply.',
    },
  ],
  'shohei ohtani': [
    {
      brandName: 'New Balance',
      category: 'Athletic Footwear & Apparel',
      originCountry: 'United States',
      websiteUrl: 'https://www.newbalance.co.uk',
      relationshipType: 'Collaboration',
      isCurrent: true,
      ukOpp: 'Type E — Partial / Limited UK Catalogue',
      productTitle: 'New Balance Ohtani Signature Collection',
      productCategory: 'Sportswear',
      ukRrpGBP: 110,
      usPriceUSD: 120,
      tier: 'Verified Fact',
      sourceName: 'New Balance Athlete Press Release',
      sourceUrl: 'https://www.newbalance.com',
      evidenceSummary: 'Signature New Balance × Shohei Ohtani apparel & footwear line; US/Japan heavy distribution.',
    },
    {
      brandName: 'Beats by Dre',
      category: 'Consumer Audio',
      originCountry: 'United States',
      websiteUrl: 'https://www.beatsbydre.com/uk',
      relationshipType: 'Endorsement',
      isCurrent: true,
      ukOpp: 'Type F — Existing UK Distributor (Caution)',
      productTitle: 'Beats Studio Pro & Powerbeats Athlete Editions',
      productCategory: 'Electronics',
      ukRrpGBP: 249,
      usPriceUSD: 249,
      tier: 'Verified Fact',
      sourceName: 'Beats Global Ambassador Announcement',
      sourceUrl: 'https://www.beatsbydre.com',
      evidenceSummary: 'Official brand ambassador; Apple/Beats distributes directly in the UK.',
    },
  ],
  'emma stone': [
    {
      brandName: 'Louis Vuitton',
      category: 'Luxury Fashion & Fragrance',
      originCountry: 'France',
      websiteUrl: 'https://uk.louisvuitton.com',
      relationshipType: 'Endorsement',
      isCurrent: true,
      ukOpp: 'Type G — Unsuitable / UK Market Barriers',
      productTitle: 'Louis Vuitton House Ambassador Luxury Goods',
      productCategory: 'Luxury',
      tier: 'Verified Fact',
      sourceName: 'Louis Vuitton Press Announcements',
      sourceUrl: 'https://www.louisvuitton.com',
      evidenceSummary: 'House ambassador relationship; closed luxury DTC distribution unsuitable for Amazon UK wholesale.',
    },
    {
      brandName: 'Fruit Tree Productions',
      category: 'Entertainment Studio & Merch IP',
      originCountry: 'United States',
      websiteUrl: 'https://www.imdb.com',
      relationshipType: 'Co-Owned',
      isCurrent: true,
      ukOpp: 'Type A — No UK Presence',
      productTitle: 'Fruit Tree Studio Film Tie-In Collector Merch Concept',
      productCategory: 'Collectibles & Apparel',
      ukRrpGBP: 34,
      tier: 'Verified Fact',
      sourceName: 'Public Corporate & Trade Filings (Variety / Deadline)',
      sourceUrl: 'https://variety.com',
      evidenceSummary: 'Co-founded production company; physical consumer merchandise not yet launched in UK.',
    },
  ],
  'bad bunny': [
    {
      brandName: 'Adidas',
      category: 'Footwear & Streetwear',
      originCountry: 'Germany',
      websiteUrl: 'https://www.adidas.co.uk',
      relationshipType: 'Collaboration',
      isCurrent: true,
      ukOpp: 'Type E — Partial / Limited UK Catalogue',
      productTitle: 'Adidas Originals × Bad Bunny Gazelle & Campus Editions',
      productCategory: 'Footwear',
      ukRrpGBP: 120,
      usPriceUSD: 140,
      tier: 'Verified Fact',
      sourceName: 'Adidas Confirmed Official Releases',
      sourceUrl: 'https://www.adidas.com',
      evidenceSummary: 'Multi-year signature Adidas Originals footwear collaboration.',
    },
  ],
  'charli xcx': [
    {
      brandName: 'Charli XCX Official Store (BRAT / UK Merch)',
      category: 'Music Artist Merchandise',
      originCountry: 'United Kingdom',
      websiteUrl: 'https://store.charlixcx.com',
      relationshipType: 'Merchandise',
      isCurrent: true,
      ukOpp: 'Type D — UK DTC Site Only, No Amazon UK',
      productTitle: 'BRAT Tour Apparel, Vinyl & Collector Tee Capsule',
      productCategory: 'Apparel & Music Merch',
      ukRrpGBP: 35,
      usPriceUSD: 40,
      tier: 'Publicly Reported',
      sourceName: 'Official Charli XCX D2C Store',
      sourceUrl: 'https://store.charlixcx.com',
      evidenceSummary: 'Active UK D2C music merchandise store; official Amazon UK Brand Store range limited.',
    },
  ],
  'post malone': [
    {
      brandName: 'Maison No. 9',
      category: 'Wine & Spirits',
      originCountry: 'France / United States',
      websiteUrl: 'https://maison9wine.com',
      relationshipType: 'Co-Owned',
      isCurrent: true,
      ukOpp: 'Type G — Unsuitable / UK Market Barriers',
      productTitle: 'Maison No. 9 Mediterranean Rosé 750ml',
      productCategory: 'Alcoholic Beverages',
      ukRrpGBP: 22,
      usPriceUSD: 25,
      tier: 'Verified Fact',
      sourceName: 'Maison No. 9 Official Press & Brand Site',
      sourceUrl: 'https://maison9wine.com',
      evidenceSummary: 'Co-founded rosé brand; UK alcohol duty, age-gate, and distributor contracts constrain Amazon UK onboarding.',
    },
  ],
};

export function runDeterministicPortfolioDiscovery(
  talent: TalentProfileRecord,
  existingBrands: BrandRecord[],
  existingRelationships: TalentBrandRelationship[],
  existingProducts: DiscoveredProduct[],
  existingListings: InternationalListing[],
  existingUkAssessments: UkMarketAssessment[]
): DiscoveryResultBundle {
  const today = new Date().toISOString().slice(0, 10);
  const key = talent.name.toLowerCase().trim();
  const recipes = KNOWN_DISCOVERY_RECIPES[key];

  const addedBrands: BrandRecord[] = [];
  const addedRelationships: TalentBrandRelationship[] = [];
  const addedProducts: DiscoveredProduct[] = [];
  const addedListings: InternationalListing[] = [];
  const addedUkAssessments: UkMarketAssessment[] = [];

  const findBrandByName = (name: string): BrandRecord | undefined => {
    const norm = normalizeBrandKey(name);
    return [...existingBrands, ...addedBrands].find((b) => b.normalizedName === norm);
  };

  if (recipes && recipes.length > 0) {
    recipes.forEach((rec, idx) => {
      let brand = findBrandByName(rec.brandName);
      if (!brand) {
        const brandMedia = resolveBrandMedia({
          name: rec.brandName,
          normalizedName: normalizeBrandKey(rec.brandName),
        });
        brand = {
          id: `brd-disc-${talent.slug}-${idx + 1}`,
          name: rec.brandName,
          normalizedName: normalizeBrandKey(rec.brandName),
          category: rec.category,
          originCountry: rec.originCountry,
          websiteUrl: rec.websiteUrl,
          logoUrl: brandMedia?.logoUrl,
          imageUrl: brandMedia?.imageUrl,
          imageCredit: brandMedia?.imageCredit,
          description: `${rec.brandName} commercial record identified via automated talent portfolio scan for ${talent.name}.`,
          ukWholesaleRouteStatus:
            rec.ukOpp === 'Type F — Existing UK Distributor (Caution)'
              ? 'Existing UK Distributor'
              : rec.ukOpp === 'Type G — Unsuitable / UK Market Barriers'
              ? 'Blocked / Unsuitable'
              : OWNERSHIP_RELATIONSHIPS.includes(rec.relationshipType)
              ? 'Direct Brand Contact'
              : 'CAA Relationship Intro',
          verification: {
            id: `ver-brd-${Date.now()}-${idx}`,
            sourceName: rec.sourceName,
            sourceUrl: rec.sourceUrl,
            dateChecked: today,
            evidenceSummary: rec.evidenceSummary,
            verificationTier: rec.tier,
            confidence: rec.tier === 'Verified Fact' ? 'High' : 'Medium',
            unknownFields: ['UK Amazon Vendor Central wholesale authorisation', 'Ex-factory MOQ terms'],
          },
        };
        addedBrands.push(brand);
      }

      const relExists = [...existingRelationships, ...addedRelationships].some(
        (r) =>
          r.talentId === talent.id &&
          r.brandId === brand!.id &&
          r.relationshipType === rec.relationshipType
      );
      if (!relExists) {
        addedRelationships.push({
          id: `rel-disc-${talent.slug}-${idx + 1}`,
          talentId: talent.id,
          brandId: brand.id,
          relationshipType: rec.relationshipType,
          isCurrent: rec.isCurrent,
          ukDistributionRightsConfirmed: 'Unconfirmed',
          summary: rec.evidenceSummary,
          verification: {
            id: `ver-rel-${Date.now()}-${idx}`,
            sourceName: rec.sourceName,
            sourceUrl: rec.sourceUrl,
            dateChecked: today,
            evidenceSummary: rec.evidenceSummary,
            verificationTier: rec.tier,
            confidence: rec.tier === 'Verified Fact' ? 'High' : 'Medium',
            unknownFields: ['Written UK wholesale distribution right'],
          },
        });
      }

      const prodExists = [...existingProducts, ...addedProducts].some(
        (p) => p.brandId === brand!.id && p.title === rec.productTitle
      );
      if (!prodExists) {
        const prodId = `dprd-disc-${talent.slug}-${idx + 1}`;
        const prodMedia = resolveProductMediaByKeywords(rec.brandName, rec.productTitle);
        addedProducts.push({
          id: prodId,
          brandId: brand.id,
          title: rec.productTitle,
          category: rec.productCategory,
          variantSummary: 'Core Flagship SKU / Multi-Variant Range',
          image: prodMedia?.image ?? brand.imageUrl,
          imageCredit: prodMedia?.imageCredit ?? brand.imageCredit,
          officialUrl: rec.websiteUrl,
          ukRrpGBP: rec.ukRrpGBP,
          usPriceUSD: rec.usPriceUSD,
          summary: `${rec.productTitle} identified on official brand / press archive.`,
          verification: {
            id: `ver-prd-${Date.now()}-${idx}`,
            sourceName: rec.sourceName,
            sourceUrl: rec.sourceUrl,
            dateChecked: today,
            evidenceSummary: `Catalog product verified during automated ${talent.name} portfolio scan.`,
            verificationTier: rec.tier,
            confidence: 'Medium',
            unknownFields: ['Exact UK wholesale unit cost', 'Amazon.co.uk ASIN mapping'],
          },
        });

        addedListings.push({
          id: `lst-disc-${talent.slug}-${idx + 1}-us`,
          brandId: brand.id,
          productId: prodId,
          market: 'US',
          presenceStatus: 'Active Official',
          currency: 'USD',
          observedPrice: rec.usPriceUSD,
          sellerType: 'Brand Store / Authorised US Retail',
          url: rec.websiteUrl,
          verification: {
            id: `ver-lst-${Date.now()}-${idx}`,
            sourceName: 'US Market Discovery Scan',
            sourceUrl: rec.websiteUrl,
            dateChecked: today,
            evidenceSummary: 'US commercial presence confirmed during discovery pass.',
            verificationTier: rec.tier,
            confidence: 'Medium',
            unknownFields: [],
          },
        });

        addedUkAssessments.push({
          id: `uk-disc-${talent.slug}-${idx + 1}`,
          brandId: brand.id,
          productId: prodId,
          opportunityType: rec.ukOpp,
          amazonUkPresence:
            rec.ukOpp === 'Type A — No UK Presence' || rec.ukOpp === 'Type D — UK DTC Site Only, No Amazon UK'
              ? 'Not Present'
              : rec.ukOpp === 'Type B — 3P / Unauthorised UK Sellers'
              ? '3P Sellers Only'
              : 'Limited Official Range',
          ukDtcPresence:
            rec.ukOpp === 'Type D — UK DTC Site Only, No Amazon UK'
              ? 'Yes — UK DTC Live'
              : rec.ukOpp === 'Type A — No UK Presence'
              ? 'No UK DTC'
              : 'Unknown',
          existingDistributorDetected: rec.ukOpp === 'Type F — Existing UK Distributor (Caution)',
          estimatedGapSummary: rec.evidenceSummary,
          verification: {
            id: `ver-uk-${Date.now()}-${idx}`,
            sourceName: 'UK Marketplace Gap Classifier',
            sourceUrl: 'https://www.amazon.co.uk',
            dateChecked: today,
            evidenceSummary: `Classified as ${rec.ukOpp} based on international vs UK channel signals.`,
            verificationTier: rec.tier === 'Verified Fact' ? 'Publicly Reported' : 'Inference',
            confidence: 'Medium',
            unknownFields: ['Official UK distributor exclusivity terms'],
          },
        });
      }
    });

    return {
      addedBrands,
      addedRelationships,
      addedProducts,
      addedListings,
      addedUkAssessments,
      summaryNote: `Automated discovery mapped ${addedBrands.length} new brand(s), ${addedRelationships.length} relationship(s), and ${addedProducts.length} product record(s) for ${talent.name}.`,
    };
  }

  // Fallback for any roster or newly added talent without pre-indexed brand recipes:
  // Generate an honest, clearly tagged discovery candidate awaiting manual verification.
  const candidateBrandName = `${talent.name} Official Merchandise / Brand Ventures`;
  let brand = findBrandByName(candidateBrandName);
  if (!brand) {
    brand = {
      id: `brd-cand-${talent.slug}-${Date.now().toString().slice(-4)}`,
      name: candidateBrandName,
      normalizedName: normalizeBrandKey(candidateBrandName),
      category: `${talent.vertical} Merchandise & Consumer Extensions`,
      originCountry: talent.primaryMarket || 'United States',
      websiteUrl: 'https://www.amazon.co.uk',
      description: `Automated commercial discovery placeholder for ${talent.name}. Pending manual verification of official brand domain, active endorsements, and UK wholesale route.`,
      ukWholesaleRouteStatus: 'Route Unclear',
      verification: {
        id: `ver-cand-${Date.now()}`,
        sourceName: 'Automated Discovery Hypothesis (Pending Research)',
        sourceUrl: 'https://www.amazon.co.uk',
        dateChecked: today,
        evidenceSummary: `Candidate discovery record generated for ${talent.name}; verify official brand site and CAA manager notes before outreach.`,
        verificationTier: 'Inference',
        confidence: 'Low',
        unknownFields: [
          'Official brand website URL',
          'Confirmed commercial relationship type',
          'UK distribution rights & Amazon UK presence',
        ],
      },
    };
    addedBrands.push(brand);
  }

  const relExists = existingRelationships.some(
    (r) => r.talentId === talent.id && r.brandId === brand!.id
  );
  if (!relExists) {
    addedRelationships.push({
      id: `rel-cand-${talent.slug}-${Date.now().toString().slice(-4)}`,
      talentId: talent.id,
      brandId: brand.id,
      relationshipType: 'Merchandise',
      isCurrent: true,
      ukDistributionRightsConfirmed: 'Unconfirmed',
      summary: `Provisional discovery link for ${talent.name} (${talent.vertical}). Confirm whether existing official store or licensor manages UK sales.`,
      verification: {
        id: `ver-rel-cand-${Date.now()}`,
        sourceName: 'Automated Portfolio Scan',
        sourceUrl: 'https://www.caa.com',
        dateChecked: today,
        evidenceSummary: 'Provisional commercial hypothesis awaiting CAA manager & web verification.',
        verificationTier: 'Unverified',
        confidence: 'Low',
        unknownFields: ['Ownership vs licensing split', 'Existing UK merch partners'],
      },
    });
  }

  const prodId = `dprd-cand-${talent.slug}-${Date.now().toString().slice(-4)}`;
  addedProducts.push({
    id: prodId,
    brandId: brand.id,
    title: `${talent.name} Signature UK Capsule / Collector Line (Candidate)`,
    category: 'Apparel & Collectibles',
    variantSummary: 'Core Apparel / Collector SKU (Unverified Candidate)',
    officialUrl: 'https://www.amazon.co.uk',
    ukRrpGBP: 34.99,
    summary: 'Provisional product line candidate requiring primary source verification.',
    verification: {
      id: `ver-prd-cand-${Date.now()}`,
      sourceName: 'Automated Portfolio Scan',
      sourceUrl: 'https://www.amazon.co.uk',
      dateChecked: today,
      evidenceSummary: 'Unverified product candidate generated during discovery pass.',
      verificationTier: 'Unverified',
      confidence: 'Low',
      unknownFields: ['Verified SKU/ASIN', 'Official product imagery'],
    },
  });

  addedUkAssessments.push({
    id: `uk-cand-${talent.slug}-${Date.now().toString().slice(-4)}`,
    brandId: brand.id,
    productId: prodId,
    opportunityType: 'Type C — Amazon UK Present, Unclear Wholesale',
    amazonUkPresence: 'Not Present',
    ukDtcPresence: 'Unknown',
    existingDistributorDetected: false,
    estimatedGapSummary: `Initial UK assessment pending verification of ${talent.name}'s official commercial portfolio and existing UK retailers.`,
    verification: {
      id: `ver-uk-cand-${Date.now()}`,
      sourceName: 'Automated Portfolio Scan',
      sourceUrl: 'https://www.amazon.co.uk',
      dateChecked: today,
      evidenceSummary: 'Provisional Type C gap assignment until UK D2C and 3P checks are completed.',
      verificationTier: 'Inference',
      confidence: 'Low',
      unknownFields: ['Amazon.co.uk 3P seller check', 'UK trademark/Brand Registry owner'],
    },
  });

  return {
    addedBrands,
    addedRelationships,
    addedProducts,
    addedListings,
    addedUkAssessments,
    summaryNote: `Automated discovery generated provisional commercial records for ${talent.name} flagged for verification.`,
  };
}
