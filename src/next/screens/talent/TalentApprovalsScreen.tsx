/**
 * §TALENT APPROVALS — WIRED TO CAA-TalAg ONLY (2026-11-28).
 *
 * BEFORE: this screen read CORE hooks and passed the whole approval workflow — poll a
 * submission, review a listing, approve/reject a compliance document, approve a PO draft.
 * None of those records exist in the Talent dataset, so every control changed nothing.
 *
 * NOW: one read-only Verification tab built from the `SourceVerificationStamp` on every
 * brand and every discovered product. All write handlers are GONE, and the screen says on
 * screen that approval workflows are unavailable here.
 */
import { useMemo, useState } from 'react';
import { useVerticalDemoData } from '@/data/queries';
import { buildTalentApprovals } from '@/data/talent/talentWorkspaceAdapter';
import { TalentApprovalsView, type ApprovalQueueTab } from './TalentApprovalsView';

export function TalentApprovalsScreen(_props: {
  /** Passed by the shell; intentionally unused — this screen is read-only. */
  allowedBrandIds?: Set<string> | null;
  onNavigateView?: (viewId: string) => void;
}) {
  const [retryToken, setRetryToken] = useState(0);
  const [activeTab, setActiveTab] = useState<ApprovalQueueTab>('verification');
  const talent = useVerticalDemoData('talent_commerce', retryToken);

  const model = useMemo(
    () =>
      talent.data?.vertical === 'talent_commerce' && talent.data.data
        ? buildTalentApprovals(talent.data.data)
        : null,
    [talent.data]
  );

  return (
    <TalentApprovalsView
      loading={talent.loading}
      error={talent.error}
      onRetry={() => setRetryToken((n) => n + 1)}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      metrics={model?.metrics ?? []}
      stamps={model?.stamps ?? []}
    />
  );
}