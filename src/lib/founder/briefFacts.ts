/**
 * §Founder OS — DETERMINISTIC FOUNDER BRIEF FACTS.
 *
 * The FACT half of the founder brief, and the only place those facts are
 * computed. Every line is derived from a canonical record: the work layer, the
 * finance/compliance records, the acquisition pipeline, the intelligence
 * findings, the automation run ledger and the audit log. NOTHING here is written
 * by AI, and no number is invented.
 *
 * The AI layer (`src/lib/ai/founderOpsAi.ts`) may add a NARRATIVE on top of
 * these facts; it can never add, change or contradict a fact. If AI is
 * unavailable the brief is still complete — it simply has no narrative.
 *
 * `automation` health is injected by the caller (the registry) so this module
 * does not import the registry and the two cannot form a cycle.
 */
import { demoAuditLog } from '@/data/demoStore';
import { ensureProspectStore, getChanges } from '@/data/prospectStore';
import { getWorkItems, overdueWorkItems, demoToday } from '@/lib/work/workStore';
import { getActiveReminders } from '@/lib/work/reminderRunner';
import { revenueByStream } from '@/lib/costs/costSummary';
import { acquisitionAttention, acquisitionPipeline } from '@/lib/acquisition/acquisitionEngine';
import { intelligenceFindings, intelligenceSummary } from '@/lib/intelligence/intelligenceLayer';

export interface BriefSource {
  type: string;
  id: string;
  label: string;
}

export interface BriefSection {
  id: string;
  title: string;
  /** Deterministic factual lines. */
  lines: string[];
  sources: BriefSource[];
  severity: 'critical' | 'important' | 'informational';
}

export interface BriefRecommendedAction {
  label: string;
  /** An EXISTING destination view — never a new screen. */
  destination: string;
  reason: string;
  priority: 'urgent' | 'high' | 'normal';
}

export interface FounderBriefFacts {
  generatedFor: string;
  sections: BriefSection[];
  counts: {
    openWork: number;
    criticalWork: number;
    overdueWork: number;
    activeReminders: number;
    financeOverdue: number;
    complianceBlocking: number;
    acquisitionAttention: number;
    automationFailures: number;
    approvalsPending: number;
    intelligenceCritical: number;
    brandsActive: number;
    prospectsInPipeline: number;
  };
  recommendedActions: BriefRecommendedAction[];
  /** Always canonical: the facts are computed locally, never generated. */
  basis: 'canonical';
}

/** Injected automation health (avoids an import cycle with the registry). */
export interface AutomationFactsInput {
  failures: { id: string; name: string; error: string }[];
  degraded: { id: string; name: string }[];
  awaitingApproval: number;
  disabled: { id: string; name: string; reason: string }[];
  neverRun: number;
  totalRuns: number;
}

const EMPTY_AUTOMATION_FACTS: AutomationFactsInput = {
  failures: [],
  degraded: [],
  awaitingApproval: 0,
  disabled: [],
  neverRun: 0,
  totalRuns: 0,
};

function recentAuditLines(limit = 6): { lines: string[]; sources: BriefSource[] } {
  const rows = [...demoAuditLog]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
  return {
    lines: rows.map((r) => `${r.action.replace(/_/g, ' ')} — ${r.reason} (${r.actorId})`),
    sources: rows.map((r) => ({ type: 'audit', id: r.id, label: r.action })),
  };
}

function recentProspectChanges(limit = 5): { lines: string[]; sources: BriefSource[] } {
  ensureProspectStore();
  const rows = [...getChanges()]
    .sort((a, b) => String(b.timestamp ?? '').localeCompare(String(a.timestamp ?? '')))
    .slice(0, limit);
  return {
    lines: rows.map((c) => `${c.brand}: ${c.changeType.replace(/_/g, ' ')} — ${c.summary}`),
    sources: rows.map((c) => ({ type: 'prospect_change', id: c.id, label: c.brand })),
  };
}

/* ── The brief ─────────────────────────────────────────────────────────────── */

