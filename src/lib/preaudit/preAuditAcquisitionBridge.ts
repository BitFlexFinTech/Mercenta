/**
 * §PHASE 1 — PRE-AUDIT → ACQUISITION BRIDGE.
 *
 * The pre-audit must FEED the acquisition engine, not replace it. This module is
 * the only place that crosses from the assessment into the canonical acquisition
 * world, and it does so by writing into the records that already exist:
 *
 *   assessment (qualified)  →  canonical BI prospect (`prospectStore`)
 *                           →  canonical AcquisitionEvent timeline
 *                           →  the eleven-stage lifecycle in
 *                              `src/lib/acquisition/acquisitionEngine.ts`
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * -------------------------------
 * - It does NOT create a second acquisition pipeline, a second prospect
 *   universe, or a second CRM. The prospect it writes is the SAME
 *   `BrandProspect` the Brand Intelligence surface already reads.
 * - It does NOT create a brand tenant. `createdBrandTenant` is typed as the
 *   literal `false`: converting a prospect into a tenant remains the exclusive
 *   job of the canonical onboarding lifecycle, and this bridge cannot do it.
 * - It does NOT silently promote. An assessment that is not `qualified` is
 *   REFUSED with the reason, and nothing is written.
 * - It does NOT invent a score. The prospect is scored by the ONE canonical
 *   scoring client (`createBrandIntelligenceClient().scoreProspect`), so a
 *   pre-audit prospect is scored exactly like every seeded prospect.
 * - It does NOT duplicate. Deduplication uses the SAME canonical identity key
 *   the BI → ICP handoff uses (`normalizeBrandKey`), so a duplicate can never be
 *   detected by one rule and missed by another.
 */
import type { AcquisitionEvent, BrandProspect, PreAuditAcquisitionFeed } from '@/types';
import { getProspect, getProspects, addProspect, updateProspect, ensureProspectStore } from '@/data/prospectStore';
import { recordAcquisitionEvent, recordAcquisitionAudit } from '@/data/acquisitionStore';
import { markAssessmentFed, getPreAuditAssessment } from '@/data/preAuditStore';
import { createBrandIntelligenceClient } from '@/lib/intelligence/brandIntelligenceClient';
import { normalizeBrandKey } from '@/lib/intelligence/prospectPipeline';
import { acquisitionRecords } from '@/lib/acquisition/acquisitionEngine';
import { demoToday } from '@/lib/work/workStore';
import { PRE_AUDIT_FEEDS_ACQUISITION_STATES } from '@/config/ukMarketFit';

const client = createBrandIntelligenceClient();

/** The canonical prospect id for a brand key. Deterministic, never time-derived. */
export function prospectIdForBrandKey(brandKey: string): string {
  return `prospect-preaudit-${brandKey}`;
}

/** The canonical acquisition stage a prospect currently sits in, if it is known. */
export function acquisitionStageForProspect(prospectId: string): string | null {
  return acquisitionRecords().find((r) => r.prospectId === prospectId)?.stage ?? null;
}

/** The canonical prospect that already represents this brand, if one exists. */
export function existingProspectForBrandKey(brandKey: string): BrandProspect | undefined {
  ensureProspectStore();
  return getProspects().find((p) => normalizeBrandKey(p.brand) === brandKey);
}

/**
 * Build the canonical `BrandProspect` a pre-audit produces. The shape is
 * deliberately the SAME one the seeded universe uses; every field the assessment
 * genuinely observed is carried, and nothing is fabricated:
 *
 *  - `category` comes from the assessment input (already gate-checked upstream),
 *  - `asins` carries NO ASIN, because a pre-audit does not establish a UK ASIN,
 *  - `wholesale` is left to the scoring client's declared empty record, because
 *    no wholesale programme was confirmed,
 *  - `evidence` carries the assessment's own evidence, classified and based,
 *  - the score is computed by the canonical scoring client, never invented.
 */
export function buildProspectFromAssessment(
  assessmentId: string,
  brandKey: string,
  evidenceSummary: string
): BrandProspect {
  const assessment = getPreAuditAssessment(assessmentId);
  if (!assessment) throw new Error(`No pre-audit assessment ${assessmentId}`);
  const input = assessment.input;
  const presence = assessment.snapshot?.presence;

  return client.scoreProspect({
    id: prospectIdForBrandKey(brandKey),
    brand: input.brandName,
    category: input.category,
    website: input.website,
    countries: [input.country],
    ukPresence: presence === 'A' || presence === 'B' || presence === 'C' || presence === 'D',
    whyInteresting: evidenceSummary,
    asins: [],
    distributors: [],
    restrictions: [],
    growthSignals: [],
    contacts: input.contactEmail
      ? [
          {
            name: input.contactName ?? 'Brand contact',
            jobTitle: 'Brand contact (supplied during the assessment)',
            company: input.brandName,
            country: input.country,
            email: input.contactEmail,
            emailConfidence: 'unverified' as const,
            phoneConfidence: 'unverified' as const,
            source: 'Supplied in the Explore UK Market Fit assessment',
            lastVerified: demoToday(),
            evidence: [],
          },
        ]
      : [],
    evidence: (assessment.snapshot?.dimensions ?? []).flatMap((d) =>
      d.evidence.map((e) => ({
        field: e.field,
        value: e.value,
        source: e.source,
        sourceUrl: e.sourceUrl,
        dateObserved: e.observedAt,
        confidence: e.confidence,
        classification: e.classification,
        notes: `basis: ${e.basis}${e.note ? ` · ${e.note}` : ''}`,
      }))
    ),
    createdAt: demoToday(),
    owner: 'staff:mercenta-ops',
    notes: `Created by the Explore UK Market Fit pre-audit (${assessmentId}). A prospect is NOT a brand: no tenant exists until a canonical onboarding completes.`,
  });
}


