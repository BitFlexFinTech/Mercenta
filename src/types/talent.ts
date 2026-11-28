export type NavSectionId =
  | 'dashboard'
  | 'profile'
  | 'brands'
  | 'uk-opportunities'
  | 'acquisition'
  | 'campaigns'
  | 'brand-stores'
  | 'concepts'
  | 'development'
  | 'collections'
  | 'assets'
  | 'approvals'
  | 'purchase-orders'
  | 'fulfilment'
  | 'inventory'
  | 'royalties'
  | 'financials'
  | 'settings';

export type ProductCategory =
  | 'Graphic T-Shirts'
  | 'Hoodies'
  | 'Caps & Headwear'
  | 'Accessories'
  | 'Collectibles'
  | 'Lifestyle Merchandise';

export type DevelopmentStage =
  | 'Concept Draft'
  | 'Tech Pack'
  | 'Sampling'
  | 'Pre-Production'
  | 'Production Ready';

export type ApprovalStatus =
  | 'Draft'
  | 'Pending Review'
  | 'Approved'
  | 'Changes Requested'
  | 'Rejected';

// ---------------------------------------------------------------------------
// Commercial Intelligence, Roster, Discovery & UK Wholesale Opportunity Types
// ---------------------------------------------------------------------------
export type TalentVertical =
  | 'Film & TV'
  | 'Sports'
  | 'Digital Creators'
  | 'Music'
  | 'Podcasts & Media';

export type CaaRepresentationStatus =
  | 'Verified Publicly'
  | 'Reported / Unconfirmed'
  | 'Requires Verification'
  | 'Historical / Unclear'
  | 'Unknown';

export type VerificationTier =
  | 'Verified Fact'
  | 'Publicly Reported'
  | 'Inference'
  | 'Unverified'
  | 'Demonstration Data';

export type ConfidenceLevel = 'High' | 'Medium' | 'Low';

export interface SourceVerificationStamp {
  id: string;
  sourceName: string;
  sourceUrl: string;
  dateChecked: string;
  evidenceSummary: string;
  verificationTier: VerificationTier;
  confidence: ConfidenceLevel;
  unknownFields: string[];
  notes?: string;
}

export type CommercialRelationshipType =
  | 'Owned Business'
  | 'Founder'
  | 'Co-Owned'
  | 'Talent-Authorised'
  | 'Licensed'
  | 'Endorsement'
  | 'Sponsorship'
  | 'Collaboration'
  | 'Merchandise'
  | 'Historical'
  | 'Business Interest';

export type UkOpportunityType =
  | 'Type A — No UK Presence'
  | 'Type B — 3P / Unauthorised UK Sellers'
  | 'Type C — Amazon UK Present, Unclear Wholesale'
  | 'Type D — UK DTC Site Only, No Amazon UK'
  | 'Type E — Partial / Limited UK Catalogue'
  | 'Type F — Existing UK Distributor (Caution)'
  | 'Type G — Unsuitable / UK Market Barriers';

export type UkWholesaleRouteStatus =
  | 'Route Unclear'
  | 'Direct Brand Contact'
  | 'CAA Relationship Intro'
  | 'Wholesale Authorised'
  | 'Existing UK Distributor'
  | 'Blocked / Unsuitable';

export interface ScoreFactor {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  rationale: string;
}

export interface ScoreBreakdown {
  total: number;
  priorityTier: 'High Priority' | 'Medium Priority' | 'Watchlist' | 'Hold / Low';
  factors: ScoreFactor[];
  supportingEvidence: string[];
  missingInformation: string[];
  keyRisks: string[];
  recommendedNextAction: string;
}

export interface TalentProfileRecord {
  id: string;
  name: string;
  slug: string;
  vertical: TalentVertical;
  roleSummary: string;
  primaryMarket: string;
  portraitUrl?: string;
  portraitCredit?: string;
  monogramInitials: string;
  monogramAccent: string;
  caaStatus: CaaRepresentationStatus;
  identityCheckRequired?: boolean;
  identityCheckNote?: string;
  discoveryStatus: 'Completed' | 'Pending Review' | 'Draft';
  discoveryLastRun?: string;
  portfolioSummary: string;
  verification: SourceVerificationStamp;
  notes?: string;
}

export interface TalentBrandRelationship {
  id: string;
  talentId: string;
  brandId: string;
  relationshipType: CommercialRelationshipType;
  isCurrent: boolean;
  ukDistributionRightsConfirmed: 'Confirmed' | 'Unconfirmed' | 'Not Included';
  summary: string;
  verification: SourceVerificationStamp;
}

