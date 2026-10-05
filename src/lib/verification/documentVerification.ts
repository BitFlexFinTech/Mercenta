/**
 * §M2 — DOCUMENT VERIFICATION SEAM.
 *
 * A provider SEAM, not a hardcoded single provider. Mercenta must be able to
 * verify compliance documents through whichever path is genuinely available,
 * and it must never claim a document was externally verified when it was not.
 *
 * Providers behind the SAME interface:
 *
 *   1. `internal_structural_rules` — AUTOMATED and genuinely usable today.
 *      Deterministic structural checks of the submitted artefact (an artefact
 *      exists, it has not expired, the declared reference/issuer are present and
 *      well-formed). This is REAL verification of real facts — but it is
 *      Mercenta's own rule engine, so it records `external: false`. It never
 *      claims a third party checked the document.
 *
 *   2. `simulated_document_verification` — the deterministic SIMULATION seam.
 *      Only reachable when the provider mode is POSITIVELY identified as
 *      `simulation`. Every record it writes is `simulated: true`, and the
 *      evidence reference is unmistakably fake (`SIM-DOC-VERIFY-…`).
 *
 *   3. `manual_mercenta_admin` — the FIRST-CLASS manual operational path. An
 *      authorised Founder / Super Admin reviews the document and records a decision
 *      with their identity as the verifier. Not a workaround: a supported route.
 *
 *   4. `unavailable_document_verification` — FAIL-CLOSED. Used for every other
 *      provider mode (unknown / not_registered / available / configuring /
 *      disabled / degraded / error). It REFUSES to produce a verdict and hands
 *      the document to manual review. It never simulates.
 *
 * §Compliance-is-a-hard-gate: a verdict is only ever recorded against a document
 * that EXISTS. No provider, automated or manual, can approve a requirement that
 * has no document on file — including the operator path.
 *
 * NOTE ON EXTERNAL AUTOMATED PROVIDERS: no genuinely free, usable external
 * document-verification API is held today. Rather than add a paid dependency or
 * fake an external response, the automated path is Mercenta's own deterministic
 * rule engine, and the seam is structured so a real external provider can be
 * added later with ZERO change to the domain workflow (see PRODUCTION_READINESS).
 */

import type {
  ComplianceDocument,
  DocumentVerificationMethod,
  DocumentVerificationProviderSource,
  DocumentVerificationRecord,
  DocumentVerificationStatus,
} from '@/types';
import { isProviderSimulationSafe, type ProviderResolutionMode } from '@/integrations/types';
import { defaultIntegrationMode } from '@/integrations/registry';
import {
  CATEGORY_DOC_LABELS,
  evaluateComplianceGate,
  getApplicableRequirements,
  latestDocumentsByType,
  type ComplianceRequirement,
  type GateEvaluation,
} from '@/lib/compliance';
import {
  demoComplianceDocs,
  demoDocumentVerifications,
  recordComplianceAudit,
} from '@/data/demoStore';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';

/* ── Inputs / outcomes ───────────────────────────────────────────────────── */

export interface DocumentVerificationInput {
  documentId: string;
  brandId: string;
  documentType: ComplianceDocument['type'];
  documentVersion: number;
  fileUrl?: string;
  expiryDate?: string;
  reference?: string;
  issuer?: string;
  /** MANUAL providers only — the operator's decision + identity. */
  operatorDecision?: 'approve' | 'reject';
  operatorId?: string;
  operatorReason?: string;
  /** Deterministic failure drill for the simulation seam. */
  simulateFailure?: boolean;
}

export interface DocumentVerificationVerdict {
  result: 'pass' | 'fail' | 'refused';
  status: DocumentVerificationStatus;
  evidenceReference?: string;
  failureReason?: string;
  notes?: string;
}

export interface DocumentVerificationProvider {
  /** Stable seam id — recorded on every verification record. */
  readonly id: string;
  readonly label: string;
  readonly method: DocumentVerificationMethod;
  readonly source: DocumentVerificationProviderSource;
  /** TRUE only when results come from the deterministic simulation seam. */
  readonly simulated: boolean;
  /** TRUE only when a real EXTERNAL service returned the result. */
  readonly external: boolean;
  /** TRUE when a pass authorises the document requirement to clear. */
  readonly authoritative: boolean;
  /** TRUE when this provider can actually run in the current environment. */
  readonly available: boolean;
  verify(input: DocumentVerificationInput): Promise<DocumentVerificationVerdict>;
}

