/**
 * §21 (M13 Phase 8) — GOOGLE SETUP WIZARD (Super Admin only).
 *
 * One-click setup for the founder's personal Google account:
 *   1. enter the PUBLIC OAuth client id (never a secret);
 *   2. [Connect Google] opens Google's real authorization page in a popup and
 *      hands the returned code back to the app through the existing
 *      `/oauth/callback.html` contract;
 *   3. the code is recorded as EXCHANGE PENDING — the wizard never reports
 *      'connected' before a server-side exchange is confirmed, and it never
 *      touches the account password or stores a token;
 *   4. [Run workspace setup] creates the Drive folder structure, master sheets,
 *      templates and the four API capability tests through the mock-first Google
 *      client, reporting every step's real outcome and labelling a simulated run.
 *
 * RBAC: mounted inside SuperAdminPanel; the Super Admin tier is re-checked here.
 */
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Input } from '@/components/ui';
import { cn } from '@/utils/cn';
import { useApp } from '@/context/GlobalStateContext';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { isProviderSimulationSafe, resolveProviderMode } from '@/integrations/types';
import { googleConnectionCredentials } from '@/integrations/connections';
import { createGoogleClientForConnection } from '@/lib/google/index';
import { runGoogleWorkspaceSetup, type GoogleSetupStepResult } from '@/lib/google/workspaceSetup';
import {
  GOOGLE_ACCOUNT,
  GOOGLE_OAUTH,
  GOOGLE_SCOPES,
  GOOGLE_SETUP_DISCLAIMER,
  GOOGLE_WORKSPACE_PLAN,
} from '@/config/google';
import {
  ensureGoogleStore,
  getGoogleOAuthRecord,
  getGoogleSetupRun,
  googleAuditHistory,
  markGoogleConnected,
  recordGoogleCodeReceived,
  resetGoogleStore,
  saveGoogleSetupRun,
  setGoogleClientId,
  type GoogleOAuthRecord,
  type GoogleSetupRun,
} from '@/data/googleStore';
import { ExternalLink, FolderPlus, ShieldCheck, Link2, PlayCircle } from 'lucide-react';

const GOOGLE_EDGE_BASE = '/functions/v1/google';

export function GoogleSetupWizard() {
  const { session } = useApp();
  const { modes } = useIntegrations();
  const [oauth, setOauth] = useState<GoogleOAuthRecord>(() => {
    ensureGoogleStore();
    return getGoogleOAuthRecord();
  });
  const [run, setRun] = useState<GoogleSetupRun | null>(() => getGoogleSetupRun());
  const [auditCount, setAuditCount] = useState(() => googleAuditHistory().length);
  const [clientIdDraft, setClientIdDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const isSuperAdmin = session?.tier === 'super_admin';
  const googleMode = resolveProviderMode(modes, 'google');
  const googleSimulationSafe = isProviderSimulationSafe(googleMode);
  const canRunSetup = googleSimulationSafe || googleMode === 'live';
  const actorId = 'super-admin:founder';

  useEffect(() => {
    ensureGoogleStore();
  }, []);

  const refresh = useCallback(() => {
    setOauth(getGoogleOAuthRecord());
    setRun(getGoogleSetupRun());
    setAuditCount(googleAuditHistory().length);
  }, []);

  /** Record the public client id, then open Google's REAL authorization page. */
  const connectGoogle = () => {
    setMessage('');
    const clientId = clientIdDraft.trim() || oauth.clientId || '';
    const saved = setGoogleClientId({ clientId, actorId });
    if (!saved.ok) {
      setMessage(saved.error ?? 'The client id was not recorded.');
      return;
    }
    const params = new URLSearchParams({
      [GOOGLE_OAUTH.clientIdParam]: clientId,
      ...GOOGLE_OAUTH.extraParams,
      scope: GOOGLE_SCOPES.join(' '),
      state: `google:${Date.now()}`,
      redirect_uri: window.location.origin + GOOGLE_OAUTH.redirectPath,
    });
    const popup = window.open(
      `${GOOGLE_OAUTH.authorizeUrlBase}?${params.toString()}`,
      'mercenta-google-oauth',
      'width=560,height=760'
    );
    if (!popup) {
      setMessage('Popup blocked — allow popups for this site and try again.');
      refresh();
      return;
    }
    const onMessage = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      if (ev.data?.source !== 'mercenta-oauth') return;
      window.removeEventListener('message', onMessage);
      const code = ev.data.code as string | null;
      if (!code) {
        setMessage('Google returned no authorization code — nothing was recorded and nothing is connected.');
        refresh();
        return;
      }
      recordGoogleCodeReceived({ actorId, codePreview: `${code.slice(0, 6)}…` });
      setMessage(
        'Authorization code received. It is NOT connected yet: the token exchange must run server-side, and no token is ever stored in the browser.'
      );
      refresh();
    };
    window.addEventListener('message', onMessage);
    setMessage('Complete the authorization in the Google window. Mercenta never sees or stores your password.');
    refresh();
  };

  /** Create the Drive structure / master sheets / templates / capability tests. */
  const runSetup = async () => {
    setBusy(true);
    setMessage('');
    try {
      const { client, mode } = createGoogleClientForConnection(
        googleConnectionCredentials,
        GOOGLE_EDGE_BASE
      );
      const steps: GoogleSetupStepResult[] = await runGoogleWorkspaceSetup({
        client,
        plan: GOOGLE_WORKSPACE_PLAN,
        today: new Date().toISOString().slice(0, 10),
      });
      const saved = saveGoogleSetupRun({ steps, mode: mode === 'real' ? 'live' : 'simulation', actorId });
      setMessage(
        mode === 'real'
          ? `Live run complete: ${saved.created}/${saved.steps.length} items created.`
          : `SIMULATED run complete: ${saved.created}/${saved.steps.length} items created in the simulated Drive. Nothing was created in Google.`
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'The Google workspace setup failed.');
    } finally {
      setBusy(false);
      refresh();
    }
  };

  if (!isSuperAdmin) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Super Admin access required</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              The Google connection and workspace setup are restricted to the Super Admin tier.
            </p>
          </div>
        </div>
      </Card>
    );
  }
