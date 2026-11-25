/**
 * §WAVE 3k (2026-11-25) — FOUNDER INVESTOR CENTRE (presentation).
 *
 * Renders what its screen derives, through the shared panel renderer. No figure is
 * computed here. The surface is deliberately explicit about what has NOT happened: no
 * application is submitted, no term is verified by the founder, and nothing here claims
 * a partnership.
 */
import { ConsoleHeader, MetricStrip } from '@/next/components/ConsolePrimitives';
import { SectionCard } from '@/next/components/ConsoleCharts';
import { PanelCard, type PanelSpec, type PanelRow } from '@/next/components/ConsolePanels';
import { CLAIM_LABELS } from '@/lib/intelligence/opportunityDiscovery';
import { FUNDING_OPPORTUNITY_TYPE_LABELS } from '@/lib/founder/fundingPipeline';
import type { FounderCentreModel } from './AdminFounderCentreScreen';

export interface AdminFounderCentreViewProps {
  model: FounderCentreModel;
  onNavigate: (viewId: string) => void;
}

const count = (n: number) => n.toLocaleString('en-GB');
const money = (n: number) => `£${Math.round(n).toLocaleString('en-GB')}`;
const pct = (n: number, dp = 1) => `${n.toFixed(dp)}%`;
const yesNo = (v: boolean) => (v ? 'YES' : 'NO');
const humanise = (id: string) => id.replace(/_/g, ' ');

const row = (label: string, value: string, tone?: PanelRow['tone'], note?: string): PanelRow => ({
  label,
  value,
  tone,
  note,
});

/** A researched claim must NEVER be quoted without its class and its source. */
const claimText = (claim: { value: string } | null) => (claim ? claim.value : 'the research states none — never invented');

const claimNote = (claim: { claim: string; source: string } | null) =>
  claim
    ? `${CLAIM_LABELS[claim.claim as keyof typeof CLAIM_LABELS] ?? humanise(claim.claim)} · ${claim.source}`
    : 'No sourced figure exists, so none is shown.';