/* ── 1. AUTOMATED: Mercenta's deterministic structural rule engine ───────── */

export const SIMULATED_DOC_MARKER = 'SIM-DOC-VERIFY';

/** Well-formed reference check: at least 4 alphanumerics with a separator. */
const REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/\-. ]{3,}$/;

export class StructuralDocumentVerificationProvider implements DocumentVerificationProvider {
  readonly id = 'internal_structural_rules';
  readonly label = 'Mercenta structural document rules (automated)';
  readonly method = 'automated' as const;
  readonly source = 'internal_rules' as const;
  readonly simulated = false;
  /** Explicitly NOT external: this is Mercenta checking its own submission. */
  readonly external = false;
  readonly authoritative = true;
  readonly available = true;

  async verify(input: DocumentVerificationInput): Promise<DocumentVerificationVerdict> {
    // A verdict is only ever recorded against a document that EXISTS.
    if (!input.fileUrl && !input.reference) {
      return {
        result: 'fail',
        status: 'failed',
        failureReason: 'no document artefact on file for this requirement',
      };
    }
    if (!input.reference || !REFERENCE_PATTERN.test(input.reference.trim())) {
      return {
        result: 'fail',
        status: 'failed',
        failureReason: 'the document reference is missing or malformed',
      };
    }
    if (!input.issuer || input.issuer.trim().length < 2) {
      return {
        result: 'fail',
        status: 'failed',
        failureReason: 'the issuing body is missing from the document',
      };
    }
    if (input.expiryDate) {
      const expiry = new Date(input.expiryDate).getTime();
      if (Number.isNaN(expiry)) {
        return {
          result: 'fail',
          status: 'failed',
          failureReason: 'the expiry date on the document is not a valid date',
        };
      }
      if (expiry <= Date.now()) {
        return {
          result: 'fail',
          status: 'failed',
          failureReason: 'the document has expired',
        };
      }
    }
    return {
      result: 'pass',
      status: 'verified',
      evidenceReference: input.reference.trim(),
      notes: `structural checks passed (artefact, reference, issuer${
        input.expiryDate ? ', expiry' : ''
      })`,
    };
  }
}

/* ── 2. SIMULATION: the deterministic mock seam ──────────────────────────── */

/**
 * Deterministic, zero-network, unmistakably-simulated verification. Only ever
 * selected when the provider mode is POSITIVELY `simulation`.
 */
export class SimulatedDocumentVerificationProvider implements DocumentVerificationProvider {
  readonly id = 'simulated_document_verification';
  readonly label = 'Simulated document verification (no external service)';
  readonly method = 'automated' as const;
  readonly source = 'simulation' as const;
  readonly simulated = true;
  readonly external = false;
  readonly authoritative = true;
  readonly available = true;

  async verify(input: DocumentVerificationInput): Promise<DocumentVerificationVerdict> {
    if (!input.fileUrl && !input.reference) {
      return {
        result: 'fail',
        status: 'failed',
        failureReason: 'no document artefact on file for this requirement',
      };
    }
    if (input.simulateFailure) {
      return {
        result: 'fail',
        status: 'failed',
        failureReason: `${SIMULATED_DOC_MARKER}: simulated verification failure (deterministic drill)`,
      };
    }
    return {
      result: 'pass',
      status: 'verified',
      evidenceReference: `${SIMULATED_DOC_MARKER}-${input.documentType}-v${input.documentVersion}`,
      notes: 'simulated verification — no external provider was contacted',
    };
  }
}


/* ── 3. MANUAL: first-class Mercenta Admin verification ──────────────────── */

export class ManualDocumentVerificationProvider implements DocumentVerificationProvider {
  readonly id = 'manual_mercenta_admin';
  readonly label = 'Mercenta Admin manual document review';
  readonly method = 'manual' as const;
  readonly source = 'manual_operator' as const;
  readonly simulated = false;
  readonly external = false;
  readonly authoritative = true;
  readonly available = true;

