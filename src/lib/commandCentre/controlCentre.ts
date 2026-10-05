/**
 * §Founder OS — FOUNDER / SUPER ADMIN CONTROL CENTRE model.
 *
 * The single derived operating-centre model the founder's first screen renders.
 * It is NOT a cosmetic dashboard: every number is computed from a canonical
 * record, every tile drills into an EXISTING destination, and every attention
 * item points at the real object that needs a decision.
 *
 * THE NINE VIEWS (matching the sprint's agreed capability areas)
 *   BUSINESS · BRANDS · ACQUISITION · OPERATIONS · FINANCE · COMPLIANCE
 *   · AUTOMATION · AI · AUDIT
 *
 * RULES
 * - Nothing is manufactured to fill the UI. If a figure is zero it says zero,
 *   and if a source is empty the surface shows an honest empty state.
 * - This module NEVER invents a second engine: work comes from the work layer,
 *   automation from the automation registry, acquisition from the acquisition
 *   engine, intelligence from the BI findings layer, AI state from the AI seam.
 * - Super Admin only. It is rendered behind the AdminShell's Super-Admin guard;
 *   nothing here is reachable from a brand session.
 */
import type { PaletteDomain } from '@/config/themes';
import type { StatusTone } from '@/components/ui';
import {
  demoAuditLog,
  demoBrands,
  demoCommerceInvoices,
  demoComplianceDocs,
  demoDeductions,
  demoPurchaseOrders,
  demoShipments,
  getAllCommercePayments,
} from '@/data/demoStore';
import { summariseInvoiceLedger } from '@/lib/commerce/invoiceTerms';
import { getAllReturnTracking } from '@/lib/warehouse/returnsTracking';
import {
  DEDUCTION_DISPUTE_WINDOW_DAYS,
  EXPIRY_HORIZON_DAYS,
  addDays,
  brandLabel,
  daysBetween,
  demoToday,
  getWorkItems,
  overdueWorkItems,
  workItemId,
} from '@/lib/work/workStore';
import { allCommercialReadinessRecords } from '@/data/commercialReadinessStore';
import {
  COMMERCIAL_BRAND_CONDITION_GUIDANCE,
  COMMERCIAL_BRAND_TERM_GUIDANCE,
  COMMERCIAL_VIABILITY_ROUTE_DEFINITIONS,
  COMMERCIAL_WORK_BY_ROUTE,
} from '@/config/commercialReadiness';
import type { CommercialViabilityRoute } from '@/config/commercialReadiness';
import { getActiveReminders } from '@/lib/work/reminderRunner';
import {
  automationDependencies,
  automationHealth,
  automationSummary,
  describeAutomationScheduler,
  pendingApprovals,
  type AutomationDependency,
  type AutomationHealth,
  type AutomationSummary,
  type PendingApproval,
} from '@/lib/automation/registry';
import { aiAvailability, type AiAvailability } from '@/lib/ai/founderAiClient';
import { acquisitionPipeline, type AcquisitionPipelineModel } from '@/lib/acquisition/acquisitionEngine';
import {
  computeConversionMetrics,
  formatRate,
  type AcquisitionConversionMetrics,
} from '@/lib/acquisition/conversionMetrics';
import { intelligenceSummary, type IntelligenceSummary } from '@/lib/intelligence/intelligenceLayer';
import { revenueByStream } from '@/lib/costs/costSummary';
import { allPreAuditAssessments } from '@/data/preAuditStore';
import { demoAuditLog as preAuditAuditLog } from '@/data/demoStore';

export type ControlCentreSectionId =
  | 'business'
  | 'brands'
  | 'commercial'
  | 'acquisition'
  | 'operations'
  | 'finance'
  | 'compliance'
  | 'automation'
  | 'ai'
  | 'audit';

export interface ControlCentreSection {
  id: ControlCentreSectionId;
  label: string;
  description: string;
  /** The EXISTING destination this section's records live in. */
  destination: string;
  domain: PaletteDomain;
}

