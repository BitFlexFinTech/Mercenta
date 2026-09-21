/**
 * §Founder OS — BRAND INTELLIGENCE / BI FINDINGS LAYER.
 *
 * The existing intelligence modules each do one job (prospect lifecycle, ICP
 * scoring, opportunity discovery, listing analysis, acquisition strategy). This
 * module is the READ MODEL over them: it turns canonical signals into
 * FINDINGS that the founder can act on, and it is the only place that declares
 * WHAT KIND OF EVIDENCE a finding rests on.
 *
 * THE FOUR BASES (never blurred, never promoted)
 * ---------------------------------------------
 *   canonical          — a fact read from a Mercenta record (score, ASIN,
 *                        restriction, PO, invoice, work item). The source of truth.
 *   simulated          — deterministic simulated data produced by a declared
 *                        simulation seam (labelled as such on the surface).
 *   external_research  — third-party research data (never claimed as Mercenta's
 *                        own fact, and never fabricated when no provider exists).
 *   ai_interpretation  — an AI explanation/summary. It NEVER becomes canonical
 *                        state and is always labelled.
 *
 * RULES
 * -----
 * - Nothing is invented. Every finding cites the canonical records it came from.
 * - A finding never creates a second work system: where the underlying record
 *   already has a canonical work item, the finding CITES that item id, so
 *   "signal → finding → work item → founder attention" runs through the ONE
 *   operating layer.
 * - Internal-only findings (scoring, tiering, prospect intelligence) are marked
 *   `internalOnly` and are stripped by `brandSafeFindings()`, so brand-facing BI
 *   can never leak Mercenta's proprietary scoring or acquisition pipeline.
 * - Category eligibility is enforced here too: a prospect whose category is not
 *   one of the ten approved Vendor Central categories is reported as a finding
 *   rather than silently analysed.
 */
import { APPROVED_CATEGORIES, isApprovedCategory } from '@/types';
import type { PaletteDomain } from '@/config/themes';
import { ensureProspectStore, getProspects } from '@/data/prospectStore';
import { getWorkItems } from '@/lib/work/workStore';
import { automationHealth } from '@/lib/automation/registry';
import { acquisitionPipeline } from '@/lib/acquisition/acquisitionEngine';

export type IntelligenceBasis = 'canonical' | 'simulated' | 'external_research' | 'ai_interpretation';

export const INTELLIGENCE_BASIS_LABELS: Record<IntelligenceBasis, string> = {
  canonical: 'Canonical Mercenta record',
  simulated: 'Simulated (declared simulation seam)',
  external_research: 'External research data',
  ai_interpretation: 'AI interpretation (never canonical)',
};

export type IntelligenceDomainId =
  | 'brand'
  | 'product'
  | 'marketplace'
  | 'competitor'
  | 'opportunity'
  | 'acquisition'
  | 'operational';

export interface IntelligenceDomainDefinition {
  id: IntelligenceDomainId;
  label: string;
  description: string;
  /** The EXISTING admin destination where this intelligence is acted on. */
  destination: string;
  domain: PaletteDomain;
}

export const INTELLIGENCE_DOMAINS: readonly IntelligenceDomainDefinition[] = [
  { id: 'brand', label: 'Brand intelligence', description: 'Who the brand is, how it scores against the ICP and why.', destination: 'brand_intelligence', domain: 'intelligence' },
  { id: 'product', label: 'Product intelligence', description: 'The products and channel listings behind the brand.', destination: 'brand_intelligence', domain: 'catalogue' },
  { id: 'marketplace', label: 'Marketplace intelligence', description: 'Channel presence, restrictions and wholesale access.', destination: 'brand_intelligence', domain: 'orders' },
  { id: 'competitor', label: 'Competitor intelligence', description: 'The incumbents a challenger brand is taking share from.', destination: 'brand_intelligence', domain: 'intelligence' },
  { id: 'opportunity', label: 'Opportunity intelligence', description: 'Where the commercial opportunity actually is.', destination: 'brand_intelligence', domain: 'finance' },
  { id: 'acquisition', label: 'Acquisition intelligence', description: 'Pipeline movement, follow-ups and conversion state.', destination: 'crm', domain: 'communications' },
  { id: 'operational', label: 'Operational intelligence', description: 'What the operating layer says is going wrong right now.', destination: 'work', domain: 'risk' },
] as const;

export type IntelligenceSeverity = 'critical' | 'important' | 'informational';

