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
import type { PreAuditQueueRow, CommercialReadinessQueueRow } from '@/lib/commandCentre/controlCentre';

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

  const attentionRows: QueueRowData[] = model.attention.map((a) => ({
    id: a.id,
    title: a.title,
    meta: a.detail,
    status: {
      tone: a.priority === 'urgent' ? 'danger' : a.priority === 'high' ? 'warning' : 'neutral',
      label: a.priority,
    },
    facts: [{ label: 'source', value: a.source }],
    actionLabel: 'Open',
    onOpen: () => go(a.destination),
    testId: `control-attention-row-${a.id}`,
  }));

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
        description="The operating centre for the whole platform: business, brands, acquisition, operations, finance, compliance, automation, AI and audit — all derived from canonical records, with the exact next action for each."
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

        {notice && (
          <p className="text-ds-label text-zinc-400" data-testid="control-notice">
            {notice}
          </p>
        )}


        {section === 'business' && (
          <WorkspaceSection
            title="Attention"
            description="Critical work, pending approvals, failed automation and overdue items — each opens the record that needs the decision."
            domain="risk"
          >
            <Queue
              rows={attentionRows}
              empty={
                <EmptyState
                  title="Nothing needs attention"
                  description="No critical work, pending approval, failed automation or overdue item is recorded."
                />
              }
            />
          </WorkspaceSection>
        )}

        {section === 'brands' && (
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
            title="Work"
            description="The same operating layer the Work Management surface uses — no second task system."
            domain="logistics"
          >
            <Queue
              rows={attentionRows.filter((r) => r.id.startsWith('work-') || r.id.startsWith('overdue-'))}
              empty={<EmptyState title="No operational work" description="No work item is outstanding." />}
            />
          </WorkspaceSection>
        )}


        {section === 'finance' && (
          <WorkspaceSection
            title="Finance"
            description="Invoices, payments, deductions and escalations — the money chain still requires explicit human approval at the payout gate."
            domain="finance"
          >
            <Queue
              rows={model.attention
                .filter((a) => a.source === 'automation_approval')
                .map((a) => ({
                  id: a.id,
                  title: a.title,
                  meta: a.detail,
                  status: { tone: 'warning' as const, label: a.priority },
                  actionLabel: 'Open',
                  onOpen: () => go(a.destination),
                  testId: `control-finance-row-${a.id}`,
                }))}
              empty={
                <EmptyState
                  title="No finance decision is waiting"
                  description="Unpaid invoices and open deductions are tracked as work items with declared deadlines — see the Finance metrics above and the Accounting surface."
                />
              }
            />
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
                className="min-w-[240px] flex-1 rounded-ds-md border border-white/[0.08] bg-ink-850 px-3 py-2 text-[12px] text-zinc-200 outline-none focus:border-white/[0.2]"
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
                <p className="mt-1 text-[12px] text-zinc-200">{answer.answer}</p>
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

