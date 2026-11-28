import { useState } from 'react';
import {
  ConsoleBarChart,
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
  trackLabel: string;
  contractStatus: string;
  contactPhone: string;
  skuCount: number;
  poValueGbp: number;
}

export interface TalentProductReadinessRow {
  id: string;
  brandId: string;
  brandName: string;
  sku: string;
  name: string;
  complete: boolean;
  missingFields: string[];
  submissionStatus: string;
  submissionTone: SemanticTone;
  listingScore: number;
  imageCount: number;
}

export interface TalentCommissionRow {
  id: string;
  brandName: string;
  poNumber: string;
  poValueGbp: number;
  commissionRatePct: number;
  commissionAmountGbp: number;
  netBrandShareGbp: number;
  statusLabel: string;
  statusTone: SemanticTone;
  createdAt: string;
}

export interface TalentProspectRow {
  id: string;
  brand: string;
  category: string;
  totalScore: number;
  tierLabel: string;
  offerSummary: string;
  acquisitionStage: string;
  opportunityStage?: string;
  opportunityId?: string;
  canPrepare: boolean;
  canApprove: boolean;
  canSend: boolean;
  canRespond: boolean;
  canCreateOpp: boolean;
  whyInteresting: string;
}

export interface TalentWorkspaceViewProps {
  section: TalentWorkspaceSection;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  canMutate: boolean;
  metrics: MetricItem[];
  rightsHolders: TalentRightsHolderRow[];
  productReadiness: TalentProductReadinessRow[];
  commissions: TalentCommissionRow[];
  prospects: TalentProspectRow[];
  ukStates: { stateId: string; label: string; evidenceSource: string; available: boolean }[];
  brandValueChart: { label: string; value: number; hint?: string }[];
  integrationStatuses: { id: string; label: string; mode: string; status: string }[];
  actingStaffName: string;
  statusMessage: string | null;
  onOutreachAction: (
    prospectId: string,
    action: 'prepare' | 'approve' | 'send' | 'simulate_response' | 'create_opportunity'
  ) => void;
  onSetOpportunityStage: (opportunityId: string, stage: string) => void;
  onNavigateView: (viewId: string) => void;
}

const SECTION_COPY: Record<
  TalentWorkspaceSection,
  { title: string; description: string; gapTitle: string; gapMessage: string }