  async verify(input: DocumentVerificationInput): Promise<DocumentVerificationVerdict> {
    if (!input.operatorId) {
      return {
        result: 'refused',
        status: 'manual_review_required',
        failureReason: 'a manual verification decision requires an identified operator',
      };
    }
    if (!input.operatorDecision) {
      return {
        result: 'refused',
        status: 'manual_review_required',
        failureReason: 'no manual decision was supplied',
      };
    }
    if (!input.fileUrl && !input.reference) {
      return {
        result: 'fail',
        status: 'failed',
        failureReason:
          'manual approval cannot bypass the document requirement — no document artefact is on file',
      };
    }
    if (input.operatorDecision === 'reject') {
      return {
        result: 'fail',
        status: 'failed',
        failureReason: input.operatorReason?.trim() || 'rejected by Founder / Super Admin review',
        ...(input.reference ? { evidenceReference: input.reference } : {}),
      };
    }
    return {
      result: 'pass',
      status: 'verified',
      ...(input.reference ? { evidenceReference: input.reference } : {}),
      notes: input.operatorReason?.trim() || 'approved by Founder / Super Admin review',
    };
  }
}

/* ── 4. FAIL-CLOSED: unavailable ─────────────────────────────────────────── */

export class UnavailableDocumentVerificationProvider implements DocumentVerificationProvider {
  readonly id = 'unavailable_document_verification';
  readonly label = 'Automated verification unavailable — manual review required';
  readonly method = 'automated' as const;
  readonly source = 'unavailable' as const;
  readonly simulated = false;
  readonly external = false;
  readonly authoritative = false;
  readonly available = false;

  constructor(private readonly reason: string) {}

  async verify(): Promise<DocumentVerificationVerdict> {
    return {
      result: 'refused',
      status: 'unavailable',
      failureReason: this.reason,
      notes: 'no verification was performed and none is claimed',
    };
  }
}

/* ── Provider selection (interchangeable, fail-closed) ───────────────────── */

export type DocumentVerificationMethodChoice = 'auto' | 'manual';

export interface ProviderSelection {
  provider: DocumentVerificationProvider;
  /** Why this provider was chosen — recorded on the verification record. */
  reason: string;
  mode: ProviderResolutionMode;
}

/**
 * Interchangeable provider selection.
 *
 *   - an explicit MANUAL choice always resolves to the operator provider;
 *   - otherwise ONLY a mode positively identified as `simulation` resolves to
 *     the simulation seam, and ONLY `live` resolves to the automated rule
 *     engine (which is real, deterministic, and non-external);
 *   - EVERY other mode is fail-closed → unavailable → manual review required.
 */
export function selectDocumentVerificationProvider(opts: {
  mode: ProviderResolutionMode;
  method?: DocumentVerificationMethodChoice;
}): ProviderSelection {
  if (opts.method === 'manual') {
    return {
      provider: new ManualDocumentVerificationProvider(),
      reason: 'manual Mercenta Admin review requested',
      mode: opts.mode,
    };
  }
  if (isProviderSimulationSafe(opts.mode)) {
    return {
      provider: new SimulatedDocumentVerificationProvider(),
      reason: 'provider mode positively identified as simulation',
      mode: opts.mode,
    };
  }
  if (opts.mode === 'live') {
    return {
      provider: new StructuralDocumentVerificationProvider(),
      reason: 'live mode — Mercenta structural document rules applied',
      mode: opts.mode,
    };
  }
  return {
    provider: new UnavailableDocumentVerificationProvider(
      `automated document verification is unavailable in provider mode "${opts.mode}"`
    ),
    reason: `fail-closed: provider mode "${opts.mode}" is not a positively identified simulation or live provider`,
    mode: opts.mode,
  };
}


/* ── Read models ─────────────────────────────────────────────────────────── */

export function listVerificationsForDocument(documentId: string): DocumentVerificationRecord[] {
  return demoDocumentVerifications.filter((r) => r.documentId === documentId);
}

export function listVerificationsForBrand(brandId: string): DocumentVerificationRecord[] {
  return demoDocumentVerifications.filter((r) => r.brandId === brandId);
}

/** The authoritative record for a document version (never a superseded one). */
export function latestVerificationFor(documentId: string): DocumentVerificationRecord | undefined {
  const records = listVerificationsForDocument(documentId).filter((r) => !r.superseded);
  return records[records.length - 1];
}

export function documentVersionOf(doc: ComplianceDocument): number {
  return doc.version ?? 1;
}

