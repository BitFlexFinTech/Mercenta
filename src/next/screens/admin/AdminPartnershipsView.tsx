/**
 * §WAVE 3k (2026-11-25) — PARTNERSHIPS & FUNDRAISING (presentation).
 *
 * Renders the three models its screen derives, through the SHARED panel renderer
 * (`@/next/components/ConsolePanels`). No figure is computed here: every row is a
 * field the owner produced, or a `.length` of an array it produced. The surface states
 * the position the platform is actually in — including the zeroes — because the
 * financing-partner universe holds no real provider today.
 */
import { ConsoleHeader, MetricStrip } from '@/next/components/ConsolePrimitives';
import { SectionCard } from '@/next/components/ConsoleCharts';
import { PanelCard, type PanelSpec, type PanelRow } from '@/next/components/ConsolePanels';
import type { PartnershipsModel } from './AdminPartnershipsScreen';

export interface AdminPartnershipsViewProps {
  model: PartnershipsModel;
  onNavigate: (viewId: string) => void;
}

const count = (n: number) => n.toLocaleString('en-GB');
const humanise = (id: string) => id.replace(/_/g, ' ');
const yesNo = (v: boolean) => (v ? 'YES' : 'NO');
const refuseOrAllow = (refusal: unknown) => (refusal ? 'REFUSED' : 'allowed');
const day = (n: number) => `Day ${count(n)}`;

const row = (label: string, value: string, tone?: PanelRow['tone'], note?: string): PanelRow => ({
  label,
  value,
  tone,
  note,
});

