/**
 * §Phase D2 — canonical BI intelligence access (read-by-reference).
 *
 * THE single way downstream layers (ICP → acquisition → outreach → CRM) read a
 * prospect's Brand Intelligence. Every function here resolves against the
 * canonical `prospectStore` and returns the SAME `BrandProspect` object the BI
 * layer holds — this module never copies the intelligence into a second record,
 * so nothing can drift out of sync with Brand Intelligence.
 *
 * What this fixes (the Phase C information loss the BI forensic audit recorded):
 * Phase C kept canonical identity but the acquisition path only carried a narrow
 * `Lead` projection plus a prose `evidenceSummary` string, so the ASIN-level
 * metrics, contacts, distributor/wholesale context, restrictions, growth signals,
 * evidence provenance, score factors and lifecycle history were not reachable
 * through any acquisition-layer contract. They now are — by reference.
 *
 * Rules enforced here:
 * - `getProspectIntelligence()` returns `null` for an unknown id. It never
 *   fabricates a prospect, a value, or a section.
 * - Empty sections are REPORTED as empty (count 0) — never dropped, never filled.
 * - `digest` holds counts + the exact score factors; the underlying values stay in
 *   `intelligence.prospect` so there is one source of truth.
 *
 * Snapshot semantics (documented, and asserted by the D2 gate):
 * - `intelligence.prospect` is the LIVE canonical object — the same reference the
 *   BI store currently holds. Transitions that update the prospect replace that
 *   object, so consumers must hold the `prospectId` (never the object) and
 *   re-read. The `*For*` accessors exist for exactly that.
 * - `digest` / `provenance` / `lifecycle` are a POINT-IN-TIME projection of the
 *   record taken at read time (they are cheap derived metadata, not live
 *   references). Re-read the view to refresh them.
 */
import type {
  BrandProspect,
  Lead,
  Opportunity,
  OutreachResponse,
  ProspectEvidence,
  ProspectIntelligence,
  ProspectIntelligenceDigest,
  ProspectIntelligenceProvenance,
  ProspectIntelligenceRef,
  ProspectIntelligenceSection,
  ProspectIntelligenceSectionKey,
  ProspectOutreachRecord,
} from '@/types';
import {
  getProspect,
  getProspectTimeline,
  getRuns,
  getSnapshots,
} from '@/data/prospectStore';

const SECTION_LABELS: Readonly<Record<ProspectIntelligenceSectionKey, string>> = {
  identity: 'Brand identity',
  market: 'Market / countries',
  asins: 'Amazon UK ASINs',
  contacts: 'Contacts',
  distributors: 'Distributors',
  wholesale: 'Wholesale programme',
  restrictions: 'Restrictions',
  growthSignals: 'Growth signals',
  evidence: 'Evidence / provenance',
  score: 'Score factors',
  lifecycle: 'Lifecycle',
};

/**
 * EVERY evidence item on the record, including the evidence nested inside the
 * ASIN / distributor / wholesale / restriction / growth-signal / contact
 * sections. Provenance is only complete if the nested observations count too.
 */
export function collectEvidence(p: BrandProspect): ProspectEvidence[] {
  return [
    ...p.evidence,
    ...p.asins.flatMap((a) => a.evidence),
    ...p.distributors.flatMap((d) => d.evidence),
    ...p.wholesale.evidence,
    ...p.restrictions.flatMap((r) => r.evidence),
    ...p.growthSignals.flatMap((g) => g.evidence),
    ...p.contacts.flatMap((c) => c.evidence),
  ];
}

/** Per-section populated state, computed from the record only (pure). */
export function intelligenceSections(p: BrandProspect): ProspectIntelligenceSection[] {
  const counts: Record<ProspectIntelligenceSectionKey, number> = {
    identity: p.brand && p.category ? 1 : 0,
    market:
      (p.countries?.length ?? 0) +
      (p.ukPresence ? 1 : 0) +
      (p.incumbentChallenged?.length ?? 0) +
      (p.whyInteresting ? 1 : 0) +
      (p.website ? 1 : 0),
    asins: p.asins.length,
    contacts: p.contacts.length,
    distributors: p.distributors.length,
    wholesale: [p.wholesale.wholesaleAvailable, p.wholesale.distributorProgramme, p.wholesale.retailerProgramme]
      .filter(Boolean).length,
    restrictions: p.restrictions.length,
    growthSignals: p.growthSignals.length,
    evidence: collectEvidence(p).length,
    score: p.score.tier === 'unscored' ? 0 : 7,
    lifecycle: [p.createdAt, p.lastResearched, p.lastChecked, p.nextCheck].filter(Boolean).length,
  };
  const populated: Record<ProspectIntelligenceSectionKey, boolean> = {
    identity: counts.identity > 0,
    market: counts.market > 0,
    asins: counts.asins > 0,
    contacts: counts.contacts > 0,
    distributors: counts.distributors > 0,
    wholesale: p.wholesale.wholesaleAvailable,
    restrictions: counts.restrictions > 0,
    growthSignals: counts.growthSignals > 0,
    evidence: counts.evidence > 0,
    score: counts.score > 0,
    lifecycle: counts.lifecycle > 0,
  };
  return (Object.keys(SECTION_LABELS) as ProspectIntelligenceSectionKey[]).map((key) => ({
    key,
    label: SECTION_LABELS[key],
    count: counts[key],
    populated: populated[key],
  }));
}

