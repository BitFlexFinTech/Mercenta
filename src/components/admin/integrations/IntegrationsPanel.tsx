import { useState } from 'react';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { rememberApiKey } from '@/integrations/types';
import { pingForService } from '@/lib/integrations/testCalls';
import { INTEGRATION_ORDER, INTEGRATION_REGISTRY } from '@/integrations/registry';
import type { IntegrationId, IntegrationState } from '@/integrations/types';
import { Badge, Button, Card, Input } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plug,
  RefreshCw,
  ShieldCheck,
  Unlink,
} from 'lucide-react';

function StatusBadge({ state }: { state: IntegrationState }) {
  if (state.status === 'connecting') {
    return (
      <Badge className="text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/20">
        <Loader2 className="w-3 h-3 animate-spin mr-1" /> Connecting…
      </Badge>
    );
  }
  if (state.status === 'connected') {
    return (
      <Badge className="text-[10px] bg-emerald-500/15 text-emerald-300 border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
        {state.sandbox && <span className="ml-1 text-amber-300">(Mock)</span>}
      </Badge>
    );
  }
  if (state.status === 'needs_attention') {
    return (
      <Badge className="text-[10px] bg-red-500/15 text-red-300 border-red-500/20">
        <AlertTriangle className="w-3 h-3 mr-1" /> Needs attention
      </Badge>
    );
  }
  if (state.status === 'code_received') {
    return (
      <Badge className="text-[10px] bg-amber-500/15 text-amber-300 border-amber-500/20">
        <CheckCircle2 className="w-3 h-3 mr-1" /> Code received
      </Badge>
    );
  }
  return (
    <Badge className="text-[10px] bg-zinc-500/15 text-zinc-400 border-zinc-500/20">
      Not connected
    </Badge>
  );
}

interface WizardProps {
  id: IntegrationId;
  onClose: () => void;
}

/**
 * Generic connect wizard shell. The exchange/test steps run against real
 * provider APIs only after the §14 Edge Functions exist; until then every
 * successful completion is an explicitly-labelled SANDBOX connection.
 */
