/**
 * §TALENT WORKSPACE — THE VIEW, SHAPED BY WHAT CAA-TalAg ACTUALLY CONTAINS (2026-11-28).
 *
 * The previous version expected CORE records: numeric readiness scores, tiers, PO values,
 * commission rows, outreach write buttons, opportunity-stage mutation, CORE "UK states"
 * and CORE integration statuses. The Talent dataset has NONE of them, so every one of
 * those columns was either fabricated or a cross-vertical read. The owner's decisions:
 *
 *   · readiness = `verification.unknownFields` empty → ready; otherwise "N fields unresolved"
 *   · image = the single `image` field → "Image present" / "No image"
 *   · trackLabel = `TalentProfileRecord.roleSummary`
 *   · rights = `relationshipType` + `ukDistributionRightsConfirmed`, one read-only badge,
 *     NEVER labelled "contract status"
 *   · contactPhone = "—" (no phone field exists in the dataset)
 *   · no PO value column, no commission section, no outreach/stage writes, no CORE panels
 *
 * Mapping table: `docs/TALENT_WORKSPACE_FIELD_MAPPING.md`.
 */
import { NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';
import {
  ConsoleTable,
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  PageHeader,
  type ConsoleColumn,
  type MetricItem,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';

export type TalentWorkspaceSection =
  | 'dashboard'
  | 'profile'
  | 'brands'
  | 'uk-opportunities'
  | 'acquisition'
  | 'brand-stores'
  | 'concepts'
  | 'development'
  | 'collections'
  | 'assets'
  | 'royalties'
  | 'settings';

export interface TalentRightsHolderRow {
  id: string;
  businessName: string;
  category: string;
  nation: string;
  /** `TalentProfileRecord.roleSummary` — the owner's chosen label. */
  trackLabel: string;
  /** relationshipType + ukDistributionRightsConfirmed, read-only, never "contract status". */
  rightsBadge: string;
  rightsTone: SemanticTone;
  /** No phone field exists in the dataset: rendered as "—". */
  contactPhone: string;
  /** Count of this brand's `DiscoveredProduct` rows. */
  productCount: number;
}

export interface TalentProductReadinessRow {
  id: string;
  brandName: string;
  sku: string;
  name: string;
  /** `verification.unknownFields.length === 0`. */
  ready: boolean;
  unknownFieldCount: number;
  /** The dataset holds ONE image per product. */
  imagePresent: boolean;
}

export interface TalentProspectRow {
  id: string;
  brand: string;
  category: string;
  /** `BrandRecord.ukWholesaleRouteStatus`. */
  ukRoute: string;
  /** The source's own verification confidence and date — never a computed score. */
  verification: string;
  description: string;
}

export interface TalentUkOpportunityRow {
  id: string;
  brand: string;
  opportunityType: string;
  amazonUkPresence: string;
  ukDtcPresence: string;
  distributorPresent: boolean;
  gapSummary: string;
}

export interface TalentWorkspaceProfile {
  name: string;
  vertical: string;
  primaryMarket: string;
  caaStatus: string;
  discoveryStatus: string;
  roleSummary: string;
  portfolioSummary: string;
}

export interface TalentWorkspaceViewProps {
  section: TalentWorkspaceSection;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  metrics: MetricItem[];
  profile: TalentWorkspaceProfile | null;
  rightsHolders: TalentRightsHolderRow[];
  productReadiness: TalentProductReadinessRow[];
  prospects: TalentProspectRow[];
  ukOpportunities: TalentUkOpportunityRow[];
  onNavigateView: (viewId: string) => void;
}

const SECTION_COPY: Record<TalentWorkspaceSection, { title: string; description: string }> = {
  dashboard: {
    title: 'Talent Commerce',
    description:
      'The CAA-TalAg dataset: the talent roster, the brands they work with, the products discovered for those brands, and the UK market assessment for each brand.',
  },
  profile: {
    title: 'Talent Profile',
    description: 'The roster record as the CAA-TalAg dataset publishes it.',
  },
  brands: {
    title: 'Brands & Rights',
    description:
      'Each brand the talent is linked to, its relationship type and its confirmed UK distribution rights. One combined read-only badge; the dataset holds no contract terms.',
  },
  'uk-opportunities': {
    title: 'UK Opportunities',
    description:
      'The UK assessment recorded per brand: Amazon UK presence, DTC presence, whether a distributor was detected, and the estimated gap.',
  },
  acquisition: {
    title: 'Acquisition',
    description:
      "Brands with their UK wholesale route status and the source's own verification confidence. No score, tier or stage is computed here.",
  },
  'brand-stores': { title: 'Brand Stores', description: 'Not part of the CAA-TalAg dataset.' },
  concepts: { title: 'Concepts', description: 'Not part of the CAA-TalAg dataset.' },
  development: { title: 'Development', description: 'Not part of the CAA-TalAg dataset.' },
  collections: { title: 'Collections', description: 'Not part of the CAA-TalAg dataset.' },
  assets: { title: 'Assets', description: 'Not part of the CAA-TalAg dataset.' },
  royalties: { title: 'Royalties', description: 'Not part of the CAA-TalAg dataset.' },
  settings: {
    title: 'Settings',
    description: 'Workspace settings are not part of the CAA-TalAg dataset.',
  },
};

const NOT_IN_DATASET: TalentWorkspaceSection[] = [
  'brand-stores',
  'concepts',
  'development',
  'collections',
  'assets',
  'royalties',
];

const rightsColumns: ConsoleColumn<TalentRightsHolderRow>[] = [
  {
    key: 'businessName',
    header: 'Brand',
    render: (r) => (
      <div>
        <div className="font-medium text-ink-950">{r.businessName}</div>
        <div className="text-[12px] text-faint">{r.category}</div>
      </div>
    ),
  },
  {
    key: 'trackLabel',
    header: 'Talent Role',
    render: (r) => <span className="text-[12px] text-secondary">{r.trackLabel}</span>,
  },
  {
    key: 'nation',
    header: 'Origin',
    render: (r) => <span className="text-[12px] text-secondary">{r.nation}</span>,
  },
  {
    key: 'rights',
    header: 'Relationship & UK Rights (read-only)',
    render: (r) => <InlineStatus label={r.rightsBadge} tone={r.rightsTone} />,
  },
  {
    key: 'phone',
    header: 'Phone',
    render: (r) => (
      <span className="text-[12px] text-faint" title="The CAA-TalAg dataset holds no phone field.">
        {r.contactPhone}
      </span>
    ),
  },
  {
    key: 'products',
    header: 'Products',
    align: 'right',
    render: (r) => <span className="font-mono tabular-nums">{r.productCount}</span>,
  },
];

const readinessColumns: ConsoleColumn<TalentProductReadinessRow>[] = [
  {
    key: 'product',
    header: 'Product',
    render: (r) => (
      <div>
        <div className="font-medium text-ink-950">{r.name}</div>
        <div className="text-[12px] text-faint">
          {r.brandName}
          {r.sku ? ` · ${r.sku}` : ''}
        </div>
      </div>
    ),
  },
  {
    key: 'ready',
    header: 'Verification',
    render: (r) => (
      <InlineStatus
        label={
          r.ready
            ? 'All fields verified'
            : `${r.unknownFieldCount} field${r.unknownFieldCount === 1 ? '' : 's'} unresolved`
        }
        tone={r.ready ? 'success' : 'warning'}
      />
    ),
  },
  {
    key: 'image',
    header: 'Image',
    render: (r) => (
      <span className="text-[12px] text-secondary">{r.imagePresent ? 'Image present' : 'No image'}</span>
    ),
  },
];

const prospectColumns: ConsoleColumn<TalentProspectRow>[] = [
  {
    key: 'brand',
    header: 'Brand',
    render: (r) => (
      <div>
        <div className="font-medium text-ink-950">{r.brand}</div>
        <div className="text-[12px] text-faint">{r.category}</div>
      </div>
    ),
  },
  {
    key: 'ukRoute',
    header: 'UK Wholesale Route',
    render: (r) => <span className="text-[12px] text-secondary">{r.ukRoute}</span>,
  },
  {
    key: 'verification',
    header: 'Source Verification',
    render: (r) => <span className="text-[12px] text-secondary">{r.verification}</span>,
  },
  {
    key: 'description',
    header: 'Source Description',
    hideOnMobile: true,
    render: (r) => <span className="text-[12px] text-ink-600">{r.description}</span>,
  },
];

const ukColumns: ConsoleColumn<TalentUkOpportunityRow>[] = [
  { key: 'brand', header: 'Brand', render: (r) => <span className="font-medium text-ink-950">{r.brand}</span> },
  { key: 'type', header: 'Opportunity', render: (r) => <span className="text-[12px] text-secondary">{r.opportunityType}</span> },
  { key: 'amazon', header: 'Amazon UK', render: (r) => <span className="text-[12px] text-secondary">{r.amazonUkPresence}</span> },
  { key: 'dtc', header: 'UK DTC', render: (r) => <span className="text-[12px] text-secondary">{r.ukDtcPresence}</span> },
  {
    key: 'distributor',
    header: 'Distributor Detected',
    render: (r) => <span className="text-[12px] text-secondary">{r.distributorPresent ? 'Yes' : 'No'}</span>,
  },
  {
    key: 'gap',
    header: 'Estimated Gap',
    hideOnMobile: true,
    render: (r) => <span className="text-[12px] text-ink-600">{r.gapSummary}</span>,
  },
];

export function TalentWorkspaceView({
  section,
  loading,
  error,
  onRetry,
  metrics,
  profile,
  rightsHolders,
  productReadiness,
  prospects,
  ukOpportunities,
}: TalentWorkspaceViewProps) {
  const copy = SECTION_COPY[section];

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        meta={<span>Talent Commerce · CAA-TalAg dataset</span>}
      />

      <NoticeBanner
        tone="info"
        title="CAA-TalAg dataset — shown as published"
        message="Talents, brands, relationships, discovered products and UK assessments come from the CAA-TalAg dataset. A field it does not contain is shown as an em dash (—) and is never defaulted or estimated."
      />

      {loading ? (
        <LoadingRows rows={6} />
      ) : error ? (
        <ErrorStateBlock message={error} onRetry={onRetry} />
      ) : NOT_IN_DATASET.includes(section) ? (
        <SectionCard title={copy.title} description={copy.description}>
          <div className="border border-hairline rounded-md p-4 text-[13px] text-ink-600">
            {copy.title} is not part of the CAA-TalAg dataset. Nothing is shown here rather than
            inventing records.
          </div>
        </SectionCard>
      ) : (
        <>
          <MetricStrip items={metrics} columns={4} />

          {section === 'dashboard' && (
            <SectionCard
              title="Product Readiness"
              description="Readiness is the source's own field: a product is ready when its verification lists no unresolved fields."
            >
              <ConsoleTable
                rows={productReadiness}
                columns={readinessColumns}
                rowKey={(r) => r.id}
                emptyTitle="No discovered products"
                emptyDescription="The CAA-TalAg dataset contains no discovered products to verify."
              />
            </SectionCard>
          )}

          {section === 'profile' && (
            <SectionCard title="Roster record" description="As published by CAA-TalAg.">
              {!profile ? (
                <EmptyStateBlock
                  title="No talent record"
                  description="The dataset contains no talent profile."
                />
              ) : (
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
                  {[
                    ['Name', profile.name],
                    ['Vertical', profile.vertical],
                    ['Primary market', profile.primaryMarket],
                    ['CAA status', profile.caaStatus],
                    ['Discovery status', profile.discoveryStatus],
                    ['Role summary', profile.roleSummary],
                    ['Portfolio summary', profile.portfolioSummary],
                  ].map(([label, value]) => (
                    <div key={label} className="border border-hairline rounded-md p-3">
                      <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">
                        {label}
                      </dt>
                      <dd className="text-ink-900 mt-0.5">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </SectionCard>
          )}

          {section === 'brands' && (
            <SectionCard
              title="Brands & rights"
              description="The dataset records a relationship type and whether UK distribution rights are confirmed. It holds no contract terms, so no contract status is shown."
            >
              <ConsoleTable
                rows={rightsHolders}
                columns={rightsColumns}
                rowKey={(r) => r.id}
                emptyTitle="No brands"
                emptyDescription="The dataset contains no brands linked to this talent."
              />
            </SectionCard>
          )}

          {section === 'uk-opportunities' && (
            <SectionCard title="UK assessments" description="Recorded per brand in the source.">
              <ConsoleTable
                rows={ukOpportunities}
                columns={ukColumns}
                rowKey={(r) => r.id}
                emptyTitle="No UK assessments"
                emptyDescription="The dataset contains no UK market assessment."
              />
            </SectionCard>
          )}

          {section === 'acquisition' && (
            <SectionCard
              title="Brands by UK route"
              description="Source verification is the dataset's own confidence, not a computed score."
            >
              <ConsoleTable
                rows={prospects}
                columns={prospectColumns}
                rowKey={(r) => r.id}
                emptyTitle="No brands"
                emptyDescription="The dataset contains no brands."
              />
            </SectionCard>
          )}

          {section === 'settings' && (
            <SectionCard title="Settings" description={copy.description}>
              <div className="border border-hairline rounded-md p-4 text-[13px] text-ink-600">
                Workspace settings are not part of the CAA-TalAg dataset.
              </div>
            </SectionCard>
          )}
        </>
      )}
    </div>
  );
}