export interface BrandRecord {
  id: string;
  name: string;
  normalizedName: string;
  category: string;
  originCountry: string;
  websiteUrl: string;
  logoUrl?: string;
  imageUrl?: string;
  imageCredit?: string;
  description: string;
  ukWholesaleRouteStatus: UkWholesaleRouteStatus;
  distributorNote?: string;
  verification: SourceVerificationStamp;
}

export interface DiscoveredProduct {
  id: string;
  brandId: string;
  title: string;
  category: string;
  variantSummary: string;
  skuOrRef?: string;
  asinUs?: string;
  asinUk?: string;
  image?: string;
  imageCredit?: string;
  officialUrl: string;
  ukRrpGBP?: number;
  usPriceUSD?: number;
  summary: string;
  verification: SourceVerificationStamp;
}

export type InternationalMarketCode =
  | 'US'
  | 'CA'
  | 'AU'
  | 'DE'
  | 'FR'
  | 'Official Brand DTC';

export interface InternationalListing {
  id: string;
  brandId: string;
  productId?: string;
  market: InternationalMarketCode;
  presenceStatus: 'Active Official' | '3P Sellers Active' | 'Limited Selection' | 'Not Found';
  currency: string;
  observedPrice?: number;
  sellerType: string;
  url: string;
  verification: SourceVerificationStamp;
}

export interface UkMarketAssessment {
  id: string;
  brandId: string;
  productId?: string;
  opportunityType: UkOpportunityType;
  amazonUkPresence:
    | 'Not Present'
    | '3P Sellers Only'
    | 'Limited Official Range'
    | 'Brand Store Live';
  ukDtcPresence: 'Yes — UK DTC Live' | 'No UK DTC' | 'Unknown';
  existingDistributorDetected: boolean;
  estimatedGapSummary: string;
  complianceOrBarrierNote?: string;
  verification: SourceVerificationStamp;
}

export type AcquisitionRoute =
  | 'Route 1 — Relationship-Led'
  | 'Route 2 — Talent-Owned / Authorised';

export type AcquisitionStage =
  | 'Discovery'
  | 'Evidence & Verification'
  | 'CAA Liaison / Intro Requested'
  | 'UK Wholesale Permission Review'
  | 'Commercial Terms & Onboarding'
  | 'Amazon UK Ready'
  | 'On Hold / Unsuitable';

export interface AcquisitionChecklistItem {
  label: string;
  done: boolean;
}

export interface AcquisitionWorkflow {
  id: string;
  brandId: string;
  primaryTalentId: string;
  route: AcquisitionRoute;
  stage: AcquisitionStage;
  wholesalePermissionConfirmed: boolean;
  ownerNote: string;
  nextStep: string;
  updatedAt: string;
  checklist: AcquisitionChecklistItem[];
  verification: SourceVerificationStamp;
}

export interface BrandStoreModule {
  id: string;
  type:
    | 'Hero Banner'
    | 'Featured Collection'
    | 'Best Sellers Grid'
    | 'Brand Story & Talent'
    | 'Comparison Strip';
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaTargetPage: string;
  selectedProductIds: string[];
  bannerImage: string;
}

export interface BrandStoreProject {
  id: string;
  code: string;
  brandId: string;
  talentId: string;
  storeName: string;
  amazonUkSlug: string;
  headline: string;
  subheadline: string;
  heroImage: string;
  navPages: string[];
  modules: BrandStoreModule[];
  assetIds: string[];
  productIds: string[];
  approvalStatus: ApprovalStatus;
  simulatedPublished: boolean;
  updatedAt: string;
  notes: string;
}

// ---------------------------------------------------------------------------
// White-Labeled Production Catalog Types (Zero Third-Party POD Branding)
// ---------------------------------------------------------------------------
export type CatalogFilterGroup =
  | 'All'
  | 'T-Shirts'
  | 'Jerseys & Kits'
  | 'Hoodies & Fleece'
  | 'Caps & Headwear'
  | 'Accessories'
  | 'Collectibles & Prints'
  | 'Drinkware & Lifestyle';

export interface CatalogBlankVariant {
  id: string;
  productId: string;
  size: string;
  color: string;
  colorHex: string;
  image: string;
  singleUnitCostGBP: number;
  inStock: boolean;
  ukStatus: 'UK Hub In Stock' | 'UK Express Allocation';
}