/** Deterministic record id — no random, no clock: replay-safe. */
function nextRecordId(documentId: string, version: number): string {
  const seq = listVerificationsForDocument(documentId).length + 1;
  return `dvr-${documentId}-v${version}-${String(seq).padStart(2, '0')}`;
}

export type DocumentVerificationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; crossTenant?: boolean };

/* ── Lifecycle: submit → verify (automated | manual) ─────────────────────── */

export interface VerificationActor {
  /** Operator/staff identity. Required for manual verification. */
  staffId: string;
  canMutate: boolean;
  /** When present, the acting brand tenant — cross-tenant access is refused. */
  tenantId?: string;
}

export function resolveComplianceDocument(
  documentId: string,
  actor?: VerificationActor
): DocumentVerificationResult<ComplianceDocument> {
  const doc = demoComplianceDocs.find((d) => d.id === documentId);
  if (!doc) return { ok: false, error: `unknown compliance document ${documentId}` };
  if (actor?.tenantId && actor.tenantId !== doc.brandId) {
    return {
      ok: false,
      crossTenant: true,
      error: `document ${documentId} does not belong to this brand`,
    };
  }
  return { ok: true, value: doc };
}

/**
 * The brand has SUBMITTED a document version for verification. This is not a
 * verdict: the document moves to `under_review`, a `pending` record is opened,
 * and the compliance gate stays BLOCKED.
 */
export function submitDocumentForVerification(
  documentId: string,
  actor: VerificationActor
): DocumentVerificationResult<DocumentVerificationRecord> {
  const found = resolveComplianceDocument(documentId, actor);
  if (!found.ok) return found;
  if (!actor.canMutate) return { ok: false, error: 'this account cannot mutate compliance records' };
  const doc = found.value;
  const version = documentVersionOf(doc);

  doc.status = 'under_review';
  doc.verificationStatus = 'pending';

  const record: DocumentVerificationRecord = {
    id: nextRecordId(doc.id, version),
    documentId: doc.id,
    brandId: doc.brandId,
    documentType: doc.type,
    documentVersion: version,
    status: 'pending',
    method: 'automated',
    source: 'unavailable',
    providerId: 'pending',
    verifierIdentity: actor.staffId,
    external: false,
    simulated: false,
    providerMode: 'pending',
    verifiedAt: new Date().toISOString(),
    result: 'refused',
    notes: 'document submitted — verification verdict pending',
  };
  demoDocumentVerifications.push(record);
  doc.latestVerificationId = record.id;
  recordComplianceAudit(
    'compliance_document_verification_requested',
    doc.id,
    doc.brandId,
    `${doc.type} v${version} submitted for verification (record ${record.id})`,
    actor.staffId,
    { recordId: record.id, version }
  );
  notifyCanonicalStoreChange();
  return { ok: true, value: record };
}


/**
 * Persist a verdict against a document version. Enforces the hard gate:
 *  - a PASS from an authoritative provider clears the requirement;
 *  - a FAIL moves the document to `rejected` (it must be REPLACED);
 *  - a REFUSED (unavailable / no operator identity) verdict changes NOTHING —
 *    the requirement stays blocked and manual review is required.
 * Previous authoritative records are marked `superseded` (kept, never deleted).
 */
