/**
 * §31 — MERCENTA LAUNCH CENTRE store.
 *
 * The founder's own progress across the 14 startup/MVP platforms: which account
 * exists, whether the profile has been prepared, whether it has been submitted, and
 * the launch date. Mercenta's OWN launch state — never brand data.
 *
 * PERSISTENCE CONTRACT (documented, matching `demoStore`): in-memory for the demo
 * session; a full reload re-boots deterministically. The live-persistence seam is
 * the same optional Supabase dual-write used elsewhere.
 *
 * AUDIT: every state transition that matters (profile prepared, marked submitted,
 * account recorded) appends to the CANONICAL audit trail (`demoStore.demoAuditLog`)
 * with an actor, so the founder's launch history is attributable and never silent.
 */
import { demoAuditLog } from './demoStore';
import type { AuditLogEntry } from '@/types';
import { LAUNCH_PLATFORMS } from '@/config/launchPlatforms';

export type LaunchAccountStatus = 'not_started' | 'account_created' | 'blocked';
export type LaunchProfileStatus = 'not_prepared' | 'prepared' | 'submitted';

export interface LaunchRecord {
  platformId: string;
  accountStatus: LaunchAccountStatus;
  profileStatus: LaunchProfileStatus;
  /** Where the founder edits the profile on the platform, once it exists. */
  profileUrl: string;
  /** ISO date the founder intends to launch, if scheduled. */
  launchDate: string | null;
  /** ISO timestamp of the explicit "Mark Submitted" action, if it happened. */
  submittedAt: string | null;
  notes: string;
}

const KNOWN_PLATFORM_IDS = new Set(LAUNCH_PLATFORMS.map((p) => p.id));

function blankRecord(platformId: string): LaunchRecord {
  return {
    platformId,
    accountStatus: 'not_started',
    profileStatus: 'not_prepared',
    profileUrl: '',
    launchDate: null,
    submittedAt: null,
    notes: '',
  };
}

let records: LaunchRecord[] = LAUNCH_PLATFORMS.map((p) => blankRecord(p.id));
let initialized = false;

/** Boot the store once per session (deterministic, empty baseline). */
export function ensureLaunchStore(): void {
  if (initialized) return;
  initialized = true;
  records = LAUNCH_PLATFORMS.map((p) => blankRecord(p.id));
}

export function getLaunchRecords(): LaunchRecord[] {
  ensureLaunchStore();
  return records;
}

export function getLaunchRecord(platformId: string): LaunchRecord | undefined {
  ensureLaunchStore();
  return records.find((r) => r.platformId === platformId);
}

/** The founder's launch history from the canonical audit trail. */
export function launchAuditHistory(): AuditLogEntry[] {
  return demoAuditLog.filter((e) => e.entityType === 'mercenta_launch_platform');
}

function appendAudit(record: LaunchRecord, action: string, actorId: string, reason?: string) {
  demoAuditLog.push({
    id: `audit-launch-${demoAuditLog.length + 1}-${record.platformId}`,
    createdAt: new Date().toISOString(),
    actorId,
    action,
    entityType: 'mercenta_launch_platform',
    entityId: record.platformId,
    reason: reason ?? '',
    metadata: {
      accountStatus: record.accountStatus,
      profileStatus: record.profileStatus,
      launchDate: record.launchDate,
    },
  });
}

export type LaunchMutationResult =
  | { ok: true; record: LaunchRecord }
  | { ok: false; error: string };

/**
 * Update a platform's launch state. An unknown platform is REFUSED (fail-closed)
 * rather than silently creating a record for a platform Mercenta does not track.
 */
export function updateLaunchRecord(input: {
  platformId: string;
  actorId: string;
  patch: Partial<Pick<LaunchRecord, 'accountStatus' | 'profileStatus' | 'profileUrl' | 'launchDate' | 'notes'>>;
  reason?: string;
}): LaunchMutationResult {
  ensureLaunchStore();
  if (!KNOWN_PLATFORM_IDS.has(input.platformId)) {
    return {
      ok: false,
      error: `"${input.platformId}" is not one of the ${LAUNCH_PLATFORMS.length} tracked launch platforms.`,
    };
  }
  const idx = records.findIndex((r) => r.platformId === input.platformId);
  if (idx === -1) return { ok: false, error: 'Launch record not found.' };

  const next: LaunchRecord = { ...records[idx], ...input.patch };
  records[idx] = next;
  appendAudit(next, 'launch_platform_updated', input.actorId, input.reason);
  return { ok: true, record: next };
}

/** §31 [Mark Submitted] — the explicit, attributable transition. */
export function markLaunchSubmitted(input: {
  platformId: string;
  actorId: string;
  launchDate?: string | null;
}): LaunchMutationResult {
  ensureLaunchStore();
  const existing = records.find((r) => r.platformId === input.platformId);
  if (!existing) {
    return { ok: false, error: `"${input.platformId}" is not a tracked launch platform.` };
  }
  const next: LaunchRecord = {
    ...existing,
    accountStatus: existing.accountStatus === 'not_started' ? 'account_created' : existing.accountStatus,
    profileStatus: 'submitted',
    submittedAt: new Date().toISOString(),
    launchDate: input.launchDate ?? existing.launchDate,
  };
  const idx = records.findIndex((r) => r.platformId === input.platformId);
  records[idx] = next;
  appendAudit(next, 'launch_platform_submitted', input.actorId, 'Marked submitted by the founder');
  return { ok: true, record: next };
}

/** Return the store to its empty baseline (used by the deterministic demo reset). */
export function resetLaunchStore(): void {
  records = LAUNCH_PLATFORMS.map((p) => blankRecord(p.id));
  initialized = true;
}

/** Progress summary for the centre's header. */
export function getLaunchSummary(): {
  total: number;
  accountsCreated: number;
  prepared: number;
  submitted: number;
} {
  const all = getLaunchRecords();
  return {
    total: all.length,
    accountsCreated: all.filter((r) => r.accountStatus !== 'not_started').length,
    prepared: all.filter((r) => r.profileStatus !== 'not_prepared').length,
    submitted: all.filter((r) => r.profileStatus === 'submitted').length,
  };
}