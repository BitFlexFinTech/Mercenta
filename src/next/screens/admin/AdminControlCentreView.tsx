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
import { ConsoleHeader, MetricStrip } from '@/next/components/ConsolePrimitives';
import { ConsoleTabs, SectionCard } from '@/next/components/ConsoleCharts';
import type {
  ControlCentreModel,
  ControlCentreSection,
  ControlCentreSectionId,
} from '@/lib/commandCentre/controlCentre';

export interface AdminControlCentreViewProps {
  model: ControlCentreModel;
  sections: readonly ControlCentreSection[];
  activeSection: ControlCentreSectionId;
  onSelectSection: (id: ControlCentreSectionId) => void;
  onNavigate: (destination: string) => void;
}

const TONE_TEXT: Record<string, string> = {
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  info: 'text-sky-700',
  brass: 'text-amber-800',
  neutral: 'text-zinc-700',
};

const PRIORITY_TONE: Record<string, string> = {
  urgent: 'text-red-700',
  high: 'text-amber-700',
  normal: 'text-zinc-600',
};

export function AdminControlCentreView({
  model,
  sections,
  activeSection,
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