export function persistDocumentVerdict(
  doc: ComplianceDocument,
  actor: VerificationActor,
  selection: ProviderSelection,
  verdict: DocumentVerificationVerdict
): DocumentVerificationRecord {
  const version = documentVersionOf(doc);
  const provider = selection.provider;

  if (verdict.result === 'pass' && provider.authoritative) {
    doc.status = 'approved';
    doc.reviewedBy = actor.staffId;
  } else if (verdict.result === 'fail') {
    doc.status = 'rejected';
    doc.reviewedBy = actor.staffId;
  }
  doc.verificationStatus = verdict.status;
  doc.version = version;

  const record: DocumentVerificationRecord = {
    id: nextRecordId(doc.id, version),
    documentId: doc.id,
    brandId: doc.brandId,
    documentType: doc.type,
    documentVersion: version,
    status: verdict.status,
    method: provider.method,
    source: provider.source,
    providerId: provider.id,
    verifierIdentity:
      provider.method === 'manual' ? `${actor.staffId} (${provider.label})` : provider.label,
    external: provider.external,
    simulated: provider.simulated,
    providerMode: String(selection.mode),
    verifiedAt: new Date().toISOString(),
    result: verdict.result,
    ...(verdict.evidenceReference ? { evidenceReference: verdict.evidenceReference } : {}),
    ...(verdict.failureReason ? { failureReason: verdict.failureReason } : {}),
    ...(verdict.notes ? { notes: verdict.notes } : {}),
  };
  for (const prior of listVerificationsForDocument(doc.id)) {
    if (prior.id !== record.id) prior.superseded = true;
  }
  demoDocumentVerifications.push(record);
  doc.latestVerificationId = record.id;

  recordComplianceAudit(
    verdict.result === 'pass'
      ? 'compliance_document_verified'
      : verdict.result === 'fail'
        ? 'compliance_document_rejected'
        : 'compliance_document_verification_unavailable',
    doc.id,
    doc.brandId,
    `${doc.type} v${version} → ${verdict.status} via ${provider.id} (${selection.reason})${
      verdict.failureReason ? ` — ${verdict.failureReason}` : ''
    }`,
    actor.staffId,
    {
      recordId: record.id,
      providerId: provider.id,
      providerMode: record.providerMode,
      method: record.method,
      source: record.source,
      external: record.external,
      simulated: record.simulated,
      result: record.result,
      failureReason: verdict.failureReason ?? null,
    }
  );
  notifyCanonicalStoreChange();
  return record;
}

/* ── Public lifecycle entry points ───────────────────────────────────────── */

export interface VerifyDocumentOptions {
  /** Provider mode lookup — defaults to the canonical registry resolution. */
  getMode?: (providerId: string) => ProviderResolutionMode;
  /** 'auto' (default) or 'manual' — interchangeable selection. */
  method?: DocumentVerificationMethodChoice;
  /** Manual decision + reason (method 'manual' only). */
  decision?: 'approve' | 'reject';
  reason?: string;
  /** Deterministic failure drill for the simulation seam. */
  simulateFailure?: boolean;
  /** Which integration/provider this verification is attributed to. */
  providerKey?: string;
}

/**
 * Run the verification verdict for a document that has been submitted. Chooses
 * the provider through the seam, records the verdict, and keeps the hard gate.
 *
 * FAIL-CLOSED: when the resolved mode is not positively `simulation` or `live`,
 * NOTHING is claimed — the record states the provider was unavailable and manual
 * review is required.
 */
export async function verifyDocumentVersion(
  documentId: string,
  actor: VerificationActor,
  opts: VerifyDocumentOptions = {}
): Promise<DocumentVerificationResult<DocumentVerificationRecord>> {
  const found = resolveComplianceDocument(documentId, actor);
  if (!found.ok) return found;
  if (!actor.canMutate) return { ok: false, error: 'this account cannot mutate compliance records' };
  const doc = found.value;

  const getMode = opts.getMode ?? defaultIntegrationMode;
  const providerKey = opts.providerKey ?? 'companies_house';
  const mode = getMode(providerKey);
  const selection = selectDocumentVerificationProvider({
    mode,
    ...(opts.method ? { method: opts.method } : {}),
  });

  const verdict = await selection.provider.verify({
    documentId: doc.id,
    brandId: doc.brandId,
    documentType: doc.type,
    documentVersion: documentVersionOf(doc),
    ...(doc.fileUrl ? { fileUrl: doc.fileUrl } : {}),
    ...(doc.expiryDate ? { expiryDate: doc.expiryDate } : {}),
    ...(doc.reference ? { reference: doc.reference } : {}),
    ...(doc.issuer ? { issuer: doc.issuer } : {}),
    ...(opts.decision ? { operatorDecision: opts.decision } : {}),
    ...(opts.method === 'manual' ? { operatorId: actor.staffId } : {}),
    ...(opts.reason ? { operatorReason: opts.reason } : {}),
    ...(opts.simulateFailure ? { simulateFailure: true } : {}),
  });

  return { ok: true, value: persistDocumentVerdict(doc, actor, selection, verdict) };
}


/* ── Manual Mercenta Admin verification (first-class path) ───────────────── */

/**
 * An authorised Founder / Super Admin records a manual verification decision.
 * Identity, method, result and reason are all recorded — and a manual APPROVE
 * still cannot clear a requirement with no document on file.
 */
