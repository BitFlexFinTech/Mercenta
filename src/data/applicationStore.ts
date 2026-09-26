/**
 * §Access-gate — Brand application store (demo mode).
 *
 * Stores applications in memory while Supabase is not configured.
 * When Supabase is live, reads/writes go through the applications table.
 *
 * §CG — WHAT THIS STORE NOW ALSO OWNS (conversion gate, 2026-09-26)
 * -----------------------------------------------------------------
 * 1. THE ATTEMPT LEDGER. Spam protection needs to know how many times THIS
 *    SESSION has tried to submit — including attempts that were REFUSED, because a
 *    refusal that costs a bot nothing is not a rate limit. The ledger is a
 *    separate fact from `demoApplications` (an application that was never recorded
 *    has no row there), so it is deliberately its own list
 *    (`src/lib/onboarding/applicationGuard.ts` shows why each threshold exists).
 * 2. THE DUPLICATE FAIL-SAFE. The guard refuses a duplicate first; `submitApplication`
 *    also refuses to create a second record for the same brand inside the declared
 *    window, so the invariant holds at the DOMAIN boundary — not only in the form.
 * 3. THE DEFERRED VERIFICATION PATCH. Link verification is a real fetch of the
 *    applicant's own links and must never hold a submission open, so the record is
 *    created first and `updateApplicationLinkStatus` attaches the outcome when it
 *    resolves.
 */
import type { BrandApplication, ApplicationStatus, LinkVerificationStatus } from '@/types';
import { APPLICATION_SPAM_POLICY, type ApplicationSubmissionCode } from '@/config/partnerApplication';
import { applicationFingerprint } from '@/lib/onboarding/applicationGuard';

export const demoApplications: BrandApplication[] = [];

/**
 * One submission ATTEMPT this session. `recorded` distinguishes an application
 * that reached the store from one the gate refused — a refused attempt still
 * counts towards the session budget.
 */
export interface ApplicationAttempt {
  at: number;
  fingerprint: string;
  code: ApplicationSubmissionCode;
  recorded: boolean;
}

/** The session's attempts, oldest first. Reset with the demo environment. */
export const applicationAttempts: ApplicationAttempt[] = [];

let appIdCounter = 0;

/** Milliseconds from an injected clock value; falls back to the real clock. */
function instantOf(value: Date | string | number | undefined): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return Number.isFinite(value) ? value : Date.now();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }
  return Date.now();
}

/** Record one attempt (accepted OR refused) against the session budget. */
export function recordApplicationAttempt(input: {
  code: ApplicationSubmissionCode;
  fingerprint: string;
  recorded: boolean;
  at?: number;
}): ApplicationAttempt {
  const attempt: ApplicationAttempt = {
    at: typeof input.at === 'number' && Number.isFinite(input.at) ? input.at : Date.now(),
    fingerprint: input.fingerprint,
    code: input.code,
    recorded: input.recorded,
  };
  applicationAttempts.push(attempt);
  pruneApplicationAttempts(attempt.at);
  return attempt;
}

/** Drop attempts older than the longest declared window — the ledger stays bounded. */
function pruneApplicationAttempts(now: number): void {
  const horizon = now - APPLICATION_SPAM_POLICY.window.windowMs;
  for (let i = applicationAttempts.length - 1; i >= 0; i -= 1) {
    if (applicationAttempts[i].at < horizon) applicationAttempts.splice(i, 1);
  }
}

/** The attempts inside a window, as the guard expects them (immutable copy). */
export function getApplicationAttempts(now?: Date | string | number, windowMs?: number): ApplicationAttempt[] {
  const nowMs = instantOf(now);
  const span = windowMs ?? APPLICATION_SPAM_POLICY.window.windowMs;
  return applicationAttempts.filter((attempt) => attempt.at > nowMs - span).map((attempt) => ({ ...attempt }));
}

/** Clear the session budget (demo reset + deterministic tests). */
export function resetApplicationAttempts(): void {
  applicationAttempts.length = 0;
}

/** Applications created inside a window — derived, never a second copy of the data. */
export function getRecentApplications(now?: Date | string | number, windowMs?: number): BrandApplication[] {
  const nowMs = instantOf(now);
  const span = windowMs ?? APPLICATION_SPAM_POLICY.duplicate.windowMs;
  return demoApplications.filter((app) => {
    const at = Date.parse(app.createdAt);
    return Number.isFinite(at) && nowMs - at <= span;
  });
}

