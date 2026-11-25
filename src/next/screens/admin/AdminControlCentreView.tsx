/**
 * §WAVE 3i (2026-11-25) — SUPER-ADMIN CONTROL CENTRE (presentation).
 *
 * Renders the model the platform ALREADY derives (`buildControlCentre`): the ten
 * declared capability areas, each with its own real metrics, plus the founder's
 * attention list and the model's own provenance list. NOTHING is computed here and no
 * figure is invented — every number arrives in the model, and every metric and
 * attention item carries the EXISTING destination it belongs to, so each one drills
 * into the record it came from.
 */
import { ConsoleHeader, ConsoleTable, MetricStrip, type ConsoleColumn } from '@/next/components/ConsolePrimitives';
import { ConsoleTabs, SectionCard } from '@/next/components/ConsoleCharts';
import { PanelCard, TONE_TEXT } from '@/next/components/ConsolePanels';
import type {
  CommercialReadinessQueueRow,
  ControlCentreModel,
  ControlCentreSection,
  ControlCentreSectionId,
  PreAuditQueueRow,
} from '@/lib/commandCentre/controlCentre';
import type { ControlPanel } from './controlCentrePanels';

export interface AdminControlCentreViewProps {
  model: ControlCentreModel;
  sections: readonly ControlCentreSection[];
  activeSection: ControlCentreSectionId;
  /** The specialised panels that belong to the active capability area. */
  sectionPanels: readonly ControlPanel[];
  onSelectSection: (id: ControlCentreSectionId) => void;
  onNavigate: (destination: string) => void;
}

const PRIORITY_TONE: Record<string, string> = {
  urgent: 'text-red-700',
  high: 'text-amber-700',
  normal: 'text-zinc-600',
};

/**
 * §WAVE 3j — a canonical queue drawn in full. `rows` ARE the model's own rows (the
 * owner's array, untouched), so the table can never show a curated subset: the
 * coverage gate compares this row count with the model's own count.
 * §WAVE 3k — the panel card itself moved to `@/next/components/ConsolePanels`, so the
 * three new super-admin surfaces reuse ONE renderer instead of copying it.
 */
function QueuePanel({ panel }: { panel: ControlPanel }) {
  const queue = panel.queue;
  if (!queue) return null;

  const footer = <p className="mt-2 text-ds-label text-zinc-500">Owned by {panel.owner}</p>;

  if (queue.kind === 'pre_audit') {
    const columns: ConsoleColumn<PreAuditQueueRow>[] = [
      { key: 'brand', header: 'Brand', mobilePrimary: true, render: (r) => (
        <div>
          <div className="text-zinc-950">{r.brand}</div>
          <div className="text-ds-label text-zinc-500">{r.website}</div>
        </div>
      ) },
      { key: 'category', header: 'Category', hideOnMobile: true, render: (r) => r.category },
      { key: 'presence', header: 'UK presence', render: (r) => r.presence },
      { key: 'qualification', header: 'Qualification', render: (r) => r.qualificationLabel },
      { key: 'mode', header: 'Research mode', hideOnMobile: true, render: (r) => r.researchMode },
      { key: 'questions', header: 'Open questions', align: 'right', render: (r) => r.openQuestions },
      { key: 'fed', header: 'Fed to pipeline', render: (r) => (r.fed ? `yes — ${r.fedProspectId}` : 'not yet') },
      { key: 'next', header: 'Recommended next step', hideOnMobile: true, render: (r) => r.recommendedNextStep },
    ];
    return (
      <SectionCard title={panel.title} description={panel.description} testId={`control-panel-${panel.id}`}>
        <ConsoleTable
          testId="control-queue-pre-audit"
          rows={queue.rows as PreAuditQueueRow[]}
          rowKey={(r) => r.assessmentId}
          emptyTitle="No pre-audit assessments yet"
          emptyDescription="An empty queue is the real state of these records, not a placeholder."
          columns={columns}
        />
        {footer}
      </SectionCard>
    );
  }

  const columns: ConsoleColumn<CommercialReadinessQueueRow>[] = [
    { key: 'product', header: 'Product', mobilePrimary: true, render: (r) => (
      <div>
        <div className="text-zinc-950">{r.product}</div>
        <div className="text-ds-label text-zinc-500">{r.productRef ?? r.recordId}</div>
      </div>
    ) },
    { key: 'brand', header: 'Brand', render: (r) => r.brandLabel },
    { key: 'route', header: 'Route', render: (r) => r.routeLabel },
    { key: 'owner', header: 'Who must act', render: (r) => r.ownerLabel },
    {
      key: 'why',
      header: 'Why it sits here',
      hideOnMobile: true,
      render: (r) =>
        r.unmet.length > 0
          ? r.unmet.map((u) => `${u.label} (observed ${u.observed})`).join('; ')
          : r.unevaluable.length > 0
            ? r.unevaluable.map((u) => `${u.label} — could not be evaluated: ${u.reason}`).join('; ')
            : r.missingInputs.length > 0
              ? `Missing input: ${r.missingInputs.join(', ')}`
              : 'No condition explains this state',
    },
    { key: 'next', header: 'Next step', hideOnMobile: true, render: (r) => r.nextStep },
    { key: 'due', header: 'SLA deadline', render: (r) => r.dueDate ?? 'not declared' },
    { key: 'work', header: 'Work item', render: (r) => r.workItemId ?? 'none raised' },
  ];

  return (
    <SectionCard title={panel.title} description={panel.description} testId={`control-panel-${panel.id}`}>
      <ConsoleTable
        testId="control-queue-commercial-readiness"
        rows={queue.rows as CommercialReadinessQueueRow[]}
        rowKey={(r) => r.recordId}
        emptyTitle="No commercial readiness records yet"
        emptyDescription="An empty queue is the real state of these records, not a placeholder."
        columns={columns}
      />
      {footer}
    </SectionCard>
  );
}

