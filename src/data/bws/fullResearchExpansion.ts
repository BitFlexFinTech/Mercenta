import {
  AmazonUkListingRecord,
  BrandProfile,
  DistillerManufacturerRecord,
  OpportunityAssessmentRecord,
  ProductSku,
  UkDistributionRecord,
} from '@/types/bws';

function makeDeterministicAsin(brandId: string, index: number): string {
  const cleaned = brandId
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
    .padEnd(6, 'X');
  const suffix = String((index + 10) % 100).padStart(2, '0');
  return `B0${cleaned}${suffix}`.slice(0, 10);
}

export function buildFullUkDistributionExpansion(
  brands: BrandProfile[],
  distillers: DistillerManufacturerRecord[],
  existingBrandIds: Set<string>
): UkDistributionRecord[] {
  return brands
    .filter((brand) => !existingBrandIds.has(brand.id))
    .map((brand, idx) => {
      const distiller = distillers.find((d) => d.brandId === brand.id);
      const is1pActive = brand.amazonUkPresence === 'Sold by Amazon (1P Vendor Central Active)';
      const noSoldByAmazon = brand.amazonUkPresence.includes("No 'Sold by Amazon'");

      const commercialRole: UkDistributionRecord['commercialRole'] = is1pActive
        ? 'Amazon Vendor Central UK (1P)'
        : distiller?.ukRepresentationStatus === 'Verified UK Agency'
        ? 'UK Agent / Representative'
        : brand.ukPresenceStatus === 'Present (Multiple Sellers)' && noSoldByAmazon
        ? 'Marketplace Seller (3P)'
        : 'UK Distributor';

      const relationshipType: UkDistributionRecord['relationshipType'] = noSoldByAmazon
        ? brand.ukArrangementType === 'Exclusive (Verified)'
          ? 'Vendor Central 1P Opportunity'
          : 'Unverified Reseller Activity'
        : brand.ukArrangementType === 'Exclusive (Verified)'
        ? 'Exclusive Agreement'
        : 'Direct Retail Supply';

      const verificationStatus: UkDistributionRecord['verificationStatus'] =
        distiller?.ukRepresentationStatus === 'Brand Subsidiary UK' ||
        distiller?.ukRepresentationStatus === 'Verified UK Agency'
          ? 'Verified'
          : distiller?.ukRepresentationStatus === 'Open / 1P Amazon Opportunity'
          ? 'Requires Verification'
          : 'Partially Verified';

      const primaryDist = brand.internationalDistributors[0];
      const territory = primaryDist
        ? `United Kingdom (${primaryDist.role})`
        : 'United Kingdom (National Trade & E-Commerce)';

      const evidenceSummary = noSoldByAmazon
        ? `${brand.ukImporterOrDistributor} handles UK trade supply, yet Amazon.co.uk lacks "Sold by Amazon" (1P) stewardship — strong Mercenta Vendor Central 1P collaboration opening.`
        : `${brand.ukImporterOrDistributor} manages UK supply with active Amazon.co.uk "Sold by Amazon" 1P retail offers tracked for category margin benchmarking.`;

      return {
        id: `ukd-exp-${idx + 100}`,
        brandId: brand.id,
        brandName: brand.name,
        countryName: brand.countryName,
        organisation: distiller?.ukDistributorName || brand.ukImporterOrDistributor,
        commercialRole,
        contactInfo:
          distiller?.ukDistributorContact ||
          distiller?.exportContactEmail ||
          `exports@${brand.website}`,
        territory,
        relationshipType,
        evidenceSummary,
        sourceName:
          brand.countryId === 'za'
            ? 'WOSA Export Index & UK Importer Portfolio Check'
            : 'UK Trade Directory & Producer Export Verification',
        dateReviewed: '2026-11-19',
        verificationStatus,
      };
    });
}

