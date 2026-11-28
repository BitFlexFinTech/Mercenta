import { useMemo, useState } from 'react';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import {
  INTEGRATION_ORDER,
  INTEGRATION_REGISTRY,
  integrationMeta,
  serverSecretNameFor,
} from '@/integrations/registry';
import {
  INTEGRATION_CATEGORY_LABELS,
  INTEGRATION_MODE_LABELS,
  type IntegrationCategory,
  type IntegrationId,
  type IntegrationMode,
  type IntegrationState,
} from '@/integrations/types';
import { connectProvider, exchangeSpapiCode } from '@/lib/integrations/connectClient';
import { runHealthCheck } from '@/lib/integrations/health';
import { hasLiveTestEndpoint } from '@/lib/integrations/testCalls';
import {
  AdminIntegrationsView,
  type IntegrationCardItem,
  type IntegrationCategoryGroup,
  type IntegrationsFilter,
} from './AdminIntegrationsView';

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
  marketing: 'Outreach, prospecting and advertising providers.',
  ai: 'Model providers used by research and drafting workflows.',
  data: 'Market-data and web-fetch providers used by research workflows.',
  infrastructure: 'Hosted services operated by Mercenta itself.',
};

const SIM_MOCK_LABELS: Record<string, string> = {
  'dhl:': 'key mock:dhl-eu-demo-key · account MOCK-DHL-ACCOUNT-0001',
  'companies_house:': 'api key mock:ch-demo-key · company MOCK-CH-10000001',
  'hmrc:': 'oauth client mock:hmrc-demo-client · token mock:hmrc-demo-secret',
  'stripe:': 'mock:sub-XXXX subscriptions (Billing labels itself (Mock) mode)',
  'amazon_sp_api:': 'MOCK-SUB-XXXXX submissions · MOCK-PO-XXXX purchase-order pool',
  'esignature:': 'mock:env-XXXX envelopes (PandaDoc/DocuSign catalogue)',
};

function isAttention(state: IntegrationState, mode: IntegrationMode): boolean {
  return (
    mode === 'error' ||
    mode === 'degraded' ||
    state.status === 'needs_attention' ||
    state.health?.authValid === false
  );
}

