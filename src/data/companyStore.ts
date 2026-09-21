/**
 * §22–§25 (M13 Phase 9) — MERCENTA'S OWN COMPANY / GOVERNMENT COMPLIANCE store.
 *
 * This is the founder's statutory-compliance state for Mercenta Partners Ltd:
 * what the registrar returned (labelled by source), the confirmation-statement
 * workflow with its founder-approval gate, the derived deadline tasks, and the
 * masked references for the two government secrets the founder holds.
 *
 * HONESTY CONTRACT (enforced here, not in the UI):
 *  - no filing is ever recorded as done without a Companies House reference the
 *    founder actually entered;
 *  - `fileViaOfficialApi` REFUSES while
 *    `OFFICIAL_CONFIRMATION_STATEMENT_FILING_CONFIGURED` is false — Mercenta
 *    does not hold an official filing channel and must never imply it does;
 *  - a filing is only 'verified' after a registrar read that happened AFTER the
 *    reference was recorded;
 *  - SECRET VALUES ARE NEVER STORED. `storeGovernmentSecret` keeps a secret
 *    reference + a mask only; the value itself never enters any record, audit
 *    entry, report or the review ZIP.
 *
 * PERSISTENCE: in-memory for the demo session, exactly like `launchStore`; the
 * live seam is the same optional Supabase/Vault dual-write.
 */
import { demoAuditLog } from './demoStore';
import type { AuditLogEntry } from '@/types';
import { emitEvent } from '@/lib/events/eventFeed';
import {
  COMPANY_REGISTRATION,
  CONFIRMATION_STATEMENT_WORKFLOW,
  COMPLIANCE_DEADLINE_THRESHOLDS,
  GOVERNMENT_SECRET_KINDS,
  OFFICIAL_CONFIRMATION_STATEMENT_FILING_CONFIGURED,
  type ConfirmationStatementStage,
  type GovernmentSecretKind,
} from '@/config/company';
import type {
  ChCharge,
  ChCompanyRecord,
  ChDataSource,
  ChFiling,
  ChOfficer,
  ChPersonWithSignificantControl,
} from '@/lib/compliance/companiesHouseClient';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';

export interface RegistrarSnapshot {
  readAt: string | null;
  /** Which client produced this read — simulation must never look live. */
  mode: 'simulation' | 'live' | null;
  dataSource: ChDataSource | null;
  record: ChCompanyRecord | null;
  officers: ChOfficer[];
  psc: ChPersonWithSignificantControl[];
  filings: ChFiling[];
  charges: ChCharge[];
  lastError: string | null;
}

export interface ConfirmationStatementState {
  nextDueDate: string | null;
  dueDateSource: 'registrar_read' | 'not_read_yet';
  stage: ConfirmationStatementStage;
  founderApprovedAt: string | null;
  approvedBy: string | null;
  filingMethod: 'official_api' | 'manual_register' | null;
  recordedReference: string | null;
  recordedAt: string | null;
  registerConfirmedAt: string | null;
}

export interface GovernmentSecretRecord {
  kind: GovernmentSecretKind;
  label: string;
  /** `vault:...` reference — the value itself is NEVER stored here. */
  secretRef: string | null;
  /** Display mask only, e.g. `•••• 4F2A`. */
  masked: string | null;
  storedAt: string | null;
  verifiedAt: string | null;
  manualActionUrl: string;
}

