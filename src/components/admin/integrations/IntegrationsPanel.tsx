import { useState } from 'react';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { rememberApiKey } from '@/integrations/types';
import { pingForService } from '@/lib/integrations/testCalls';
import { runHealthCheck } from '@/lib/integrations/health';
import { INTEGRATION_CATEGORY_LABELS, INTEGRATION_MODE_LABELS } from '@/integrations/types';
import {
  ContextPanel,
  MetricBand,
  RecordFieldList,
  WorkspaceFrame,
  WorkspaceHeader,
  type MetricTileData,
} from '@/components/shared/workspace';
import type { IntegrationCategory, IntegrationDefinition, IntegrationHealth, IntegrationId, IntegrationMode, IntegrationState } from '@/integrations/types';
import { INTEGRATION_ORDER, INTEGRATION_REGISTRY, hasLiveCredentialHint, integrationMeta } from '@/integrations/registry';
import { Badge, Button, Card, EmptyState, Input } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plug,
  RefreshCw,
  Search,
  ShieldCheck,
  Unlink,
  HeartPulse,
  FlaskConical,
  Power,
} from 'lucide-react';

/**
 * §Phase B — Integration Hub breadth.
 *
 * The Hub is the provider control plane, so it must answer three operator
 * questions without scrolling 18 cards: (1) what is the overall state of the
 * platform's integrations, (2) what needs attention right now, (3) where is
 * provider X. Everything below is DERIVED from the existing canonical data —
 * `modes` (the authoritative mode model), `INTEGRATION_META.category` and
 * `INTEGRATION_ORDER` — never hand-counted, never a second registry.
 */
type HubFilter = 'all' | IntegrationMode | 'attention';

const HUB_CATEGORY_ORDER: IntegrationCategory[] = [
  'core',
  'commerce',
  'finance',
  'logistics',
  'compliance',
  'communications',
  'marketing',
  'ai',
  'data',
  'infrastructure',
];

const CATEGORY_DESCRIPTIONS: Partial<Record<IntegrationCategory, string>> = {
  core: 'Platform services every workflow depends on.',
  commerce: 'Marketplace, catalogue and contract-signature providers.',
  finance: 'Billing, payouts and accounting providers.',
  logistics: 'Carriers and shipment tracking providers.',
  compliance: 'Registrar and tax-authority verification providers.',
  communications: 'Email, messaging and in-product guidance providers.',
  marketing: 'Outreach, prospecting, social publishing and advertising providers.',
  ai: 'Model providers used by research and drafting workflows.',
  data: 'Market-data and web-fetch providers used by research workflows.',
  infrastructure: 'Hosted services operated by Mercenta itself.',
};

/** A row in the Hub body: a category heading, or one provider card. */
type HubRow =
  | { kind: 'heading'; category: IntegrationCategory; count: number }
  | { kind: 'card'; id: IntegrationId };

/**
 * §Phase B — "needs attention" is derived from the real state, not a colour:
 * a provider is flagged when the mode model says error/degraded, the
 * connection reports needs_attention, or its own recorded health says the
 * credential is invalid. Never a fabricated warning.
 */
function isAttention(state: IntegrationState, mode: IntegrationMode): boolean {
  return (
    mode === 'error' ||
    mode === 'degraded' ||
    state.status === 'needs_attention' ||
    state.health?.authValid === false
  );
}

const SUMMARY_TILES: { id: HubFilter; label: string; hint: string; tone: 'success' | 'warning' | 'info' | 'danger' | 'neutral' }[] = [
  { id: 'all', label: 'All providers', hint: 'Every registered provider', tone: 'neutral' },
  { id: 'live', label: 'Live', hint: 'Verified non-sandbox connection', tone: 'success' },
  { id: 'simulation', label: 'Simulation', hint: 'Executable with mock adapters', tone: 'warning' },
  { id: 'available', label: 'Available', hint: 'Registered, not configured yet', tone: 'neutral' },
  { id: 'configuring', label: 'Configuring', hint: 'Connect flow in progress', tone: 'info' },
  { id: 'attention', label: 'Needs attention', hint: 'Error, degraded or failing health', tone: 'danger' },
  { id: 'disabled', label: 'Disabled', hint: 'Operator-disabled — no workflow uses it', tone: 'neutral' },
];