function buildPanels(model: FounderCentreModel): PanelSpec[] {
  const { opportunities, pipeline, summary, stageLabels } = model;

  return [
    {
      id: 'founder-opportunities',
      title: 'Founder funding opportunities',
      description:
        'The routes the founder intends to work, with the research discipline applied: every figure states what kind of claim it is and where it came from, and no term is presented as verified.',
      owner: 'src/lib/founder/fundingPipeline.ts (FOUNDER_FUNDING_OPPORTUNITIES)',
      groups: [
        {
          label: 'Position',
          rows: [
            row('Opportunities declared', count(opportunities.length)),
            row(
              'Verified by the founder',
              count(opportunities.filter((o) => o.verifiedByFounder).length),
              'warning',
              'Zero — the founder has not confirmed the current terms.'
            ),
            row(
              'Submissions claimed',
              count(opportunities.filter((o) => o.submissionClaimed).length),
              'warning',
              'Zero — no application has been submitted to any programme.'
            ),
          ],
        },
        ...opportunities.map((o) => ({
          label: `${o.organisation} — ${FUNDING_OPPORTUNITY_TYPE_LABELS[o.opportunityType]}`,
          rows: [
            row('Geography', o.geography),
            row('Funding amount', claimText(o.fundingAmount), 'info', claimNote(o.fundingAmount)),
            row('Equity terms', claimText(o.equityTerms), 'info', claimNote(o.equityTerms)),
            row('Eligibility', o.eligibility.value, 'neutral', claimNote(o.eligibility)),
            row(
              'Application deadline',
              o.applicationDeadline ?? 'none stated by the research',
              o.applicationDeadline ? 'info' : 'warning',
              'Verify the current deadline on the programme’s own site before relying on it.'
            ),
            row(
              'Required documents',
              `${count(o.requiredDocuments.length)}: ${o.requiredDocuments.join(' · ')}`
            ),
            row('Next action', o.nextAction, 'info'),
          ],
        })),
      ],
    },
    {
      id: 'funding-pipeline',
      title: 'Application pipeline',
      description:
        'Where each application has actually reached. A stage after submission is never reachable by inference — it requires the founder’s own record of what happened.',
      owner: 'src/lib/founder/fundingPipeline.ts (getFundingPipeline · fundingPipelineSummary)',
      groups: [
        {
          label: 'Position',
          rows: [
            row('Applications tracked', count(summary.total)),
            row(
              'Submissions recorded by the founder',
              count(summary.recordedSubmissions),
              summary.recordedSubmissions > 0 ? 'success' : 'warning',
              summary.recordedSubmissions === 0 ? 'Zero — nothing has been submitted.' : undefined
            ),
            row(
              'Waiting for the founder’s approval',
              summary.awaitingFounderApproval.length === 0 ? 'none' : summary.awaitingFounderApproval.join(', '),
              summary.awaitingFounderApproval.length > 0 ? 'warning' : 'neutral'
            ),
            row(
              'Approved but not yet submitted',
              summary.approvedNotYetSubmitted.length === 0 ? 'none' : summary.approvedNotYetSubmitted.join(', '),
              'neutral'
            ),
            row(
              'Generating a draft may be automated',
              yesNo(model.generationIsAutomated),
              'info',
              'It has no external effect — it writes a document; it sends nothing.'
            ),
            row(
              'Submitting is the founder’s own action',
              yesNo(model.submissionIsAFounderAction),
              model.submissionIsAFounderAction ? 'success' : 'danger'
            ),
          ],
        },
        {
          label: 'Every stage, and how many applications sit in it',
          rows: model.stages.map((s) => {
            const n = summary.byStage[s as keyof typeof summary.byStage] ?? 0;
            return row(
              stageLabels[s] ?? humanise(s),
              count(n),
              n > 0 ? 'info' : 'neutral',
              model.postSubmissionStages.includes(s)
                ? 'A post-submission stage: reachable only from the founder’s own record.'
                : undefined
            );
          }),
        },
        {
          label: 'Each application and the one next action',
          rows: pipeline.map((e) =>
            row(
              opportunities.find((o) => o.id === e.opportunityId)?.organisation ?? e.opportunityId,
              stageLabels[e.stage] ?? humanise(e.stage),
              e.submission ? 'success' : e.approval ? 'info' : 'neutral',
              `${e.nextAction}${e.approval ? ` · approved by ${e.approval.approvedBy} on ${e.approval.approvedAt}` : ''}${
                e.submission
                  ? ` · submission ${e.submission.reference} recorded by ${e.submission.recordedBy} on ${e.submission.submittedAt}`
                  : ''
              }`
            )
          ),
        },
        { label: 'Disclaimer', rows: [row('How this pipeline works', model.disclaimer, 'warning')] },
      ],
    },
    {
      id: 'capital-requirement',
      title: 'Internal capital requirement (Model B)',
      description:
        'The capital the financed purchases need, what has been drawn, the fees, and whether the draw fits inside the facility. An over-committed facility is STATED, never clamped to zero.',
      owner: 'src/config/financing.ts + src/lib/finance/capitalRequirement.ts',
      groups: [
        {
          label: 'Facility',
          rows: [
            row(
              'Facility terms configured',
              yesNo(model.capitalRequirement.configured),
              model.capitalRequirement.configured ? 'success' : 'warning',
              model.capitalRequirement.configured
                ? undefined
                : 'The terms are an illustration until a real facility is agreed.'
            ),
            row('Currency', model.capitalRequirement.currency),
            row('Financed purchases', count(model.capitalRequirement.outstandingFinancedPurchases)),
            row('Capital required', money(model.capitalRequirement.totalRequiredFundingGbp)),
            row('Advance drawn', money(model.capitalRequirement.totalAdvanceDrawnGbp)),
            row('Financing fees', money(model.capitalRequirement.totalFinancingFeesGbp)),
            row(
              'Available capital after the draw',
              money(model.capitalRequirement.availableCapitalAfterGbp),
              model.capitalRequirement.availableCapitalAfterGbp < 0 ? 'danger' : 'success',
              model.capitalRequirement.availableCapitalAfterGbp < 0
                ? 'NEGATIVE — the facility is over-committed. Stated, not hidden.'
                : undefined
            ),
            row(
              'Facility utilisation',
              pct(model.capitalRequirement.facilityUtilisationPct),
              model.capitalRequirement.withinCapacity ? 'success' : 'danger'
            ),
            row(
              'Draw fits inside the facility',
              yesNo(model.capitalRequirement.withinCapacity),
              model.capitalRequirement.withinCapacity ? 'success' : 'danger'
            ),
            row(
              'Concentration limit breaches',
              count(model.capitalRequirement.concentrationBreaches.length),
              model.capitalRequirement.concentrationBreaches.length > 0 ? 'danger' : 'success'
            ),
          ],
        },
        { label: 'Basis', rows: [row('What these figures mean', model.capitalRequirement.basis, 'neutral')] },
      ],
    },
    {
      id: 'financing-routing',
      title: 'Financing router',
      description:
        'Each financed purchase is routed to exactly one route — self-funded, a facility draw or an external referral — by the one deterministic router. No AI decides a route.',
      owner: 'src/config/financingRouter.ts + src/lib/finance/financingRouter.ts',
      groups: [
        {
          label: 'Routing',
          rows: [
            row(
              'Routing configured',
              yesNo(model.financingRouting.configured),
              model.financingRouting.configured ? 'success' : 'warning'
            ),
            row('Routes declared', count(model.financingRouting.routes.length)),
            row('Decisions made', count(model.financingRouting.decisions.length)),
            row('Self-funded', count(model.financingRouting.selfFundedCount), 'success'),
            row('Facility draw', count(model.financingRouting.facilityDrawCount), 'info'),
            row('External referral', count(model.financingRouting.externalReferralCount), 'info'),
            row(
              'Refused — queued for a human',
              count(model.financingRouting.refusedCount),
              model.financingRouting.refusedCount > 0 ? 'warning' : 'success',
              'A purchase the gateway refuses to route is never forced into a route.'
            ),
            row('Advance routed', money(model.financingRouting.totalAdvanceRoutedGbp)),
          ],
        },
        {
          label: 'By route',
          rows: model.financingRouting.byRoute.map((b) =>
            row(b.label, `${count(b.count)} · ${money(b.advanceGbp)} advance`, b.count > 0 ? 'info' : 'neutral')
          ),
        },
        {
          label: 'Basis',
          rows: [
            row('What these figures mean', model.financingRouting.basis, 'neutral'),
            row('Disclaimer', model.financingRouting.disclaimer, 'warning'),
          ],
        },
      ],
    },
    {
      id: 'pitch-workspace',
      title: 'Founder capital / pitch workspace',
      description:
        'The ordered sections prepared for a financing partner. AI may help write the narrative; every financial number comes from its deterministic canonical owner, and readiness requires every required section.',
      owner: 'src/config/pitchWorkspace.ts + src/lib/finance/pitchWorkspace.ts',
      groups: [
        {
          label: 'Workspace',
          rows: [
            row('Sections', count(model.pitchWorkspace.sectionCount)),
            row('Required sections', count(model.pitchWorkspace.requiredCount)),
            row('Financial sections', count(model.pitchWorkspace.financialCount), 'info'),
            row('Narrative sections', count(model.pitchWorkspace.narrativeCount)),
            row('Sections AI may draft', count(model.pitchWorkspace.aiDraftableCount), 'info', 'Narrative only — never a figure.'),
            row('One owner', yesNo(model.pitchWorkspace.oneOwner), model.pitchWorkspace.oneOwner ? 'success' : 'danger'),
            row(
              'Sections are canonical',
              yesNo(model.pitchWorkspace.sectionsCanonical),
              model.pitchWorkspace.sectionsCanonical ? 'success' : 'danger'
            ),
            row(
              'Every financial number is deterministic',
              yesNo(model.pitchWorkspace.financialsDeterministic),
              model.pitchWorkspace.financialsDeterministic ? 'success' : 'danger'
            ),
            row(
              'Every required section is needed for readiness',
              yesNo(model.pitchWorkspace.requiresAllRequiredSections),
              model.pitchWorkspace.requiresAllRequiredSections ? 'success' : 'danger'
            ),
          ],
        },
        {
          label: 'Readiness decision (the labelled demo position)',
          rows: [
            row('Ready to present', yesNo(model.pitchWorkspace.readiness.ready), model.pitchWorkspace.readiness.ready ? 'success' : 'warning'),
            row(
              'Required sections present',
              `${count(model.pitchWorkspace.readiness.presentRequired.length)}/${count(model.pitchWorkspace.readiness.requiredCount)}`
            ),
            row(
              'Required sections missing',
              model.pitchWorkspace.readiness.missingRequired.length > 0
                ? model.pitchWorkspace.readiness.missingRequired.join(', ')
                : 'none',
              model.pitchWorkspace.readiness.missingRequired.length > 0 ? 'warning' : 'success'
            ),
            row('Reason', model.pitchWorkspace.readiness.reason, model.pitchWorkspace.readiness.refusal ? 'warning' : 'neutral'),
          ],
        },
        {
          label: 'Sections',
          rows: model.pitchWorkspace.sections.map((s) =>
            row(
              s.label,
              s.required ? 'required' : 'optional',
              s.required ? 'info' : 'neutral',
              `${s.kindLabel} · ${s.sourceOwner ? `figures from ${s.sourceOwner}` : 'no financial source'} · AI may ${
                s.aiMayDraft ? 'draft the narrative' : 'not draft'
              }`
            )
          ),
        },
        {
          label: 'Basis',
          rows: [row('What this means', model.pitchWorkspace.basis, 'neutral'), row('Disclaimer', model.pitchWorkspace.disclaimer, 'warning')],
        },
      ],
    },
  ];
}

