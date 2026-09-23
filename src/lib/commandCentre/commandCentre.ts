/**
 * §32/§34 (M13 Phase 11) — SUPER ADMIN COMMAND CENTRE derivation.
 *
 * The founder is a SOLO founder, so this answers, in order:
 *   NOW       — what needs attention immediately (compliance deadline, PO at
 *               risk, shipment exception, integration failure, AI ceiling)
 *   TODAY     — what should be done next
 *   THIS WEEK — what to move forward
 *   OPPORTUNITIES / FUNDRAISING / OPERATIONS / FINANCE / AI COST — ranked,
 *               category- and region-aware roll-ups.
 *
 * §27/§28 (M13c Phase D) adds the founder QUEUE: every action carries an
 * explicit WHY (declared, scored factors recorded WITH the value observed) and a
 * 1..N rank, and the relationship/funding slots (best embassy route, best trade
 * programme, investor route, accelerator/residency/ecosystem routes) are derived
 * from the existing partnership and funding stores. The rank is arithmetic over
 * stored data — there is no model call and nothing is invented.
 *
 * Every action is DERIVED from a real store — companyStore, googleStore,
 * launchStore, the canonical PO/shipment store, brand applications, the partner
 * target config, the prospect store, the canonical opportunity ranking, the
 * founder funding pipeline and the cost/usage modules. Nothing is invented, and
 * every action carries the exact CTA + destination so the founder never has to
 * hunt for the screen that performs it.
 */
import { demoApplications } from '@/data/applicationStore';
import { getLaunchRecords } from '@/data/launchStore';
import { companyComplianceTasks } from '@/data/companyStore';
import { googleSetupTasks } from '@/data/googleStore';
import { getProspects } from '@/data/prospectStore';
import { FOUNDER_PARTNER_TARGETS, FUNDRAISING_PLAN, partnershipMetrics } from '@/config/partnerships';
import { LAUNCH_PLATFORMS } from '@/config/launchPlatforms';
import { TRADE_PROGRAMMES } from '@/lib/intelligence/acquisitionStrategy';
import { rankOpportunities } from '@/lib/intelligence/opportunityDiscovery';
import {
  FOUNDER_FUNDING_OPPORTUNITIES,
  FUNDING_OPPORTUNITY_TYPE_LABELS,
  FUNDING_STAGE_LABELS,
  fundingPipelineSummary,
  getFundingPipeline,
} from '@/lib/founder/fundingPipeline';
import { costProtectionState } from '@/lib/costs/usageLog';
import { operatingCostSummary } from '@/lib/costs/costSummary';

export type CommandBand = 'now' | 'today' | 'week';

/**
 * §28 — the deterministic factors the founder queue ranks on. Declared ONCE so
 * the ranking, the UI, the validators and any report cannot disagree about why an
 * item is where it is. There is no model call anywhere in this file: the rank is
 * arithmetic over fields the underlying stores already carry.
 */
export type CommandFactorId =
  | 'urgency'
  | 'operational_risk'
  | 'commercial_potential'
  | 'po_potential'
  | 'relationship_readiness'
  | 'funding_relevance'
  | 'founder_approval_required'
  | 'next_action_available';

export const COMMAND_FACTORS: Record<CommandFactorId, { label: string; max: number; basis: string }> = {
  urgency: {
    label: 'Urgency',
    max: 48,
    basis: 'Time band (NOW / TODAY / THIS WEEK) + the action priority.',
  },
  operational_risk: {
    label: 'Operational risk',
    max: 12,
    basis: 'An operational surface (POs, logistics, integrations, compliance) at high or urgent priority.',
  },
  commercial_potential: {
    label: 'Commercial potential',
    max: 15,
    basis: 'Canonical opportunity score (0-100) of the stored prospect — an estimate.',
  },
  po_potential: {
    label: 'PO potential',
    max: 15,
    basis: 'Canonical estimated PO potential per month for that opportunity — an estimate.',
  },
  relationship_readiness: {
    label: 'Relationship readiness',
    max: 8,
    basis: 'Partner/route pipeline stage (a route with nothing started needs the founder first).',
  },
  funding_relevance: {
    label: 'Funding relevance',
    max: 12,
    basis: 'Funding-pipeline stage (a route near review/submission is worth more of the founder’s day).',
  },
  founder_approval_required: {
    label: 'Founder approval required',
    max: 12,
    basis: 'A recorded approval is the gate that unblocks the next stage.',
  },
  next_action_available: {
    label: 'Next action available',
    max: 5,
    basis: 'A real CTA with a valid destination exists for this item.',
  },
};

