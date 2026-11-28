export type NavSectionId =
  | 'overview'
  | 'country-discovery'
  | 'brand-discovery'
  | 'brand-intelligence'
  | 'uk-distribution'
  | 'amazon-uk'
  | 'pitch-targets'
  | 'opportunity-assessment'
  | 'acquisition-pipeline'
  | 'brand-portfolio'
  | 'product-catalogue'
  | 'brand-onboarding'
  | 'partner-portal'
  | 'compliance-regulatory'
  | 'import-excise'
  | 'wholesale-distribution'
  | 'inventory-fulfilment'
  | 'campaign-studio'
  | 'brand-growth'
  | 'financials'
  | 'reports-analytics'
  | 'settings';

export type VerificationStatus =
  | 'Verified'
  | 'Partially Verified'
  | 'Requires Verification'
  | 'Not Found in Reviewed Sources'
  | 'Unknown';

export type OpportunityStatus =
  | 'High Potential'
  | 'Worth Investigating'
  | 'Existing UK Representation'
  | 'Distribution Status Unclear'
  | 'Requires Further Research'
  | 'Not Suitable';

export type PipelineStage =
  | 'Discovered'
  | 'Initial Research'
  | 'Brand Intelligence'
  | 'UK Distribution Review'
  | 'Amazon UK Review'
  | 'Opportunity Assessment'
  | 'Shortlisted'
  | 'Contact Preparation'
  | 'In Discussion'
  | 'Partnership Confirmed'
  | 'Onboarding';

export type DrinkCategory =
  | 'Wine'
  | 'Sparkling Wine'
  | 'Beer'
  | 'Vodka'
  | 'Rum'
  | 'Whisky & Whiskey'
  | 'Gin'
  | 'Agave Spirits'
  | 'Liqueurs & Aperitifs'
  | 'Sake & Specialty';

export type CommercialRole =
  | 'Brand Owner'
  | 'Manufacturer / Producer'
  | 'UK Importer'
  | 'UK Distributor'
  | 'UK Wholesaler'
  | 'UK Agent / Representative'
  | 'UK Retailer'
  | 'Marketplace Seller (3P)'
  | 'Amazon Vendor Central UK (1P)';

export interface EvidenceRecord {
  id: string;
  entityId: string;
  entityType: 'country' | 'brand' | 'distribution' | 'amazon';
  sourceName: string;
  sourceType:
    | 'Official Registry'
    | 'Company Filing'
    | 'Producer Website'
    | 'Trade Directory'
    | 'Marketplace Observation'
    | 'Import Record'
    | 'Industry Association';
  sourceDate: string;
  dateReviewed: string;
  supports: string;
  verificationStatus: VerificationStatus;
}

export interface ProducerProfile {
  id: string;
  name: string;
  countryId: string;
  region: string;
  speciality: string;
  established: number;
  annualCapacity: string;
  brandIds: string[];
  verificationStatus: VerificationStatus;
}

export interface CountryProfile {
  id: string;
  name: string;
  isoCode: string;
  regionGroup: 'Europe' | 'Americas' | 'Africa' | 'Asia-Pacific';
  coordinates: { x: number; y: number };
  overview: string;
  industryStrengths: string;
  categories: DrinkCategory[];
  specialities: string[];
  brandsDiscoveredCount: number;
  researchStatus: 'Active Deep Dive' | 'Structured Review' | 'Initial Mapping' | 'Monitoring';
  ukPresenceIndicator: 'High Saturation' | 'Selective Presence' | 'Emerging / Fragmented' | 'Under-Represented';
  commercialOpportunityIndicator: 'Primary Focus' | 'Selective Opportunity' | 'Niche Specialty' | 'Competitive / Saturated';
  featuredProducers: ProducerProfile[];
  exportMarkets: string[];
  ukMarketSummary: string;
  unclearRepresentationCount: number;
  acquisitionCandidatesCount: number;
  evidenceIds: string[];
}

export interface SkuPricePoint {
  monthLabel: string;
  observedUkPriceGbp: number;
  targetRrpGbp: number;
  wholesaleCostGbp: number;
  channelNote: string;
}

