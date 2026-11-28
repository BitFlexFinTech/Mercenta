import { useState } from 'react';
import type {
  IntegrationCategory,
  IntegrationDefinition,
  IntegrationId,
  IntegrationMode,
  IntegrationState,
} from '@/integrations/types';
import {
  EmptyStateBlock,
  InlineStatus,
  MetricStrip,
  SlideOverDrawer,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';
import { ConsolePageHeader } from '@/next/components/ConsolePageHeader';
import { NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';

export type IntegrationsFilter = 'all' | IntegrationMode | 'attention';

export interface IntegrationCardItem {
  id: IntegrationId;
  def: IntegrationDefinition;
  state: IntegrationState;
  mode: IntegrationMode;
  modeLabel: string;
  categoryLabel: string;
  serverSecretPresent: boolean;
  serverSecretName: string | null;
  simMockLabel: string | null;
}

export interface IntegrationCategoryGroup {
  category: IntegrationCategory;
  categoryLabel: string;
  description: string;
  items: IntegrationCardItem[];
}

export interface AdminIntegrationsViewProps {
  totalProviders: number;
  shownCount: number;
  filter: IntegrationsFilter;
  onFilterChange: (next: IntegrationsFilter) => void;
  query: string;
  onQueryChange: (next: string) => void;
  summaryCounts: Record<IntegrationsFilter, number>;
  attentionNames: string[];
  groups: IntegrationCategoryGroup[];
  onResetFilters: () => void;
  onRunHealthCheck: (id: IntegrationId) => Promise<void>;
  onEnableSimulation: (id: IntegrationId) => void;
  onDisableIntegration: (id: IntegrationId) => void;
  onDisconnect: (id: IntegrationId) => void;
  wizardItem: IntegrationCardItem | null;
  onOpenWizard: (id: IntegrationId | null) => void;
  onSimulateConnect: (id: IntegrationId, provider?: string) => void;
  onTestApiKey: (
    id: IntegrationId,
    provider: string,
    fields: Record<string, string>
  ) => Promise<{ ok: boolean; error?: string }>;
  onCompleteOAuthExchange: (
    id: IntegrationId,
    provider: string,
    code: string,
    clientId: string
  ) => Promise<{ ok: boolean; error?: string }>;
}

const TILE_LABELS: { id: IntegrationsFilter; label: string; hint: string }[] = [
  { id: 'all', label: 'All providers', hint: 'Every registered provider' },
  { id: 'live', label: 'Live', hint: 'Verified non-sandbox' },
  { id: 'simulation', label: 'Simulation', hint: 'Mock adapters active' },
  { id: 'available', label: 'Available', hint: 'Not configured yet' },
  { id: 'configuring', label: 'Configuring', hint: 'Connect in progress' },
  { id: 'attention', label: 'Needs attention', hint: 'Error or degraded' },
];

function modeTone(mode: IntegrationMode): SemanticTone {
  if (mode === 'live') return 'success';
  if (mode === 'simulation' || mode === 'degraded') return 'warning';
  if (mode === 'error') return 'danger';
  return 'neutral';
}

function connectionTone(state: IntegrationState): SemanticTone {
  if (state.status === 'connected') return 'success';
  if (state.status === 'needs_attention') return 'danger';
  if (state.status === 'code_received' || state.status === 'connecting') return 'warning';
  return 'neutral';
}

function connectionLabel(state: IntegrationState): string {
  if (state.status === 'connected') {
    return state.sandbox ? 'Connected (Mock)' : 'Connected';
  }
  if (state.status === 'needs_attention') return 'Needs attention';
  if (state.status === 'code_received') return 'Code received';
  if (state.status === 'connecting') return 'Connecting…';
  return 'Not connected';
}

export function AdminIntegrationsView({
  totalProviders,
  shownCount,
  filter,
  onFilterChange,
  query,
  onQueryChange,
  summaryCounts,
  attentionNames,
  groups,
  onResetFilters,
  onRunHealthCheck,
  onEnableSimulation,
  onDisableIntegration,
  onDisconnect,
  wizardItem,
  onOpenWizard,
  onSimulateConnect,
  onTestApiKey,
  onCompleteOAuthExchange,
}: AdminIntegrationsViewProps) {
  const [healthBusyId, setHealthBusyId] = useState<string | null>(null);
  const [wizardProvider, setWizardProvider] = useState('');
  const [wizardFields, setWizardFields] = useState<Record<string, string>>({});
  const [oauthClientId, setOauthClientId] = useState('');
  const [oauthCode, setOauthCode] = useState('');
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [wizardBusy, setWizardBusy] = useState(false);

  function handleOpenWizard(item: IntegrationCardItem) {
    setWizardProvider(item.def.providerOptions?.[0]?.id ?? '');
    setWizardFields({});
    setOauthClientId('');
    setOauthCode('');
    setWizardError(null);
    onOpenWizard(item.id);
  }

  return (
    <div className="space-y-6">
      <ConsolePageHeader
        title="Integration Settings"
        description="External service control plane. A provider is treated as simulation-safe only when its mode positively resolves to simulation; unverified states fail closed."
        meta={
          <>
            <span>{totalProviders} registered providers</span>
            <span>{shownCount} shown</span>
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search name, capability, category…"
              aria-label="Search integrations"
              className="w-60 px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-ink-950"
            />
            {(filter !== 'all' || query.trim() !== '') && (
              <button
                type="button"
                onClick={onResetFilters}
                className="px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-800 hover:bg-surface"
              >
                Clear filters
              </button>
            )}
          </div>
        }
      />

      <NoticeBanner
        tone="info"
        title="Vault-backed secrets & simulation-safe boundary"
        message="Live OAuth exchanges and API key verification run via server-side Edge Functions with encrypted secret storage. Until live credentials are verified, workflows operate strictly through deterministic simulation."
      />

      {attentionNames.length > 0 && (
        <NoticeBanner
          tone="danger"
          title={`${attentionNames.length} integration(s) need attention`}
          message={`${attentionNames.join(', ')}. Filter to Needs attention or run a health check.`}
        />
      )}

      <MetricStrip
        columns={6}
        items={TILE_LABELS.map((t) => ({
          id: `int-${t.id}`,
          label: t.label,
          value: String(summaryCounts[t.id] ?? 0),
          context: t.hint,
          active: filter === t.id,
          onClick: () => onFilterChange(filter === t.id ? 'all' : t.id),
        }))}
      />

      {groups.length === 0 ? (
        <EmptyStateBlock
          title="No integrations match this view"
          description="Clear search or mode filters to view all registered providers."
          actionLabel="Clear filters"
          onAction={onResetFilters}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <SectionCard
              key={g.category}
              title={g.categoryLabel}
              description={`${g.description} · ${g.items.length} provider(s)`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {g.items.map((item) => {
                  const connected = item.state.status === 'connected';
                  const health = item.state.health;
                  return (
                    <div
                      key={item.id}
                      data-mode={item.mode}
                      data-connection={item.state.status}
                      className="border border-hairline rounded-md p-4 bg-surface-raised flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[14px] font-semibold text-ink-950">
                            {item.def.name}
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
                            <InlineStatus
                              label={connectionLabel(item.state)}
                              tone={connectionTone(item.state)}
                            />
                            <InlineStatus
                              label={item.modeLabel}
                              tone={modeTone(item.mode)}
                            />
                          </div>
                        </div>

                        <p className="text-[12px] text-ink-600 leading-relaxed">
                          {item.def.description}
                        </p>

                        {item.serverSecretPresent && item.mode !== 'live' && !connected && (
                          <div className="border border-hairline bg-surface rounded p-2 text-[11px] text-secondary">
                            <strong>Server-side key hint:</strong>{' '}
                            {item.serverSecretName ?? 'Vault secret'} is present on the server;
                            run the connect flow to verify.
                          </div>
                        )}

                        {item.mode === 'simulation' && item.simMockLabel && (
                          <div className="border border-state-warning/20 bg-state-warning/10 rounded p-2 text-[11px] text-state-warning">
                            <strong>Simulation adapter:</strong> {item.simMockLabel}
                          </div>
                        )}

                        {item.state.error && (
                          <div className="border border-state-danger/20 bg-state-danger/10 rounded p-2 text-[11px] text-state-danger">
                            {item.state.error}
                          </div>
                        )}

                        {health && (
                          <div className="border border-hairline bg-surface/60 rounded p-2.5 text-[11px] font-mono space-y-1">
                            <div className="flex justify-between">
                              <span className="text-faint">Auth</span>
                              <span className={health.authValid ? 'text-state-success' : 'text-state-danger'}>
                                {health.authValid ? 'Valid' : 'Not verified'}
                              </span>
                            </div>
                            {health.lastSyncAt && (
                              <div className="flex justify-between">
                                <span className="text-faint">Last sync</span>
                                <span>{new Date(health.lastSyncAt).toLocaleString()}</span>
                              </div>
                            )}
                            {health.providerStatus && (
                              <div className="flex justify-between">
                                <span className="text-faint">Provider</span>
                                <span>{health.providerStatus}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-hairline flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            disabled={healthBusyId === item.id}
                            onClick={async () => {
                              setHealthBusyId(item.id);
                              try {
                                await onRunHealthCheck(item.id);
                              } finally {
                                setHealthBusyId(null);
                              }
                            }}
                            className="px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[11px] font-medium text-ink-800 hover:bg-surface"
                          >
                            {healthBusyId === item.id
                              ? 'Checking…'
                              : health
                                ? 'Re-check health'
                                : 'Health check'}
                          </button>

                          {item.mode !== 'simulation' && !connected && (
                            <button
                              type="button"
                              onClick={() => onEnableSimulation(item.id)}
                              className="px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[11px] font-medium text-ink-800 hover:bg-surface"
                            >
                              Enable simulation
                            </button>
                          )}

                          {connected && item.state.sandbox && item.mode === 'simulation' && (
                            <button
                              type="button"
                              onClick={() => onDisableIntegration(item.id)}
                              className="px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[11px] font-medium text-secondary hover:bg-surface"
                            >
                              Disable
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {connected ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenWizard(item)}
                                className="px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[11px] font-medium text-ink-900 hover:bg-surface"
                              >
                                Reconnect
                              </button>
                              <button
                                type="button"
                                onClick={() => onDisconnect(item.id)}
                                className="px-2.5 py-1 rounded border border-state-danger/20 bg-state-danger/10 text-[11px] font-medium text-state-danger hover:bg-state-danger/10"
                              >
                                Disconnect
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenWizard(item)}
                              className="px-3 py-1 rounded bg-[var(--mr-accent)] text-on-dark text-[11px] font-medium hover:bg-[var(--mr-accent-600)]"
                            >
                              {item.state.status === 'needs_attention' ? 'Retry Connect' : 'Connect'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      {/* Connect Wizard Drawer */}
      <SlideOverDrawer
        open={wizardItem !== null}
        onClose={() => onOpenWizard(null)}
        title={wizardItem ? `Connect — ${wizardItem.def.name}` : ''}
        subtitle={wizardItem?.def.description}
        testId="integration-connect-drawer"
        footer={
          wizardItem ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={wizardBusy}
                onClick={() => {
                  onSimulateConnect(wizardItem.id, wizardProvider || undefined);
                  onOpenWizard(null);
                }}
                className="px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-800 hover:bg-surface"
              >
                Simulate Connect (mock)
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenWizard(null)}
                  className="px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-secondary"
                >
                  Cancel
                </button>
                {wizardItem.def.authMethod === 'oauth' ? (
                  <button
                    type="button"
                    disabled={wizardBusy || !oauthCode.trim()}
                    onClick={async () => {
                      setWizardBusy(true);
                      setWizardError(null);
                      const res = await onCompleteOAuthExchange(
                        wizardItem.id,
                        wizardProvider,
                        oauthCode,
                        oauthClientId
                      );
                      setWizardBusy(false);
                      if (!res.ok) setWizardError(res.error ?? 'Exchange failed.');
                      else onOpenWizard(null);
                    }}
                    className="px-3.5 py-1.5 rounded bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)] disabled:opacity-40"
                  >
                    {wizardBusy ? 'Exchanging…' : 'Complete OAuth Exchange'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={wizardBusy}
                    onClick={async () => {
                      setWizardBusy(true);
                      setWizardError(null);
                      const res = await onTestApiKey(
                        wizardItem.id,
                        wizardProvider,
                        wizardFields
                      );
                      setWizardBusy(false);
                      if (!res.ok) setWizardError(res.error ?? 'Connection failed.');
                      else onOpenWizard(null);
                    }}
                    className="px-3.5 py-1.5 rounded bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)] disabled:opacity-40"
                  >
                    {wizardBusy ? 'Testing…' : 'Test Connection & Save'}
                  </button>
                )}
              </div>
            </div>
          ) : undefined
        }
      >
        {wizardItem && (
          <div className="space-y-4">
            {wizardItem.def.providerOptions && wizardItem.def.providerOptions.length > 0 && (
              <div>
                <div className="text-[12px] font-medium text-secondary mb-1.5">Provider</div>
                <div className="space-y-1.5">
                  {wizardItem.def.providerOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setWizardProvider(opt.id)}
                      className={`w-full text-left px-3 py-2 rounded border text-[13px] ${
                        wizardProvider === opt.id
                          ? 'border-ink-950 bg-surface font-medium text-ink-950'
                          : 'border-hairline text-secondary hover:bg-surface'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {wizardItem.def.authMethod === 'oauth' ? (
              <div className="space-y-3">
                <label className="block text-[12px]">
                  <span className="text-ink-600 font-medium block mb-1">
                    {wizardItem.def.oauth?.clientIdLabel ?? 'Client ID (public)'}
                  </span>
                  <input
                    type="text"
                    value={oauthClientId}
                    onChange={(e) => setOauthClientId(e.target.value)}
                    placeholder="Public application/client ID"
                    className="w-full px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px]"
                  />
                </label>
                {wizardItem.def.oauth && oauthClientId.trim() && (
                  <a
                    href={`${wizardItem.def.oauth.authorizeUrlBase}${
                      wizardItem.def.oauth.authorizeUrlBase.includes('?') ? '&' : '?'
                    }${wizardItem.def.oauth.clientIdParam}=${encodeURIComponent(
                      oauthClientId.trim()
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-[12px] font-medium text-[var(--mr-accent)] hover:underline"
                  >
                    Open provider consent screen in new tab
                  </a>
                )}
                <label className="block text-[12px]">
                  <span className="text-ink-600 font-medium block mb-1">
                    Authorization Code
                  </span>
                  <input
                    type="text"
                    value={oauthCode}
                    onChange={(e) => setOauthCode(e.target.value)}
                    placeholder="Paste authorization code from callback"
                    className="w-full px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] font-mono"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                {wizardItem.def.fields.map((f) => (
                  <label key={f.key} className="block text-[12px]">
                    <span className="text-ink-600 font-medium block mb-1">{f.label}</span>
                    <input
                      type={f.secret ? 'password' : 'text'}
                      value={wizardFields[f.key] ?? ''}
                      placeholder={f.placeholder}
                      onChange={(e) =>
                        setWizardFields((prev) => ({ ...prev, [f.key]: e.target.value }))
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px]"
                    />
                  </label>
                ))}
              </div>
            )}

            {wizardError && <NoticeBanner tone="danger" message={wizardError} />}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