/** A single scored factor, with the OBSERVED value it was scored from. */
export interface CommandWhyFactor {
  id: CommandFactorId;
  label: string;
  /** What was actually observed in the store (never invented). */
  observed: string;
  /** Points contributed to the rank score (0..max). */
  points: number;
}

export interface CommandWhy {
  factors: CommandWhyFactor[];
  /** Sum of the factor points — the rank score. */
  score: number;
  /** One-line deterministic explanation of the rank. */
  summary: string;
}

export interface CommandAction {
  id: string;
  band: CommandBand;
  priority: 'urgent' | 'high' | 'normal';
  title: string;
  detail: string;
  /** The exact next action, e.g. "Approve outreach". */
  cta: string;
  /** AdminShell view id the CTA navigates to. */
  navView: string;
  /** Super Admin tab id when the destination is inside Super Admin. */
  navTab?: string;
  valueGbp?: number;
  region?: string;
  category?: string;
  dueDate?: string | null;
  /**
   * §28 — OPTIONAL extra observations, taken straight from the canonical store
   * the action was derived from. Only the factors that genuinely apply are
   * scored, so the WHY never lists a factor the data cannot support.
   */
  signals?: {
    commercialPotential?: number;
    poPotentialGbp?: number;
    relationshipStage?: 'not_approached' | 'approached' | 'in_discussion' | 'agreed';
    fundingStage?: string;
    approvalRequired?: boolean;
  };
  /** §28 — the explicit WHY breakdown. Always present. */
  why?: CommandWhy;
  /** §28 — 1 = do this first. Assigned from `why.score` (deterministic). */
  rank?: number;
}

export interface CommandSection {
  id: 'opportunities' | 'fundraising' | 'operations' | 'finance' | 'ai_cost';
  label: string;
  description: string;
  actions: CommandAction[];
}

export interface CommandCentreModel {
  now: CommandAction[];
  today: CommandAction[];
  week: CommandAction[];
  sections: CommandSection[];
  counts: { now: number; today: number; week: number; total: number };
  /** §28 — every action, ranked 1..N by the declared factors. */
  queue: CommandAction[];
  /** §28 — the declared ranking basis (shown to the founder). */
  queueBasis: string;
}

/** A DECLARED fact: the queue is arithmetic over stored data, never a model call. */
export const COMMAND_QUEUE_IS_DETERMINISTIC = true;

export const COMMAND_QUEUE_BASIS =
  'Ranked by declared factors over stored data only — urgency (band + priority), operational risk, canonical opportunity/PO potential, relationship readiness, funding relevance, whether a founder approval blocks the next step, and whether a real CTA exists. No AI, no invented data.';

function byPriority(a: CommandAction, b: CommandAction): number {
  const rank = { urgent: 0, high: 1, normal: 2 } as const;
  return rank[a.priority] - rank[b.priority];
}

/* ── §28 — the deterministic WHY + rank ─────────────────────────────────── */

const BAND_URGENCY: Record<CommandBand, number> = { now: 30, today: 16, week: 6 };
const PRIORITY_URGENCY: Record<CommandAction['priority'], number> = { urgent: 18, high: 9, normal: 3 };
/** Surfaces where a non-normal action is an operational risk, not just work. */
const OPERATIONAL_VIEWS: readonly string[] = ['purchase_orders_admin', 'logistics', 'integrations'];

