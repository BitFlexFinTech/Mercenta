/**
 * §Batch-9 — Grants & Investors data sources (mock-first).
 * Legitimate sources: Innovate UK/UKRI, gov.uk, Beauhurst/Crunchbase.
 * Mock data provides realistic results so the pipeline runs today.
 */
import type { GrantOpportunity, InvestorOpportunity } from '@/types';

const MOCK_GRANTS: GrantOpportunity[] = [
  {
    id: 'grant-001', title: 'UKRI Innovate UK Smart Grants',
    provider: 'Innovate UK / UKRI', category: 'innovation', status: 'open',
    amountRange: '£25,000 - £500,000',
    eligibility: 'UK-based businesses of any size working on disruptive, innovative projects. Must be a registered UK company. Projects must be game-changing and commercially viable.',
    deadline: '2026-10-15', sourceUrl: 'https://www.ukri.org/opportunity/innovate-uk-smart-grants/',
    fitReason: 'Mercenta\'s wholesale distribution platform is a genuinely innovative approach to African-to-UK trade logistics. The smart grants programme funds game-changing innovations with commercial potential.',
    fitScore: 85, draftStarted: false, submitted: false,
  },
  {
    id: 'grant-002', title: 'UK Export Finance (UKEF) General Export Facility',
    provider: 'UK Government — UK Export Finance', category: 'export', status: 'open',
    amountRange: '£25,000 - £5,000,000',
    eligibility: 'UK businesses that export or have export contracts. Mercenta\'s business model of facilitating UK retail access for international brands qualifies.',
    deadline: '2026-12-31', sourceUrl: 'https://www.gov.uk/guidance/export-finance-for-uk-exporters',
    fitReason: 'Mercenta facilitates UK market access for international brands, directly supporting UK export activity. The General Export Facility is designed for trade-enabling businesses.',
    fitScore: 78, draftStarted: false, submitted: false,
  },
  {
    id: 'grant-003', title: 'Horizon Europe — Cluster 6: Food, Bioeconomy, Natural Resources',
    provider: 'European Commission (UK Associated)', category: 'sustainability', status: 'open',
    amountRange: '€500,000 - €5,000,000',
    eligibility: 'Consortia including UK businesses. Focus on sustainable supply chains, circular economy, and bio-based innovation.',
    deadline: '2027-02-28', sourceUrl: 'https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home',
    fitReason: 'Mercenta\'s supply chain connecting African organic producers to UK retail directly supports sustainable trade and bioeconomy goals.',
    fitScore: 65, draftStarted: false, submitted: false,
  },
  {
    id: 'grant-004', title: 'UKRI Innovate UK — Analysis for Innovators (A4I)',
    provider: 'Innovate UK / UKRI', category: 'r_and_d', status: 'closing_soon',
    amountRange: '£25,000 - £250,000',
    eligibility: 'UK SMEs facing technical challenges requiring expert analysis. Mercenta\'s logistics platform could benefit from R&D support in supply chain optimisation.',
    deadline: '2026-09-01', sourceUrl: 'https://www.ukri.org/opportunity/analysis-for-innovators-a4i/',
    fitReason: 'Mercenta\'s platform involves significant technical challenges in logistics optimisation, demand forecasting, and multi-supplier coordination.',
    fitScore: 72, draftStarted: false, submitted: false,
  },
  {
    id: 'grant-005', title: 'UK Government — Help to Grow: Digital',
    provider: 'UK Government — Department for Business & Trade', category: 'scale_up', status: 'open',
    amountRange: 'Up to £5,000',
    eligibility: 'UK SMEs looking to adopt digital technologies. Covers up to 50% of eligible software costs.',
    deadline: '2026-12-31', sourceUrl: 'https://www.gov.uk/help-to-grow-digital',
    fitReason: 'Mercenta\'s platform is inherently digital, and this grant could offset costs of adopting additional digital tools.',
    fitScore: 55, draftStarted: false, submitted: false,
  },
  {
    id: 'grant-006', title: 'UK Shared Prosperity Fund — Local Business Support',
    provider: 'UK Government — MHCLG', category: 'regional', status: 'closing_soon',
    amountRange: '£10,000 - £100,000',
    eligibility: 'UK businesses based in or serving specific regions. Mercenta\'s Northampton premises may qualify.',
    deadline: '2026-09-30', sourceUrl: 'https://www.gov.uk/government/publications/uk-shared-prosperity-fund-prospectus',
    fitReason: 'Mercenta\'s UK distribution hub creates jobs and economic activity in the region. Regional business support funds help businesses like Mercenta scale.',
    fitScore: 60, draftStarted: false, submitted: false,
  },
];
const MOCK_INVESTORS: InvestorOpportunity[] = [
  { id: 'inv-001', name: 'LocalGlobe', type: 'venture_capital', sectors: ['Technology', 'Logistics', 'Supply Chain', 'Marketplace'], investmentRange: '£500k - £10M', stage: 'seed', ukFocused: true, sourceUrl: 'https://www.localglobe.com/', fitReason: 'Leading London-based VC investing in seed-stage technology companies transforming supply chains. Mercenta\'s wholesale platform fits their thesis of technology-enabled businesses with network effects.', fitScore: 82, draftStarted: false, contacted: false },
  { id: 'inv-002', name: 'Firstminute Capital', type: 'venture_capital', sectors: ['Supply Chain', 'Logistics', 'B2B Marketplace', 'International Trade'], investmentRange: '£500k - £5M', stage: 'seed', ukFocused: true, sourceUrl: 'https://www.firstminute.capital/', fitReason: 'Focus on B2B marketplaces and supply chain technology. Their portfolio includes companies connecting emerging-market suppliers to developed-market buyers.', fitScore: 88, draftStarted: false, contacted: false },
  { id: 'inv-003', name: 'Techstars London Accelerator', type: 'accelerator', sectors: ['Technology', 'Logistics', 'Retail Tech'], investmentRange: '£100k - £120k', stage: 'pre_seed', ukFocused: true, sourceUrl: 'https://www.techstars.com/accelerators/london', fitReason: 'Provides funding, mentorship, and corporate connections. Mercenta\'s logistics-retail crossover is a strong fit for their programme.', fitScore: 75, draftStarted: false, contacted: false },
  { id: 'inv-004', name: 'British Business Bank — Future Fund Breakthrough', type: 'government_fund', sectors: ['Technology', 'Innovation', 'R&D'], investmentRange: '£1M - £10M', stage: 'series_a', ukFocused: true, sourceUrl: 'https://www.british-business-bank.co.uk/future-fund-breakthrough/', fitReason: 'UK government programme supporting innovative, R&D-intensive UK companies. Mercenta\'s technology platform and supply chain innovation qualify.', fitScore: 70, draftStarted: false, contacted: false },
  { id: 'inv-005', name: 'Balderton Capital', type: 'venture_capital', sectors: ['Technology', 'Marketplace', 'Logistics', 'Enterprise'], investmentRange: '£2M - £20M', stage: 'series_a', ukFocused: true, sourceUrl: 'https://www.balderton.com/', fitReason: 'Leading European VC with strong focus on marketplace and enterprise technology. Mercenta\'s B2B marketplace model would be a strong candidate.', fitScore: 68, draftStarted: false, contacted: false },
  { id: 'inv-006', name: 'Novastar Ventures', type: 'venture_capital', sectors: ['Africa', 'Supply Chain', 'Agriculture', 'Logistics'], investmentRange: '£500k - £5M', stage: 'seed', ukFocused: false, sourceUrl: 'https://www.novastarventures.com/', fitReason: 'Invests in businesses connecting Africa to global markets. Mercenta\'s model of sourcing from African producers and distributing to UK retail aligns perfectly.', fitScore: 80, draftStarted: false, contacted: false },
  { id: 'inv-007', name: 'Alexsis Ventures', type: 'angel', sectors: ['Technology', 'International Trade', 'Impact'], investmentRange: '£100k - £500k', stage: 'seed', ukFocused: true, sourceUrl: 'https://alexsisventures.co.uk/', fitReason: 'UK-based angel network focusing on technology businesses with international trade potential. Impact investment lens aligns with Mercenta\'s mission.', fitScore: 73, draftStarted: false, contacted: false },
];

export interface GrantsDataSource {
  readonly mode: 'mock' | 'live';
  fetchGrants(): Promise<GrantOpportunity[]>;
  fetchInvestors(): Promise<InvestorOpportunity[]>;
}

export class MockGrantsDataSource implements GrantsDataSource {
  readonly mode = 'mock' as const;
  async fetchGrants(): Promise<GrantOpportunity[]> { return [...MOCK_GRANTS]; }
  async fetchInvestors(): Promise<InvestorOpportunity[]> { return [...MOCK_INVESTORS]; }
}

export class RealGrantsDataSource implements GrantsDataSource {
  readonly mode = 'live' as const;
  async fetchGrants(): Promise<GrantOpportunity[]> { throw new Error('RealGrantsDataSource requires API integration'); }
  async fetchInvestors(): Promise<InvestorOpportunity[]> { throw new Error('RealGrantsDataSource requires API integration'); }
}

export function createGrantsDataSource(): GrantsDataSource { return new MockGrantsDataSource(); }