export function submitApplication(input: {
  companyName: string;
  country: string;
  category: string;
phone: string | null;
  skuCount: number | null;
  monthlyRevenue: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  websiteStatus: LinkVerificationStatus | null;
  instagramStatus: LinkVerificationStatus | null;
  facebookStatus: LinkVerificationStatus | null;
  referralSource: string | null;
  description: string | null;
  /**
   * §Phase E2E — optional DETERMINISTIC id for replayable demo runs. The
   * canonical tenant id is derived from the application id, so a demo run must
   * be able to reproduce the SAME identity instead of consuming the counter.
   * Omitting it preserves the original counter behaviour exactly.
   *
   * §CG — `now` / `dedupeWindowMs` are the injected-clock seam the duplicate
   * fail-safe reads. Omitting them preserves the original behaviour exactly
   * (the real clock and the declared window).
   */
  opts?: { id?: string; now?: Date | string | number; dedupeWindowMs?: number };
}): BrandApplication {
  const { opts, ...fields } = input;
  const nowMs = instantOf(opts?.now);

  /**
   * §CG — THE DUPLICATE FAIL-SAFE, AT THE DOMAIN BOUNDARY.
   * The form's guard refuses a duplicate BEFORE this is called; this makes the
   * invariant true for every caller. Skipped when an explicit deterministic id is
   * supplied: that id means the caller owns ONE canonical identity (the investor
   * demonstration), so collapsing it would break replayability rather than protect
   * anyone. A window of 0 disables the check.
   */
  if (opts?.id === undefined) {
    const windowMs = opts?.dedupeWindowMs ?? APPLICATION_SPAM_POLICY.duplicate.windowMs;
    if (windowMs > 0) {
      const fingerprint = applicationFingerprint(fields);
      const duplicate = demoApplications.find((application) => {
        const createdAt = Date.parse(application.createdAt);
        return (
          Number.isFinite(createdAt) &&
          applicationFingerprint(application) === fingerprint &&
          nowMs - createdAt <= windowMs
        );
      });
      if (duplicate) return duplicate;
    }
  }

  appIdCounter += 1;
  const app: BrandApplication = {
    id: opts?.id ?? `app-${String(appIdCounter).padStart(4, '0')}`,
    ...fields,
    status: 'pending',
    adminNotes: null,
    createdAt: new Date(nowMs).toISOString(),
    reviewedAt: null,
    reviewedBy: null,
  };
  demoApplications.unshift(app);
  return app;
}

/**
 * §CG — attach the outcome of link verification AFTER the application is recorded.
 * Verification is a real fetch of the applicant's own links (up to 10s per link,
 * and CORS-blocked for many hosts), so it must never hold a submission open. The
 * partial is applied field by field; a field that was not checked is left alone.
 */
export function updateApplicationLinkStatus(
  appId: string,
  result: {
    websiteStatus?: LinkVerificationStatus | null;
    instagramStatus?: LinkVerificationStatus | null;
    facebookStatus?: LinkVerificationStatus | null;
  }
): BrandApplication | null {
  const idx = demoApplications.findIndex((a) => a.id === appId);
  if (idx === -1) return null;
  demoApplications[idx] = {
    ...demoApplications[idx],
    ...(result.websiteStatus === undefined ? {} : { websiteStatus: result.websiteStatus }),
    ...(result.instagramStatus === undefined ? {} : { instagramStatus: result.instagramStatus }),
    ...(result.facebookStatus === undefined ? {} : { facebookStatus: result.facebookStatus }),
  };
  return demoApplications[idx];
}


export function updateApplicationStatus(
  appId: string,
  status: ApplicationStatus,
  reviewedBy: string,
  adminNotes?: string | null
): BrandApplication | null {
  const idx = demoApplications.findIndex((a) => a.id === appId);
  if (idx === -1) return null;
  demoApplications[idx] = {
    ...demoApplications[idx],
    status,
    reviewedAt: new Date().toISOString(),
    reviewedBy,
    ...(adminNotes !== undefined ? { adminNotes } : {}),
  };
  return demoApplications[idx];
}

export function getApplicationById(appId: string): BrandApplication | undefined {
  return demoApplications.find((a) => a.id === appId);
}

export function getApplicationsByStatus(status?: ApplicationStatus): BrandApplication[] {
  if (status) return demoApplications.filter((a) => a.status === status);
  return [...demoApplications];
}

export interface ApprovedBrandEntry {
  id: string;
  name: string;
  category: string;
  country: string;
  email: string;
  signatory: string;
  track: 'direct_fulfillment' | 'financed';
}

/** Brands created via application approval or manual creation. */
export const approvedApplicationBrands: ApprovedBrandEntry[] = [];

export function addApprovedBrand(entry: ApprovedBrandEntry): ApprovedBrandEntry {
  // Remove existing entry with same id if re-approving
  const existing = approvedApplicationBrands.findIndex((b) => b.id === entry.id);
  if (existing !== -1) {
    approvedApplicationBrands.splice(existing, 1);
  }
  approvedApplicationBrands.push(entry);
  // §Phase E2 — return the created entry so the caller can create the canonical
  // onboarding record against the SAME tenant id (one identity, no drift).
  return entry;
}

export function getApprovedBrandById(brandId: string): ApprovedBrandEntry | undefined {
  return approvedApplicationBrands.find((b) => b.id === brandId);
}