export function AdminFounderCentreView({ model, onNavigate }: AdminFounderCentreViewProps) {
  const panels = buildPanels(model);
  const cards = [
    {
      id: 'funding-opportunities',
      label: 'Funding opportunities',
      value: count(model.opportunities.length),
      context: 'all researched, none verified',
      destination: 'partnerships',
    },
    {
      id: 'submissions-recorded',
      label: 'Submissions recorded',
      value: count(model.summary.recordedSubmissions),
      context: 'the founder records these',
      destination: 'audit_log',
    },
    {
      id: 'capital-required',
      label: 'Capital required',
      value: money(model.capitalRequirement.totalRequiredFundingGbp),
      context: 'Model B, illustration',
      destination: 'accounting',
    },
    {
      id: 'facility-utilisation',
      label: 'Facility utilisation',
      value: pct(model.capitalRequirement.facilityUtilisationPct),
      context: model.capitalRequirement.withinCapacity ? 'within capacity' : 'OVER COMMITTED',
      destination: 'accounting',
    },
    {
      id: 'financing-decisions',
      label: 'Financing decisions',
      value: count(model.financingRouting.decisions.length),
      context: `${count(model.financingRouting.refusedCount)} refused`,
      destination: 'accounting',
    },
    {
      id: 'pitch-sections',
      label: 'Pitch sections ready',
      value: `${count(model.pitchWorkspace.readiness.presentRequired.length)}/${count(
        model.pitchWorkspace.readiness.requiredCount
      )}`,
      context: model.pitchWorkspace.readiness.ready ? 'ready to present' : 'not ready',
      destination: 'partnerships',
    },
  ];

  return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Founder"
        title="Founder Investor Centre"
        description="The funding routes the founder is working, where each application has really reached, the internal capital case behind Model B, and the pitch workspace that presents it."
        meta={<span>{model.pitchWorkspace.readiness.ready ? 'Pitch workspace ready' : 'Pitch workspace not yet ready'}</span>}
      />

      <MetricStrip
        columns={6}
        items={cards.map((c) => ({
          id: c.id,
          label: c.label,
          value: c.value,
          context: c.context,
          onClick: () => onNavigate(c.destination),
          testId: `founder-centre-${c.id}`,
        }))}
      />

      <div className="space-y-4" data-testid="founder-centre-panels">
        {panels.map((panel) => (
          <PanelCard key={panel.id} panel={panel} />
        ))}
      </div>

      <div className="mt-4">
        <SectionCard
          title="What this surface never does"
          description="Stated so it cannot be mistaken for a capability."
        >
          <ul className="list-disc pl-5 space-y-1 text-ds-body text-zinc-700">
            <li>
              It never presents a researched term as a verified one: every figure carries its claim class and
              the source it came from, and the founder-verification count is stated as it really is.
            </li>
            <li>
              It never records an application as submitted on its own — generating a draft has no external
              effect, and only the founder’s own record moves an application past submission.
            </li>
            <li>It never shows the capital case, the facility or the pitch workspace to a brand.</li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
