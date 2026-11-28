/**
 * §TALENT WORKSPACE — THE FIELD MAPPING, IN CODE (approved 2026-11-28).
 *
 * SOURCE: `src/data/talent/**` (CAA-TalAg), read not guessed. Nothing here invents a value.
 *
 *   · rightsHolder ← `INITIAL_RELATIONSHIPS` (relationship) + `INITIAL_BRANDS` (brand)
 *     + `INITIAL_TALENTS` (roleSummary). `rightsBadge` is the relationship type and the
 *     UK-rights confirmation, combined READ-ONLY. Phone is "—": the dataset has no phone.
 *   · readiness ← `INITIAL_DISCOVERED_PRODUCTS`; ready = `verification.unknownFields` empty;
 *     image present = the single `image` field is set (there is no image COUNT in the source).
 *   · prospect ← `INITIAL_BRANDS`: `ukWholesaleRouteStatus` + the source's own confidence.
 *   · ukOpportunity ← `INITIAL_UK_ASSESSMENTS` joined to `INITIAL_BRANDS`.
 *
 * Removed (no source, and never fabricated): poValueGbp, commission rows, totalScore,
 * tierLabel, listeningScore, submissionStatus, imageCount, outreach/stage write flags.
 */
import type { TalentDemoModule } from '@/data/verticalData';
import type { SemanticTone } from '@/next/components/ConsolePrimitives';
import type {
  TalentProductReadinessRow,
  TalentProspectRow,
  TalentRightsHolderRow,
  TalentUkOpportunityRow,
  TalentWorkspaceProfile,
} from '@/next/screens/talent/TalentWorkspaceView';
import type { ApprovalVerificationRow } from '@/next/screens/talent/TalentApprovalsView';

function rightsTone(status: string): SemanticTone {
  if (/confirmed$/i.test(status) && !/unconfirmed/i.test(status)) return 'success';
  if (/unconfirmed/i.test(status)) return 'warning';
  return 'neutral';
}

const text = (v: string | undefined | null): string => (v && v.trim() ? v.trim() : '—');

export function buildTalentWorkspace(d: TalentDemoModule) {
  const brandById = new Map(d.INITIAL_BRANDS.map((b) => [b.id, b]));
  const talentById = new Map(d.INITIAL_TALENTS.map((t) => [t.id, t]));

  const productCountByBrand = new Map<string, number>();
  for (const p of d.INITIAL_DISCOVERED_PRODUCTS) {
    productCountByBrand.set(p.brandId, (productCountByBrand.get(p.brandId) ?? 0) + 1);
  }

  const rightsHolders: TalentRightsHolderRow[] = d.INITIAL_RELATIONSHIPS.map((r) => {
    const brand = brandById.get(r.brandId);
    const talent = talentById.get(r.talentId);
    return {
      id: r.id,
      businessName: text(brand?.name),
      category: text(brand?.category),
      nation: text(brand?.originCountry),
      trackLabel: text(talent?.roleSummary),
      rightsBadge: `${text(r.relationshipType)} · UK rights ${text(r.ukDistributionRightsConfirmed)}`,
      rightsTone: rightsTone(r.ukDistributionRightsConfirmed ?? ''),
      contactPhone: '—',
      productCount: productCountByBrand.get(r.brandId) ?? 0,
    };
  });

  const productReadiness: TalentProductReadinessRow[] = d.INITIAL_DISCOVERED_PRODUCTS.map((p) => {
    const unresolved = p.verification?.unknownFields ?? [];
    return {
      id: p.id,
      brandName: text(brandById.get(p.brandId)?.name),
      sku: text(p.skuOrRef ?? ''),
      name: text(p.title),
      ready: unresolved.length === 0,
      unknownFieldCount: unresolved.length,
      imagePresent: Boolean(p.image),
    };
  });

  const prospects: TalentProspectRow[] = d.INITIAL_BRANDS.map((b) => ({
    id: b.id,
    brand: text(b.name),
    category: text(b.category),
    ukRoute: text(b.ukWholesaleRouteStatus),
    verification: `${text(b.verification?.confidence)} · checked ${text(b.verification?.dateChecked)}`,
    description: text(b.description),
  }));

  const ukOpportunities: TalentUkOpportunityRow[] = d.INITIAL_UK_ASSESSMENTS.map((a) => ({
    id: a.id,
    brand: text(brandById.get(a.brandId)?.name),
    opportunityType: text(a.opportunityType),
    amazonUkPresence: text(a.amazonUkPresence),
    ukDtcPresence: text(a.ukDtcPresence),
    distributorPresent: Boolean(a.existingDistributorDetected),
    gapSummary: text(a.estimatedGapSummary),
  }));

  const first = d.INITIAL_TALENTS[0];
  const profile: TalentWorkspaceProfile | null = first
    ? {
        name: text(first.name),
        vertical: text(first.vertical),
        primaryMarket: text(first.primaryMarket),
        caaStatus: text(first.caaStatus),
        discoveryStatus: text(first.discoveryStatus),
        roleSummary: text(first.roleSummary),
        portfolioSummary: text(first.portfolioSummary),
      }
    : null;

  const metrics = [
    { id: 'talent-brands', label: 'Brands', value: String(d.INITIAL_BRANDS.length) },
    { id: 'talent-products', label: 'Products', value: String(d.INITIAL_DISCOVERED_PRODUCTS.length) },
    { id: 'talent-relationships', label: 'Relationships', value: String(d.INITIAL_RELATIONSHIPS.length) },
    { id: 'talent-assessments', label: 'UK assessments', value: String(d.INITIAL_UK_ASSESSMENTS.length) },
  ];

  return { profile, rightsHolders, productReadiness, prospects, ukOpportunities, metrics };
}