export const CONTROL_CENTRE_SECTIONS: readonly ControlCentreSection[] = [
  { id: 'business', label: 'Business', description: 'Operational health, revenue signals and workload.', destination: 'overview', domain: 'orders' },
  { id: 'brands', label: 'Brands', description: 'Portfolio, onboarding, readiness and compliance state.', destination: 'crm', domain: 'communications' },
  { id: 'commercial', label: 'Commercial', description: 'Product commercial readiness: ready, remediating, blocked and under review.', destination: 'control_centre', domain: 'finance' },
  { id: 'acquisition', label: 'Acquisition', description: 'Prospects, pipeline stages, follow-ups and conversions.', destination: 'crm', domain: 'intelligence' },
  { id: 'operations', label: 'Operations', description: 'Purchase orders, fulfilment, shipments, returns and work.', destination: 'work', domain: 'logistics' },
  { id: 'finance', label: 'Finance', description: 'Invoices, payments, deductions and outstanding items.', destination: 'accounting', domain: 'finance' },
  { id: 'compliance', label: 'Compliance', description: 'Missing, rejected, expiring, blocked and ready.', destination: 'compliance', domain: 'compliance' },
  { id: 'automation', label: 'Automation', description: 'The automation catalogue, runs, failures and approvals.', destination: 'control_centre', domain: 'risk' },
  { id: 'ai', label: 'AI', description: 'Availability, free-model routing and the truthful degraded state.', destination: 'control_centre', domain: 'intelligence' },
  { id: 'audit', label: 'Audit', description: 'Administrative, automation and approval actions.', destination: 'audit_log', domain: 'risk' },
] as const;

/**
 * §Phase 1 — the pre-audit queue model. Derived from the canonical pre-audit
 * store; every figure is a real count over real records.
 */
export interface PreAuditQueueRow {
  assessmentId: string;
  brand: string;
  website: string;
  category: string;
  /** The canonical presence outcome, or 'unknown'. */
  presence: string;
  qualification: string;
  qualificationLabel: string;
  researchMode: string;
  openQuestions: number;
  /** True once the assessment has been fed into the canonical acquisition pipeline. */
  fed: boolean;
  fedProspectId: string | null;
  recommendedNextStep: string;
}

export interface PreAuditQueueModel {
  total: number;
  qualified: number;
  needsInformation: number;
  ineligible: number;
  unqualified: number;
  fed: number;
  simulated: number;
  reviewRequested: number;
  rows: PreAuditQueueRow[];
}

export interface ControlMetric {
  id: string;
  label: string;
  value: string;
  tone: StatusTone;
  statusText: string;
  context: string;
  /** Clicking the metric opens this EXISTING destination. */
  destination: string;
}

/**
 * §Phase 2 §12 — ONE commercial readiness row. Every field is derived from the
 * canonical readiness record, so the founder sees exactly WHY a product sits in
 * its state and what the next action is. No internal score is invented.
 */
export interface CommercialReadinessQueueRow {
  recordId: string;
  product: string;
  productRef: string | null;
  brandTenantId: string | null;
  brandLabel: string;
  route: CommercialViabilityRoute;
  routeLabel: string;
  /** The evaluated conditions that are unmet, with the observed value. */
  unmet: { id: string; label: string; observed: string; routeId: string }[];
  /** The conditions that could NOT be evaluated — the fail-closed reasons. */
  unevaluable: { id: string; label: string; reason: string }[];
  missingInputs: string[];
  openQuestions: string[];
  /** The declared next step carried by the record. */
  nextStep: string;
  /** Who must act now. */
  owner: 'brand' | 'mercenta_ops';
  ownerLabel: string;
  /** The declared SLA deadline derived from the record's own createdAt. */
  dueDate: string | null;
  /** The canonical work item raised for this record, when the route raises work. */
  workItemId: string | null;
  /** The routing decision behind the record — the auditable explanation. */
  routingDecisionId: string;
  moqDisclaimer: string;
  updatedAt: string;
}

export interface CommercialReadinessQueueModel {
  total: number;
  ready: number;
  remediation: number;
  blocked: number;
  humanReview: number;
  /** Products whose route needs the BRAND to supply information. */
  needsBrandAction: number;
  /** Products whose route needs a MERCENTA decision. */
  needsDecision: number;
  rows: CommercialReadinessQueueRow[];
  /** §18 — how many guidance articles the brand view links to (never internal). */
  brandGuidanceTopics: number;
}