> = {
  dashboard: {
    title: 'Talent Commerce Dashboard',
    description:
      'Cross-portfolio overview of rights-holder brand accounts, product readiness, UK opportunities, and PO settlement.',
    gapTitle: 'Talent IP & Royalty schemas not yet present in Mercenta backend',
    gapMessage:
      'KPIs and tables below bind strictly to canonical Mercenta entities (Brand, Product, PurchaseOrder, Commission, Prospect). Dedicated Talent/RightsHolder rosters, RoyaltyAgreement splits, CreativeAsset libraries, BrandStore modules, Collection capsules, and Brand.vertical isolation are omitted until added to src/types.ts.',
  },
  profile: {
    title: 'Rights Holders',
    description:
      'Commercial counterparty accounts and primary brand contacts currently modelled in Mercenta.',
    gapTitle: 'Talent / RightsHolder roster entity unavailable',
    gapMessage:
      'Mercenta stores Brand counterparty records (DemoBrandRow) rather than individual Talent/Creator records or talentId joins. Counterparty accounts are shown under Rights Holders without fabricating talent profiles.',
  },
  brands: {
    title: 'Brands & Products',
    description:
      'Partner brands, SKU completeness, and UK retail catalog readiness across the workspace.',
    gapTitle: 'Vertical & licensing category filter pending Brand.vertical',
    gapMessage:
      'Displaying all canonical Mercenta brands and products because Brand.vertical and IP licensing tags do not exist in DemoBrandRow.',
  },
  'uk-opportunities': {
    title: 'UK Opportunities',
    description:
      'Amazon UK offer classification and evidence coverage derived from tracked prospect ASIN snapshots.',
    gapTitle: 'Live talent-brand affinity matching omitted',
    gapMessage:
      'Opportunity states derive strictly from Mercenta Prospect and UK evidence provider status; talent-audience overlap scores from CAA-TalAg require Talent entities.',
  },
  acquisition: {
    title: 'Brand Acquisition',
    description:
      'Outreach preparation, approval gating, response tracking, and opportunity progression.',
    gapTitle: 'Canonical Mercenta acquisition workflow',
    gapMessage:
      'All outreach approvals and opportunity stage changes persist directly to Mercenta’s canonical acquisitionStore.',
  },
  'brand-stores': {
    title: 'Brand Store Studio',
    description:
      'Listing content quality metrics paired with disclosure for unmodelled Amazon Brand Store modules.',
    gapTitle: 'BrandStore module entity omitted (not modelled)',
    gapMessage:
      'Mercenta does not store BrandStore layout modules, store slugs, or hero banners yet. Storefront copy readiness from analyzeProductListing is shown below; mock storefront builders are omitted.',
  },
  concepts: {
    title: 'Product Concepts',
    description:
      'SKU specification completeness and catalog intake status across listed products.',
    gapTitle: 'ProductConcept ideation entity omitted (not modelled)',
    gapMessage:
      'Pre-SKU ProductConcept records do not exist in src/types.ts. Showing canonical Product spec completeness and missing attributes instead.',
  },
  development: {
    title: 'Product Development',
    description:
      'Catalog submission states and pre-launch compliance/specification checks per SKU.',
    gapTitle: 'Sample / prototype tracking entity omitted (not modelled)',
    gapMessage:
      'DevelopmentBrief and sample-approval stages are not modelled in Mercenta; live CatalogSubmission status and completeness checks are shown below.',
  },
  collections: {
    title: 'Collections',
    description:
      'Brand assortment grouping and SKU readiness overview.',
    gapTitle: 'Collection / Capsule entity omitted (not modelled)',
    gapMessage:
      'Seasonal Collection / Capsule entities and drop windows are not present in Mercenta schemas. Grouped brand SKU readiness is displayed instead of fabricated capsules.',
  },
  assets: {
    title: 'Creative Assets',
    description:
      'Product imagery coverage across canonical SKUs.',
    gapTitle: 'CreativeAsset library & CRUD endpoints omitted (not modelled)',
    gapMessage:
      'CreativeAsset records, upload endpoints (createCreativeAssetAPI), and rights clearance expirations do not exist in src/data/api.ts. Showing SKU product-image counts only.',
  },
  royalties: {
    title: 'Royalties & Commission Splits',
    description:
      'Verified Mercenta PO commission and net brand payout ledger.',
    gapTitle: 'Contractual Talent Royalty agreements omitted (not modelled)',
    gapMessage:
      'Showing real Mercenta PO Commission & net brand payout calculations (computeBrandNetShare). Dedicated Talent RoyaltyAgreement splits, minimum guarantees, and recoupment schedules do not exist in Mercenta.',
  },
  settings: {
    title: 'Talent Commerce Settings',
    description:
      'Operator permission tier and connected integration status.',
    gapTitle: 'Super Admin required for global administration',
    gapMessage:
      'Staff RBAC, Accounting/Xero, Commercial Models, and Company Controls require a Super Admin session.',
  },
};