function buildPanels(model: PartnershipsModel): PanelSpec[] {
  const { universe: u, outreach: o, lifecycle: l } = model;

  return [
    {
      id: 'partnerships-universe',
      title: 'Financing-partner universe',
      description:
        'The real universe, with the research discipline applied: a provider may enter only with a named, published source and a last-researched date. An unsourced or undated entry, and an illustrative placeholder, are refused.',
      owner: 'src/config/financierUniverse.ts + src/lib/finance/financierUniverse.ts',
      groups: [
        {
          label: 'Position',
          rows: [
            row(
              'Real providers today',
              count(u.realCount),
              u.realCount > 0 ? 'success' : 'warning',
              u.realCount === 0
                ? 'Zero. Nothing is invented to fill the universe — the surface states the gap.'
                : undefined
            ),
            row('Provider types declared', count(u.providerTypes.length)),
            row('Markets declared', count(u.markets.length)),
            row('Illustrative placeholders held', count(u.illustrativeCount), 'warning'),
            row('Placeholders allowed', count(u.allowedCount), u.allowedCount > 0 ? 'neutral' : 'success'),
            row('Placeholders refused', count(u.refusedCount), u.refusedCount > 0 ? 'success' : 'warning'),
            row('One owner', yesNo(u.oneOwner), u.oneOwner ? 'success' : 'danger'),
            row('Requires a named source', yesNo(u.requiresNamedSource), u.requiresNamedSource ? 'success' : 'danger'),
            row(
              'Requires a last-researched date',
              yesNo(u.requiresResearchDate),
              u.requiresResearchDate ? 'success' : 'danger'
            ),
            row('Fails closed', yesNo(u.failsClosed), u.failsClosed ? 'success' : 'danger'),
          ],
        },
        { label: 'Provider types', rows: u.providerTypes.map((t) => row(t.label, t.id, 'neutral', t.description)) },
        { label: 'Markets', rows: u.markets.map((m) => row(m.label, m.id, 'neutral')) },
        {
          label: 'The full record a REAL provider must carry',
          rows: u.recordFields.map((f) =>
            row(
              f.label,
              f.requiredForRealEntry ? 'required for a real entry' : 'optional',
              f.requiredForRealEntry ? 'info' : 'neutral',
              f.requirement
            )
          ),
        },
        {
          label: 'Placeholders and the decision on each (computed, not written)',
          rows: u.illustrative.map((p) =>
            row(
              p.legalName,
              p.allowed ? 'allowed' : 'REFUSED',
              p.allowed ? 'success' : 'warning',
              `${p.providerTypeLabel} · ${p.marketLabels.join(', ') || 'no market'} · ${p.reason}`
            )
          ),
        },
        {
          label: 'Fail-closed proof (computed when the model is built, not written)',
          rows: [
            row(
              u.exampleRefusal.legalName,
              refuseOrAllow(u.exampleRefusal.refusal),
              u.exampleRefusal.refusal ? 'success' : 'danger',
              u.exampleRefusal.reason
            ),
          ],
        },
        {
          label: 'How a provider is judged',
          rows: u.rules.map((r, i) => row(`Rule ${i + 1}`, r, 'neutral')),
        },
      ],
    },
    {
      id: 'partnerships-outreach',
      title: 'Founder outreach pipeline',
      description:
        'The ordered approach Mercenta runs over that universe, with a deterministic follow-up cadence in day offsets. Outreach starts at the target stage and is forward-only: a follow-up requires an earlier contact, and an unknown channel, type or stage is refused.',
      owner: 'src/config/founderOutreach.ts + src/lib/finance/founderOutreach.ts',
      groups: [
        {
          label: 'Pipeline',
          rows: [
            row('Entry stage', o.entryStage.label),
            row('Contacted stage', o.contactedStage.label),
            row('Engaged stage', o.engagedStage.label),
            row('Channels declared', count(o.channels.length)),
            row('Touchpoint types declared', count(o.touchpointTypes.length)),
            row('Cadence steps', count(o.cadenceCount)),
            row('One owner', yesNo(o.oneOwner), o.oneOwner ? 'success' : 'danger'),
            row(
              'References the declared channels',
              yesNo(o.referencesDeclaredChannels),
              o.referencesDeclaredChannels ? 'success' : 'danger'
            ),
            row('Forward-only', yesNo(o.forwardOnly), o.forwardOnly ? 'success' : 'danger'),
            row(
              'A follow-up requires an earlier contact',
              yesNo(o.followUpRequiresContact),
              o.followUpRequiresContact ? 'success' : 'danger'
            ),
            row(
              'Requires the target stage',
              yesNo(o.requiresTargetStage),
              o.requiresTargetStage ? 'success' : 'danger'
            ),
            row(
              'Cadence is strictly increasing',
              yesNo(o.cadenceStrictlyIncreasing),
              o.cadenceStrictlyIncreasing ? 'success' : 'danger'
            ),
          ],
        },
        { label: 'Channels', rows: o.channels.map((c) => row(c.label, c.id, 'neutral', c.description)) },
        {
          label: 'Touchpoint types, in order',
          rows: o.touchpointTypes.map((t) =>
            row(
              t.label,
              t.advancesPipeline ? 'advances the pipeline' : 'does not advance',
              t.advancesPipeline ? 'info' : 'neutral',
              t.description
            )
          ),
        },
        {
          label: 'The cadence (day offsets from the first approach)',
          rows: o.cadence.map((c) => row(day(c.dayOffset), c.typeLabel, 'neutral', humanise(c.id))),
        },
        {
          label: 'Labelled touchpoints and the decision on each (computed, not written)',
          rows: o.demoTouchpoints.map((t) =>
            row(
              `${t.providerLabel} — ${t.channelLabel}`,
              t.allowed ? 'allowed' : 'REFUSED',
              t.allowed ? 'success' : 'warning',
              `${t.typeLabel} on ${day(t.dayOffset).toLowerCase()} · stage ${t.providerStageLabel}${
                t.illustrative ? ' · ILLUSTRATIVE' : ''
              }${t.allowed ? '' : ' · the resolver REFUSED it'}`
            )
          ),
        },
        {
          label: 'Basis',
          rows: [row('What this means', o.basis, 'neutral'), row('Disclaimer', o.disclaimer, 'warning')],
        },
      ],
    },
    {
      id: 'partnerships-lifecycle',
      title: 'Financier lifecycle',
      description:
        'The forward-only, fail-closed state machine a financing partner moves through. The active-partner stage is reachable ONLY through a completed pilot — a provider is never marked active merely because it was researched.',
      owner: 'src/config/financierLifecycle.ts + src/lib/finance/financierLifecycle.ts',
      groups: [
        {
          label: 'The machine',
          rows: [
            row('Stages on the forward path', count(l.stageCount)),
            row('Off-ramps', count(l.offRamps.length), 'neutral', 'Reachable from any active stage.'),
            row('Candidates held', count(l.candidateCount)),
            row('Active partners', count(l.activeCount), l.activeCount > 0 ? 'success' : 'neutral'),
            row('Researched today', count(l.researchedCount), 'info'),
            row('One owner', yesNo(l.oneOwner), l.oneOwner ? 'success' : 'danger'),
            row('Forward-only', yesNo(l.forwardOnly), l.forwardOnly ? 'success' : 'danger'),
            row(
              'Active requires a completed pilot',
              yesNo(l.activeRequiresPilot),
              l.activeRequiresPilot ? 'success' : 'danger'
            ),
            row(
              'Off-ramps reachable from any active stage',
              yesNo(l.offRampsFromAnyActiveStage),
              l.offRampsFromAnyActiveStage ? 'success' : 'danger'
            ),
          ],
        },
        { label: 'Forward path, in order', rows: l.stages.map((s) => row(s.label, humanise(s.id), 'neutral')) },
        { label: 'Off-ramps', rows: l.offRamps.map((s) => row(s.label, humanise(s.id), 'warning')) },
        {
          label: 'Candidates and where each may go next',
          rows: l.candidates.map((c) =>
            row(
              c.label,
              c.stageLabel,
              c.illustrative ? 'warning' : 'info',
              `${c.illustrative ? 'ILLUSTRATIVE — not a real provider. ' : ''}May move to: ${
                c.nextStages.map((n) => n.label).join(', ') || 'nothing'
              }`
            )
          ),
        },
        {
          label: 'Basis',
          rows: [row('What this means', l.basis, 'neutral'), row('Disclaimer', l.disclaimer, 'warning')],
        },
      ],
    },
  ];
}

