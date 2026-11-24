import type { AdSpendRecommendation } from '@/types';

export type AdsVertical = 'core' | 'bws' | 'talent_commerce';
export type AdsScope = 'brand' | 'admin' | 'super_admin';

export interface AdsSurfacePolicy {
  vertical: AdsVertical;
  scope: 'brand' | 'admin';
  isSuperAdmin: boolean;
  title: string;
  description: string;
  commissionNote: string;
  placementContextLabel: string;
  creativeAssetGapNote: string;
  campaignMutationGapNote: string;
  recStatusLabels: Record<AdSpendRecommendation['status'], string>;
  verticalRuleNote?: string;
}

const BRAND_REC_LABELS: Record<AdSpendRecommendation['status'], string> = {
  proposed: 'Awaiting your decision',
  approved: 'Approved by you',
  amended: 'Amended by you',
  rejected: 'Rejected by you',
};

const ADMIN_REC_LABELS: Record<AdSpendRecommendation['status'], string> = {
  proposed: 'Proposed',
  approved: 'Approved by brand',
  amended: 'Amended by brand',
  rejected: 'Rejected by brand',
};

export function resolveAdsSurfacePolicy(
  vertical: AdsVertical,
  scope: AdsScope
): AdsSurfacePolicy {
  const isSuperAdmin = scope === 'super_admin';
  if (vertical === 'bws') {
    return {
      vertical,
      scope: 'admin',
      isSuperAdmin,
      title: 'Campaign Studio',
      description:
        'Alcohol 1P brand advertising budgets, Sponsored Ads performance, and monthly budget approvals across the portfolio.',
      commissionNote:
        'Advertising management commission is £0.00 — no ad spend revenue recorded yet.',
      placementContextLabel: 'Sponsored Products · Sponsored Brands · Sponsored Display',
      creativeAssetGapNote:
        'Creative asset library and ASA / Portman Group age-gate pre-flight checks are unavailable until CreativeAsset and alcohol-policy fields are added to the Mercenta backend.',
      campaignMutationGapNote:
        'Direct campaign pause, resume, and bid-edit controls are omitted because no campaign-mutation endpoint exists in src/data/api.ts.',
      recStatusLabels: ADMIN_REC_LABELS,
      verticalRuleNote:
        'Showing all Mercenta brands because the brand schema does not yet carry a vertical field to isolate BWS accounts.',
    };
  }

  if (vertical === 'talent_commerce') {
    return {
      vertical,
      scope: 'admin',
      isSuperAdmin,
      title: 'Amazon Campaigns',
      description:
        'Talent IP retail campaign spend, utilisation, and brand budget decisions backed by Mercenta advertising data.',
      commissionNote:
        'Advertising management commission is £0.00 — no ad spend revenue recorded yet.',
      placementContextLabel: 'Sponsored Brands · Store Spotlight · Sponsored Display',
      creativeAssetGapNote:
        'Talent creative asset uploads, rightsholder sign-off workflows, and Brand Store modules are unavailable until CreativeAsset and talentId records exist in Mercenta.',
      campaignMutationGapNote:
        'Campaign status toggles and campaign creation are omitted because src/data/api.ts exposes read-only AdCampaign records.',
      recStatusLabels: ADMIN_REC_LABELS,
      verticalRuleNote:
        'Showing all Mercenta brands because the brand schema does not yet carry a vertical or talentId field.',
    };
  }

  if (scope === 'brand') {
    return {
      vertical: 'core',
      scope: 'brand',
      isSuperAdmin: false,
      title: 'Advertising',
      description:
        'Monthly advertising budget, spend to date, campaign metrics, and Mercenta budget recommendations for your brand.',
      commissionNote:
        'Nothing is spent until you approve, amend, or reject a budget recommendation.',
      placementContextLabel: 'Channel Advertising Placements',
      creativeAssetGapNote:
        'Creative asset submissions are unavailable because Mercenta does not store CreativeAsset records yet.',
      campaignMutationGapNote:
        'Campaign pause/resume controls are omitted because only budget recommendation decisions are supported in src/data/api.ts.',
      recStatusLabels: BRAND_REC_LABELS,
    };
  }

  return {
    vertical: 'core',
    scope: 'admin',
    isSuperAdmin,
    title: 'Ads Manager',
    description: isSuperAdmin
      ? 'Cross-vertical Super Admin ad spend, budget utilisation, ACOS/TACOS, manual monthly budgets, and brand budget recommendations.'
      : 'Portfolio ad spend, budget utilisation, ACOS/TACOS, manual monthly budgets, and brand budget recommendations across all brands.',
    commissionNote:
      'Advertising management commission is £0.00 — no ad spend revenue recorded yet.',
    placementContextLabel: 'Amazon Ads Placements',
    creativeAssetGapNote:
      'Creative asset review is unavailable until CreativeAsset endpoints exist in src/data/api.ts.',
    campaignMutationGapNote:
      'Individual campaign pause/resume toggles are omitted because no campaign-mutation API exists in src/data/api.ts.',
    recStatusLabels: ADMIN_REC_LABELS,
  };
}