export function TalentWorkspaceView({
  section,
  loading,
  error,
  onRetry,
  canMutate,
  metrics,
  rightsHolders,
  productReadiness,
  commissions,
  prospects,
  ukStates,
  brandValueChart,
  integrationStatuses,
  actingStaffName,
  statusMessage,
  onOutreachAction,
  onSetOpportunityStage,
  onNavigateView,
}: TalentWorkspaceViewProps) {
  const [search, setSearch] = useState('');
  const [selectedProspectId, setSelectedProspectId] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<TalentProductReadinessRow | null>(null);
  const [stageTarget, setStageTarget] = useState('qualified');

  const copy = SECTION_COPY[section];
  const selectedProspect = prospects.find((p) => p.id === selectedProspectId) ?? null;

  const q = search.trim().toLowerCase();
  const filteredRightsHolders = rightsHolders.filter(
    (r) =>
      !q ||
      r.businessName.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
  );
  const filteredProducts = productReadiness.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.brandName.toLowerCase().includes(q)
  );
  const filteredProspects = prospects.filter(
    (p) => !q || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  );

  const rhColumns: ConsoleColumn<TalentRightsHolderRow>[] = [
    {
      key: 'name',
      header: 'Rights Holder / Brand Account',
      render: (r) => (
        <div>
          <div className="font-medium text-zinc-950">{r.businessName}</div>
          <div className="text-[12px] text-zinc-500">
            {r.category} · {r.nation || 'Origin N/A'}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Primary Phone',
      render: (r) => <span className="text-[12px] text-zinc-700 font-mono">{r.contactPhone}</span>,
    },
    {
      key: 'track',
      header: 'Fulfilment Track',
      render: (r) => <span className="text-[12px] text-zinc-700">{r.trackLabel}</span>,
    },
    {
      key: 'skus',
      header: 'SKUs',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{r.skuCount}</span>,
    },
    {
      key: 'poVal',
      header: 'PO Value',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{formatGbp(r.poValueGbp)}</span>,
    },
  ];

  const prodColumns: ConsoleColumn<TalentProductReadinessRow>[] = [
    {
      key: 'product',
      header: 'SKU & Product',
      render: (r) => (
        <div>
          <div className="font-medium text-zinc-950">{r.name}</div>
          <div className="text-[12px] text-zinc-500 font-mono">
            {r.sku} · {r.brandName}
          </div>
        </div>
      ),
    },
    {
      key: 'completeness',
      header: 'Spec Completeness',
      render: (r) => (
        <InlineStatus
          label={r.complete ? 'Complete' : `${r.missingFields.length} missing`}
          tone={r.complete ? 'success' : 'warning'}
        />
      ),
    },
    {
      key: 'sub',
      header: 'Submission State',
      render: (r) => <InlineStatus label={r.submissionStatus} tone={r.submissionTone} />,
    },
    {
      key: 'score',
      header: 'Listing Score',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{r.listingScore}/100</span>,
    },
    {
      key: 'imgs',
      header: 'Media Count',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{r.imageCount}</span>,
    },
  ];

  const commissionColumns: ConsoleColumn<TalentCommissionRow>[] = [
    {
      key: 'brand',
      header: 'Counterparty / PO',
      render: (r) => (
        <div>
          <div className="font-medium text-zinc-950">{r.brandName}</div>
          <div className="text-[12px] text-zinc-500 font-mono">
            {r.poNumber} · {r.createdAt}
          </div>
        </div>
      ),
    },
    {
      key: 'poVal',
      header: 'PO Gross',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{formatGbp(r.poValueGbp, 2)}</span>,
    },
    {
      key: 'rate',
      header: 'Mercenta Rate',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{r.commissionRatePct}%</span>,
    },
    {
      key: 'comm',
      header: 'Mercenta Commission',
      align: 'right',
      render: (r) => (
        <span className="font-mono tabular-nums">{formatGbp(r.commissionAmountGbp, 2)}</span>
      ),
    },
    {
      key: 'net',
      header: 'Net Counterparty Share',
      align: 'right',
      render: (r) => (
        <span className="font-mono tabular-nums font-medium">{formatGbp(r.netBrandShareGbp, 2)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Settlement',
      render: (r) => <InlineStatus label={r.statusLabel} tone={r.statusTone} />,
    },
  ];

  const prospectColumns: ConsoleColumn<TalentProspectRow>[] = [
    {
      key: 'brand',
      header: 'Brand Prospect',
      render: (r) => (
        <div>
          <div className="font-medium text-zinc-950">{r.brand}</div>
          <div className="text-[12px] text-zinc-500">{r.category}</div>
        </div>
      ),
    },
    {
      key: 'score',
      header: 'Score / Tier',
      render: (r) => (
        <span className="font-mono text-[12px]">
          {r.totalScore}/100 · {r.tierLabel}
        </span>
      ),
    },
    {
      key: 'offer',
      header: 'UK Channel Offer',
      render: (r) => <span className="text-[12px] text-zinc-700">{r.offerSummary}</span>,
    },
    {
      key: 'stage',
      header: 'Pipeline Stage',
      render: (r) => (
        <span className="font-mono text-[12px] text-zinc-800">
          {r.opportunityStage ?? r.acquisitionStage}
        </span>
      ),
    },
  ];

  const isEmptyModuleSection =
    section === 'brand-stores' || section === 'collections' || section === 'assets';

  return (
    <div className="space-y-6">
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          <div className="flex flex-wrap gap-2">
            {section === 'dashboard' && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigateView('approvals')}
                  className="px-3.5 py-2 rounded-md border border-zinc-300 bg-white text-[12px] font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  Open Approvals Queue
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateView('campaigns')}
                  className="px-3.5 py-2 rounded-md bg-[var(--mr-accent)] text-white text-[12px] font-medium hover:bg-[var(--mr-accent-600)]"
                >
                  Open Amazon Campaigns
                </button>
              </>
            )}
          </div>
        }
      />

      <NoticeBanner tone="warning" title={copy.gapTitle} message={copy.gapMessage} />
      {statusMessage && <NoticeBanner tone="info" message={statusMessage} />}

      {loading ? (
        <LoadingRows rows={6} />
      ) : error ? (
        <ErrorStateBlock message={error} onRetry={onRetry} />
      ) : (
        <>
          <MetricStrip items={metrics} columns={4} />

          {(section === 'profile' ||
            section === 'brands' ||
            section === 'uk-opportunities' ||
            section === 'acquisition' ||
            section === 'concepts' ||
            section === 'development') && (
            <div className="flex items-center gap-3">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brands, SKUs, or categories…"
                aria-label="Filter records"
                className="px-3 py-1.5 rounded-md border border-zinc-300 bg-white text-[14px] w-full sm:w-80"
              />
            </div>
          )}

          {section === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard
                title="PO Value by Counterparty"
                description="Top brands ranked by cumulative Purchase Order value."
              >
                <ConsoleBarChart data={brandValueChart} />
              </SectionCard>

              <SectionCard
                title="UK Channel Opportunity States"
                description="Live UK market states backed by canonical evidence providers."
              >
                <div className="space-y-3">
                  {ukStates.map((st) => (
                    <div
                      key={st.stateId}
                      className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2 last:border-b-0 text-[12px]"
                    >
                      <div>
                        <div className="font-medium text-zinc-900">{st.label}</div>
                        <div className="text-[11px] text-zinc-500">{st.evidenceSource}</div>
                      </div>
                      <InlineStatus
                        label={st.available ? 'Evidence active' : 'Unasserted (no provider)'}
                        tone={st.available ? 'success' : 'neutral'}
                      />
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          )}

          {section === 'profile' && (
            <SectionCard title="Rights Holders (Canonical Brand Accounts)">
              <ConsoleTable
                rows={filteredRightsHolders}
                columns={rhColumns}
                rowKey={(r) => r.id}
              />
            </SectionCard>
          )}

          {(section === 'brands' || section === 'concepts' || section === 'development') && (
            <SectionCard
              title={
                section === 'concepts'
                  ? 'Product Spec Completeness'
                  : section === 'development'
                    ? 'Catalog Submissions & Launch Checks'
                    : 'Brands & SKU Portfolio'
              }
            >
              <ConsoleTable
                rows={filteredProducts}
                columns={prodColumns}
                rowKey={(r) => r.id}
                onRowClick={setSelectedProduct}
              />
            </SectionCard>
          )}

          {(section === 'uk-opportunities' || section === 'acquisition') && (
            <SectionCard
              title={
                section === 'uk-opportunities'
                  ? 'UK Market Opportunities'
                  : 'Acquisition Outreach & Opportunities'
              }
            >
              <ConsoleTable
                rows={filteredProspects}
                columns={prospectColumns}
                rowKey={(r) => r.id}
                selectedKey={selectedProspectId}
                onRowClick={(r) => setSelectedProspectId(r.id)}
              />
            </SectionCard>
          )}

          {isEmptyModuleSection && (
            <div className="space-y-6">
              <EmptyStateBlock
                title={
                  section === 'brand-stores'
                    ? 'No BrandStore entity records exist in Mercenta'
                    : section === 'collections'
                      ? 'No Collection / Capsule entity records exist in Mercenta'
                      : 'No CreativeAsset records exist in Mercenta'
                }
                description="Rather than displaying fabricated modules or mock media galleries, this workspace renders real SKU readiness and product-image counts from canonical Product records."
                actionLabel="Review Real Approval Queues"
                onAction={() => onNavigateView('approvals')}
              />
              <SectionCard title="Canonical SKU Readiness &amp; Product Media Counts">
                <ConsoleTable
                  rows={productReadiness}
                  columns={prodColumns}
                  rowKey={(r) => r.id}
                  onRowClick={setSelectedProduct}
                />
              </SectionCard>
            </div>
          )}

          {section === 'royalties' && (
            <SectionCard
              title="Mercenta Commission &amp; Net Counterparty Settlement Ledger"
              description="Calculated from Commission + PurchaseOrder + fulfilment track rules."
            >
              <ConsoleTable
                rows={commissions}
                columns={commissionColumns}
                rowKey={(r) => r.id}
              />
            </SectionCard>
          )}

          {section === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SectionCard title="Operator Session">
                <dl className="space-y-2 text-[13px]">
                  <div className="flex justify-between border-b border-zinc-100 pb-2">
                    <dt className="text-zinc-500">Acting staff</dt>
                    <dd className="font-medium text-zinc-950">{actingStaffName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-zinc-500">Write permission</dt>
                    <dd>
                      <InlineStatus
                        label={canMutate ? 'Full mutation rights' : 'Read-only operator'}
                        tone={canMutate ? 'success' : 'warning'}
                      />
                    </dd>
                  </div>
                </dl>
              </SectionCard>
              <SectionCard title="Integration Modes">
                <ul className="divide-y divide-zinc-200 text-[13px]">
                  {integrationStatuses.map((it) => (
                    <li key={it.id} className="py-2 flex items-center justify-between gap-2">
                      <span className="font-medium text-zinc-900">{it.label}</span>
                      <span className="font-mono text-[12px] text-zinc-600">
                        {it.status} ({it.mode})
                      </span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </div>
          )}
        </>
      )}

      <SlideOverDrawer
        open={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct?.name ?? 'Product Details'}
        subtitle={
          selectedProduct ? `${selectedProduct.sku} · ${selectedProduct.brandName}` : undefined
        }
      >
        {selectedProduct && (
          <div className="space-y-4 text-[14px]">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <span className="text-zinc-600">Listing readiness</span>
              <span className="font-mono font-semibold">{selectedProduct.listingScore} / 100</span>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.06em] text-zinc-500 mb-1.5">
                Missing Specification Fields
              </div>
              {selectedProduct.missingFields.length === 0 ? (
                <p className="text-[13px] text-emerald-800">All mandatory catalog fields complete.</p>
              ) : (
                <ul className="list-disc pl-5 text-[13px] text-amber-900 space-y-1">
                  {selectedProduct.missingFields.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </SlideOverDrawer>

      <SlideOverDrawer
        open={Boolean(selectedProspect)}
        onClose={() => setSelectedProspectId(null)}
        title={selectedProspect?.brand ?? 'Prospect'}
        subtitle={
          selectedProspect
            ? `${selectedProspect.category} · ${selectedProspect.totalScore}/100`
            : undefined
        }
      >
        {selectedProspect && (
          <div className="space-y-4 text-[14px]">
            <p className="text-zinc-800">{selectedProspect.whyInteresting}</p>
            <div className="border-t border-zinc-200 pt-3 space-y-2">
              <div className="text-[11px] uppercase tracking-[0.06em] text-zinc-500">
                Outreach &amp; Stage Controls
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedProspect.canPrepare && (
                  <button
                    type="button"
                    disabled={!canMutate}
                    onClick={() => onOutreachAction(selectedProspect.id, 'prepare')}
                    className="px-3 py-1.5 rounded border border-zinc-300 bg-white text-[12px] font-medium disabled:opacity-40"
                  >
                    Prepare Outreach
                  </button>
                )}
                {selectedProspect.canApprove && (
                  <button
                    type="button"
                    disabled={!canMutate}
                    onClick={() => onOutreachAction(selectedProspect.id, 'approve')}
                    className="px-3 py-1.5 rounded bg-zinc-950 text-white text-[12px] font-medium disabled:opacity-40"
                  >
                    Approve Draft
                  </button>
                )}
                {selectedProspect.canSend && (
                  <button
                    type="button"
                    disabled={!canMutate}
                    onClick={() => onOutreachAction(selectedProspect.id, 'send')}
                    className="px-3 py-1.5 rounded bg-[var(--mr-accent)] text-white text-[12px] font-medium disabled:opacity-40"
                  >
                    Send Outreach
                  </button>
                )}
                {selectedProspect.canRespond && (
                  <button
                    type="button"
                    disabled={!canMutate}
                    onClick={() => onOutreachAction(selectedProspect.id, 'simulate_response')}
                    className="px-3 py-1.5 rounded border border-zinc-300 bg-white text-[12px] font-medium disabled:opacity-40"
                  >
                    Log Reply (Sim)
                  </button>
                )}
                {selectedProspect.canCreateOpp && (
                  <button
                    type="button"
                    disabled={!canMutate}
                    onClick={() => onOutreachAction(selectedProspect.id, 'create_opportunity')}
                    className="px-3 py-1.5 rounded bg-zinc-950 text-white text-[12px] font-medium disabled:opacity-40"
                  >
                    Create Opportunity
                  </button>
                )}
              </div>

              {selectedProspect.opportunityId && (
                <div className="flex items-center gap-2 pt-2">
                  <select
                    aria-label="Opportunity stage"
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
                    className="px-3 py-1 rounded border border-zinc-300 bg-white text-[12px] font-medium disabled:opacity-40"
                  >
                    Update Stage
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
