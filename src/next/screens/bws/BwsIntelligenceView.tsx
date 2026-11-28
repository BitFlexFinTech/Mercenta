import { useMemo, useState } from 'react';
import {
  ConsoleBarChart,
  ConsoleProgressTrack,
  NoticeBanner,
  SectionCard,
  formatGbp,
} from '@/next/components/ConsoleCharts';
import {
  ConsoleTable,
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  PageHeader,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';

export type BwsIntelligenceSection =
  | 'overview'
  | 'country-discovery'
  | 'brand-discovery'
  | 'brand-intelligence'
  | 'uk-distribution'
  | 'amazon-uk'
  | 'pitch-targets'
  | 'opportunity-assessment'
  | 'acquisition-pipeline';

export interface BwsCountrySummaryRow {
  regionKey: string;
  label: string;
  brandCount: number;
  productCount: number;
  leadCount: number;
  openPoValueGbp: number;
}

export interface BwsCategoryBenchmarkRow {
  category: string;
  tamLabel: string;
  samLabel: string;
  sharePct: number;
  rationale: string;
}

export interface BwsProspectRow {
  id: string;
  brand: string;
  category: string;
  website?: string;
  whyInteresting: string;
  totalScore: number;
  tier: string;
  tierLabel: string;
  offerSummary: string;
  rawOfferClass: string;
  ukPresence: boolean;
  disqualified: boolean;
  disqualificationReason?: string;
  leadDistributor: string;
  leadContact: string;
  wholesaleAvailable: boolean;
  distributorProgramme: boolean;
  outreachStatus: string;
  acquisitionStage: string;
  canPrepareOutreach: boolean;
  canApproveOutreach: boolean;
  canSendOutreach: boolean;
  canSimulateResponse: boolean;
  canCreateOpportunity: boolean;
  opportunityId?: string;
  opportunityStage?: string;
  asins: {
    asin: string;
    title: string;
    offerClass: string;
    price: number;
    rating: number;
    reviewCount: number;
    estimatedRevenue?: number;
  }[];
  contacts: {
    name: string;
    jobTitle: string;
    company: string;
    email?: string;
    emailConfidence?: string;
  }[];
  distributors: {
    company: string;
    territory: string;
    exclusive: boolean;
    suggestedApproach?: string;
  }[];
}

export interface BwsOpportunityStateRow {
  stateId: string;
  label: string;
  evidenceSource: string;
  available: boolean;
  reason: string;
}

export interface BwsIntelligenceViewProps {
  section: BwsIntelligenceSection;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  canMutate: boolean;
  metrics: MetricItem[];
  countryRows: BwsCountrySummaryRow[];
  categoryBenchmarks: BwsCategoryBenchmarkRow[];
  opportunityStates: BwsOpportunityStateRow[];
  prospects: BwsProspectRow[];
  selectedProspect: BwsProspectRow | null;
  onSelectProspect: (id: string | null) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  tierFilter: string;
  onTierFilterChange: (t: string) => void;
  runningDiscovery: boolean;
  statusMessage: string | null;
  onRunDiscovery: () => void;
  onNavigateSection: (viewId: string) => void;
  onOutreachAction: (
    prospectId: string,
    action: 'prepare' | 'approve' | 'send' | 'simulate_response' | 'create_opportunity'
  ) => void;
  onSetOpportunityStage: (opportunityId: string, stage: string) => void;
}

const SECTION_COPY: Record<
  BwsIntelligenceSection,
  { title: string; description: string }
> = {
  overview: {
    title: 'BWS Executive Intelligence Overview',
    description:
      'International wholesale market readiness, origin coverage, prospect scoring, and acquisition status backed by canonical Mercenta stores.',
  },
  'country-discovery': {
    title: 'Country Discovery',
    description:
      'Sourcing origin and regional footprint aggregated from Mercenta brands, leads, and UK category TAM/SAM benchmarks.',
  },
  'brand-discovery': {
    title: 'Brand Discovery',
    description:
      'Discovered supplier universe ranked by composite score, distribution openness, and UK wholesale readiness.',
  },
  'brand-intelligence': {
    title: 'Brand Intelligence Dossiers',
    description:
      'Deep commercial dossiers combining ASIN offer classes, decision-maker contacts, and distributor arrangements.',
  },
  'uk-distribution': {
    title: 'UK Distribution Research',
    description:
      'Audit of existing UK distributors, exclusivity flags, wholesale programme status, and suggested channel approaches.',
  },
  'amazon-uk': {
    title: 'Amazon UK 1P Research',
    description:
      'ASIN-level UK retail offer classification, pricing, ratings, and observed seller pressure across tracked brands.',
  },
  'pitch-targets': {
    title: '1P Pitch Targets',
    description:
      'Brands lacking a direct Amazon retail offer (3P-only or absent) prioritised for Vendor Central UK outreach.',
  },
  'opportunity-assessment': {
    title: 'Opportunity Assessment',
    description:
      'Multi-factor qualification matrix comparing Amazon demand, UK channel openness, and Mercenta fit.',
  },
  'acquisition-pipeline': {
    title: 'Acquisition Pipeline',
    description:
      'End-to-end outreach drafting, operator approval, response logging, and commercial opportunity progression.',
  },
};

function tierTone(tier: string): SemanticTone {
  if (tier === 'tier_1') return 'success';
  if (tier === 'tier_2') return 'info';
  if (tier === 'tier_3') return 'warning';
  return 'neutral';
}

export function BwsIntelligenceView({
  section,
  loading,
  error,
  onRetry,
  canMutate,
  metrics,
  countryRows,
  categoryBenchmarks,
  opportunityStates,
  prospects,
  selectedProspect,
  onSelectProspect,
  searchQuery,
  onSearchQueryChange,
  tierFilter,
  onTierFilterChange,
  runningDiscovery,
  statusMessage,
  onRunDiscovery,
  onNavigateSection,
  onOutreachAction,
  onSetOpportunityStage,
}: BwsIntelligenceViewProps) {
  const [stageTarget, setStageTarget] = useState('qualified');
  const copy = SECTION_COPY[section];

  const scopedProspects = useMemo(() => {
    let rows = prospects;
    if (section === 'pitch-targets') {
      rows = rows.filter(
        (p) =>
          !p.disqualified &&
          p.rawOfferClass !== 'DIRECT_AMAZON_RETAIL'
      );
    } else if (section === 'uk-distribution') {
      rows = rows.filter((p) => !p.disqualified);
    } else if (section === 'amazon-uk') {
      rows = rows.filter((p) => p.asins.length > 0);
    } else if (section === 'opportunity-assessment') {
      rows = rows.filter((p) => !p.disqualified).sort((a, b) => b.totalScore - a.totalScore);
    }
    return rows;
  }, [prospects, section]);

  const columns: ConsoleColumn<BwsProspectRow>[] = [
    {
      key: 'brand',
      header: 'Brand',
      render: (r) => (
        <div>
          <div className="font-medium text-zinc-950">{r.brand}</div>
          <div className="text-[12px] text-zinc-500">{r.category}</div>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Tier / Score',
      render: (r) => (
        <div className="flex items-center gap-2">
          <InlineStatus label={r.tierLabel} tone={tierTone(r.tier)} />
          <span className="font-mono text-[12px] tabular-nums text-zinc-600">{r.totalScore}</span>
        </div>
      ),
    },
    {
      key: 'offer',
      header: section === 'uk-distribution' ? 'UK Distributor / Wholesale' : 'UK Channel Status',
      render: (r) =>
        section === 'uk-distribution' ? (
          <div className="text-[12px]">
            <div className="text-zinc-900">{r.leadDistributor}</div>
            <div className="text-zinc-500">
              {r.wholesaleAvailable ? 'Wholesale open' : 'No stated wholesale'} ·{' '}
              {r.distributorProgramme ? 'Distributor prog.' : 'Direct review'}
            </div>
          </div>
        ) : (
          <div className="text-[12px]">
            <div className="text-zinc-900">{r.offerSummary}</div>
            <div className="text-zinc-500">
              {r.asins.length} ASIN{r.asins.length === 1 ? '' : 's'} ·{' '}
              {r.ukPresence ? 'UK footprint' : 'No UK footprint'}
            </div>
          </div>
        ),
    },
    {
      key: 'stage',
      header: 'Acquisition Stage',
      render: (r) => (
        <span className="font-mono text-[12px] text-zinc-700">
          {r.opportunityStage ? r.opportunityStage.replace(/_/g, ' ') : r.acquisitionStage}
        </span>
      ),
    },
    {
      key: 'contact',
      header: 'Primary Contact',
      hideOnMobile: true,
      render: (r) => <span className="text-[12px] text-zinc-600">{r.leadContact}</span>,
    },
  ];

  const countryColumns: ConsoleColumn<BwsCountrySummaryRow>[] = [
    {
      key: 'label',
      header: 'Origin / Region',
      render: (r) => <span className="font-medium text-zinc-950">{r.label}</span>,
    },
    {
      key: 'brands',
      header: 'Active Brands',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{r.brandCount}</span>,
    },
    {
      key: 'products',
      header: 'Listed SKUs',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{r.productCount}</span>,
    },
    {
      key: 'leads',
      header: 'Sourcing Leads',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{r.leadCount}</span>,
    },
    {
      key: 'poVal',
      header: 'PO Volume',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{formatGbp(r.openPoValueGbp)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        meta={<span>BWS Workspace · Backed by canonical Mercenta Brand, Prospect &amp; Acquisition stores</span>}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {(section === 'overview' || section === 'brand-discovery' || section === 'brand-intelligence') && (
              <button
                type="button"
                disabled={runningDiscovery || !canMutate}
                onClick={onRunDiscovery}
                className="px-3.5 py-2 rounded-md bg-[var(--mr-accent)] text-white text-[12px] font-medium hover:bg-[var(--mr-accent-600)] disabled:opacity-50"
              >
                {runningDiscovery ? 'Running scan…' : 'Run Intelligence Scan'}
              </button>
            )}
            {section === 'overview' && (
              <button
                type="button"
                onClick={() => onNavigateSection('campaign-studio')}
                className="px-3.5 py-2 rounded-md border border-zinc-300 bg-white text-[12px] font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Open Campaign Studio
              </button>
            )}
          </div>
        }
      />

      <NoticeBanner
        tone="warning"
        title="BWS alcohol schema attributes not yet present in Mercenta canonical types"
        message="Showing canonical Mercenta brands, prospects, and acquisition records. Alcohol-specific attributes from Dash-1 (ABV%, AWRS registration number, UK excise duty band, drink-category filter, and wet-bond storage indicators) plus Brand.vertical isolation are omitted until backend fields are added."
      />

      {statusMessage && <NoticeBanner tone="info" message={statusMessage} />}

      {loading ? (
        <LoadingRows rows={6} />
      ) : error ? (
        <ErrorStateBlock message={error} onRetry={onRetry} />
      ) : (
        <>
          <MetricStrip items={metrics} columns={4} />

          {section === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard
                title="Prospect Score Distribution (Top Ranked)"
                description="Composite readiness score out of 100 across tracked brands."
              >
                <ConsoleBarChart
                  data={prospects.slice(0, 6).map((p) => ({
                    label: p.brand.split(' ')[0] ?? p.brand,
                    value: p.totalScore,
                    hint: `${p.brand}: ${p.totalScore}/100 (${p.tierLabel})`,
                  }))}
                  formatValue={(v) => `${v} pts`}
                />
              </SectionCard>

              <SectionCard
                title="UK Opportunity State Coverage"
                description="Live UK channel states derived from verified Mercenta evidence sources."
              >
                <div className="space-y-3">
                  {opportunityStates.map((st) => (
                    <div key={st.stateId} className="space-y-1 border-b border-zinc-100 pb-2 last:border-b-0">
                      <div className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="font-medium text-zinc-900">{st.label}</span>
                        <InlineStatus
                          label={st.available ? 'Evidence active' : 'Unasserted (no provider)'}
                          tone={st.available ? 'success' : 'neutral'}
                        />
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        Evidence source: {st.evidenceSource}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {section === 'country-discovery' ? (
            <div className="space-y-6">
              <SectionCard
                title="Sourcing Nations &amp; Lead Regions"
                description="Aggregated directly from DemoBrandRow.nation, Lead.region, and PurchaseOrder records."
              >
                <ConsoleTable
                  rows={countryRows}
                  columns={countryColumns}
                  rowKey={(r) => r.regionKey}
                  emptyTitle="No origin records found"
                  emptyDescription="No brand nations or lead regions are recorded in the canonical stores."
                />
              </SectionCard>

              <SectionCard
                title="UK Category TAM / SAM Reference Benchmarks"
                description="Canonical market-sizing estimates from src/lib/market-data/tamSamPipeline.ts."
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryBenchmarks.map((b) => (
                    <div key={b.category} className="border border-zinc-200 rounded-md p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-zinc-950 text-[14px]">{b.category}</span>
                        <span className="font-mono text-[12px] text-[var(--mr-accent)]">
                          SAM share: {b.sharePct}%
                        </span>
                      </div>
                      <div className="text-[12px] font-mono text-zinc-600">
                        TAM: {b.tamLabel} · SAM: {b.samLabel}
                      </div>
                      <p className="text-[12px] text-zinc-600">{b.rationale}</p>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder="Filter by brand or category…"
                  aria-label="Filter BWS prospects"
                  className="px-3 py-1.5 rounded-md border border-zinc-300 bg-white text-[14px] w-full sm:w-72"
                />
                <select
                  aria-label="Filter by qualification tier"
                  value={tierFilter}
                  onChange={(e) => onTierFilterChange(e.target.value)}
                  className="px-3 py-1.5 rounded-md border border-zinc-300 bg-white text-[14px]"
                >
                  <option value="">All score tiers</option>
                  <option value="tier_1">Tier 1 · Attack Now</option>
                  <option value="tier_2">Tier 2 · High Prob</option>
                  <option value="tier_3">Tier 3 · Upside</option>
                  <option value="tier_4">Tier 4 · Reserve</option>
                </select>
              </div>

              {scopedProspects.length === 0 ? (
                <EmptyStateBlock
                  title="No matching records for this view"
                  description="Clear the search filter or run a Brand Intelligence scan to populate prospects."
                  actionLabel={searchQuery || tierFilter ? 'Clear filters' : undefined}
                  onAction={
                    searchQuery || tierFilter
                      ? () => {
                          onSearchQueryChange('');
                          onTierFilterChange('');
                        }
                      : undefined
                  }
                />
              ) : (
                <ConsoleTable
                  rows={scopedProspects}
                  columns={columns}
                  rowKey={(r) => r.id}
                  selectedKey={selectedProspect?.id}
                  onRowClick={(r) => onSelectProspect(r.id)}
                />
              )}
            </div>
          )}
        </>
      )}

      <SlideOverDrawer
        open={Boolean(selectedProspect)}
        onClose={() => onSelectProspect(null)}
        title={selectedProspect?.brand ?? 'Brand Dossier'}
        subtitle={
          selectedProspect
            ? `${selectedProspect.category} · Score ${selectedProspect.totalScore}/100 (${selectedProspect.tierLabel})`
            : undefined
        }
      >
        {selectedProspect && (
          <div className="space-y-5 text-[14px]">
            <div className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-[0.06em] text-zinc-500">
                Commercial Thesis
              </div>
              <p className="text-zinc-800">{selectedProspect.whyInteresting}</p>
              {selectedProspect.website && (
                <div className="text-[12px] font-mono text-zinc-500">{selectedProspect.website}</div>
              )}
            </div>

            <div className="border-t border-zinc-200 pt-4 space-y-2">
              <div className="text-[11px] uppercase tracking-[0.06em] text-zinc-500">
                Outreach &amp; Acquisition Lifecycle
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                <InlineStatus
                  label={`Stage: ${selectedProspect.opportunityStage ?? selectedProspect.acquisitionStage}`}
                  tone="info"
                />
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedProspect.canPrepareOutreach && (
                  <button
                    type="button"
                    disabled={!canMutate}
                    onClick={() => onOutreachAction(selectedProspect.id, 'prepare')}
                    className="px-3 py-1.5 rounded border border-zinc-300 bg-white text-[12px] font-medium hover:bg-zinc-50 disabled:opacity-40"
                  >
                    Prepare Outreach
                  </button>
                )}
                {selectedProspect.canApproveOutreach && (
                  <button
                    type="button"
                    disabled={!canMutate}
                    onClick={() => onOutreachAction(selectedProspect.id, 'approve')}
                    className="px-3 py-1.5 rounded bg-zinc-900 text-white text-[12px] font-medium disabled:opacity-40"
                  >
                    Approve Draft
                  </button>
                )}
                {selectedProspect.canSendOutreach && (
                  <button
                    type="button"
                    disabled={!canMutate}
                    onClick={() => onOutreachAction(selectedProspect.id, 'send')}
                    className="px-3 py-1.5 rounded bg-[var(--mr-accent)] text-white text-[12px] font-medium disabled:opacity-40"
                  >
                    Send Outreach
                  </button>
                )}
                {selectedProspect.canSimulateResponse && (
                  <button
                    type="button"
                    disabled={!canMutate}
                    onClick={() => onOutreachAction(selectedProspect.id, 'simulate_response')}
                    className="px-3 py-1.5 rounded border border-zinc-300 bg-white text-[12px] font-medium hover:bg-zinc-50 disabled:opacity-40"
                  >
                    Log Reply (Sim)
                  </button>
                )}
                {selectedProspect.canCreateOpportunity && (
                  <button
                    type="button"
                    disabled={!canMutate}
                    onClick={() => onOutreachAction(selectedProspect.id, 'create_opportunity')}
                    className="px-3 py-1.5 rounded bg-zinc-900 text-white text-[12px] font-medium disabled:opacity-40"
                  >
                    Promote to Opportunity
                  </button>
                )}
              </div>

              {selectedProspect.opportunityId && (
                <div className="flex items-center gap-2 pt-2">
                  <select
                    aria-label="Update opportunity stage"
                    value={stageTarget}
                    onChange={(e) => setStageTarget(e.target.value)}
                    className="px-2.5 py-1 rounded border border-zinc-300 bg-white text-[12px]"
                  >
                    <option value="qualified">Qualified</option>
                    <option value="meeting_booked">Meeting Booked</option>
                    <option value="proposal_sent">Proposal Sent</option>
                    <option value="won">Won</option>
                  </select>
                  <button
                    type="button"
                    disabled={!canMutate}
                    onClick={() =>
                      onSetOpportunityStage(selectedProspect.opportunityId!, stageTarget)
                    }
                    className="px-3 py-1 rounded border border-zinc-300 bg-white text-[12px] font-medium hover:bg-zinc-50 disabled:opacity-40"
                  >
                    Set Stage
                  </button>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-200 pt-4 space-y-2">
              <div className="text-[11px] uppercase tracking-[0.06em] text-zinc-500">
                Observed Amazon UK ASINs ({selectedProspect.asins.length})
              </div>
              {selectedProspect.asins.length === 0 ? (
                <p className="text-[12px] text-zinc-500">No ASIN snapshots attached.</p>
              ) : (
                <div className="space-y-2">
                  {selectedProspect.asins.map((a) => (
                    <div
                      key={a.asin}
                      className="border border-zinc-200 rounded p-2.5 text-[12px] space-y-1"
                    >
                      <div className="font-medium text-zinc-950">{a.title}</div>
                      <div className="flex flex-wrap gap-x-3 text-zinc-600 font-mono">
                        <span>{a.asin}</span>
                        <span>{a.offerClass.replace(/_/g, ' ')}</span>
                        <span>{formatGbp(a.price, 2)}</span>
                        {typeof a.estimatedRevenue === 'number' && (
                          <span>Est. {formatGbp(a.estimatedRevenue)}/mo</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-zinc-200 pt-4 space-y-2">
              <div className="text-[11px] uppercase tracking-[0.06em] text-zinc-500">
                UK Distributors ({selectedProspect.distributors.length})
              </div>
              {selectedProspect.distributors.length === 0 ? (
                <p className="text-[12px] text-zinc-500">No third-party UK distributor recorded.</p>
              ) : (
                selectedProspect.distributors.map((d, i) => (
                  <div key={`${d.company}-${i}`} className="border border-zinc-200 rounded p-2.5 text-[12px]">
                    <div className="font-medium text-zinc-950">
                      {d.company} ({d.territory}) {d.exclusive ? '· Exclusive' : ''}
                    </div>
                    <div className="text-zinc-600 mt-0.5">{d.suggestedApproach}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