export function founderBriefFacts(automation: AutomationFactsInput = EMPTY_AUTOMATION_FACTS): FounderBriefFacts {
  const today = demoToday();
  const work = getWorkItems('admin', null);
  const overdue = overdueWorkItems('admin');
  const reminders = getActiveReminders('admin');
  const finance = revenueByStream();
  const acquisition = acquisitionPipeline();
  const acquisitionNeedsAction = acquisitionAttention();
  const intelligence = intelligenceSummary();
  const findings = intelligenceFindings(today);
  const complianceBlocking = findings.filter(
    (f) => f.domain === 'marketplace' || f.rule?.id === 'approved_category_gate'
  );
  const audit = recentAuditLines();
  const changes = recentProspectChanges();

  const sections: BriefSection[] = [];

  /* WHAT CHANGED — canonical audit + prospect change events only. */
  sections.push({
    id: 'what_changed',
    title: 'What changed',
    lines:
      audit.lines.length === 0 && changes.lines.length === 0
        ? ['No canonical changes recorded in this session.']
        : [...audit.lines, ...changes.lines],
    sources: [...audit.sources, ...changes.sources],
    severity: 'informational',
  });

  /* WHAT NEEDS ATTENTION — the work layer's own ranking. */
  const criticalWork = work.filter((w) => w.priority === 'critical');
  sections.push({
    id: 'needs_attention',
    title: 'Needs attention',
    lines: [
      `${work.length} open work item(s); ${criticalWork.length} critical, ${overdue.length} past deadline.`,
      `${reminders.length} reminder(s) currently active.`,
      ...criticalWork.slice(0, 5).map((w) => `${w.title} — ${w.detail}`),
    ],
    sources: criticalWork.slice(0, 5).map((w) => ({ type: 'work_item', id: w.id, label: w.title })),
    severity: criticalWork.length > 0 ? 'critical' : 'informational',
  });

  /* OVERDUE — explicit, because this is what the founder must not miss. */
  sections.push({
    id: 'overdue',
    title: 'Overdue',
    lines:
      overdue.length === 0
        ? ['Nothing is past its deadline.']
        : overdue.slice(0, 8).map((w) => `${w.title} — due ${w.dueDate} (${w.priority}, ${w.owner})`),
    sources: overdue.slice(0, 8).map((w) => ({ type: 'work_item', id: w.id, label: w.title })),
    severity: overdue.length > 0 ? 'important' : 'informational',
  });

  /* FINANCIAL SIGNALS — revenue streams with their labels; nothing blended. */
  const financeOverdue = findings.filter((f) => f.domain === 'operational' && f.id.includes('overdue-work')).length;
  sections.push({
    id: 'finance',
    title: 'Financial signals',
    lines: [
      ...finance.filter((s) => s.gbp !== 0).map((s) => `${s.label}: £${s.gbp.toLocaleString('en-GB')} — ${s.source}`),
      'Outstanding invoices and deductions are tracked as work items with declared deadlines.',
      ...(financeOverdue > 0 ? [`${financeOverdue} finance item(s) flagged past deadline.`] : []),
    ],
    sources: [{ type: 'revenue_stream', id: 'canonical', label: 'Canonical revenue streams' }],
    severity: 'informational',
  });

  /* ACQUISITION MOVEMENT — the canonical pipeline model. */
  sections.push({
    id: 'acquisition',
    title: 'Acquisition movement',
    lines: [
      `${acquisition.total} prospect(s) in the pipeline; ${acquisition.active} active, ${acquisition.activatedBrands} activated brand(s), ${acquisition.disqualified} disqualified.`,
      `${acquisition.followUpsDue} follow-up(s) due, ${acquisition.followUpsOverdue} overdue, ${acquisition.awaitingApproval} recommendation(s) awaiting approval.`,
      ...acquisitionNeedsAction.slice(0, 5).map((r) => `${r.brand} — ${r.stageLabel}: ${r.nextAction.label}`),
      ...(acquisition.duplicates.length > 0
        ? [`${acquisition.duplicates.length} duplicate identity(ies) need merging.`]
        : []),
    ],
    sources: acquisitionNeedsAction
      .slice(0, 5)
      .map((r) => ({ type: 'prospect', id: r.prospectId, label: r.brand })),
    severity: acquisition.followUpsOverdue > 0 ? 'important' : 'informational',
  });

  /* COMPLIANCE — the gate is never bypassed. */
  sections.push({
    id: 'compliance',
    title: 'Compliance',
    lines:
      complianceBlocking.length === 0
        ? ['No blocking compliance or category state recorded.']
        : complianceBlocking.slice(0, 6).map((f) => `${f.title} — ${f.detail}`),
    sources: complianceBlocking.slice(0, 6).flatMap((f) => f.sources),
    severity: complianceBlocking.some((f) => f.severity === 'critical') ? 'critical' : 'informational',
  });


  /* AUTOMATION — honest failure/degradation reporting. */
  sections.push({
    id: 'automation',
    title: 'Automation',
    lines: [
      `${automation.totalRuns} run(s) recorded this session; ${automation.neverRun} automation(s) not yet run.`,
      ...(automation.failures.length === 0
        ? ['No automation failures.']
        : automation.failures.map((f) => `FAILED: ${f.name} — ${f.error}`)),
      ...(automation.degraded.length > 0
        ? automation.degraded.map((d) => `DEGRADED: ${d.name} — an optional dependency is unavailable.`)
        : []),
      ...(automation.disabled.length > 0
        ? automation.disabled.map((d) => `DISABLED: ${d.name} — ${d.reason}`)
        : []),
      automation.awaitingApproval > 0
        ? `${automation.awaitingApproval} consequential decision(s) awaiting your approval.`
        : 'No decisions are awaiting approval.',
    ],
    sources: automation.failures.map((f) => ({ type: 'automation', id: f.id, label: f.name })),
    severity: automation.failures.length > 0 ? 'critical' : 'informational',
  });

  /* INTELLIGENCE — findings with their basis labels. */
  sections.push({
    id: 'intelligence',
    title: 'Intelligence',
    lines: [
      `${intelligence.total} finding(s): ${intelligence.critical} critical, ${intelligence.important} important.`,
      ...(intelligence.byBasis.canonical > 0
        ? [`${intelligence.byBasis.canonical} derived from canonical records.`]
        : []),
      ...(intelligence.byBasis.external_research > 0
        ? [`${intelligence.byBasis.external_research} from external research (third-party data).`]
        : []),
      ...(intelligence.byBasis.ai_interpretation > 0
        ? [`${intelligence.byBasis.ai_interpretation} AI interpretation (never canonical).`]
        : []),
    ],
    sources: findings
      .filter((f) => f.severity !== 'informational')
      .slice(0, 5)
      .flatMap((f) => f.sources),
    severity: intelligence.critical > 0 ? 'important' : 'informational',
  });

  /* RECOMMENDED NEXT ACTIONS — deterministic routing into EXISTING screens. */
  const recommendedActions: BriefRecommendedAction[] = [];
  if (overdue.length > 0) {
    recommendedActions.push({
      label: `Clear ${overdue.length} overdue item(s)`,
      destination: 'work',
      reason: `${overdue.length} work item(s) are past their declared deadline.`,
      priority: 'urgent',
    });
  }
  if (automation.failures.length > 0) {
    recommendedActions.push({
      label: 'Retry failed automation',
      destination: 'control_centre',
      reason: `${automation.failures.length} automation run(s) failed and are retryable.`,
      priority: 'urgent',
    });
  }
  if (automation.awaitingApproval > 0) {
    recommendedActions.push({
      label: `Decide ${automation.awaitingApproval} pending approval(s)`,
      destination: 'control_centre',
      reason: 'A consequential step is stopped until a human decides.',
      priority: 'high',
    });
  }
  if (acquisitionNeedsAction.length > 0) {
    recommendedActions.push({
      label: `Action ${acquisitionNeedsAction.length} acquisition record(s)`,
      destination: 'crm',
      reason: 'Follow-ups, qualifications or approvals are waiting.',
      priority: 'high',
    });
  }
  if (complianceBlocking.length > 0) {
    recommendedActions.push({
      label: 'Review compliance blockers',
      destination: 'compliance',
      reason: `${complianceBlocking.length} blocking state(s) recorded — the gate is never bypassed.`,
      priority: 'high',
    });
  }

  return {
    generatedFor: today,
    sections,
    counts: {
      openWork: work.length,
      criticalWork: criticalWork.length,
      overdueWork: overdue.length,
      activeReminders: reminders.length,
      financeOverdue,
      complianceBlocking: complianceBlocking.length,
      acquisitionAttention: acquisitionNeedsAction.length,
      automationFailures: automation.failures.length,
      approvalsPending: automation.awaitingApproval,
      intelligenceCritical: intelligence.critical,
      brandsActive: acquisition.activatedBrands,
      prospectsInPipeline: acquisition.total,
    },
    recommendedActions,
    basis: 'canonical',
  };
}

/** Flat fact lines — what an AI narrative may summarise, and nothing more. */
export function briefFactLines(facts: FounderBriefFacts): string[] {
  return facts.sections.flatMap((s) => s.lines.map((l) => `[${s.title}] ${l}`));
}

