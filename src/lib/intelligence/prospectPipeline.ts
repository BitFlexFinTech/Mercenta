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
import type { BrandProspect, Lead, LeadRegion, OutreachStatus } from '@/types';

const LEAD_REGIONS: readonly LeadRegion[] = ['us', 'eu', 'uk', 'africa', 'canada'];

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

/* ── §Phase C — BI → ICP origin region derivation ───────────────────────── */

/**
 * SINGLE SOURCE for country → ICP origin region. Deterministic, evidence-based
 * mapping of a BI prospect's declared operating countries onto the ICP's brand
 * ORIGIN model. Keys are upper-case ISO-ish forms exactly as the BI seeds write
 * them. Countries outside this table have NO ICP region — never guessed.
 */
export const ICP_REGION_BY_COUNTRY: Readonly<Record<string, LeadRegion>> = {
  US: 'us', USA: 'us', 'UNITED STATES': 'us', 'UNITED STATES OF AMERICA': 'us',
  CA: 'canada', CANADA: 'canada',
  UK: 'uk', GB: 'uk', 'UNITED KINGDOM': 'uk', 'GREAT BRITAIN': 'uk', ENGLAND: 'uk',
  IE: 'eu', IRELAND: 'eu', DE: 'eu', GERMANY: 'eu', FR: 'eu', FRANCE: 'eu',
  NL: 'eu', NETHERLANDS: 'eu', BE: 'eu', BELGIUM: 'eu', ES: 'eu', SPAIN: 'eu',
  IT: 'eu', ITALY: 'eu', PT: 'eu', PORTUGAL: 'eu', PL: 'eu', POLAND: 'eu',
  SE: 'eu', SWEDEN: 'eu', DK: 'eu', DENMARK: 'eu', FI: 'eu', FINLAND: 'eu',
  AT: 'eu', AUSTRIA: 'eu', GR: 'eu', GREECE: 'eu', CZ: 'eu', 'CZECH REPUBLIC': 'eu',
  ZW: 'africa', ZIMBABWE: 'africa', ZA: 'africa', 'SOUTH AFRICA': 'africa',
  KE: 'africa', KENYA: 'africa', NG: 'africa', NIGERIA: 'africa',
  GH: 'africa', GHANA: 'africa', TZ: 'africa', TANZANIA: 'africa',
  UG: 'africa', UGANDA: 'africa', MA: 'africa', MOROCCO: 'africa',
  EG: 'africa', EGYPT: 'africa', ZM: 'africa', ZAMBIA: 'africa',
};

/** Lead → canonical outreach status mapping (pure, documented in the phase report). */
const LEAD_STAGE_BY_OUTREACH_STATUS: Readonly<Record<OutreachStatus, Lead['outreachStatus']>> = {
  uncontacted: 'Scraped',
  researching: 'Scraped',
  ready_to_contact: 'Sequenced',
  contacted: 'Email Sent',
  opened: 'Email Sent',
  replied: 'Replied',
  interested: 'Replied',
  negotiating: 'Replied',
  pilot: 'Replied',
  meeting_scheduled: 'Meeting Booked',
  won: 'Meeting Booked',
  // No Lead stage exists for a lost/nurture prospect; the closer of the two
  // existing terminal stages is used and the acquisition record keeps the truth.
  lost: 'Replied',
  nurture: 'Replied',
  disqualified: 'Scraped',
};

/** ICP pipeline stage for a canonical prospect's outreach status. */
export function leadStageForOutreachStatus(status: OutreachStatus): Lead['outreachStatus'] {
  return LEAD_STAGE_BY_OUTREACH_STATUS[status] ?? 'Scraped';
}

/** Reverse mapping used when the ICP list drives a canonical BI transition. */
export function outreachStatusForLeadStage(stage: Lead['outreachStatus']): OutreachStatus {
  switch (stage) {
    case 'Sequenced': return 'ready_to_contact';
    case 'Email Sent': return 'contacted';
    case 'Replied': return 'replied';
    case 'Meeting Booked': return 'meeting_scheduled';
    default: return 'uncontacted';
  }
}

/** Stable ICP lead id for a canonical prospect (deterministic across reloads). */
export function acquisitionLeadId(prospectId: string): string {
  return `lead-${prospectId}`;
}

/**
 * Derive the ICP brand-ORIGIN region from the BI record's own evidence:
 *  1. the FIRST declared `countries` entry that maps via ICP_REGION_BY_COUNTRY;
 *  2. otherwise, an explicit `ukPresence: true` flag → 'uk' (7 of the 10
 *     canonical brands declare UK presence and no country list);
 *  3. otherwise null — an unknown origin is NEVER invented.
 */
export function deriveIcpOriginRegion(prospect: BrandProspect): LeadRegion | null {
  for (const raw of prospect.countries ?? []) {
    const mapped = ICP_REGION_BY_COUNTRY[(raw ?? '').trim().toUpperCase()];
    if (mapped) return mapped;
  }
  if (prospect.ukPresence) return 'uk';
  return null;
}

/**
 * Build the ICP acquisition lead for a canonical prospect, preserving identity:
 * the same `prospect.id` becomes `Lead.prospectId` and the lead id is derived
 * deterministically from it. Returns null when no ICP origin region is derivable
 * (documented, never fabricated).
 */
export function buildAcquisitionLead(prospect: BrandProspect): Lead | null {
  const region = deriveIcpOriginRegion(prospect);
  if (!region) return null;
  const derived = deriveLeadFromProspect(prospect, region);
  if (!derived) return null;
  return {
    ...derived,
    id: acquisitionLeadId(prospect.id),
    outreachStatus: leadStageForOutreachStatus(prospect.outreachStatus),
  };
}