export async function recordManualDocumentVerification(
  documentId: string,
  actor: VerificationActor,
  decision: 'approve' | 'reject',
  reason: string
): Promise<DocumentVerificationResult<DocumentVerificationRecord>> {
  if (!reason || reason.trim().length < 3) {
    return { ok: false, error: 'a manual verification decision requires a recorded reason' };
  }
  return verifyDocumentVersion(documentId, actor, {
    method: 'manual',
    decision,
    reason,
  });
}

/* ── Versioning: replace a rejected document ─────────────────────────────── */

export interface ReplaceDocumentInput {
  /** The document record being replaced (must belong to the acting tenant). */
  documentId: string;
  actor: VerificationActor;
  reason: string;
  fileUrl?: string;
  reference?: string;
  issuer?: string;
  expiryDate?: string;
}

export interface ReplaceDocumentResult {
  newDocument: ComplianceDocument;
  supersededDocumentId: string;
  version: number;
}

/**
 * REPLACE a document with a new version. The previous record is marked
 * `superseded` (never deleted), every prior verification record is marked
 * superseded, and the new version starts at `uploaded` — awaiting verification.
 * The compliance gate therefore STAYS BLOCKED until the replacement passes.
 */
export function replaceComplianceDocument(
  input: ReplaceDocumentInput
): DocumentVerificationResult<ReplaceDocumentResult> {
  const found = resolveComplianceDocument(input.documentId, input.actor);
  if (!found.ok) return found;
  if (!input.actor.canMutate) {
    return { ok: false, error: 'this account cannot mutate compliance records' };
  }
  if (!input.reason || input.reason.trim().length < 3) {
    return { ok: false, error: 'replacing a document requires a recorded reason' };
  }
  const previous = found.value;

  // The next version is derived from the LATEST record for this requirement —
  // never from the record being replaced.
  const siblings = demoComplianceDocs.filter(
    (d) => d.brandId === previous.brandId && d.type === previous.type
  );
  const highestVersion = siblings.reduce((max, d) => Math.max(max, d.version ?? 1), 1);
  const version = highestVersion + 1;

  previous.status = 'superseded';
  for (const record of listVerificationsForDocument(previous.id)) record.superseded = true;

  const brandSlug = previous.brandId.replace(/^brand-/, '');
  const newDocument: ComplianceDocument = {
    id: `doc-${brandSlug}-${previous.type}-v${version}`,
    brandId: previous.brandId,
    type: previous.type,
    status: 'uploaded',
    version,
    supersedesDocumentId: previous.id,
    verificationStatus: 'not_requested',
    ...(input.fileUrl ?? previous.fileUrl ? { fileUrl: input.fileUrl ?? previous.fileUrl } : {}),
    ...(input.reference ?? previous.reference
      ? { reference: input.reference ?? previous.reference }
      : {}),
    ...(input.issuer ?? previous.issuer ? { issuer: input.issuer ?? previous.issuer } : {}),
    ...(input.expiryDate ?? previous.expiryDate
      ? { expiryDate: input.expiryDate ?? previous.expiryDate }
      : {}),
  };
  demoComplianceDocs.push(newDocument);

  recordComplianceAudit(
    'compliance_document_replaced',
    newDocument.id,
    newDocument.brandId,
    `${newDocument.type} v${previous.version ?? 1} superseded → v${version} submitted; ${input.reason.trim()}`,
    input.actor.staffId,
    { supersededDocumentId: previous.id, version, reason: input.reason.trim() }
  );

  notifyCanonicalStoreChange();
  return { ok: true, value: { newDocument, supersededDocumentId: previous.id, version } };
}


/* ── Brand-facing standing: exactly what is required and what is blocking ── */

export interface DocumentStandingRow {
  type: ComplianceDocument['type'];
  label: string;
  scope: ComplianceRequirement['scope'];
  rationale: string;
  conditionDescription?: string;
  /** Requirement state (the gate reads THIS). */
  status: ComplianceDocument['status'];
  version: number;
  /** Verdict summary from the latest verification record (evidence trail). */
  verificationStatus: DocumentVerificationStatus;
  verification?: {
    recordId: string;
    method: DocumentVerificationMethod;
    providerId: string;
    verifierIdentity: string;
    external: boolean;
    simulated: boolean;
    verifiedAt: string;
    result: 'pass' | 'fail' | 'refused';
    evidenceReference?: string;
    failureReason?: string;
  };
  /** The brand must supply a replacement before this can clear. */
  needsReplacement: boolean;
  /** Human sentence: what is blocking this requirement right now. */
  blockingReason?: string;
}