export interface ProductSku {
  id: string;
  brandId: string;
  brandName: string;
  countryId: string;
  countryName: string;
  name: string;
  category: DrinkCategory;
  productType: string;
  bottleSize: string;
  abv: string;
  packFormat: string;
  packagingInfo: string;
  tastingNotes?: string;
  imageUrl: string;
  status: 'Active Portfolio' | 'Evaluating' | 'Onboarding Prep' | 'Catalogue Watch';
  illustrativeWholesaleGbp: number;
  illustrativeRrpGbp: number;
  priceHistory12m?: SkuPricePoint[];
}

export type RadarComparisonMode = 'leaders-avg' | 'top2-leaders' | 'custom';

export interface RadarBenchmarkMetrics {
  brandId: string;
  brandName: string;
  pricePoint: number;
  distributionCoverage: number;
  marketingReach: number;
  amazon1pControl: number;
  brandMargin: number;
  is1pLeader: boolean;
}

export interface MutualBenefitAnalysis {
  brandId: string;
  objectiveFitScore: number;
  fitTier:
    | 'Prime 1P Partner Fit'
    | 'Strong 1P Candidate'
    | 'Selective 1P Expansion'
    | 'Existing 1P Steward';
  recommendedLogisticsPathway: string;
  pricingDriftGbp: number;
  pricingDriftPct: number;
  wholesaleMarginPerUnitGbp: number;
  wholesaleMarginPct: number;
  estimatedAnnual1pPoGbp: number;
  brandGains: {
    headline: string;
    priceIntegrityRecovery: string;
    channelAndLogisticsWin: string;
    conversionAndAPlusWin: string;
    distributorCoexistence: string;
  };
  mercentaGains: {
    headline: string;
    marginSpreadSummary: string;
    poVolumeSummary: string;
    categoryWhitespaceSummary: string;
  };
  mutualVerdict: string;
}

export interface ScoutCandidate {
  brandName: string;
  countryName: string;
  region: string;
  brandOwner: string;
  parentCompany: string;
  manufacturer: string;
  productionLocation: string;
  website: string;
  description: string;
  primaryCategory: string;
  productRangeSummary: string;
  ukPresenceStatus: string;
  ukImporterOrDistributor: string;
  ukArrangementType: string;
  amazonUkPresence: string;
  opportunityStatus: string;
  nextAction: string;
  exportContactRole: string;
  exportContactEmail: string;
  ukDistributorWebsite: string;
  ukDistributorContact: string;
  ukRepresentationStatus: string;
  flagshipSkuName: string;
  flagshipSkuType: string;
  flagshipBottleSize: string;
  flagshipAbv: string;
  flagshipPackFormat: string;
  flagshipTastingNotes: string;
  flagshipWholesaleGbp: number;
  flagshipRrpGbp: number;
  flagshipImageUrl?: string;
  objectiveScore: number;
  brandWinSummary: string;
  mercentaWinSummary: string;
  mutualBenefitVerdict: string;
}

export interface BrandProfile {
  id: string;
  name: string;
  countryId: string;
  countryName: string;
  region: string;
  brandOwner: string;
  parentCompany: string;
  manufacturer: string;
  productionLocation: string;
  licensingArrangement: string;
  ownershipVerification: VerificationStatus;
  website: string;
  description: string;
  categories: DrinkCategory[];
  primaryCategory: DrinkCategory;
  productRangeSummary: string;
  internationalMarkets: string[];
  internationalDistributors: { market: string; organisation: string; role: string; status: VerificationStatus }[];
  retailAndMarketplacePresence: string;
  ukPresenceStatus: 'Present (Multiple Sellers)' | 'Present (Verified Distributor)' | 'Limited / Sporadic' | 'Not Observed in UK';
  ukImporterOrDistributor: string;
  ukArrangementType: 'Exclusive (Verified)' | 'Non-Exclusive (Verified)' | 'Unverified / Grey Channel' | 'Unknown' | 'None Confirmed';
  amazonUkPresence:
    | 'Sold by Amazon (1P Vendor Central Active)'
    | 'Sold by Amazon + 3P Resellers'
    | "Sold by 3P Resellers Only (No 'Sold by Amazon' — 1P Target)"
    | "3P Fragmented / Unclaimed (No 'Sold by Amazon')";
  researchStatus: 'Complete' | 'In Review' | 'Initial Profile' | 'Awaiting Verification';
  opportunityStatus: OpportunityStatus;
  pipelineStage: PipelineStage;
  nextAction: string;
  illustrativePipelineValueGbp: number;
  skuIds: string[];
}

