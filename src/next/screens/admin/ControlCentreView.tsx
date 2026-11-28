import { Play, ShieldAlert } from 'lucide-react';
import {
  ConsoleProgressTrack,
  ConsoleTabs,
  NoticeBanner,
  SectionCard,
  formatGbp,
} from '@/next/components/ConsoleCharts';
import {
  EmptyStateBlock,
  InlineStatus,
  MetricStrip,
  PageHeader,
  SlideOverDrawer,
  type MetricItem,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';
import type {
  AutomationId,
  AutomationRun,
} from '@/lib/automation/registry';
import type {
  CommercialReadinessQueueRow,
  ControlCentreModel,
  ControlCentreSectionId,
  PreAuditQueueRow,
} from '@/lib/commandCentre/controlCentre';
import type { FounderBrief, MercentaAnswer } from '@/lib/ai/founderOpsAi';

export interface ControlCentreIntegrationIssue {
  id: string;
  mode: string;
  error: string;
}

export interface ControlCentreViewProps {
  model: ControlCentreModel;
  sections: readonly { id: ControlCentreSectionId; label: string }[];
  section: ControlCentreSectionId;
  onSectionChange: (next: ControlCentreSectionId) => void;
  halt: { halted: boolean; reason: string; actor: string; at: string };
  onToggleHalt: () => void;
  onRunAllAutomations: () => void;
  onRunAutomation: (id: AutomationId) => void;
  onRetryAutomation: (runId: string) => void;
  onToggleAutomationEnabled: (id: AutomationId, currentlyEnabled: boolean) => void;
  onSimulateAutomationFailure: (id: AutomationId) => void;
  onClearAutomationFailure: (id: AutomationId) => void;
  onApproveAutomation: (key: string) => void;
  onFeedPreAudit: (assessmentId: string) => void;
  notice: string | null;
  preAuditNotice: string | null;
  integrationIssues: ControlCentreIntegrationIssue[];
  brief: FounderBrief | null;
  question: string;
  onQuestionChange: (q: string) => void;
  onAsk: () => void;
  asking: boolean;
  answer: MercentaAnswer | null;
  drawerRun: AutomationRun | null;
  onOpenRunDrawer: (run: AutomationRun | null) => void;
  drawerPreAudit: PreAuditQueueRow | null;
  onOpenPreAuditDrawer: (row: PreAuditQueueRow | null) => void;
  drawerCommercial: CommercialReadinessQueueRow | null;
  onOpenCommercialDrawer: (row: CommercialReadinessQueueRow | null) => void;
  onNavigate: (destination: string) => void;
}

export function ControlCentreView({
  model,
  sections,
  section,
  onSectionChange,
  halt,
  onToggleHalt,
  onRunAllAutomations,
  onRunAutomation,
  onRetryAutomation,
  onToggleAutomationEnabled,
  onSimulateAutomationFailure,
  onClearAutomationFailure,
  onApproveAutomation,
  onFeedPreAudit,
  notice,
  preAuditNotice,
  integrationIssues,
  brief,
  question,
  onQuestionChange,
  onAsk,
  asking,
  answer,
  drawerRun,
  onOpenRunDrawer,
  drawerPreAudit,
  onOpenPreAuditDrawer,
  drawerCommercial,
  onOpenCommercialDrawer,
  onNavigate,
}: ControlCentreViewProps) {
  const sectionMetrics: MetricItem[] = model.metrics[section].map((m) => ({
    id: m.id,
    label: m.label,
    value: m.value,
    context: m.context,
    onClick: () => onNavigate(m.destination),
    testId: `control-metric-${m.id}`,
    valueTestId: `control-metric-value-${m.id}`,
  }));

  const tabItems = sections.map((s) => ({
    id: s.id,
    label: s.label,
    count: s.id === 'operations' ? model.counts.overdueWork : undefined,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Control Centre"
        description="Founder operating centre across business, brands, commercial readiness, acquisition, operations, finance, compliance, automation, AI, and audit."
        meta={
          <>
            <span className="font-mono">As at {model.generatedFor}</span>
            <span className="font-mono tabular-nums">{model.counts.openWork} open work</span>
            <span className="font-mono tabular-nums">{model.counts.overdueWork} overdue</span>
            <span className="font-mono tabular-nums">{model.counts.automationDeclared} automations</span>
          </>
        }
        actions={
          <button
            type="button"
            onClick={onRunAllAutomations}
            data-testid="automation-run-all"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" />
            Run all automations
          </button>
        }
      />

      <ConsoleTabs
        tabs={tabItems}
        value={section}
        onChange={onSectionChange}
        ariaLabel="Control Centre sections"
      />

      {notice && <NoticeBanner tone="info" message={notice} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MetricStrip items={sectionMetrics} columns={4} />

          <SectionCard
            title="The single action list lives in Work Management"
            description="Operational tasks and founder-scoped controls are ranked once with explicit WHY reasons in Work Management."
            actions={
              <button
                type="button"
                onClick={() => onNavigate('work')}
                data-testid="control-open-work"
                className="px-3 py-1.5 rounded-md border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
              >
                Open Work Management
              </button>
            }
          >
            <p className="text-[13px] text-secondary font-mono tabular-nums">
              {model.counts.openWork} open item(s) · {model.counts.criticalWork} critical ·{' '}
              {model.counts.overdueWork} overdue · {model.counts.approvalsPending} approval(s) pending
            </p>
          </SectionCard>

          {section === 'business' && (
            <>
              <SectionCard
                title="Founder intelligence"
                description="Standing founder questions bound to deterministic canonical owners."
                actions={
                  <span className="text-[11px] font-mono text-faint" data-testid="founder-intelligence-status">
                    {model.founderIntelligence.questionCount} questions · AI may only summarise
                  </span>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="founder-intelligence-questions">
                  {model.founderIntelligence.questions.map((q) => (
                    <div key={q.id} className="border border-hairline rounded-md p-3">
                      <div className="text-[13px] font-medium text-ink-950">{q.question}</div>
                      <div className="mt-1 text-[12px] text-ink-600">{q.about}</div>
                      <div className="mt-1 font-mono text-[11px] text-faint">{q.dataOwner}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-[12px] text-ink-600 space-y-1">
                  <p data-testid="founder-intelligence-refusal">
                    Fail-closed proof: “{model.founderIntelligence.exampleRefusal.question}” →{' '}
                    {model.founderIntelligence.exampleRefusal.refusal}. {model.founderIntelligence.exampleRefusal.reason}
                  </p>
                  <p className="text-[11px] text-faint" data-testid="founder-intelligence-basis">
                    {model.founderIntelligence.basis} {model.founderIntelligence.disclaimer}
                  </p>
                </div>
              </SectionCard>

              <SectionCard
                title="Integrated loop (Phase 12)"
                description="Forward-only end-to-end acquisition, capital, and operations loop."
                actions={
                  <span className="text-[11px] font-mono text-faint" data-testid="control-integrated-loop-status">
                    {model.integratedLoop.stageCount} stages · forward-only
                  </span>
                }
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" data-testid="control-integrated-loop-stages">
                  {model.integratedLoop.stages.map((s, idx) => (
                    <div key={s.id} className="border border-hairline rounded-md p-3">
                      <div className="text-[12px] font-semibold text-ink-950">
                        {idx + 1}. {s.label}
                      </div>
                      <div className="mt-1 text-[12px] text-ink-600">{s.about}</div>
                      <div className="mt-1 font-mono text-[11px] text-faint">{s.dataOwner}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[12px] text-ink-600" data-testid="control-integrated-loop-refusal">
                  Fail-closed proof: {model.integratedLoop.exampleRefusal.from} → {model.integratedLoop.exampleRefusal.to} →{' '}
                  {model.integratedLoop.exampleRefusal.refusal}. {model.integratedLoop.exampleRefusal.reason}
                </p>
              </SectionCard>

              <SectionCard
                title="Acquisition intelligence at scale (Phase 10)"
                description="Dimensions backed only by declared integration providers."
                actions={
                  <span className="text-[11px] font-mono text-faint" data-testid="acquisition-intelligence-rule">
                    {model.acquisitionIntelligence.requiresNamedSource && model.acquisitionIntelligence.neverFabricates
                      ? 'Real source required'
                      : 'Rule check pending'}
                  </span>
                }
              >
                <p className="text-[12px] text-ink-600 mb-3" data-testid="control-acquisition-intelligence-dimensions">
                  Dimensions: {model.acquisitionIntelligence.dimensions.map((d) => d.label).join(' · ')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" data-testid="control-acquisition-intelligence-sources">
                  {model.acquisitionIntelligence.sources.map((s) => (
                    <div key={s.id} className="border border-hairline rounded-md p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-medium text-ink-950">{s.label}</span>
                        <InlineStatus
                          label={s.available ? 'Available' : 'Not available'}
                          tone={s.available ? 'success' : 'neutral'}
                        />
                      </div>
                      <div className="mt-1 font-mono text-[11px] text-faint">{s.providerId}</div>
                      <div className="mt-1 text-[12px] text-ink-600">{s.suppliedLabels.join(', ')}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[12px] text-ink-600" data-testid="control-acquisition-intelligence-real">
                  Real signals produced: <strong className="font-mono">{model.acquisitionIntelligence.realSignalCount}</strong> ({model.acquisitionIntelligence.availableSourceCount} of {model.acquisitionIntelligence.sources.length} available).
                </p>
              </SectionCard>

              <SectionCard
                title="UK opportunity states at scale (Phase 10)"
                description="States A–F require an available evidence source; missing sources fail closed."
                actions={
                  <span className="text-[11px] font-mono text-faint" data-testid="uk-opportunity-states-rule">
                    States asserted: {model.ukOpportunityStates.realAssertedCount}
                  </span>
                }
              >
                <div className="divide-y divide-hairline-06 border border-hairline rounded-md" data-testid="control-uk-opportunity-states-states">
                  {model.ukOpportunityStates.states.map((st) => (
                    <div key={st.id} className="px-3 py-2.5 flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[13px] font-medium text-ink-950">{st.id} — {st.label}</div>
                        <div className="text-[11px] text-faint">Evidence: {st.evidenceLabels.join(' · ')}</div>
                      </div>
                      <span className="font-mono text-[11px] text-ink-600 shrink-0">
                        {st.assertable ? 'Asserted' : st.refusal}
                      </span>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </>
          )}

          {section === 'brands' && (
            <>
              <SectionCard
                title="Brand portfolio overview"
                actions={
                  <button
                    type="button"
                    onClick={() => onNavigate('crm')}
                    className="text-[12px] font-medium text-[var(--mr-accent)] hover:underline"
                  >
                    Open Brand CRM
                  </button>
                }
              >
                <EmptyStateBlock
                  title="Full tenant list lives in Brand CRM"
                  description="Open Brand CRM for complete tenant profiles, contract overrides, compliance checks, and agreement logs."
                />
              </SectionCard>

              <SectionCard title="Brand learning loop & onboarding curriculum">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" data-testid="learning-loop-stages">
                  {model.learningLoop.stages.map((s) => (
                    <div key={s.id} className="border border-hairline rounded-md p-3">
                      <div className="text-[11px] uppercase tracking-[0.06em] text-faint">
                        {s.label}{s.gate ? ' · gate' : ''}
                      </div>
                      <div className="mt-1 text-[13px] font-medium text-ink-950">{s.meaning}</div>
                      <div className="mt-1 text-[12px] text-ink-600">{s.action}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-hairline">
                  <div className="text-[12px] font-semibold text-ink-950 mb-2">
                    Academy curriculum ({model.onboardingCurriculum.stages.length} stages)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" data-testid="curriculum-stages">
                    {model.onboardingCurriculum.stages.map((s) => (
                      <div key={s.id} className="border border-hairline rounded-md p-2.5">
                        <div className="text-[12px] font-medium text-ink-950">{s.order}. {s.label}</div>
                        <div className="text-[11px] text-faint">{s.topicCount} topic(s)</div>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Shared workflows & tutorial recordings"
                description={`Served UI version ${model.tutorialRecordings.servedUiVersion} · Current ${model.tutorialRecordings.currentCount} · Pending ${model.tutorialRecordings.pendingCount}`}
              >
                <ul className="divide-y divide-hairline-06 border border-hairline rounded-md">
                  {model.tutorialRecordings.recordings.map((t) => (
                    <li key={t.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-medium text-ink-950">{t.title}</div>
                        <div className="text-[11px] text-faint font-mono">
                          {t.workflowLabel} · UI {t.compatibleUiVersion} · v{t.tutorialVersion}
                        </div>
                      </div>
                      <InlineStatus
                        label={t.playable ? 'Current' : String(t.refusal ?? t.status)}
                        tone={t.playable ? 'success' : 'neutral'}
                      />
                    </li>
                  ))}
                </ul>
              </SectionCard>

              <SectionCard
                title="Credential vault (T-7)"
                description={`Usable: ${model.credentialVault.usableCount} · Stored: ${model.credentialVault.storedCount} · Store: ${model.credentialVault.durableStore ? 'Durable' : 'In-memory (not durable)'}`}
              >
                <ul className="divide-y divide-hairline-06 border border-hairline rounded-md" data-testid="control-credential-vault-list">
                  {model.credentialVault.providers.map((p) => (
                    <li key={p.providerId} className="px-3 py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-mono text-[12px] font-medium text-ink-950">{p.providerId}</div>
                        <div className="text-[11px] text-faint">
                          {p.authMethod} · fields: {p.secretFieldKeys.length > 0 ? p.secretFieldKeys.join(', ') : '—'}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-ink-600">{p.usable ? 'Usable' : p.refusal}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </>
          )}

          {section === 'commercial' && (
            <>
              <SectionCard
                title="Commercial readiness"
                description="Product readiness routes, missing inputs, and raised commercial work."
                actions={
                  <span className="text-[11px] font-mono text-faint" data-testid="commercial-guidance-topics">
                    {model.commercial.brandGuidanceTopics} guidance topic(s)
                  </span>
                }
              >
                {model.commercial.rows.length === 0 ? (
                  <EmptyStateBlock
                    title="No product has been commercially assessed yet"
                    description="Products enter commercial assessment from Explore UK Market Fit pre-audits."
                  />
                ) : (
                  <ul className="divide-y divide-hairline-06 border border-hairline rounded-md">
                    {model.commercial.rows.map((r) => {
                      const tone: SemanticTone =
                        r.route === 'ready'
                          ? 'success'
                          : r.route === 'blocked'
                            ? 'danger'
                            : r.route === 'remediation'
                              ? 'warning'
                              : 'info';
                      return (
                        <li
                          key={r.recordId}
                          data-testid={`commercial-readiness-queue-row-${r.recordId}`}
                          className="px-3 py-3 flex flex-wrap items-center justify-between gap-3"
                        >
                          <div>
                            <div className="text-[13px] font-medium text-ink-950">
                              {r.product} <span className="font-mono text-[11px] text-faint">· {r.routeLabel}</span>
                            </div>
                            <div className="text-[12px] text-ink-600">
                              {r.brandLabel} · owner {r.ownerLabel}
                              {r.missingInputs.length > 0 ? ` · ${r.missingInputs.length} missing` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <InlineStatus label={r.route} tone={tone} />
                            <button
                              type="button"
                              onClick={() => onOpenCommercialDrawer(r)}
                              className="text-[12px] font-medium text-[var(--mr-accent)] hover:underline"
                            >
                              Open
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SectionCard>

              <SectionCard
                title="Localisation, SEO & Amazon governance"
                description={`${model.localisation.markets.length} source markets · ${model.amazonGovernance.verifiedCount}/${model.amazonGovernance.sourceCount} governance docs verified`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5" data-testid="localisation-concepts-grid">
                  {model.localisation.concepts.map((c) => (
                    <div key={c.id} className="border border-hairline rounded-md p-3">
                      <div className="text-[11px] uppercase tracking-[0.06em] text-faint">{c.label}</div>
                      <div className="mt-1 text-[12px] text-ink-900">{c.description}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-hairline grid grid-cols-1 sm:grid-cols-3 gap-2.5" data-testid="amazon-governance-sources">
                  {model.amazonGovernance.sources.map((s) => (
                    <div key={s.id} className="border border-hairline rounded-md p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-faint">{s.id}</span>
                        <InlineStatus
                          label={s.status}
                          tone={s.status === 'verified' ? 'success' : 'warning'}
                        />
                      </div>
                      <div className="mt-1 text-[12px] font-medium text-ink-950">{s.label}</div>
                      <div className="text-[11px] text-ink-600">{s.governs}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </>
          )}

          {section === 'acquisition' && (
            <>
              <SectionCard
                title="Acquisition pipeline"
                description="Canonical stage distribution across prospects."
                actions={
                  <button
                    type="button"
                    onClick={() => onNavigate('crm')}
                    className="text-[12px] font-medium text-[var(--mr-accent)] hover:underline"
                  >
                    Open CRM
                  </button>
                }
              >
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {model.acquisition.stages.slice(0, 8).map((st) => (
                    <div key={st.id} className="border border-hairline rounded-md p-2.5">
                      <div className="text-[11px] text-faint">{st.label}</div>
                      <div className="mt-1 font-mono text-[18px] font-semibold text-ink-950">{st.count}</div>
                      <div className="mt-1.5">
                        <ConsoleProgressTrack value={Math.round(st.share * 100)} max={100} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="control-acquisition-conversion">
                  <div className="border border-hairline rounded-md p-3">
                    <div className="text-[11px] uppercase tracking-[0.06em] text-faint">Contacted</div>
                    <div className="mt-1 font-mono text-[18px] font-semibold text-ink-950">
                      {model.acquisitionConversion.counts.contacted}
                    </div>
                  </div>
                  <div className="border border-hairline rounded-md p-3">
                    <div className="text-[11px] uppercase tracking-[0.06em] text-faint">Replied</div>
                    <div className="mt-1 font-mono text-[18px] font-semibold text-ink-950">
                      {model.acquisitionConversion.counts.replied}
                    </div>
                  </div>
                  <div className="border border-hairline rounded-md p-3">
                    <div className="text-[11px] uppercase tracking-[0.06em] text-faint">Engaged</div>
                    <div className="mt-1 font-mono text-[18px] font-semibold text-ink-950">
                      {model.acquisitionConversion.counts.engaged}
                    </div>
                  </div>
                  <div className="border border-hairline rounded-md p-3">
                    <div className="text-[11px] uppercase tracking-[0.06em] text-faint">Converted</div>
                    <div className="mt-1 font-mono text-[18px] font-semibold text-ink-950">
                      {model.acquisitionConversion.counts.converted}
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Prospects & Explore UK Market Fit pre-audits"
                description="Feed qualified assessments into acquisition (a prospect is not yet a brand tenant)."
              >
                {preAuditNotice && (
                  <div className="mb-3">
                    <NoticeBanner tone="info" message={preAuditNotice} />
                  </div>
                )}
                {model.preAudit.rows.length === 0 ? (
                  <EmptyStateBlock
                    title="No pre-audit assessments yet"
                    description="Public Explore UK Market Fit assessments appear here for founder triage."
                  />
                ) : (
                  <ul className="divide-y divide-hairline-06 border border-hairline rounded-md">
                    {model.preAudit.rows.slice(0, 12).map((r) => (
                      <li
                        key={r.assessmentId}
                        data-testid={`control-preaudit-row-${r.assessmentId}`}
                        className="px-3 py-2.5 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-[13px] font-medium text-ink-950">{r.brand}</div>
                          <div className="text-[12px] text-ink-600">
                            {r.category} · {r.presence} · {r.openQuestions} open question(s)
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <InlineStatus
                            label={r.fed ? 'Fed to acquisition' : r.qualificationLabel}
                            tone={r.qualification === 'qualified' ? 'success' : r.qualification === 'ineligible' ? 'danger' : 'warning'}
                          />
                          {r.qualification === 'qualified' && !r.fed ? (
                            <button
                              type="button"
                              onClick={() => onFeedPreAudit(r.assessmentId)}
                              className="px-2.5 py-1 rounded bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)]"
                            >
                              Feed to acquisition
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onOpenPreAuditDrawer(r)}
                              className="text-[12px] font-medium text-[var(--mr-accent)] hover:underline"
                            >
                              Open
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </>
          )}

          {section === 'operations' && (
            <SectionCard
              title="Object resolution"
              description="Canonical chain Amazon object → Mercenta object → brand → tenant."
            >
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4" data-testid="control-object-resolution">
                {[
                  { label: 'Channel objects', value: model.objectResolution.total },
                  { label: 'Resolved', value: model.objectResolution.resolved },
                  { label: 'Unknown', value: model.objectResolution.unknown },
                  { label: 'Cross-tenant', value: model.objectResolution.crossTenant },
                  { label: 'Replays deduped', value: model.objectResolution.replays },
                ].map((tile) => (
                  <div key={tile.label} className="border border-hairline rounded-md p-3">
                    <div className="text-[11px] uppercase tracking-[0.06em] text-faint">{tile.label}</div>
                    <div className="mt-1 font-mono text-[18px] font-semibold text-ink-950">{tile.value}</div>
                  </div>
                ))}
              </div>
              {model.objectResolution.unresolved.length === 0 ? (
                <EmptyStateBlock
                  title="Every channel object resolved to one tenant"
                  description="Unknown or ambiguous cross-tenant objects surface here for founder review."
                />
              ) : (
                <ul className="divide-y divide-hairline-06 border border-hairline rounded-md">
                  {model.objectResolution.unresolved.map((r) => (
                    <li key={r.key} className="px-3 py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-medium text-ink-950">
                          Unresolved {r.ref.objectType} “{r.ref.externalId}”
                        </div>
                        <div className="text-[12px] text-ink-600">{r.reason}</div>
                      </div>
                      <InlineStatus
                        label={r.outcome === 'cross_tenant' ? 'Cross-tenant' : 'Unknown'}
                        tone={r.outcome === 'cross_tenant' ? 'danger' : 'warning'}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}

          {section === 'finance' && (
            <>
              <SectionCard
                title="Capital requirement & financing routes (Model B)"
                description="Internal capital and financing posture — never exposed to brand tenants."
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4" data-testid="control-capital-requirement">
                  <div className="border border-hairline rounded-md p-3">
                    <div className="text-[11px] uppercase text-faint">Capital needed</div>
                    <div className="mt-1 font-mono text-[18px] font-semibold text-ink-950">
                      {formatGbp(model.capitalRequirement.totalRequiredFundingGbp)}
                    </div>
                  </div>
                  <div className="border border-hairline rounded-md p-3">
                    <div className="text-[11px] uppercase text-faint">Advance drawn</div>
                    <div className="mt-1 font-mono text-[18px] font-semibold text-ink-950">
                      {formatGbp(model.capitalRequirement.totalAdvanceDrawnGbp)}
                    </div>
                  </div>
                  <div className="border border-hairline rounded-md p-3">
                    <div className="text-[11px] uppercase text-faint">Utilisation</div>
                    <div className="mt-1 font-mono text-[18px] font-semibold text-ink-950">
                      {model.capitalRequirement.facilityUtilisationPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="control-financing-routes">
                  {model.financingRouting.byRoute.map((b) => (
                    <div key={b.routeId} className="border border-hairline rounded-md p-3">
                      <div className="text-[11px] uppercase text-faint">{b.label}</div>
                      <div className="mt-1 font-mono text-[16px] font-semibold text-ink-950">
                        {b.count} · {formatGbp(b.advanceGbp)}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="Financier lifecycle & pitch workspace"
                description={`${model.financierLifecycle.candidates.length} candidate(s) · Pitch workspace ${model.pitchWorkspace.readiness.ready ? 'Ready' : 'Missing required sections'}`}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ul className="divide-y divide-hairline-06 border border-hairline rounded-md">
                    {model.financierLifecycle.candidates.map((c) => (
                      <li key={c.id} className="px-3 py-2 flex items-center justify-between gap-2 text-[12px]">
                        <span className="font-medium text-ink-950">{c.label}</span>
                        <span className="font-mono text-ink-600">{c.stageLabel}</span>
                      </li>
                    ))}
                  </ul>
                  <ul className="divide-y divide-hairline-06 border border-hairline rounded-md">
                    {model.pitchWorkspace.sections.slice(0, 8).map((s) => (
                      <li key={s.id} className="px-3 py-2 flex items-center justify-between gap-2 text-[12px]">
                        <span className="text-ink-900">{s.label}</span>
                        <span className="font-mono text-faint">{s.kindLabel}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </SectionCard>
            </>
          )}

          {section === 'compliance' && (
            <SectionCard
              title="Compliance overview"
              actions={
                <button
                  type="button"
                  onClick={() => onNavigate('compliance')}
                  className="text-[12px] font-medium text-[var(--mr-accent)] hover:underline"
                >
                  Open Compliance Approvals
                </button>
              }
            >
              <EmptyStateBlock
                title="Document review queue lives in Compliance Approvals"
                description="Review, verify, or reject submitted brand compliance files from Compliance Approvals."
              />
            </SectionCard>
          )}

          {section === 'automation' && (
            <>
              <SectionCard
                title="Emergency halt"
                description="One switch stops every declared automation in the domain registry."
              >
                <div
                  className="flex flex-wrap items-center justify-between gap-3"
                  data-testid="automation-halt-panel"
                  data-halted={halt.halted ? 'true' : 'false'}
                >
                  <div className="flex items-start gap-2.5 text-[13px] text-ink-800" data-testid="automation-halt-state">
                    <ShieldAlert className="w-4 h-4 text-[var(--mr-accent)] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>
                      {halt.halted
                        ? `HALTED — ${halt.reason} (${halt.actor}, ${halt.at})`
                        : `Running normally — ${halt.reason}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleHalt}
                    data-testid="automation-halt-toggle"
                    className={`px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap ${
                      halt.halted
                        ? 'border border-hairline-strong bg-surface-raised text-ink-900 hover:bg-surface'
                        : 'bg-red-700 text-on-dark hover:bg-red-800'
                    }`}
                  >
                    {halt.halted ? 'Resume automation' : 'Halt all automation'}
                  </button>
                </div>
              </SectionCard>

              <SectionCard
                title="Automation catalogue"
                description="Run, retry, enable/disable, or test simulated provider failures."
              >
                <div className="divide-y divide-hairline-06 border border-hairline rounded-md" data-testid="automation-table">
                  {model.automation.map((h) => (
                    <div
                      key={h.id}
                      data-testid={`automation-row-${h.id}`}
                      className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div>
                        <div className="text-[13px] font-medium text-ink-950">{h.name}</div>
                        <div className="text-[11px] text-faint font-mono">
                          {h.cadence} · next {h.nextRunAt} ·{' '}
                          <span data-testid={`automation-status-${h.id}`}>{h.status.replace(/_/g, ' ')}</span>
                        </div>
                        {!h.enabled && (
                          <div className="text-[11px] text-state-warning">Disabled: {h.enabledReason}</div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onRunAutomation(h.id as AutomationId)}
                          data-testid={`automation-run-${h.id}`}
                          className="px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[11px] font-medium text-ink-900 hover:bg-surface"
                        >
                          Run
                        </button>
                        <button
                          type="button"
                          disabled={!h.retryable}
                          onClick={() => h.lastRun && onRetryAutomation(h.lastRun.id)}
                          data-testid={`automation-retry-${h.id}`}
                          className="px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[11px] font-medium text-ink-900 disabled:opacity-40 hover:bg-surface"
                        >
                          Retry
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleAutomationEnabled(h.id as AutomationId, h.enabled)}
                          data-testid={`automation-toggle-${h.id}`}
                          className="px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[11px] font-medium text-ink-900 hover:bg-surface"
                        >
                          {h.enabled ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onSimulateAutomationFailure(h.id as AutomationId)}
                          data-testid={`automation-simulate-failure-${h.id}`}
                          className="px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[11px] font-medium text-ink-900 hover:bg-surface"
                        >
                          Simulate failure
                        </button>
                        <button
                          type="button"
                          onClick={() => onClearAutomationFailure(h.id as AutomationId)}
                          data-testid={`automation-clear-failure-${h.id}`}
                          className="px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[11px] font-medium text-ink-900 hover:bg-surface"
                        >
                          Clear
                        </button>
                        {h.lastRun && (
                          <button
                            type="button"
                            onClick={() => onOpenRunDrawer(h.lastRun)}
                            className="text-[11px] font-medium text-[var(--mr-accent)] hover:underline ml-1"
                          >
                            Last run
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard
                title="Pending human approvals"
                description="Consequential automation steps awaiting founder sign-off."
              >
                {model.approvals.length === 0 ? (
                  <EmptyStateBlock
                    title="No decision waiting"
                    description="No automation has stopped at a human approval gate."
                  />
                ) : (
                  <ul className="divide-y divide-hairline-06 border border-hairline rounded-md">
                    {model.approvals.map((a) => (
                      <li
                        key={a.key}
                        data-testid={`approval-row-${a.key}`}
                        className="px-3 py-2.5 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-[13px] font-medium text-ink-950">
                            {a.entityId} <span className="font-mono text-[11px] text-faint">· {a.automationId}</span>
                          </div>
                          <div className="text-[12px] text-ink-600">{a.reason} · requested {a.requestedAt}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onApproveAutomation(a.key)}
                          className="px-3 py-1.5 rounded bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)]"
                        >
                          Approve
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </>
          )}

          {section === 'ai' && (
            <>
              <SectionCard
                title="Founder brief"
                description="Deterministic canonical facts first; optional AI narrative clearly labelled."
              >
                {!brief ? (
                  <p className="text-[12px] text-faint">Composing brief…</p>
                ) : (
                  <div className="space-y-3" data-testid="ai-brief">
                    <div className="border border-hairline rounded-md p-3 bg-surface/70">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-semibold text-ink-950">Narrative</span>
                        <span className="font-mono text-[11px] text-ink-600" data-testid="ai-narrative-basis">
                          {brief.narrative.basis === 'ai_interpretation' ? 'AI interpretation' : 'Deterministic'}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] text-ink-900" data-testid="ai-narrative">
                        {brief.narrative.text}
                      </p>
                      <p className="mt-1 text-[11px] text-faint">{brief.narrative.reason}</p>
                    </div>
                    {brief.facts.sections.map((s) => (
                      <div key={s.id} className="border border-hairline rounded-md p-3">
                        <div className="text-[12px] font-semibold text-ink-950">{s.title}</div>
                        <ul className="mt-1 space-y-0.5 text-[12px] text-secondary">
                          {s.lines.slice(0, 6).map((l, i) => (
                            <li key={i}>{l}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Ask Mercenta"
                description="Queries canonical records with citations — never fabricates or mutates state."
              >
                <div className="flex flex-wrap gap-2">
                  <input
                    data-testid="ai-ask-input"
                    value={question}
                    onChange={(e) => onQuestionChange(e.target.value)}
                    aria-label="Ask Mercenta a question"
                    className="flex-1 min-w-[220px] px-3 py-2 rounded-md border border-hairline-strong text-[13px] text-ink-950 bg-surface-raised focus:outline-none focus:border-ink-900"
                  />
                  <button
                    type="button"
                    disabled={asking}
                    onClick={onAsk}
                    data-testid="ai-ask-submit"
                    className="px-4 py-2 rounded-md bg-ink-950 text-on-dark text-[12px] font-medium hover:bg-ink-800 disabled:opacity-50"
                  >
                    {asking ? 'Asking…' : 'Ask'}
                  </button>
                </div>
                {answer && (
                  <div className="mt-4 border border-hairline rounded-md p-3 space-y-2" data-testid="ai-ask-answer">
                    <div className="font-mono text-[11px] text-faint" data-testid="ai-ask-intent">
                      {answer.intentLabel} · {answer.narrative.basis}
                    </div>
                    <p className="text-[13px] font-medium text-ink-950">{answer.answer}</p>
                    <ul className="space-y-0.5 text-[12px] text-secondary">
                      {answer.facts.slice(0, 6).map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </SectionCard>
            </>
          )}

          {section === 'audit' && (
            <SectionCard
              title="Control Centre audit"
              description="Recent attributed founder and automation actions."
              actions={
                <button
                  type="button"
                  onClick={() => onNavigate('audit_log')}
                  className="text-[12px] font-medium text-[var(--mr-accent)] hover:underline"
                >
                  Open full Audit Log
                </button>
              }
            >
              {model.audit.length === 0 ? (
                <EmptyStateBlock
                  title="No session audit records"
                  description="Attributed founder and automation decisions appear here."
                />
              ) : (
                <ul className="divide-y divide-hairline-06 border border-hairline rounded-md">
                  {model.audit.map((a) => (
                    <li key={a.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[13px] font-medium text-ink-950">{a.action.replace(/_/g, ' ')}</div>
                        <div className="text-[12px] text-ink-600">{a.reason} · {a.actor}</div>
                      </div>
                      <span className="font-mono text-[11px] text-faint">{a.at}</span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          )}
        </div>

        <aside className="space-y-6">
          <SectionCard
            title="Integrations & systems"
            actions={
              <button
                type="button"
                onClick={() => onNavigate('integrations')}
                data-testid="control-open-integrations"
                className="text-[12px] font-medium text-[var(--mr-accent)] hover:underline"
              >
                Open
              </button>
            }
          >
            {integrationIssues.length === 0 ? (
              <p className="text-[12px] text-ink-600" data-testid="control-integrations-clear">
                No provider reporting an error. Modes are managed per provider in Integration Settings.
              </p>
            ) : (
              <ul className="space-y-2 text-[12px]" data-testid="control-integration-issues">
                {integrationIssues.map((i) => (
                  <li key={i.id} className="border border-state-danger/20 bg-red-50/70 rounded p-2">
                    <div className="font-medium text-ink-950">{i.id.replace(/_/g, ' ')} ({i.mode})</div>
                    <div className="text-state-danger">{i.error}</div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Automation summary" description={`Scheduler: ${model.scheduler.chosen}`}>
            <dl className="space-y-1.5 text-[12px]">
              <div className="flex justify-between">
                <dt className="text-ink-600">Succeeded</dt>
                <dd className="font-mono text-ink-950">{model.automationSummary.succeeded}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-600">Failed</dt>
                <dd className="font-mono text-ink-950">{model.automationSummary.failed}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-600">Awaiting approval</dt>
                <dd className="font-mono text-ink-950">{model.automationSummary.awaitingApproval}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-600">Not yet run</dt>
                <dd className="font-mono text-ink-950">{model.automationSummary.neverRun}</dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Data provenance">
            <ul className="space-y-2 text-[12px]">
              {model.dataSources.map((d) => (
                <li key={d.label}>
                  <div className="font-medium text-ink-950">{d.label}</div>
                  <div className="text-faint">{d.value}</div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </aside>
      </div>

      <SlideOverDrawer
        open={drawerPreAudit !== null}
        onClose={() => onOpenPreAuditDrawer(null)}
        title={drawerPreAudit ? `Explore UK Market Fit — ${drawerPreAudit.brand}` : 'Assessment'}
        subtitle={drawerPreAudit ? `${drawerPreAudit.assessmentId} · ${drawerPreAudit.qualificationLabel}` : undefined}
        testId="control-preaudit-drawer"
      >
        {drawerPreAudit && (
          <dl className="space-y-2 text-[13px]">
            <div className="flex justify-between"><dt className="text-faint">Brand</dt><dd>{drawerPreAudit.brand}</dd></div>
            <div className="flex justify-between"><dt className="text-faint">Website</dt><dd>{drawerPreAudit.website}</dd></div>
            <div className="flex justify-between"><dt className="text-faint">Category</dt><dd>{drawerPreAudit.category}</dd></div>
            <div className="flex justify-between"><dt className="text-faint">UK presence</dt><dd>{drawerPreAudit.presence}</dd></div>
            <div className="flex justify-between"><dt className="text-faint">Qualification</dt><dd>{drawerPreAudit.qualificationLabel}</dd></div>
            <div className="pt-2 border-t border-hairline text-secondary">{drawerPreAudit.recommendedNextStep}</div>
          </dl>
        )}
      </SlideOverDrawer>

      <SlideOverDrawer
        open={drawerCommercial !== null}
        onClose={() => onOpenCommercialDrawer(null)}
        title={drawerCommercial ? drawerCommercial.product : 'Commercial readiness'}
        subtitle={drawerCommercial ? `${drawerCommercial.routeLabel} · ${drawerCommercial.ownerLabel}` : undefined}
        testId="commercial-readiness-drawer"
      >
        {drawerCommercial && (
          <div className="space-y-4 text-[13px]">
            <dl className="space-y-1.5">
              <div className="flex justify-between"><dt className="text-faint">Brand</dt><dd>{drawerCommercial.brandLabel}</dd></div>
              <div className="flex justify-between"><dt className="text-faint">Route</dt><dd>{drawerCommercial.routeLabel}</dd></div>
              <div className="flex justify-between"><dt className="text-faint">Next owner</dt><dd>{drawerCommercial.ownerLabel}</dd></div>
              <div className="flex justify-between"><dt className="text-faint">Missing inputs</dt><dd className="font-mono">{drawerCommercial.missingInputs.length}</dd></div>
            </dl>
            {drawerCommercial.unmet.length > 0 && (
              <div>
                <div className="text-[11px] uppercase tracking-[0.06em] text-faint mb-1.5">Unmet conditions</div>
                <ul className="space-y-1.5">
                  {drawerCommercial.unmet.map((c) => (
                    <li key={c.id} className="border border-hairline rounded p-2">
                      <div className="font-medium text-ink-950">{c.label}</div>
                      <div className="text-[12px] text-ink-600">{c.observed}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-secondary">{drawerCommercial.nextStep}</p>
          </div>
        )}
      </SlideOverDrawer>

      <SlideOverDrawer
        open={drawerRun !== null}
        onClose={() => onOpenRunDrawer(null)}
        title={drawerRun ? `Automation run ${drawerRun.id}` : 'Automation run'}
        subtitle={drawerRun ? `${drawerRun.automationId} · ${drawerRun.status}` : undefined}
        testId="control-run-drawer"
      >
        {drawerRun && (
          <div className="space-y-3 text-[13px]">
            <dl className="space-y-1.5">
              <div className="flex justify-between"><dt className="text-faint">Status</dt><dd className="font-mono">{drawerRun.status}</dd></div>
              <div className="flex justify-between"><dt className="text-faint">Run date</dt><dd className="font-mono">{drawerRun.at}</dd></div>
              <div className="flex justify-between"><dt className="text-faint">Attempt</dt><dd className="font-mono">{drawerRun.attempt}</dd></div>
              <div className="flex justify-between"><dt className="text-faint">Actor</dt><dd className="font-mono">{drawerRun.actor}</dd></div>
              <div className="flex justify-between"><dt className="text-faint">Evaluated / Raised</dt><dd className="font-mono">{drawerRun.evaluated} / {drawerRun.raised}</dd></div>
            </dl>
            {drawerRun.notes.length > 0 && (
              <ul className="border-t border-hairline pt-3 space-y-1 text-[12px] text-ink-600">
                {drawerRun.notes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