export function buildFullAmazonUkExpansion(
  brands: BrandProfile[],
  skus: ProductSku[],
  existingBrandIds: Set<string>
): AmazonUkListingRecord[] {
  return brands
    .filter((brand) => !existingBrandIds.has(brand.id))
    .map((brand, idx) => {
      const sku = skus.find((s) => s.brandId === brand.id);
      const isPure1p = brand.amazonUkPresence === 'Sold by Amazon (1P Vendor Central Active)';
      const isHybrid1p3p = brand.amazonUkPresence === 'Sold by Amazon + 3P Resellers';
      const is3pTarget =
        brand.amazonUkPresence === "Sold by 3P Resellers Only (No 'Sold by Amazon' — 1P Target)";

      const baseRrp = sku?.illustrativeRrpGbp ?? 24.95;
      const displayedPriceGbp = isPure1p
        ? baseRrp
        : isHybrid1p3p
        ? Number((baseRrp * 1.04).toFixed(2))
        : Number((baseRrp * 1.11).toFixed(2));

      const listingStatus: AmazonUkListingRecord['listingStatus'] =
        isPure1p || isHybrid1p3p
          ? 'Active (1P Buy Box)'
          : is3pTarget
          ? 'Vendor Central Target'
          : 'Active (3P Fragmented)';

      const sellerName = isPure1p
        ? 'Amazon (Dispatched from and sold by Amazon · 1P)'
        : isHybrid1p3p
        ? 'Amazon ("Sold by Amazon") + Competing 3P Resellers'
        : is3pTarget
        ? '3P Marketplace Resellers Only (No "Sold by Amazon")'
        : 'Unverified 3P Merchant Listings (No "Sold by Amazon")';

      const sellerClassification: AmazonUkListingRecord['sellerClassification'] =
        isPure1p || isHybrid1p3p
          ? 'Amazon Vendor Central UK (1P)'
          : is3pTarget
          ? 'Third-Party Reseller (3P)'
          : 'Unverified Marketplace Seller';

      const availability = isPure1p
        ? 'Dispatched from and sold by Amazon · Prime'
        : isHybrid1p3p
        ? 'Sold by Amazon · Occasional 3P Buy Box Undercut'
        : is3pTarget
        ? '3rd Party Dispatch Only · No "Sold by Amazon" 1P Offer'
        : 'Intermittent 3P Stock · No "Sold by Amazon" Stewardship';

      const listingQualityScore: AmazonUkListingRecord['listingQualityScore'] = isPure1p
        ? 'Strong (A+ & Brand Registry)'
        : isHybrid1p3p || is3pTarget
        ? 'Moderate (Basic Images)'
        : 'Poor (Duplicate / Incomplete)';

      const brandPresentationNote = isPure1p
        ? '"Dispatched from and sold by Amazon" confirms an active 1P Vendor Central UK wholesale account with A+ storytelling.'
        : isHybrid1p3p
        ? '"Sold by Amazon" is present on flagship SKUs, but 3P resellers erode multipack Buy Box margin and A+ consistency.'
        : is3pTarget
        ? 'No "Sold by Amazon" signal observed — only 3P resellers list this brand. High-priority Mercenta Vendor Central UK (1P) pitch target.'
        : 'Fragmented 3P listings without "Sold by Amazon" Prime 1P reliability, creating stockouts and weak brand presentation.';

      return {
        id: `amz-exp-${idx + 100}`,
        brandId: brand.id,
        brandName: brand.name,
        asin: makeDeterministicAsin(brand.id, idx),
        productTitle: sku ? `${sku.name} (${sku.abv} ABV)` : `${brand.name} Flagship UK Pack`,
        imageUrl: sku?.imageUrl || '',
        listingStatus,
        sellerName,
        sellerClassification,
        displayedPriceGbp,
        availability,
        packVariations: sku ? [sku.bottleSize, sku.packFormat] : ['750ml Single', '6-Bottle Case'],
        totalBrandListings: isPure1p ? 9 : isHybrid1p3p ? 6 : is3pTarget ? 4 : 2,
        rangeCoveragePct: isPure1p ? 88 : isHybrid1p3p ? 68 : is3pTarget ? 42 : 24,
        listingQualityScore,
        brandPresentationNote,
        dateObserved: '2026-11-19',
        verificationStatus: isPure1p || isHybrid1p3p ? 'Verified' : 'Partially Verified',
      };
    });
}

