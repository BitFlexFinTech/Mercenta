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
 * Every action is DERIVED from a real store — companyStore, googleStore,
 * launchStore, the canonical PO/shipment store, brand applications, the partner
 * target config, the prospect store and the cost/usage modules. Nothing is
 * invented, and every action carries the exact CTA + destination so the founder
 * never has to hunt for the screen that performs it.
 */
import { demoPurchaseOrders, demoShipments } from '@/data/demoStore';
import { demoApplications } from '@/data/applicationStore';
import { getLaunchRecords } from '@/data/launchStore';
import { companyComplianceTasks } from '@/data/companyStore';
import { googleSetupTasks } from '@/data/googleStore';
import { getProspects } from '@/data/prospectStore';
import { FOUNDER_PARTNER_TARGETS, partnershipMetrics } from '@/config/partnerships';
import { LAUNCH_PLATFORMS } from '@/config/launchPlatforms';
import { costProtectionState } from '@/lib/costs/usageLog';
import { operatingCostSummary } from '@/lib/costs/costSummary';

export type CommandBand = 'now' | 'today' | 'week';

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
}

function hoursSince(iso: string, now: Date): number {
  return (now.getTime() - new Date(iso).getTime()) / (60 * 60 * 1000);
}

function byPriority(a: CommandAction, b: CommandAction): number {
  const rank = { urgent: 0, high: 1, normal: 2 } as const;
  return rank[a.priority] - rank[b.priority];
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

  /* ── purchase orders at risk of the 24h rule ─────────────────────────── */
  const openPos = demoPurchaseOrders.filter((po) => po.status === 'received' || po.status === 'under_review');
  for (const po of openPos) {
    const atRisk = hoursSince(po.orderDate, now) >= 24;
    actions.push({
      id: `po-${po.id}`,
      band: atRisk ? 'now' : 'today',
      priority: atRisk ? 'urgent' : 'high',
      title: atRisk
        ? `PO ${po.poNumber} is past the 24-hour acknowledgment window`
        : `PO ${po.poNumber} awaits acknowledgment`,
      detail: `Value £${po.poValue.toLocaleString('en-GB')} · status ${po.status} · received ${po.orderDate}.`,
      cta: atRisk ? 'Review PO now' : 'Review PO',
      navView: 'purchase_orders_admin',
      valueGbp: po.poValue,
      category: 'Purchase orders',
    });
  }

  /* ── shipment exceptions ─────────────────────────────────────────────── */
  for (const s of demoShipments) {
    if (!s.exception && !s.delayed) continue;
    actions.push({
      id: `shipment-${s.id}`,
      band: 'now',
      priority: 'urgent',
      title: `${s.exception ? 'Shipment exception' : 'Shipment delayed'} — ${s.poNumber}`,
      detail: `${s.carrier} · ${s.origin} → ${s.destination} · status ${s.status}.`,
      cta: 'Review shipment',
      navView: 'logistics',
      valueGbp: s.value,
      category: 'Shipments',
    });
  }

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
/* ── opportunities: highest PO potential first ───────────────────────── */
  const prospects = [...getProspects()]
    .sort((a, b) => (b.score?.total ?? 0) - (a.score?.total ?? 0))
    .slice(0, 5);
  const opportunityActions: CommandAction[] = prospects.map((p) => ({
    id: `prospect-${p.id}`,
    band: 'week',
    priority: 'normal',
    title: `Opportunity — ${p.brand}`,
    detail: `Score ${p.score?.total ?? 'n/a'} (${p.score?.tier ?? 'untiered'}) · ${p.category} · ${
      p.countries?.join(', ') ?? 'country not recorded'
    }.`,
    cta: 'Review evidence',
    navView: 'brand_intelligence',
    region: p.countries?.join(', '),
    category: p.category,
  }));

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
        ...actions.filter((a) => a.navView === 'partnerships'),
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
      actions: [
        {
          id: 'ai-cost-summary',
          band: protection.state === 'normal' ? 'week' : 'today',
          priority: protection.state === 'normal' ? 'normal' : 'high',
          title: `AI usage £${costs.ai.monthlySpendGbp.toFixed(2)} of £${costs.ai.ceilingMonthlyGbp} ceiling (${costs.ai.calls} calls)`,
          detail: protection.reason,
          cta: 'Open AI cost',
          navView: 'super_admin',
          navTab: 'costs',
          category: 'AI cost',
        },
      ],
    },
  ];

  const nowBand = actions.filter((a) => a.band === 'now').sort(byPriority);
  const todayBand = actions.filter((a) => a.band === 'today').sort(byPriority);
  const weekBand = actions.filter((a) => a.band === 'week').sort(byPriority);

  return {
    now: nowBand,
    today: todayBand,
    week: weekBand,
    sections,
    counts: { now: nowBand.length, today: todayBand.length, week: weekBand.length, total: actions.length },
  };
}