export type CompanyMutationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface CompanyComplianceTask {
  id: string;
  title: string;
  detail: string;
  priority: 'urgent' | 'high' | 'normal';
  dueDate: string | null;
  daysRemaining: number | null;
  cta: string;
  /** Super Admin tab the founder must land on. */
  ctaTab: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

let snapshot: RegistrarSnapshot = {
  readAt: null,
  mode: null,
  dataSource: null,
  record: null,
  officers: [],
  psc: [],
  filings: [],
  charges: [],
  lastError: null,
};

let confirmationStatement: ConfirmationStatementState = {
  nextDueDate: null,
  dueDateSource: 'not_read_yet',
  stage: 'detect',
  founderApprovedAt: null,
  approvedBy: null,
  filingMethod: null,
  recordedReference: null,
  recordedAt: null,
  registerConfirmedAt: null,
};

export const governmentSecrets: Record<GovernmentSecretKind, GovernmentSecretRecord> = Object.fromEntries(
  GOVERNMENT_SECRET_KINDS.map((k) => [
    k.id,
    {
      kind: k.id,
      label: k.label,
      secretRef: null,
      masked: null,
      storedAt: null,
      verifiedAt: null,
      manualActionUrl: k.manualActionUrl,
    } satisfies GovernmentSecretRecord,
  ])
) as Record<GovernmentSecretKind, GovernmentSecretRecord>;

/**
 * Demo-only vault for the secret VALUES. The live seam is Supabase Vault: the
 * record keeps `vault:<ref>` and this map is never persisted, serialised,
 * logged, exported or included in a report. Access is by reference only.
 */
const vaultValues = new Map<string, string>();
let secretSeq = 0;
let initialized = false;

export function ensureCompanyStore(): void {
  initialized = true;
}

/** Hard-reset to the unread baseline (used by the deterministic demo reset). */
export function resetCompanyStore(): void {
  snapshot = {
    readAt: null,
    mode: null,
    dataSource: null,
    record: null,
    officers: [],
    psc: [],
    filings: [],
    charges: [],
    lastError: null,
  };
  confirmationStatement = {
    nextDueDate: null,
    dueDateSource: 'not_read_yet',
    stage: 'detect',
    founderApprovedAt: null,
    approvedBy: null,
    filingMethod: null,
    recordedReference: null,
    recordedAt: null,
    registerConfirmedAt: null,
  };
  for (const k of GOVERNMENT_SECRET_KINDS) {
    governmentSecrets[k.id] = {
      kind: k.id,
      label: k.label,
      secretRef: null,
      masked: null,
      storedAt: null,
      verifiedAt: null,
      manualActionUrl: k.manualActionUrl,
    };
  }
  vaultValues.clear();
  secretSeq = 0;
  initialized = true;
}

export function getRegistrarSnapshot(): RegistrarSnapshot {
  if (!initialized) ensureCompanyStore();
  return snapshot;
}

export function getConfirmationStatement(): ConfirmationStatementState {
  if (!initialized) ensureCompanyStore();
  return confirmationStatement;
}

export function getGovernmentSecret(kind: GovernmentSecretKind): GovernmentSecretRecord {
  return governmentSecrets[kind];
}

/** The founder's company-compliance history from the canonical audit trail. */
export function companyAuditHistory(): AuditLogEntry[] {
  return demoAuditLog.filter(
    (e) => e.entityType === 'mercenta_company' || e.entityType === 'gov_identity'
  );
}

function audit(action: string, actorId: string, reason: string, metadata?: Record<string, unknown>) {
  demoAuditLog.push({
    id: `audit-company-${demoAuditLog.length + 1}-${action}`,
    createdAt: new Date().toISOString(),
    actorId,
    action,
    entityType: action.startsWith('gov_identity') ? 'gov_identity' : 'mercenta_company',
    entityId: COMPANY_REGISTRATION.companyNumber,
    reason,
    metadata: { companyNumber: COMPANY_REGISTRATION.companyNumber, ...metadata },
  });
  notifyCanonicalStoreChange();
}

/** Mask a secret for display. The full value is never returned anywhere. */
export function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 4) return '••••';
  return `•••• ${trimmed.slice(-4)}`;
}

export type DueStatus = {
  state: 'not_read' | 'overdue' | 'due_soon' | 'on_track';
  daysRemaining: number | null;
  /** The first reminder threshold the deadline has already crossed. */
  thresholdHit: number | null;
  label: string;
};

/**
 * Deterministic deadline arithmetic. A deadline is `due_soon` once it is inside
 * the widest configured reminder window (90 days) — the thresholds are the
 * single source of truth, so the panel, the command centre and the validator
 * cannot disagree.
 */