export function AdminIntegrationsScreen() {
  const {
    integrations,
    disconnect,
    modes,
    setMode,
    serverSecrets,
    recordHealth,
    startConnect,
    failConnect,
    completeApiKeyConnect,
    completeSandboxConnect,
    oauthCodeReceived,
    markManualConnect,
  } = useIntegrations();

  const [filter, setFilter] = useState<IntegrationsFilter>('all');
  const [query, setQuery] = useState('');
  const [wizardFor, setWizardFor] = useState<IntegrationId | null>(null);

  function matchesFilter(f: IntegrationsFilter, id: IntegrationId): boolean {
    const mode = modes[id];
    if (f === 'attention') return isAttention(integrations[id], mode);
    if (f === 'all') return true;
    return mode === f;
  }

  const allItems: IntegrationCardItem[] = useMemo(
    () =>
      INTEGRATION_ORDER.map((id) => {
        const def = INTEGRATION_REGISTRY[id];
        const state = integrations[id];
        const mode = modes[id];
        const cat = integrationMeta(id).category;
        return {
          id,
          def,
          state,
          mode,
          modeLabel: INTEGRATION_MODE_LABELS[mode],
          categoryLabel: INTEGRATION_CATEGORY_LABELS[cat],
          serverSecretPresent: serverSecrets[id] === true,
          serverSecretName: serverSecretNameFor(id) ?? null,
          simMockLabel: SIM_MOCK_LABELS[`${id}:${state.provider ?? ''}`] ?? null,
        };
      }),
    [integrations, modes, serverSecrets]
  );

  const summaryCounts = useMemo(() => {
    const filters: IntegrationsFilter[] = [
      'all',
      'live',
      'simulation',
      'available',
      'configuring',
      'attention',
    ];
    const out = {} as Record<IntegrationsFilter, number>;
    for (const f of filters) {
      out[f] = INTEGRATION_ORDER.filter((id) => matchesFilter(f, id)).length;
    }
    return out;
  }, [integrations, modes]);

  const visibleItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allItems.filter((item) => {
      if (!matchesFilter(filter, item.id)) return false;
      if (!q) return true;
      return (
        item.def.name.toLowerCase().includes(q) ||
        item.def.description.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q)
      );
    });
  }, [allItems, filter, query, integrations, modes]);

  const groups: IntegrationCategoryGroup[] = useMemo(() => {
    const result: IntegrationCategoryGroup[] = [];
    for (const cat of HUB_CATEGORY_ORDER) {
      const items = visibleItems.filter((item) => integrationMeta(item.id).category === cat);
      if (items.length === 0) continue;
      result.push({
        category: cat,
        categoryLabel: INTEGRATION_CATEGORY_LABELS[cat],
        description: CATEGORY_DESCRIPTIONS[cat] ?? '',
        items,
      });
    }
    return result;
  }, [visibleItems]);

  const attentionNames = INTEGRATION_ORDER.filter((id) =>
    isAttention(integrations[id], modes[id])
  ).map((id) => INTEGRATION_REGISTRY[id].name);

  const wizardItem = wizardFor
    ? allItems.find((i) => i.id === wizardFor) ?? null
    : null;

  return (
    <AdminIntegrationsView
      totalProviders={INTEGRATION_ORDER.length}
      shownCount={visibleItems.length}
      filter={filter}
      onFilterChange={setFilter}
      query={query}
      onQueryChange={setQuery}
      summaryCounts={summaryCounts}
      attentionNames={attentionNames}
      groups={groups}
      onResetFilters={() => {
        setFilter('all');
        setQuery('');
      }}
      onRunHealthCheck={async (id) => {
        const def = INTEGRATION_REGISTRY[id];
        const state = integrations[id];
        const mode = modes[id];
        const next = await runHealthCheck(
          { getMode: () => mode, getState: () => state },
          id,
          def.authMethod,
          state.provider
        );
        recordHealth(id, next);
      }}
      onEnableSimulation={(id) => setMode(id, 'simulation')}
      onDisableIntegration={(id) => setMode(id, 'disabled')}
      onDisconnect={(id) => disconnect(id)}
      wizardItem={wizardItem}
      onOpenWizard={setWizardFor}
      onSimulateConnect={(id, provider) => {
        const def = INTEGRATION_REGISTRY[id];
        startConnect({ integrationId: id, provider });
        const metadata: Record<string, string> =
          id === 'amazon_sp_api'
            ? {
                mode: 'mock',
                marketplaceId: 'MOCK-MARKETPLACE-UK',
                clientMode: 'MockAmazonSPAPIClient',
              }
            : {
                mode: 'mock',
                clientMode: `Mock${def.name.replace(/[^A-Za-z0-9]/g, '')}Client`,
              };
        completeSandboxConnect(id, metadata);
      }}
      onTestApiKey={async (id, provider, fields) => {
        if (!hasLiveTestEndpoint(id, provider)) {
          markManualConnect(id, provider, {
            note: 'No provider API to verify — nothing was connected.',
          });
          return { ok: true };
        }
        const key = fields.api_key ?? '';
        if (!key.trim()) {
          const msg = 'API key is required.';
          failConnect(id, msg);
          return { ok: false, error: msg };
        }
        startConnect({ integrationId: id, provider: provider || undefined, fields });
        const result = await connectProvider({
          integrationId: id,
          provider,
          fields,
        });
        if (result.ok && result.secretRef && !result.simulated) {
          completeApiKeyConnect(id, provider, {
            httpStatus: String(result.httpStatus ?? 200),
            secretRef: result.secretRef,
          });
          return { ok: true };
        }
        const msg = result.error ?? 'The provider did not accept this key.';
        failConnect(id, msg);
        return { ok: false, error: msg };
      }}
      onCompleteOAuthExchange={async (id, provider, code, clientId) => {
        if (!code.trim()) return { ok: false, error: 'Authorization code is required.' };
        oauthCodeReceived(id, provider, code.slice(0, 12) + '…');
        startConnect({ integrationId: id, provider: provider || undefined });
        try {
          const data = await exchangeSpapiCode({
            code: code.trim(),
            clientId: clientId.trim(),
            redirectUri: window.location.origin + '/oauth/callback.html',
            marketplaceId: 'A1F83G8C2ARO7P',
          });
          if (!data.ok) {
            const msg = data.error ?? 'Exchange failed';
            failConnect(id, msg);
            return { ok: false, error: msg };
          }
          completeApiKeyConnect(id, provider, {
            mode: data.mode ?? 'real',
            marketplaceId: data.marketplaceId ?? 'A1F83G8C2ARO7P',
            expiresIn: String(data.expiresIn ?? 3600),
            ...(data.secretRef ? { secretRef: data.secretRef } : {}),
          });
          return { ok: true };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          failConnect(id, msg);
          return { ok: false, error: msg };
        }
      }}
    />
  );
}
