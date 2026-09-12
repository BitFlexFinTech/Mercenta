/**
 * §Phase E7 — Mercenta Social: canonical brand-status mapping.
 *
 * Mercenta remains the authoritative source for brand approval. This module maps
 * the canonical Mercenta signals that ALREADY exist (a brand's contract status
 * and its canonical onboarding status) onto the Mercenta Social life cycle. It
 * invents no new brand status and redefines no existing one — an unrecognised
 * value resolves to `unknown`, which the access gate treats as DENIED.
 */
import type { SocialBrandLifecycleStatus } from './workspace';

/**
 * Contract status → Mercenta Social life cycle.
 * (Contract['status']: draft | sent | under_review | signed | active | expiring | terminated)
 */
export function lifecycleStatusFromContract(
  contractStatus?: string | null
): SocialBrandLifecycleStatus {
  switch (String(contractStatus ?? '').trim().toLowerCase()) {
    case 'active':
    case 'signed':
    case 'expiring':
      // A live or renewing partnership is an approved partnership.
      return 'active';
    case 'under_review':
      return 'in_review';
    case 'draft':
    case 'sent':
      // Contract exists but is not executed — the brand is not yet approved.
      return 'pending';
    case 'terminated':
      return 'terminated';
    case 'suspended':
      return 'suspended';
    default:
      return 'unknown';
  }
}

/**
 * Canonical onboarding status → Mercenta Social life cycle.
 * (OnboardingStatus: initiated | accepted | in_progress | completed)
 */
export function lifecycleStatusFromOnboarding(
  onboardingStatus?: string | null
): SocialBrandLifecycleStatus {
  switch (String(onboardingStatus ?? '').trim().toLowerCase()) {
    case 'completed':
      return 'active';
    case 'accepted':
    case 'in_progress':
    case 'initiated':
      return 'pending';
    default:
      return 'unknown';
  }
}

/**
 * Resolve the life-cycle status for a brand session.
 *
 * A canonical onboarding record, when present, is authoritative for that tenant;
 * otherwise the brand's contract status governs. Anything unrecognised (or
 * absent) resolves to `unknown`, and the access gate then DENIES.
 */
export function resolveBrandLifecycleStatus(input: {
  contractStatus?: string | null;
  onboardingStatus?: string | null;
}): SocialBrandLifecycleStatus {
  if (input.onboardingStatus) return lifecycleStatusFromOnboarding(input.onboardingStatus);
  if (input.contractStatus) return lifecycleStatusFromContract(input.contractStatus);
  return 'unknown';
}