export function deriveDueStatus(dueDate: string | null, now = new Date()): DueStatus {
  if (!dueDate) {
    return { state: 'not_read', daysRemaining: null, thresholdHit: null, label: 'Due date not read from the register yet' };
  }
  const days = Math.ceil((new Date(dueDate).getTime() - now.getTime()) / DAY_MS);
  // The TIGHTEST configured window the deadline has entered (e.g. 31 days away
  // has crossed the 90- and 60-day reminders, so 60 is the one that applies).
  const crossed = [...COMPLIANCE_DEADLINE_THRESHOLDS].reverse().find((t) => days <= t) ?? null;
  if (days < 0) {
    return { state: 'overdue', daysRemaining: days, thresholdHit: 0, label: `Overdue by ${Math.abs(days)} day(s)` };
  }
  if (crossed !== null) {
    return { state: 'due_soon', daysRemaining: days, thresholdHit: crossed, label: `Due in ${days} day(s)` };
  }
  return { state: 'on_track', daysRemaining: days, thresholdHit: null, label: `Due in ${days} day(s)` };
}

function stageIndex(stage: ConfirmationStatementStage): number {
  return CONFIRMATION_STATEMENT_WORKFLOW.findIndex((s) => s.id === stage);
}

/**
 * Record a registrar read. Everything stored carries its source and its mode, so
 * the panel can never present a simulated read as the real register. A read that
 * reports a NEW confirmation-statement date moves the workflow to `prepare` and
 * raises a deadline event for the founder.
 */
export function recordRegistrarSnapshot(input: {
  mode: 'simulation' | 'live';
  actorId: string;
  record: ChCompanyRecord;
  officers?: ChOfficer[];
  psc?: ChPersonWithSignificantControl[];
  filings?: ChFiling[];
  charges?: ChCharge[];
  error?: string;
}): RegistrarSnapshot {
  const readAt = new Date().toISOString();
  snapshot = {
    readAt,
    mode: input.mode,
    dataSource: input.record.dataSource,
    record: input.record,
    officers: input.officers ?? [],
    psc: input.psc ?? [],
    filings: input.filings ?? [],
    charges: input.charges ?? [],
    lastError: input.error ?? null,
  };
  const due = input.record.nextConfirmationStatementDue ?? null;
  if (due) {
    const changed = confirmationStatement.nextDueDate !== due;
    confirmationStatement.nextDueDate = due;
    confirmationStatement.dueDateSource = 'registrar_read';
    if (changed && stageIndex(confirmationStatement.stage) < stageIndex('prepare')) {
      confirmationStatement.stage = 'prepare';
    }
    if (changed) {
      const status = deriveDueStatus(due);
      emitEvent({
        type: 'company_filing_due',
        severity: 'critical',
        title: 'Confirmation statement date read from the register',
        description: `${COMPANY_REGISTRATION.legalName} (${COMPANY_REGISTRATION.companyNumber}) — next confirmation statement ${due} · ${status.label}`,
        entityId: COMPANY_REGISTRATION.companyNumber,
        metadata: { dueDate: due, source: input.record.dataSource, mode: input.mode },
      });
    }
  }
  audit('company_registrar_read', input.actorId, `Registrar read (${input.mode}/${input.record.dataSource})`, {
    mode: input.mode,
    dataSource: input.record.dataSource,
    status: input.record.status,
    confirmationStatementDue: due,
  });
  notifyCanonicalStoreChange();
  return snapshot;
}

/** Record a read that FAILED — the failure is kept, never hidden. */
export function recordRegistrarReadFailure(input: { actorId: string; error: string }): RegistrarSnapshot {
  snapshot = { ...snapshot, lastError: input.error };
  audit('company_registrar_read_failed', input.actorId, input.error);
  return snapshot;
}