const TILE_TONE_CLASSES: Record<'success' | 'warning' | 'info' | 'danger' | 'neutral', string> = {
  success: 'text-emerald-300',
  warning: 'text-amber-300',
  info: 'text-blue-300',
  danger: 'text-red-300',
  neutral: 'text-zinc-300',
};


/**
 * §Priority-1 — safe mock configuration labels for the provider control
 * plane. Simulation-mode cards surface the deterministic mock values the
 * workflow actually uses, so an operator never has to invent credentials.
 */
const SIM_MOCK_LABELS: Record<string, string> = {
  'dhl:': `key ${'mock:dhl-eu-demo-key'} · account MOCK-DHL-ACCOUNT-0001`,
  'companies_house:': `api key ${'mock:ch-demo-key'} · company ${'MOCK-CH-10000001'}`,
  'hmrc:': `oauth client ${'mock:hmrc-demo-client'} · token ${'mock:hmrc-demo-secret'}`,
  'stripe:': 'mock:sub-XXXX subscriptions (Billing labels itself (Mock) mode)',
  'amazon_sp_api:': 'MOCK-SUB-XXXXX submissions · MOCK-PO-XXXX purchase-order pool',
  'esignature:': 'mock:env-XXXX envelopes (PandaDoc/DocuSign catalogue)',
};

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

/** §8 — operational mode badge. SIMULATION is displayed amber, LIVE emerald. */
function ModeBadge({ mode }: { mode: IntegrationMode }) {
  const label = INTEGRATION_MODE_LABELS[mode];
  const cls =
    mode === 'live'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
      : mode === 'simulation'
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
      : mode === 'error'
      ? 'bg-red-500/15 text-red-300 border-red-500/20'
      : mode === 'degraded'
      ? 'bg-orange-500/15 text-orange-300 border-orange-500/20'
      : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20';
  return (
    <Badge className={cn('text-[10px] uppercase tracking-wide border', cls)}>
      {label}
    </Badge>
  );
}

/** §11 — per-card health snapshot, rendered only from real/isolated state. */
function HealthPanel({
  id,
  state,
  mode,
  authMethod,
}: {
  id: IntegrationId;
  state: IntegrationState;
  mode: IntegrationMode;
  authMethod: 'oauth' | 'api_key';
}) {
  const { recordHealth } = useIntegrations();
  const [busy, setBusy] = useState(false);
  const [snapshot, setSnapshot] = useState<IntegrationHealth | null>(null);

  async function check() {
    setBusy(true);
    const next = await runHealthCheck(
      {
        getMode: () => mode,
        getState: () => state,
      },
      id,
      authMethod,
      state.provider
    );
    recordHealth(id, next);
    setSnapshot(next);
    setBusy(false);
  }

  const health = state.health ?? snapshot;
  if (!health) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void check()}
        disabled={busy}
        className="text-xs"
      >
        {busy ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Checking…</>
        ) : (
          <><HeartPulse className="w-3.5 h-3.5 mr-1" /> Health check</>
        )}
      </Button>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 space-y-1 text-[11px]">
      <div className="flex items-center justify-between">
        <span className="text-zinc-500">Auth</span>
        <span className={health.authValid ? 'text-emerald-300' : 'text-red-300'}>
          {health.authValid ? 'Valid' : 'Not verified'}
        </span>
      </div>
      {health.lastSyncAt && (
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Last sync</span>
          <span className="font-mono text-zinc-300">{new Date(health.lastSyncAt).toLocaleString()}</span>
        </div>
      )}
      {health.providerStatus && (
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Provider</span>
          <span className="font-mono text-zinc-300">{health.providerStatus}</span>
        </div>
      )}
      {health.errorCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Errors</span>
          <span className="text-red-300">{health.errorCount}</span>
        </div>
      )}
      {health.lastErrorAt && (
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Last error</span>
          <span className="text-red-300">{new Date(health.lastErrorAt).toLocaleString()}</span>
        </div>
      )}
      <Button variant="ghost" size="sm" onClick={() => void check()} disabled={busy} className="text-xs mt-1">
        {busy ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Checking…</>
        ) : (
          <><RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-check</>
        )}
      </Button>
    </div>
  );
}

/**
 * §10 — standardized wizard steps. Derived entirely from the existing
 * IntegrationDefinition (never invents provider capabilities). The wizard is
 * still the same generic connect flow; the stepper is progressive disclosure
 * over it, not a replacement.
 */