/**
 * §TALENT APPROVALS — the read-only verification stamps (approved 2026-11-28).
 *
 * Only records that genuinely carry a `SourceVerificationStamp` are listed: every brand and
 * every discovered product. No submission, listing recommendation, compliance document or
 * purchase-order draft exists in this dataset, so none is invented.
 */
export function buildTalentApprovals(d: TalentDemoModule) {
  const tone = (tier: string): SemanticTone => {
    if (/primary|verified|high/i.test(tier)) return 'success';
    if (/secondary|medium|partial/i.test(tier)) return 'warning';
    return 'neutral';
  };

  const stamps: ApprovalVerificationRow[] = [
    ...d.INITIAL_BRANDS.map((b) => ({
      id: `brand-${b.id}`,
      subject: text(b.name),
      subjectKind: 'Brand' as const,
      tier: text(b.verification?.verificationTier),
      tierTone: tone(b.verification?.verificationTier ?? ''),
      confidence: text(b.verification?.confidence),
      unknownFieldCount: (b.verification?.unknownFields ?? []).length,
      dateChecked: text(b.verification?.dateChecked),
      evidenceSummary: text(b.verification?.evidenceSummary),
    })),
    ...d.INITIAL_DISCOVERED_PRODUCTS.map((p) => ({
      id: `product-${p.id}`,
      subject: text(p.title),
      subjectKind: 'Product' as const,
      tier: text(p.verification?.verificationTier),
      tierTone: tone(p.verification?.verificationTier ?? ''),
      confidence: text(p.verification?.confidence),
      unknownFieldCount: (p.verification?.unknownFields ?? []).length,
      dateChecked: text(p.verification?.dateChecked),
      evidenceSummary: text(p.verification?.evidenceSummary),
    })),
  ];

  const allStamps = [...d.INITIAL_BRANDS, ...d.INITIAL_DISCOVERED_PRODUCTS];
  const metrics = [
    { id: 'appr-brands', label: 'Brands', value: String(d.INITIAL_BRANDS.length) },
    { id: 'appr-products', label: 'Products', value: String(d.INITIAL_DISCOVERED_PRODUCTS.length) },
    { id: 'appr-relationships', label: 'Relationships', value: String(d.INITIAL_RELATIONSHIPS.length) },
    { id: 'appr-stamps', label: 'Verification stamps', value: String(allStamps.length) },
  ];

  return { stamps, metrics };
}