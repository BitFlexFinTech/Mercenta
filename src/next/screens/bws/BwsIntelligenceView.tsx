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
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';
import { ConsolePageHeader } from '@/next/components/ConsolePageHeader';

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

/**
 * §BWS INTELLIGENCE ROW MODELS (approved 2026-11-28).
 *
 * These used to carry CORE-lead fields (`totalScore`, `tier`, `offerSummary`, `asins[]`,
 * five `can*Outreach` flags, per-country product/lead/PO counts). The Dash-1 source has
 * NONE of those, so filling them would have printed fabricated numbers — exactly what D6
 * forbids. The models now contain ONLY what the source holds, plus text indicators.
 */
export interface BwsCountrySummaryRow {
  regionKey: string;
  label: string;
  /** `COUNTRIES.brandsDiscoveredCount` — a real source figure. */
  brandCount: number;
  /** `COUNTRIES.categories[]` (DrinkCategory). */
  categories: string[];
  /** `COUNTRIES.ukPresenceIndicator` — text, e.g. "Selective Presence". */
  ukPresenceIndicator: string;
  /** `COUNTRIES.commercialOpportunityIndicator` — text, e.g. "Primary Focus". */
  commercialOpportunityIndicator: string;
  featuredProducerCount: number;
  evidenceCount: number;
}

/** One brand's read-only outreach entry, from `INITIAL_OUTREACH_LOGS` (keyed by brandId). */
export interface BwsOutreachLogRow {
  outreachStatus: string;
  contactPerson: string;
  contactRole: string;
  contactEmail: string;
  lastContacted: string;
  nextFollowUp: string;
  discussionNotes: string;
}

