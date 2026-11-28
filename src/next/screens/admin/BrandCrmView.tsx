import { useState } from 'react';
import {
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  PageHeader,
  SlideOverDrawer,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { ConsoleTabs, NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';

export type CrmCohort = 'all' | 'with_po' | 'with_docs' | 'no_contract';

export interface CrmBrandListItem {
  id: string;
  businessName: string;
  category: string;
  track: 'direct_fulfillment' | 'financed' | 'unassigned';
  trackLabel: string;
  contractStatus: string;
  lifecycleLabel: string;
  tags: string[];
  accountOwnerName: string;
  changeRequests: {
    id: string;
    field: string;
    currentValue: string;
    requestedValue: string;
    reason: string;
  }[];
  recentPos: { poNumber: string; statusLabel: string; statusTone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }[];
  contracts: { typeLabel: string; statusLabel: string; statusTone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }[];
  docs: { id: string; typeLabel: string; statusLabel: string; statusTone: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }[];
  agreements: { id: string; title: string; version: string | number; acceptedAt: string }[];
  timeline: { id: string; kind: string; label: string; at: string; detail: string }[];
  tasks: { id: string; title: string; dueDate: string; assigneeName: string; status: 'open' | 'done'; overdue: boolean }[];
  notes: { id: string; createdAt: string; authorName: string; body: string }[];
  messages: { id: string; createdAt: string; channel: string; direction: string; body: string }[];
}

export interface CrmAcquisitionOpportunity {
  prospectId: string;
  brandName: string;
  opportunityId: string;
  biScore: number;
  ownerStaffId?: string;
  responseCount: number;
  stage: string;
  onboardingStatus?: string;
  onboardingBrandId?: string;
}

export interface BrandCrmViewProps {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  canMutate: boolean;
  totalBrands: number;
  withPosCount: number;
  withDocsCount: number;
  noContractCount: number;
  cohort: CrmCohort;
  onCohortChange: (c: CrmCohort) => void;
  categoryFilter: string;
  categories: string[];
  onCategoryFilterChange: (c: string) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onExportCsv: () => void;
  brands: CrmBrandListItem[];
  selectedBrand: CrmBrandListItem | null;
  onSelectBrand: (id: string | null) => void;
  acquisitionSummary: {
    enrolled: number;
    responded: number;
    opportunities: number;
    onboardedCount: number;
    operationalCount: number;
    persistenceState: string;
    persistenceError?: string;
  };
  acquisitionRows: CrmAcquisitionOpportunity[];
  staffOptions: { id: string; name: string }[];
  lifecycleStages: { id: string; label: string }[];
  trackOptions: { value: 'direct_fulfillment' | 'financed'; label: string }[];
  onRenameBrand: (brandId: string, name: string) => void;
  onOverrideTrack: (brandId: string, track: 'direct_fulfillment' | 'financed', reason: string) => void;
  onReviewChangeRequest: (reqId: string, approve: boolean) => void;
  onAddTask: (brandId: string, title: string, dueDate: string, assigneeId: string) => void;
  onToggleTask: (taskId: string, currentStatus: 'open' | 'done') => void;
  onAddNote: (brandId: string, body: string) => void;
  onSetLifecycle: (brandId: string, stage: string) => void;
  onAddTag: (brandId: string, currentTags: string[], tag: string) => void;
  onSetAccountOwner: (brandId: string, staffId: string | null) => void;
  onSendMessage: (brandId: string, brandName: string, subject: string, body: string) => Promise<string>;
  onLogCall: (brandId: string, note: string) => Promise<string>;
  onOpenFullPipeline?: (prospectId: string) => void;
}

export function BrandCrmView({
  loading,
  error,
  onRetry,
  canMutate,
  totalBrands,
  withPosCount,
  withDocsCount,
  noContractCount,
  cohort,
  onCohortChange,
  categoryFilter,
  categories,
  onCategoryFilterChange,
  searchQuery,
  onSearchQueryChange,
  onExportCsv,
  brands,
  selectedBrand,
  onSelectBrand,
  acquisitionSummary,
  acquisitionRows,
  staffOptions,
  lifecycleStages,
  trackOptions,
  onRenameBrand,
  onOverrideTrack,
  onReviewChangeRequest,
  onAddTask,
  onToggleTask,
  onAddNote,
  onSetLifecycle,
  onAddTag,
  onSetAccountOwner,
  onSendMessage,
  onLogCall,
}: BrandCrmViewProps) {
  const [drawerTab, setDrawerTab] = useState<'overview' | 'timeline' | 'tasks' | 'notes' | 'comms'>('overview');
  const [nameDraft, setNameDraft] = useState('');
  const [trackDraft, setTrackDraft] = useState<'direct_fulfillment' | 'financed'>('financed');
  const [overrideReason, setOverrideReason] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskAssignee, setTaskAssignee] = useState(staffOptions[0]?.id ?? '');
  const [noteDraft, setNoteDraft] = useState('');
  const [tagDraft, setTagDraft] = useState('');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [callNote, setCallNote] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  function openBrand(b: CrmBrandListItem) {
    setNameDraft(b.businessName);
    setTrackDraft(b.track === 'direct_fulfillment' ? 'direct_fulfillment' : 'financed');
    setOverrideReason('');
    setFeedback(null);
    setDrawerTab('overview');
    onSelectBrand(b.id);
  }

  const metrics: MetricItem[] = [
    {
      id: 'crm-brands',
      label: 'Brands',
      value: String(totalBrands),
      context: `${brands.length} in view`,
      active: cohort === 'all',
      onClick: () => {
        onCohortChange('all');
        onCategoryFilterChange('all');
        onSearchQueryChange('');
      },
      testId: 'crm-metric-brands',
      valueTestId: 'crm-metric-brands-value',
    },
    {
      id: 'crm-with-po',
      label: 'With POs',
      value: String(withPosCount),
      context: 'Brands with at least one PO',
      active: cohort === 'with_po',
      onClick: () => onCohortChange(cohort === 'with_po' ? 'all' : 'with_po'),
      testId: 'crm-metric-with-po',
      valueTestId: 'crm-metric-with-po-value',
    },
    {
      id: 'crm-with-docs',
      label: 'With documents',
      value: String(withDocsCount),
      context: 'Compliance records on file',
      active: cohort === 'with_docs',
      onClick: () => onCohortChange(cohort === 'with_docs' ? 'all' : 'with_docs'),
      testId: 'crm-metric-with-docs',
      valueTestId: 'crm-metric-with-docs-value',
    },
    {
      id: 'crm-no-contract',
      label: 'No active contract',
      value: String(noContractCount),
      context: noContractCount > 0 ? 'Follow-up candidates' : 'All contracted',
      active: cohort === 'no_contract',
      onClick: () => onCohortChange(cohort === 'no_contract' ? 'all' : 'no_contract'),
      testId: 'crm-metric-no-contract',
      valueTestId: 'crm-metric-no-contract-value',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brand CRM"
        description="Canonical brand tenants with contract, compliance, relationship tasks, timeline, and pre-onboarding acquisition opportunities."
        meta={
          <>
            <span className="font-mono">{brands.length} of {totalBrands} brands</span>
            <span>Cohort: {cohort.replace(/_/g, ' ')}</span>
          </>
        }
        actions={
          <button
            type="button"
            onClick={onExportCsv}
            className="px-3.5 py-2 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
          >
            Export CSV
          </button>
        }
      />

      {error && <ErrorStateBlock message={error} onRetry={onRetry} />}

      <MetricStrip items={metrics} loading={loading} columns={4} />

      <SectionCard
        title="Pre-onboarding acquisition relationships"
        description={`In acquisition: ${acquisitionSummary.enrolled} · Responses: ${acquisitionSummary.responded} · Opportunities: ${acquisitionSummary.opportunities} · In onboarding: ${acquisitionSummary.onboardedCount} · Operational: ${acquisitionSummary.operationalCount} · Persistence: ${acquisitionSummary.persistenceState}`}
      >
        {acquisitionRows.length === 0 ? (
          <p className="text-[13px] text-faint">
            No acquisition opportunities created yet. Prepare & qualify outreach in Brand Intelligence.
          </p>
        ) : (
          <ul className="divide-y divide-hairline-06 text-[13px]">
            {acquisitionRows.map((row) => (
              <li key={row.prospectId} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium text-ink-950">{row.brandName}</span>
                  <div className="text-[12px] font-mono text-faint">
                    {row.opportunityId} · BI {row.biScore}/100 · owner {row.ownerStaffId} · {row.responseCount} response(s)
                    {row.onboardingStatus ? ` · Onboarding ${row.onboardingStatus} (${row.onboardingBrandId})` : ''}
                  </div>
                </div>
                <InlineStatus label={row.stage} tone={row.stage === 'won' ? 'success' : 'info'} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryFilterChange(cat)}
                className={`px-2.5 py-1 rounded text-[12px] font-medium border ${
                  categoryFilter === cat
                    ? 'bg-ink-950 text-on-dark border-ink-950'
                    : 'bg-surface-raised text-ink-600 border-hairline hover:text-ink-950'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search brands…"
            className="w-60 rounded border border-hairline-strong bg-surface-raised px-3 py-1.5 text-[13px]"
          />
        </div>

        {loading ? (
          <LoadingRows rows={6} label="Loading brand directory…" />
        ) : brands.length === 0 ? (
          <EmptyStateBlock
            title="No brands match"
            description="Adjust cohort or category filters."
            actionLabel="Reset filters"
            onAction={() => {
              onCohortChange('all');
              onCategoryFilterChange('all');
              onSearchQueryChange('');
            }}
          />
        ) : (
          <div className="border border-hairline bg-surface-raised rounded-md divide-y divide-hairline-06">
            {brands.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => openBrand(b)}
                className="w-full px-4 py-3 text-left flex flex-wrap items-center justify-between gap-3 hover:bg-surface transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-ink-950">{b.businessName}</div>
                  <div className="text-[12px] text-faint">
                    {b.category} · {b.trackLabel} · Owner: {b.accountOwnerName}
                    {b.tags.length > 0 ? ` · ${b.tags.join(', ')}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[12px]">
                  <span className="font-mono text-ink-600">{b.recentPos.length} PO(s)</span>
                  <InlineStatus
                    label={b.contractStatus.replace(/_/g, ' ')}
                    tone={b.contractStatus === 'active' ? 'success' : 'warning'}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <SlideOverDrawer
        open={Boolean(selectedBrand)}
        onClose={() => onSelectBrand(null)}
        title={selectedBrand?.businessName ?? 'Brand record'}
        subtitle={
          selectedBrand ? `${selectedBrand.category} · ${selectedBrand.trackLabel}` : undefined
        }
      >
        {selectedBrand && (
          <div className="space-y-5 text-[13px]">
            <ConsoleTabs
              tabs={[
                { id: 'overview', label: 'Overview' },
                { id: 'timeline', label: 'Timeline', count: selectedBrand.timeline.length },
                { id: 'tasks', label: 'Tasks', count: selectedBrand.tasks.filter((t) => t.status === 'open').length },
                { id: 'notes', label: 'Notes', count: selectedBrand.notes.length },
                { id: 'comms', label: 'Comms', count: selectedBrand.messages.length },
              ]}
              value={drawerTab}
              onChange={setDrawerTab}
              ariaLabel="Brand CRM record tabs"
            />

            {feedback && <NoticeBanner tone="info" message={feedback} />}

            {drawerTab === 'overview' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h3 className="font-semibold text-ink-950">Brand identity</h3>
                  <div className="flex gap-2">
                    <input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      className="flex-1 rounded border border-hairline-strong px-2.5 py-1.5"
                    />
                    <button
                      type="button"
                      disabled={!canMutate || !nameDraft.trim()}
                      onClick={() => {
                        onRenameBrand(selectedBrand.id, nameDraft.trim());
                        setFeedback('Brand name updated.');
                      }}
                      className="px-3 py-1.5 rounded bg-ink-950 text-on-dark text-[12px] font-medium disabled:opacity-40"
                    >
                      Rename
                    </button>
                  </div>
                </div>

                {selectedBrand.changeRequests.length > 0 && (
                  <div className="border-t border-hairline pt-4 space-y-2">
                    <h3 className="font-semibold text-ink-950">Pending profile change requests</h3>
                    {selectedBrand.changeRequests.map((cr) => (
                      <div key={cr.id} className="border border-hairline rounded p-2.5 space-y-1">
                        <div className="font-mono text-[12px]">
                          {cr.field}: {cr.currentValue || '(empty)'} → {cr.requestedValue}
                        </div>
                        <div className="text-[12px] text-faint">Reason: {cr.reason}</div>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            disabled={!canMutate}
                            onClick={() => onReviewChangeRequest(cr.id, true)}
                            className="px-2.5 py-1 rounded bg-state-success text-on-dark text-[11px] disabled:opacity-40"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={!canMutate}
                            onClick={() => onReviewChangeRequest(cr.id, false)}
                            className="px-2.5 py-1 rounded border border-state-danger/20 text-state-danger text-[11px] disabled:opacity-40"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-hairline pt-4 space-y-2">
                  <h3 className="font-semibold text-ink-950">Fulfillment track override</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={trackDraft}
                      onChange={(e) =>
                        setTrackDraft(e.target.value as 'direct_fulfillment' | 'financed')
                      }
                      className="rounded border border-hairline-strong px-2.5 py-1.5"
                    >
                      {trackOptions.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <input
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder="Override reason"
                      className="rounded border border-hairline-strong px-2.5 py-1.5"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!canMutate || !overrideReason.trim()}
                    onClick={() => {
                      onOverrideTrack(selectedBrand.id, trackDraft, overrideReason);
                      setFeedback('Fulfillment track updated.');
                    }}
                    className="px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium disabled:opacity-40"
                  >
                    Apply track override
                  </button>
                </div>

                <div className="border-t border-hairline pt-4 space-y-3">
                  <h3 className="font-semibold text-ink-950">Relationship metadata</h3>
                  <div className="flex flex-wrap gap-1">
                    {lifecycleStages.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        disabled={!canMutate}
                        onClick={() => onSetLifecycle(selectedBrand.id, st.id)}
                        className={`px-2 py-1 rounded border text-[11px] ${
                          selectedBrand.lifecycleLabel === st.label
                            ? 'bg-ink-950 text-on-dark border-ink-950'
                            : 'border-hairline text-ink-600'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={tagDraft}
                      onChange={(e) => setTagDraft(e.target.value)}
                      placeholder="Add segmentation tag…"
                      className="flex-1 rounded border border-hairline-strong px-2.5 py-1 text-[12px]"
                    />
                    <button
                      type="button"
                      disabled={!canMutate || !tagDraft.trim()}
                      onClick={() => {
                        onAddTag(selectedBrand.id, selectedBrand.tags, tagDraft.trim());
                        setTagDraft('');
                      }}
                      className="px-3 py-1 rounded border border-hairline-strong text-[12px]"
                    >
                      Add tag
                    </button>
                  </div>
                  <select
                    disabled={!canMutate}
                    value={
                      staffOptions.find((s) => s.name === selectedBrand.accountOwnerName)?.id ?? ''
                    }
                    onChange={(e) => onSetAccountOwner(selectedBrand.id, e.target.value || null)}
                    className="w-full rounded border border-hairline-strong px-2.5 py-1.5 text-[12px]"
                  >
                    <option value="">(unassigned account owner)</option>
                    {staffOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-hairline pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[12px]">
                  <div>
                    <h4 className="font-semibold text-ink-950 mb-1">Compliance docs ({selectedBrand.docs.length})</h4>
                    {selectedBrand.docs.map((d) => (
                      <div key={d.id} className="flex justify-between py-1 border-b border-hairline">
                        <span className="capitalize">{d.typeLabel}</span>
                        <InlineStatus label={d.statusLabel} tone={d.statusTone} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <h4 className="font-semibold text-ink-950 mb-1">Agreements ({selectedBrand.agreements.length})</h4>
                    {selectedBrand.agreements.map((a) => (
                      <div key={a.id} className="flex justify-between py-1 border-b border-hairline">
                        <span>{a.title}</span>
                        <span className="font-mono text-faint">v{a.version}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {drawerTab === 'timeline' && (
              <div className="space-y-2 max-h-[420px] overflow-y-auto">
                {selectedBrand.timeline.length === 0 ? (
                  <p className="text-faint">No activity recorded yet.</p>
                ) : (
                  selectedBrand.timeline.map((e) => (
                    <div key={e.id} className="border-b border-hairline pb-2">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-semibold text-ink-950">{e.label}</span>
                        <span className="font-mono text-faint">{e.at}</span>
                      </div>
                      <p className="text-[12px] text-ink-600 mt-0.5">{e.detail}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {drawerTab === 'tasks' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Follow-up task…"
                    className="rounded border border-hairline-strong px-2.5 py-1.5"
                  />
                  <input
                    type="date"
                    value={taskDue}
                    onChange={(e) => setTaskDue(e.target.value)}
                    className="rounded border border-hairline-strong px-2.5 py-1.5"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="flex-1 rounded border border-hairline-strong px-2.5 py-1.5"
                  >
                    {staffOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!canMutate || !taskTitle.trim() || !taskDue}
                    onClick={() => {
                      onAddTask(selectedBrand.id, taskTitle, taskDue, taskAssignee);
                      setTaskTitle('');
                      setTaskDue('');
                    }}
                    className="px-3.5 py-1.5 rounded bg-ink-950 text-on-dark text-[12px] font-medium disabled:opacity-40"
                  >
                    Add task
                  </button>
                </div>
                <ul className="divide-y divide-hairline-06">
                  {selectedBrand.tasks.map((t) => (
                    <li key={t.id} className="py-2 flex items-center justify-between gap-2">
                      <div>
                        <span className={t.status === 'done' ? 'line-through text-quiet' : 'text-ink-950'}>
                          {t.title}
                        </span>
                        <div className="text-[11px] font-mono text-faint">
                          Due {t.dueDate} · {t.assigneeName}
                          {t.overdue ? ' · Overdue' : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!canMutate}
                        onClick={() => onToggleTask(t.id, t.status)}
                        className="px-2 py-1 rounded border border-hairline text-[11px]"
                      >
                        {t.status === 'open' ? 'Mark done' : 'Reopen'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {drawerTab === 'notes' && (
              <div className="space-y-4">
                <textarea
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  rows={2}
                  placeholder="Internal timestamped note (never shown to brand)…"
                  className="w-full rounded border border-hairline-strong px-3 py-2"
                />
                <button
                  type="button"
                  disabled={!canMutate || !noteDraft.trim()}
                  onClick={() => {
                    onAddNote(selectedBrand.id, noteDraft);
                    setNoteDraft('');
                  }}
                  className="px-3.5 py-1.5 rounded bg-ink-950 text-on-dark text-[12px] font-medium disabled:opacity-40"
                >
                  Add internal note
                </button>
                <div className="divide-y divide-hairline-06">
                  {selectedBrand.notes.map((n) => (
                    <div key={n.id} className="py-2">
                      <div className="text-[11px] font-mono text-faint">
                        {n.createdAt} · {n.authorName}
                      </div>
                      <p className="text-ink-900 mt-0.5">{n.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {drawerTab === 'comms' && (
              <div className="space-y-4">
                <div className="space-y-2 max-h-48 overflow-y-auto border border-hairline rounded p-3 bg-surface">
                  {selectedBrand.messages.length === 0 ? (
                    <p className="text-[12px] text-faint">No messages logged yet.</p>
                  ) : (
                    selectedBrand.messages.map((m) => (
                      <div key={m.id} className="border-b border-hairline pb-1.5 last:border-0 text-[12px]">
                        <div className="font-mono text-[11px] text-faint">
                          {m.createdAt} · {m.direction} · {m.channel}
                        </div>
                        <div className="text-ink-900">{m.body}</div>
                      </div>
                    ))
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    value={msgSubject}
                    onChange={(e) => setMsgSubject(e.target.value)}
                    placeholder="Message subject"
                    className="w-full rounded border border-hairline-strong px-2.5 py-1.5"
                  />
                  <textarea
                    value={msgBody}
                    onChange={(e) => setMsgBody(e.target.value)}
                    rows={2}
                    placeholder="Write email message…"
                    className="w-full rounded border border-hairline-strong px-2.5 py-1.5"
                  />
                  <button
                    type="button"
                    disabled={!msgBody.trim()}
                    onClick={async () => {
                      const res = await onSendMessage(
                        selectedBrand.id,
                        selectedBrand.businessName,
                        msgSubject,
                        msgBody
                      );
                      setFeedback(res);
                      setMsgSubject('');
                      setMsgBody('');
                    }}
                    className="px-3.5 py-1.5 rounded bg-ink-950 text-on-dark text-[12px] font-medium disabled:opacity-40"
                  >
                    Send message
                  </button>
                </div>
                <div className="border-t border-hairline pt-3 space-y-2">
                  <textarea
                    value={callNote}
                    onChange={(e) => setCallNote(e.target.value)}
                    rows={2}
                    placeholder="Log phone call summary…"
                    className="w-full rounded border border-hairline-strong px-2.5 py-1.5"
                  />
                  <button
                    type="button"
                    disabled={!callNote.trim()}
                    onClick={async () => {
                      const res = await onLogCall(selectedBrand.id, callNote);
                      setFeedback(res);
                      setCallNote('');
                    }}
                    className="px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium"
                  >
                    Log call to timeline
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