export interface IntelligenceFinding {
  /** Deterministic: `finding-<domain>-<key>`. */
  id: string;
  domain: IntelligenceDomainId;
  title: string;
  detail: string;
  basis: IntelligenceBasis;
  basisLabel: string;
  confidence: 'high' | 'medium' | 'low' | 'unverified';
  /** The canonical records this finding rests on (its citations). */
  sources: { type: string; id: string; label: string }[];
  /** The declared deterministic rule that raised it, when one applies. */
  rule?: { id: string; threshold: string; observed: string };
  severity: IntelligenceSeverity;
  /** True when the finding must never be shown to a brand tenant. */
  internalOnly: boolean;
  /** The canonical work item this finding is actioned through, when one exists. */
  relatedWorkItemId?: string;
}

/* ── Declared deterministic thresholds (single source of truth) ─────────────── */

export const INTELLIGENCE_THRESHOLDS = {
  /** Prospect research older than this is stale. */
  staleResearchDays: 30,
  /** amazonDemand is scored out of 25 — this is the declared "strong demand" bar. */
  highAmazonDemand: 18,
  /** poPotential is scored out of 20 — this is the declared "material PO potential" bar. */
  materialPoPotential: 12,
  /** Review counts below this are not treated as traction. */
  reviewTractionFloor: 50,
} as const;