export interface ControlAttentionItem {
  id: string;
  title: string;
  detail: string;
  priority: 'urgent' | 'high' | 'normal';
  destination: string;
  /** What kind of canonical object this is (work item, approval, finding…). */
  source: string;
}

export interface ControlCentreModel {
  generatedFor: string;
  counts: {
    brands: number;
    activeBrands: number;
    openWork: number;
    criticalWork: number;
    overdueWork: number;
    activeReminders: number;
    automationDeclared: number;
    automationFailed: number;
    approvalsPending: number;
    prospectsInPipeline: number;
    intelligenceFindings: number;
    auditEntries: number;
    /** §Phase 1 — pre-audit figures (real counts over canonical records). */
    preAuditAssessments: number;
    preAuditQualified: number;
    preAuditFed: number;
    /** §Phase 2 — commercial readiness figures (real counts). */
    commercialAssessed: number;
    commercialReady: number;
    commercialNeedsDecision: number;
  };
  metrics: Record<ControlCentreSectionId, ControlMetric[]>;
  attention: ControlAttentionItem[];
  acquisition: AcquisitionPipelineModel;
  /**
   * §ACQ-CONVERSION — the acquisition conversion funnel + rates, derived from
   * the SAME canonical records the pipeline above reports (no second definition;
   * see `src/lib/acquisition/conversionMetrics.ts`).
   */
  acquisitionConversion: AcquisitionConversionMetrics;
  /** §Phase 1 — the Explore UK Market Fit pre-audit queue (canonical records). */
  preAudit: PreAuditQueueModel;
  /** §Phase 2 — the commercial readiness queue (canonical readiness records). */
  commercial: CommercialReadinessQueueModel;
  intelligence: IntelligenceSummary;
  automation: AutomationHealth[];
  automationSummary: AutomationSummary;
  approvals: PendingApproval[];
  dependencies: AutomationDependency[];
  scheduler: ReturnType<typeof describeAutomationScheduler>;
  ai: AiAvailability;
  audit: { id: string; at: string; actor: string; action: string; reason: string; destination: string }[];
  /** Provenance of every figure above — shown on the surface, never implied. */
  dataSources: { label: string; value: string }[];
}

/* ── Derivation ────────────────────────────────────────────────────────────── */

function metric(
  id: string,
  label: string,
  value: string,
  tone: StatusTone,
  statusText: string,
  context: string,
  destination: string
): ControlMetric {
  return { id, label, value, tone, statusText, context, destination };
}