/** What BI actually holds — counts + the exact score factors (pure). */
export function intelligenceDigest(p: BrandProspect): ProspectIntelligenceDigest {
  return {
    asinCount: p.asins.length,
    contactCount: p.contacts.length,
    distributorCount: p.distributors.length,
    restrictionCount: p.restrictions.length,
    growthSignalCount: p.growthSignals.length,
    evidenceCount: collectEvidence(p).length,
    marketplaceSellerObserved: p.asins.some((a) => a.sellerCount > 0),
    wholesaleProgramme: p.wholesale.wholesaleAvailable,
    scoreFactors: {
      amazonDemand: p.score.amazonDemand,
      poPotential: p.score.poPotential,
      growth: p.score.growth,
      distributionOpenness: p.score.distributionOpenness,
      acceptanceProbability: p.score.acceptanceProbability,
      mercentaFit: p.score.mercentaFit,
      logisticsSuitability: p.score.logisticsSuitability,
    },
    scoreTotal: p.score.total,
    scoreTier: p.score.tier,
    scoreCalculatedAt: p.score.calculatedAt,
    sections: intelligenceSections(p),
  };
}

/**
 * Canonical BI provenance for the record — run ids, timeline event ids, snapshot
 * dates and the observed evidence sources/URLs. Store-backed (reads the canonical
 * BI history), never derived from a downstream copy.
 */
export function intelligenceProvenance(p: BrandProspect): ProspectIntelligenceProvenance {
  const evidence = collectEvidence(p);
  const grouped = new Map<string, number>();
  for (const e of evidence) grouped.set(e.source, (grouped.get(e.source) ?? 0) + 1);
  const sourceUrls = [...new Set(evidence.map((e) => e.sourceUrl).filter((u) => !!u))];
  return {
    prospectId: p.id,
    runIds: getRuns().filter((r) => r.changedProspectIds.includes(p.id)).map((r) => r.runId),
    changeEventIds: getProspectTimeline(p.id).map((c) => c.id),
    snapshotDates: getSnapshots().filter((s) => s.brandId === p.id).map((s) => s.snapshotDate),
    evidenceSources: [...grouped.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => (a.source < b.source ? -1 : 1)),
    evidenceSourceUrls: sourceUrls.sort(),
    asinSourceUrls: [...new Set(p.asins.map((a) => a.amazonUrl).filter((u) => !!u))].sort(),
  };
}

/**
 * Build the live acquisition-facing intelligence view for a canonical record.
 * Pure projection: `prospect` is passed through by reference (no cloning).
 */
export function buildProspectIntelligence(p: BrandProspect): ProspectIntelligence {
  return {
    prospectId: p.id,
    prospect: p,
    digest: intelligenceDigest(p),
    provenance: intelligenceProvenance(p),
    lifecycle: {
      outreachStatus: p.outreachStatus,
      disqualified: p.disqualified,
      disqualificationReason: p.disqualificationReason,
      createdAt: p.createdAt,
      lastResearched: p.lastResearched,
      lastChecked: p.lastChecked,
      nextCheck: p.nextCheck,
    },
  };
}

/**
 * THE canonical lookup: the BI intelligence for a canonical prospect id.
 * `null` for an unknown id — an unknown prospect is never fabricated.
 */
export function getProspectIntelligence(prospectId: string): ProspectIntelligence | null {
  const prospect = getProspect(prospectId);
  return prospect ? buildProspectIntelligence(prospect) : null;
}

/* ── Downstream accessors: any acquisition artefact can reach its BI record ── */

/** Intelligence for an ICP lead (by the canonical `lead.prospectId`). */
export function getIntelligenceForLead(lead: Pick<Lead, 'prospectId'>): ProspectIntelligence | null {
  return lead.prospectId ? getProspectIntelligence(lead.prospectId) : null;
}

/** Intelligence for an outreach revision (by its canonical `prospectId`). */
export function getIntelligenceForOutreach(
  record: Pick<ProspectOutreachRecord, 'prospectId'>
): ProspectIntelligence | null {
  return getProspectIntelligence(record.prospectId);
}

/** Intelligence for a brand response (by its canonical `prospectId`). */
export function getIntelligenceForResponse(
  response: Pick<OutreachResponse, 'prospectId'>
): ProspectIntelligence | null {
  return getProspectIntelligence(response.prospectId);
}

/** Intelligence for an opportunity (by its canonical `prospectId`). */
export function getIntelligenceForOpportunity(
  opportunity: Pick<Opportunity, 'prospectId'>
): ProspectIntelligence | null {
  return getProspectIntelligence(opportunity.prospectId);
}

/**
 * The traceability reference stored on an outreach revision. Ids + counts + the
 * score snapshot only — the intelligence stays in BI and is re-read by id.
 */
export function buildIntelligenceRef(p: BrandProspect, revision: number): ProspectIntelligenceRef {
  const d = intelligenceDigest(p);
  return {
    prospectId: p.id,
    capturedAt: new Date().toISOString(),
    revision,
    asinCount: d.asinCount,
    contactCount: d.contactCount,
    distributorCount: d.distributorCount,
    restrictionCount: d.restrictionCount,
    growthSignalCount: d.growthSignalCount,
    evidenceCount: d.evidenceCount,
    scoreTotal: d.scoreTotal,
    scoreTier: d.scoreTier,
    populatedSections: d.sections.filter((s) => s.populated).map((s) => s.key),
  };
}
