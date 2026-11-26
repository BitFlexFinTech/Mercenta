/**
 * §WAVE 3k (2026-11-25) — BRAND INTELLIGENCE (data).
 *
 * The board this screen renders already exists as an owner; this screen derives NOTHING
 * of its own:
 *   · the ranked opportunities, the ineligible-but-retained records and the vertical
 *     rollup — `src/lib/intelligence/opportunityDiscovery.ts`;
 *   · the prospects they are derived from — `src/data/prospectStore.ts` (the canonical
 *     prospect store, seeded exactly as the existing operator panel seeds it).
 *
 * §6 OF THE BUSINESS MODEL IS ENFORCED HERE, NOT DECORATED: only the ten approved
 * retail-channel categories may be prospected or ranked, an unknown category is
 * INELIGIBLE (fail-closed), and an ineligible brand is RETAINED AND MARKED rather than
 * dropped. Every monetary figure is an ESTIMATE and every record states its claim class.
 * Super-Admin only.
 */
import { useEffect, useMemo, useState } from 'react';
import { useCanonicalStoreVersion } from '@/data/queries';
import { ensureProspectStore, getProspects } from '@/data/prospectStore';
import {
  rankOpportunities,
  rollupByVertical,
  sportsOpportunities,
  type DerivedOpportunity,
  type OpportunityRecord,
  type OpportunityRanking,
  type OpportunityVerticalId,
  type VerticalRollup,
} from '@/lib/intelligence/opportunityDiscovery';
import type { BrandProspect } from '@/types';
import { AdminBrandIntelligenceView } from './AdminBrandIntelligenceView';

export interface BrandIntelligenceModel {
  prospectsConsidered: number;
  ranking: OpportunityRanking;
  sports: readonly OpportunityRecord[];
  allRecords: readonly OpportunityRecord[];
  rollup: Record<OpportunityVerticalId, VerticalRollup>;
  ranked: readonly DerivedOpportunity[];
}

export function AdminBrandIntelligenceScreen({ onNavigate }: { onNavigate: (viewId: string) => void }) {
  const canonicalVersion = useCanonicalStoreVersion();
  const [prospects, setProspects] = useState<BrandProspect[]>([]);

  /* The canonical prospect store is seeded then read — the same sequence the existing
     operator panel uses, so the two surfaces can never disagree about the prospects. */
  useEffect(() => {
    ensureProspectStore();
    setProspects(getProspects());
  }, [canonicalVersion]);

  const model = useMemo<BrandIntelligenceModel>(() => {
    const ranking = rankOpportunities(prospects);
    const sports = sportsOpportunities();
    const allRecords: OpportunityRecord[] = [...ranking.ranked, ...ranking.ineligible, ...sports];
    return {
      prospectsConsidered: prospects.filter((p) => !p.disqualified).length,
      ranking,
      sports,
      allRecords,
      rollup: rollupByVertical(allRecords),
      ranked: ranking.ranked,
    };
  }, [prospects]);

  return <AdminBrandIntelligenceView model={model} onNavigate={onNavigate} />;
}