const RELATIONSHIP_POINTS: Record<'not_approached' | 'approached' | 'in_discussion' | 'agreed', number> = {
  not_approached: 8,
  approached: 6,
  in_discussion: 4,
  agreed: 0,
};

/**
 * §28 — funding stages that deserve the founder's day now. A route at
 * `ready_for_review` or `founder_approval` is one decision away from moving;
 * a route already submitted is waiting on the other side, so it falls back.
 */
const FUNDING_POINTS: Record<string, number> = {
  discovered: 6,
  qualified: 8,
  preparing: 10,
  ready_for_review: 12,
  founder_approval: 12,
};

const humanise = (value: string): string => value.replace(/_/g, ' ');
const gbp = (n: number): string => n.toLocaleString('en-GB', { maximumFractionDigits: 2 });

/**
 * §28 — build the explicit WHY breakdown for ONE action. Every factor records
 * the value it was actually observed from, so the founder can see, per item, why
 * it sits where it does. Pure arithmetic: no model call, no invented data, and a
 * factor is only listed when the underlying store genuinely supports it.
 */
function commandWhy(a: CommandAction): CommandWhy {
  const factors: CommandWhyFactor[] = [];
  const factor = (id: CommandFactorId, observed: string, points: number): void => {
    factors.push({ id, label: COMMAND_FACTORS[id].label, observed, points });
  };

  factor(
    'urgency',
    `${a.band.toUpperCase()} band · ${a.priority} priority`,
    Math.min(COMMAND_FACTORS.urgency.max, BAND_URGENCY[a.band] + PRIORITY_URGENCY[a.priority])
  );

  if (OPERATIONAL_VIEWS.includes(a.navView) && a.priority !== 'normal') {
    factor(
      'operational_risk',
      `${a.category ?? a.navView} at ${a.priority} priority`,
      a.priority === 'urgent' ? COMMAND_FACTORS.operational_risk.max : 6
    );
  }

  if (a.category === 'Compliance' && a.priority !== 'normal') {
    factor(
      'operational_risk',
      a.dueDate ? `compliance deadline ${a.dueDate}` : 'compliance deadline on record',
      a.priority === 'urgent' ? COMMAND_FACTORS.operational_risk.max : 6
    );
  }

  if (typeof a.signals?.commercialPotential === 'number') {
    const bounded = Math.max(0, Math.min(100, a.signals.commercialPotential));
    factor(
      'commercial_potential',
      `canonical opportunity score ${bounded}/100 (estimate)`,
      Math.round((COMMAND_FACTORS.commercial_potential.max * bounded) / 100)
    );
  }

  if (typeof a.signals?.poPotentialGbp === 'number' && a.signals.poPotentialGbp > 0) {
    const v = a.signals.poPotentialGbp;
    factor(
      'po_potential',
      `£${gbp(v)} estimated PO potential/month (canonical derivation — an estimate)`,
      v >= 5000 ? COMMAND_FACTORS.po_potential.max : v >= 1000 ? 10 : 5
    );
  } else if (typeof a.valueGbp === 'number' && a.valueGbp > 0) {
    const v = a.valueGbp;
    factor(
      'po_potential',
      `£${gbp(v)} on the stored record`,
      v >= 5000 ? COMMAND_FACTORS.po_potential.max : v >= 1000 ? 10 : 5
    );
  }

  if (a.signals?.relationshipStage) {
    factor(
      'relationship_readiness',
      `${humanise(a.signals.relationshipStage)} route`,
      RELATIONSHIP_POINTS[a.signals.relationshipStage]
    );
  }

  if (a.signals?.fundingStage) {
    factor(
      'funding_relevance',
      `pipeline stage ${humanise(a.signals.fundingStage)}`,
      FUNDING_POINTS[a.signals.fundingStage] ?? 2
    );
  }

  if (a.signals?.approvalRequired) {
    factor(
      'founder_approval_required',
      'the next stage is refused until your approval is recorded',
      COMMAND_FACTORS.founder_approval_required.max
    );
  }

  factor(
    'next_action_available',
    `"${a.cta}" → ${a.navView}${a.navTab ? ` → tab ${a.navTab}` : ''}`,
    a.cta.length > 3 && a.navView.length > 3 ? COMMAND_FACTORS.next_action_available.max : 0
  );

  const score = factors.reduce((n, f) => n + f.points, 0);
  return { factors, score, summary: factors.map((f) => `${f.label} ${f.points}`).join(' + ') + ` = ${score}` };
}

