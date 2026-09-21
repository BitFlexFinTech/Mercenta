/**
 * §21 (M13 Phase 8) — GOOGLE workspace store.
 *
 * Keeps the founder's Google setup state: the last run of the workspace setup,
 * every step's real outcome, and the OAuth connection facts the wizard may
 * honestly report (`code_received` is NOT `connected`).
 *
 * SECURITY: this store holds NO tokens and NO credentials — not even masked.
 * The OAuth exchange belongs to the server-side secret store; the browser only
 * ever sees the connection STATUS from `IntegrationsContext`.
 *
 * AUDIT: every setup run and every connection fact the wizard records is appended
 * to the canonical audit trail (`demoStore.demoAuditLog`) with an actor.
 */
import { demoAuditLog } from './demoStore';
import type { AuditLogEntry } from '@/types';
import { GOOGLE_ACCOUNT, GOOGLE_WORKSPACE_PLAN } from '@/config/google';
import { summariseGoogleRun, type GoogleSetupStepResult } from '@/lib/google/workspaceSetup';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';

export interface GoogleSetupRun {
  ranAt: string;
  mode: 'simulation' | 'live';
  steps: GoogleSetupStepResult[];
  created: number;
  failed: number;
  skipped: number;
  capabilityTestsPassed: number;
  capabilityTestsTotal: number;
}

export interface GoogleOAuthRecord {
  /** The public OAuth client id the founder entered (never a secret). */
  clientId: string | null;
  /** 'none' | 'exchange_pending' | 'connected' */
  state: 'none' | 'exchange_pending' | 'connected';
  codeReceivedAt: string | null;
  /** Preview only — the code itself is never stored. */
  codePreview: string | null;
  note: string;
}

let run: GoogleSetupRun | null = null;
let oauth: GoogleOAuthRecord = {
  clientId: null,
  state: 'none',
  codeReceivedAt: null,
  codePreview: null,
  note: 'No Google authorization has been completed yet.',
};
let initialized = false;

export function ensureGoogleStore(): void {
  initialized = true;
}

export function resetGoogleStore(): void {
  run = null;
  oauth = {
    clientId: null,
    state: 'none',
    codeReceivedAt: null,
    codePreview: null,
    note: 'No Google authorization has been completed yet.',
  };
  initialized = true;
}

export function getGoogleSetupRun(): GoogleSetupRun | null {
  if (!initialized) ensureGoogleStore();
  return run;
}

export function getGoogleOAuthRecord(): GoogleOAuthRecord {
  if (!initialized) ensureGoogleStore();
  return oauth;
}

function audit(action: string, actorId: string, reason: string, metadata?: Record<string, unknown>) {
  demoAuditLog.push({
    id: `audit-google-${demoAuditLog.length + 1}-${action}`,
    createdAt: new Date().toISOString(),
    actorId,
    action,
    entityType: 'google_workspace',
    entityId: GOOGLE_ACCOUNT.email,
    reason,
    metadata: { account: GOOGLE_ACCOUNT.email, ...metadata },
  });
  notifyCanonicalStoreChange();
}

/** Record the founder's public OAuth client id (never a secret, never a token). */
export function setGoogleClientId(input: { clientId: string; actorId: string }): { ok: boolean; error?: string } {
  const clientId = input.clientId.trim();
  if (clientId.length < 10) {
    return { ok: false, error: 'That does not look like a Google OAuth client id — nothing was recorded.' };
  }
  oauth = { ...oauth, clientId };
  audit('google_client_id_recorded', input.actorId, 'Google OAuth client id recorded (public identifier only)', {
    clientIdSuffix: clientId.slice(-12),
  });
  return { ok: true };
}

/**
 * Record that Google returned an authorization code. This is deliberately NOT
 * 'connected': the code must still be exchanged server-side, and the refresh
 * token must never exist in the browser.
 */
