/**
 * §Phase E3 — CATALOG / PRODUCT-MANAGEMENT LIFECYCLE.
 *
 * The domain flow the brand portal drives, built ENTIRELY on the existing
 * architecture (mirroring `src/lib/onboarding/onboardingLifecycle.ts`):
 *
 *   product information → COMPLETENESS → compliance gate → READY
 *     → SUBMIT (existing `api.submitCatalogItem` seam) → SIMULATED PROCESSING
 *     → SIMULATED RESULT → resulting product state → ongoing catalog management
 *
 * Rules this module enforces — none of them newly invented:
 * - TENANT ISOLATION IN THE DOMAIN: a brand-pinned actor may act only on its own
 *   products; a cross-tenant attempt is refused here, never merely hidden in UI.
 * - RBAC IN THE DOMAIN: a view-only actor cannot submit or poll.
 * - COMPLETENESS IS REAL: the prerequisites are the SAME list the submission
 *   seam has always validated (`productCompleteness.ts`), so a product can never
 *   be shown ready while the seam would reject it.
 * - COMPLIANCE IS NOT BYPASSED: the gate is the existing
 *   `evaluateBrandCatalogGate` → `evaluateComplianceGate` verdict, unchanged.
 * - SIMULATION IS TRUTHFUL: `simulated` comes from the seam's client mode
 *   ('mock' until real credentials exist) and is never inferred or upgraded.
 * - PERSISTENCE goes through the EXISTING D4 port: memory adapter by default
 *   (zero network, honestly non-durable), Supabase when credentials exist.
 */
import type { CatalogReadiness, ProductSubmission } from '@/types';
import type { AcquisitionActor } from '@/lib/acquisition/outreachLifecycle';
import { evaluateProductCompleteness } from './productCompleteness';
import { evaluateBrandCatalogGate, pollSubmissionStatus, submitCatalogItem } from '@/data/api';
import { createPersistenceMirror, getDomainRepository } from '@/data/domainRepository';
import * as store from '@/data/demoStore';

/**
 * The actor performing a catalog action. Extends the acquisition actor with an
 * OPTIONAL tenant pin, exactly like the E2 `OnboardingActor`: a brand session
 * carries its `tenantId` and the domain then refuses any action on another
 * tenant's product.
 */
export interface CatalogActor extends AcquisitionActor {
  tenantId?: string;
}

export type CatalogResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; missing?: string[] };

const FORBIDDEN = 'FORBIDDEN — the acting account is view-only.';
const CROSS_TENANT = 'CROSS_TENANT — that catalog record belongs to another tenant.';
const NOT_FOUND = 'NOT_FOUND — no such catalog submission.';

/** Tenant isolation guard — a pinned actor may act ONLY on its own records. */
function crossTenant(actor: CatalogActor, brandId: string): boolean {
  return !!actor.tenantId && actor.tenantId !== brandId;
}

function forbidden<T>(): CatalogResult<T> {
  return { ok: false, error: FORBIDDEN };
}

/** ONE persistence mirror for catalog writes (the existing D4 port). */
const persistence = createPersistenceMirror();

/** Honest persistence status for the catalog store (memory-only by default). */
export function getCatalogPersistenceStatus() {
  return persistence.status();
}

export async function flushCatalogPersistence(): Promise<void> {
  await persistence.flush();
}

/**
 * §Phase E3 — readiness for ONE product, DERIVED from the two existing rules:
 * product completeness AND the compliance gate. Never a second rule set, and
 * never a weaker one — a non-compliant product is never reported ready.
 */
export async function evaluateCatalogReadiness(
  brandId: string,
  product: Record<string, unknown> | undefined
): Promise<CatalogReadiness> {
  const completeness = evaluateProductCompleteness(product);
  const gate = await evaluateBrandCatalogGate(brandId);
  return {
    complete: completeness.complete,
    compliant: gate.cleared,
    readyForSubmission: completeness.complete && gate.cleared,
    missing: completeness.missing,
    missingLabels: completeness.missingLabels,
    blocking: gate.blocking,
  };
}


/**
 * §Phase E3 — SUBMIT a product through the existing catalog seam.
 *
 * Order of enforcement (never skipped, never reordered):
 *   1. RBAC + tenant isolation          (domain)
 *   2. product COMPLETENESS             (canonical prerequisite list)
 *   3. compliance gate + provider call  (existing `submitCatalogItem` seam)
 *   4. resulting state recorded in the canonical store
 *   5. durable mirror through the D4 port + platform audit
 */
