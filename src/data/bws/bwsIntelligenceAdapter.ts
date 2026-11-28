/**
 * §BWS INTELLIGENCE — THE FIELD MAPPING, IN CODE (approved 2026-11-28).
 *
 * SOURCE: `src/data/bws/**` (Dash-1). Nothing here invents a value. Where the source has no
 * field, the row says so and the view renders an em dash (—) with the reason — per D6, no
 * number is computed, estimated or defaulted to fill a gap.
 *
 * Mapping table: `docs/BWS_INTELLIGENCE_FIELD_MAPPING.md`.
 */
import type { BwsDemoModule } from '@/data/verticalData';
import type { MetricItem } from '@/next/components/ConsolePrimitives';
import type {
  BwsCountrySummaryRow,
  BwsOutreachLogRow,
  BwsProspectRow,
} from '@/next/screens/bws/BwsIntelligenceView';

export interface BwsIntelligenceModel {
  countryRows: BwsCountrySummaryRow[];
  prospects: BwsProspectRow[];
  metrics: MetricItem[];
}

/** A blank source string is reported as “—”, never silently swapped for a plausible value. */
function text(value: string | null | undefined): string {
  const v = typeof value === 'string' ? value.trim() : '';
  return v === '' ? '—' : v;
}

function outreachOf(raw: unknown): BwsOutreachLogRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const s = (k: string) => (typeof r[k] === 'string' ? (r[k] as string).trim() : '');
  if (!s('outreachStatus') && !s('contactPerson')) return null;
  return {
    outreachStatus: text(s('outreachStatus')),
    contactPerson: text(s('contactPerson')),
    contactRole: text(s('contactRole')),
    contactEmail: text(s('contactEmail')),
    lastContacted: text(s('lastContacted')),
    nextFollowUp: text(s('nextFollowUp')),
    discussionNotes: text(s('discussionNotes')),
  };
}

export function buildBwsIntelligence(d: BwsDemoModule): BwsIntelligenceModel {
  const listingsByBrand = new Map<string, number>();
  for (const listing of d.AMAZON_UK_LISTINGS) {
    if (!listing.brandId) continue;
    listingsByBrand.set(listing.brandId, (listingsByBrand.get(listing.brandId) ?? 0) + 1);
  }

  /** D9 — the stage is read from OPPORTUNITY_ASSESSMENTS.status, never from a CORE store. */
  const assessmentByBrand = new Map<string, string>();
  for (const a of d.OPPORTUNITY_ASSESSMENTS) {
    if (a.brandId && a.status) assessmentByBrand.set(a.brandId, a.status);
  }

  const countryById = new Map<string, (typeof d.COUNTRIES)[number]>();
  const countryByName = new Map<string, (typeof d.COUNTRIES)[number]>();
  for (const c of d.COUNTRIES) {
    countryById.set(c.id, c);
    countryByName.set(c.name, c);
  }

  const countryRows: BwsCountrySummaryRow[] = d.COUNTRIES.map((c) => ({
    regionKey: c.id,
    label: c.name,
    brandCount: c.brandsDiscoveredCount,
    categories: c.categories,
    ukPresenceIndicator: text(c.ukPresenceIndicator),
    commercialOpportunityIndicator: text(c.commercialOpportunityIndicator),
    featuredProducerCount: c.featuredProducers.length,
    evidenceCount: c.evidenceIds.length,
  }));

  const prospects: BwsProspectRow[] = d.BRANDS.map((b) => {
    const country =
      (b.countryId ? countryById.get(b.countryId) : undefined) ??
      (b.countryName ? countryByName.get(b.countryName) : undefined);
    const outreachRaw = b.id
      ? (d.INITIAL_OUTREACH_LOGS as Record<string, unknown>)[b.id]
      : undefined;
    return {
      id: b.id,
      brand: b.name,
      category: b.primaryCategory,
      website: b.website || undefined,
      description: text(b.description),
      ownershipVerification: text(b.ownershipVerification),
      licensingArrangement: text(b.licensingArrangement),
      ukPresenceIndicator: text(country?.ukPresenceIndicator ?? b.ukPresenceStatus),
      commercialOpportunityIndicator: text(country?.commercialOpportunityIndicator),
      asinCount: listingsByBrand.get(b.id) ?? 0,
      outreach: outreachOf(outreachRaw),
      opportunityStatus: assessmentByBrand.get(b.id) ?? null,
    };
  });

  const metrics: MetricItem[] = [
    { id: 'bws-brands', label: 'Brands', value: String(prospects.length) },
    { id: 'bws-regions', label: 'Origin regions', value: String(countryRows.length) },
    { id: 'bws-outreach', label: 'With outreach log', value: String(prospects.filter((p) => p.outreach).length) },
    { id: 'bws-assessment', label: 'With assessment', value: String(prospects.filter((p) => p.opportunityStatus).length) },
  ];

  return { countryRows, prospects, metrics };
}