export interface BrandDocumentStanding {
  brandId: string;
  cleared: boolean;
  rows: DocumentStandingRow[];
  /** Requirement types that are not yet satisfied. */
  blocking: ComplianceDocument['type'][];
  needsReplacement: ComplianceDocument['type'][];
  verifiedCount: number;
  requiredCount: number;
}

/**
 * §M2 — THE brand-facing answer to "which documents are required, which are
 * submitted, which are under review, which passed, which failed, which need
 * replacement, and what is blocking approval". Derived from the canonical gate
 * rule plus the verification ledger — no second list is maintained anywhere.
 */
export function documentVerificationStanding(
  brandId: string,
  category?: Parameters<typeof getApplicableRequirements>[0],
  /**
   * Optional document set to evaluate (e.g. the caller's already-loaded query
   * data). When omitted the canonical store is read. Either way the GATE and
   * the standing are computed from the SAME records, so a page can never show a
   * standing that disagrees with its own gate banner.
   */
  docsOverride?: ComplianceDocument[],
  /**
   * The caller's canonical gate evaluation (which includes the agreement and
   * distribution-agreement conditions). When omitted, `cleared` reflects the
   * DOCUMENT requirements only — pass the real evaluation wherever the caller
   * already holds one, so the standing can never disagree with the gate banner.
   */
  evaluationOverride?: GateEvaluation
): BrandDocumentStanding {
  const docs = (docsOverride ?? demoComplianceDocs).filter((d) => d.brandId === brandId);
  const latest = latestDocumentsByType(docs);
  const requirements = getApplicableRequirements(category);
  const evaluation = evaluationOverride ?? evaluateComplianceGate(docs, undefined);

  const rows: DocumentStandingRow[] = requirements.map((req) => {
    const doc = latest.get(req.type);
    const status: ComplianceDocument['status'] = doc ? doc.status : 'missing';
    const record = doc ? latestVerificationFor(doc.id) : undefined;
    const needsReplacement = status === 'rejected' || status === 'expired';
    let blockingReason: string | undefined;
    if (status === 'missing') {
      blockingReason = 'no document has been submitted for this requirement';
    } else if (status === 'rejected') {
      blockingReason = `verification failed — replacement required${
        record?.failureReason ? `: ${record.failureReason}` : ''
      }`;
    } else if (status === 'superseded') {
      blockingReason = 'superseded by a newer version';
    } else if (status === 'uploaded') {
      blockingReason = 'submitted — verification not yet run';
    } else if (status === 'under_review') {
      blockingReason = 'under verification';
    } else if (status === 'expired') {
      blockingReason = 'the document has expired — replacement required';
    } else if (status === 'expiring') {
      blockingReason = 'the document is approaching expiry';
    }
    return {
      type: req.type,
      label: CATEGORY_DOC_LABELS[req.type] ?? req.type.replace(/_/g, ' '),
      scope: req.scope,
      rationale: req.rationale,
      ...(req.conditionDescription ? { conditionDescription: req.conditionDescription } : {}),
      status,
      version: doc ? documentVersionOf(doc) : 0,
      verificationStatus: record ? record.status : 'not_requested',
      ...(record
        ? {
            verification: {
              recordId: record.id,
              method: record.method,
              providerId: record.providerId,
              verifierIdentity: record.verifierIdentity,
              external: record.external,
              simulated: record.simulated,
              verifiedAt: record.verifiedAt,
              result: record.result,
              ...(record.evidenceReference
                ? { evidenceReference: record.evidenceReference }
                : {}),
              ...(record.failureReason ? { failureReason: record.failureReason } : {}),
            },
          }
        : {}),
      needsReplacement,
      ...(blockingReason ? { blockingReason } : {}),
    };
  });

  return {
    brandId,
    cleared: evaluation.cleared,
    rows,
    blocking: rows.filter((r) => r.status !== 'approved').map((r) => r.type),
    needsReplacement: rows.filter((r) => r.needsReplacement).map((r) => r.type),
    verifiedCount: rows.filter((r) => r.status === 'approved').length,
    requiredCount: rows.length,
  };
}