export interface CatalogBlankProduct {
  id: string;
  liveProductId?: number;
  skuCode: string;
  title: string;
  brandSpec: string;
  typeName: string;
  filterGroup: Exclude<CatalogFilterGroup, 'All'>;
  category: ProductCategory;
  productionLine:
    | 'UK Apparel & Embroidery Hub'
    | 'UK All-Over-Print Matchday Line'
    | 'UK Archival Art & Collector Foundry'
    | 'UK Local Print & Drinkware Hub';
  image: string;
  description: string;
  fabricSummary: string;
  variantCount?: number;
  variants: CatalogBlankVariant[];
}

// ---------------------------------------------------------------------------
// Product Concepts (Configured for Amazon UK Vendor Central Wholesale)
// ---------------------------------------------------------------------------
export interface ProductConcept {
  id: string;
  sku: string;
  name: string;
  image: string;
  imageNote: string;
  description: string;
  category: ProductCategory;
  collectionId: string;
  developmentStage: DevelopmentStage;
  proposedCost: number;
  proposedRetail: number;
  proposedWholesale: number;
  approvalStatus: ApprovalStatus;
  fabricSpec: string;
  targetRelease: string;
  createdAt: string;
  updatedAt: string;
  catalogBlankId?: string;
  catalogVariantId?: string;
  productionLine?: string;
  selectedColor?: string;
  selectedColorHex?: string;
  selectedSize?: string;
  ukFulfilled?: boolean;
  amazonAsinDemo?: string;
}

export interface Collection {
  id: string;
  code: string;
  name: string;
  seasonWindow: string;
  positioning: string;
  status: 'Proposed Concept' | 'In Development' | 'Ready for Review';
  heroImage: string;
  heroCredit: string;
}

// ---------------------------------------------------------------------------
// Amazon UK Ads Structure & Campaigns (All 9 UK Ad Formats + Store/A+/PDP)
// ---------------------------------------------------------------------------
export type AmazonAdType =
  | 'Sponsored Products'
  | 'Sponsored Brands — Product Collection'
  | 'Sponsored Brands — Store Spotlight'
  | 'Sponsored Brands — Video'
  | 'Sponsored Display'
  | 'Sponsored TV'
  | 'Amazon DSP Display'
  | 'Brand Store & Posts'
  | 'Amazon Audio Ads';

export type CampaignCreativeCategory =
  | 'Amazon Ads'
  | 'Brand Store Banner'
  | 'A+ Content Module'
  | 'Amazon UK PDP Creative';

export type AmazonTargetingType = 'AUTO' | 'MANUAL';
export type AmazonSponsoredBrandsFormat = 'PRODUCT_COLLECTION' | 'STORE_SPOTLIGHT' | 'VIDEO';
export type AmazonDisplaySize = '300x250' | '728x90' | '300x600' | '320x50';
export type AmazonDspSize = '970x250' | '300x250' | '320x50';

export interface AmazonAdsConfig {
  marketplaceId: string;
  marketplaceDomain: string;
  endpointHost: string;
  spApiSource: string;
  adType: AmazonAdType;
  targetingType: AmazonTargetingType;
  dailyBudgetGBP: number;
  biddingStrategy: 'LEGACY_FOR_SALES' | 'AUTO_FOR_SALES' | 'MANUAL';
  adGroupName: string;
  defaultBidGBP: number;
  headline: string;
  brandName: string;
  sbFormat?: AmazonSponsoredBrandsFormat;
  sdSize?: AmazonDisplaySize;
  dspSize?: AmazonDspSize;
  tvFormat?: '15s Streaming Spot' | '30s Prime Video Spot';
  audioLength?: '15s Alexa Spot' | '30s Amazon Music UK';
  storeSlug?: string;
  keywords: string[];
  advertisedAsins: string[];
  customMediaUrl?: string;
  customVideoUrl?: string;
}

export type CampaignStatus =
  | 'Concept Outline'
  | 'Creative in Progress'
  | 'Awaiting Approval'
  | 'Ready for Launch (Demo)'
  | 'Paused';

export interface Campaign {
  id: string;
  code: string;
  name: string;
  objective: string;
  talentId?: string;
  brandId?: string;
  creativeFormatCategory?: CampaignCreativeCategory;
  relationshipVerifiedNote?: string;
  wholesalePermissionConfirmed?: boolean;
  associatedProductIds: string[];
  creativeAssetIds: string[];
  heroImage: string;
  heroCredit: string;
  status: CampaignStatus;
  proposedStartDate: string;
  proposedEndDate: string;
  approvalStatus: ApprovalStatus;
  channels: string[];
  illustrativeImpressions: number;
  illustrativeEstOrders: number;
  illustrativeEstRevenue: number;
  notes: string;
  amazonAds: AmazonAdsConfig;
}