export function recordGoogleCodeReceived(input: {
  actorId: string;
  codePreview: string;
}): GoogleOAuthRecord {
  oauth = {
    ...oauth,
    state: 'exchange_pending',
    codeReceivedAt: new Date().toISOString(),
    // Preview only — the code itself is discarded.
    codePreview: input.codePreview,
    note:
      'Authorization code received. The token exchange and refresh-token storage happen server-side; Google is NOT yet reported as connected.',
  };
  audit('google_oauth_code_received', input.actorId, 'Google authorization code received — exchange pending server-side', {
    codePreview: input.codePreview,
  });
  return oauth;
}

/** Mark the connection live ONLY after a real server-side exchange is confirmed. */
export function markGoogleConnected(input: { actorId: string }): GoogleOAuthRecord {
  oauth = {
    ...oauth,
    state: 'connected',
    note: 'The server-side token exchange succeeded and the connection is verified.',
  };
  audit('google_connected', input.actorId, 'Google connection verified through the server-side exchange');
  return oauth;
}

/** Persist a completed workspace setup run. */
export function saveGoogleSetupRun(input: {
  steps: GoogleSetupStepResult[];
  mode: 'simulation' | 'live';
  actorId: string;
}): GoogleSetupRun {
  const summary = summariseGoogleRun(input.steps);
  run = {
    ranAt: new Date().toISOString(),
    mode: input.mode,
    steps: input.steps,
    created: summary.created,
    failed: summary.failed,
    skipped: summary.skipped,
    capabilityTestsPassed: summary.capabilityTestsPassed,
    capabilityTestsTotal: summary.capabilityTestsTotal,
  };
  audit(
    'google_workspace_setup_run',
    input.actorId,
    `Google workspace setup ran (${input.mode}) — ${summary.created}/${summary.total} created, ${summary.failed} failed`,
    {
      mode: input.mode,
      created: summary.created,
      failed: summary.failed,
      skipped: summary.skipped,
      simulated: summary.simulated,
    }
  );
  return run;
}

export function googleAuditHistory(): AuditLogEntry[] {
  return demoAuditLog.filter((e) => e.entityType === 'google_workspace');
}

/** §34 — the founder's next actions for the Google integration. */
export function googleSetupTasks(): {
  id: string;
  title: string;
  detail: string;
  priority: 'urgent' | 'high' | 'normal';
  cta: string;
  ctaTab: string;
}[] {
  const tasks: {
    id: string;
    title: string;
    detail: string;
    priority: 'urgent' | 'high' | 'normal';
    cta: string;
    ctaTab: string;
  }[] = [];
  if (!oauth.clientId) {
    tasks.push({
      id: 'google-client-id',
      title: 'Enter the Google OAuth client id',
      detail: `Create an OAuth client in Google Cloud Console, then enter its id for ${GOOGLE_ACCOUNT.email}.`,
      priority: 'normal',
      cta: 'Open Google setup',
      ctaTab: 'google',
    });
  }
  if (oauth.state === 'exchange_pending') {
    tasks.push({
      id: 'google-exchange',
      title: 'Google authorization code received — server-side exchange pending',
      detail: 'The token exchange requires the deployed Edge Function; the refresh token is never held in the browser.',
      priority: 'high',
      cta: 'Review Google setup',
      ctaTab: 'google',
    });
  }
  if (!run) {
    tasks.push({
      id: 'google-workspace-setup',
      title: `Create the ${GOOGLE_WORKSPACE_PLAN.length}-item Google workspace`,
      detail: 'Folders, master sheets, templates and the four capability tests have not been run yet.',
      priority: 'normal',
      cta: 'Run workspace setup',
      ctaTab: 'google',
    });
  } else if (run.failed > 0) {
    tasks.push({
      id: 'google-workspace-setup-failed',
      title: `${run.failed} Google workspace item(s) failed to create`,
      detail: 'Re-run the setup and review the per-item errors.',
      priority: 'high',
      cta: 'Re-run workspace setup',
      ctaTab: 'google',
    });
  }
  return tasks;
}