export function AdminPartnershipsView({ model, onNavigate }: AdminPartnershipsViewProps) {
  const panels = buildPanels(model);
  const { universe: u, outreach: o, lifecycle: l } = model;

  return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Founder"
        title="Partnerships & Fundraising"
        description="The financing partners Mercenta has actually researched, the approach it runs over them, and the state each relationship has really reached."
        meta={
          <span>
            {u.realCount === 0
              ? 'No real provider is recorded yet'
              : `${count(u.realCount)} real provider(s)`}
          </span>
        }
      />

      <MetricStrip
        columns={6}
        items={[
          {
            id: 'real-providers',
            label: 'Real providers',
            value: count(u.realCount),
            context: 'nothing invented',
            onClick: () => onNavigate('control_centre'),
            testId: 'partnerships-real-providers',
          },
          {
            id: 'placeholders-refused',
            label: 'Placeholders refused',
            value: count(u.refusedCount),
            context: 'the rule firing',
            onClick: () => onNavigate('control_centre'),
            testId: 'partnerships-placeholders-refused',
          },
          {
            id: 'cadence',
            label: 'Outreach cadence',
            value: count(o.cadenceCount),
            context: 'day offsets',
            onClick: () => onNavigate('control_centre'),
            testId: 'partnerships-cadence',
          },
          {
            id: 'touchpoints-allowed',
            label: 'Touchpoints allowed',
            value: count(o.allowedCount),
            context: `${count(o.refusedCount)} refused`,
            onClick: () => onNavigate('control_centre'),
            testId: 'partnerships-touchpoints-allowed',
          },
          {
            id: 'lifecycle-stages',
            label: 'Lifecycle stages',
            value: count(l.stageCount),
            context: `${count(l.offRamps.length)} off-ramps`,
            onClick: () => onNavigate('control_centre'),
            testId: 'partnerships-lifecycle-stages',
          },
          {
            id: 'active-partners',
            label: 'Active partners',
            value: count(l.activeCount),
            context: 'a completed pilot is required',
            onClick: () => onNavigate('control_centre'),
            testId: 'partnerships-active-partners',
          },
        ]}
      />

      <div className="space-y-4" data-testid="partnerships-panels">
        {panels.map((panel) => (
          <PanelCard key={panel.id} panel={panel} />
        ))}
      </div>

      <div className="mt-4">
        <SectionCard
          title="What this surface never does"
          description="Stated so it cannot be mistaken for a capability."
        >
          <ul className="list-disc pl-5 space-y-1 text-ds-body text-secondary">
            <li>
              It never marks a provider active because it was researched — the active stage is reachable only
              through a completed pilot.
            </li>
            <li>
              It never records an application as submitted. Generating a draft may be automated; the founder
              approves and submits personally.
            </li>
            <li>
              It never shows a financing figure to a brand — the whole surface is super-admin only, and the
              brand portal has no route to it.
            </li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