/** Move a stage forward (never backwards) — the workflow is monotonic. */
export function advanceConfirmationStatement(input: {
  stage: ConfirmationStatementStage;
  actorId: string;
}): CompanyMutationResult<ConfirmationStatementState> {
  const target = stageIndex(input.stage);
  if (target < 0) return { ok: false, error: `Unknown workflow stage "${input.stage}".` };
  if (target > stageIndex('approve') && !confirmationStatement.founderApprovedAt) {
    return {
      ok: false,
      error: 'Founder approval is required before the workflow can move past REVIEW. Nothing is filed automatically.',
    };
  }
  if (target < stageIndex(confirmationStatement.stage)) {
    return { ok: false, error: `The workflow cannot move backwards from "${confirmationStatement.stage}".` };
  }
  confirmationStatement.stage = input.stage;
  audit('company_confirmation_statement_stage', input.actorId, `Workflow stage → ${input.stage}`, {
    stage: input.stage,
  });
  notifyCanonicalStoreChange();
  return { ok: true, value: confirmationStatement };
}

/** §22–§25 — the founder's explicit approval gate. */
export function approveConfirmationStatement(input: {
  actorId: string;
}): CompanyMutationResult<ConfirmationStatementState> {
  if (confirmationStatement.dueDateSource !== 'registrar_read' || !confirmationStatement.nextDueDate) {
    return {
      ok: false,
      error: 'There is no registrar-read confirmation statement date to approve. Read the register first.',
    };
  }
  if (confirmationStatement.founderApprovedAt) {
    return { ok: false, error: 'The confirmation statement is already approved.' };
  }
  confirmationStatement.founderApprovedAt = new Date().toISOString();
  confirmationStatement.approvedBy = input.actorId;
  confirmationStatement.stage = 'file';
  audit('company_confirmation_statement_approved', input.actorId, 'Founder approved the confirmation statement', {
    dueDate: confirmationStatement.nextDueDate,
  });
  notifyCanonicalStoreChange();
  return { ok: true, value: confirmationStatement };
}

/**
 * §22–§25 — the official-API path. REFUSES while Mercenta holds no official
 * filing channel: it must never be possible to imply an automated filing.
 */
export function fileViaOfficialApi(input: {
  actorId: string;
}): CompanyMutationResult<ConfirmationStatementState> {
  if (!OFFICIAL_CONFIRMATION_STATEMENT_FILING_CONFIGURED) {
    return {
      ok: false,
      error:
        'No official electronic-filing channel is connected for Companies House. Mercenta does not submit this filing automatically — complete it on the official Companies House service and record the reference.',
    };
  }
  if (!confirmationStatement.founderApprovedAt) {
    return { ok: false, error: 'Founder approval is required before any filing.' };
  }
  return { ok: false, error: 'No official filing adapter is implemented for this provider.' };
}

/**
 * §22–§25 — record a filing the FOUNDER actually completed on the official
 * register. Requires the approval gate and a real reference, and leaves the
 * state at `verify` (NOT verified) until a later registrar read confirms it.
 */
export function recordManualFiling(input: {
  reference: string;
  filedAt: string;
  actorId: string;
}): CompanyMutationResult<ConfirmationStatementState> {
  if (!confirmationStatement.founderApprovedAt) {
    return { ok: false, error: 'Founder approval is required before a filing can be recorded.' };
  }
  const reference = input.reference.trim();
  if (reference.length < 4) {
    return { ok: false, error: 'A Companies House filing reference is required — nothing is recorded without it.' };
  }
  if (!input.filedAt) {
    return { ok: false, error: 'The date the filing was made is required.' };
  }
  confirmationStatement.filingMethod = 'manual_register';
  confirmationStatement.recordedReference = reference;
  confirmationStatement.recordedAt = new Date().toISOString();
  confirmationStatement.stage = 'verify';
  audit(
    'company_confirmation_statement_recorded',
    input.actorId,
    'Founder recorded a confirmation statement filed on the official Companies House service (Mercenta did not submit it)',
    { reference, filedAt: input.filedAt, method: 'manual_register' }
  );
  notifyCanonicalStoreChange();
  return { ok: true, value: confirmationStatement };
}

/**
 * §22–§25 — verification. Only a registrar read that happened AFTER the
 * reference was recorded can verify the filing; anything else is refused.
 */