export interface DistillerManufacturerRecord {
  id: string;
  distillerName: string;
  brandId: string;
  brandName: string;
  countryId: string;
  countryName: string;
  region: string;
  categories: DrinkCategory[];
  drinksProduced: string;
  exportWebsite: string;
  exportContactEmail: string;
  exportContactRole: string;
  ukDistributorName: string;
  ukDistributorWebsite: string;
  ukDistributorContact: string;
  ukRepresentationStatus: 'Verified UK Agency' | 'Brand Subsidiary UK' | 'Open / 1P Amazon Opportunity' | 'Multiple / Non-Exclusive';
}

export type OutreachStatus =
  | 'Not Contacted'
  | 'Initial Outreach Sent'
  | 'Follow-Up Sent'
  | 'In Active Discussion'
  | 'Terms Shared'
  | 'Confirmed'
  | 'Paused';

export interface OutreachAmazonAudit {
  buyBoxSignal: string;
  resellerLeakageRisk: string;
  listingQualityGap: string;
  estimatedAnnual1pUpsideGbp: string;
  keyOpportunities: string[];
}

export interface OutreachLogRecord {
  brandId: string;
  outreachStatus: OutreachStatus;
  contactPerson: string;
  contactRole: string;
  contactEmail: string;
  lastContacted: string;
  nextFollowUp: string;
  discussionNotes: string;
  lastPitchSubject?: string;
  lastPitchBody?: string;
  lastAmazonAudit?: OutreachAmazonAudit;
}

export interface UkDistributionRecord {
  id: string;
  brandId: string;
  brandName: string;
  countryName: string;
  organisation: string;
  commercialRole: CommercialRole;
  contactInfo: string;
  territory: string;
  relationshipType:
    | 'Exclusive Agreement'
    | 'Non-Exclusive Distribution'
    | 'Direct Retail Supply'
    | 'Unverified Reseller Activity'
    | 'Vendor Central 1P Opportunity';
  evidenceSummary: string;
  sourceName: string;
  dateReviewed: string;
  verificationStatus: VerificationStatus;
}

export interface AmazonUkListingRecord {
  id: string;
  brandId: string;
  brandName: string;
  asin: string;
  productTitle: string;
  imageUrl: string;
  listingStatus: 'Active (1P Buy Box)' | 'Active (3P Fragmented)' | 'Suppressed / Incomplete' | 'Vendor Central Target';
  sellerName: string;
  sellerClassification:
    | 'Amazon Vendor Central UK (1P)'
    | 'Authorised UK Distributor'
    | 'Third-Party Reseller (3P)'
    | 'Unverified Marketplace Seller';
  displayedPriceGbp: number | null;
  availability: string;
  packVariations: string[];
  totalBrandListings: number;
  rangeCoveragePct: number;
  listingQualityScore: 'Strong (A+ & Brand Registry)' | 'Moderate (Basic Images)' | 'Poor (Duplicate / Incomplete)' | 'Unclaimed';
  brandPresentationNote: string;
  dateObserved: string;
  verificationStatus: VerificationStatus;
}

export interface OpportunityCriterion {
  criterion: string;
  score: number;
  evidenceNote: string;
}

export interface OpportunityAssessmentRecord {
  id: string;
  brandId: string;
  brandName: string;
  countryName: string;
  category: DrinkCategory;
  overallScore: number;
  status: OpportunityStatus;
  researchCompletenessPct: number;
  summaryRationale: string;
  recommendedNextAction: string;
  assessedBy: string;
  dateAssessed: string;
  criteria: OpportunityCriterion[];
}

export interface PortfolioBrandRecord {
  id: string;
  brandId: string;
  brandName: string;
  countryName: string;
  brandOwner: string;
  categories: DrinkCategory[];
  skuCount: number;
  portfolioStatus: 'Active Wholesale & Vendor Central 1P' | 'Vendor Central UK Launch' | 'Onboarding Complete';
  illustrativeAnnualRevenueGbp: number;
  illustrativeYoyGrowthPct: number;
  amazonUkStatus: string;
  growthOpportunity: string;
}

export interface OnboardingStageItem {
  stageName: string;
  status: 'Completed' | 'In Progress' | 'Pending Review' | 'Not Started';
  owner: string;
  updatedDate: string;
}