export interface CreativeAsset {
  id: string;
  title: string;
  assetType:
    | 'Official Logos & Marks'
    | 'Apparel & Product Designs'
    | 'Social & Ad Banners'
    | 'Talent Photography'
    | 'Campaign Video Asset';
  mediaType?: 'image' | 'video' | 'audio';
  src: string;
  dimensions: string;
  licenseLabel: string;
  attribution: string;
  usageScope: string;
  linkedEntity: string;
  dateAdded: string;
}

export type ApprovalType =
  | 'Product Concept'
  | 'Product Design'
  | 'Campaign Creative'
  | 'Brand Storefront'
  | 'Marketing Material'
  | 'Commercial Proposal';

export interface ApprovalComment {
  id: string;
  author: string;
  role: string;
  text: string;
  timestamp: string;
}

export interface ApprovalHistoryEntry {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  note?: string;
}

export interface ApprovalItem {
  id: string;
  reference: string;
  type: ApprovalType;
  title: string;
  description: string;
  submissionDate: string;
  submittedBy: string;
  linkedType: 'product' | 'campaign' | 'brand-store' | 'proposal';
  linkedId: string;
  linkedName: string;
  previewImage?: string;
  status: Exclude<ApprovalStatus, 'Draft'>;
  comments: ApprovalComment[];
  history: ApprovalHistoryEntry[];
}

export type POStage =
  | 'Draft PO'
  | 'Sample Approved'
  | 'Bulk Cutting'
  | 'Sewing & Finishing'
  | 'QC Inspection'
  | 'Ex-Factory Ready';

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  totalValue: number;
  illustrativeSupplier: string;
  supplierRegion: string;
  stage: POStage;
  targetExFactoryDate: string;
  notes: string;
}

export type FulfilmentStage =
  | 'Allocated (Demo)'
  | 'In Production'
  | 'Packed at 3PL'
  | 'Dispatched'
  | 'In Transit'
  | 'Delivered (Demo)';

export interface OrderTimelineStep {
  label: string;
  completed: boolean;
  timestamp: string;
  detail: string;
}

export interface FulfilmentOrder {
  id: string;
  orderNumber: string;
  channel: 'Amazon UK Vendor PO (SP-API)' | 'Wholesale Sample';
  customerLabel: string;
  region: string;
  productId: string;
  productName: string;
  quantity: number;
  orderValue: number;
  productionStage: POStage;
  dispatchStatus: 'Awaiting Stock' | 'Ready for Dispatch' | 'Dispatched' | 'Completed';
  deliveryStatus: FulfilmentStage;
  createdAt: string;
  timeline: OrderTimelineStep[];
}

export interface InventoryRecord {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  category: ProductCategory;
  sampleUnits: number;
  proposedInitialRun: number;
  allocatedDemoUnits: number;
  availableBuffer: number;
  reorderPoint: number;
  hubLocation: string;
  readinessStatus: 'Sample Only' | 'Pre-Allocation Ready' | 'Low Sample Buffer';
}

export interface RoyaltyLineItem {
  productId: string;
  sku: string;
  productName: string;
  channel: 'Amazon UK Launch PO (SP-API)' | 'Amazon UK Replenishment PO (SP-API)';
  units: number;
  grossRevenue: number;
  netSalesBase: number;
  illustrativeRatePct: number;
  calculatedRoyalty: number;
}

export interface RoyaltyStatement {
  id: string;
  statementRef: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  launchWholesaleRevenue: number;
  replenishmentWholesaleRevenue: number;
  assumedWholesaleRatePct: number;
  illustrativeRoyaltyTotal: number;
  paymentStatus: 'Draft Model' | 'Illustrative Scheduled' | 'Sample Settled';
  notes: string;
  lineItems: RoyaltyLineItem[];
}

export interface ActivityEvent {
  id: string;
  category: 'Intelligence' | 'Acquisition' | 'Brand Store' | 'Product' | 'Campaign' | 'Approval' | 'Order' | 'Royalty';
  title: string;
  detail: string;
  actor: string;
  timestamp: string;
  targetSection?: NavSectionId;
}

export interface DemoSettings {
  activeReviewerName: string;
  activeReviewerRole: 'CAA Talent Agent' | 'Mercenta Operations Lead' | 'Talent Brand Representative';
  defaultWholesaleRoyaltyPct: number;
  illustrativeDeductionPct: number;
  showWatermarkNotice: boolean;
}