const capabilitySteps = run?.steps.filter((s) => s.capabilityTest) ?? [];

  return (
    <div className="space-y-4" data-testid="google-setup-wizard">
      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Link2 className="w-4 h-4" /> Google setup — {GOOGLE_ACCOUNT.email}
            </h2>
            <p className="text-ds-label text-zinc-500 mt-1">{GOOGLE_SETUP_DISCLAIMER}</p>
            <p className="text-ds-label text-zinc-500 mt-1">{GOOGLE_ACCOUNT.note}</p>
          </div>
          <Badge
            className={cn(
              'text-ds-micro',
              googleMode === 'live'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                : googleSimulationSafe
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                  : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
            )}
          >
            Google: {String(googleMode)}
          </Badge>
        </div>
        <div className="grid gap-2 sm:grid-cols-4 mt-4 text-ds-label">
          <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
            <p className="text-ds-micro text-zinc-500">Account type</p>
            <p className="text-sm font-bold text-white">Personal</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
            <p className="text-ds-micro text-zinc-500">OAuth client id</p>
            <p className="text-sm font-bold text-white">{oauth.clientId ? 'recorded' : 'not entered'}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
            <p className="text-ds-micro text-zinc-500">Connection</p>
            <p className="text-sm font-bold text-white" data-testid="google-connection-state">{oauth.state}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
            <p className="text-ds-micro text-zinc-500">Audit entries</p>
            <p className="text-sm font-bold text-white">{auditCount}</p>
          </div>
        </div>
        <p className="text-ds-micro text-zinc-500 mt-2" data-testid="google-connection-note">
          {oauth.note}
        </p>
        {message && (
          <p className="text-ds-micro text-emerald-300/90 mt-2" data-testid="google-setup-message">
            {message}
          </p>
        )}
      </Card>

      <Card className="p-5" title="1. Authorize Google" subtitle="OAuth only — no password, ever">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            label={GOOGLE_OAUTH.clientIdLabel}
            value={clientIdDraft || oauth.clientId || ''}
            onChange={(e) => setClientIdDraft(e.target.value)}
            placeholder="xxxxxxxx.apps.googleusercontent.com"
          />
          <div className="flex items-end gap-2">
            <Button variant="primary" size="sm" className="text-xs" onClick={connectGoogle} data-state="connect-google">
              Connect Google
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              className="text-xs"
              onClick={() => {
                const next = markGoogleConnected({ actorId });
                setMessage(
                  next.state === 'connected'
                    ? 'Connection marked verified (server-side exchange confirmed).'
                    : 'Connection state unchanged.'
                );
                refresh();
              }}
            >
              Confirm exchange complete
            </Button>
            <a
              className="inline-flex items-center gap-1 text-ds-micro text-sky-300/90"
              href={GOOGLE_OAUTH.consoleUrl}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="w-3 h-3" /> Google Cloud credentials
            </a>
          </div>
        </div>
        <div className="mt-3">
          <p className="text-ds-micro text-zinc-500">Scopes requested (least privilege, files Mercenta creates):</p>
          <ul className="mt-1 space-y-0.5">
            {GOOGLE_SCOPES.map((s) => (
              <li key={s} className="text-ds-micro font-mono text-zinc-400">
                {s}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-ds-micro text-amber-300/80 mt-2">
          Google is reported as <span className="font-mono">{oauth.state}</span> — an authorization code alone is NOT a
          connection. The refresh token lives in the server-side secret store only.
        </p>
      </Card>
<Card
        className="p-5"
        title={`2. Workspace setup — ${GOOGLE_WORKSPACE_PLAN.length} items`}
        subtitle="Folders, master sheets, templates and four API capability tests"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            className="text-xs"
            loading={busy}
            disabled={!canRunSetup}
            onClick={() => void runSetup()}
          >
            <PlayCircle className="w-3 h-3 mr-1" /> Run workspace setup
          </Button>
          <Button variant="tertiary" size="sm" className="text-xs" onClick={() => { resetGoogleStore(); setMessage('Setup state cleared.'); refresh(); }}>
            Clear setup state
          </Button>
          <span className="text-ds-micro text-zinc-500">
            {canRunSetup
              ? googleSimulationSafe
                ? 'Runs against the SIMULATED Google client — nothing is created in Google.'
                : 'Runs against the connected Google APIs.'
              : `Google resolves '${String(googleMode)}' — not simulation-safe and not live, so setup is blocked.`}
          </span>
        </div>

        {run ? (
          <div className="mt-3">
            <div className="grid gap-2 sm:grid-cols-4 text-ds-label">
              <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
                <p className="text-ds-micro text-zinc-500">Created</p>
                <p className="text-sm font-bold text-white" data-testid="google-run-created">
                  {run.created}/{run.steps.length}
                </p>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
                <p className="text-ds-micro text-zinc-500">Failed</p>
                <p className="text-sm font-bold text-white">{run.failed}</p>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
                <p className="text-ds-micro text-zinc-500">Capability tests</p>
                <p className="text-sm font-bold text-white">
                  {run.capabilityTestsPassed}/{run.capabilityTestsTotal}
                </p>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-2">
                <p className="text-ds-micro text-zinc-500">Mode</p>
                <p className="text-sm font-bold text-white" data-testid="google-run-mode">
                  {run.mode}
                </p>
              </div>
            </div>
            <p className="text-ds-micro text-zinc-500 mt-2">
              Last run {new Date(run.ranAt).toLocaleString()} · {run.skipped} skipped
              {run.mode === 'simulation' ? ' · SIMULATED — no Google file was created' : ''}
            </p>
            <ul className="mt-3 space-y-1 max-h-72 overflow-y-auto" data-testid="google-setup-steps">
              {run.steps.map((s) => (
                <li
                  key={s.itemId}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-ink-850 px-2.5 py-1.5"
                  data-testid="google-setup-step"
                >
                  <span className="text-ds-label text-zinc-300">
                    {s.name} <span className="text-zinc-600">· {s.kind}{s.capabilityTest ? ' · capability test' : ''}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {s.attempts > 1 && <span className="text-ds-micro text-zinc-600">retried</span>}
                    <Badge
                      className={cn(
                        'text-ds-micro',
                        s.status === 'created'
                          ? s.simulated
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                          : s.status === 'failed'
                            ? 'bg-red-500/15 text-red-300 border-red-500/20'
                            : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
                      )}
                    >
                      {s.status === 'created' && s.simulated ? 'SIMULATED' : s.status}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
            {capabilitySteps.length > 0 && (
              <p className="text-ds-micro text-zinc-500 mt-2">
                Capability proof: {capabilitySteps.map((s) => s.kind).join(' · ')}
              </p>
            )}
          </div>
        ) : (
          <p className="text-ds-label text-zinc-500 mt-3" data-testid="google-setup-not-run">
            The workspace has not been created yet. Folder structure, master sheets, templates and the four capability
            tests are all pending.
          </p>
        )}

        <details className="mt-3">
          <summary className="text-ds-label text-zinc-400 cursor-pointer flex items-center gap-1">
            <FolderPlus className="w-3 h-3" /> Planned structure ({GOOGLE_WORKSPACE_PLAN.length} items)
          </summary>
          <ul className="mt-2 space-y-0.5">
            {GOOGLE_WORKSPACE_PLAN.map((p) => (
              <li key={p.id} className="text-ds-micro text-zinc-500">
                {p.kind === 'folder' ? '📁' : p.kind === 'sheet' ? '📊' : p.kind === 'doc' ? '📄' : p.kind === 'slides' ? '🖼' : '📅'}{' '}
                {p.parent ? `${p.parent} / ` : ''}
                {p.name} — {p.purpose}
              </li>
            ))}
          </ul>
        </details>
      </Card>
    </div>
  );
}