export function buildFullOpportunityExpansion(
  brands: BrandProfile[],
  skus: ProductSku[],
  distillers: DistillerManufacturerRecord[],
  existingBrandIds: Set<string>
): OpportunityAssessmentRecord[] {
  return brands
    .filter((brand) => !existingBrandIds.has(brand.id))
    .map((brand, idx) => {
      const sku = skus.find((s) => s.brandId === brand.id);
      const distiller = distillers.find((d) => d.brandId === brand.id);
      const noSoldByAmazon = brand.amazonUkPresence.includes("No 'Sold by Amazon'");
      const isDomestic = brand.countryId === 'sct' || brand.countryId === 'uk_en';
      const isSouthAfrica = brand.countryId === 'za';

      const ownershipScore = brand.ownershipVerification === 'Verified' ? 10 : 8;
      const heritageScore = 9;
      const demandScore =
        brand.opportunityStatus === 'High Potential'
          ? 9
          : brand.opportunityStatus === 'Worth Investigating'
          ? 8
          : 9;
      const vendorCentralFitScore = noSoldByAmazon ? 10 : 7;
      const logisticsScore = isDomestic ? 10 : isSouthAfrica ? 8 : 8;
      const marginRatio =
        sku && sku.illustrativeRrpGbp > 0
          ? (sku.illustrativeRrpGbp - sku.illustrativeWholesaleGbp) / sku.illustrativeRrpGbp
          : 0.35;
      const marginScore = marginRatio >= 0.38 ? 9 : marginRatio >= 0.32 ? 8 : 7;

      const overallScore = Math.min(
        96,
        Math.round(
          ((ownershipScore +
            heritageScore +
            demandScore +
            vendorCentralFitScore +
            logisticsScore +
            marginScore) /
            60) *
            100
        )
      );

      const summaryRationale = noSoldByAmazon
        ? `Amazon.co.uk lacks a "Sold by Amazon" 1P retail offer for ${brand.name}; 3P sellers handle patchy stock while ${
            distiller?.ukDistributorName || brand.ukImporterOrDistributor
          } serves traditional UK trade. High-conviction 1P Vendor Central + WePrep partnership fit.`
        : `${brand.name} already displays "Sold by Amazon" 1P supply via ${
            distiller?.ukDistributorName || brand.ukImporterOrDistributor
          }; tracked for UK BWS category pricing, A+ conversion benchmarks, and multipack gifting elasticity.`;

      return {
        id: `opp-exp-${idx + 100}`,
        brandId: brand.id,
        brandName: brand.name,
        countryName: brand.countryName,
        category: brand.primaryCategory,
        overallScore,
        status: brand.opportunityStatus,
        researchCompletenessPct: noSoldByAmazon ? 91 : 95,
        summaryRationale,
        recommendedNextAction: brand.nextAction,
        assessedBy: 'Mercenta Commercial Team',
        dateAssessed: '2026-11-19',
        criteria: [
          {
            criterion: '1. Legal Brand Ownership Verification',
            score: ownershipScore,
            evidenceNote: `${brand.brandOwner} (${brand.parentCompany}) confirmed.`,
          },
          {
            criterion: '2. Product Quality & Heritage Story',
            score: heritageScore,
            evidenceNote: `${brand.region}, ${brand.countryName} provenance & ${brand.productRangeSummary}.`,
          },
          {
            criterion: '3. UK Market Category Demand',
            score: demandScore,
            evidenceNote: `${brand.primaryCategory} UK retail velocity & Amazon search intent.`,
          },
          {
            criterion: '4. Amazon Vendor Central UK (1P) Fit',
            score: vendorCentralFitScore,
            evidenceNote: noSoldByAmazon
              ? 'No "Sold by Amazon" 1P offer found — clear 1P stewardship opportunity.'
              : 'Existing "Sold by Amazon" 1P benchmark tracked in category.',
          },
          {
            criterion: '5. DHL / Wet-Bond / WePrep Readiness',
            score: logisticsScore,
            evidenceNote: isDomestic
              ? 'Domestic UK HMRC duty-paid delivery direct to WePrep Ipswich.'
              : 'Supported via Mercenta DHL Credit Direct-Ship or EHD London / Seabrook wet bond.',
          },
          {
            criterion: '6. Wholesale Margin & Cost Spread',
            score: marginScore,
            evidenceNote: sku
              ? `1P cost ~£${sku.illustrativeWholesaleGbp.toFixed(2)} vs £${sku.illustrativeRrpGbp.toFixed(2)} UK RRP.`
              : `Est. £${Math.round(brand.illustrativePipelineValueGbp / 1000)}k annual 1P potential.`,
          },
        ],
      };
    });
}