export async function submitCatalogProduct(
  brandId: string,
  product: Record<string, unknown>,
  actor: CatalogActor
): Promise<CatalogResult<ProductSubmission>> {
  if (!actor.canMutate) return forbidden();
  if (crossTenant(actor, brandId)) return { ok: false, error: CROSS_TENANT };

  // 2. Product information must genuinely be complete first.
  const completeness = evaluateProductCompleteness(product);
  if (!completeness.complete) {
    return {
      ok: false,
      error: `INCOMPLETE_PRODUCT — ${completeness.missing.length} required field(s) missing: ${completeness.missing.join(', ')}`,
      missing: completeness.missing,
    };
  }

  // 3. Existing seam: validates the compliance gate, then the provider client
  //    (mock until a verified non-sandbox connection exists) and records the
  //    resulting submission in the canonical store.
  const result = await submitCatalogItem(brandId, product);
  if (!result.ok || !result.submission) {
    return { ok: false, error: result.reason ?? 'SUBMISSION_FAILED', missing: result.missing };
  }
  const submission = result.submission;

  // 4/5. Mirror the artefact through the existing persistence port. With no
  //      Supabase configuration this is the memory adapter: zero network, and
  //      `durable:false` is reported honestly rather than claimed.
  persistence.write('catalog_submissions', submission.id, () =>
    getDomainRepository().persistCatalogSubmission(submission, brandId)
  );

  store.recordCatalogAudit(
    'catalog_product_submitted',
    submission.id,
    brandId,
    `${actor.staffId}: submitted ${submission.sku} — provider ${submission.submissionId} (${submission.mode}${submission.simulated ? ', SIMULATED' : ''})`,
    actor.staffId,
    {
      sku: submission.sku,
      submissionId: submission.submissionId,
      mode: submission.mode,
      simulated: submission.simulated,
    }
  );

  return { ok: true, value: submission };
}

/**
 * §Phase E3 — POLL a submission's processing state through the SAME seam.
 *
 * A simulated submission stays simulated through every poll; no ASIN is ever
 * invented for a mock result, and a rejection is recorded with the provider's
 * stated reason (or an explicit "no reason provided").
 */
export async function pollCatalogSubmission(
  submissionId: string,
  actor: CatalogActor
): Promise<CatalogResult<ProductSubmission>> {
  if (!actor.canMutate) return forbidden();

  const existing = store.getCatalogSubmission(submissionId);
  if (!existing) return { ok: false, error: NOT_FOUND };
  if (crossTenant(actor, existing.brandId)) return { ok: false, error: CROSS_TENANT };

  const poll = await pollSubmissionStatus(existing.submissionId);
  if (!poll.ok || !poll.status) {
    return { ok: false, error: poll.error ?? 'POLL_FAILED' };
  }

  const updated = store.updateCatalogSubmission(submissionId, {
    status: poll.status,
    rejectionReason:
      poll.status === 'rejected'
        ? poll.rejectionReason ?? 'No rejection reason was provided by the provider.'
        : undefined,
    polls: existing.polls + 1,
    lastPolledAt: new Date().toISOString(),
  });
  if (!updated) return { ok: false, error: NOT_FOUND };

  persistence.write('catalog_submissions', updated.id, () =>
    getDomainRepository().persistCatalogSubmission(updated, updated.brandId)
  );

  store.recordCatalogAudit(
    'catalog_submission_polled',
    updated.id,
    updated.brandId,
    `${actor.staffId}: ${updated.sku} → ${updated.status} (poll ${updated.polls}${updated.simulated ? ', SIMULATED' : ''})`,
    actor.staffId,
    { sku: updated.sku, status: updated.status, polls: updated.polls, simulated: updated.simulated }
  );

  return { ok: true, value: updated };
}

/**
 * §Phase E3 — read a tenant's submissions.
 * A view-only account MAY read; a tenant-pinned account may read ONLY its own.
 */
export function listBrandCatalogSubmissions(
  brandId: string,
  actor: CatalogActor
): CatalogResult<ProductSubmission[]> {
  if (crossTenant(actor, brandId)) return { ok: false, error: CROSS_TENANT };
  return { ok: true, value: store.getSubmissionsForBrand(brandId) };
}

/** The derived catalog state of one product (latest submission, or undefined). */
export function catalogStatusForProduct(
  brandId: string,
  sku: string
): ProductSubmission | undefined {
  return store.latestSubmissionForProduct(brandId, sku);
}