export function confirmConfirmationStatementFromRegister(input: {
  actorId: string;
}): CompanyMutationResult<ConfirmationStatementState> {
  if (!confirmationStatement.recordedAt) {
    return { ok: false, error: 'No filing has been recorded, so there is nothing to verify.' };
  }
  if (!snapshot.readAt || new Date(snapshot.readAt).getTime() <= new Date(confirmationStatement.recordedAt).getTime()) {
    return {
      ok: false,
      error:
        'The register has not been re-read since the filing was recorded. Read the register again before claiming the filing is verified.',
    };
  }
  confirmationStatement.registerConfirmedAt = new Date().toISOString();
  confirmationStatement.stage = 'verified';
  emitEvent({
    type: 'company_verified',
    severity: 'informational',
    title: 'Confirmation statement verified against the register',
    description: `${COMPANY_REGISTRATION.legalName} — registrar re-read confirmed the filing (reference ${confirmationStatement.recordedReference}).`,
    entityId: COMPANY_REGISTRATION.companyNumber,
    metadata: { reference: confirmationStatement.recordedReference, readAt: snapshot.readAt },
  });
  audit('company_confirmation_statement_verified', input.actorId, 'Registrar re-read confirmed the recorded filing', {
    reference: confirmationStatement.recordedReference,
  });
  notifyCanonicalStoreChange();
  return { ok: true, value: confirmationStatement };
}





/**
 * §25/§34 — the founder's company-compliance task list, DERIVED from the real
 * state (never a parallel hand-maintained list). These are the tasks the Super
 * Admin command centre surfaces.
 */
export function companyComplianceTasks(now = new Date()): CompanyComplianceTask[] {
  const tasks: CompanyComplianceTask[] = [];
  const cs = deriveDueStatus(confirmationStatement.nextDueDate, now);
  const record = snapshot.record;

  if (!snapshot.readAt) {
    tasks.push({
      id: 'company-read-register',
      title: 'Read the Companies House register for Mercenta Partners Ltd',
      detail: 'No registrar read has been made yet, so the compliance position is unknown.',
      priority: 'high',
      dueDate: null,
      daysRemaining: null,
      cta: 'Read company record',
      ctaTab: 'company',
    });
  } else if (snapshot.lastError) {
    tasks.push({
      id: 'company-read-failed',
      title: 'The last registrar read failed',
      detail: snapshot.lastError,
      priority: 'high',
      dueDate: null,
      daysRemaining: null,
      cta: 'Retry the read',
      ctaTab: 'company',
    });
  }

  if (confirmationStatement.nextDueDate) {
    const stage = confirmationStatement.stage;
    const urgent = cs.state === 'overdue' || (cs.daysRemaining !== null && cs.daysRemaining <= 30);
    const cta =
      stage === 'detect' || stage === 'prepare'
        ? 'Review confirmation statement'
        : stage === 'file'
          ? 'Approve & file'
          : stage === 'verify'
            ? 'Verify on the register'
            : 'Review filing';
    tasks.push({
      id: 'company-confirmation-statement',
      title: `Confirmation statement due ${confirmationStatement.nextDueDate}`,
      detail: `${cs.label}. Workflow stage: ${stage}.${
        stage === 'verify' ? ' Recorded on the official service — re-read the register to verify.' : ''
      }`,
      priority: urgent ? 'urgent' : 'normal',
      dueDate: confirmationStatement.nextDueDate,
      daysRemaining: cs.daysRemaining,
      cta,
      ctaTab: 'company',
    });
  }

  if (record?.nextAccountsDue) {
    const acc = deriveDueStatus(record.nextAccountsDue, now);
    tasks.push({
      id: 'company-accounts',
      title: `Annual accounts due ${record.nextAccountsDue}`,
      detail: `${acc.label}. Accounts are prepared outside Mercenta and must be filed on the official service.`,
      priority: acc.state === 'overdue' || (acc.daysRemaining !== null && acc.daysRemaining <= 30) ? 'urgent' : 'normal',
      dueDate: record.nextAccountsDue,
      daysRemaining: acc.daysRemaining,
      cta: 'Open Companies House filing',
      ctaTab: 'company',
    });
  }

  const missingSecrets = GOVERNMENT_SECRET_KINDS.filter((k) => !governmentSecrets[k.id].secretRef);
  if (missingSecrets.length > 0) {
    tasks.push({
      id: 'company-government-secrets',
      title: `${missingSecrets.length} government credential(s) not yet stored`,
      detail: `Missing: ${missingSecrets
        .map((k) => k.label)
        .join(', ')}. These are entered by the founder and held as masked references only.`,
      priority: 'normal',
      dueDate: null,
      daysRemaining: null,
      cta: 'Store credential',
      ctaTab: 'company',
    });
  }
  return tasks;
}