export interface BrandOnboardingRecord {
  id: string;
  brandId: string;
  brandName: string;
  countryName: string;
  category: DrinkCategory;
  targetLaunchWindow: string;
  overallProgressPct: number;
  stages: OnboardingStageItem[];
}

export interface ComplianceRecord {
  id: string;
  brandName: string;
  productName: string;
  classification: string;
  awrsCheck: 'Confirmed (Illustrative)' | 'Pending Review' | 'Required';
  labellingCheck: 'UK ABV & Allergen Ready' | 'Requires UK Strip Label' | 'Under Review';
  abvDeclared: string;
  packagingCompliance: string;
  ageRestrictionNotice: string;
  documentationStatus: 'Complete' | 'Awaiting Certificate of Origin' | 'In Review';
  regulatoryReviewStatus: 'Cleared (Prototype Sample)' | 'Action Required' | 'In Review';
  lastReviewed: string;
}

export interface ImportExciseRecord {
  id: string;
  shipmentRef: string;
  countryOfOrigin: string;
  supplier: string;
  productSummary: string;
  bondFacility: string;
  importDocsStatus: 'Verified' | 'Partial' | 'Outstanding';
  customsStatus: 'Pre-Lodged (CDS)' | 'EMCS e-AD Active' | 'Cleared Duty-Paid (Sample)';
  exciseDutyStatus: '3P Wet-Bond Suspension' | 'Duty Deferment Cleared' | 'Duty-Paid to WePrep';
  importReadiness: 'Ready for WePrep Release' | 'In Wet-Bond Storage' | 'Pending Documentation';
  shipmentStatus: string;
  outstandingItems: string;
}

export interface WetBondPartnerRecord {
  id: string;
  name: string;
  location: string;
  website: string;
  bestFor: string;
  onboardingRequirements: string[];
  estimatedTimeline: string;
  notes: string;
}

export interface WholesaleOrderRecord {
  id: string;
  orderNumber: string;
  type: 'Amazon Vendor Central PO (1P)' | 'Inbound Supplier PO' | 'Outbound UK Trade Order';
  counterparty: string;
  brandName: string;
  casesCount: number;
  illustrativeValueGbp: number;
  warehouse: string;
  fulfilmentStatus: 'Dispatched' | 'WePrep ASN & SSCC Prep' | 'Direct-Ship DHL Booked' | 'Delivered';
  deliveryTracking: string;
  date: string;
}

export interface InventoryItemRecord {
  id: string;
  skuCode: string;
  brandName: string;
  productName: string;
  warehouse:
    | 'WePrep UK (Ipswich · Duty-Paid 1P Prep)'
    | 'EHD London No. 1 Bond (Duty-Suspended)'
    | 'Seabrook Warehousing (Thurrock · Wet-Bond)';
  onHandCases: number;
  incomingCases: number;
  allocatedCases: number;
  availableCases: number;
  stockHealth: 'Optimal' | 'Low Stock' | 'Reorder Triggered' | 'Inbound Pending';
  fulfilmentChannel: 'Amazon Vendor Central UK (1P) + Trade' | 'Amazon Vendor Central UK (1P)' | '3P Wet-Bond Reserve';
}

export type FulfilmentPathway = 'direct_ship_dhl' | 'weprep_duty_paid' | 'third_party_wet_bond';

export interface VendorCentralPoRecord {
  id: string;
  poNumber: string;
  brandId: string;
  brandName: string;
  skuName: string;
  amazonFcCode: string;
  casesRequested: number;
  totalCostGbp: number;
  poReceivedDate: string;
  amazonWindowEnd: string;
  selectedPathway: FulfilmentPathway;
  dispatchLeadTimeDays: number;
  status: 'Awaiting Brand Confirmation' | 'DHL Waybill Scheduled' | 'WePrep 1P ASN Queued' | 'Delivered to Amazon FC';
}

export interface PartnerBrandAccount {
  brandId: string;
  brandName: string;
  portalEmail: string;
  mercentaAccountManager: string;
  accountManagerEmail: string;
  dhlAccountNumber: string;
  mercentaEori: string;
  mercentaAwrsUrn: string;
  defaultPathway: FulfilmentPathway;
  defaultLeadTimeDays: number;
  wetBondPartnerName: string;
}

export type PartnerTimeframe = '7d' | '30d' | '90d' | 'ytd';

export interface PartnerDailyPoint {
  label: string;
  totalSalesGbp: number;
  adSalesGbp: number;
  adSpendGbp: number;
  orderedUnits: number;
}

