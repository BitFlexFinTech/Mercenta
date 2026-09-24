/**
 * §Founder OS — FOUNDER OPS AI (daily brief + Ask Mercenta).
 *
 * DETERMINISTIC FIRST, AI OPTIONAL. Both entry points answer from canonical
 * records before any model is considered:
 *
 *   canonical facts → deterministic answer (always produced)
 *                   → optional AI narrative/phrasing (labelled, never canonical)
 *
 * - The daily brief is the FACT brief (`src/lib/founder/briefFacts.ts`) plus an
 *   optional narrative. The facts exist whether or not AI exists.
 * - "Ask Mercenta" classifies the question into a declared intent, answers it
 *   from canonical data with record citations, and only then may ask a free
 *   model to rephrase the SAME facts. A question it cannot answer from canonical
 *   data returns an explicit "I can answer these questions" list — never an
 *   invented answer.
 * - AI can never write a record, change a score, approve anything or trigger an
 *   irreversible action. Recommendations are routed to the operator, not executed.
 */
import {
  aiAvailability,
  createFounderAiClient,
  type AiAvailability,
  type AiNarrativeResult,
  type FounderAiClient,
} from './founderAiClient';
import {
  briefFactLines,
  founderBriefFacts,
  type BriefSource,
  type FounderBriefFacts,
} from '@/lib/founder/briefFacts';
import { automationHealth, automationSummary, pendingApprovals } from '@/lib/automation/registry';
import {
  demoToday,
  getWorkItems,
  overdueWorkItems,
} from '@/lib/work/workStore';
import { acquisitionAttention, acquisitionPipeline } from '@/lib/acquisition/acquisitionEngine';
import { demoAuditLog, demoCommerceInvoices, getAllCommercePayments } from '@/data/demoStore';
import { invoiceIsOverdue } from '@/lib/commerce/invoiceTerms';

/* ── Automation facts injected into the brief (no import cycle) ────────────── */

export function automationFactsInput() {
  const health = automationHealth();
  const summary = automationSummary();
  return {
    failures: health
      .filter((h) => h.status === 'failed')
      .map((h) => ({ id: h.id, name: h.name, error: h.lastRun?.error ?? 'Unknown error' })),
    degraded: health.filter((h) => h.status === 'degraded').map((h) => ({ id: h.id, name: h.name })),
    awaitingApproval: pendingApprovals().length,
    disabled: health.filter((h) => !h.enabled).map((h) => ({ id: h.id, name: h.name, reason: h.enabledReason })),
    neverRun: summary.neverRun,
    totalRuns: summary.totalRuns,
  };
}

export interface FounderBrief {
  facts: FounderBriefFacts;
  /** Always present. `basis: deterministic` when no AI provider is configured. */
  narrative: AiNarrativeResult;
  availability: AiAvailability;
}

export async function buildFounderBrief(client?: FounderAiClient): Promise<FounderBrief> {
  const facts = founderBriefFacts(automationFactsInput());
  const ai = client ?? (await createFounderAiClient());
  const narrative = await ai.narrate({
    taskId: 'founder_brief_narrative',
    factLines: briefFactLines(facts),
  });
  return { facts, narrative, availability: aiAvailability() };
}

/* ── Ask Mercenta (deterministic intent routing with citations) ────────────── */

export type MercentaIntentId =
  | 'attention'
  | 'blockers'
  | 'acquisition_followup'
  | 'invoices_overdue'
  | 'automation_failures'
  | 'what_changed'
  | 'summary'
  | 'unknown';

export interface MercentaIntent {
  id: MercentaIntentId;
  label: string;
  example: string;
  patterns: RegExp[];
}