function ConnectWizard({ id, onClose }: WizardProps) {
  const def = INTEGRATION_REGISTRY[id];
  const {
    startConnect,
    failConnect,
    completeApiKeyConnect,
    completeSandboxConnect,
    oauthCodeReceived,
    integrations,
  } = useIntegrations();
  const state = integrations[id];

  const [provider, setProvider] = useState<string>(def.providerOptions?.[0]?.id ?? '');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [oauthClientId, setOauthClientId] = useState('');
  const [receivedCode, setReceivedCode] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Mock-first: populate the same connected-state shape with clearly-fake values. */
  function simulateConnect() {
    setStepError(null);
    startConnect({ integrationId: id, provider: provider || undefined });
    const metadata: Record<string, string> =
      id === 'amazon_sp_api'
        ? { mode: 'mock', marketplaceId: 'MOCK-MARKETPLACE-UK', clientMode: 'MockAmazonSPAPIClient' }
        : { mode: 'mock', clientMode: `Mock${def.name.replace(/[^A-Za-z0-9]/g, '')}Client` };
    completeSandboxConnect(id, metadata);
    onClose();
  }

  /** Exchange the OAuth authorization code for tokens via the Edge Function. */
  async function completeOAuthExchange() {
    if (!receivedCode) return;
    setBusy(true);
    setStepError(null);
    startConnect({ integrationId: id, provider: provider || undefined });
    try {
      const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env.VITE_SUPABASE_URL) as string | undefined;
      const anonKey = (typeof import.meta !== 'undefined' && import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
      const fnUrl = supabaseUrl
        ? `${supabaseUrl}/functions/v1/spapi-token-exchange`
        : '/api/functions/v1/spapi-token-exchange';
      const res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey ?? ''}`,
        },
        body: JSON.stringify({
          code: receivedCode,
          clientId: oauthClientId.trim(),
          marketplaceId: 'A1F83G8C2ARO7P',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        const msg = data.error ?? `Exchange failed (HTTP ${res.status})`;
        setStepError(msg);
        failConnect(id, msg);
        return;
      }
      // Exchange succeeded — mark as connected with the marketplace metadata.
      const metadata: Record<string, string> = {
        mode: data.mode ?? 'real',
        marketplaceId: data.marketplaceId ?? 'A1F83G8C2ARO7P',
        expiresIn: String(data.expiresIn ?? 3600),
      };
      completeApiKeyConnect(id, provider, metadata);
      setReceivedCode(null);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStepError(msg);
      failConnect(id, msg);
    } finally {
      setBusy(false);
    }
  }

  async function testApiKey() {
    setStepError(null);
    const key = fieldValues.api_key ?? '';
    if (!key.trim()) {
      const msg = 'API key is required.';
      setStepError(msg);
      failConnect(id, msg);
      return;
    }
    setBusy(true);
    startConnect({ integrationId: id, provider: provider || undefined, fields: fieldValues });
    const result = await pingForService(id, provider, key.trim());
    if (!result) {
      // No live endpoint for this selection (e.g. CSV import) — not a failure.
      setBusy(false);
      completeApiKeyConnect(id, provider, { mode: 'no-live-endpoint' });
      return;
    }
    setBusy(false);
    if (result.ok) {
      rememberApiKey(id, key.trim());
      completeApiKeyConnect(id, provider, { httpStatus: String(result.httpStatus) });
    } else {
      const msg = result.error ?? 'Test failed';
      setStepError(msg);
      failConnect(id, msg);
    }
  }

  function launchOAuth() {
    setStepError(null);
    if (!def.oauth) return;
    if (!oauthClientId.trim()) {
      const msg = `${def.oauth.clientIdLabel} is required.`;
      setStepError(msg);
      return;
    }
    const state = `${id}:${Date.now()}`;
    const sep = def.oauth.authorizeUrlBase.includes('?') ? '&' : '?';
    const url = `${def.oauth.authorizeUrlBase}${sep}${def.oauth.clientIdParam}=${encodeURIComponent(
      oauthClientId.trim()
    )}&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(
      window.location.origin + '/oauth/callback.html'
    )}`;
    const popup = window.open(url, 'mercenta-oauth', 'width=560,height=760');
    if (!popup) {
      setStepError('Popup blocked — allow popups and try again.');
      return;
    }
    const onMessage = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return;
      if (ev.data?.source !== 'mercenta-oauth') return;
      window.removeEventListener('message', onMessage);
      const code = ev.data.code as string | null;
      if (code) {
        setReceivedCode(code);
        oauthCodeReceived(id, provider, code.slice(0, 12) + '…');
      } else {
        const msg = 'No authorization code received from the provider.';
        setStepError(msg);
        failConnect(id, msg);
      }
    };
    window.addEventListener('message', onMessage);
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-ink-850 border-white/[0.08]">
        <div className="flex items-center gap-3 mb-1">
          <Plug className="w-5 h-5 text-brass-400" />
          <h3 className="text-base font-semibold text-white">Connect — {def.name}</h3>
        </div>
        <p className="text-xs text-zinc-500 mb-5">{def.description}</p>

        {def.providerOptions && (
          <div className="mb-5">
            <label className="text-xs font-medium text-zinc-400 mb-2 block">Provider</label>
            <div className="grid gap-2">
              {def.providerOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setProvider(opt.id)}
                  className={cn(
                    'text-left text-sm px-3 py-2.5 rounded-lg border transition-colors',
                    provider === opt.id
                      ? 'border-brass-500/50 bg-brass-500/10 text-white'
                      : 'border-white/[0.08] text-zinc-400 hover:border-white/20'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {def.authMethod === 'oauth' ? (
          <div className="mb-5 space-y-3">
            <Input
              label={def.oauth?.clientIdLabel ?? 'Client ID (public)'}
              value={oauthClientId}
              onChange={(e) => setOauthClientId(e.target.value)}
              placeholder="Public application/client ID — not a secret"
            />
            {state?.status === 'code_received' && receivedCode ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-200 leading-relaxed">
                <strong>Authorization code received.</strong> Exchange it for
                tokens via the server-side Edge Function to complete the connection.
              </div>
            ) : (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-200 leading-relaxed">
                Clicking connect opens the provider's real consent screen in a
                popup. The authorization code is exchanged server-side and stored
                encrypted (Supabase Vault); a live test call then verifies the
                connection. Without Edge Functions deployed you will reach the
                honest <strong>Code received</strong> state, not a fake success.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 mb-5">
            {def.fields.map((f) => (
              <Input
                key={f.key}
                label={f.label}
                type={f.secret ? 'password' : 'text'}
                placeholder={f.placeholder}
                value={fieldValues[f.key] ?? ''}
                onChange={(e) =>
                  setFieldValues((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
              />
            ))}
            <p className="text-[11px] text-zinc-600">
              The key is tested live against {def.name} before saving — no fake
              success. On success the key is held in memory only (Vault-backed
              storage once deployed); it is never persisted client-side.
            </p>
          </div>
        )}

        {stepError && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>{stepError}</span>
          </div>
        )}

        <div className="flex justify-between gap-2 mt-4">
          {/* Mock-first policy: a missing real credential must never block the
              platform. This runs the full connect flow against the Mock*
              client — clearly labelled "(Mock)" in the UI, never treated as a
              verified production connection by gating code. */}
          <Button variant="ghost" onClick={simulateConnect} disabled={busy}>
            Simulate Connect (mock)
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            {def.authMethod === 'oauth' ? (
              state?.status === 'code_received' && receivedCode ? (
                <Button onClick={() => void completeOAuthExchange()} disabled={busy}>
                  {busy ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Exchanging…</>
                  ) : (
                    'Complete Exchange'
                  )}
                </Button>
              ) : (
                <Button onClick={launchOAuth} disabled={busy}>
                  {busy ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Waiting for popup…</>
                  ) : (
                    'Launch provider login popup'
                  )}
                </Button>
              )
            ) : (
              <Button onClick={() => void testApiKey()} disabled={busy || state?.status === 'connecting'}>
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Testing…
                  </>
                ) : (
                  'Test Connection & Save'
                )}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export function IntegrationsPanel() {
  const { integrations, disconnect } = useIntegrations();
  const [wizardFor, setWizardFor] = useState<IntegrationId | null>(null);

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brass-500/15 flex items-center justify-center">
          <Plug className="w-5 h-5 text-brass-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Integration Settings</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            One-click connect for every external service — no API keys in .env files.
            Features stay locked until their card shows a verified Connected status.
          </p>
        </div>
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-200 flex items-start gap-2 max-w-[1400px]">
        <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          Live OAuth exchanges and test calls run as server-side Edge Functions with
          encrypted secret storage (Supabase Vault). Until those are wired, connects
          complete in <strong>sandbox mode</strong> and do NOT unlock dependent
          features — sandbox connections are never treated as verified credentials.
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {INTEGRATION_ORDER.map((id) => {
          const def = INTEGRATION_REGISTRY[id];
          const state = integrations[id];
          const connected = state.status === 'connected';
          return (
            <Card key={id} className="p-5 bg-ink-850 border-white/[0.06]">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{def.name}</h3>
                  <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed max-w-md">
                    {def.description}
                  </p>
                </div>
                <StatusBadge state={state} />
              </div>

              {state.status === 'connected' && (
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 mb-3 space-y-1">
                  {Object.entries(state.metadata ?? {})
                    .filter(([k]) => k !== 'sandbox')
                    .map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[11px]">
                        <span className="font-mono text-zinc-600">{k}</span>
                        <span className="font-mono text-zinc-300">{v}</span>
                      </div>
                    ))}
                  <div className="flex justify-between text-[11px]">
                    <span className="font-mono text-zinc-600">lastVerifiedAt</span>
                    <span className="font-mono text-zinc-300">
                      {state.lastVerifiedAt
                        ? new Date(state.lastVerifiedAt).toLocaleString()
                        : '—'}
                    </span>
                  </div>
                </div>
              )}

              {state.error && (
                <div className="mb-3 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-[11px] text-red-300">
                  {state.error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                {connected ? (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => setWizardFor(id)}
                      className="text-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reconnect
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => disconnect(id)}
                      className="text-xs text-red-300 hover:text-red-200"
                    >
                      <Unlink className="w-3.5 h-3.5 mr-1" /> Disconnect
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setWizardFor(id)} className="text-xs">
                    <Plug className="w-3.5 h-3.5 mr-1" />
                    {state.status === 'needs_attention' ? 'Retry Connect' : 'Connect'}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {wizardFor && (
        <ConnectWizard id={wizardFor} onClose={() => setWizardFor(null)} />
      )}
    </div>
  );
}