/**
 * Feed a qualified assessment into the canonical acquisition pipeline.
 *
 * Returns an explicit outcome — never a silent success. A refusal writes
 * nothing at all.
 */
export function feedAssessmentToAcquisition(
  assessmentId: string,
  actorStaffId: string
): PreAuditAcquisitionFeed {
  const refuse = (reason: string): PreAuditAcquisitionFeed => ({
    ok: false,
    reason,
    assessmentId,
    prospectId: null,
    created: false,
    stage: null,
    createdBrandTenant: false,
  });

  const assessment = getPreAuditAssessment(assessmentId);
  if (!assessment) return refuse(`No pre-audit assessment exists with id ${assessmentId}.`);
  if (!assessment.snapshot) {
    return refuse('The assessment has no result yet, so there is nothing to feed into acquisition.');
  }
  if (!PRE_AUDIT_FEEDS_ACQUISITION_STATES.includes(assessment.snapshot.qualification)) {
    return refuse(
      `Only a qualified assessment may enter the acquisition pipeline. This one is "${assessment.snapshot.qualificationLabel}", so nothing was written.`
    );
  }

  const brandKey = normalizeBrandKey(assessment.input.brandName);
  const evidenceSummary = `${assessment.snapshot.headline} Presence ${assessment.snapshot.presenceLabel}. Evidence basis: ${assessment.snapshot.researchMode}. Open questions: ${assessment.snapshot.openQuestions.length}.`;

  const existing = existingProspectForBrandKey(brandKey);
  let prospect: BrandProspect;
  let created: boolean;

  if (existing) {
    // Reuse the canonical prospect. Merge ONLY what the assessment established;
    // never overwrite a field a human or the BI lifecycle already set.
    const fromAssessment = buildProspectFromAssessment(assessmentId, brandKey, evidenceSummary);
    prospect = client.scoreProspect({
      ...existing,
      whyInteresting: existing.whyInteresting ?? evidenceSummary,
      website: existing.website ?? assessment.input.website,
      evidence: [...existing.evidence, ...fromAssessment.evidence],
    });
    updateProspect(prospect);
    created = false;
  } else {
    prospect = buildProspectFromAssessment(assessmentId, brandKey, evidenceSummary);
    addProspect(prospect);
    created = true;
  }

  const event: AcquisitionEvent = {
    id: `acq-evt-preaudit-${assessmentId}`,
    prospectId: prospect.id,
    brand: prospect.brand,
    type: 'opportunity_created',
    at: demoToday(),
    actor: actorStaffId,
    summary: created
      ? 'Canonical prospect created from the Explore UK Market Fit pre-audit.'
      : 'Existing canonical prospect enriched from the Explore UK Market Fit pre-audit.',
    detail: `Assessment ${assessmentId} · ${assessment.snapshot.qualificationLabel} · presence ${assessment.snapshot.presenceLabel}. A prospect is NOT a brand — no tenant was created.`,
  };
  recordAcquisitionEvent(event);
  recordAcquisitionAudit(
    'pre_audit_fed_to_acquisition',
    prospect.id,
    `Assessment ${assessmentId} fed into the canonical acquisition pipeline (${created ? 'new prospect' : 'existing prospect'}). No brand tenant was created.`,
    actorStaffId
  );
  markAssessmentFed(assessmentId, prospect.id, actorStaffId);

  return {
    ok: true,
    reason: created
      ? 'A new canonical prospect was created in the acquisition pipeline. It is not a brand tenant.'
      : 'The existing canonical prospect was enriched and remains in the acquisition pipeline. It is not a brand tenant.',
    assessmentId,
    prospectId: prospect.id,
    created,
    stage: acquisitionStageForProspect(prospect.id),
    createdBrandTenant: false,
  };
}

/** Read-back helper for the founder surface: the prospect an assessment produced. */
export function prospectForAssessment(assessmentId: string): BrandProspect | undefined {
  const assessment = getPreAuditAssessment(assessmentId);
  if (!assessment?.fedProspectId) return undefined;
  return getProspect(assessment.fedProspectId);
}

