/**
 * §Phase A — Brand Intelligence → ICP canonical identity bridge.
 *
 * Brand Intelligence is the authoritative prospective-brand discovery source.
 * ICP is downstream targeting/execution. These functions are the ONLY allowed
 * path for identity to cross that boundary, so canonical identity and evidence
 * survive every stage:
 *
 *     BI prospect → ICP lead → targeting → outreach → opportunity → CRM
 *
 * Rules:
 * - Matching is deterministic on a normalised brand key (never fuzzy/guessed).
 * - Leads with no canonical BI counterpart stay unlinked (`prospectId` unset) —
 *   never fabricated.
 * - `deriveLeadFromProspect` requires the caller to supply an explicit ICP
 *   origin region; an unmappable/unknown origin returns `null` (never silently
 *   invents a region).
 *
 * Data-classification boundary: BI seed universes are SEEDED TEST FIXTURES
 * (brandProspectSeed + brandExtraSeed); this module only LINKS/CONVERTS — it
 * never fabricates prospects or market data.
 */
import type { BrandProspect, Lead } from '@/types';

const LEAD_REGIONS: readonly Lead['region'][] = ['us', 'eu', 'africa', 'canada'];

/** Deterministic brand key: lowercased, diacritics stripped, alphanumerics only. */
export function normalizeBrandKey(name: string): string {
  return (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

/** Exact canonical-prospect match for a lead, or null when no match exists. */
export function matchLeadToProspect(
  lead: Pick<Lead, 'company'>,
  prospects: readonly BrandProspect[]
): BrandProspect | null {
  const key = normalizeBrandKey(lead.company);
  if (!key) return null;
  return prospects.find((p) => normalizeBrandKey(p.brand) === key) ?? null;
}

/**
 * Link ingested leads to their canonical BI prospect. Supplementary fields are
 * filled from the canonical prospect ONLY when the ingested record left them
 * absent — explicit user-provided values are never overwritten.
 */
export function matchLeadsToProspects(
  leads: readonly Lead[],
  prospects: readonly BrandProspect[]
): Lead[] {
  return leads.map((lead) => {
    const prospect = matchLeadToProspect(lead, prospects);
    if (!prospect) return lead;
    const needsSegment =
      !lead.segment || lead.segment === '' || lead.segment === 'Uncategorized';
    return {
      ...lead,
      prospectId: prospect.id,
      segment: needsSegment ? prospect.category : lead.segment,
    };
  });
}

/**
 * Convert a canonical BI prospect into an ICP targeting lead.
 * `region` is the ICP's brand-ORIGIN classification and must be supplied by
 * the caller — the prospect's own origin semantics (countries/website) are not
 * (and cannot be) silently translated into the ICP region model. Returns null
 * for an invalid region so an unknown origin is never invented.
 */
export function deriveLeadFromProspect(
  prospect: BrandProspect,
  region: Lead['region']
): Lead | null {
  if (!LEAD_REGIONS.includes(region)) return null;
  const contact = prospect.contacts[0];
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const name = (s: string | undefined | null): string => (s ?? '').trim();
  return {
    id: `lead-${prospect.id}-${stamp}`,
    prospectId: prospect.id,
    persona: contact
      ? `${name(contact.name)}, ${name(contact.jobTitle)}`.replace(/,\s*$/, '')
      : 'Brand contact',
    company: prospect.brand,
    location: name((prospect.countries ?? []).join(', ')) || name(prospect.website),
    email: contact?.email ?? '',
    priority:
      prospect.score.tier === 'tier_1' || prospect.score.tier === 'tier_2'
        ? 'High'
        : 'Medium',
    outreachStatus: 'Scraped',
    segment: prospect.category,
    // fitScore is live-scored by the ICP engine (scoreLeadFit) at render time —
    // never stale-seeded here.
    fitScore: 0,
    region,
  };
}