export const MERCENTA_INTENTS: readonly MercentaIntent[] = [
  {
    id: 'attention',
    label: 'What needs my attention',
    example: 'What needs my attention today?',
    patterns: [/attention/i, /what.*(should|must) i (do|look at)/i, /priority/i, /today/i],
  },
  {
    id: 'blockers',
    label: 'Operational blockers',
    example: 'Which brands have operational blockers?',
    patterns: [/blocker/i, /blocked/i, /stuck/i, /cannot proceed/i, /gate/i],
  },
  {
    id: 'acquisition_followup',
    label: 'Acquisition follow-ups',
    example: 'Which acquisition prospects need follow-up?',
    patterns: [/prospect/i, /follow.?up/i, /acquisition/i, /outreach/i, /pipeline/i],
  },
  {
    id: 'invoices_overdue',
    label: 'Overdue invoices and deductions',
    example: 'Which invoices are overdue?',
    patterns: [/invoice/i, /overdue payment/i, /deduction/i, /unpaid/i, /cash/i],
  },
  {
    id: 'automation_failures',
    label: 'Automation health',
    example: 'What automation failed recently?',
    patterns: [/automation/i, /job/i, /schedul/i, /failed run/i, /runner/i],
  },
  {
    id: 'what_changed',
    label: 'What changed',
    example: 'What changed since yesterday?',
    patterns: [/what changed/i, /since yesterday/i, /recent(ly)? changed/i, /activity/i],
  },
  {
    id: 'summary',
    label: 'Highest-priority summary',
    example: 'Summarise my highest-priority operational issues.',
    patterns: [/summar/i, /overview/i, /brief/i, /highest.?priority/i],
  },
] as const;

/** Deterministic classification — no model is needed to route a question. */
export function classifyQuestion(question: string): MercentaIntentId {
  const q = question.trim();
  if (!q) return 'unknown';
  for (const intent of MERCENTA_INTENTS) {
    if (intent.patterns.some((p) => p.test(q))) return intent.id;
  }
  return 'unknown';
}

export interface MercentaAnswer {
  question: string;
  intent: MercentaIntentId;
  intentLabel: string;
  /** The deterministic answer, composed from canonical records. */
  answer: string;
  facts: string[];
  sources: BriefSource[];
  basis: 'canonical';
  /** Optional AI rephrasing of the SAME facts, clearly labelled. */
  narrative: AiNarrativeResult;
  availability: AiAvailability;
}

interface DeterministicAnswer {
  answer: string;
  facts: string[];
  sources: BriefSource[];
}


