import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { APPROVED_CATEGORIES, type Lead } from '@/types';
import {
  FIT_THRESHOLD_PLACEHOLDER,
  PIPELINE_STAGES,
  SEQUENCE_STEPS,
  isValidICP,
  scoreLeadFit,
  sequencePaused,
  shouldAutoEnroll,
  type ICP,
  type PipelineStage,
} from '@/lib/marketing';
import { CsvImportAdapter } from '@/integrations/leadSourcing';
import { Card, Badge, Button, DataTable, Textarea } from '@/components/ui';
import { cn } from '@/utils/cn';
import { AlertTriangle, Info, Target, Upload, Compass, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { runDiscoveryPipeline, createMockDiscoveryClients, type EnrichedLead } from '@/lib/discovery/engine';
import { matchLeadsToProspects } from '@/lib/intelligence/prospectPipeline';
import { getProspects } from '@/data/prospectStore';
import { AcquisitionPipeline } from '@/components/admin/AcquisitionPipeline';

const REGIONS: { value: Lead['region']; label: string }[] = [
  { value: 'us', label: 'US origin' },
  { value: 'eu', label: 'EU origin' },
  // §Phase C — 7 of the 10 canonical BI prospects are UK-origin brands; without
  // a UK origin option they could never match an ICP region filter.
  { value: 'uk', label: 'UK origin' },
  { value: 'africa', label: 'Africa origin' },
];

const STAGE_COLORS: Record<string, string> = {
  Scraped: 'border-zinc-500/30',
  Enriched: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  Sequenced: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  Replied: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'Meeting Booked': 'bg-brass/15 text-brass border-brass/30',
};

export function MarketingHub() {
  const { leads, campaigns, updateLeadStatus, addLead } = useApp();

  // §7 ICP builder state
  const [icpDescription, setIcpDescription] = useState(
    'Premium organic and natural product brands already exporting, seeking UK retail placement'
  );
  const [icpCategories, setIcpCategories] = useState<string[]>(['Health & Personal Care']);
  const [icpRegions, setIcpRegions] = useState<Lead['region'][]>(['us', 'eu', 'uk', 'africa']);

  // §7 Discovery engine pipeline state
  const [discoveryRunning, setDiscoveryRunning] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<{
    discovered: number;
    enriched: number;
    enrolled: number;
    dropped: number;
    leads: { name: string; enrolled: boolean; reason?: string }[];
  } | null>(null);

  const icp: ICP = useMemo(
    () => ({
      description: icpDescription,
      categories: icpCategories.filter((c): c is never => c !== undefined) as ICP['categories'],
      regions: icpRegions,
    }),
    [icpDescription, icpCategories, icpRegions]
  );
  const icpValid = isValidICP(icp);

  /** Fit scores computed live against the current ICP. */
  const scored = useMemo(
    () =>
      leads.map((lead) => ({
        lead,
        fit: icpValid ? scoreLeadFit(lead, icp) : 0,
      })),
    [leads, icp, icpValid]
  );

  const autoEnrollable = scored.filter(
    ({ lead, fit }) => shouldAutoEnroll(fit, lead.outreachStatus as PipelineStage)
  );

  const runAutoEnroll = () => {
    for (const { lead, fit } of autoEnrollable) {
      if (shouldAutoEnroll(fit, lead.outreachStatus as PipelineStage)) {
        // §Phase A — persist the live-computed fit at the transition (it was
        // display-only before; downstream stages now see the true score).
        updateLeadStatus(lead.id, 'Sequenced', fit);
      }
    }
  };

  const importCsv = async (csv: string) => {
    const adapter = new CsvImportAdapter();
    await adapter.submitICP(icpDescription, {
      categories: icpCategories,
      regions: icpRegions,
      description: icpDescription,
    });
    const { leads: imported } = await adapter.fetchNewLeads(new Date().toISOString(), csv);
    // §Phase A — canonical identity bridge: ingested leads matching a BI
    // prospect inherit its id + category so identity survives ingestion.
    matchLeadsToProspects(imported, getProspects()).forEach(addLead);
  };

  /** Run the full discovery pipeline: directory → research → enrichment → email → enrol */
  const runDiscovery = async () => {
    setDiscoveryRunning(true);
    setDiscoveryResult(null);
    const events: { name: string; enrolled: boolean; reason?: string; fitScore?: number; segment?: string }[] = [];
    const clients = createMockDiscoveryClients();
    const result = await runDiscoveryPipeline(icpCategories, icpDescription, {
      clients,
      minFitScore: 50,
      subjectTemplate: 'UK retail placement for {{company}}',
      onLead: (lead, enrolled, dropReason) => {
        // §Phase A — carry the pipeline's REAL per-lead fit + segment instead
        // of discarding them (the old wire stored a hardcoded 85 + 'Home').
        events.push({ name: lead.companyName, enrolled, reason: dropReason, fitScore: lead.fitScore, segment: lead.segment });
      },
    });
    setDiscoveryRunning(false);
    setDiscoveryResult({ ...result, leads: events });
    // Enrol discovered leads into the marketing pipeline
    for (const ev of events) {
      if (ev.enrolled) {
        addLead({
          id: 'lead-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          persona: 'Brand contact',
          company: ev.name,
          location: 'UK',
          email: '',
          priority: 'Medium',
          outreachStatus: 'Sequenced',
          segment: ev.segment ?? icpCategories[0] ?? 'Home',
          fitScore: ev.fitScore ?? 85,
          region: 'eu',
        });
      }
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Header + caveat */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <Target className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Marketing</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Lead sourcing, ICP fit scoring and outreach sequencing
          </p>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-[11px] text-amber-200 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          Live automated sourcing is not wired yet — CSV import is the
          zero-API launch path today (Apollo.io / Instantly.ai are confirmed-API
          backups if wanted).
        </span>
      </div>

      {/* §7 ICP builder */}
      <Card title="ICP Builder">
        <div className="space-y-3 p-1">
          <Textarea
            label="Ideal customer description"
            value={icpDescription}
            onChange={(e) => setIcpDescription(e.target.value)}
            rows={2}
          />
          <div>
            <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
              Categories (approved list only — §13)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {APPROVED_CATEGORIES.map((cat) => {
                const active = icpCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() =>
                      setIcpCategories((prev) =>
                        active ? prev.filter((c) => c !== cat) : [...prev, cat]
                      )
                    }
                    className={cn(
                      'text-[10px] px-2 py-1 rounded-full border transition-colors',
                      active
                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        : 'border-white/[0.08] text-zinc-500 hover:border-white/20'
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-1.5">
              {REGIONS.map((r) => {
                const active = icpRegions.includes(r.value);
                return (
                  <button
                    key={r.value}
                    onClick={() =>
                      setIcpRegions((prev) =>
                        active ? prev.filter((x) => x !== r.value) : [...prev, r.value]
                      )
                    }
                    className={cn(
                      'text-[10px] px-2 py-1 rounded-full border transition-colors',
                      active
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'border-white/[0.08] text-zinc-500 hover:border-white/20'
                    )}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            <span
              className={cn(
                'text-[10px] font-mono',
                icpValid ? 'text-emerald-400' : 'text-red-400'
              )}
            >
              ICP {icpValid ? 'valid' : 'incomplete'}
            </span>
          </div>
        </div>
      </Card>

      {/* §Phase C — ICP consumption of the canonical BI prospects + outreach/approval */}
      <AcquisitionPipeline />

      {/* §7 Discovery Engine — trade-body directories → OpenRouter → Companies House → Hunter → Instantly */}
      <Card title="Discovery Engine" subtitle="Find brand partners via trade-body directories and enrichment">
        <div className="space-y-3 p-1">
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Searches ZimTrade, KEPROBA, GEPA, and US Commercial Service directories for matching
            brands, scores fit via OpenRouter, enriches with Companies House data, finds verified
            emails via Hunter, and enrolls qualifying leads into the outreach sequence.
            <span className="block mt-1 text-amber-400">Mock mode active — real credentials needed for live data.</span>
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={runDiscovery} disabled={discoveryRunning || !icpValid}>
              {discoveryRunning ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Running pipeline…</>
              ) : (
                <><Compass className="w-3.5 h-3.5 mr-1.5" /> Run Discovery Pipeline</>
              )}
            </Button>
            {discoveryResult && (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-white font-medium">{discoveryResult.discovered} discovered</span>
                <span className="text-emerald-400">{discoveryResult.enrolled} enrolled</span>
                {discoveryResult.dropped > 0 && <span className="text-red-400">{discoveryResult.dropped} dropped</span>}
              </div>
            )}
          </div>
          {discoveryResult && discoveryResult.leads.length > 0 && (
            <div className="border border-white/[0.06] rounded-lg divide-y divide-white/[0.04] max-h-48 overflow-y-auto">
              {discoveryResult.leads.map((l, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-zinc-300">{l.name}</span>
                  {l.enrolled ? (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Enrolled
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> {l.reason ?? 'Dropped'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Fit scoring summary + auto-enroll */}
      <Card title={`Fit Scoring — threshold ${FIT_THRESHOLD_PLACEHOLDER}`}>
        <div className="flex items-center justify-between px-1 pb-3">
          <span className="text-xs text-zinc-500">
            {autoEnrollable.length} lead(s) above threshold ready for auto-enrollment
          </span>
          <Button
            onClick={runAutoEnroll}
            disabled={autoEnrollable.length === 0 || !icpValid}
            className="text-xs"
          >
            Auto-enroll qualified ({autoEnrollable.length})
          </Button>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {scored.slice(0, 6).map(({ lead, fit }) => {
            const stage = lead.outreachStatus as PipelineStage;
            const paused = sequencePaused(stage);
            return (
              <div key={lead.id} className="flex items-center justify-between px-1 py-2">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate">{lead.company}</div>
                  <div className="text-[10px] text-zinc-600 font-mono">
                    {lead.region.toUpperCase()} · {lead.segment}
                    {/* §Phase C — canonical Brand Intelligence identity carried by the lead */}
                    {lead.prospectId ? ` · BI ${lead.prospectId}` : ' · unlinked'}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    className={cn(
                      'text-[10px] font-mono',
                      fit >= FIT_THRESHOLD_PLACEHOLDER
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                        : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
                    )}
                  >
                    fit {fit}
                  </Badge>
                  <Badge className={cn('text-[10px]', STAGE_COLORS[stage])}>
                    {paused && paused === sequencePaused(stage) && stage !== 'Scraped' && stage !== 'Enriched' && stage !== 'Sequenced'
                      ? `⏸ ${stage}`
                      : stage}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* CSV import */}
      <Card title="Lead Sourcing — CSV Import (zero-API launch path)">
        <CsvImport onImport={importCsv} />
      </Card>

      {/* §7 Pipeline board */}
      <Card title="Lead Pipeline">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = leads.filter(
              (l) => (l.outreachStatus as PipelineStage) === stage
            );
            return (
              <div key={stage} className="bg-ink-900 border border-white/[0.05] rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium text-zinc-400">{stage}</span>
                  <span className="font-mono text-[10px] text-zinc-600">
                    {stageLeads.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-white/[0.03] rounded-md px-2 py-1.5 border border-white/[0.04]"
                    >
                      <div className="text-[11px] font-medium text-white truncate">
                        {lead.company}
                      </div>
                      <div className="font-mono text-[9px] text-zinc-600 mt-0.5">
                        fit {lead.fitScore}
                      </div>
                    </div>
                  ))}
                  {stageLeads.length === 0 && (
                    <p className="text-[10px] text-zinc-700 italic">empty</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2.5 text-[10px] text-blue-200 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          Sequence pauses automatically the moment a lead replies — replied and
          booked leads never receive automated follow-ups.
        </div>
      </Card>

      {/* Sequence reference */}
      <Card title="Outreach Sequence (auto — pauses on reply)">
        <div className="space-y-1.5 px-1 pb-1">
          {SEQUENCE_STEPS.map((step) => (
            <div key={step.step} className="flex items-center gap-3 text-xs">
              <Badge className="text-[10px] bg-white/[0.05] text-zinc-300 border-white/[0.08]">
                Day {step.dayOffset}
              </Badge>
              <span className="text-zinc-300">{step.subjectTemplate}</span>
              <span className="ml-auto text-[10px] text-zinc-600">{step.purpose}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Campaign performance — canonical DataTable (cards below md). */}
      <Card title="Campaign Performance">
        <DataTable
          dataTable="campaign-performance"
          caption="Campaign performance"
          rows={campaigns}
          rowKey={(camp) => camp.id}
          emptyMessage="No campaigns have been dispatched yet."
          columns={[
            {
              key: 'name',
              label: 'Campaign',
              primary: true,
              render: (camp) => <span className="text-xs text-white">{camp.name}</span>,
            },
            {
              key: 'status',
              label: 'Status',
              render: (camp) => (
                <Badge className="text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/20">
                  {camp.status}
                </Badge>
              ),
            },
            {
              key: 'costPerLead',
              label: 'Cost/Lead',
              align: 'right',
              hideBelow: 'lg',
              render: (camp) => <span className="font-mono text-xs">£{camp.costPerLead}</span>,
            },
            {
              key: 'dispatched',
              label: 'Dispatched',
              align: 'right',
              render: (camp) => <span className="font-mono text-xs">{camp.dispatched}</span>,
            },
            {
              key: 'replies',
              label: 'Replies',
              align: 'right',
              render: (camp) => <span className="font-mono text-xs">{camp.replies}</span>,
            },
            {
              key: 'meetings',
              label: 'Meetings',
              align: 'right',
              hideBelow: 'lg',
              render: (camp) => <span className="font-mono text-xs">{camp.meetings}</span>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

function CsvImport({ onImport }: { onImport: (csv: string) => void }) {
  const [csv, setCsv] = useState('');
  const [result, setResult] = useState<string | null>(null);

  return (
    <div className="space-y-3 p-1">
      <Textarea
        label="Paste CSV (company,persona,email,location,region,segment)"
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={4}
        placeholder={'Acme Organics,Jane Doe,jane@acme.com,Austin TX,us,Organic Food'}
      />
      <Button
        onClick={async () => {
          await onImport(csv);
          setResult('CSV imported into pipeline.');
          setCsv('');
        }}
        disabled={!csv.trim()}
        className="text-xs"
      >
        <Upload className="w-3.5 h-3.5 mr-1.5" /> Import leads
      </Button>
      {result && <p className="text-[11px] text-emerald-400">{result}</p>}
    </div>
  );
}