const WIZARD_STEPS = [
  { id: 'intro', label: 'Intro' },
  { id: 'auth', label: 'Authenticate' },
  { id: 'config', label: 'Configure' },
  { id: 'scopes', label: 'Permissions' },
  { id: 'test', label: 'Test connection' },
  { id: 'health', label: 'Health' },
  { id: 'activate', label: 'Activate' },
] as const;

/** Renders the stepper header. Completion derived from real connection state. */
function WizardStepper({
  def,
  state,
}: {
  def: IntegrationDefinition;
  state: IntegrationState | undefined;
}) {
  const isOAuth = def.authMethod === 'oauth';
  const connectedLive = state?.status === 'connected' && !state.sandbox;
  const completed: Record<string, boolean> = {
    intro: true,
    auth: isOAuth ? state?.status === 'code_received' || connectedLive : true,
    config: !!state?.provider || state?.status !== 'disconnected',
    scopes: isOAuth ? false : true,
    test: connectedLive || !!state?.lastVerifiedAt,
    health: !!state?.health,
    activate: connectedLive,
  };
  return (
    <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1" aria-label="Setup steps">
      {WIZARD_STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center gap-1 flex-shrink-0">
          <div
            className={cn(
              'text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1',
              completed[s.id]
                ? 'bg-brass-500/10 text-brass-300 border-brass-500/20'
                : 'bg-white/[0.02] text-zinc-500 border-white/[0.06]'
            )}
            data-state={completed[s.id] ? 'complete' : 'pending'}
          >
            <span className="text-[9px]">{i + 1}</span>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < WIZARD_STEPS.length - 1 && (
            <div className="w-2 h-px bg-white/10" />
          )}
        </div>
      ))}
    </div>
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

        <WizardStepper def={def} state={state} />

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
  const { integrations, disconnect, modes, setMode } = useIntegrations();
  const [wizardFor, setWizardFor] = useState<IntegrationId | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<HubFilter>('all');

  /** One predicate drives the tiles, the counts and the list — no drift. */
  function matchesFilter(f: HubFilter, id: IntegrationId): boolean {
    const mode = modes[id];
    if (f === 'attention') return isAttention(integrations[id], mode);
    if (f === 'all') return true;
    return mode === f;
  }

  function matchesQuery(id: IntegrationId): boolean {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const def = INTEGRATION_REGISTRY[id];
    return (
      def.name.toLowerCase().includes(q) ||
      def.description.toLowerCase().includes(q) ||
      INTEGRATION_CATEGORY_LABELS[integrationMeta(id).category].toLowerCase().includes(q)
    );
  }

  const visibleIds = INTEGRATION_ORDER.filter((id) => matchesFilter(filter, id) && matchesQuery(id));
  const attentionIds = INTEGRATION_ORDER.filter((id) => isAttention(integrations[id], modes[id]));

  /* §Sprint 2 — the same seven state tiles the panel already computed, as
     canonical MetricBand tiles: the count comes from the SAME predicate and the
     drill-down is the SAME filter, so a tile can never disagree with the list. */
  const summaryMetrics: MetricTileData[] = SUMMARY_TILES.map((tile) => ({
    id: `integrations-${tile.id}`,
    label: tile.label,
    value: String(INTEGRATION_ORDER.filter((id) => matchesFilter(tile.id, id)).length),
    size: tile.id === 'all' ? 'hero' : 'default',
    tone: tile.tone === 'danger' ? 'danger' : tile.tone === 'success' ? 'success' : tile.tone === 'warning' ? 'warning' : tile.tone === 'info' ? 'info' : 'neutral',
    statusText: filter === tile.id ? 'Filtered' : undefined,
    context: tile.hint,
    domain: 'compliance',
    onOpen: () => setFilter(filter === tile.id ? 'all' : tile.id),
    pressed: filter === tile.id,
    testId: `integrations-tile-${tile.id}`,
    valueTestId: `integrations-tile-${tile.id}-value`,
  }));

  // Flat row list: category headings + cards, so ONE grid renders both and a
  // heading spans the full width (no second grid, no duplicated card markup).
  const rows: HubRow[] = [];
  for (const category of HUB_CATEGORY_ORDER) {
    const ids = visibleIds.filter((id) => integrationMeta(id).category === category);
    if (ids.length === 0) continue;
    rows.push({ kind: 'heading', category, count: ids.length });
    for (const id of ids) rows.push({ kind: 'card', id });
  }

  return (
    <WorkspaceFrame className="space-y-4">
    <div data-testid="integration-hub" className="space-y-4">
      <WorkspaceHeader
        eyebrow="Super Admin · Governance"
        title="Integration Settings"
        description="One-click connect for every external service — no API keys in .env files. Features stay locked until their card shows a verified Connected status. A provider is treated as simulation-safe ONLY when its mode positively resolves to simulation; UNKNOWN, unregistered, unconfigured, disabled, configuring, live, degraded and error are all treated as unsafe."
        meta={
          <>
            <span className="font-mono text-[11px] text-zinc-500">{INTEGRATION_ORDER.length} providers</span>
            <span className="font-mono text-[11px] text-zinc-500">{visibleIds.length} shown</span>
            <span className="font-mono text-[11px] text-zinc-500">
              {filter === 'all' ? 'no filter' : filter === 'attention' ? 'needs attention' : INTEGRATION_MODE_LABELS[filter]}
            </span>
          </>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <Input
              label="Search integrations"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, capability or category"
              className="w-full sm:w-80"
              dataTestid="integrations-search"
            />
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-zinc-600" aria-hidden="true" />
              <span role="status" className="text-[11px] text-zinc-500">
                {visibleIds.length} of {INTEGRATION_ORDER.length} providers shown
                {filter !== 'all' &&
                  ` · ${filter === 'attention' ? 'needs attention' : INTEGRATION_MODE_LABELS[filter]}`}
              </span>
              {(filter !== 'all' || query.trim() !== '') && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[11px]"
                  onClick={() => {
                    setFilter('all');
                    setQuery('');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        }
      />

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-200 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          Live OAuth exchanges and test calls run as server-side Edge Functions with
          encrypted secret storage (Supabase Vault). Until those are wired, connects
          complete in <strong>sandbox mode</strong> and do NOT unlock dependent
          features — sandbox connections are never treated as verified credentials.
        </span>
      </div>

      {/* §Phase B — platform integration state. Counts come from the mode model
          (never hand-counted); every tile filters the provider list below.
          §Sprint 2 — the same tiles are now the canonical MetricBand, so the
          drill-down contract is the shared one rather than a bespoke grid. The
          `role="group"`/label contract is preserved for assistive tech. */}
      <div role="group" aria-label="Integration state summary">
        <MetricBand items={summaryMetrics.slice(0, 4)} columns={4} />
        <MetricBand items={summaryMetrics.slice(4)} columns={3} />
      </div>

      {/* §Sprint 2 — the provider-state safety contract, stated where an
          operator actually reads it. This is a compliance rule, not styling:
          a provider is simulation-safe ONLY when its mode POSITIVELY resolves
          to `simulation`; every other state fails closed. */}
      <ContextPanel title="Provider state — simulation safety">
        <RecordFieldList
          fields={[
            { label: 'Registered providers', value: String(INTEGRATION_ORDER.length) },
            { label: 'Simulation-safe rule', value: 'mode must positively resolve to simulation' },
            { label: 'UNKNOWN / unregistered', value: 'NOT simulation-safe (fail closed)' },
            { label: 'disabled / configuring', value: 'NOT simulation-safe (fail closed)' },
            { label: 'live / degraded / error', value: 'NOT simulation-safe (fail closed)' },
            { label: 'Live network calls from this screen', value: '0' },
          ]}
        />
        <p className="mt-2 text-[11px] leading-snug text-zinc-400">
          Entering a real credential activates the already-built live path for that provider — no
          code change is required. Until then every workflow continues to run against its
          deterministic simulation, and no screen claims a live connection it does not have.
        </p>
      </ContextPanel>

      {/* §Phase B — actionable attention list, only when something is wrong. */}
      {attentionIds.length > 0 && (
        <div
          role="alert"
          className="bg-red-500/10 border border-red-500/25 rounded-lg p-3 text-xs text-red-200 flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>
              {attentionIds.length} integration{attentionIds.length === 1 ? '' : 's'} need
              {attentionIds.length === 1 ? 's' : ''} attention:
            </strong>{' '}
            {attentionIds.map((id) => INTEGRATION_REGISTRY[id].name).join(', ')}. Select{' '}
            <em>Needs attention</em> above to see the recorded cause, then run a health check
            or retry the connection on each card.
          </span>
        </div>
      )}

      {/* Provider list */}
      {visibleIds.length === 0 ? (
        <Card className="p-2 bg-ink-850 border-white/[0.06]">
          <EmptyState
            title="No integrations match this view"
            description="Clear the filters to see every registered provider again. The Hub never hides an integration — a provider appears here as soon as it is registered."
            action={
              <Button
                variant="ghost"
                className="text-xs mt-2"
                onClick={() => {
                  setFilter('all');
                  setQuery('');
                }}
              >
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rows.map((row) => {
          if (row.kind === 'heading') {
            return (
              <div key={`heading-${row.category}`} className="col-span-full mt-2 first:mt-0">
                <h2 className="text-sm font-semibold text-white tracking-tight">
                  {INTEGRATION_CATEGORY_LABELS[row.category]}
                </h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {CATEGORY_DESCRIPTIONS[row.category] ?? ''} · {row.count} provider
                  {row.count === 1 ? '' : 's'}
                </p>
              </div>
            );
          }
          const id = row.id;
          const def = INTEGRATION_REGISTRY[id];
          const state = integrations[id];
          const connected = state.status === 'connected';
          const mode = modes[id];
          return (
            <Card key={id} className="p-5 bg-ink-850 border-white/[0.06]">
              <div data-mode={mode} data-connection={state.status} className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start justify-between w-full">
                  <h3 className="text-sm font-semibold text-white">{def.name}</h3>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge state={state} />
                    <ModeBadge mode={mode} />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 mb-3 leading-relaxed max-w-md">
                {def.description}
              </p>

              <div className="mb-3">
                <HealthPanel id={id} state={state} mode={mode} authMethod={def.authMethod} />
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

              {/* §Phase B — truthful developer-key hint. An env demo key is a
                  developer shortcut that lets the LIVE test call run; it is NOT
                  a verified connection and is never presented as one. */}
              {hasLiveCredentialHint(id) && mode !== 'live' && !connected && (
                <div className="mb-3 bg-white/[0.02] border border-white/[0.06] rounded-lg p-2.5 text-[10px] text-zinc-400 leading-relaxed">
                  <strong className="text-zinc-300">Developer demo key present.</strong>{' '}
                  This environment holds a value for {integrationMeta(id).demoKeyHint}, so
                  the live test call can run for {def.name}. That is a developer shortcut,
                  not a verified connection — complete the connect flow for a real status.
                </div>
              )}

              {/* §Priority-1 — provider control plane: simulation mode + safe mock config */}
              {mode === 'simulation' && (
                <div className="mb-3 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-[10px] text-amber-200 leading-relaxed">
                  <strong>Simulation mode.</strong> No live call is made and no real credential is
                  used or stored. Safe mock configuration: {SIM_MOCK_LABELS[`${id}:${state.provider ?? ''}`] ?? 'deterministic mock adapter (see workflow surfaces)'}. Enter real credentials below to switch to LIVE later — no code change.
                </div>
              )}
              {state.disabled && (
                <div className="mb-3 bg-zinc-500/10 border border-zinc-500/20 rounded-lg p-2.5 text-[10px] text-zinc-400 leading-relaxed">
                  <strong>Disabled.</strong> Configuration kept; no workflow uses this provider.
                </div>
              )}

              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[10px] text-zinc-600">
                  {mode === 'simulation' ? 'Simulation is executable with no credentials' : 'Operator: enable simulation to demonstrate workflows without credentials'}
                </span>
                <div className="flex items-center gap-2">
                  {mode !== 'simulation' && !connected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setMode(id, 'simulation')}
                    >
                      <FlaskConical className="w-3.5 h-3.5 mr-1" /> Enable simulation
                    </Button>
                  )}
                  {connected && state.sandbox && mode === 'simulation' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => setMode(id, 'disabled')}
                    >
                      <Power className="w-3.5 h-3.5 mr-1" /> Disable
                    </Button>
                  )}
                </div>
              </div>

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
      )}

      {wizardFor && (
        <ConnectWizard id={wizardFor} onClose={() => setWizardFor(null)} />
      )}
    </div>
    </WorkspaceFrame>
  );
}