export function AdminControlCentreView({
  model,
  sections,
  activeSection,
  sectionPanels,
  onSelectSection,
  onNavigate,
}: AdminControlCentreViewProps) {
  const active = sections.find((section) => section.id === activeSection) ?? sections[0];
  const metrics = model.metrics[activeSection] ?? [];

  /* The headline figures, each drilling into the capability area that owns it. */
  const headline = [
    { id: 'brands', label: 'Brands', value: String(model.counts.brands), section: 'brands' as const },
    { id: 'active', label: 'Active brands', value: String(model.counts.activeBrands), section: 'brands' as const },
    { id: 'work', label: 'Open work', value: String(model.counts.openWork), section: 'operations' as const },
    { id: 'overdue', label: 'Overdue work', value: String(model.counts.overdueWork), section: 'operations' as const },
    { id: 'approvals', label: 'Approvals pending', value: String(model.counts.approvalsPending), section: 'audit' as const },
    { id: 'prospects', label: 'Prospects', value: String(model.counts.prospectsInPipeline), section: 'acquisition' as const },
  ];

  return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Operations Console"
        title="Control Centre"
        description="Ten capability areas, each with the figures its own records produce."
        meta={<span className="tabular-nums">Derived for {model.generatedFor}</span>}
      />

      <MetricStrip
        columns={6}
        items={headline.map((item) => ({
          id: item.id,
          label: item.label,
          value: item.value,
          onClick: () => onSelectSection(item.section),
          testId: `control-centre-${item.id}`,
        }))}
      />

      <ConsoleTabs
        ariaLabel="Control Centre areas"
        value={activeSection}
        onChange={onSelectSection}
        tabs={sections.map((section) => ({
          id: section.id,
          label: section.label,
          count: (model.metrics[section.id] ?? []).length,
        }))}
      />

      <div className="space-y-6">
        <SectionCard title={active.label} description={active.description}>
          <div className="mb-4">
            <button
              type="button"
              onClick={() => onNavigate(active.destination)}
              className="px-3 py-1.5 text-ds-label font-medium rounded-ds-md border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
            >
              Open {active.destination.replace(/_/g, ' ')} →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {metrics.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.destination)}
                data-testid={`control-metric-${item.id}`}
                className="text-left border border-zinc-200 rounded-ds-md p-3 bg-white hover:bg-zinc-50"
              >
                <div className="text-ds-label text-zinc-500">{item.label}</div>
                <div className="text-ds-heading font-semibold text-zinc-950 tabular-nums">
                  {item.value}
                </div>
                <div className={`text-ds-label font-medium ${TONE_TEXT[item.tone] ?? 'text-zinc-700'}`}>
                  {item.statusText}
                </div>
                <div className="mt-1 text-ds-label text-zinc-500">{item.context}</div>
                <div className="mt-2 text-ds-label text-zinc-400">
                  {item.destination.replace(/_/g, ' ')} →
                </div>
              </button>
            ))}
          </div>
        </SectionCard>

        {sectionPanels.length > 0 && (
          <div className="space-y-4" data-testid="control-panels">
            <div>
              <h2 className="text-ds-body font-semibold text-zinc-950">
                {active.label} — specialised panels
              </h2>
              <p className="mt-0.5 text-ds-label text-zinc-600 max-w-3xl">
                The sub-models this capability area&apos;s owner already derives, drawn in full. Each panel
                names the canonical module that produces its figures.
              </p>
            </div>
            {sectionPanels.map((panel) =>
              panel.queue ? <QueuePanel key={panel.id} panel={panel} /> : <PanelCard key={panel.id} panel={panel} />
            )}
          </div>
        )}

        <SectionCard
          title="Needs attention"
          description="Every item points at the real record that needs a decision."
        >
          {model.attention.length === 0 ? (
            <p className="text-ds-body text-zinc-600">
              Nothing is waiting on a decision. This is the real state of the records, not an
              optimistic summary.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200">
              {model.attention.map((item) => (
                <li key={item.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-ds-body text-zinc-950">{item.title}</div>
                    <div className="text-ds-label text-zinc-500">
                      {item.detail} · {item.source}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-ds-label font-medium ${PRIORITY_TONE[item.priority] ?? 'text-zinc-600'}`}>
                      {item.priority}
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate(item.destination)}
                      className="px-2.5 py-1 text-ds-label font-medium rounded-ds-md border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50"
                    >
                      Open →
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Where these figures come from"
          description="The provenance the model carries, shown rather than implied."
        >
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-ds-body">
            {model.dataSources.map((source) => (
              <div key={source.label} className="flex items-baseline justify-between gap-3">
                <dt className="text-zinc-600">{source.label}</dt>
                <dd className="font-medium text-zinc-950 text-right">{source.value}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>
      </div>
    </div>
  );
}