export interface BwsProspectRow {
  id: string;
  brand: string;
  category: string;
  website?: string;
  /** `BRANDS.description` — the source's own wording. */
  description: string;
  /** `BRANDS.ownershipVerification` — text, replaces the old fabricated score/tier. */
  ownershipVerification: string;
  /** `BRANDS.licensingArrangement` — text. */
  licensingArrangement: string;
  /** `COUNTRIES.ukPresenceIndicator` for this brand's country, when known. */
  ukPresenceIndicator: string;
  /** `COUNTRIES.commercialOpportunityIndicator` for this brand's country, when known. */
  commercialOpportunityIndicator: string;
  /** `AMAZON_UK_LISTINGS` count for this brand (a per-brand ASIN, never a fabricated list). */
  asinCount: number;
  /** `INITIAL_OUTREACH_LOGS[brandId]` — READ ONLY (D8). */
  outreach: BwsOutreachLogRow | null;
  /** `OPPORTUNITY_ASSESSMENTS.status` — READ ONLY badge (D9). */
  opportunityStatus: string | null;
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
  prospects: BwsProspectRow[];
  selectedProspect: BwsProspectRow | null;
  onSelectProspect: (id: string | null) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  outreachFilter: string;
  onOutreachFilterChange: (v: string) => void;
  onNavigateSection: (viewId: string) => void;
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
  prospects,
  selectedProspect,
  onSelectProspect,
  searchQuery,
  onSearchQueryChange,
  outreachFilter,
  onOutreachFilterChange,
  onNavigateSection,
}: BwsIntelligenceViewProps) {
  const copy = SECTION_COPY[section];

  /**
   * §D6/D7/D8 (2026-11-28): the old filters keyed off CORE lead fields (`disqualified`,
   * `rawOfferClass`, `asins[]`) and sorted by a CORE score. None of those exist in Dash-1,
   * so the filters now use only source fields — and nothing is ranked by a number.
   */
  const scopedProspects = useMemo(() => {
    let rows = prospects;
    if (section === 'amazon-uk') {
      rows = rows.filter((p) => p.asinCount > 0);
    } else if (section === 'opportunity-assessment') {
      rows = rows.filter((p) => p.opportunityStatus !== null);
    }
    if (outreachFilter === 'with') rows = rows.filter((p) => p.outreach !== null);
    else if (outreachFilter === 'without') rows = rows.filter((p) => p.outreach === null);
    return rows;
  }, [prospects, section, outreachFilter]);

  const opportunityDistribution = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of prospects) {
      const k = p.commercialOpportunityIndicator || '—';
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [prospects]);

  const coverage = useMemo(
    () => [
      { label: 'Brands in dataset', value: prospects.length },
      { label: 'Origin regions', value: countryRows.length },
      { label: 'Brands with an outreach log', value: prospects.filter((p) => p.outreach).length },
      { label: 'Brands with an opportunity assessment', value: prospects.filter((p) => p.opportunityStatus !== null).length },
      { label: 'Brands with Amazon UK ASINs', value: prospects.filter((p) => p.asinCount > 0).length },
    ],
    [prospects, countryRows]
  );

  const columns: ConsoleColumn<BwsProspectRow>[] = [
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
      key: 'verification',
      header: 'Ownership Verification',
      render: (r) => <span className="text-[12px] text-secondary">{r.ownershipVerification}</span>,
    },
    {
      key: 'ukPresence',
      header: 'UK Presence',
      render: (r) => <span className="text-[12px] text-secondary">{r.ukPresenceIndicator}</span>,
    },
    {
      key: 'opportunity',
      header: 'Commercial Opportunity',
      render: (r) => (
        <span className="text-[12px] text-secondary">{r.commercialOpportunityIndicator}</span>
      ),
    },
    {
      key: 'asins',
      header: 'Amazon UK ASINs',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums text-secondary">{r.asinCount}</span>,
    },
    {
      key: 'outreach',
      header: 'Outreach (read-only)',
      hideOnMobile: true,
      render: (r) =>
        r.outreach ? (
          <span className="text-[12px] text-secondary">{r.outreach.outreachStatus}</span>
        ) : (
          <span className="text-[12px] text-faint" title="No outreach log in the Dash-1 source.">
            —
          </span>
        ),
    },
  ];

  const countryColumns: ConsoleColumn<BwsCountrySummaryRow>[] = [
    {
      key: 'label',
      header: 'Origin / Region',
      render: (r) => <span className="font-medium text-ink-950">{r.label}</span>,
    },
    {
      key: 'categories',
      header: 'Drink Categories',
      render: (r) => <span className="text-[12px] text-secondary">{r.categories.join(', ') || '—'}</span>,
    },
    {
      key: 'brands',
      header: 'Brands Discovered',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{r.brandCount}</span>,
    },
    {
      key: 'ukPresence',
      header: 'UK Presence',
      render: (r) => <span className="text-[12px] text-secondary">{r.ukPresenceIndicator}</span>,
    },
    {
      key: 'opportunity',
      header: 'Commercial Opportunity',
      render: (r) => (
        <span className="text-[12px] text-secondary">{r.commercialOpportunityIndicator}</span>
      ),
    },
    {
      key: 'producers',
      header: 'Producers / Evidence',
      align: 'right',
      render: (r) => (
        <span className="font-mono tabular-nums text-secondary">
          {r.featuredProducerCount} / {r.evidenceCount}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        title={copy.title}
        description={copy.description}
        meta={<span>BWS Workspace · Dash-1 BWS research dataset (88 brands, 13 origin regions)</span>}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {section === 'overview' && (
              <button
                type="button"
                onClick={() => onNavigateSection('campaign-studio')}
                className="px-3.5 py-2 rounded-md border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
              >
                Open Campaign Studio
              </button>
            )}
          </div>
        }
      />

      <NoticeBanner
        tone="info"
        title="Dash-1 BWS research dataset — shown as published"
        message="Brands, origin regions, ownership verification, licensing arrangement, outreach logs and opportunity assessments come from the Dash-1 BWS dataset. A field the dataset does not contain is shown as an em dash (—) and is never defaulted, estimated or filled in."
      />

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
                title="Commercial Opportunity Distribution"
                description="Brands grouped by the Dash-1 commercial opportunity indicator. These are counts of records present in the dataset — no readiness score is computed or shown."
              >
                <ConsoleBarChart
                  data={opportunityDistribution.map(([label, value]) => ({
                    label,
                    value,
                    hint: `${label}: ${value} brand${value === 1 ? '' : 's'}`,
                  }))}
                  formatValue={(v) => `${v}`}
                />
              </SectionCard>

              <SectionCard
                title="Dataset Coverage"
                description="How much of the Dash-1 BWS dataset carries each record type. Every figure is a count of records actually present — none are estimates."
              >
                <div className="space-y-2">
                  {coverage.map((c) => (
                    <div key={c.label} className="flex items-center justify-between gap-2 text-[12px] border-b border-hairline pb-2 last:border-b-0">
                      <span className="text-secondary">{c.label}</span>
                      <span className="font-mono tabular-nums text-ink-950">{c.value}</span>
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
                description="One row per origin region in the Dash-1 COUNTRIES dataset: its drink categories, brands discovered, UK presence indicator, commercial opportunity indicator, featured producers and evidence items."
              >
                <ConsoleTable
                  rows={countryRows}
                  columns={countryColumns}
                  rowKey={(r) => r.regionKey}
                  emptyTitle="No origin records found"
                  emptyDescription="The Dash-1 COUNTRIES dataset has no origin regions."
                />
              </SectionCard>

              <SectionCard
                title="Market Sizing"
                description="Market sizing data not available in this workspace (D5)."
              >
                <div className="border border-hairline rounded-md p-4 text-[13px] text-ink-600">
                  Market sizing data not available in this workspace.
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
                  className="px-3 py-1.5 rounded-md border border-hairline-strong bg-surface-raised text-[14px] w-full sm:w-72"
                />
                <select
                  aria-label="Filter by outreach log"
                  value={outreachFilter}
                  onChange={(e) => onOutreachFilterChange(e.target.value)}
                  className="px-3 py-1.5 rounded-md border border-hairline-strong bg-surface-raised text-[14px]"
                >
                  <option value="">All brands</option>
                  <option value="with">With an outreach log</option>
                  <option value="without">Without an outreach log</option>
                </select>
              </div>

              {scopedProspects.length === 0 ? (
                <EmptyStateBlock
                  title="No matching records for this view"
                  description="Clear the filters, or open a different section. Brands come from the Dash-1 BWS dataset."
                  actionLabel={searchQuery || outreachFilter ? 'Clear filters' : undefined}
                  onAction={
                    searchQuery || outreachFilter
                      ? () => {
                          onSearchQueryChange('');
                          onOutreachFilterChange('');
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
            ? `${selectedProspect.category} · ${selectedProspect.commercialOpportunityIndicator}`
            : undefined
        }
      >
        {selectedProspect && (
          <div className="space-y-5 text-[14px]">
            <div className="space-y-1.5">
              <div className="text-[11px] uppercase tracking-[0.06em] text-faint">
                Brand record (Dash-1)
              </div>
              <p className="text-ink-800">{selectedProspect.description}</p>
              {selectedProspect.website && (
                <div className="text-[12px] font-mono text-faint">{selectedProspect.website}</div>
              )}
              <dl className="pt-1 space-y-1 text-[12px]">
                <div className="flex gap-2">
                  <dt className="text-faint w-44 shrink-0">Ownership verification</dt>
                  <dd className="text-ink-800">{selectedProspect.ownershipVerification}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-faint w-44 shrink-0">Licensing arrangement</dt>
                  <dd className="text-ink-800">{selectedProspect.licensingArrangement}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-faint w-44 shrink-0">UK presence</dt>
                  <dd className="text-ink-800">{selectedProspect.ukPresenceIndicator}</dd>
                </div>
              </dl>
            </div>

            {/* §D9 — read-only badge; the stage is never mutated from this screen. */}
            <div className="border-t border-hairline pt-4 space-y-2">
              <div className="text-[11px] uppercase tracking-[0.06em] text-faint">
                Opportunity assessment (read-only)
              </div>
              {selectedProspect.opportunityStatus ? (
                <InlineStatus label={selectedProspect.opportunityStatus} tone="info" />
              ) : (
                <p className="text-[12px] text-faint">
                  No opportunity assessment recorded for this brand.
                </p>
              )}
            </div>

            {/* §D8 — the outreach log is displayed as recorded; no write controls exist. */}
            <div className="border-t border-hairline pt-4 space-y-2">
              <div className="text-[11px] uppercase tracking-[0.06em] text-faint">
                Outreach log (read-only)
              </div>
              {selectedProspect.outreach ? (
                <dl className="space-y-1 text-[12px]">
                  <div className="flex gap-2">
                    <dt className="text-faint w-44 shrink-0">Outreach status</dt>
                    <dd className="text-ink-800">{selectedProspect.outreach.outreachStatus}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-faint w-44 shrink-0">Contact</dt>
                    <dd className="text-ink-800">
                      {selectedProspect.outreach.contactPerson} · {selectedProspect.outreach.contactRole}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-faint w-44 shrink-0">Email</dt>
                    <dd className="text-ink-800 font-mono">{selectedProspect.outreach.contactEmail}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-faint w-44 shrink-0">Last contacted / next follow-up</dt>
                    <dd className="text-ink-800">
                      {selectedProspect.outreach.lastContacted} / {selectedProspect.outreach.nextFollowUp}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-faint w-44 shrink-0">Discussion notes</dt>
                    <dd className="text-ink-800">{selectedProspect.outreach.discussionNotes}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-[12px] text-faint">
                  No outreach log recorded for this brand in the Dash-1 dataset.
                </p>
              )}
            </div>

            <div className="border-t border-hairline pt-4 space-y-2">
              <div className="text-[11px] uppercase tracking-[0.06em] text-faint">
                Amazon UK listings
              </div>
              <p className="text-[12px] text-secondary">
                {selectedProspect.asinCount === 0
                  ? 'No Amazon UK listing recorded for this brand.'
                  : `${selectedProspect.asinCount} Amazon UK listing${selectedProspect.asinCount === 1 ? '' : 's'} recorded for this brand in the Dash-1 dataset.`}
              </p>
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