/**
 * §28 — attach the WHY to every action, assign 1..N ranks from the score
 * (deterministic: score, then the declared band order, then the action id) and
 * return the ranked queue. The SAME objects are mutated, so the bands and the
 * category sections show the identical rank and WHY.
 */
function rankQueue(actions: CommandAction[]): CommandAction[] {
  const bandOrder: Record<CommandBand, number> = { now: 0, today: 1, week: 2 };
  for (const a of actions) a.why = commandWhy(a);
  const ordered = [...actions].sort(
    (a, b) =>
      (b.why?.score ?? 0) - (a.why?.score ?? 0) ||
      bandOrder[a.band] - bandOrder[b.band] ||
      a.id.localeCompare(b.id)
  );
  ordered.forEach((a, i) => {
    a.rank = i + 1;
  });
  return ordered;
}

function byRank(a: CommandAction, b: CommandAction): number {
  return (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) || byPriority(a, b);
}

export interface CommandCentreInput {
  now?: Date;
  /** Connection failures from the integrations context (unknown ≠ safe). */
  integrationIssues?: { id: string; name: string; error: string }[];
}

export function buildCommandCentre(input: CommandCentreInput = {}): CommandCentreModel {
  const now = input.now ?? new Date();
  const actions: CommandAction[] = [];

  /* ── compliance (companyStore) ───────────────────────────────────────── */
  for (const t of companyComplianceTasks(now)) {
    const priority = t.priority;
    actions.push({
      id: `company-${t.id}`,
      band: priority === 'urgent' ? 'now' : priority === 'high' ? 'today' : 'week',
      priority,
      title: t.title,
      detail: t.detail,
      cta: t.cta,
      navView: 'super_admin',
      navTab: 'company',
      dueDate: t.dueDate,
      category: 'Compliance',
    });
  }

  /* ── Google setup (googleStore) ──────────────────────────────────────── */
  for (const t of googleSetupTasks()) {
    actions.push({
      id: `google-${t.id}`,
      band: t.priority === 'high' ? 'today' : 'week',
      priority: t.priority === 'high' ? 'high' : 'normal',
      title: t.title,
      detail: t.detail,
      cta: t.cta,
      navView: 'super_admin',
      navTab: 'google',
      category: 'Integrations',
    });
  }

  /* ── AI spend protection ────────────────────────────────────────────── */
  const protection = costProtectionState(now);
  if (protection.state !== 'normal') {
    actions.push({
      id: 'ai-cost-protection',
      band: protection.state === 'exceeded' ? 'now' : 'today',
      priority: protection.state === 'exceeded' ? 'urgent' : 'high',
      title: `AI spend ceiling ${protection.state === 'exceeded' ? 'reached' : 'approaching'}`,
      detail: protection.reason,
      cta: 'Review AI cost',
      navView: 'super_admin',
      navTab: 'costs',
      category: 'AI cost',
    });
  }

  /* ── integration failures handed in by the shell ─────────────────────── */
  for (const issue of input.integrationIssues ?? []) {
    actions.push({
      id: `integration-${issue.id}`,
      band: 'now',
      priority: 'urgent',
      title: `${issue.name} reported an error`,
      detail: issue.error,
      cta: 'Review integration',
      navView: 'integrations',
      category: 'Integrations',
    });
  }

  /* ── purchase orders at risk of the 24h rule ───────────────────────────────
   *
   * §P3 (2026-09-22) — REPOINTED, not weakened. The PO-at-risk action used to be
   * derived HERE, which made it appear in two action lists at once (this console
   * and Work Management). The Founder's decision is ONE action list, so the owner
   * of a PO's acknowledgement work is now the canonical **work layer**
   * (`src/lib/work/workStore.ts` → source `po_acknowledgement`, which derives the
   * same 24-hour risk from the same PO record and carries the PO's value and the
   * Purchase Orders destination). Nothing is lost: the item is still derived, it
   * is still urgent, and it now appears exactly once.
   */

  /* ── shipment exceptions ───────────────────────────────────────────────────
   *
   * §P3 — REPOINTED for the same reason: the owner of a shipment exception /
   * delay is the canonical work layer (source `shipment_exception`), which
   * derives one item per flagged consignment and routes it to Logistics. The
   * console no longer emits a duplicate. */

  /* ── brand applications awaiting a decision ──────────────────────────── */
  for (const app of demoApplications.filter((a) => a.status === 'pending')) {
    actions.push({
      id: `application-${app.id}`,
      band: 'today',
      priority: 'high',
      title: `Brand application — ${app.companyName}`,
      detail: `${app.country} · ${app.category} · awaiting a decision.`,
      cta: 'Review application',
      navView: 'super_admin',
      navTab: 'applications',
      region: app.country,
      category: app.category,
    });
  }

  /* ── launch centre ───────────────────────────────────────────────────── */
  for (const record of getLaunchRecords()) {
    if (record.profileStatus === 'submitted') continue;
    const platform = LAUNCH_PLATFORMS.find((p) => p.id === record.platformId);
    if (!platform) continue;
    actions.push({
      id: `launch-${record.platformId}`,
      band: 'week',
      priority: 'normal',
      title: `${platform.name}: ${
        record.profileStatus === 'prepared' ? 'prepared — awaiting submission' : 'profile not prepared'
      }`,
      detail: `Account ${record.accountStatus}. Verify the requirements on the platform before submitting.`,
      cta: record.profileStatus === 'prepared' ? 'Submit or modify' : 'Prepare profile',
      navView: 'super_admin',
      navTab: 'launch',
      category: 'Launch',
    });
  }

  /* ── partnership / trade targets not yet approached ──────────────────── */
  for (const target of FOUNDER_PARTNER_TARGETS) {
    if (target.stage !== 'not_approached') continue;
    actions.push({
      id: `partner-${target.id}`,
      band: 'week',
      priority: 'normal',
      title: `Plan the approach — ${target.name}`,
      detail: `${target.objective} (prospective route — no relationship exists).`,
      cta: 'Prepare approach',
      navView: 'partnerships',
      region: target.market,
      category: 'Partnerships',
    });
  }
/* ── §27/§28 — opportunities: canonical PO-potential ranking ──────────── */
  const rankedOpportunities = rankOpportunities(getProspects()).ranked.slice(0, 5);
  const opportunityActions: CommandAction[] = rankedOpportunities.map((o) => {
    const poPotential = o.estimatedPoPotentialGbp;
    return {
      id: `prospect-${o.id}`,
      band: poPotential >= 5000 ? 'today' : 'week',
      priority: poPotential >= 5000 ? 'high' : 'normal',
      title: `Opportunity — ${o.brand}`,
      detail: `Estimated PO potential £${o.estimatedPoPotentialGbp.toLocaleString('en-GB', {
        maximumFractionDigits: 2,
      })}/month · opportunity score ${o.opportunityScore} · rank #${o.rank} of the canonical PO-potential ranking · ${o.category} · ${
        o.geography.countries.join(', ') || 'country not recorded'
      }. ${o.estimateLabel}`,
      cta: o.recommendedCta,
      navView: 'brand_intelligence',
      region: o.geography.countries.join(', '),
      category: o.category,
      signals: { commercialPotential: o.opportunityScore, poPotentialGbp: poPotential },
    };
  });

  /* ── §27/§28 — relationship + funding slots (best-of, deterministic) ──── */
  const routeProspects = getProspects();
  const prospectsInMarket = (market: string): number =>
    routeProspects.filter((p) => (p.countries ?? []).some((c) => c.toLowerCase() === market.toLowerCase()))
      .length;
  const prospectsForProgramme = (programme: string): number =>
    routeProspects.filter((p) => p.marketAccess?.programme === programme).length;
  const targetOrder = (t: (typeof FOUNDER_PARTNER_TARGETS)[number]): number =>
    FOUNDER_PARTNER_TARGETS.indexOf(t);

  const bestEmbassy = FOUNDER_PARTNER_TARGETS.filter((t) => t.programme === 'british_embassy')
    .map((t) => ({ t, reach: prospectsInMarket(t.market) }))
    .sort((a, b) => b.reach - a.reach || targetOrder(a.t) - targetOrder(b.t))[0];

  if (bestEmbassy) {
    actions.push({
      id: 'relationship-embassy',
      band: 'week',
      priority: 'normal',
      title: `Best embassy introduction route — ${bestEmbassy.t.market}`,
      detail: `${bestEmbassy.t.objective} ${bestEmbassy.reach} canonical prospect(s) are recorded in that market. This is a prospective route — no relationship exists.`,
      cta: 'Prepare the approach',
      navView: 'partnerships',
      region: bestEmbassy.t.market,
      category: 'Partnerships',
      signals: { relationshipStage: bestEmbassy.t.stage },
    });
  }

  const bestProgramme = FOUNDER_PARTNER_TARGETS.filter((t) => Boolean(t.programme))
    .map((t) => ({ t, reach: prospectsForProgramme(t.programme!) }))
    .sort((a, b) => b.reach - a.reach || targetOrder(a.t) - targetOrder(b.t))[0];

  if (bestProgramme) {
    const programme = TRADE_PROGRAMMES[bestProgramme.t.programme!];
    actions.push({
      id: 'relationship-trade-programme',
      band: 'week',
      priority: 'normal',
      title: `Best trade programme route — ${programme.label}`,
      detail: `${programme.potentialValue} ${bestProgramme.reach} canonical prospect(s) are tagged to this programme. This is a prospective route — no relationship exists.`,
      cta: 'Prepare the approach',
      navView: 'partnerships',
      region: bestProgramme.t.market,
      category: 'Partnerships',
      signals: { relationshipStage: bestProgramme.t.stage },
    });
  }

  /* The honest gap: no investor target exists yet, so nothing can be ranked. */
  actions.push({
    id: 'founder-investor-route',
    band: 'today',
    priority: 'high',
    title: `Investor route — ${FUNDRAISING_PLAN.targetGbp.toLocaleString('en-GB', {
      style: 'currency',
      currency: 'GBP',
      maximumFractionDigits: 0,
    })} plan, ${FUNDRAISING_PLAN.committedGbp} committed`,
    detail: `No investor target is recorded yet, so there is nothing to rank: record the investor routes first. Plan only — no investment has been committed. This is a prospective route — no relationship exists.`,
    cta: 'Open Partnerships Centre',
    navView: 'partnerships',
    category: 'Fundraising',
  });

  /* Funding routes: ONE item per real opportunity that still needs the founder. */
  const fundingPipeline = getFundingPipeline();
  const fundingSummary = fundingPipelineSummary();
  for (const opp of FOUNDER_FUNDING_OPPORTUNITIES) {
    const entry = fundingPipeline.find((e) => e.opportunityId === opp.id);
    if (!entry || entry.submission) continue;
    const awaitingApproval = fundingSummary.awaitingFounderApproval.includes(opp.id);
    const needsRecording = fundingSummary.approvedNotYetSubmitted.includes(opp.id);
    actions.push({
      id: `funding-route-${opp.id}`,
      band: awaitingApproval || needsRecording ? 'today' : 'week',
      priority: awaitingApproval || needsRecording ? 'high' : 'normal',
      title: `${FUNDING_OPPORTUNITY_TYPE_LABELS[opp.opportunityType]} — ${opp.organisation}`,
      detail: `${opp.geography} · pipeline stage ${FUNDING_STAGE_LABELS[entry.stage]}. Next: ${entry.nextAction} Mercenta submits nothing — verify the current requirements on the programme site.`,
      cta: awaitingApproval ? 'Review & approve' : needsRecording ? 'Record your submission' : 'Open the pipeline',
      navView: 'super_admin',
      navTab: 'grants',
      region: opp.geography,
      category: 'Fundraising',
      signals: { fundingStage: entry.stage, approvalRequired: awaitingApproval },
    });
  }

  /* ── finance ─────────────────────────────────────────────────────────── */
  const costs = operatingCostSummary(now);
  const financeActions: CommandAction[] = [
    {
      id: 'finance-contribution',
      band: 'week',
      priority: 'normal',
      title: `Gross contribution ${costs.contribution.grossGbp.toLocaleString('en-GB', { style: 'currency', currency: 'GBP' })} (provisional)`,
      detail: `Monthly cost base £${costs.monthlyTotalGbp.toFixed(2)} against revenue from the canonical stores. Pricing inputs still require founder approval.`,
      cta: 'Open costs',
      navView: 'super_admin',
      navTab: 'costs',
      category: 'Finance',
    },
  ];
  actions.push(...financeActions);

  /* ── AI cost summary (ranked like everything else the founder sees) ───── */
  const aiCostAction: CommandAction = {
    id: 'ai-cost-summary',
    band: protection.state === 'normal' ? 'week' : 'today',
    priority: protection.state === 'normal' ? 'normal' : 'high',
    title: `AI usage £${costs.ai.monthlySpendGbp.toFixed(2)} of £${costs.ai.ceilingMonthlyGbp} ceiling (${costs.ai.calls} calls)`,
    detail: protection.reason,
    cta: 'Open AI cost',
    navView: 'super_admin',
    navTab: 'costs',
    category: 'AI cost',
  };
  actions.push(aiCostAction);

  const metrics = partnershipMetrics();

  const sections: CommandSection[] = [
    {
      id: 'opportunities',
      label: 'Opportunities',
      description: 'Highest-potential brands and channels, ranked from the canonical prospect store.',
      actions: opportunityActions,
    },
    {
      id: 'fundraising',
      label: 'Fundraising & partnerships',
      description: 'Prospective programme and partner routes — no relationship is claimed.',
      actions: [
        ...actions.filter((a) => a.navView === 'partnerships' || a.id.startsWith('funding-route-')),
        {
          id: 'fundraising-summary',
          band: 'week',
          priority: 'normal',
          title: `${metrics.targetsTotal - metrics.approached} of ${metrics.targetsTotal} partner routes not yet approached`,
          detail: 'Fundraising and partnership routes are tracked in the Partnerships Centre.',
          cta: 'Open Partnerships Centre',
          navView: 'partnerships',
          category: 'Fundraising',
        },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      description: 'POs, shipments and applications that need a decision.',
      actions: actions.filter(
        (a) => ['purchase_orders_admin', 'logistics'].includes(a.navView) || a.navTab === 'applications'
      ),
    },
    {
      id: 'finance',
      label: 'Finance',
      description: 'Revenue, cost and contribution position.',
      actions: financeActions,
    },
    {
      id: 'ai_cost',
      label: 'AI cost',
      description: 'Runtime usage, ceilings and the cost-protection state.',
      actions: [aiCostAction],
    },
  ];

  /* §28 — the same objects get their WHY + rank, then the bands read in rank order. */
  const queue = rankQueue(actions);
  const nowBand = actions.filter((a) => a.band === 'now').sort(byRank);
  const todayBand = actions.filter((a) => a.band === 'today').sort(byRank);
  const weekBand = actions.filter((a) => a.band === 'week').sort(byRank);

  return {
    now: nowBand,
    today: todayBand,
    week: weekBand,
    sections,
    counts: { now: nowBand.length, today: todayBand.length, week: weekBand.length, total: actions.length },
    queue,
    queueBasis: COMMAND_QUEUE_BASIS,
  };
}