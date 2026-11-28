import { useState } from 'react';
import {
  ConsoleTable,
  InlineStatus,
  MetricStrip,
  PageHeader,
  type ConsoleColumn,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { NoticeBanner, SectionCard, formatGbp } from '@/next/components/ConsoleCharts';

export interface AcquisitionRowItem {
  prospectId: string;
  brand: string;
  category: string;
  scoreTotal: number;
  scoreTier: string;
  leadId?: string;
  region?: string | null;
  stage: string;
  hasCurrentRevision: boolean;
  canPrepare: boolean;
}

export interface ScoredLeadItem {
  id: string;
  company: string;
  region: string;
  segment: string;
  prospectId?: string;
  fit: number;
  stage: string;
  paused: boolean;
}

export interface CampaignRowItem {
  id: string;
  name: string;
  status: string;
  costPerLead: number;
  dispatched: number;
  replies: number;
  meetings: number;
}

export interface MarketingHubViewProps {
  canMutate: boolean;
  icpDescription: string;
  onIcpDescriptionChange: (v: string) => void;
  icpCategories: string[];
  allCategories: string[];
  onToggleCategory: (cat: string) => void;
  icpRegions: string[];
  regionOptions: { value: string; label: string }[];
  onToggleRegion: (reg: string) => void;
  icpValid: boolean;
  acquisitionMetrics: { key: string; label: string; value: number }[];
  activeMetricFilter: string | null;
  onMetricFilterChange: (key: string | null) => void;
  acquisitionRows: AcquisitionRowItem[];
  onPrepareOutreach: (prospectId: string) => void;
  acquisitionNotice: string | null;
  acquisitionError: string | null;
  discoveryRunning: boolean;
  onRunDiscovery: () => Promise<void>;
  discoverySummary: {
    discovered: number;
    enrolled: number;
    dropped: number;
    leads: { name: string; enrolled: boolean; reason?: string }[];
  } | null;
  fitThreshold: number;
  autoEnrollCount: number;
  onRunAutoEnroll: () => void;
  scoredLeads: ScoredLeadItem[];
  onImportCsv: (csv: string) => Promise<void>;
  pipelineStages: string[];
  pipelineLeads: { id: string; company: string; outreachStatus: string; fitScore: number }[];
  sequenceSteps: { step: number; dayOffset: number; subjectTemplate: string; purpose: string }[];
  campaigns: CampaignRowItem[];
}

export function MarketingHubView({
  canMutate,
  icpDescription,
  onIcpDescriptionChange,
  icpCategories,
  allCategories,
  onToggleCategory,
  icpRegions,
  regionOptions,
  onToggleRegion,
  icpValid,
  acquisitionMetrics,
  activeMetricFilter,
  onMetricFilterChange,
  acquisitionRows,
  onPrepareOutreach,
  acquisitionNotice,
  acquisitionError,
  discoveryRunning,
  onRunDiscovery,
  discoverySummary,
  fitThreshold,
  autoEnrollCount,
  onRunAutoEnroll,
  scoredLeads,
  onImportCsv,
  pipelineStages,
  pipelineLeads,
  sequenceSteps,
  campaigns,
}: MarketingHubViewProps) {
  const [csvDraft, setCsvDraft] = useState('');
  const [csvFeedback, setCsvFeedback] = useState<string | null>(null);

  const metricStripItems: MetricItem[] = acquisitionMetrics.slice(0, 6).map((m) => ({
    id: `acq-${m.key}`,
    label: m.label,
    value: String(m.value),
    active: activeMetricFilter === m.key,
    onClick: () => onMetricFilterChange(activeMetricFilter === m.key ? null : m.key),
  }));

  const acqCols: ConsoleColumn<AcquisitionRowItem>[] = [
    {
      key: 'brand',
      header: 'Brand',
      mobilePrimary: true,
      render: (r) => (
        <div>
          <div className="font-medium text-zinc-950">{r.brand}</div>
          <div className="text-[12px] text-zinc-500">{r.category}</div>
        </div>
      ),
    },
    {
      key: 'score',
      header: 'BI Score',
      render: (r) => (
        <span className="font-mono text-zinc-900">
          {r.scoreTotal} <span className="text-zinc-500">{r.scoreTier}</span>
        </span>
      ),
    },
    {
      key: 'region',
      header: 'Region',
      render: (r) => <span className="font-mono">{r.region ?? '—'}</span>,
    },
    {
      key: 'stage',
      header: 'Stage',
      render: (r) => (
        <InlineStatus
          label={r.stage}
          tone={r.stage === 'qualified' || r.stage === 'won' ? 'success' : r.stage === 'rejected' ? 'danger' : 'info'}
        />
      ),
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          disabled={!canMutate || !r.canPrepare}
          onClick={() => onPrepareOutreach(r.prospectId)}
          className="text-[12px] font-medium text-[#C2410C] hover:underline disabled:opacity-40"
        >
          {r.hasCurrentRevision ? 'New revision' : 'Prepare outreach'}
        </button>
      ),
    },
  ];

  const campaignCols: ConsoleColumn<CampaignRowItem>[] = [
    { key: 'name', header: 'Campaign', mobilePrimary: true, render: (c) => <span className="font-medium text-zinc-950">{c.name}</span> },
    { key: 'status', header: 'Status', render: (c) => <InlineStatus label={c.status} tone="info" /> },
    { key: 'cpl', header: 'Cost / Lead', align: 'right', render: (c) => <span className="font-mono">{formatGbp(c.costPerLead)}</span> },
    { key: 'dispatched', header: 'Dispatched', align: 'right', render: (c) => <span className="font-mono">{c.dispatched}</span> },
    { key: 'replies', header: 'Replies', align: 'right', render: (c) => <span className="font-mono">{c.replies}</span> },
    { key: 'meetings', header: 'Meetings', align: 'right', render: (c) => <span className="font-mono">{c.meetings}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketing & Lead Sourcing"
        description="ICP targeting, prospect acquisition outreach preparation, discovery pipeline (mock), and CSV lead import."
      />

      <NoticeBanner
        tone="warning"
        message="Live automated sourcing APIs are not connected yet — CSV import is the active zero-API launch path."
      />

      <SectionCard
        title="Ideal Customer Profile (ICP) Builder"
        description="Select approved categories and origin regions to compute deterministic lead fit scores."
        actions={
          <InlineStatus
            label={icpValid ? 'ICP Valid' : 'ICP Incomplete'}
            tone={icpValid ? 'success' : 'danger'}
          />
        }
      >
        <div className="space-y-4 text-[13px]">
          <textarea
            value={icpDescription}
            onChange={(e) => onIcpDescriptionChange(e.target.value)}
            rows={2}
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
          />
          <div className="flex flex-wrap gap-1.5">
            {allCategories.map((cat) => {
              const active = icpCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onToggleCategory(cat)}
                  className={`px-2.5 py-1 rounded text-[12px] border ${
                    active
                      ? 'bg-zinc-950 text-white border-zinc-950'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {regionOptions.map((r) => {
              const active = icpRegions.includes(r.value);
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => onToggleRegion(r.value)}
                  className={`px-2.5 py-1 rounded text-[12px] border ${
                    active
                      ? 'bg-emerald-800 text-white border-emerald-800'
                      : 'bg-white text-zinc-600 border-zinc-200'
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      <MetricStrip items={metricStripItems} columns={6} />

      <SectionCard
        title="Acquisition pipeline (BI-derived)"
        description="Canonical prospects carried directly into outreach preparation. Review and approve recommendations in Brand Intelligence."
      >
        {acquisitionNotice && <div className="mb-3"><NoticeBanner tone="success" message={acquisitionNotice} /></div>}
        {acquisitionError && <div className="mb-3"><NoticeBanner tone="danger" message={acquisitionError} /></div>}
        <ConsoleTable
          rows={acquisitionRows}
          columns={acqCols}
          rowKey={(r) => r.prospectId}
          testId="acquisition-pipeline"
        />
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          title="Discovery engine (Mock)"
          description="Searches directory sources, enriches prospects, and enrols qualifying leads."
          actions={
            <button
              type="button"
              disabled={discoveryRunning || !icpValid}
              onClick={() => void onRunDiscovery()}
              className="px-3.5 py-1.5 rounded bg-zinc-950 text-white text-[12px] font-medium disabled:opacity-40"
            >
              {discoveryRunning ? 'Scanning…' : 'Run discovery pipeline'}
            </button>
          }
        >
          {discoverySummary ? (
            <div className="space-y-2 text-[13px]">
              <div className="font-mono text-[12px] text-zinc-700">
                Discovered {discoverySummary.discovered} · Enrolled {discoverySummary.enrolled} · Dropped{' '}
                {discoverySummary.dropped}
              </div>
              <ul className="divide-y divide-zinc-200 max-h-44 overflow-y-auto">
                {discoverySummary.leads.map((l, idx) => (
                  <li key={`${l.name}-${idx}`} className="py-1.5 flex justify-between text-[12px]">
                    <span className="font-medium text-zinc-900">{l.name}</span>
                    <InlineStatus
                      label={l.enrolled ? 'Enrolled' : l.reason ?? 'Dropped'}
                      tone={l.enrolled ? 'success' : 'neutral'}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-[13px] text-zinc-500">
              Run discovery to simulate trade-directory prospecting against your current ICP.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="CSV lead import"
          description="Zero-API launch ingestion (`company,persona,email,location,region,segment`)."
        >
          <div className="space-y-3 text-[13px]">
            <textarea
              value={csvDraft}
              onChange={(e) => setCsvDraft(e.target.value)}
              rows={3}
              placeholder="Acme Organics,Jane Doe,jane@acme.com,Austin TX,us,Health & Personal Care"
              className="w-full rounded border border-zinc-300 px-3 py-2 font-mono text-[12px]"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                disabled={!csvDraft.trim()}
                onClick={async () => {
                  await onImportCsv(csvDraft);
                  setCsvFeedback('CSV imported into acquisition pipeline.');
                  setCsvDraft('');
                }}
                className="px-3.5 py-1.5 rounded bg-[#C2410C] text-white text-[12px] font-medium disabled:opacity-40"
              >
                Import leads
              </button>
              {csvFeedback && <span className="text-[12px] text-emerald-800">{csvFeedback}</span>}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title={`Fit scoring — threshold ${fitThreshold}`}
        description={`${autoEnrollCount} lead(s) ready for auto-enrollment into the outreach sequence.`}
        actions={
          <button
            type="button"
            disabled={autoEnrollCount === 0 || !icpValid}
            onClick={onRunAutoEnroll}
            className="px-3 py-1.5 rounded border border-zinc-300 bg-white text-[12px] font-medium disabled:opacity-40"
          >
            Auto-enroll qualified ({autoEnrollCount})
          </button>
        }
      >
        <div className="divide-y divide-zinc-200 text-[13px]">
          {scoredLeads.slice(0, 8).map((l) => (
            <div key={l.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-medium text-zinc-950">{l.company}</div>
                <div className="text-[11px] font-mono text-zinc-500">
                  {l.region.toUpperCase()} · {l.segment} · {l.prospectId ?? 'unlinked'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <InlineStatus
                  label={`Fit ${l.fit}`}
                  tone={l.fit >= fitThreshold ? 'success' : 'neutral'}
                />
                <InlineStatus label={l.paused ? `Paused · ${l.stage}` : l.stage} tone="info" />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Outreach pipeline board & sequence"
        description="Sequences pause automatically whenever a lead replies."
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          {pipelineStages.map((stage) => {
            const stageLeads = pipelineLeads.filter((l) => l.outreachStatus === stage);
            return (
              <div key={stage} className="border border-zinc-200 rounded p-2.5 bg-zinc-50/50">
                <div className="flex justify-between text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500 mb-2">
                  <span>{stage}</span>
                  <span className="font-mono">{stageLeads.length}</span>
                </div>
                <div className="space-y-1.5">
                  {stageLeads.length === 0 ? (
                    <span className="text-[11px] text-zinc-400">Empty</span>
                  ) : (
                    stageLeads.map((l) => (
                      <div key={l.id} className="bg-white border border-zinc-200 rounded px-2 py-1 text-[12px]">
                        <div className="font-medium text-zinc-900 truncate">{l.company}</div>
                        <div className="font-mono text-[11px] text-zinc-500">fit {l.fitScore}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t border-zinc-200 pt-3 space-y-1.5 text-[12px]">
          {sequenceSteps.map((s) => (
            <div key={s.step} className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-zinc-500 w-14">Day {s.dayOffset}</span>
              <span className="font-medium text-zinc-900">{s.subjectTemplate}</span>
              <span className="text-zinc-500 ml-auto">{s.purpose}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Campaign performance">
        <ConsoleTable
          rows={campaigns}
          columns={campaignCols}
          rowKey={(c) => c.id}
          emptyTitle="No campaigns dispatched"
          emptyDescription="Dispatched campaigns will report metrics here."
        />
      </SectionCard>
    </div>
  );
}
