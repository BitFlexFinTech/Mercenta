import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useCanonicalStoreVersion } from '@/data/queries';
import { getProspects } from '@/data/prospectStore';
import { CsvImportAdapter } from '@/integrations/leadSourcing';
import {
  getAcquisitionSummary,
  listAcquisitionProspects,
  prepareOutreach,
  type AcquisitionProspectRow,
} from '@/lib/acquisition/outreachLifecycle';
import { createMockDiscoveryClients, runDiscoveryPipeline } from '@/lib/discovery/engine';
import { matchLeadsToProspects } from '@/lib/intelligence/prospectPipeline';
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
import { APPROVED_CATEGORIES, type Lead } from '@/types';
import { MarketingHubView } from './MarketingHubView';

const REGIONS: { value: Lead['region']; label: string }[] = [
  { value: 'us', label: 'US origin' },
  { value: 'eu', label: 'EU origin' },
  { value: 'uk', label: 'UK origin' },
  { value: 'africa', label: 'Africa origin' },
];

export function MarketingHubScreen() {
  const {
    leads,
    campaigns,
    updateLeadStatus,
    addLead,
    actingStaffId,
    canCurrentUserMutate,
    refreshLeadsFromProspects,
  } = useApp();
  const version = useCanonicalStoreVersion();

  const [icpDescription, setIcpDescription] = useState(
    'Premium organic and natural product brands already exporting, seeking UK retail placement'
  );
  const [icpCategories, setIcpCategories] = useState<string[]>(['Health & Personal Care']);
  const [icpRegions, setIcpRegions] = useState<Lead['region'][]>(['us', 'eu', 'uk', 'africa']);
  const [activeMetricFilter, setActiveMetricFilter] = useState<string | null>(null);
  const [acquisitionNotice, setAcquisitionNotice] = useState<string | null>(null);
  const [acquisitionError, setAcquisitionError] = useState<string | null>(null);
  const [discoveryRunning, setDiscoveryRunning] = useState(false);
  const [discoverySummary, setDiscoverySummary] = useState<{
    discovered: number;
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

  const scored = useMemo(
    () =>
      leads.map((lead) => ({
        lead,
        fit: icpValid ? scoreLeadFit(lead, icp) : 0,
      })),
    [leads, icp, icpValid]
  );

  const autoEnrollable = scored.filter(({ lead, fit }) =>
    shouldAutoEnroll(fit, lead.outreachStatus as PipelineStage)
  );

  const acqState = useMemo(() => {
    void version;
    const allRows: AcquisitionProspectRow[] = listAcquisitionProspects();
    const summary = getAcquisitionSummary();
    const metrics: {
      key: string;
      label: string;
      value: number;
      match: (r: AcquisitionProspectRow) => boolean;
    }[] = [
      { key: 'all', label: 'Prospects', value: allRows.length, match: () => true },
      {
        key: 'enrolled',
        label: 'In acquisition',
        value: summary.enrolled,
        match: (r) => r.stage !== 'not enrolled',
      },
      {
        key: 'awaiting',
        label: 'Awaiting approval',
        value: summary.awaitingApproval,
        match: (r) => r.stage === 'awaiting approval',
      },
      {
        key: 'approved',
        label: 'Approved',
        value: summary.approved,
        match: (r) => r.stage === 'approved',
      },
      { key: 'sent', label: 'Sent', value: summary.sent, match: (r) => r.stage === 'sent' },
      {
        key: 'opportunities',
        label: 'Opportunities',
        value: summary.opportunities,
        match: (r) => Boolean(r.opportunity),
      },
    ];
    const active = metrics.find((m) => m.key === activeMetricFilter) ?? null;
    const filtered = active ? allRows.filter(active.match) : allRows;
    return {
      metrics: metrics.map((m) => ({ key: m.key, label: m.label, value: m.value })),
      rows: filtered.map((r) => ({
        prospectId: r.prospect.id,
        brand: r.prospect.brand,
        category: r.prospect.category,
        scoreTotal: r.prospect.score.total,
        scoreTier: r.prospect.score.tier,
        leadId: r.lead?.id,
        region: r.region,
        stage: r.stage,
        hasCurrentRevision: Boolean(r.current),
        canPrepare:
          r.stage !== 'sent' && r.stage !== 'responded' && !r.opportunity,
      })),
    };
  }, [version, activeMetricFilter]);

  const actor = useMemo(
    () => ({ staffId: actingStaffId, canMutate: canCurrentUserMutate }),
    [actingStaffId, canCurrentUserMutate]
  );

  return (
    <MarketingHubView
      canMutate={canCurrentUserMutate}
      icpDescription={icpDescription}
      onIcpDescriptionChange={setIcpDescription}
      icpCategories={icpCategories}
      allCategories={[...APPROVED_CATEGORIES]}
      onToggleCategory={(cat) =>
        setIcpCategories((prev) =>
          prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
        )
      }
      icpRegions={icpRegions}
      regionOptions={REGIONS}
      onToggleRegion={(reg) =>
        setIcpRegions((prev) =>
          prev.includes(reg as Lead['region'])
            ? prev.filter((r) => r !== reg)
            : [...prev, reg as Lead['region']]
        )
      }
      icpValid={icpValid}
      acquisitionMetrics={acqState.metrics}
      activeMetricFilter={activeMetricFilter}
      onMetricFilterChange={setActiveMetricFilter}
      acquisitionRows={acqState.rows}
      onPrepareOutreach={(prospectId) => {
        const res = prepareOutreach(prospectId, actor, 'email');
        if (!res.ok) {
          setAcquisitionError(res.error);
          setAcquisitionNotice(null);
          return;
        }
        setAcquisitionError(null);
        setAcquisitionNotice('Outreach recommendation prepared — inspect it in Brand Intelligence.');
        void refreshLeadsFromProspects();
      }}
      acquisitionNotice={acquisitionNotice}
      acquisitionError={acquisitionError}
      discoveryRunning={discoveryRunning}
      onRunDiscovery={async () => {
        setDiscoveryRunning(true);
        const events: {
          name: string;
          enrolled: boolean;
          reason?: string;
          fitScore?: number;
          segment?: string;
        }[] = [];
        const result = await runDiscoveryPipeline(icpCategories, icpDescription, {
          clients: createMockDiscoveryClients(),
          minFitScore: 50,
          subjectTemplate: 'UK retail placement for {{company}}',
          onLead: (lead, enrolled, dropReason) => {
            events.push({
              name: lead.companyName,
              enrolled,
              reason: dropReason,
              fitScore: lead.fitScore,
              segment: lead.segment,
            });
          },
        });
        setDiscoveryRunning(false);
        setDiscoverySummary({ ...result, leads: events });
        for (const ev of events) {
          if (ev.enrolled) {
            addLead({
              id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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
      }}
      discoverySummary={discoverySummary}
      fitThreshold={FIT_THRESHOLD_PLACEHOLDER}
      autoEnrollCount={autoEnrollable.length}
      onRunAutoEnroll={() => {
        for (const { lead, fit } of autoEnrollable) {
          updateLeadStatus(lead.id, 'Sequenced', fit);
        }
      }}
      scoredLeads={scored.map(({ lead, fit }) => {
        const stage = lead.outreachStatus as PipelineStage;
        return {
          id: lead.id,
          company: lead.company,
          region: lead.region,
          segment: lead.segment,
          prospectId: lead.prospectId,
          fit,
          stage,
          paused: sequencePaused(stage) && !['Scraped', 'Enriched', 'Sequenced'].includes(stage),
        };
      })}
      onImportCsv={async (csv) => {
        const adapter = new CsvImportAdapter();
        await adapter.submitICP(icpDescription, {
          categories: icpCategories,
          regions: icpRegions,
          description: icpDescription,
        });
        const { leads: imported } = await adapter.fetchNewLeads(new Date().toISOString(), csv);
        matchLeadsToProspects(imported, getProspects()).forEach(addLead);
      }}
      pipelineStages={[...PIPELINE_STAGES]}
      pipelineLeads={leads.map((l) => ({
        id: l.id,
        company: l.company,
        outreachStatus: l.outreachStatus,
        fitScore: l.fitScore,
      }))}
      sequenceSteps={[...SEQUENCE_STEPS]}
      campaigns={campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        costPerLead: c.costPerLead,
        dispatched: c.dispatched,
        replies: c.replies,
        meetings: c.meetings,
      }))}
    />
  );
}
