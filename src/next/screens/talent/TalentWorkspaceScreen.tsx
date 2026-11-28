/**
 * §TALENT WORKSPACE — WIRED TO CAA-TalAg ONLY (2026-11-28).
 *
 * BEFORE: this screen read CORE hooks (`useBrands`, `useProducts`, `usePurchaseOrders`,
 * the acquisition/outreach lifecycle writers, `useBrandComms`, the TAM/SAM pipeline and
 * the CORE UK-opportunity states). That is why a Talent screen showed Mercenta's CORE
 * brands, CORE commissions and CORE integration statuses. Every one of those imports is
 * GONE.
 *
 * NOW: `useVerticalDemoData('talent_commerce')` supplies this vertical's own bundle and
 * `buildTalentWorkspace` maps it field-for-field:
 *   brands ← INITIAL_BRANDS · products ← INITIAL_DISCOVERED_PRODUCTS ·
 *   relationships ← INITIAL_RELATIONSHIPS · UK assessments ← INITIAL_UK_ASSESSMENTS.
 *
 * The owner's decisions are implemented: roleSummary as the track label; relationship type
 * plus UK-rights confirmation as ONE read-only badge; phone "—"; no PO value column; no
 * commission section; no outreach/stage writes; no CORE panels.
 *
 * `allowedBrandIds` is intentionally NOT applied — it carries CORE brand ids, and filtering
 * the CAA-TalAg brands by them would hide the whole dataset.
 */
import { useMemo, useState } from 'react';
import { useVerticalDemoData } from '@/data/queries';
import { buildTalentWorkspace } from '@/data/talent/talentWorkspaceAdapter';
import { TalentWorkspaceView, type TalentWorkspaceSection } from './TalentWorkspaceView';

export function TalentWorkspaceScreen({
  section,
  onNavigateView,
}: {
  section: TalentWorkspaceSection;
  /** Passed by the shell; deliberately unused (see header). */
  allowedBrandIds?: Set<string> | null;
  onNavigateView?: (viewId: string) => void;
}) {
  const [retryToken, setRetryToken] = useState(0);
  const talent = useVerticalDemoData('talent_commerce', retryToken);

  const model = useMemo(
    () =>
      talent.data?.vertical === 'talent_commerce' && talent.data.data
        ? buildTalentWorkspace(talent.data.data)
        : null,
    [talent.data]
  );

  return (
    <TalentWorkspaceView
      section={section}
      loading={talent.loading}
      error={talent.error}
      onRetry={() => setRetryToken((n) => n + 1)}
      metrics={model?.metrics ?? []}
      profile={model?.profile ?? null}
      rightsHolders={model?.rightsHolders ?? []}
      productReadiness={model?.productReadiness ?? []}
      prospects={model?.prospects ?? []}
      ukOpportunities={model?.ukOpportunities ?? []}
      onNavigateView={(viewId) => onNavigateView?.(viewId)}
    />
  );
}