/** A stable, deterministic finding id. */
function findingId(domain: IntelligenceDomainId, key: string): string {
  return `finding-${domain}-${key}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function workItemIdForEntity(entityId: string): string | undefined {
  return getWorkItems('admin', null, { includeResolved: true }).find((w) => w.entity.id === entityId)?.id;
}

const DAY_MS = 86_400_000;

function daysSince(iso: string, today: string): number {
  return Math.round((new Date(today).getTime() - new Date(iso).getTime()) / DAY_MS);
}

/** Internal findings share these defaults so no finding can forget its basis. */
function baseFinding(
  domain: IntelligenceDomainId,
  key: string,
  title: string,
  detail: string,
  severity: IntelligenceSeverity,
  sources: IntelligenceFinding['sources'],
  extra: Partial<IntelligenceFinding> = {}
): IntelligenceFinding {
  return {
    id: findingId(domain, key),
    domain,
    title,
    detail,
    basis: 'canonical',
    basisLabel: INTELLIGENCE_BASIS_LABELS.canonical,
    confidence: 'medium',
    sources,
    severity,
    internalOnly: true,
    ...extra,
  };
}

/* ── The finding set (deterministic, pure over canonical records) ──────────── */

export function intelligenceFindings(today = new Date().toISOString().slice(0, 10)): IntelligenceFinding[] {
  ensureProspectStore();
  const prospects = getProspects();
  const findings: IntelligenceFinding[] = [];

  for (const p of prospects) {
    const source = { type: 'prospect', id: p.id, label: p.brand };

    /* 1. Category eligibility — the ABSOLUTE LIMIT. A prospect outside the ten
          approved Vendor Central categories is reported, never silently analysed. */
    if (!isApprovedCategory(p.category)) {
      findings.push(
        baseFinding(
          'brand',
          `${p.id}-category`,
          `${p.brand} is outside the approved categories`,
          `Category "${p.category}" is not one of the ten approved Vendor Central categories, so this brand is not eligible for prospecting, evaluation, onboarding or upload.`,
          'critical',
          [source],
          {
            confidence: 'high',
            rule: { id: 'approved_category_gate', threshold: APPROVED_CATEGORIES.join(' · '), observed: p.category },
          }
        )
      );
    }

    /* 2. Disqualification is a fact, not a suggestion. */
    if (p.disqualified) {
      findings.push(
        baseFinding(
          'brand',
          `${p.id}-disqualified`,
          `${p.brand} is disqualified`,
          p.disqualificationReason ?? 'Disqualified by a recorded decision.',
          'informational',
          [source],
          { confidence: 'high' }
        )
      );
    }

    /* 3. Strong demand at a strong score — a canonical threshold, not an opinion. */
    if (!p.disqualified && p.score.amazonDemand >= INTELLIGENCE_THRESHOLDS.highAmazonDemand) {
      findings.push(
        baseFinding(
          'brand',
          `${p.id}-demand`,
          `${p.brand}: strong channel demand signal`,
          `Amazon demand dimension ${p.score.amazonDemand}/25 against the declared bar of ${INTELLIGENCE_THRESHOLDS.highAmazonDemand}; ICP total ${p.score.total}/100 (${p.score.tier.replace(/_/g, ' ')}).`,
          'informational',
          [source],
          {
            rule: {
              id: 'high_amazon_demand',
              threshold: `>= ${INTELLIGENCE_THRESHOLDS.highAmazonDemand}/25`,
              observed: `${p.score.amazonDemand}/25`,
            },
          }
        )
      );
    }

    /* 4. Stale research — the prospect store's own dates, nothing invented. */
    const age = daysSince(p.lastResearched, today);
    if (age > INTELLIGENCE_THRESHOLDS.staleResearchDays && !p.disqualified) {
      findings.push(
        baseFinding(
          'brand',
          `${p.id}-stale`,
          `${p.brand}: research is stale`,
          `Last researched ${p.lastResearched} (${age} days ago), past the declared ${INTELLIGENCE_THRESHOLDS.staleResearchDays}-day freshness bar.`,
          'informational',
          [source],
          {
            confidence: 'high',
            rule: { id: 'stale_research', threshold: `<= ${INTELLIGENCE_THRESHOLDS.staleResearchDays} days`, observed: `${age} days` },
            relatedWorkItemId: workItemIdForEntity(p.id),
          }
        )
      );
    }

    /* 5. Product intelligence — ASIN traction from the canonical ASIN records. */
    const tracked = p.asins.filter((a) => (a.reviewCount ?? 0) >= INTELLIGENCE_THRESHOLDS.reviewTractionFloor);
    if (tracked.length > 0) {
      findings.push(
        baseFinding(
          'product',
          `${p.id}-asins`,
          `${p.brand}: ${tracked.length} listing(s) with traction`,
          tracked
            .slice(0, 3)
            .map((a) => `${a.asin} — ${a.reviewCount} reviews${a.bsr ? `, BSR ${a.bsr}` : ''}`)
            .join(' · '),
          'informational',
          tracked.slice(0, 5).map((a) => ({ type: 'asin', id: a.asin, label: `${p.brand} · ${a.asin}` })),
          {
            rule: {
              id: 'review_traction',
              threshold: `>= ${INTELLIGENCE_THRESHOLDS.reviewTractionFloor} reviews`,
              observed: `${tracked.length} listing(s)`,
            },
          }
        )
      );
    }

    /* 6. Marketplace restrictions — a hard blocker if a channel prohibits the brand. */
    p.restrictions.forEach((restriction, index) => {
      findings.push(
        baseFinding(
          'marketplace',
          `${p.id}-restriction-${index}`,
          `${p.brand}: channel restriction`,
          `${restriction.description}${restriction.restrictionText ? ` — "${restriction.restrictionText}"` : ''}`,
          restriction.severity === 'hard' ? 'important' : 'informational',
          [{ type: 'restriction', id: `${p.id}-restriction-${index}`, label: `${p.brand} restriction` }, source],
          { confidence: restriction.severity === 'hard' ? 'high' : 'medium' }
        )
      );
    });

    /* 7. Wholesale / trade access — decides whether outreach is even viable. */
    if (!p.wholesale.wholesaleAvailable && !p.wholesale.distributorProgramme && !p.wholesale.retailerProgramme) {
      findings.push(
        baseFinding(
          'marketplace',
          `${p.id}-no-wholesale`,
          `${p.brand}: no trade route recorded`,
          'No wholesale, distributor or retailer programme is recorded, so there is no established trade route to approach through.',
          'informational',
          [source]
        )
      );
    }

    /* 8. Competitor intelligence — the incumbents a challenger is taking share from. */
    if (p.incumbentChallenged && p.incumbentChallenged.length > 0) {
      findings.push(
        baseFinding(
          'competitor',
          `${p.id}-incumbents`,
          `${p.brand}: challenges ${p.incumbentChallenged.join(', ')}`,
          p.whyInteresting ?? 'Recorded as a challenger brand taking share from established incumbents.',
          'informational',
          [source]
        )
      );
    }

    /* 9. Opportunity intelligence — material PO potential is a declared threshold. */
    if (!p.disqualified && p.score.poPotential >= INTELLIGENCE_THRESHOLDS.materialPoPotential) {
      findings.push(
        baseFinding(
          'opportunity',
          `${p.id}-po-potential`,
          `${p.brand}: material PO potential`,
          `PO-potential dimension ${p.score.poPotential}/20 against the declared bar of ${INTELLIGENCE_THRESHOLDS.materialPoPotential}. This is an ESTIMATE from the canonical scoring model — not a guaranteed or committed order.`,
          'informational',
          [source],
          {
            rule: {
              id: 'material_po_potential',
              threshold: `>= ${INTELLIGENCE_THRESHOLDS.materialPoPotential}/20`,
              observed: `${p.score.poPotential}/20`,
            },
          }
        )
      );
    }
  }


  /* 10. Acquisition intelligence — straight from the canonical pipeline model. */
  const pipeline = acquisitionPipeline();
  if (pipeline.followUpsOverdue > 0) {
    findings.push(
      baseFinding(
        'acquisition',
        'follow-ups-overdue',
        `${pipeline.followUpsOverdue} follow-up(s) overdue`,
        'Prospects contacted with no reply past the declared follow-up cadence.',
        'important',
        pipeline.records
          .filter((r) => r.followUpState === 'overdue')
          .slice(0, 5)
          .map((r) => ({ type: 'prospect', id: r.prospectId, label: r.brand })),
        {
          confidence: 'high',
          rule: { id: 'follow_up_cadence', threshold: 'due date passed', observed: `${pipeline.followUpsOverdue} overdue` },
        }
      )
    );
  }
  if (pipeline.awaitingApproval > 0) {
    findings.push(
      baseFinding(
        'acquisition',
        'awaiting-approval',
        `${pipeline.awaitingApproval} outreach recommendation(s) awaiting approval`,
        'Nothing is sent until the founder approves the recommendation.',
        'important',
        pipeline.records
          .filter((r) => r.outreachApproval === 'pending_approval')
          .slice(0, 5)
          .map((r) => ({ type: 'prospect', id: r.prospectId, label: r.brand })),
        { confidence: 'high' }
      )
    );
  }
  if (pipeline.duplicates.length > 0) {
    findings.push(
      baseFinding(
        'acquisition',
        'duplicates',
        `${pipeline.duplicates.length} duplicate prospect identity(ies)`,
        pipeline.duplicates.map((d) => d.brands.join(' / ')).join(' · '),
        'important',
        pipeline.duplicates.flatMap((d) =>
          d.prospectIds.map((id) => ({ type: 'prospect', id, label: d.brands.join(' / ') }))
        ),
        { confidence: 'high' }
      )
    );
  }

  /* 11. Operational intelligence — the work layer + the automation registry. */
  const overdue = getWorkItems('admin', null).filter((w) => w.dueDate !== null && w.dueDate < today);
  if (overdue.length > 0) {
    findings.push(
      baseFinding(
        'operational',
        'overdue-work',
        `${overdue.length} work item(s) past deadline`,
        overdue
          .slice(0, 5)
          .map((w) => `${w.title} (due ${w.dueDate})`)
          .join(' · '),
        'critical',
        overdue.slice(0, 8).map((w) => ({ type: 'work_item', id: w.id, label: w.title })),
        { confidence: 'high', relatedWorkItemId: overdue[0]?.id }
      )
    );
  }
  for (const health of automationHealth()) {
    if (health.status === 'failed') {
      findings.push(
        baseFinding(
          'operational',
          `automation-${health.id}`,
          `Automation failed: ${health.name}`,
          health.lastRun?.error ?? 'The last run failed — it is retryable from the Control Centre.',
          'important',
          [{ type: 'automation', id: health.id, label: health.name }],
          { confidence: 'high' }
        )
      );
    }
  }

  const rank: Record<IntelligenceSeverity, number> = { critical: 0, important: 1, informational: 2 };
  return findings.sort(
    (a, b) => rank[a.severity] - rank[b.severity] || a.domain.localeCompare(b.domain) || a.id.localeCompare(b.id)
  );
}

export function findingsForDomain(domain: IntelligenceDomainId): IntelligenceFinding[] {
  return intelligenceFindings().filter((f) => f.domain === domain);
}

export interface IntelligenceSummary {
  total: number;
  byDomain: { id: IntelligenceDomainId; label: string; count: number; critical: number; important: number }[];
  byBasis: Record<IntelligenceBasis, number>;
  critical: number;
  important: number;
  actionable: number;
}

export function intelligenceSummary(): IntelligenceSummary {
  const findings = intelligenceFindings();
  const byBasis: Record<IntelligenceBasis, number> = {
    canonical: 0,
    simulated: 0,
    external_research: 0,
    ai_interpretation: 0,
  };
  for (const f of findings) byBasis[f.basis] += 1;
  return {
    total: findings.length,
    byDomain: INTELLIGENCE_DOMAINS.map((d) => {
      const rows = findings.filter((f) => f.domain === d.id);
      return {
        id: d.id,
        label: d.label,
        count: rows.length,
        critical: rows.filter((f) => f.severity === 'critical').length,
        important: rows.filter((f) => f.severity === 'important').length,
      };
    }),
    byBasis,
    critical: findings.filter((f) => f.severity === 'critical').length,
    important: findings.filter((f) => f.severity === 'important').length,
    actionable: findings.filter((f) => f.severity !== 'informational').length,
  };
}

/**
 * Tenant-safe projection for a BRAND-facing surface: internal-only findings
 * (Mercenta scoring, tiering, prospect/acquisition intelligence) are removed.
 * A brand can never see another tenant's intelligence or Mercenta's internal
 * scoring — this is the ONE place that strips it.
 */
export function brandSafeFindings(findings: IntelligenceFinding[] = intelligenceFindings()): IntelligenceFinding[] {
  return findings.filter((f) => !f.internalOnly);
}