function answerFor(intent: MercentaIntentId): DeterministicAnswer {
  const work = getWorkItems('admin', null);
  const overdue = overdueWorkItems('admin');

  switch (intent) {
    case 'attention': {
      const critical = work.filter((w) => w.priority === 'critical');
      return {
        answer:
          critical.length === 0
            ? `Nothing is critical. ${work.length} open work item(s) remain, ${overdue.length} past deadline.`
            : `${critical.length} critical item(s) need you first, and ${overdue.length} item(s) are past deadline.`,
        facts: [
          `${work.length} open work item(s); ${critical.length} critical; ${overdue.length} overdue.`,
          ...critical.slice(0, 5).map((w) => `${w.title} — ${w.detail}`),
        ],
        sources: critical.slice(0, 5).map((w) => ({ type: 'work_item', id: w.id, label: w.title })),
      };
    }
    case 'blockers': {
      const blocked = work.filter((w) => w.status === 'blocked' || w.source === 'compliance_expiry');
      return {
        answer:
          blocked.length === 0
            ? 'No operational blockers are recorded.'
            : `${blocked.length} blocker(s) recorded — a compliance gate or a blocked work item.`,
        facts: blocked.slice(0, 6).map((w) => `${w.title} — ${w.detail} (${w.status})`),
        sources: blocked.slice(0, 6).map((w) => ({ type: 'work_item', id: w.id, label: w.title })),
      };
    }
    case 'acquisition_followup': {
      const pipeline = acquisitionPipeline();
      const attention = acquisitionAttention();
      return {
        answer:
          attention.length === 0
            ? `${pipeline.total} prospect(s) tracked and nothing needs a follow-up decision right now.`
            : `${attention.length} acquisition record(s) need action (${pipeline.followUpsOverdue} overdue follow-up(s)).`,
        facts: attention
          .slice(0, 6)
          .map((r) => `${r.brand} — ${r.stageLabel} · ${r.nextAction.label} · owner ${r.owner}`),
        sources: attention.slice(0, 6).map((r) => ({ type: 'prospect', id: r.prospectId, label: r.brand })),
      };
    }
    case 'invoices_overdue': {
      const today = demoToday();
      /* §P7 — REPOINTED: overdue means the invoice's OWN derived due date (its
         own terms) has passed while it is still issued-and-unpaid. */
      const payments = getAllCommercePayments();
      const rows = demoCommerceInvoices.filter((inv) => invoiceIsOverdue(inv, payments, today));
      return {
        answer:
          rows.length === 0
            ? 'No invoice is past its declared payment terms with an unsettled balance.'
            : `${rows.length} invoice(s) are past the payment terms recorded on the invoice itself.`,
        facts: rows.map(
          (inv) => `${inv.number} — £${inv.subtotalGbp.toFixed(2)} issued ${inv.issuedAt.slice(0, 10)} (${inv.mode})`
        ),
        sources: rows.map((inv) => ({ type: 'invoice', id: inv.id, label: inv.number })),
      };
    }
    case 'automation_failures': {
      const health = automationHealth();
      const failed = health.filter((h) => h.status === 'failed');
      const summary = automationSummary();
      return {
        answer:
          failed.length === 0
            ? `No automation has failed. ${summary.declared} automation(s) declared, ${summary.totalRuns} run(s) recorded.`
            : `${failed.length} automation(s) failed and can be retried.`,
        facts: [
          `${summary.declared} declared; ${summary.succeeded} succeeded; ${summary.failed} failed; ${summary.awaitingApproval} awaiting approval.`,
          ...failed.map((h) => `${h.name} — ${h.lastRun?.error ?? 'error'} (run ${h.lastRun?.id ?? 'n/a'})`),
        ],
        sources: failed.map((h) => ({ type: 'automation', id: h.id, label: h.name })),
      };
    }
    case 'what_changed': {
      const rows = [...demoAuditLog]
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, 8);
      return {
        answer:
          rows.length === 0
            ? 'No canonical change has been recorded yet.'
            : `${rows.length} canonical change(s) recorded.`,
        facts: rows.map((r) => `${r.action.replace(/_/g, ' ')} — ${r.reason} (${r.actorId})`),
        sources: rows.map((r) => ({ type: 'audit', id: r.id, label: r.action })),
      };
    }


    case 'summary': {
      const critical = work.filter((w) => w.priority === 'critical');
      const pipeline = acquisitionPipeline();
      return {
        answer: `Highest priority: ${overdue.length} overdue and ${critical.length} critical work item(s); ${pipeline.followUpsOverdue} overdue acquisition follow-up(s).`,
        facts: [
          `${work.length} open work item(s); ${critical.length} critical; ${overdue.length} overdue.`,
          `${pipeline.total} prospect(s) in the pipeline; ${pipeline.awaitingApproval} awaiting approval.`,
          ...overdue.slice(0, 5).map((w) => `${w.title} — due ${w.dueDate}`),
        ],
        sources: [...overdue, ...critical].slice(0, 6).map((w) => ({ type: 'work_item', id: w.id, label: w.title })),
      };
    }
    case 'unknown':
    default:
      return {
        answer:
          'I answer only from Mercenta records, so I will not guess. I can answer these questions: ' +
          MERCENTA_INTENTS.map((i) => `"${i.example}"`).join(' · '),
        facts: MERCENTA_INTENTS.map((i) => `${i.label} — e.g. ${i.example}`),
        sources: [],
      };
  }
}

export async function askMercenta(question: string, client?: FounderAiClient): Promise<MercentaAnswer> {
  const intent = classifyQuestion(question);
  const deterministic = answerFor(intent);
  const ai = client ?? (await createFounderAiClient());
  const narrative = await ai.narrate({
    taskId: 'founder_ask_answer',
    factLines: deterministic.facts,
    question,
  });
  return {
    question,
    intent,
    intentLabel: MERCENTA_INTENTS.find((i) => i.id === intent)?.label ?? 'Not recognised',
    answer: deterministic.answer,
    facts: deterministic.facts,
    sources: deterministic.sources,
    basis: 'canonical',
    narrative,
    availability: aiAvailability(),
  };
}

