/**
 * §WAVE 3k (2026-11-25) — PARTNERSHIPS & FUNDRAISING (data).
 *
 * The three models this surface reports on are DERIVED by their own owners and read
 * here; nothing is computed in this screen:
 *   · `buildFinancierUniverseSummary()` — the real financing-partner universe.
 *   · `buildFounderOutreachSummary()`  — the approach Mercenta runs over it.
 *   · `buildFinancierLifecycleSummary()` — the state machine a partner moves through.
 *
 * SUPER-ADMIN ONLY (`partnerships` is in `SUPER_ADMIN_ONLY_ADMIN_IDS`): the partner
 * approach and the treasury universe are internal concerns and are never shown to a
 * brand. No figure on this surface is invented — the real universe holds zero providers
 * today and the surface says so rather than filling the space.
 */
import { useMemo } from 'react';
import { useCanonicalStoreVersion } from '@/data/queries';
import {
  buildFinancierUniverseSummary,
  type FinancierUniverseSummary,
} from '@/lib/finance/financierUniverse';
import {
  buildFounderOutreachSummary,
  type FounderOutreachSummary,
} from '@/lib/finance/founderOutreach';
import {
  buildFinancierLifecycleSummary,
  type FinancierLifecycleSummary,
} from '@/lib/finance/financierLifecycle';
import { AdminPartnershipsView } from './AdminPartnershipsView';

export interface PartnershipsModel {
  universe: FinancierUniverseSummary;
  outreach: FounderOutreachSummary;
  lifecycle: FinancierLifecycleSummary;
}

export function AdminPartnershipsScreen({ onNavigate }: { onNavigate: (viewId: string) => void }) {
  const canonicalVersion = useCanonicalStoreVersion();

  const model = useMemo<PartnershipsModel>(() => {
    void canonicalVersion; // re-derived whenever a canonical record changes
    return {
      universe: buildFinancierUniverseSummary(),
      outreach: buildFounderOutreachSummary(),
      lifecycle: buildFinancierLifecycleSummary(),
    };
  }, [canonicalVersion]);

  return <AdminPartnershipsView model={model} onNavigate={onNavigate} />;
}
