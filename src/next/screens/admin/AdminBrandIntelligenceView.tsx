import { useState } from 'react';
import {
  ConsoleTable,
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  ConsoleHeader,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import {
  ConsoleProgressTrack,
  ConsoleTabs,
  NoticeBanner,
  SectionCard,
} from '@/next/components/ConsoleCharts';

export interface ProspectRowItem {
  id: string;
  brand: string;
  category: string;
  website?: string;
  whyInteresting?: string;
  totalScore: number;
  tier: string;
  tierLabel: string;
  amazonDemand: number;
  poPotential: number;
  growth: number;
  distributionOpenness: number;
  acceptanceProbability: number;
  mercentaFit: number;
  logisticsSuitability: number;
  offerSummary: string;
  leadDistributor: string;
  leadContact: string;
  disqualified: boolean;
  disqualificationReason?: string;
  maturityLabel: string;
  ukPresence: boolean;
  outreachStatus: string;
  notes: string;
  asins: {
    asin: string;
    title: string;
    offerClass: string;
    price: number;
    rating: number;
    reviewCount: number;
    bsr: number;
    sellerCount: number;
    estimatedRevenue?: number;
  }[];
  contacts: { name: string; jobTitle: string; company: string; email?: string; emailConfidence: string }[];
  distributors: { company: string; territory: string; exclusive?: boolean; suggestedApproach?: string }[];
  wholesaleAvailable: boolean;
  distributorProgramme: boolean;
  retailerProgramme: boolean;
  timeline: { id: string; changeType: string; summary: string; timestamp: string; field?: string }[];
}

export interface IntelRunItem {
  runId: string;
  trigger: string;
  completedAt: string;
  scannedCount: number;
  newCount: number;
  updatedCount: number;
  disqualifiedCount: number;
  unchangedCount: number;
  changes: { id: string; brand: string; changeType: string; summary: string }[];
}

export interface OutreachWorkflowSnapshot {
  stage: string;
  revision?: number;
  status?: string;
  subject: string;
  body: string;
  evidenceSummary: string;
  canApprove: boolean;
  canSend: boolean;
  canRespond: boolean;
  canCreateOpportunity: boolean;
  transportLive: boolean;
  opportunity?: { id: string; stage: string; ownerStaffId: string };
  onboarding?: {
    id: string;
    brandId: string;
    status: string;
    steps: { id: string; label: string; status: string }[];
  };
  onboardingEligible: boolean;
}

export interface AdminBrandIntelligenceViewProps {
  loading: boolean;
  error: string | null;
  canMutate: boolean;
  trackedCount: number;
  tier1Count: number;
  tier2Count: number;
  distributorGaps: number;
  highPriorityCount: number;
  disqualifiedCount: number;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  categoryFilter: string;
  categories: string[];
  onCategoryFilterChange: (cat: string) => void;
  tierFilter: string;
  onTierFilterChange: (tier: string) => void;
  prospects: ProspectRowItem[];
  disqualifiedProspects: ProspectRowItem[];
  runs: IntelRunItem[];
  nextScheduledCheck?: string;
  runningDiscovery: boolean;
  runStatusMessage: string | null;
  onRunDiscovery: () => Promise<void>;
  onRequalify: (id: string, brand: string) => void;
  onDisqualify: (id: string, reason: string) => void;
  onSaveNotes: (id: string, notes: string) => void;
  selectedProspect: ProspectRowItem | null;
  onSelectProspect: (id: string | null) => void;
  workflowSnapshot: OutreachWorkflowSnapshot | null;
  onOutreachAction: (
    prospectId: string,
    action:
      | 'prepare'
      | 'modify'
      | 'approve'
      | 'reject'
      | 'send'
      | 'simulate_response'
      | 'create_opportunity'
      | 'start_onboarding'
      | 'finish_onboarding',
    payload?: { subject?: string; body?: string; reason?: string; stepId?: string }
  ) => Promise<void>;
  onCompleteOnboardingStep: (onboardingId: string, stepId: string) => void;
  onSetOpportunityStage: (opportunityId: string, stage: string) => void;
}

export function AdminBrandIntelligenceView({
  loading,
  error,
  canMutate,
  trackedCount,
  tier1Count,
  tier2Count,
  distributorGaps,
  disqualifiedCount,
  searchQuery,
  onSearchQueryChange,
  categoryFilter,
  categories,
  onCategoryFilterChange,
  tierFilter,
  onTierFilterChange,
  prospects,
  disqualifiedProspects,
  runs,
  nextScheduledCheck,
  runningDiscovery,
  runStatusMessage,
  onRunDiscovery,
  onRequalify,
  onDisqualify,
  onSaveNotes,
  selectedProspect,
  onSelectProspect,
  workflowSnapshot,
  onOutreachAction,
  onCompleteOnboardingStep,
  onSetOpportunityStage,
}: AdminBrandIntelligenceViewProps) {
  const [drawerTab, setDrawerTab] = useState<'overview' | 'retail' | 'commercial' | 'outreach' | 'notes' | 'history'>('overview');
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [disqualifyReason, setDisqualifyReason] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [notesSavedMsg, setNotesSavedMsg] = useState<string | null>(null);
  const [subjectDraft, setSubjectDraft] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  function openProspect(p: ProspectRowItem) {
    setNotesDraft(p.notes);
    setDisqualifyReason('');
    setNotesSavedMsg(null);
    setDrawerTab('overview');
    onSelectProspect(p.id);
  }

  const metrics: MetricItem[] = [
    {
      id: 'bi-tracked',
      label: 'Tracked',
      value: String(trackedCount),
      context: `${prospects.length} in view`,
      active: !tierFilter && !categoryFilter && !searchQuery,
      onClick: () => {
        onSearchQueryChange('');
        onCategoryFilterChange('');
        onTierFilterChange('');
      },
      testId: 'bi-kpi-tracked',
      valueTestId: 'bi-kpi-tracked-value',
    },
    {
      id: 'bi-t1',
      label: 'Tier 1 (Attack)',
      value: String(tier1Count),
      context: 'Highest priority prospects',
      active: tierFilter === 'tier_1',
      onClick: () => onTierFilterChange(tierFilter === 'tier_1' ? '' : 'tier_1'),
      testId: 'bi-kpi-t1',
      valueTestId: 'bi-kpi-t1-value',
    },
    {
      id: 'bi-t2',
      label: 'Tier 2',
      value: String(tier2Count),
      context: 'High probability prospects',
      active: tierFilter === 'tier_2',
      onClick: () => onTierFilterChange(tierFilter === 'tier_2' ? '' : 'tier_2'),
      testId: 'bi-kpi-t2',
      valueTestId: 'bi-kpi-t2-value',
    },
    {
      id: 'bi-gaps',
      label: 'Distributor gaps',
      value: String(distributorGaps),
      context: 'No observed distributor coverage',
      onClick: () => {
        onTierFilterChange('');
        onCategoryFilterChange('');
      },
      testId: 'bi-kpi-gaps',
      valueTestId: 'bi-kpi-gaps-value',
    },
  ];

  const columns: ConsoleColumn<ProspectRowItem>[] = [
    {
      key: 'brand',
      header: 'Brand',
      mobilePrimary: true,
      render: (p) => (
        <div>
          <div className="font-medium text-ink-950">{p.brand}</div>
          <div className="text-ds-label text-faint">{p.category}</div>
        </div>
      ),
    },
    {
      key: 'score',
      header: 'Score',
      align: 'right',
      render: (p) => (
        <span className="font-mono font-semibold text-ink-950">{p.totalScore}</span>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      render: (p) => (
        <InlineStatus
          label={p.tierLabel}
          tone={p.tier === 'tier_1' ? 'success' : p.tier === 'tier_2' ? 'info' : 'neutral'}
        />
      ),
    },
    {
      key: 'offer',
      header: 'Channel offer',
      hideOnMobile: true,
      render: (p) => <span className="text-ds-label text-secondary">{p.offerSummary}</span>,
    },
    {
      key: 'distrib',
      header: 'Distributor',
      hideOnMobile: true,
      render: (p) => <span className="text-ds-label text-faint">{p.leadDistributor}</span>,
    },
    {
      key: 'contact',
      header: 'Contact',
      hideOnMobile: true,
      render: (p) => <span className="text-ds-label text-faint">{p.leadContact}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <ConsoleHeader
        title="Brand Intelligence"
        description="Canonical prospect universe, deterministic scoring, automated discovery runs, and acquisition outreach workflow."
        meta={
          <>
            <span className="font-mono">{trackedCount} tracked</span>
            <span className="font-mono">{runs.length} runs</span>
            <span className="font-mono">{disqualifiedCount} disqualified</span>
          </>
        }
        actions={
          <button
            type="button"
            disabled={runningDiscovery}
            onClick={() => void onRunDiscovery()}
            className="px-3.5 py-2 rounded-ds-sm bg-ink-950 text-on-dark text-ds-label font-medium hover:bg-ink-800 disabled:opacity-40"
          >
            {runningDiscovery ? 'Scanning…' : 'Run discovery'}
          </button>
        }
      />

      {error && <ErrorStateBlock message={error} />}
      {runStatusMessage && <NoticeBanner tone="info" message={runStatusMessage} />}

      <MetricStrip items={metrics} loading={loading} columns={4} />

      <div className="flex flex-wrap items-center gap-3 text-ds-label">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search prospects…"
          className="w-60 rounded-ds-sm border border-hairline-strong bg-surface-raised px-3 py-1.5"
        />
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value)}
          className="rounded-ds-sm border border-hairline-strong bg-surface-raised px-2.5 py-1.5"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={tierFilter}
          onChange={(e) => onTierFilterChange(e.target.value)}
          className="rounded-ds-sm border border-hairline-strong bg-surface-raised px-2.5 py-1.5"
        >
          <option value="">All tiers</option>
          <option value="tier_1">Tier 1 (Attack)</option>
          <option value="tier_2">Tier 2 (High Prob)</option>
          <option value="tier_3">Tier 3 (Upside)</option>
          <option value="tier_4">Tier 4 (Reserve)</option>
        </select>
        {nextScheduledCheck && (
          <span className="ml-auto font-mono text-ds-label text-faint">
            Next check: {nextScheduledCheck.slice(0, 10)}
          </span>
        )}
      </div>

      {loading ? (
        <LoadingRows rows={6} label="Loading brand intelligence…" />
      ) : prospects.length === 0 ? (
        <EmptyStateBlock
          title="No matching prospects"
          description="Clear search or tier filters to inspect the tracked brand universe."
          actionLabel="Clear filters"
          onAction={() => {
            onSearchQueryChange('');
            onCategoryFilterChange('');
            onTierFilterChange('');
          }}
        />
      ) : (
        <ConsoleTable
          rows={prospects}
          columns={columns}
          rowKey={(p) => p.id}
          selectedKey={selectedProspect?.id ?? null}
          onRowClick={openProspect}
          testId="bi-prospect-table"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title={`Discovery run history (${runs.length})`}>
          {runs.length === 0 ? (
            <p className="text-ds-label text-faint">No discovery runs recorded yet.</p>
          ) : (
            <div className="divide-y divide-hairline-06 text-ds-label">
              {runs.slice(0, 8).map((r) => {
                const open = expandedRunId === r.runId;
                return (
                  <div key={r.runId} className="py-2">
                    <button
                      type="button"
                      onClick={() => setExpandedRunId(open ? null : r.runId)}
                      className="w-full flex justify-between text-left"
                    >
                      <span className="font-mono font-medium text-ink-950">{r.runId}</span>
                      <span className="font-mono text-faint">
                        {r.trigger} · {r.completedAt.slice(0, 16).replace('T', ' ')}
                      </span>
                    </button>
                    <div className="mt-0.5 font-mono text-faint">
                      scan {r.scannedCount} · +{r.newCount} new · {r.updatedCount} updated ·{' '}
                      {r.disqualifiedCount} dq
                    </div>
                    {open && r.changes.length > 0 && (
                      <ul className="mt-1.5 pl-3 border-l border-hairline space-y-0.5 font-mono text-faint">
                        {r.changes.map((c) => (
                          <li key={c.id}>
                            {c.brand} — {c.changeType}: {c.summary}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title={`Disqualified queue (${disqualifiedProspects.length})`}
          description="Disqualifications persist across discovery runs until manually requalified."
        >
          {disqualifiedProspects.length === 0 ? (
            <p className="text-ds-label text-faint">No disqualified prospects.</p>
          ) : (
            <div className="divide-y divide-hairline-06 text-ds-label">
              {disqualifiedProspects.map((p) => (
                <div key={p.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-ink-950">{p.brand}</div>
                    <div className="text-ds-micro font-mono text-state-warning">
                      {p.disqualificationReason || 'Disqualified'}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!canMutate}
                    onClick={() => onRequalify(p.id, p.brand)}
                    className="px-2.5 py-1 rounded-ds-sm border border-hairline-strong text-ds-label hover:bg-surface"
                  >
                    Requalify
                  </button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SlideOverDrawer
        open={Boolean(selectedProspect)}
        onClose={() => onSelectProspect(null)}
        title={selectedProspect?.brand ?? 'Prospect detail'}
        subtitle={
          selectedProspect
            ? `${selectedProspect.category} · Score ${selectedProspect.totalScore}/100 (${selectedProspect.tierLabel})`
            : undefined
        }
      >
        {selectedProspect && (
          <div className="space-y-5 text-ds-label">
            {selectedProspect.whyInteresting && (
              <NoticeBanner tone="info" message={selectedProspect.whyInteresting} />
            )}

            <ConsoleTabs
              tabs={[
                { id: 'overview', label: 'Overview' },
                { id: 'retail', label: 'Channel', count: selectedProspect.asins.length },
                { id: 'commercial', label: 'Commercial' },
                { id: 'outreach', label: 'Outreach' },
                { id: 'notes', label: 'Notes' },
                { id: 'history', label: 'History', count: selectedProspect.timeline.length },
              ]}
              value={drawerTab}
              onChange={(next) => {
                setDrawerTab(next);
                if (next === 'outreach' && workflowSnapshot) {
                  setSubjectDraft(workflowSnapshot.subject);
                  setBodyDraft(workflowSnapshot.body);
                }
              }}
              ariaLabel="Prospect detail tabs"
            />

            {drawerTab === 'overview' && (
              <div className="space-y-5">
                <div className="space-y-2.5">
                  <ConsoleProgressTrack label={`Channel demand (${selectedProspect.amazonDemand}/25)`} value={selectedProspect.amazonDemand} max={25} />
                  <ConsoleProgressTrack label={`PO Potential (${selectedProspect.poPotential}/20)`} value={selectedProspect.poPotential} max={20} />
                  <ConsoleProgressTrack label={`Growth (${selectedProspect.growth}/15)`} value={selectedProspect.growth} max={15} />
                  <ConsoleProgressTrack label={`Distribution Openness (${selectedProspect.distributionOpenness}/15)`} value={selectedProspect.distributionOpenness} max={15} />
                  <ConsoleProgressTrack label={`Acceptance Probability (${selectedProspect.acceptanceProbability}/10)`} value={selectedProspect.acceptanceProbability} max={10} />
                  <ConsoleProgressTrack label={`Mercenta Fit (${selectedProspect.mercentaFit}/10)`} value={selectedProspect.mercentaFit} max={10} />
                  <ConsoleProgressTrack label={`Logistics Suitability (${selectedProspect.logisticsSuitability}/5)`} value={selectedProspect.logisticsSuitability} max={5} />
                </div>

                {!selectedProspect.disqualified && (
                  <div className="border-t border-hairline pt-4 space-y-2">
                    <h4 className="font-semibold text-ink-950">Disqualify prospect</h4>
                    <div className="flex gap-2">
                      <input
                        value={disqualifyReason}
                        onChange={(e) => setDisqualifyReason(e.target.value)}
                        placeholder="Disqualification reason"
                        className="flex-1 rounded-ds-sm border border-hairline-strong px-2.5 py-1.5 text-ds-label"
                      />
                      <button
                        type="button"
                        disabled={!canMutate}
                        onClick={() => {
                          onDisqualify(
                            selectedProspect.id,
                            disqualifyReason.trim() || 'Disqualified by operator'
                          );
                          onSelectProspect(null);
                        }}
                        className="px-3 py-1.5 rounded-ds-sm border border-state-danger/20 text-state-danger text-ds-label font-medium hover:bg-state-danger/10 disabled:opacity-40"
                      >
                        Disqualify
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {drawerTab === 'retail' && (
              <div className="space-y-3">
                {selectedProspect.asins.map((a) => (
                  <div key={a.asin} className="border border-hairline rounded-ds-sm p-3 space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-ink-950">{a.title}</span>
                      <span className="font-mono text-ds-micro text-faint">{a.asin}</span>
                    </div>
                    <div className="text-ds-label text-faint font-mono">
                      £{a.price.toFixed(2)} · ★{a.rating} ({a.reviewCount}) · BSR #{a.bsr} · {a.sellerCount} sellers · {a.offerClass.replace(/_/g, ' ')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {drawerTab === 'commercial' && (
              <div className="space-y-4">
                <dl className="grid grid-cols-3 gap-2 border border-hairline rounded-ds-sm p-3">
                  <div>
                    <dt className="text-ds-micro text-faint">Wholesale</dt>
                    <dd className="font-medium">{selectedProspect.wholesaleAvailable ? 'Yes' : 'No'}</dd>
                  </div>
                  <div>
                    <dt className="text-ds-micro text-faint">Distributor Prg</dt>
                    <dd className="font-medium">{selectedProspect.distributorProgramme ? 'Yes' : 'No'}</dd>
                  </div>
                  <div>
                    <dt className="text-ds-micro text-faint">Retailer Prg</dt>
                    <dd className="font-medium">{selectedProspect.retailerProgramme ? 'Yes' : 'No'}</dd>
                  </div>
                </dl>
                <div>
                  <h4 className="font-semibold text-ink-950 mb-1.5">Contacts ({selectedProspect.contacts.length})</h4>
                  {selectedProspect.contacts.map((c, idx) => (
                    <div key={`${c.name}-${idx}`} className="py-1.5 border-b border-hairline text-ds-label">
                      <span className="font-medium text-ink-950">{c.name}</span> · {c.jobTitle} ({c.email ?? 'no email'})
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="font-semibold text-ink-950 mb-1.5">Distributors ({selectedProspect.distributors.length})</h4>
                  {selectedProspect.distributors.map((d, idx) => (
                    <div key={`${d.company}-${idx}`} className="py-1.5 border-b border-hairline text-ds-label">
                      <span className="font-medium text-ink-950">{d.company}</span> · {d.territory}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {drawerTab === 'outreach' && workflowSnapshot && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <InlineStatus label={`Stage: ${workflowSnapshot.stage}`} tone="info" />
                  {workflowSnapshot.status && (
                    <span className="font-mono text-ds-label text-faint">
                      Rev {workflowSnapshot.revision ?? 1} · {workflowSnapshot.status}
                    </span>
                  )}
                </div>

                {workflowSnapshot.evidenceSummary && (
                  <pre className="whitespace-pre-wrap font-sans text-ds-label bg-surface border border-hairline rounded-ds-sm p-3 text-secondary">
                    {workflowSnapshot.evidenceSummary}
                  </pre>
                )}

                <input
                  value={subjectDraft}
                  onChange={(e) => setSubjectDraft(e.target.value)}
                  placeholder="Outreach subject"
                  className="w-full rounded-ds-sm border border-hairline-strong px-2.5 py-1.5"
                />
                <textarea
                  value={bodyDraft}
                  onChange={(e) => setBodyDraft(e.target.value)}
                  rows={6}
                  placeholder="Outreach message body"
                  className="w-full rounded-ds-sm border border-hairline-strong px-2.5 py-2 text-ds-label"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!canMutate}
                    onClick={() => void onOutreachAction(selectedProspect.id, 'prepare')}
                    className="px-3 py-1.5 rounded-ds-sm bg-ink-950 text-on-dark text-ds-label font-medium disabled:opacity-40"
                  >
                    {workflowSnapshot.status ? 'Prepare new revision' : 'Prepare recommendation'}
                  </button>
                  {workflowSnapshot.canApprove && (
                    <>
                      <button
                        type="button"
                        disabled={!canMutate}
                        onClick={() =>
                          void onOutreachAction(selectedProspect.id, 'modify', {
                            subject: subjectDraft,
                            body: bodyDraft,
                          })
                        }
                        className="px-3 py-1.5 rounded-ds-sm border border-hairline-strong text-ds-label"
                      >
                        Modify
                      </button>
                      <button
                        type="button"
                        disabled={!canMutate}
                        onClick={() => void onOutreachAction(selectedProspect.id, 'approve')}
                        className="px-3 py-1.5 rounded-ds-sm bg-state-success text-on-dark text-ds-label"
                      >
                        Approve
                      </button>
                      <input
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Reject reason"
                        className="rounded-ds-sm border border-hairline-strong px-2 py-1 text-ds-label"
                      />
                      <button
                        type="button"
                        disabled={!canMutate}
                        onClick={() =>
                          void onOutreachAction(selectedProspect.id, 'reject', { reason: rejectReason })
                        }
                        className="px-3 py-1.5 rounded-ds-sm border border-state-danger/20 text-state-danger text-ds-label"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {workflowSnapshot.canSend && (
                    <button
                      type="button"
                      disabled={!canMutate}
                      onClick={() => void onOutreachAction(selectedProspect.id, 'send')}
                      className="px-3 py-1.5 rounded-ds-sm bg-[#C2410C] text-on-dark text-ds-label"
                    >
                      {workflowSnapshot.transportLive ? 'Send' : 'Send (Simulated)'}
                    </button>
                  )}
                  {workflowSnapshot.canRespond && (
                    <button
                      type="button"
                      disabled={!canMutate}
                      onClick={() => void onOutreachAction(selectedProspect.id, 'simulate_response')}
                      className="px-3 py-1.5 rounded-ds-sm border border-hairline-strong text-ds-label"
                    >
                      Simulate response
                    </button>
                  )}
                  {workflowSnapshot.canCreateOpportunity && (
                    <button
                      type="button"
                      disabled={!canMutate}
                      onClick={() => void onOutreachAction(selectedProspect.id, 'create_opportunity')}
                      className="px-3 py-1.5 rounded-ds-sm bg-ink-950 text-on-dark text-ds-label"
                    >
                      Create opportunity
                    </button>
                  )}
                </div>

                {workflowSnapshot.opportunity && (
                  <div className="border-t border-hairline pt-3 space-y-2">
                    <div className="text-ds-label font-mono text-secondary">
                      Opportunity {workflowSnapshot.opportunity.id} · Stage:{' '}
                      {workflowSnapshot.opportunity.stage}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(['contacted', 'responded', 'qualified', 'won', 'lost'] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={!canMutate || workflowSnapshot.opportunity?.stage === s}
                          onClick={() => onSetOpportunityStage(workflowSnapshot.opportunity!.id, s)}
                          className="px-2.5 py-1 rounded-ds-sm border border-hairline text-ds-micro capitalize disabled:opacity-40"
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    {!workflowSnapshot.onboarding ? (
                      <button
                        type="button"
                        disabled={!canMutate || !workflowSnapshot.onboardingEligible}
                        onClick={() => void onOutreachAction(selectedProspect.id, 'start_onboarding')}
                        className="mt-2 px-3 py-1.5 rounded-ds-sm bg-ink-950 text-on-dark text-ds-label disabled:opacity-40"
                      >
                        Start onboarding
                      </button>
                    ) : (
                      <div className="mt-2 border border-hairline rounded-ds-sm p-2.5 space-y-1.5">
                        <div className="font-mono text-ds-micro text-faint">
                          Onboarding {workflowSnapshot.onboarding.status} · {workflowSnapshot.onboarding.brandId}
                        </div>
                        {workflowSnapshot.onboarding.steps.map((st) => (
                          <div key={st.id} className="flex justify-between text-ds-label">
                            <span>{st.label}</span>
                            {st.status !== 'done' && workflowSnapshot.onboarding?.status !== 'completed' ? (
                              <button
                                type="button"
                                disabled={!canMutate}
                                onClick={() =>
                                  onCompleteOnboardingStep(workflowSnapshot.onboarding!.id, st.id)
                                }
                                className="text-[#C2410C] hover:underline"
                              >
                                Complete
                              </button>
                            ) : (
                              <span className="font-mono text-state-success">{st.status}</span>
                            )}
                          </div>
                        ))}
                        {workflowSnapshot.onboarding.status !== 'completed' && (
                          <button
                            type="button"
                            disabled={!canMutate}
                            onClick={() => void onOutreachAction(selectedProspect.id, 'finish_onboarding')}
                            className="px-3 py-1 rounded-ds-sm bg-[#C2410C] text-on-dark text-ds-micro"
                          >
                            Complete onboarding
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {drawerTab === 'notes' && (
              <div className="space-y-3">
                <textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={6}
                  placeholder="Internal notes / acquisition rationale…"
                  className="w-full rounded-ds-sm border border-hairline-strong px-3 py-2 font-mono text-ds-label"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      onSaveNotes(selectedProspect.id, notesDraft);
                      setNotesSavedMsg('Internal notes saved.');
                    }}
                    className="px-3.5 py-1.5 rounded-ds-sm bg-ink-950 text-on-dark text-ds-label font-medium"
                  >
                    Save notes
                  </button>
                  {notesSavedMsg && <span className="text-ds-label text-state-success">{notesSavedMsg}</span>}
                </div>
              </div>
            )}

            {drawerTab === 'history' && (
              <div className="space-y-2">
                {selectedProspect.timeline.length === 0 ? (
                  <p className="text-faint">No change events recorded yet.</p>
                ) : (
                  selectedProspect.timeline.map((e) => (
                    <div key={e.id} className="border-b border-hairline pb-2 text-ds-label">
                      <div className="font-mono text-faint">
                        {e.timestamp.slice(0, 16).replace('T', ' ')} · {e.changeType}
                        {e.field ? ` (${e.field})` : ''}
                      </div>
                      <div className="text-ink-900">{e.summary}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