/* ── §23/§25 — the government credential vault (masked references only) ─── */

/**
 * Store a government secret the founder entered. The VALUE is written to the
 * vault seam and immediately discarded here: the record keeps only a
 * `vault:<ref>` reference and a display mask. The value is NEVER returned, logged,
 * put in the audit trail, put in metadata, put in a report or put in the ZIP.
 */
export function storeGovernmentSecret(input: {
  kind: GovernmentSecretKind;
  value: string;
  actorId: string;
}): CompanyMutationResult<GovernmentSecretRecord> {
  const spec = GOVERNMENT_SECRET_KINDS.find((k) => k.id === input.kind);
  if (!spec) return { ok: false, error: `Unknown government credential "${input.kind}".` };
  const value = input.value.trim();
  if (value.length < 4) {
    return { ok: false, error: 'That value is too short to be a credential — nothing was stored.' };
  }
  secretSeq += 1;
  const secretRef = `vault:gov-${spec.id}-${secretSeq}`;
  vaultValues.set(secretRef, value);
  const next: GovernmentSecretRecord = {
    ...governmentSecrets[spec.id],
    secretRef,
    masked: maskSecret(value),
    storedAt: new Date().toISOString(),
    verifiedAt: null,
  };
  governmentSecrets[spec.id] = next;
  // NOTE: metadata deliberately contains NO part of the value.
  audit('gov_identity_secret_stored', input.actorId, `${spec.label} stored as a masked reference`, {
    kind: spec.id,
    secretRef,
    masked: next.masked,
  });
  return { ok: true, value: next };
}

/** The founder confirms the stored credential works. Still never exposes it. */
export function markGovernmentSecretVerified(input: {
  kind: GovernmentSecretKind;
  actorId: string;
}): CompanyMutationResult<GovernmentSecretRecord> {
  const current = governmentSecrets[input.kind];
  if (!current?.secretRef) return { ok: false, error: 'No credential is stored for that item yet.' };
  const next = { ...current, verifiedAt: new Date().toISOString() };
  governmentSecrets[input.kind] = next;
  audit('gov_identity_secret_verified', input.actorId, `${current.label} confirmed working by the founder`, {
    kind: input.kind,
    secretRef: current.secretRef,
  });
  return { ok: true, value: next };
}

/** Remove a stored credential reference. The vault value is dropped with it. */
export function clearGovernmentSecret(input: {
  kind: GovernmentSecretKind;
  actorId: string;
}): CompanyMutationResult<GovernmentSecretRecord> {
  const current = governmentSecrets[input.kind];
  if (!current?.secretRef) return { ok: false, error: 'No credential is stored for that item.' };
  if (current.secretRef) vaultValues.delete(current.secretRef);
  const next: GovernmentSecretRecord = {
    ...current,
    secretRef: null,
    masked: null,
    storedAt: null,
    verifiedAt: null,
  };
  governmentSecrets[input.kind] = next;
  audit('gov_identity_secret_cleared', input.actorId, `${current.label} reference removed`, {
    kind: input.kind,
  });
  return { ok: true, value: next };
}

/** Test seam: proves the vault holds a value for a reference without revealing it. */
export function vaultHasValue(secretRef: string): boolean {
  return vaultValues.has(secretRef);
}