export interface PartnerAsinMetric {
  asin: string;
  skuName: string;
  shippedRevenueGbp: number;
  orderedUnits: number;
  glanceViews: number;
  conversionPct: number;
  adSpendGbp: number;
  adSalesGbp: number;
  buyBoxPct: number;
}

export interface PartnerCampaignMetric {
  id: string;
  campaignName: string;
  formatLabel: string;
  channelLabel: string;
  status: 'Delivering' | 'Optimising' | 'Paused';
  impressions: number;
  clicks: number;
  spendGbp: number;
  salesGbp: number;
}

export interface PartnerAmazonDashboardData {
  brandId: string;
  vendorCode: string;
  dataSourceLabel: string;
  buyBoxWinPct: number;
  series30d: PartnerDailyPoint[];
  asinMetrics: PartnerAsinMetric[];
  campaigns: PartnerCampaignMetric[];
}

export type ChecklistStatus = 'Not Started' | 'In Progress' | 'Sorted';

export interface AdminChecklistItem {
  id: string;
  pillar: 'HMRC & Entity' | 'WePrep & Wet-Bond' | 'Finance & Insurance' | 'DHL & Amazon 1P';
  title: string;
  description: string;
  whereToDoItLabel: string;
  portalUrl: string;
  costNote: string;
  defaultStatus: ChecklistStatus;
}

export type AiTaskSlot =
  | 'outreach'
  | 'research'
  | 'compliance'
  | 'campaignCopy'
  | 'campaignImage'
  | 'campaignVideo';

export interface AiModelOption {
  id: string;
  name: string;
  provider: string;
  tasks: AiTaskSlot[];
  isFree: boolean;
  lockedBuildDefault?: boolean;
  recommendedTag?: string;
  pricingLabel: string;
  rateOrLimitNote: string;
  strengthNote: string;
}

export type AiModelRoutingConfig = Record<AiTaskSlot, string>;

export type AmazonAdFormatId =
  | 'sp_products'
  | 'sb_collection'
  | 'sb_spotlight'
  | 'sb_video'
  | 'sd_product'
  | 'sd_custom'
  | 'sponsored_tv'
  | 'prime_video'
  | 'audio_ads'
  | 'dsp_rec'
  | 'amazon_posts';

export interface AmazonAdFormatSpec {
  id: AmazonAdFormatId;
  name: string;
  billingModel: 'CPC' | 'vCPM' | 'CPM' | 'Organic / Amplified';
  dimensions: string;
  maxHeadlineChars: number;
  maxBodyChars: number;
  brandRegistryRequired: boolean;
  summary: string;
  supportedChannels: AmazonAdChannelId[];
}

export type AmazonAdChannelId =
  | 'amazon_store'
  | 'prime_video'
  | 'live_sports'
  | 'fire_tv'
  | 'twitch'
  | 'imdb'
  | 'amazon_music'
  | 'wondery'
  | 'kindle'
  | 'whole_foods_dsp'
  | 'alexa';

export interface AmazonAdChannelSpec {
  id: AmazonAdChannelId;
  name: string;
  shortDesc: string;
  eligibilityStatus: 'permitted' | 'conditional' | 'prohibited';
  eligibilityLabel: string;
  alcoholRuleNote: string;
  defaultFormatId: AmazonAdFormatId;
}

export interface CampaignDraft {
  id: string;
  brandId: string;
  brandName: string;
  skuId: string;
  skuName: string;
  formatId: AmazonAdFormatId;
  channelId: AmazonAdChannelId;
  headline: string;
  subheadline: string;
  bodyCopy: string;
  audioScript: string;
  ctaLabel: string;
  heroImageUrl: string;
  targetKeywords18Plus: string[];
  excludedYouthKeywords: string[];
  videoRatingExclusions: string[];
  creativeVisualBrief25Plus: string;
  abvAndUnitsComplianceLine: string;
  modelAge25Confirmed: boolean;
  includeResponsibleFooter: boolean;
  engineUsed: string;
  createdAt: string;
}

export interface CampaignRecord {
  id: string;
  brandName: string;
  campaignTitle: string;
  channel: string;
  status: 'Active Concept' | 'Creative Review' | 'Scheduled' | 'Draft';
  contentSummary: string;
  deliverables: string[];
  heroVisual: string;
  targetPeriod: string;
}