export function buildControlCentre(): ControlCentreModel {
  const today = demoToday();
  const work = getWorkItems('admin', null);
  const overdue = overdueWorkItems('admin');
  const critical = work.filter((w) => w.priority === 'critical');
  const reminders = getActiveReminders('admin');
  const acquisition = acquisitionPipeline();
  const acquisitionConversion = computeConversionMetrics(acquisition.records);
  const intelligence = intelligenceSummary();
  const automation = automationHealth();
  const automationTotals = automationSummary();
  const approvals = pendingApprovals();
  const dependencies = automationDependencies();
  const scheduler = describeAutomationScheduler();
  const ai = aiAvailability();
  const revenue = revenueByStream();
  const revenueTotal = revenue.reduce((sum, s) => sum + s.gbp, 0);

  /* ── §Phase 1 — pre-audit (Explore UK Market Fit) queue ── */
  const preAuditRecords = allPreAuditAssessments();
  const preAudit: PreAuditQueueModel = {
    total: preAuditRecords.length,
    qualified: preAuditRecords.filter((a) => a.snapshot?.qualification === 'qualified').length,
    needsInformation: preAuditRecords.filter((a) => a.snapshot?.qualification === 'needs_information').length,
    ineligible: preAuditRecords.filter((a) => a.snapshot?.qualification === 'ineligible').length,
    unqualified: preAuditRecords.filter((a) => !a.snapshot || a.snapshot.qualification === 'unqualified').length,
    fed: preAuditRecords.filter((a) => a.fedProspectId !== null).length,
    simulated: preAuditRecords.filter((a) => a.snapshot?.researchMode === 'simulated').length,
    reviewRequested: preAuditAuditLog.filter((r) => r.action === 'pre_audit_review_requested').length,
    rows: preAuditRecords.map((a) => ({
      assessmentId: a.id,
      brand: a.input.brandName,
      website: a.input.website,
      category: a.input.category,
      presence: a.snapshot?.presenceLabel ?? 'unknown',
      qualification: a.snapshot?.qualification ?? 'unqualified',
      qualificationLabel: a.snapshot?.qualificationLabel ?? 'Not qualified yet',
      researchMode: a.snapshot?.researchMode ?? 'none',
      openQuestions: a.snapshot?.openQuestions.length ?? 0,
      fed: a.fedProspectId !== null,
      fedProspectId: a.fedProspectId,
      recommendedNextStep: a.snapshot?.recommendedNextStep ?? a.brandOpportunity.nextAction,
    })),
  };

  /* ── §Phase 2 — commercial readiness (product economics) queue ──
   * Every field is derived from the canonical readiness record; the model never
   * invents a score, a threshold or a next action. */
  const commercialRecords = allCommercialReadinessRecords();
  const commercialRows: CommercialReadinessQueueRow[] = commercialRecords.map((r) => {
    const def = COMMERCIAL_WORK_BY_ROUTE[r.route];
    const tenantId = r.owner.kind === 'brand' ? r.owner.tenantId : null;
    const workRef = def.source ? workItemId(def.source, r.id) : null;
    return {
      recordId: r.id,
      product: r.productLabel ?? r.id,
      productRef: r.productRef,
      brandTenantId: tenantId,
      brandLabel: brandLabel(tenantId),
      route: r.route,
      routeLabel: COMMERCIAL_VIABILITY_ROUTE_DEFINITIONS[r.route].label,
      unmet: r.conditions
        .filter((c) => !c.met && c.notEvaluatedReason === null)
        .map((c) => ({ id: c.id, label: c.label, observed: c.observed, routeId: c.routeId })),
      unevaluable: r.conditions
        .filter((c) => c.notEvaluatedReason !== null)
        .map((c) => ({ id: c.id, label: c.label, reason: c.notEvaluatedReason as string })),
      missingInputs: r.missingInputs,
      openQuestions: r.openQuestions,
      nextStep: r.nextStep,
      owner: def.owner,
      ownerLabel: def.owner === 'brand' ? 'Brand' : 'Mercenta',
      dueDate: def.slaDays === null ? null : addDays(r.createdAt.slice(0, 10), def.slaDays),
      workItemId: workRef,
      routingDecisionId: r.routingDecisionId,
      moqDisclaimer: r.moqDisclaimer,
      updatedAt: r.updatedAt,
    };
  });
  const commercial: CommercialReadinessQueueModel = {
    total: commercialRows.length,
    ready: commercialRows.filter((r) => r.route === 'ready').length,
    remediation: commercialRows.filter((r) => r.route === 'remediation').length,
    blocked: commercialRows.filter((r) => r.route === 'blocked').length,
    humanReview: commercialRows.filter((r) => r.route === 'human_review').length,
    needsBrandAction: commercialRows.filter((r) => r.owner === 'brand').length,
    needsDecision: commercialRows.filter((r) => r.owner === 'mercenta_ops' && r.route !== 'ready').length,
    rows: commercialRows.sort((a, b) => {
      const rank: Record<CommercialViabilityRoute, number> = {
        blocked: 0,
        remediation: 1,
        human_review: 2,
        ready: 3,
      };
      return rank[a.route] - rank[b.route] || a.product.localeCompare(b.product);
    }),
    brandGuidanceTopics: new Set([
      ...Object.values(COMMERCIAL_BRAND_TERM_GUIDANCE).map((g) => g.articleId),
      ...Object.values(COMMERCIAL_BRAND_CONDITION_GUIDANCE).map((g) => g.articleId),
    ]).size,
  };

  /* ── Operations ── */
  const openPos = demoPurchaseOrders.filter((po) => po.status !== 'delivered' && po.status !== 'rejected');
  const unacknowledged = demoPurchaseOrders.filter(
    (po) => !po.acknowledgedAt && po.status !== 'rejected' && po.status !== 'delivered'
  );
  const shipmentExceptions = demoShipments.filter((s) => s.exception);
  const delayedShipments = demoShipments.filter((s) => s.delayed);
  const returns = getAllReturnTracking();

  /* ── Finance ──
   * §P7 — REPOINTED to the ONE owner (`src/lib/commerce/invoiceTerms.ts`):
   * receivables are ISSUED-and-unpaid, and an invoice's due date is its own issue
   * date plus ITS OWN terms (14/30/60). This used to re-derive both figures from
   * the single global `INVOICE_TERM_DAYS`.
   */
  const invoiceLedger = summariseInvoiceLedger(
    demoCommerceInvoices,
    getAllCommercePayments(),
    today
  );
  const unpaidInvoices = invoiceLedger.outstanding;
  const overdueInvoices = invoiceLedger.overdue;
  const openDeductions = demoDeductions.filter((d) => d.status !== 'resolved' && d.status !== 'accepted');
  const overdueDeductions = openDeductions.filter(
    (d) => addDays(d.date, DEDUCTION_DISPUTE_WINDOW_DAYS) < today
  );

  /* ── Compliance ── */
  const missingDocs = demoComplianceDocs.filter((d) => d.status === 'missing');
  const rejectedDocs = demoComplianceDocs.filter((d) => d.status === 'rejected');
  const expiringDocs = demoComplianceDocs.filter((d) => {
    if (!d.expiryDate) return false;
    const left = daysBetween(today, d.expiryDate);
    return left >= 0 && left <= EXPIRY_HORIZON_DAYS;
  });
  const approvedDocs = demoComplianceDocs.filter((d) => d.status === 'approved');

  /* ── Brands ── */
  const brandsWithBlockingDocs = new Set([...missingDocs, ...rejectedDocs].map((d) => d.brandId));
  const brandsWithPos = new Set(demoPurchaseOrders.map((po) => po.brandId));

  /* ── Audit ── */
  const auditRows = [...demoAuditLog]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 25);


  const metrics: Record<ControlCentreSectionId, ControlMetric[]> = {
    business: [
      metric('brands', 'Brands', String(demoBrands.length), 'neutral', 'Portfolio', 'Canonical demo brand universe.', 'crm'),
      metric('open-work', 'Open work', String(work.length), work.length > 0 ? 'warning' : 'success', 'Operating layer', `${critical.length} critical · ${overdue.length} overdue.`, 'work'),
      metric('revenue', 'Recorded revenue', `£${revenueTotal.toLocaleString('en-GB')}`, 'neutral', 'Canonical streams', 'Commission + shipping margin only; nothing blended.', 'accounting'),
      metric('attention', 'Attention items', String(critical.length + overdue.length), critical.length + overdue.length > 0 ? 'danger' : 'success', 'Needs a decision', 'Critical work plus work past deadline.', 'work'),
    ],
    brands: [
      metric('brand-total', 'Brands', String(demoBrands.length), 'neutral', 'Portfolio', 'Canonical brand records.', 'crm'),
      metric('brands-po', 'With purchase orders', String(brandsWithPos.size), 'info', 'Trading', 'Brands with at least one canonical PO.', 'purchase_orders_admin'),
      metric('brands-blocked', 'Compliance blocked', String(brandsWithBlockingDocs.size), brandsWithBlockingDocs.size > 0 ? 'danger' : 'success', 'Gate', 'Missing or rejected documents block the catalogue gate.', 'compliance'),
      metric('brands-ready', 'Documents approved', String(approvedDocs.length), 'success', 'Verified', 'Approved compliance documents across the portfolio.', 'compliance'),
    ],
    commercial: [
      metric('comm-total', 'Products assessed', String(commercial.total), 'neutral', 'Commercial readiness', 'The same product record the brand sees — one record, two views.', 'control_centre'),
      metric('comm-ready', 'Commercially ready', String(commercial.ready), commercial.ready > 0 ? 'success' : 'neutral', 'Proceed', 'Every declared commercial condition is satisfied.', 'control_centre'),
      metric('comm-remediation', 'Information needed', String(commercial.remediation), commercial.remediation > 0 ? 'warning' : 'success', 'Brand action', 'A required commercial detail is missing and the brand can supply it.', 'control_centre'),
      metric('comm-blocked', 'Blocked', String(commercial.blocked), commercial.blocked > 0 ? 'danger' : 'success', 'Not viable as priced', 'The observed economics or volume genuinely do not work.', 'control_centre'),
      metric('comm-review', 'Human review', String(commercial.humanReview), commercial.humanReview > 0 ? 'warning' : 'success', 'Mercenta decision', 'A condition could not be evaluated, so the gate fails closed rather than inventing a rule.', 'control_centre'),
      metric('comm-guidance', 'Brand guidance topics', String(commercial.brandGuidanceTopics), 'info', 'Academy seam', 'Every guidance topic links to a real Knowledge Base article — the brand is never left to guess.', 'control_centre'),
    ],
    acquisition: [
      metric('acq-prospects', 'Prospects', String(acquisition.total), 'neutral', 'Canonical BI store', `${acquisition.active} active · ${acquisition.disqualified} disqualified.`, 'crm'),
      metric('acq-preaudit', 'Market Fit assessments', String(preAudit.total), 'info', 'Pre-audit layer', `${preAudit.qualified} qualified · ${preAudit.needsInformation} need information · ${preAudit.fed} fed to acquisition.`, 'control_centre'),
      metric('acq-approval', 'Awaiting approval', String(acquisition.awaitingApproval), acquisition.awaitingApproval > 0 ? 'warning' : 'success', 'Human gate', 'Nothing is sent until the founder approves.', 'crm'),
      metric('acq-followup', 'Follow-ups due', String(acquisition.followUpsDue + acquisition.followUpsOverdue), acquisition.followUpsOverdue > 0 ? 'danger' : 'info', 'Cadence', `${acquisition.followUpsOverdue} overdue.`, 'crm'),
      metric('acq-brands', 'Activated brands', String(acquisition.activatedBrands), 'success', 'Converted', 'Only a completed onboarding makes a prospect a tenant.', 'onboarding_pipeline'),
      /* §ACQ-CONVERSION — the rates over the same canonical records. */
      metric('acq-reply-rate', 'Reply rate', formatRate(acquisitionConversion.rates.replyRate), acquisitionConversion.rates.replyRate === null ? 'neutral' : 'info', `of ${acquisitionConversion.counts.contacted} contacted`, 'Replied ÷ contacted — a canonical response exists on the prospect record.', 'crm'),
      metric('acq-engagement-rate', 'Engagement rate', formatRate(acquisitionConversion.rates.engagementRate), acquisitionConversion.rates.engagementRate === null ? 'neutral' : 'info', `of ${acquisitionConversion.counts.contacted} contacted`, 'Reached a meeting, negotiation or pilot ÷ contacted.', 'crm'),
      metric('acq-conversion-rate', 'Conversion rate', formatRate(acquisitionConversion.rates.conversionRate), acquisitionConversion.counts.converted > 0 ? 'success' : 'neutral', `${acquisitionConversion.counts.converted} activated`, 'Only a completed onboarding counts as converted.', 'onboarding_pipeline'),
      metric('acq-reply-engagement', 'Reply → engagement', formatRate(acquisitionConversion.rates.replyToEngagementRate), 'neutral', `of ${acquisitionConversion.counts.replied} replies`, 'Of those who replied, the share that engaged — the canonical "positive reply" measure.', 'crm'),
    ],
    operations: [
      metric('ops-pos', 'Open purchase orders', String(openPos.length), 'neutral', 'Order book', `${unacknowledged.length} unacknowledged.`, 'purchase_orders_admin'),
      metric('ops-shipments', 'Shipments tracked', String(demoShipments.length), 'info', 'Carrier', `${delayedShipments.length} delayed · ${shipmentExceptions.length} exceptions.`, 'logistics'),
      metric('ops-exceptions', 'Shipment exceptions', String(shipmentExceptions.length), shipmentExceptions.length > 0 ? 'danger' : 'success', 'Carrier seam', 'Exceptions derived from the carrier simulation.', 'logistics'),
      metric('ops-returns', 'Returns in progress', String(returns.length), 'neutral', 'Warehouse', 'Returns not yet confirmed by the brand.', 'returns_tracking'),
    ],
    finance: [
      metric('fin-unpaid', 'Unpaid invoices', String(unpaidInvoices.length), unpaidInvoices.length > 0 ? 'warning' : 'success', 'Receivables', `${overdueInvoices.length} past the payment terms on the invoice itself (derived; 14/30/60 per invoice).`, 'accounting'),
      metric('fin-deductions', 'Open deductions', String(openDeductions.length), openDeductions.length > 0 ? 'warning' : 'success', 'Chargebacks', `${overdueDeductions.length} past the declared dispute window.`, 'accounting'),
      metric('fin-reminders', 'Active reminders', String(reminders.length), reminders.length > 0 ? 'warning' : 'success', 'Escalations', 'Raised by the deterministic reminder sweep.', 'work'),
      metric('fin-revenue', 'Recorded revenue', `£${revenueTotal.toLocaleString('en-GB')}`, 'neutral', 'Canonical streams', 'Per-stream labels are preserved on the Accounting surface.', 'accounting'),
    ],
    compliance: [
      metric('comp-missing', 'Missing', String(missingDocs.length), missingDocs.length > 0 ? 'danger' : 'success', 'Blocking', 'A missing document blocks the gate.', 'compliance'),
      metric('comp-rejected', 'Rejected', String(rejectedDocs.length), rejectedDocs.length > 0 ? 'danger' : 'success', 'Blocking', 'A rejected document blocks the gate.', 'compliance'),
      metric('comp-expiring', 'Expiring (60 days)', String(expiringDocs.length), expiringDocs.length > 0 ? 'warning' : 'success', 'Horizon', 'Derived from each document’s own expiry date.', 'compliance'),
      metric('comp-approved', 'Approved', String(approvedDocs.length), 'success', 'Verified', 'Verified documents; the gate is never bypassed by automation.', 'compliance'),
    ],
    automation: [
      metric('auto-declared', 'Automations', String(automationTotals.declared), 'neutral', 'Catalogue', 'Declared deterministic automations.', 'control_centre'),
      metric('auto-failed', 'Failed', String(automationTotals.failed), automationTotals.failed > 0 ? 'danger' : 'success', 'Observable', 'A failure is recorded honestly and is retryable.', 'control_centre'),
      metric('auto-approval', 'Awaiting approval', String(automationTotals.awaitingApproval), automationTotals.awaitingApproval > 0 ? 'warning' : 'success', 'Human gate', 'Consequential steps stop until a human decides.', 'control_centre'),
      metric('auto-runs', 'Runs recorded', String(automationTotals.totalRuns), 'info', 'Run ledger', `${automationTotals.neverRun} automation(s) not yet run.`, 'control_centre'),
    ],
    ai: [
      metric('ai-state', 'AI state', ai.state.replace(/_/g, ' '), ai.state === 'free_model_ready' ? 'success' : 'warning', ai.state === 'free_model_ready' ? 'Available' : 'Deterministic mode', ai.reason, 'control_centre'),
      metric('ai-model', 'Model', ai.model ?? 'none', 'neutral', ai.model ? 'Free model' : 'No model call', ai.model ? 'Free models only — no paid fallback.' : 'No credential configured; no call is made.', 'control_centre'),
      metric('ai-provider', 'Provider mode', ai.mode.replace(/_/g, ' '), ai.simulationSafe ? 'success' : 'neutral', ai.simulationSafe ? 'Simulation' : 'Not simulation', 'Only a positively identified simulation is simulation-safe.', 'integrations'),
      metric('ai-cost', 'Paid fallback', 'Disabled', 'success', 'Policy', 'The runtime policy permits free models only.', 'operating_costs'),
    ],
    audit: [
      metric('audit-entries', 'Audit entries', String(auditRows.length), 'neutral', 'This session', 'Canonical audit records, newest first.', 'audit_log'),
      metric('audit-automation', 'Automation actions', String(auditRows.filter((r) => String(r.action).startsWith('automation')).length), 'info', 'Attributed', 'Every automation run is attributed and recorded.', 'audit_log'),
      metric('audit-approvals', 'Approval decisions', String(auditRows.filter((r) => String(r.action).includes('approval')).length), 'info', 'Human', 'Approvals and rejections are audited with a reason.', 'audit_log'),
      metric('audit-escalations', 'Escalations', String(auditRows.filter((r) => String(r.action).includes('escalat')).length), 'warning', 'Operational', 'Overdue escalation is attributed to the automation.', 'audit_log'),
    ],
  };


  const attention: ControlAttentionItem[] = [
    ...critical.slice(0, 6).map((w) => ({
      id: `work-${w.id}`,
      title: w.title,
      detail: `${w.detail} · due ${w.dueDate ?? 'no deadline'} · ${w.priority}`,
      priority: 'urgent' as const,
      destination: w.actionView,
      source: 'work_item',
    })),
    ...approvals.slice(0, 5).map((a) => ({
      id: `approval-${a.key}`,
      title: `Approval required: ${a.entityId}`,
      detail: a.reason,
      priority: 'high' as const,
      destination: 'control_centre',
      source: 'automation_approval',
    })),
    ...automation
      .filter((h) => h.status === 'failed')
      .slice(0, 5)
      .map((h) => ({
        id: `automation-${h.id}`,
        title: `Automation failed: ${h.name}`,
        detail: h.lastRun?.error ?? 'The last run failed.',
        priority: 'urgent' as const,
        destination: 'control_centre',
        source: 'automation_run',
      })),
    ...overdue.slice(0, 5).map((w) => ({
      id: `overdue-${w.id}`,
      title: `Overdue: ${w.title}`,
      detail: `Due ${w.dueDate} · ${w.owner}`,
      priority: 'high' as const,
      destination: w.actionView,
      source: 'work_item',
    })),
    /* §Phase 2 — a blocked or under-review product needs a Mercenta decision. */
    ...commercialRows
      .filter((r) => r.route === 'blocked' || r.route === 'human_review')
      .slice(0, 5)
      .map((r) => ({
        id: `commercial-${r.recordId}`,
        title: `Commercial ${r.routeLabel.toLowerCase()}: ${r.product}`,
        detail:
          r.unmet[0]?.observed ??
          r.unevaluable[0]?.reason ??
          'A commercial condition needs a human decision.',
        priority: (r.route === 'blocked' ? 'urgent' : 'high') as 'urgent' | 'high',
        destination: 'control_centre',
        source: 'commercial_readiness',
      })),
  ];

  return {
    generatedFor: today,
    counts: {
      brands: demoBrands.length,
      activeBrands: brandsWithPos.size,
      openWork: work.length,
      criticalWork: critical.length,
      overdueWork: overdue.length,
      activeReminders: reminders.length,
      automationDeclared: automationTotals.declared,
      automationFailed: automationTotals.failed,
      approvalsPending: approvals.length,
      prospectsInPipeline: acquisition.total,
      intelligenceFindings: intelligence.total,
      auditEntries: auditRows.length,
      preAuditAssessments: preAudit.total,
      preAuditQualified: preAudit.qualified,
      preAuditFed: preAudit.fed,
      /** §Phase 2 — real counts over the canonical readiness records. */
      commercialAssessed: commercial.total,
      commercialReady: commercial.ready,
      commercialNeedsDecision: commercial.needsDecision,
    },
    metrics,
    attention,
    acquisition,
    acquisitionConversion,
    preAudit,
    commercial,
    intelligence,
    automation,
    automationSummary: automationTotals,
    approvals,
    dependencies,
    scheduler,
    ai,
    audit: auditRows.map((r) => ({
      id: r.id,
      at: String(r.createdAt),
      actor: r.actorId,
      action: r.action,
      reason: r.reason,
      destination: 'audit_log',
    })),
    dataSources: [
      { label: 'Work layer', value: 'src/lib/work/workStore.ts — derived from canonical records' },
      { label: 'Automation', value: 'src/lib/automation/registry.ts — the declared run ledger' },
      { label: 'Acquisition', value: 'src/lib/acquisition/acquisitionEngine.ts — canonical prospect store' },
      { label: 'Pre-audit', value: 'src/data/preAuditStore.ts + src/lib/preaudit/ukMarketFitEngine.ts — Explore UK Market Fit records' },
      { label: 'Commercial readiness', value: 'src/data/commercialReadinessStore.ts + src/lib/commercial/commercialGate.ts — the declared commercial gate over the canonical product records' },
      { label: 'Intelligence', value: 'src/lib/intelligence/intelligenceLayer.ts — canonical findings' },
      { label: 'AI', value: 'src/lib/ai/founderAiClient.ts — provider registry + free-model policy' },
      { label: 'Finance', value: 'src/lib/costs/costSummary.ts — canonical revenue streams' },
    ],
  };
}

