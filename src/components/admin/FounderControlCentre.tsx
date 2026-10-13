/**
 * §Founder OS — FOUNDER / SUPER ADMIN CONTROL CENTRE (operating centre).
 *
 * A real operating workspace, not a cosmetic dashboard: it composes the shared
 * workspace architecture (WorkspaceFrame · WorkspaceHeader · sticky toolbar ·
 * MetricBand with real drill-downs · PipelineTrack · Queue · RecordDrawer ·
 * ContextPanel/ActivityFeed) over the canonical Control Centre model.
 *
 * Everything on screen is derived from a canonical record, every tile opens the
 * EXISTING destination that owns the record, and every automation control writes
 * through the canonical automation registry (attributed + audited). The AI panel
 * states the truth: when no provider is configured, it says so and shows the
 * deterministic brief instead of pretending a model answered.
 *
 * §P3 (2026-09-22) — ONE ACTION LIST. The Founder's decision is that this screen
 * holds **founder-only controls** and that **Work Management is the single action
 * list**. The Command Centre panel and this screen's own "Attention" queue both
 * LEFT it (three action lists → one): the founder console's derivations are
 * projected into the work layer as Super-Admin-scoped work items, the operational
 * duplicates (PO acknowledgements, shipment exceptions) have exactly one owner,
 * and the founder's systems-status signal is kept here as a control/status panel.
 *
 * RBAC: rendered ONLY behind the AdminShell's Super-Admin guard. Nothing here is
 * reachable from a brand session.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge, Button, EmptyState } from '@/components/ui';
import {
  ActivityFeed,
  ContextPanel,
  MetricBand,
  PipelineTrack,
  Queue,
  RecordDrawer,
  RecordFieldList,
  SegmentedControl,
  WorkspaceFrame,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceSection,
  type MetricTileData,
  type QueueRowData,
} from '@/components/shared/workspace';
import { useApp } from '@/context/GlobalStateContext';
import { requestAdminNav } from '@/data/adminNav';
import {
  buildControlCentre,
  CONTROL_CENTRE_SECTIONS,
  type ControlCentreModel,
  type ControlCentreSectionId,
} from '@/lib/commandCentre/controlCentre';
import {
  automationHalt,
  automationVersion,
  clearSimulatedFailure,
  decideAutomationApproval,
  retryAutomation,
  runAllAutomations,
  runAutomation,
  setAutomationEnabled,
  setAutomationHalt,
  simulateAutomationFailure,
  subscribeAutomations,
  type AutomationId,
  type AutomationRun,
} from '@/lib/automation/registry';
import { askMercenta, buildFounderBrief, type FounderBrief, type MercentaAnswer } from '@/lib/ai/founderOpsAi';
import { useWorkVersion } from '@/lib/work/useWork';
import { useCommercialReadinessVersion } from '@/lib/commercial/useCommercialReadiness';
import { feedAssessmentToAcquisition } from '@/lib/preaudit/preAuditAcquisitionBridge';
import { formatRate } from '@/lib/acquisition/conversionMetrics';
import { formatGbp } from '@/lib/finance/capitalRequirement';
import type { PreAuditQueueRow, CommercialReadinessQueueRow } from '@/lib/commandCentre/controlCentre';
import { useIntegrations } from '@/integrations/IntegrationsContext';

export function FounderControlCentre({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { session, actingStaffId, role } = useApp();
  const workVersion = useWorkVersion();
  const commercialVersion = useCommercialReadinessVersion();
  const automationStamp = automationVersion();
  // §FOUNDATION — the halt state is READ from the registry at render (the
  // registry is the truth), and `haltPulse` only forces the re-render after a
  // halt/resume so the banner can never show a stale state.
  const halt = automationHalt();
  const [, setHaltPulse] = useState(0);
  const [section, setSection] = useState<ControlCentreSectionId>('business');
  const [notice, setNotice] = useState<string | null>(null);
  const [drawerRun, setDrawerRun] = useState<AutomationRun | null>(null);
  const [brief, setBrief] = useState<FounderBrief | null>(null);
  const [question, setQuestion] = useState('What needs my attention today?');
  const [answer, setAnswer] = useState<MercentaAnswer | null>(null);
  const [asking, setAsking] = useState(false);
  /** §Phase 1 — the pre-audit row opened in the drawer + the feed outcome. */
  const [drawerPreAudit, setDrawerPreAudit] = useState<PreAuditQueueRow | null>(null);
  /** §Phase 2 — the commercial readiness row opened in the drawer. */
  const [drawerCommercial, setDrawerCommercial] = useState<CommercialReadinessQueueRow | null>(null);
  const [preAuditNotice, setPreAuditNotice] = useState<string | null>(null);
  const [preAuditStamp, setPreAuditStamp] = useState(0);

  const actor = actingStaffId ?? (role ? `staff:${role}` : 'staff:founder');

  /* Rebuild from canonical state on every work/automation mutation. */
  const model: ControlCentreModel = useMemo(
    () => buildControlCentre(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workVersion, automationStamp, session?.tenantId, preAuditStamp, commercialVersion]
  );

  /* Subscribe so a run/approval/disable immediately re-derives the surface. */
  useEffect(() => subscribeAutomations(() => setNotice((n) => n)), []);

  useEffect(() => {
    let cancelled = false;
    void buildFounderBrief().then((b) => {
      if (!cancelled) setBrief(b);
    });
    return () => {
      cancelled = true;
    };
  }, [automationStamp]);

  const go = useCallback(
    (destination: string) => {
      requestAdminNav({ view: destination, source: 'control-centre' });
      onNavigate(destination);
    },
    [onNavigate]
  );

  /**
   * §P3 — INTEGRATIONS & SYSTEMS STATUS (founder-only control/status).
   *
   * The retired Command Centre surfaced a provider connection failure as an
   * urgent action row. That LIST is gone (one action list), but the SIGNAL must
   * not be: it is shown here as a control/status panel — one row per provider that
   * is reporting an error, with the owning surface as its destination — and the
   * same failure is derived as a Super-Admin work item
   * (`founder_integration`) in the single action list.
   */
  const { integrations, modes } = useIntegrations();
  const integrationIssues = useMemo(
    () =>
      Object.entries(integrations)
        .filter(([, state]) => Boolean(state?.error) && !state?.disabled)
        .map(([id, state]) => ({
          id,
          state,
          mode: modes[id as keyof typeof modes],
        })),
    [integrations, modes]
  );

  const tiles: MetricTileData[] = model.metrics[section].map((m) => ({
    id: m.id,
    label: m.label,
    value: m.value,
    tone: m.tone,
    statusText: m.statusText,
    context: m.context,
    onOpen: () => go(m.destination),
    testId: `control-metric-${m.id}`,
    valueTestId: `control-metric-value-${m.id}`,
  }));

  /**
   * §P3 — the model's `attention` list is no longer rendered: the work/attention
   * lists left the Control Centre (three action lists → one), and the founder's
   * ranked queue now lives in the single action list (Work Management). The
   * model still derives the figures the founder CONTROLS here (open work,
   * critical, overdue, approvals), which is what the summary above states.
   */

  const runAll = () => {
    const runs = runAllAutomations(actor);
    setNotice(
      `Ran ${runs.length} automation(s): ${runs.filter((r) => r.status === 'succeeded').length} succeeded, ` +
        `${runs.filter((r) => r.status === 'duplicate_suppressed').length} duplicate-suppressed, ` +
        `${runs.filter((r) => r.status === 'failed').length} failed.`
    );
  };

  const ask = () => {
    setAsking(true);
    void askMercenta(question).then((a) => {
      setAnswer(a);
      setAsking(false);
    });
  };

  return (
    <WorkspaceFrame>
      <WorkspaceHeader
        eyebrow="Founder · Super Admin"
        title="Control Centre"
        description="The founder-only operating centre: business, brands, acquisition, operations, finance, compliance, automation, AI and audit — every figure derived from canonical records, with the exact next action for each. The ONE action list is Work Management (Operations), which now also carries the founder console; this screen keeps the founder's CONTROLS and DECISIONS."
        meta={
          <>
            <span className="text-ds-label text-zinc-500">As at {model.generatedFor}</span>
            <span className="text-ds-label text-zinc-500">{model.counts.openWork} open work</span>
            <span className="text-ds-label text-zinc-500">{model.counts.overdueWork} overdue</span>
            <span className="text-ds-label text-zinc-500">{model.counts.automationDeclared} automations</span>
          </>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2" data-workspace-toolbar="true">
            <SegmentedControl
              ariaLabel="Control Centre view"
              active={section}
              onSelect={(id) => setSection(id as ControlCentreSectionId)}
              items={CONTROL_CENTRE_SECTIONS.map((s) => ({
                id: s.id,
                label: s.label,
                count: s.id === 'operations' ? model.counts.overdueWork : undefined,
              }))}
            />
            <Button
              variant="secondary"
              size="sm"
              className="text-xs"
              onClick={runAll}
              data-testid="automation-run-all"
            >
              Run all automations
            </Button>
          </div>
        }
      />

      <WorkspaceGrid
        rail={
          <>
            {/*
              §P3 — the founder's systems status. A provider reporting an error is
              a CONTROL signal, not a second action list: the row states the
              provider, its derived mode and the error, and its destination is the
              Integrations surface that owns it. The same failure also raises a
              Super-Admin work item, so it is worked in the single list.
            */}
            <ContextPanel
              title="Integrations & systems"
              action={
                <Button variant="tertiary" size="sm" onClick={() => go('integrations')} data-testid="control-open-integrations">
                  Open
                </Button>
              }
            >
              {integrationIssues.length === 0 ? (
                <p className="text-ds-label text-zinc-400" data-testid="control-integrations-clear">
                  No provider is reporting an error. Modes are declared per provider in Integration Settings; an
                  UNKNOWN mode is never treated as simulation.
                </p>
              ) : (
                <ul className="space-y-1.5" data-testid="control-integration-issues">
                  {integrationIssues.map((i) => (
                    <li key={i.id} className="text-ds-label">
                      <span className="text-zinc-200">{i.id.replace(/_/g, ' ')}</span>
                      <span className="ml-1 text-ds-micro text-zinc-500">{String(i.mode)}</span>
                      <span className="block text-ds-micro text-red-300">{String(i.state?.error)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </ContextPanel>
            <ContextPanel title="Data provenance" action={<span className="text-ds-micro text-zinc-500">canonical</span>}>
              <ul className="space-y-1.5">
                {model.dataSources.map((d) => (
                  <li key={d.label} className="text-ds-label">
                    <span className="text-zinc-300">{d.label}</span>
                    <span className="block text-ds-micro text-zinc-600">{d.value}</span>
                  </li>
                ))}
              </ul>
            </ContextPanel>
            <ContextPanel
              title="Automation"
              action={<span className="text-ds-micro text-zinc-500">{model.automationSummary.declared} declared</span>}
            >
              <ul className="space-y-1">
                <li className="flex justify-between text-ds-label"><span className="text-zinc-400">Succeeded</span><span className="font-mono text-zinc-200">{model.automationSummary.succeeded}</span></li>
                <li className="flex justify-between text-ds-label"><span className="text-zinc-400">Failed</span><span className="font-mono text-zinc-200">{model.automationSummary.failed}</span></li>
                <li className="flex justify-between text-ds-label"><span className="text-zinc-400">Awaiting approval</span><span className="font-mono text-zinc-200">{model.automationSummary.awaitingApproval}</span></li>
                <li className="flex justify-between text-ds-label"><span className="text-zinc-400">Not yet run</span><span className="font-mono text-zinc-200">{model.automationSummary.neverRun}</span></li>
              </ul>
              <p className="mt-2 text-ds-micro text-zinc-600" data-testid="automation-scheduler">
                Scheduler: {model.scheduler.chosen} · no timer · $0 · {model.scheduler.newDependencies.length} new
                dependencies.
              </p>
            </ContextPanel>
            <ContextPanel title="AI" action={<Badge className="text-ds-micro">{model.ai.state.replace(/_/g, ' ')}</Badge>}>
              <p className="text-ds-label text-zinc-400" data-testid="ai-state">
                {model.ai.reason}
              </p>
              <p className="mt-1.5 text-ds-micro text-zinc-600">{model.ai.degradation}</p>
            </ContextPanel>
            <ContextPanel title="Recent activity">
              <ActivityFeed
                entries={model.audit.slice(0, 6).map((a) => ({
                  id: a.id,
                  title: a.action.replace(/_/g, ' '),
                  meta: `${a.reason} · ${a.actor}`,
                  at: a.at,
                }))}
                empty={<p className="text-ds-label text-zinc-600">No audit records yet this session.</p>}
              />
            </ContextPanel>
          </>
        }
      >
        <MetricBand items={tiles} columns={4} />

        {/*
          §P3 (2026-09-22) — THE WORK/ATTENTION LISTS LEFT THIS SCREEN.

          Founder decision: "Control Centre = ONE action list, founder-only
          controls; the work/attention lists leave it; Work Management is the
          single action list" (three action lists → one). Two things were removed
          here:

            1. the Command Centre panel (the retired THIRD list). Its founder-only
               derivations are NOT lost — they are projected into the single action
               list as Super-Admin-scoped work items (`src/lib/work/workStore.ts`
               §11, `founder_*` sources), carrying the SAME rank and the SAME
               auditable WHY, and its PO/shipment rows now have exactly one owner
               (the work layer's own `po_acknowledgement` / `shipment_exception`
               derivations).
            2. this screen's own "Attention" queue, which duplicated the work layer
               (critical/overdue work), the automation approvals controls and the
               automation health table — all of which are still here, in their
               proper form.

          What remains on the Control Centre is exactly what the decision says:
          founder-only CONTROLS (automation catalogue + approvals + halt, AI, audit,
          data provenance), observe metrics with real drill-downs, and the founder
          DECISION surfaces (commercial readiness with its evidence, the pre-audit →
          acquisition bridge) whose rows open the record that is actually changed.
        */}
        <WorkspaceSection
          title="The action list lives in Operations"
          description="Work Management is the single action list — operational work AND the founder console (company compliance, platform setup, brand applications, integration health, funding routes, cost protection), ranked with the declared WHY."
          domain="risk"
          action={
            <Button variant="secondary" size="sm" className="text-xs" onClick={() => go('work')} data-testid="control-open-work">
              Open Work Management
            </Button>
          }
        >
          <p className="text-ds-label text-zinc-400">
            {model.counts.openWork} open item(s) · {model.counts.criticalWork} critical ·{' '}
            {model.counts.overdueWork} overdue · {model.counts.approvalsPending} approval(s) awaiting your decision.
          </p>
        </WorkspaceSection>

        {notice && (
          <p className="text-ds-label text-zinc-400" data-testid="control-notice">
            {notice}
          </p>
        )}

        {section === 'business' && (
          <>
          <WorkspaceSection
            title="Founder intelligence"
            description="The founder's standing questions, declared once. Every answer names the CANONICAL owner that deterministically computes its data — AI may SUMMARISE an answer but never supply the data behind one, so canonical deterministic data stays the source of truth."
            domain="orders"
            action={
              <span className="text-ds-micro text-zinc-500" data-testid="founder-intelligence-status">
                {model.founderIntelligence.questionCount} questions · AI may only summarise
              </span>
            }
          >
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="founder-intelligence-questions">
              {model.founderIntelligence.questions.map((q) => (
                <li key={q.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                  <p className="text-ds-label text-zinc-200">{q.question}</p>
                  <p className="mt-1 text-ds-micro text-zinc-500">{q.about}</p>
                  <p className="mt-1 font-mono text-ds-micro text-zinc-600">{q.dataOwner}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-ds-micro text-zinc-500" data-testid="founder-intelligence-refusal">
              Fail-closed proof: AI supplying the data for “{model.founderIntelligence.exampleRefusal.question}” →{' '}
              {model.founderIntelligence.exampleRefusal.refusal}. {model.founderIntelligence.exampleRefusal.reason}
            </p>
            <p className="mt-3 text-ds-micro text-zinc-500" data-testid="founder-intelligence-rule">
              {model.founderIntelligence.rules.join(' ')}
            </p>
            <p className="mt-2 text-ds-micro text-zinc-500" data-testid="founder-intelligence-basis">
              {model.founderIntelligence.basis} {model.founderIntelligence.disclaimer}
            </p>
          </WorkspaceSection>

          {/* §PHASE 12 — the integrated acquisition → capital → operations loop. The
              end-to-end journey declared once; each stage names the canonical owner that
              deterministically owns it. The loop is forward-only and closes into the
              founder's own intelligence. Internal: Super-Admin only. */}
          <WorkspaceSection
            title="Integrated loop (Phase 12)"
            description="The end-to-end acquisition → capital → operations loop, declared once: discovery → Explore UK Market Fit → qualification → outreach → onboarding → product readiness → commercial terms → Mercenta purchase → supply-route analysis → capital requirement → financing eligibility → financing → supplier purchase → Vendor operations → PO → fulfilment → invoice → payment → repayment → margin → Founder Intelligence. Every stage names the CANONICAL owner that deterministically owns its behaviour; the moves are DERIVED from the ordered list, so the loop is forward-only and closes into the founder's own intelligence — an illegal move is refused rather than guessed."
            domain="orders"
            action={
              <span className="text-ds-micro text-zinc-500" data-testid="control-integrated-loop-status">
                {model.integratedLoop.stageCount} stages · forward-only · closes into Founder Intelligence
              </span>
            }
          >
            <ol className="flex flex-wrap items-center gap-1" data-testid="control-integrated-loop">
              {model.integratedLoop.stages.map((s, i) => (
                <li key={s.id} className="flex items-center gap-1">
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-ds-micro text-zinc-300">
                    {s.label}
                  </span>
                  {i < model.integratedLoop.stageCount - 1 && (
                    <span className="text-ds-micro text-zinc-600">→</span>
                  )}
                </li>
              ))}
            </ol>
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="control-integrated-loop-stages">
              {model.integratedLoop.stages.map((s) => (
                <li key={s.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                  <p className="text-ds-label text-zinc-200">{s.label}</p>
                  <p className="mt-1 text-ds-micro text-zinc-500">{s.about}</p>
                  <p className="mt-1 font-mono text-ds-micro text-zinc-600">{s.dataOwner}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-integrated-loop-refusal">
              Fail-closed proof: {model.integratedLoop.exampleRefusal.from} → {model.integratedLoop.exampleRefusal.to} →{' '}
              {model.integratedLoop.exampleRefusal.refusal}. {model.integratedLoop.exampleRefusal.reason}
            </p>
            <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-integrated-loop-rule">
              {model.integratedLoop.rules.join(' ')}
            </p>
            <p className="mt-2 text-ds-micro text-zinc-500" data-testid="control-integrated-loop-basis">
              {model.integratedLoop.basis} {model.integratedLoop.disclaimer}
            </p>
          </WorkspaceSection>

          {/* §PHASE 10 — acquisition intelligence at scale. The dimensions acquisition
              intelligence scales over and the research sources that may supply them,
              declared once. A signal may rest only on a DECLARED source that SUPPLIES
              its dimension and whose canonical provider is genuinely available; when no
              provider is available NO value is produced — never fabricated. The research
              sources REUSE the platform's own provider registry. Internal: Super-Admin only. */}
          <WorkspaceSection
            title="Acquisition intelligence at scale (Phase 10)"
            description="Acquisition intelligence operating at scale over the REAL research sources: the dimensions it scales over (brand profile, product catalogue, demand signal, competition landscape, company register, decision-maker contact) and the research sources that may supply them — each REUSING a canonical integration-registry provider. A signal may rest only on a DECLARED source that SUPPLIES its dimension and whose provider is genuinely available; an unknown dimension, an unknown source, a source that does not supply the dimension, and a signal with no available provider are all refused — when no provider is available NO value is produced, never fabricated. AI may only summarise."
            domain="orders"
            action={
              <span className="text-ds-micro text-zinc-500" data-testid="acquisition-intelligence-rule">
                {model.acquisitionIntelligence.requiresNamedSource && model.acquisitionIntelligence.neverFabricates && model.acquisitionIntelligence.sourcesReused
                  ? 'Real source required · never fabricated'
                  : 'INTELLIGENCE RULE NOT ENFORCED'}
              </span>
            }
          >
            <p className="text-ds-micro text-zinc-500">
              Dimensions:{' '}
              <span className="text-zinc-400" data-testid="control-acquisition-intelligence-dimensions">
                {model.acquisitionIntelligence.dimensions.map((d) => d.label).join(' · ')}
              </span>
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="control-acquisition-intelligence-sources">
              {model.acquisitionIntelligence.sources.map((s) => (
                <li key={s.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                  <span className="flex justify-between gap-3">
                    <span className="text-ds-label text-zinc-200">{s.label}</span>
                    <span className="font-mono text-ds-micro text-zinc-400">{s.available ? 'available' : 'not available'}</span>
                  </span>
                  <span className="mt-1 block font-mono text-ds-micro text-zinc-600">{s.providerId}</span>
                  <span className="mt-1 block text-ds-micro text-zinc-500">{s.suppliedLabels.join(', ')}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-ds-micro text-zinc-500" data-testid="control-acquisition-intelligence-real">
              Real acquisition signals produced: <span className="font-mono text-zinc-300">{model.acquisitionIntelligence.realSignalCount}</span> — {model.acquisitionIntelligence.availableSourceCount} of {model.acquisitionIntelligence.sources.length} research source(s) available; every signal below is an unmistakable demonstration and is refused.
            </p>
            <ul className="mt-2 space-y-1" data-testid="control-acquisition-intelligence-demonstrations">
              {model.acquisitionIntelligence.demonstrations.map((d) => (
                <li key={d.id} className="flex flex-col gap-0.5 border-b border-white/[0.06] pb-1 text-ds-label">
                  <span className="flex justify-between gap-3">
                    <span className="text-zinc-300">{d.dimensionLabel} · {d.sourceLabel}</span>
                    <span className="font-mono text-zinc-400">{d.allowed ? 'allowed' : d.refusal}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-acquisition-intelligence-refusal">
              Fail-closed proof: {model.acquisitionIntelligence.exampleRefusal.refusal} — {model.acquisitionIntelligence.exampleRefusal.reason}
            </p>
            <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-acquisition-intelligence-rule-text">
              {model.acquisitionIntelligence.rules.join(' ')}
            </p>
            <p className="mt-2 text-ds-micro text-zinc-500" data-testid="control-acquisition-intelligence-basis">
              {model.acquisitionIntelligence.basis} {model.acquisitionIntelligence.disclaimer}
            </p>
          </WorkspaceSection>

          {/* §PHASE 10 — the UK opportunity states at scale. For each of the six §PHASE 1
              states A–F, the EVIDENCE it rests on at scale, declared once. A state is
              asserted only when every evidence source behind it is backed by an available
              provider; when no provider is available NO state is asserted — never
              fabricated. The states feed the canonical UK Market Fit → qualification →
              outreach chain. Internal: Super-Admin only. */}
          <WorkspaceSection
            title="UK opportunity states at scale (Phase 10)"
            description="The six §PHASE 1 UK opportunity states A–F at scale: for each state, the EVIDENCE it rests on — each evidence source REUSING a canonical integration-registry provider. A state may be asserted only when it names a DECLARED evidence source and every one of its sources is backed by a genuinely available provider; an unknown state, a state with no evidence and a state naming an unknown source are all refused — when no provider is available NO state is asserted, never fabricated. The states feed the UK Market Fit → qualification → outreach chain."
            domain="orders"
            action={
              <span className="text-ds-micro text-zinc-500" data-testid="uk-opportunity-states-rule">
                {model.ukOpportunityStates.requiresEvidence && model.ukOpportunityStates.neverFabricates && model.ukOpportunityStates.reusesClasses
                  ? 'Evidence required · never fabricated'
                  : 'STATE RULE NOT ENFORCED'}
              </span>
            }
          >
            <p className="text-ds-micro text-zinc-500">
              Chain:{' '}
              <span className="text-zinc-400" data-testid="control-uk-opportunity-states-chain">
                {model.ukOpportunityStates.chainStages.map((s) => s.label).join(' → ')}
              </span>
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="control-uk-opportunity-states-sources">
              {model.ukOpportunityStates.evidenceSources.map((s) => (
                <li key={s.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                  <span className="flex justify-between gap-3">
                    <span className="text-ds-label text-zinc-200">{s.label}</span>
                    <span className="font-mono text-ds-micro text-zinc-400">{s.available ? 'available' : 'not available'}</span>
                  </span>
                  <span className="mt-1 block font-mono text-ds-micro text-zinc-600">{s.providerId}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-ds-micro text-zinc-500" data-testid="control-uk-opportunity-states-real">
              States asserted: <span className="font-mono text-zinc-300">{model.ukOpportunityStates.realAssertedCount}</span> — {model.ukOpportunityStates.availableEvidenceSourceCount} of {model.ukOpportunityStates.evidenceSources.length} evidence source(s) available; every state below is refused because the evidence behind it is not available.
            </p>
            <ul className="mt-2 space-y-1" data-testid="control-uk-opportunity-states-states">
              {model.ukOpportunityStates.states.map((st) => (
                <li key={st.id} className="flex flex-col gap-0.5 border-b border-white/[0.06] pb-1 text-ds-label">
                  <span className="flex justify-between gap-3">
                    <span className="text-zinc-300">{st.id} — {st.label}</span>
                    <span className="font-mono text-zinc-400">{st.assertable ? 'asserted' : st.refusal}</span>
                  </span>
                  <span className="text-ds-micro text-zinc-600">Evidence: {st.evidenceLabels.join(' · ')}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-uk-opportunity-states-refusal">
              Fail-closed proof: {model.ukOpportunityStates.exampleRefusal.refusal} — {model.ukOpportunityStates.exampleRefusal.reason}
            </p>
            <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-uk-opportunity-states-rule-text">
              {model.ukOpportunityStates.rules.join(' ')}
            </p>
            <p className="mt-2 text-ds-micro text-zinc-500" data-testid="control-uk-opportunity-states-basis">
              {model.ukOpportunityStates.basis} {model.ukOpportunityStates.disclaimer}
            </p>
          </WorkspaceSection>
          </>
        )}

        {section === 'brands' && (
          <>
            <WorkspaceSection
              title="Portfolio"
              description="Brand totals, trading position and compliance readiness — the full table lives in Brand CRM."
              domain="communications"
            >
              <Queue
                rows={[]}
                empty={
                  <EmptyState
                    title="Brand records live in Brand CRM"
                    description="Open Brand CRM for the full portfolio table, onboarding state and compliance readiness. The metrics above are derived from the canonical brand, PO and compliance records."
                  />
                }
              />
            </WorkspaceSection>

            {/* §PHASE 4 — the brand learning loop. The loop DEFINITION plus a
                labelled DEMO topic resolved from the ONE owner. VALIDATE is a
                GATE: a topic is never complete merely because the brand acted. */}
            <WorkspaceSection
              title="Brand learning loop"
              description="A brand progresses through a topic LEARN → WATCH → DO → VALIDATE → COMPLETE. LEARN reads the canonical Knowledge Base article and WATCH completes the canonical guided tour; VALIDATE is a gate satisfied only by a real signal — a topic is never complete merely because the brand said so."
              domain="communications"
              action={
                <span className="text-ds-micro text-zinc-500" data-testid="learning-loop-gate">
                  {model.learningLoop.validateRequiresEvidence ? 'VALIDATE is a gate' : 'VALIDATION NOT ENFORCED'}
                </span>
              }
            >
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="learning-loop-stages">
                {model.learningLoop.stages.map((s) => (
                  <li key={s.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <p className="text-ds-micro uppercase tracking-wide text-zinc-500">
                      {s.label}
                      {s.gate ? ' · gate' : ''}
                    </p>
                    <p className="mt-1 text-ds-label text-zinc-300">{s.meaning}</p>
                    <p className="mt-1 text-ds-micro text-zinc-500">{s.action}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-4" data-testid="learning-loop-demo">
                <p className="text-ds-micro uppercase tracking-wide text-zinc-500">
                  DEMO topic ({model.learningLoop.topicCount} canonical topic(s)) — {model.learningLoop.demo.label}
                  {model.learningLoop.demo.academyStage ? ` · academy stage ${model.learningLoop.demo.academyStage}` : ''}
                </p>
                <p className="mt-1 text-ds-label text-zinc-300">
                  current stage: <span className="font-mono">{model.learningLoop.demo.currentStage}</span> ·{' '}
                  {model.learningLoop.demo.complete ? 'complete' : 'not complete'}
                </p>
              </div>
              <p className="mt-3 text-ds-micro text-zinc-500" data-testid="learning-loop-basis">
                {model.learningLoop.basis} {model.learningLoop.disclaimer}
              </p>
            </WorkspaceSection>

            {/* §PHASE 4 — the onboarding academy curriculum. The ORDERED five stages
                plus the final readiness stage, from the ONE owner. The DEMO position
                is labelled; the final readiness stage is a RESULT reached only once
                every teaching stage is complete. */}
            <WorkspaceSection
              title="Onboarding academy curriculum"
              description="A brand works through the five canonical stages — Understand Mercenta · Commercial · Product & Packaging · Product Readiness · Operations — and then the final readiness stage. Each stage's topics come from the canonical educational gaps, and a topic counts only once its learning loop reaches VALIDATE. The final readiness stage is a result, never a button."
              domain="communications"
              action={
                <span className="text-ds-micro text-zinc-500" data-testid="curriculum-readiness-rule">
                  {model.onboardingCurriculum.finalReadinessRequiresAllStages
                    ? 'Readiness requires every stage'
                    : 'READINESS NOT ENFORCED'}
                </span>
              }
            >
              <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="curriculum-stages">
                {model.onboardingCurriculum.stages.map((s) => (
                  <li key={s.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <p className="text-ds-micro uppercase tracking-wide text-zinc-500">
                      {s.order}. {s.label}
                      {s.gating ? ' · teaching' : s.kind === 'readiness' ? ' · final' : ' · orientation'}
                    </p>
                    <p className="mt-1 text-ds-micro text-zinc-500">
                      {s.topicCount} topic{s.topicCount === 1 ? '' : 's'}
                    </p>
                  </li>
                ))}
              </ol>
              <div className="mt-4" data-testid="curriculum-demo">
                <p className="text-ds-micro uppercase tracking-wide text-zinc-500">
                  DEMO position ({model.onboardingCurriculum.topicCount} canonical topic(s)) —{' '}
                  {model.onboardingCurriculum.demo.currentStageLabel}
                </p>
                <p className="mt-1 text-ds-label text-zinc-300">
                  current stage:{' '}
                  <span className="font-mono">{model.onboardingCurriculum.demo.currentStageId}</span> ·{' '}
                  {model.onboardingCurriculum.demo.readinessReached
                    ? 'catalogue-ready'
                    : 'not yet catalogue-ready'}
                </p>
              </div>
              <p className="mt-3 text-ds-micro text-zinc-500" data-testid="curriculum-basis">
                {model.onboardingCurriculum.basis} {model.onboardingCurriculum.disclaimer}
              </p>
            </WorkspaceSection>

            {/* §PHASE 5 — contextual education. Each real field on a real screen
                carries a "why do we need this?" explanation that LINKS to the
                canonical Knowledge Base article (LEARN) and the canonical guided
                tour of that screen (WATCH). The help text is never duplicated. */}
            <WorkspaceSection
              title="Contextual education"
              description="Every real field on a real screen carries a short “why do we need this?” explanation, linked to the canonical Knowledge Base article that teaches it (Learn) and the canonical guided tour of that screen (Watch). The help text is never duplicated, and an unknown field or a missing article is refused rather than guessed."
              domain="communications"
              action={
                <span className="text-ds-micro text-zinc-500" data-testid="contextual-education-rule">
                  {model.contextualEducation.reuseCanonicalKb && model.contextualEducation.attachToRealScreens
                    ? 'Linked to the Knowledge Base + tours'
                    : 'KB LINK NOT ENFORCED'}
                </span>
              }
            >
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="contextual-education-screens">
                {model.contextualEducation.screens.map((s) => (
                  <li key={s.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <p className="text-ds-micro uppercase tracking-wide text-zinc-500">{s.label}</p>
                    <p className="mt-1 text-ds-micro text-zinc-500">
                      {s.fieldCount} field{s.fieldCount === 1 ? '' : 's'}
                      {s.tourName ? ` · tour: ${s.tourName}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
              <ul className="mt-4 space-y-2" data-testid="contextual-education-fields">
                {model.contextualEducation.explanations.map((e) => (
                  <li key={e.key} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <p className="text-ds-label text-zinc-300">
                      <span className="font-mono">{e.screenLabel}</span> · {e.label}
                    </p>
                    <p className="mt-1 text-ds-micro text-zinc-500">{e.why}</p>
                    <p className="mt-1 text-ds-micro text-zinc-600">Learn more: {e.articleTitle}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-4" data-testid="contextual-education-demo">
                <p className="text-ds-micro uppercase tracking-wide text-zinc-500">
                  DEMO field ({model.contextualEducation.explanationCount} explanation(s))
                  {model.contextualEducation.demo ? ` — ${model.contextualEducation.demo.label}` : ''}
                </p>
                {model.contextualEducation.demo && (
                  <p className="mt-1 text-ds-label text-zinc-300">
                    {model.contextualEducation.demo.why} Learn more: {model.contextualEducation.demo.articleTitle}
                  </p>
                )}
              </div>
              <p className="mt-3 text-ds-micro text-zinc-500" data-testid="contextual-education-basis">
                {model.contextualEducation.basis} {model.contextualEducation.disclaimer}
              </p>
            </WorkspaceSection>

            {/* §PHASE 5 — shared workflow reuse. The canonical journeys through the
                real screens that E2E tests, tutorial recordings and onboarding
                walkthroughs ALL reuse: the canonical guided tour defines the
                journey, its data-tour anchors are the SAME contract the E2E test
                drives, and the steps are DERIVED from the tour (no second list). */}
            <WorkspaceSection
              title="Shared workflows"
              description="Each canonical journey through the real screens — used once and reused by the E2E test, the tutorial recording and the onboarding walkthrough. The steps are derived from the canonical guided tour, so the three consumers can never describe the same journey differently, and the data-tour anchors are the same contract the E2E test drives."
              domain="communications"
              action={
                <span className="text-ds-micro text-zinc-500" data-testid="shared-workflows-rule">
                  {model.sharedWorkflows.oneOwner && model.sharedWorkflows.reuseCanonicalTours && model.sharedWorkflows.mapToRealE2eSpecs
                    ? 'One automation · three consumers'
                    : 'SHARED WORKFLOW NOT ENFORCED'}
                </span>
              }
            >
              <ul className="mb-4 flex flex-wrap gap-2" data-testid="shared-workflows-consumers">
                {model.sharedWorkflows.consumers.map((c) => (
                  <li key={c.id} className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-ds-micro text-zinc-400">
                    {c.label}
                  </li>
                ))}
              </ul>
              <ul className="space-y-2" data-testid="shared-workflows-list">
                {model.sharedWorkflows.workflows.map((w) => (
                  <li key={w.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <p className="text-ds-label text-zinc-300">{w.label}</p>
                    <p className="mt-1 text-ds-micro text-zinc-500">{w.description}</p>
                    <p className="mt-1 text-ds-micro text-zinc-600">
                      {w.stepCount} step{w.stepCount === 1 ? '' : 's'} · tour: {w.tourName} · test: {w.e2eSpec} · Learn: {w.articleTitle}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-4" data-testid="shared-workflows-demo">
                <p className="text-ds-micro uppercase tracking-wide text-zinc-500">
                  DEMO workflow ({model.sharedWorkflows.workflowCount} workflow(s))
                  {model.sharedWorkflows.demo ? ` — ${model.sharedWorkflows.demo.label}` : ''}
                </p>
                {model.sharedWorkflows.demo && (
                  <p className="mt-1 text-ds-micro text-zinc-500">
                    {model.sharedWorkflows.demo.stepCount} steps · {model.sharedWorkflows.demo.consumerCount} consumers · anchors:{' '}
                    <span className="font-mono">{model.sharedWorkflows.demo.anchors.join(', ')}</span>
                  </p>
                )}
              </div>
              <p className="mt-3 text-ds-micro text-zinc-500" data-testid="shared-workflows-basis">
                {model.sharedWorkflows.basis} {model.sharedWorkflows.disclaimer}
              </p>
            </WorkspaceSection>

            {/* §PHASE 5 — the tutorial recordings. The tutorial catalogue with
                versioning, UI-version compatibility, outdated detection and
                reusable assets: one recording per canonical shared workflow (the
                workflow ids REUSED), each declaring the UI version it is compatible
                with against the ONE served version. A recording is current only when
                its asset genuinely exists AND its compatible version equals the
                served version; an uncaptured tutorial is pending and a recording on
                an older UI version is detected as outdated. */}
            <WorkspaceSection
              title="Tutorial recordings (Phase 5)"
              description="The tutorial recordings that teach each canonical journey: one recording per shared workflow (the workflow ids reused, never re-declared), each declaring the UI version it is compatible with, its own version and its reusable asset. A recording is current only when its asset genuinely exists and its compatible UI version equals the served version; an uncaptured tutorial is pending and a recording on an older UI version is detected as outdated — never shown as if it worked."
              domain="communications"
              action={
                <span className="text-ds-micro text-zinc-500" data-testid="tutorial-recordings-rule">
                  {model.tutorialRecordings.oneOwner && model.tutorialRecordings.reusesSharedWorkflows && model.tutorialRecordings.declaresCompatibleUiVersion && model.tutorialRecordings.detectsOutdated
                    ? 'Versioned · outdated detected'
                    : 'TUTORIAL RULE NOT ENFORCED'}
                </span>
              }
            >
              <p className="text-ds-micro text-zinc-500">
                Served UI version:{' '}
                <span className="font-mono text-zinc-400" data-testid="control-tutorial-recordings-served">
                  {model.tutorialRecordings.servedUiVersion}
                </span>{' '}
                · assets: <span className="font-mono text-zinc-400">{model.tutorialRecordings.assetDir}</span>
              </p>
              <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-tutorial-recordings-counts">
                Current: <span className="font-mono text-zinc-300">{model.tutorialRecordings.currentCount}</span> · Outdated: <span className="font-mono text-zinc-300">{model.tutorialRecordings.outdatedCount}</span> · Pending: <span className="font-mono text-zinc-300">{model.tutorialRecordings.pendingCount}</span> of {model.tutorialRecordings.recordingCount} recording(s) across {model.tutorialRecordings.workflowCount} workflow(s); every tutorial is pending because no recording asset has been captured yet.
              </p>
              <ul className="mt-4 space-y-2" data-testid="control-tutorial-recordings-list">
                {model.tutorialRecordings.recordings.map((t) => (
                  <li key={t.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <span className="flex justify-between gap-3">
                      <span className="text-ds-label text-zinc-300">{t.title}</span>
                      <span className="font-mono text-ds-micro text-zinc-400">{t.playable ? 'current' : t.refusal}</span>
                    </span>
                    <span className="mt-1 block text-ds-micro text-zinc-600">
                      workflow: {t.workflowLabel} · compatible UI: {t.compatibleUiVersion} · v{t.tutorialVersion} · {t.asset}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4" data-testid="control-tutorial-recordings-examples">
                <p className="text-ds-micro uppercase tracking-wide text-zinc-500">Live rules (computed, not written)</p>
                <p className="mt-1 text-ds-micro text-zinc-500">
                  Current: <span className="font-mono text-zinc-400">{model.tutorialRecordings.exampleCurrent.refusal ?? 'current'}</span>
                </p>
                <p className="mt-1 text-ds-micro text-zinc-500">
                  Outdated: <span className="font-mono text-zinc-400">{model.tutorialRecordings.exampleOutdated.refusal ?? model.tutorialRecordings.exampleOutdated.status}</span> — {model.tutorialRecordings.exampleOutdated.reason}
                </p>
              </div>
              <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-tutorial-recordings-basis">
                {model.tutorialRecordings.basis} {model.tutorialRecordings.disclaimer}
              </p>
            </WorkspaceSection>

          </>
        )}

        {/* §CREDENTIAL VAULT (T-7 / D16-05) — the durable credential architecture.
            One contract per integration provider, DERIVED from the canonical
            registry (never re-declared): a credential is usable only when the
            provider is declared, a value is stored, the credential is enabled,
            every required field is present AND the store is durable. The in-memory
            store held today is NOT durable, so no provider resolves as a production
            credential; only a mask is ever read back, never the value. */}
        {section === 'brands' && (
          <>
            <WorkspaceSection
              title="Credential vault (T-7)"
              description="The durable credential architecture: one contract per integration provider, derived from the canonical registry (which are OAuth or API-key and which secret fields each requires — reused, never re-declared). A credential is usable only when the provider is declared, a value is stored, the credential is enabled, every required field is present and the store is durable. The in-memory store held today is not durable, so no provider resolves as a production credential; only a mask is ever read back, never the value."
              domain="risk"
              action={
                <span className="text-ds-micro text-zinc-500" data-testid="credential-vault-rule">
                  {model.credentialVault.oneOwner && model.credentialVault.reusesProviderFieldOwner && model.credentialVault.masksReadback && model.credentialVault.neverExposesValue && model.credentialVault.failsClosed
                    ? 'Durable · masked · fail-closed'
                    : 'VAULT RULE NOT ENFORCED'}
                </span>
              }
            >
              <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-credential-vault-counts">
                Usable: <span className="font-mono text-zinc-300">{model.credentialVault.usableCount}</span> · Stored: <span className="font-mono text-zinc-300">{model.credentialVault.storedCount}</span> · Disabled: <span className="font-mono text-zinc-300">{model.credentialVault.disabledCount}</span> of {model.credentialVault.providerCount} provider(s); the store is {model.credentialVault.durableStore ? 'durable' : 'in-memory (not durable)'}, so no credential resolves as a production credential yet.
              </p>
              <ul className="mt-4 space-y-2" data-testid="control-credential-vault-list">
                {model.credentialVault.providers.map((p) => (
                  <li key={p.providerId} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <span className="flex justify-between gap-3">
                      <span className="text-ds-label text-zinc-300">{p.providerId}</span>
                      <span className="font-mono text-ds-micro text-zinc-400">{p.usable ? 'usable' : p.refusal}</span>
                    </span>
                    <span className="mt-1 block text-ds-micro text-zinc-600">
                      {p.authMethod} · fields: {p.secretFieldKeys.length > 0 ? p.secretFieldKeys.join(', ') : '—'} · {p.masked ?? 'no value stored'}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4" data-testid="control-credential-vault-examples">
                <p className="text-ds-micro uppercase tracking-wide text-zinc-500">Live rules (computed, not written)</p>
                <p className="mt-1 text-ds-micro text-zinc-500" data-testid="control-credential-vault-example-usable">
                  Durable: <span className="font-mono text-zinc-400">{model.credentialVault.exampleUsable.usable ? 'usable' : model.credentialVault.exampleUsable.refusal}</span> — {model.credentialVault.exampleUsable.reason}
                </p>
                <p className="mt-1 text-ds-micro text-zinc-500" data-testid="control-credential-vault-example-notdurable">
                  In-memory: <span className="font-mono text-zinc-400">{model.credentialVault.exampleNotDurable.refusal ?? (model.credentialVault.exampleNotDurable.usable ? 'usable' : 'unknown')}</span> — {model.credentialVault.exampleNotDurable.reason}
                </p>
              </div>
              <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-credential-vault-basis">
                {model.credentialVault.basis} {model.credentialVault.disclaimer}
              </p>
            </WorkspaceSection>
          </>
        )}

        {/* §Phase 2 — the commercial readiness workspace. It extends THIS Control
            Centre rather than adding a second dashboard: every row is a canonical
            readiness record, every row opens the record drawer with the evaluated
            conditions (why it is in its state) and the canonical work item. */}
        {section === 'commercial' && (
          <>
            <WorkspaceSection
              title="Commercial readiness"
              description="PRODUCT OPPORTUNITY → commercial assessment → information needed → reassessment → commercially ready → next readiness stage. Every row opens the underlying record and the work it raised."
              domain="finance"
              action={
                <span className="text-ds-micro text-zinc-500" data-testid="commercial-guidance-topics">
                  {model.commercial.brandGuidanceTopics} brand guidance topic(s)
                </span>
              }
            >
              <Queue
                rows={model.commercial.rows.map((r) => ({
                  id: r.recordId,
                  ref: r.routeLabel,
                  title: r.product,
                  meta: `${r.brandLabel} · owner ${r.ownerLabel}${
                    r.dueDate ? ` · due ${r.dueDate}` : ''
                  }${
                    r.missingInputs.length ? ` · ${r.missingInputs.length} missing input(s)` : ''
                  }`,
                  status: {
                    tone:
                      r.route === 'ready'
                        ? 'success'
                        : r.route === 'blocked'
                          ? 'danger'
                          : r.route === 'remediation'
                            ? 'warning'
                            : 'info',
                    label: r.route,
                  },
                  facts: [{ label: 'next', value: r.nextStep, emphasis: true }],
                  actionLabel: 'Open',
                  onOpen: () => setDrawerCommercial(r),
                  testId: `commercial-readiness-queue-row-${r.recordId}`,
                }))}
                empty={
                  <EmptyState
                    title="No product has been commercially assessed yet"
                    description="A product opportunity enters commercial assessment from the Explore UK Market Fit pre-audit. Every assessment appears here with its route and its reason."
                  />
                }
              />
            </WorkspaceSection>

            <WorkspaceSection
              title="Commercial work raised"
              description="The SAME work layer the Work surface uses — a commercial issue becomes real work, and it disappears the moment the underlying record moves on."
              domain="finance"
            >
              <Queue
                rows={model.commercial.rows
                  .filter((r) => r.workItemId !== null)
                  .map((r) => ({
                    id: r.workItemId as string,
                    ref: r.routeLabel,
                    title: `${r.ownerLabel} action — ${r.product}`,
                    meta: `${r.missingInputs.length} missing input(s) · ${r.openQuestions.length} open question(s)`,
                    status: {
                      tone: r.owner === 'brand' ? 'warning' : 'danger',
                      label: r.owner === 'brand' ? 'brand action' : 'Mercenta decision',
                    },
                    facts: r.dueDate ? [{ label: 'due', value: r.dueDate, emphasis: true }] : [],
                    actionLabel: 'Open record',
                    onOpen: () => setDrawerCommercial(r),
                    testId: `commercial-readiness-work-row-${r.recordId}`,
                  }))}
                empty={
                  <EmptyState
                    title="No commercial work is outstanding"
                    description="Products whose commercial route is ready raise no work."
                  />
                }
              />
            </WorkspaceSection>

            <WorkspaceSection
              title="Localisation & currency"
              description="Locale, DISPLAY currency and SETTLEMENT currency are three separate concepts. A detected country produces a SUGGESTION only — an explicit choice always wins — and a brand's settlement currency comes from its commercial terms, never from the reader's locale."
              domain="finance"
              action={
                <span className="text-ds-micro text-zinc-500" data-testid="localisation-concepts">
                  {model.localisation.conceptsSeparate ? 'Three separate concepts' : 'CONCEPTS COLLAPSED'}
                </span>
              }
            >
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="localisation-concepts-grid">
                {model.localisation.concepts.map((c) => (
                  <li key={c.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <p className="text-ds-micro uppercase tracking-wide text-zinc-500">{c.label}</p>
                    <p className="mt-1 text-ds-label text-zinc-300">{c.description}</p>
                    <p className="mt-1 text-ds-micro text-zinc-500">{c.source}</p>
                  </li>
                ))}
              </ul>
              <div className="mt-4" data-testid="localisation-markets">
                <p className="text-ds-micro uppercase tracking-wide text-zinc-500">
                  Canonical source markets ({model.localisation.markets.length}) — suggested locale · display currency
                </p>
                <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {model.localisation.markets.map((m) => (
                    <li key={m.countryCode} className="flex justify-between gap-3 text-ds-label">
                      <span className="text-zinc-300">{m.countryLabel}</span>
                      <span className="font-mono text-zinc-400">
                        {m.suggestedLocale} · {m.suggestedDisplayCurrency}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="mt-3 text-ds-micro text-zinc-500" data-testid="localisation-basis">
                {model.localisation.basis} {model.localisation.disclaimer}
              </p>
              {/* §PHASE 9 — the localization / SEO / hreflang framework (formats, timezones, hreflang). */}
              <div className="mt-5 border-t border-white/[0.06] pt-4" data-testid="localisation-seo">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-ds-micro uppercase tracking-wide text-zinc-500">Localization, SEO &amp; hreflang</p>
                  <span className="text-ds-micro text-zinc-500" data-testid="localisation-seo-served">
                    Served languages: {model.localisationSeo.servedContentLocales.join(', ')} · hreflang {model.localisationSeo.hreflangDefault} + {model.localisationSeo.hreflangXDefault}
                  </span>
                </div>
                <div className="mt-3" data-testid="localisation-seo-alt">
                  <p className="text-ds-micro uppercase tracking-wide text-zinc-500">
                    Public routes ({model.localisationSeo.publicRouteCount}) — self-referencing hreflang
                  </p>
                  <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {model.localisationSeo.publicRouteAlternates.map((r) => (
                      <li key={r.path} className="flex justify-between gap-3 text-ds-label">
                        <span className="font-mono text-zinc-400">{r.path}</span>
                        <span className="text-zinc-400">{r.alternates.map((a) => a.hreflang).join(' · ')}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1 text-ds-micro text-zinc-500">
                    {model.localisationSeo.refusedNonPublic} private/unknown path(s) refused — a hreflang alternate requires a public route.
                  </p>
                </div>
                <div className="mt-3" data-testid="localisation-seo-formats">
                  <p className="text-ds-micro uppercase tracking-wide text-zinc-500">
                    Locale formats ({model.localisationSeo.formatCount}) — number · date · clock
                  </p>
                  <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {model.localisationSeo.formatConventions.map((c) => (
                      <li key={c.locale} className="flex justify-between gap-3 text-ds-label">
                        <span className="font-mono text-zinc-400">{c.locale}</span>
                        <span className="text-zinc-400">{c.numbersExample} · {c.dateExample} · {c.timeCycle}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-3" data-testid="localisation-seo-timezones">
                  <p className="text-ds-micro uppercase tracking-wide text-zinc-500">
                    Market timezones ({model.localisationSeo.marketCount})
                  </p>
                  <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {model.localisationSeo.markets.map((m) => (
                      <li key={m.countryCode} className="flex justify-between gap-3 text-ds-label">
                        <span className="text-zinc-300">{m.countryLabel}</span>
                        <span className="font-mono text-zinc-400">{m.timezone}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-3 text-ds-micro text-zinc-500" data-testid="localisation-seo-rule">
                  {model.localisationSeo.rules.join(' ')}
                </p>
                <p className="mt-2 text-ds-micro text-zinc-500" data-testid="localisation-seo-basis">
                  {model.localisationSeo.basis} {model.localisationSeo.disclaimer}
                </p>
              </div>
            </WorkspaceSection>

            <WorkspaceSection
              title="Amazon relationship governance"
              description="Mercenta's retail-channel relationship rests on nine authoritative documents (vendor agreement, current policies, additional terms, channel communications, programme documentation, API agreements, trademark permissions, written permissions, account instructions). A claim may rest only on a source Mercenta actually holds AND has verified — nothing is verified with the channel today, so every relationship claim fails closed."
              domain="finance"
              action={
                <span className="text-ds-micro text-zinc-500" data-testid="amazon-governance-status">
                  {model.amazonGovernance.programmeStatus} · {model.amazonGovernance.verifiedCount} verified / {model.amazonGovernance.sourceCount}
                </span>
              }
            >
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3" data-testid="amazon-governance-sources">
                {model.amazonGovernance.sources.map((s) => (
                  <li key={s.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-ds-micro uppercase tracking-wide text-zinc-500">{s.id}</p>
                      <span className={`text-ds-micro ${s.status === 'verified' ? 'text-emerald-400' : 'text-amber-400'}`}>{s.status}</span>
                    </div>
                    <p className="mt-1 text-ds-label text-zinc-300">{s.label}</p>
                    <p className="mt-1 text-ds-micro text-zinc-500">{s.governs}</p>
                    <p className="mt-1 font-mono text-ds-micro text-zinc-600">{s.canonicalOwner}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-ds-micro text-zinc-500" data-testid="amazon-governance-refusal">
                Fail-closed proof: “{model.amazonGovernance.exampleRefusal.claim}” → {model.amazonGovernance.exampleRefusal.refusal}. {model.amazonGovernance.exampleRefusal.reason}
              </p>
              <p className="mt-3 text-ds-micro text-zinc-500" data-testid="amazon-governance-rule">
                {model.amazonGovernance.rules.join(' ')}
              </p>
              <p className="mt-2 text-ds-micro text-zinc-500" data-testid="amazon-governance-basis">
                {model.amazonGovernance.basis} {model.amazonGovernance.disclaimer}
              </p>
            </WorkspaceSection>

            <WorkspaceSection
              title="Country framework"
              description="Every country is classified into one or more of six roles. The marketplace role is a published fact, cited to the channel's own marketplace-IDs reference; a brand-origin market is the canonical source-market list; the priority roles are Mercenta's own decisions. Zimbabwe is an operating/home market and is never a marketplace."
              domain="finance"
              action={
                <span className="text-ds-micro text-zinc-500" data-testid="country-framework-zimbabwe">
                  {model.countryFramework.zimbabweNeverMarketplace ? 'Zimbabwe never a marketplace' : 'ZIMBABWE IS MARKED A MARKETPLACE'}
                </span>
              }
            >
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3" data-testid="country-framework-roles">
                {model.countryFramework.roles.map((role) => (
                  <li key={role.id} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <p className="text-ds-micro uppercase tracking-wide text-zinc-500">{role.label}</p>
                    <p className="mt-1 text-ds-label text-zinc-300">{role.description}</p>
                    <p className="mt-1 text-ds-micro text-zinc-500">
                      {role.kind === 'factual' ? 'Factual' : 'Policy'} · {model.countryFramework.byRole[role.id]} country(ies)
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-ds-micro text-zinc-500" data-testid="country-framework-basis">
                {model.countryFramework.basis} {model.countryFramework.disclaimer} Source: {model.countryFramework.source}
              </p>
            </WorkspaceSection>
          </>
        )}

        {section === 'acquisition' && (
          <>
            <WorkspaceSection
              title="Pipeline"
              description="PROSPECT → RESEARCH → QUALIFICATION → OPPORTUNITY → OUTREACH → FOLLOW-UP → RESPONSE → MEETING → DUE DILIGENCE → ONBOARDING → ACTIVE BRAND."
              domain="intelligence"
            >
              <PipelineTrack
                stages={model.acquisition.stages.map((s) => ({
                  id: s.id,
                  label: s.label,
                  count: s.count,
                  share: s.share,
                  domain: s.domain,
                  attention: s.attention,
                }))}
                onSelect={() => go('crm')}
              />
            </WorkspaceSection>

            {/*
              §ACQ-CONVERSION — the funnel RATES, derived from the SAME canonical
              records the Pipeline above shows. Every figure is a count of
              prospects that actually reached a canonical stage (contacted = an
              outreach was sent; replied = a response exists; engaged = a
              meeting/negotiation/pilot is in progress; converted = the onboarding
              completed). Nothing here re-classifies a reply: the definitions live
              once, in `src/lib/acquisition/conversionMetrics.ts`.
            */}
            <WorkspaceSection
              title="Conversion"
              description="Rates over the canonical prospect store. A rate with a zero denominator is shown as — rather than a misleading 0%."
              domain="intelligence"
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="control-acquisition-conversion">
                {[
                  { label: 'Contacted', count: model.acquisitionConversion.counts.contacted, sub: 'outreach sent' },
                  { label: 'Replied', count: model.acquisitionConversion.counts.replied, sub: `${formatRate(model.acquisitionConversion.rates.replyRate)} of contacted` },
                  { label: 'Engaged', count: model.acquisitionConversion.counts.engaged, sub: `${formatRate(model.acquisitionConversion.rates.engagementRate)} of contacted` },
                  { label: 'Converted', count: model.acquisitionConversion.counts.converted, sub: `${formatRate(model.acquisitionConversion.rates.conversionRate)} of contacted` },
                ].map((funnel) => (
                  <div key={funnel.label} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                    <p className="text-ds-micro uppercase tracking-wide text-zinc-500">{funnel.label}</p>
                    <p className="mt-1 font-mono text-lg text-zinc-100">{funnel.count}</p>
                    <p className="text-ds-micro text-brass-300">{funnel.sub}</p>
                  </div>
                ))}
              </div>
              {model.acquisitionConversion.byCategory.length > 0 && (
                <div className="mt-4">
                  <p className="text-ds-micro uppercase tracking-wide text-zinc-500">By category</p>
                  <ul className="mt-1 space-y-1" data-testid="control-conversion-by-category">
                    {model.acquisitionConversion.byCategory.map((s) => (
                      <li key={s.key} className="flex justify-between gap-3 text-ds-label">
                        <span className="text-zinc-300">{s.key}</span>
                        <span className="font-mono text-zinc-400">
                          {s.counts.contacted} contacted · {s.counts.replied} replied · {s.counts.converted} converted
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </WorkspaceSection>
            <WorkspaceSection
              title="Prospects"
              description="A prospect is not a brand: only a completed onboarding creates a tenant."
              domain="intelligence"
            >
              <Queue
                rows={model.acquisition.records.slice(0, 12).map((r) => ({
                  id: r.prospectId,
                  ref: r.stageLabel,
                  title: r.brand,
                  meta: `${r.category} · owner ${r.owner} · score ${r.score} (${r.tier.replace(/_/g, ' ')})`,
                  status: {
                    tone: r.disqualified ? 'danger' : r.followUpState === 'overdue' ? 'warning' : 'neutral',
                    label: r.disqualified
                      ? 'disqualified'
                      : r.followUpState === 'overdue'
                        ? 'follow-up overdue'
                        : r.stageLabel,
                  },
                  facts: [
                    { label: 'next', value: r.nextAction.label, emphasis: true },
                    ...(r.followUpDue ? [{ label: 'follow-up', value: r.followUpDue }] : []),
                  ],
                  actionLabel: 'Open',
                  onOpen: () => go(r.destination),
                  testId: `control-acquisition-row-${r.prospectId}`,
                }))}
                empty={<EmptyState title="No prospects" description="The canonical prospect store is empty." />}
              />
            </WorkspaceSection>

            {/*
              §Phase 1 — the Explore UK Market Fit pre-audit queue. This is the
              ONLY place a pre-audit crosses into acquisition, and it is a
              founder decision: the button calls the canonical bridge, which
              writes a canonical prospect (never a brand tenant) and refuses
              anything that is not qualified.
            */}
            <WorkspaceSection
              title="Explore UK Market Fit"
              description="Public pre-audit assessments. A qualified assessment can be fed into the canonical acquisition pipeline — a prospect is not a brand."
              domain="intelligence"
            >
              {preAuditNotice && (
                <p className="mb-3 text-ds-label text-zinc-300" data-testid="control-preaudit-notice">
                  {preAuditNotice}
                </p>
              )}
              <Queue
                rows={model.preAudit.rows.slice(0, 12).map((r) => ({
                  id: r.assessmentId,
                  ref: r.qualificationLabel,
                  title: r.brand,
                  meta: `${r.category} · presence ${r.presence} · research ${r.researchMode} · ${r.openQuestions} open question(s)`,
                  status: {
                    tone:
                      r.qualification === 'qualified'
                        ? 'success'
                        : r.qualification === 'ineligible'
                          ? 'danger'
                          : r.qualification === 'needs_information'
                            ? 'warning'
                            : 'neutral',
                    label: r.fed ? 'fed to acquisition' : r.qualificationLabel,
                  },
                  facts: [{ label: 'next', value: r.recommendedNextStep, emphasis: true }],
                  actionLabel: r.qualification === 'qualified' && !r.fed ? 'Feed to acquisition' : 'Open',
                  onOpen: () => {
                    if (r.qualification === 'qualified' && !r.fed) {
                      const outcome = feedAssessmentToAcquisition(r.assessmentId, actor);
                      setPreAuditNotice(outcome.reason);
                      setPreAuditStamp((s) => s + 1);
                      return;
                    }
                    setDrawerPreAudit(r);
                  },
                  testId: `control-preaudit-row-${r.assessmentId}`,
                }))}
                empty={
                  <EmptyState
                    title="No assessments yet"
                    description="A visitor who runs Explore UK Market Fit on the public site appears here."
                  />
                }
              />
            </WorkspaceSection>
          </>
        )}

        {section === 'operations' && (
          <WorkspaceSection
            title="Operations"
            description="Purchase orders, fulfilment, shipments, returns and work — the operational metrics above are derived from the same canonical records the Operations group works."
            domain="logistics"
            action={
              <Button variant="secondary" size="sm" className="text-xs" onClick={() => go('work')} data-testid="control-operations-open-work">
                Open Work Management
              </Button>
            }
          >
            {/*
              §P3 — the operational WORK list that used to be rendered here is
              GONE (it duplicated the single action list). Operations is worked in
              the Operations group: Work Management (the single action list),
              Purchase Orders, Logistics Hub, Returns Tracking.
              §P9 repoint: the old contract also named Carrier Monitor, removed with
              the carrier surface.
              The metrics above still observe the position.
            */}
            <Queue
              rows={[]}
              empty={
                <EmptyState
                  title="Operational work lives in the Operations group"
                  description="Work Management is the single action list (it also carries the founder console). Purchase Orders, Logistics Hub and Returns Tracking own their own records — the metrics above are derived from the same records."
                />
              }
            />
          </WorkspaceSection>
        )}
        {/*
          §D21 — WHOLE-PLATFORM OBJECT RESOLUTION. Every canonical channel object
          (each PO's Amazon PO number, each consignment's carrier reference) is run
          through the ONE resolver to its Mercenta record, brand and tenant. The
          section states how many resolved and QUEUES anything that did not resolve
          to exactly one tenant for founder review — ownership is never guessed and
          never leaks across tenants. Super-Admin only (rendered behind the guard).
        */}
        {section === 'operations' && (
          <WorkspaceSection
            title="Object resolution"
            description="The canonical chain Amazon object → Mercenta object → brand → tenant, resolved by the ONE resolver over the channel objects the platform holds. An object that matches nothing is UNKNOWN; one that matches more than one tenant FAILS CLOSED. Both are queued here for founder review — ownership is never guessed."
            domain="logistics"
          >
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
              data-testid="control-object-resolution"
            >
              {[
                { label: 'Channel objects', value: String(model.objectResolution.total), sub: 'POs + consignments' },
                { label: 'Resolved', value: String(model.objectResolution.resolved), sub: 'one tenant each' },
                { label: 'Unknown', value: String(model.objectResolution.unknown), sub: 'no match · queued' },
                { label: 'Cross-tenant', value: String(model.objectResolution.crossTenant), sub: 'fails closed · queued' },
                { label: 'Replays deduped', value: String(model.objectResolution.replays), sub: 'duplicates contained' },
              ].map((tile) => (
                <div key={tile.label} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                  <p className="text-ds-micro uppercase tracking-wide text-zinc-500">{tile.label}</p>
                  <p className="mt-1 font-mono text-lg text-zinc-100">{tile.value}</p>
                  <p className="text-ds-micro text-brass-300">{tile.sub}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-object-resolution-basis">
              {model.objectResolution.basis}
            </p>
            <Queue
              rows={model.objectResolution.unresolved.map((r) => ({
                id: r.key,
                ref: `${r.ref.objectType} · ${r.ref.externalId}`,
                title: `Unresolved ${r.ref.objectType} "${r.ref.externalId}"`,
                meta: r.reason,
                status: {
                  tone: r.outcome === 'cross_tenant' ? 'danger' : 'warning',
                  label: r.outcome === 'cross_tenant' ? 'Cross-tenant' : 'Unknown',
                },
                domain: 'logistics',
                testId: `control-object-resolution-${r.key}`,
              }))}
              empty={
                <EmptyState
                  title="Every channel object resolved to exactly one tenant"
                  description="No purchase order or consignment is awaiting ownership resolution. If a channel object arrives that matches nothing, or that matches more than one tenant, it appears here for review — never silently assigned."
                />
              }
            />
          </WorkspaceSection>
        )}




        {section === 'finance' && (
          <WorkspaceSection
            title="Finance"
            description="Invoices, payments, deductions and escalations — the money chain still requires explicit human approval at the payout gate."
            domain="finance"
          >
            {/*
              §P3 — the approval-derived finance queue is GONE: approvals are
              DECISIONS with real controls, and they are worked in the Automation
              section below (approve / reject writes through the canonical
              automation registry). The finance metrics above still observe the
              position.
            */}
            <Queue
              rows={[]}
              empty={
                <EmptyState
                  title="Finance decisions are worked in their owning surfaces"
                  description="Pending automations that stopped at a human approval gate are approved or rejected in the Automation section below. Unpaid invoices and open deductions are work items with declared deadlines — see the Finance metrics above, the single action list and the Accounting surface."
                />
              }
            />
          </WorkspaceSection>
        )}

        {section === 'finance' && (
          <WorkspaceSection
            title="Capital requirement (Model B)"
            description="Model B means Mercenta buys the goods and is repaid by the channel, so it needs working capital in between. Every figure comes from the ONE capital model over the canonical Model B purchase orders — financing is internal and is never shown to a brand."
            domain="finance"
          >
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
              data-testid="control-capital-requirement"
            >
              {[
                {
                  label: 'Capital needed',
                  value: formatGbp(model.capitalRequirement.totalRequiredFundingGbp),
                  sub: 'supplier cost',
                },
                {
                  label: 'Advance drawn',
                  value: formatGbp(model.capitalRequirement.totalAdvanceDrawnGbp),
                  sub: `${(model.capitalRequirement.facility.advanceRate * 100).toFixed(0)}% of cost`,
                },
                {
                  label: 'Utilisation',
                  value: `${model.capitalRequirement.facilityUtilisationPct.toFixed(1)}%`,
                  sub: model.capitalRequirement.withinCapacity ? 'within capacity' : 'over capacity',
                },
                {
                  label: 'Available after',
                  value: formatGbp(model.capitalRequirement.availableCapitalAfterGbp),
                  sub: 'facility capital',
                },
                {
                  label: 'Financing fees',
                  value: formatGbp(model.capitalRequirement.totalFinancingFeesGbp),
                  sub: `over ${model.capitalRequirement.facility.termDays} days`,
                },
                {
                  label: 'Purchases financed',
                  value: String(model.capitalRequirement.outstandingFinancedPurchases),
                  sub: 'Model B orders',
                },
              ].map((tile) => (
                <div key={tile.label} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                  <p className="text-ds-micro uppercase tracking-wide text-zinc-500">{tile.label}</p>
                  <p className="mt-1 font-mono text-lg text-zinc-100">{tile.value}</p>
                  <p className="text-ds-micro text-brass-300">{tile.sub}</p>
                </div>
              ))}
            </div>
            {model.capitalRequirement.concentration.length > 0 && (
              <div className="mt-4">
                <p className="text-ds-micro uppercase tracking-wide text-zinc-500">Concentration by brand</p>
                <ul className="mt-1 space-y-1" data-testid="control-capital-concentration">
                  {model.capitalRequirement.concentration.map((c) => (
                    <li key={c.brandId} className="flex justify-between gap-3 text-ds-label">
                      <span className="text-zinc-300">{c.brandName}</span>
                      <span className="font-mono text-zinc-400">
                        {formatGbp(c.advanceGbp)} · {c.sharePct.toFixed(1)}%
                        {c.breachesLimit ? ' · over limit' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-capital-basis">
              {model.capitalRequirement.facility.label}. {model.capitalRequirement.facility.disclaimer}
            </p>
          </WorkspaceSection>
        )}


        {section === 'finance' && (
          <WorkspaceSection
            title="Financing routes (Model B)"
            description="Each Model B purchase is routed to exactly ONE financing route — self-funded, a facility draw, or an external referral — by the deterministic financing router, which REUSES the platform's canonical exclusive-gateway evaluator. No AI, no model call. Financing is internal and is never shown to a brand."
            domain="finance"
          >
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3"
              data-testid="control-financing-routes"
            >
              {model.financingRouting.byRoute.map((b) => (
                <div
                  key={b.routeId}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3"
                >
                  <p className="text-ds-micro uppercase tracking-wide text-zinc-500">{b.label}</p>
                  <p className="mt-1 font-mono text-lg text-zinc-100">{b.count}</p>
                  <p className="text-ds-micro text-brass-300">{formatGbp(b.advanceGbp)} advance</p>
                </div>
              ))}
            </div>
            <ul className="mt-4 space-y-1" data-testid="control-financing-decisions">
              {model.financingRouting.decisions.map((d) => (
                <li
                  key={d.purchaseId}
                  className="flex flex-col gap-0.5 border-b border-white/[0.06] pb-1 text-ds-label"
                >
                  <span className="flex justify-between gap-3">
                    <span className="text-zinc-300">
                      {d.brandName} · {d.purchaseId}
                    </span>
                    <span className="font-mono text-zinc-400">
                      {d.routeId
                        ? (model.financingRouting.routes.find((r) => r.routeId === d.routeId)?.label ??
                          d.routeId)
                        : 'refused — queued for review'}
                    </span>
                  </span>
                  <span className="text-ds-micro text-zinc-500">{d.rationale}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-financing-basis">
              {model.financingRouting.basis} {model.financingRouting.label}.{' '}
              {model.financingRouting.disclaimer}
            </p>
          </WorkspaceSection>
        )}

        {/* §PHASE 7 — the financier lifecycle. The forward-only, fail-closed state
            machine a financing partner moves through: RESEARCHED → … → ACTIVE
            PARTNER (reachable ONLY through a completed PILOT) with REJECTED /
            PARKED off-ramps. A provider is never marked ACTIVE merely because it
            was researched. Partnering is internal: Super-Admin only, never a brand's. */}
        {section === 'finance' && (
          <WorkspaceSection
            title="Financier lifecycle (Phase 7)"
            description="Every financing partner moves through ONE forward-only lifecycle — Researched → Qualified → Target → Contacted → Engaged → Due diligence → Terms → Pilot → Active partner — with Rejected and Parked as off-ramps. A provider is never marked ACTIVE merely because it was researched: Active partner is reachable only through a completed Pilot, and an illegal move is refused rather than guessed."
            domain="finance"
            action={
              <span className="text-ds-micro text-zinc-500" data-testid="financier-lifecycle-rule">
                {model.financierLifecycle.activeRequiresPilot && model.financierLifecycle.forwardOnly
                  ? 'ACTIVE requires a completed PILOT'
                  : 'LIFECYCLE NOT ENFORCED'}
              </span>
            }
          >
            <ol className="flex flex-wrap items-center gap-1" data-testid="control-financier-lifecycle">
              {model.financierLifecycle.stages.map((s, i) => (
                <li key={s.id} className="flex items-center gap-1">
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-ds-micro text-zinc-300">
                    {s.label}
                  </span>
                  {i < model.financierLifecycle.stageCount - 1 && (
                    <span className="text-ds-micro text-zinc-600">→</span>
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-ds-micro text-zinc-500">
              Off-ramps:{' '}
              <span className="text-zinc-400">
                {model.financierLifecycle.offRamps.map((o) => o.label).join(' · ')}
              </span>
            </p>
            <ul className="mt-4 space-y-1" data-testid="control-financier-lifecycle-candidates">
              {model.financierLifecycle.candidates.map((c) => (
                <li key={c.id} className="flex flex-col gap-0.5 border-b border-white/[0.06] pb-1 text-ds-label">
                  <span className="flex justify-between gap-3">
                    <span className="text-zinc-300">{c.label}</span>
                    <span className="font-mono text-zinc-400">{c.stageLabel}</span>
                  </span>
                  <span className="text-ds-micro text-zinc-500">
                    Next: {c.nextStages.length ? c.nextStages.map((n) => n.label).join(' · ') : 'terminal'}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-financier-lifecycle-basis">
              {model.financierLifecycle.basis} {model.financierLifecycle.disclaimer}
            </p>
          </WorkspaceSection>
        )}

        {/* §PHASE 8 — the founder capital workspace / pitch workspace. The ordered
            sections Mercenta prepares for a financing partner, each naming HOW its
            content is produced: every FINANCIAL figure comes from its deterministic
            canonical owner and AI may help only the narrative. The workspace is not
            ready while a required section is missing. Internal: Super-Admin only. */}
        {section === 'finance' && (
          <WorkspaceSection
            title="Pitch workspace (Phase 8)"
            description="The founder capital workspace: overview, business model, Vendor infrastructure, acquisition pipeline, purchase volumes, supplier payment requirements, capital requirements, facility request, repayment model, risk controls, evidence, documents, contact history, meetings, follow-ups and pitch preparation. Every financial figure comes from its deterministic canonical owner — AI may help prepare and explain the narrative only, never a number."
            domain="finance"
            action={
              <span className="text-ds-micro text-zinc-500" data-testid="pitch-workspace-rule">
                {model.pitchWorkspace.financialsDeterministic && model.pitchWorkspace.oneOwner
                  ? 'Financial figures stay deterministic'
                  : 'FINANCIALS NOT ENFORCED'}
              </span>
            }
          >
            <ul className="space-y-1" data-testid="control-pitch-workspace">
              {model.pitchWorkspace.sections.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-0.5 border-b border-white/[0.06] pb-1 text-ds-label"
                >
                  <span className="flex justify-between gap-3">
                    <span className="text-zinc-300">
                      {s.label}
                      {s.required && <span className="ml-2 text-ds-micro text-zinc-500">required</span>}
                    </span>
                    <span className="font-mono text-zinc-400">{s.kindLabel}</span>
                  </span>
                  <span className="text-ds-micro text-zinc-500">
                    {s.sourceOwner ? `Source: ${s.sourceOwner}` : 'Mercenta prose'}
                    {s.aiMayDraft ? ' · AI may draft' : ''}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-pitch-workspace-readiness">
              {model.pitchWorkspace.requiresAllRequiredSections
                ? model.pitchWorkspace.readiness.ready
                  ? 'Ready — every required section is present.'
                  : `Not ready — required section missing: ${model.pitchWorkspace.readiness.missingRequired.join(', ')}.`
                : 'READINESS NOT ENFORCED'}
            </p>
            <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-pitch-workspace-basis">
              {model.pitchWorkspace.basis} {model.pitchWorkspace.disclaimer}
            </p>
          </WorkspaceSection>
        )}

        {/* §PHASE 7 — the founder outreach pipeline. The ordered approach over the
            financing-partner universe: declared channels, touchpoint types and a
            deterministic cadence of day OFFSETS. Outreach begins at the TARGET stage
            and is forward-only — a followed-up provider must already have been
            contacted, and an unknown channel, type or stage is refused rather than
            guessed. Internal: Super-Admin only, never a brand's. */}
        {section === 'finance' && (
          <WorkspaceSection
            title="Founder outreach pipeline (Phase 7)"
            description="The ordered approach Mercenta runs over the financing-partner universe: declared channels, touchpoint types and a deterministic follow-up cadence of day OFFSETS. Outreach begins at the TARGET stage and is forward-only — a follow-up requires a provider already at CONTACTED or beyond — and a touchpoint naming an unknown channel, type or stage is refused rather than guessed."
            domain="finance"
            action={
              <span className="text-ds-micro text-zinc-500" data-testid="founder-outreach-rule">
                {model.founderOutreach.requiresTargetStage && model.founderOutreach.followUpRequiresContact
                  ? 'Outreach begins at TARGET · follow-up requires a contact'
                  : 'PIPELINE NOT ENFORCED'}
              </span>
            }
          >
            <ol className="flex flex-wrap items-center gap-1" data-testid="control-founder-outreach-cadence">
              {model.founderOutreach.cadence.map((s, i) => (
                <li key={s.id} className="flex items-center gap-1">
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-ds-micro text-zinc-300">
                    Day {s.dayOffset} · {s.typeLabel}
                  </span>
                  {i < model.founderOutreach.cadenceCount - 1 && (
                    <span className="text-ds-micro text-zinc-600">→</span>
                  )}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-ds-micro text-zinc-500">
              Channels:{' '}
              <span className="text-zinc-400">
                {model.founderOutreach.channels.map((c) => c.label).join(' · ')}
              </span>
            </p>
            <ul className="mt-4 space-y-1" data-testid="control-founder-outreach-touchpoints">
              {model.founderOutreach.demoTouchpoints.map((t) => (
                <li key={t.id} className="flex flex-col gap-0.5 border-b border-white/[0.06] pb-1 text-ds-label">
                  <span className="flex justify-between gap-3">
                    <span className="text-zinc-300">
                      {t.providerStageLabel} · {t.channelLabel} · {t.typeLabel}
                    </span>
                    <span className="font-mono text-zinc-400">
                      {t.allowed ? 'allowed' : t.refusal}
                    </span>
                  </span>
                  <span className="text-ds-micro text-zinc-500">{t.providerLabel}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-founder-outreach-basis">
              {model.founderOutreach.basis} {model.founderOutreach.disclaimer}
            </p>
          </WorkspaceSection>
        )}

        {/* §PHASE 7 — the financier universe. The REAL financing-partner universe:
            the provider taxonomy, the market scope, the full record and the research
            discipline. A provider enters ONLY with a NAMED, PUBLISHED source and a
            LAST-RESEARCHED date; an unknown type/market, an unsourced or undated
            entry, and an illustrative placeholder are all refused. The real universe
            holds ZERO providers — nothing is invented. Internal: Super-Admin only. */}
        {section === 'finance' && (
          <WorkspaceSection
            title="Financier universe (Phase 7)"
            description="The REAL financing-partner universe — banks and PO / inventory / trade / receivables financiers, working-capital, SME and e-commerce finance providers and alternative-credit funds across the UK, Europe, Africa, the US and other markets. Every provider must carry the FULL record: a legal name, a declared type, at least one declared market, a NAMED, PUBLISHED source and a LAST-RESEARCHED date. An unknown type or market, an unsourced or undated entry, and an illustrative placeholder are all refused — no provider is ever invented."
            domain="finance"
            action={
              <span className="text-ds-micro text-zinc-500" data-testid="financier-universe-rule">
                {model.financierUniverse.requiresNamedSource && model.financierUniverse.requiresResearchDate && model.financierUniverse.failsClosed
                  ? 'Named source + research date required'
                  : 'UNIVERSE NOT ENFORCED'}
              </span>
            }
          >
            <p className="text-ds-micro text-zinc-500">
              Provider types:{' '}
              <span className="text-zinc-400" data-testid="control-financier-universe-types">
                {model.financierUniverse.providerTypes.map((t) => t.label).join(' · ')}
              </span>
            </p>
            <p className="mt-1 text-ds-micro text-zinc-500">
              Markets:{' '}
              <span className="text-zinc-400" data-testid="control-financier-universe-markets">
                {model.financierUniverse.markets.map((m) => m.label).join(' · ')}
              </span>
            </p>
            <ul className="mt-4 space-y-1" data-testid="control-financier-universe-fields">
              {model.financierUniverse.recordFields.map((f) => (
                <li key={f.key} className="flex flex-col gap-0.5 border-b border-white/[0.06] pb-1 text-ds-label">
                  <span className="flex justify-between gap-3">
                    <span className="text-zinc-300">{f.label}</span>
                    <span className="font-mono text-zinc-400">{f.requiredForRealEntry ? 'required' : 'optional'}</span>
                  </span>
                  <span className="text-ds-micro text-zinc-500">{f.requirement}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-ds-micro text-zinc-500" data-testid="control-financier-universe-real">
              Real providers in the universe: <span className="font-mono text-zinc-300">{model.financierUniverse.realCount}</span> — none has been researched yet; every entry below is an unmistakable placeholder.
            </p>
            <ul className="mt-2 space-y-1" data-testid="control-financier-universe-placeholders">
              {model.financierUniverse.illustrative.map((r) => (
                <li key={r.id} className="flex flex-col gap-0.5 border-b border-white/[0.06] pb-1 text-ds-label">
                  <span className="flex justify-between gap-3">
                    <span className="text-zinc-300">{r.providerTypeLabel} · {r.marketLabels.join(', ')}</span>
                    <span className="font-mono text-zinc-400">{r.allowed ? 'allowed' : r.refusal}</span>
                  </span>
                  <span className="text-ds-micro text-zinc-500">{r.legalName}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-financier-universe-refusal">
              Fail-closed proof: {model.financierUniverse.exampleRefusal.refusal} — {model.financierUniverse.exampleRefusal.reason}
            </p>
            <p className="mt-3 text-ds-micro text-zinc-500" data-testid="control-financier-universe-rule-text">
              {model.financierUniverse.rules.join(' ')}
            </p>
            <p className="mt-2 text-ds-micro text-zinc-500" data-testid="control-financier-universe-basis">
              {model.financierUniverse.basis} {model.financierUniverse.disclaimer}
            </p>
          </WorkspaceSection>
        )}

        {section === 'compliance' && (
          <WorkspaceSection
            title="Compliance"
            description="Missing, rejected, expiring and approved documents. Automation never bypasses the gate."
            domain="compliance"
          >
            <Queue
              rows={[]}
              empty={
                <EmptyState
                  title="Document queues live in Compliance Approvals"
                  description="Open Compliance Approvals to review, verify or reject a document. The metrics above are derived from the canonical compliance records."
                />
              }
            />
          </WorkspaceSection>
        )}


        {section === 'automation' && (
          <>
            {/*
              §FOUNDATION — THE GLOBAL HALT (kill switch). One act stops every
              declared automation; it is enforced in the domain (`runAutomation`
              returns `skipped_halted` before reading anything), attributed and
              audited, and requires a reason. The banner is the honest state.
            */}
            <WorkspaceSection
              title="Emergency halt"
              description="One switch stops every declared automation. The halt is enforced in the domain — a halted run executes nothing, raises nothing and creates no approval."
              domain="risk"
            >
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-ds-md border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                data-testid="automation-halt-panel"
                data-halted={halt.halted ? 'true' : 'false'}
              >
                <p className="text-ds-label text-zinc-300" data-testid="automation-halt-state">
                  {halt.halted
                    ? `HALTED — ${halt.reason} (by ${halt.actor}, ${halt.at}). Every automation is skipped until this is cleared.`
                    : `Running normally — ${halt.reason}`}
                </p>
                <Button
                  variant={halt.halted ? 'secondary' : 'destructive'}
                  size="sm"
                  className="text-ds-micro"
                  data-testid="automation-halt-toggle"
                  onClick={() => {
                    setAutomationHalt(
                      !halt.halted,
                      actor,
                      halt.halted
                        ? 'Halt cleared by the founder from the Control Centre.'
                        : 'Emergency halt engaged by the founder from the Control Centre.'
                    );
                    setHaltPulse((p) => p + 1);
                  }}
                >
                  {halt.halted ? 'Resume automation' : 'Halt all automation'}
                </Button>
              </div>
            </WorkspaceSection>

            <WorkspaceSection
              title="Automation catalogue"
              description="What automation exists, when it last ran, whether it succeeded, what it affected, and how it can be safely retried."
              domain="risk"
            >
            <div className="overflow-hidden rounded-ds-lg border border-white/[0.06]" data-testid="automation-table">
              <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_1.6fr] gap-px bg-white/[0.06] text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-500">
                <span className="bg-ink-900 px-3 py-2">Automation</span>
                <span className="bg-ink-900 px-3 py-2">Status</span>
                <span className="bg-ink-900 px-3 py-2">Next run</span>
                <span className="bg-ink-900 px-3 py-2">Controls</span>
              </div>
              {model.automation.map((h) => (
                <div
                  key={h.id}
                  data-testid={`automation-row-${h.id}`}
                  className="grid grid-cols-[1.4fr_0.8fr_0.8fr_1.6fr] gap-px border-t border-white/[0.06] bg-white/[0.02] text-ds-label"
                >
                  <div className="bg-ink-900 px-3 py-2">
                    <p className="text-zinc-200">{h.name}</p>
                    <p className="text-ds-micro text-zinc-600">{h.cadence}</p>
                  </div>
                  <div className="bg-ink-900 px-3 py-2">
                    <span data-testid={`automation-status-${h.id}`}>
                      <Badge className="text-ds-micro">{h.status.replace(/_/g, ' ')}</Badge>
                    </span>
                    {!h.enabled && <p className="mt-1 text-ds-micro text-amber-300">disabled: {h.enabledReason}</p>}
                    {h.approvalsPending > 0 && (
                      <p className="mt-1 text-ds-micro text-amber-300">{h.approvalsPending} awaiting approval</p>
                    )}
                  </div>
                  <div className="bg-ink-900 px-3 py-2 font-mono text-ds-micro text-zinc-400">{h.nextRunAt}</div>
                  <div className="flex flex-wrap items-center gap-1.5 bg-ink-900 px-3 py-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-ds-micro"
                      data-testid={`automation-run-${h.id}`}
                      onClick={() => setDrawerRun(runAutomation(h.id as AutomationId, { actor }))}
                    >
                      Run
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-ds-micro"
                      disabled={!h.retryable}
                      data-testid={`automation-retry-${h.id}`}
                      onClick={() => {
                        const last = h.lastRun;
                        const run = last ? retryAutomation(last.id, actor) : null;
                        if (run) setDrawerRun(run);
                      }}
                    >
                      Retry
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-ds-micro"
                      data-testid={`automation-toggle-${h.id}`}
                      onClick={() =>
                        setAutomationEnabled(
                          h.id as AutomationId,
                          !h.enabled,
                          actor,
                          h.enabled ? 'Disabled by the founder from the Control Centre.' : 'Re-enabled by the founder.'
                        )
                      }
                    >
                      {h.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-ds-micro"
                      data-testid={`automation-simulate-failure-${h.id}`}
                      onClick={() => {
                        simulateAutomationFailure(
                          h.id as AutomationId,
                          'Simulated provider outage (deterministic test).',
                          actor
                        );
                        setDrawerRun(runAutomation(h.id as AutomationId, { actor, force: true }));
                      }}
                    >
                      Simulate failure
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-ds-micro"
                      data-testid={`automation-clear-failure-${h.id}`}
                      onClick={() => clearSimulatedFailure(h.id as AutomationId, actor)}
                    >
                      Clear
                    </Button>
                    {h.lastRun && (
                      <button
                        type="button"
                        className="text-ds-micro text-sky-300/90 hover:underline"
                        onClick={() => setDrawerRun(h.lastRun)}
                      >
                        Last run
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            </WorkspaceSection>
          </>
        )}


        {section === 'automation' && (
          <>
            <WorkspaceSection
              title="Approvals"
              description="Consequential automation steps stop here until a human decides. Every decision is attributed and audited."
              domain="finance"
            >
              <Queue
                rows={model.approvals.map((a) => ({
                  id: a.key,
                  ref: a.automationId,
                  title: a.entityId,
                  meta: a.reason,
                  status: { tone: 'warning', label: a.status },
                  facts: [{ label: 'requested', value: a.requestedAt }],
                  actionLabel: 'Approve',
                  onOpen: () =>
                    decideAutomationApproval(
                      a.key,
                      'approved',
                      actor,
                      'Approved by the founder from the Control Centre.'
                    ),
                  testId: `approval-row-${a.key}`,
                }))}
                empty={
                  <EmptyState
                    title="No decision is waiting"
                    description="No automation has stopped at a human approval gate."
                  />
                }
              />
            </WorkspaceSection>

            <WorkspaceSection
              title="Optional dependencies"
              description="Core operations never depend on an optional provider. If one disappears, Mercenta keeps operating and says so."
              domain="risk"
            >
              <ul className="space-y-1" data-testid="automation-dependencies">
                {model.dependencies.map((d) => (
                  <li key={d.providerId} className="rounded-ds-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-ds-label text-zinc-200">{d.label}</span>
                      <Badge className="text-ds-micro">{d.mode.replace(/_/g, ' ')}</Badge>
                    </div>
                    <p className="mt-1 text-ds-micro text-zinc-500">{d.degradation}</p>
                  </li>
                ))}
              </ul>
            </WorkspaceSection>
          </>
        )}


        {section === 'ai' && (
          <>
            <WorkspaceSection
              title="Founder brief"
              description="Deterministic facts first: every line is computed from a canonical record. The AI narrative is optional and clearly labelled."
              domain="intelligence"
            >
              <div className="space-y-3" data-testid="ai-brief">
                {!brief ? (
                  <p className="text-ds-label text-zinc-500">Composing the brief…</p>
                ) : (
                  <>
                    <div className="rounded-ds-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-ds-label font-semibold text-zinc-200">Narrative</span>
                        <span data-testid="ai-narrative-basis">
                          <Badge className="text-ds-micro">
                            {brief.narrative.basis === 'ai_interpretation' ? 'AI interpretation' : 'deterministic'}
                          </Badge>
                        </span>
                      </div>
                      <p className="mt-1 text-ds-label text-zinc-300" data-testid="ai-narrative">
                        {brief.narrative.text}
                      </p>
                      <p className="mt-1 text-ds-micro text-zinc-600">{brief.narrative.reason}</p>
                    </div>
                    {brief.facts.sections.map((s) => (
                      <div key={s.id} className="rounded-ds-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-ds-label font-semibold text-zinc-200">{s.title}</span>
                          <Badge className="text-ds-micro">canonical facts</Badge>
                        </div>
                        <ul className="mt-1 space-y-0.5">
                          {s.lines.slice(0, 6).map((l, i) => (
                            <li key={i} className="text-ds-label text-zinc-400">
                              {l}
                            </li>
                          ))}
                        </ul>
                        {s.sources.length > 0 && (
                          <p className="mt-1 text-ds-micro text-zinc-600">
                            sources: {s.sources.slice(0, 4).map((x) => `${x.type}:${x.id}`).join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                    {brief.facts.recommendedActions.length > 0 && (
                      <div className="rounded-ds-md border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                        <span className="text-ds-label font-semibold text-zinc-200">Recommended next actions</span>
                        <ul className="mt-1 space-y-1">
                          {brief.facts.recommendedActions.map((a) => (
                            <li key={a.label} className="flex flex-wrap items-center justify-between gap-2 text-ds-label">
                              <span className="text-zinc-300">
                                {a.label} <span className="text-zinc-600">— {a.reason}</span>
                              </span>
                              <button
                                type="button"
                                className="text-sky-300/90 hover:underline"
                                onClick={() => go(a.destination)}
                              >
                                Open
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </WorkspaceSection>
          </>
        )}


        {section === 'ai' && (
          <WorkspaceSection
            title="Ask Mercenta"
            description="Answers come from canonical records with citations. AI may rephrase the answer; it never invents a fact and never executes an action."
            domain="intelligence"
          >
            <div className="flex flex-wrap items-center gap-2">
              <input
                data-testid="ai-ask-input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                aria-label="Ask Mercenta a question"
                className="min-w-[240px] flex-1 rounded-ds-md border border-white/[0.08] bg-ink-850 px-3 py-2 text-ds-label text-zinc-200 outline-none focus:border-white/[0.2]"
              />
              <Button
                variant="secondary"
                size="sm"
                className="text-xs"
                onClick={ask}
                disabled={asking}
                data-testid="ai-ask-submit"
              >
                {asking ? 'Asking…' : 'Ask'}
              </Button>
            </div>
            {answer && (
              <div
                className="mt-3 rounded-ds-md border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                data-testid="ai-ask-answer"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span data-testid="ai-ask-intent">
                    <Badge className="text-ds-micro">{answer.intentLabel}</Badge>
                  </span>
                  <Badge className="text-ds-micro">canonical</Badge>
                </div>
                <p className="mt-1 text-ds-label text-zinc-200">{answer.answer}</p>
                <ul className="mt-1.5 space-y-0.5">
                  {answer.facts.slice(0, 6).map((f, i) => (
                    <li key={i} className="text-ds-label text-zinc-400">
                      {f}
                    </li>
                  ))}
                </ul>
                {answer.sources.length > 0 && (
                  <p className="mt-1 text-ds-micro text-zinc-600">
                    sources: {answer.sources.slice(0, 5).map((s) => `${s.type}:${s.id}`).join(', ')}
                  </p>
                )}
                <p className="mt-1.5 text-ds-micro text-zinc-600">
                  AI narrative: {answer.narrative.basis} — {answer.narrative.reason}
                </p>
              </div>
            )}
            <p className="mt-2 text-ds-micro text-zinc-600">
              Try: What needs my attention today? · Which invoices are overdue? · Which acquisition prospects need
              follow-up? · What automation failed recently?
            </p>
          </WorkspaceSection>
        )}

        {section === 'audit' && (
          <WorkspaceSection
            title="Audit"
            description="Administrative, automation and approval actions — each attributed to an actor with a reason."
            domain="risk"
          >
            <ActivityFeed
              entries={model.audit.map((a) => ({
                id: a.id,
                title: a.action.replace(/_/g, ' '),
                meta: `${a.reason} · ${a.actor}`,
                at: a.at,
                onOpen: () => go('audit_log'),
              }))}
              empty={<p className="text-ds-label text-zinc-600">No audit records yet this session.</p>}
            />
          </WorkspaceSection>
        )}
      </WorkspaceGrid>

      <RecordDrawer
        open={drawerPreAudit !== null}
        onClose={() => setDrawerPreAudit(null)}
        title={drawerPreAudit ? `Explore UK Market Fit — ${drawerPreAudit.brand}` : 'Assessment'}
        subtitle={drawerPreAudit ? `${drawerPreAudit.assessmentId} · ${drawerPreAudit.qualificationLabel}` : undefined}
        testId="control-preaudit-drawer"
      >
        {drawerPreAudit && (
          <>
            <RecordFieldList
              fields={[
                { label: 'Brand', value: drawerPreAudit.brand },
                { label: 'Website', value: drawerPreAudit.website },
                { label: 'Category', value: drawerPreAudit.category },
                { label: 'UK presence', value: drawerPreAudit.presence },
                { label: 'Qualification', value: drawerPreAudit.qualificationLabel },
                { label: 'Research basis', value: drawerPreAudit.researchMode },
                { label: 'Open questions', value: String(drawerPreAudit.openQuestions) },
                { label: 'Fed to acquisition', value: drawerPreAudit.fed ? 'yes' : 'no' },
                ...(drawerPreAudit.fedProspectId
                  ? [{ label: 'Canonical prospect', value: drawerPreAudit.fedProspectId }]
                  : []),
              ]}
            />
            <p className="mt-3 text-ds-label text-zinc-400">{drawerPreAudit.recommendedNextStep}</p>
            <p className="mt-3 text-ds-micro text-zinc-600">
              A pre-audit can never create a brand tenant. Converting this prospect requires the
              canonical onboarding lifecycle to complete.
            </p>
          </>
        )}
      </RecordDrawer>

      <RecordDrawer
        open={drawerCommercial !== null}
        onClose={() => setDrawerCommercial(null)}
        title={drawerCommercial ? drawerCommercial.product : 'Commercial readiness'}
        subtitle={
          drawerCommercial
            ? `${drawerCommercial.routeLabel} · owner ${drawerCommercial.ownerLabel}${
                drawerCommercial.dueDate ? ` · due ${drawerCommercial.dueDate}` : ''
              }`
            : undefined
        }
        testId="commercial-readiness-drawer"
      >
        {drawerCommercial && (
          <>
            <RecordFieldList
              fields={[
                { label: 'Route', value: drawerCommercial.routeLabel },
                { label: 'Brand', value: drawerCommercial.brandLabel },
                { label: 'Canonical product', value: drawerCommercial.productRef ?? 'not recorded' },
                { label: 'Next action owner', value: drawerCommercial.ownerLabel },
                { label: 'SLA deadline', value: drawerCommercial.dueDate ?? 'no deadline applies' },
                {
                  label: 'Canonical work item',
                  value: drawerCommercial.workItemId ?? 'none — no work is outstanding',
                },
                {
                  label: 'Routing decision',
                  value: drawerCommercial.routingDecisionId,
                },
                { label: 'Missing inputs', value: String(drawerCommercial.missingInputs.length) },
                { label: 'Open questions', value: String(drawerCommercial.openQuestions.length) },
                { label: 'Reassessed', value: drawerCommercial.updatedAt },
              ]}
            />

            <div className="mt-4" data-testid="commercial-readiness-conditions">
              <p className="text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Evaluated conditions — why this route
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {[...drawerCommercial.unmet, ...drawerCommercial.unevaluable].length === 0 && (
                  <li className="text-ds-label text-zinc-400">
                    Every declared commercial condition is satisfied, so the gate selected Ready.
                  </li>
                )}
                {drawerCommercial.unmet.map((c) => (
                  <li key={`unmet-${c.id}`} className="text-ds-label">
                    <span className="text-state-danger">Unmet</span>
                    <span className="text-zinc-300"> · {c.label}</span>
                    <span className="block text-ds-micro text-zinc-500">{c.observed}</span>
                  </li>
                ))}
                {drawerCommercial.unevaluable.map((c) => (
                  <li key={`unevaluable-${c.id}`} className="text-ds-label">
                    <span className="text-state-warning">Could not be evaluated</span>
                    <span className="text-zinc-300"> · {c.label}</span>
                    <span className="block text-ds-micro text-zinc-500">{c.reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            {drawerCommercial.missingInputs.length > 0 && (
              <div className="mt-4" data-testid="commercial-readiness-missing-inputs">
                <p className="text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Missing information
                </p>
                <ul className="mt-1.5 space-y-1">
                  {drawerCommercial.missingInputs.map((m) => (
                    <li key={m} className="text-ds-label text-zinc-400">
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-4 text-ds-label text-zinc-300">{drawerCommercial.nextStep}</p>
            <p className="mt-3 text-ds-micro text-zinc-600">{drawerCommercial.moqDisclaimer}</p>
            <p className="mt-3 text-ds-micro text-zinc-600">
              Commercial readiness states that the information Mercenta holds passes the declared checks. It is
              not a purchase order, a demand forecast, a margin or an approval.
            </p>
          </>
        )}
      </RecordDrawer>

      <RecordDrawer
        open={drawerRun !== null}
        onClose={() => setDrawerRun(null)}
        title={drawerRun ? `Automation run ${drawerRun.id}` : 'Automation run'}
        subtitle={drawerRun ? `${drawerRun.automationId} · ${drawerRun.status}` : undefined}
        testId="control-run-drawer"
      >
        {drawerRun && (
          <>
            <RecordFieldList
              fields={[
                { label: 'Status', value: drawerRun.status },
                { label: 'Run date', value: drawerRun.at },
                { label: 'Attempt', value: String(drawerRun.attempt) },
                { label: 'Actor', value: drawerRun.actor },
                { label: 'Evaluated', value: String(drawerRun.evaluated) },
                { label: 'Raised', value: String(drawerRun.raised) },
                { label: 'Escalated', value: String(drawerRun.escalated) },
                { label: 'Fingerprint', value: drawerRun.inputDigest },
                ...(drawerRun.error ? [{ label: 'Error', value: drawerRun.error }] : []),
              ]}
            />
            <ul className="mt-3 space-y-1">
              {drawerRun.notes.map((n, i) => (
                <li key={i} className="text-ds-label text-zinc-400">
                  {n}
                </li>
              ))}
            </ul>
          </>
        )}
      </RecordDrawer>
    </WorkspaceFrame>
  );
}

