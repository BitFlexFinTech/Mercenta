/**
 * §14 Integrations state.
 *
 * The generic connect flow every card runs:
 *   1. collect auth (OAuth redirect placeholder / API key input)
 *   2. backend exchange + encrypted secret storage  ← Edge Function, NOT yet wired
 *   3. live harmless test call                      ← Edge Function, NOT yet wired
 *   4. card status reflects the real outcome
 *
 * Until steps 2–3 exist as real Edge Functions, connects complete in
 * `sandbox: true` mode: the UI clearly marks them "Sandbox verification" and
 * `isConnected()` (used to gate features) only returns true for
 * non-sandbox connections, so no feature can silently treat a simulated
 * connect as a verified production credential.
 *
 * Persistence: localStorage for now (super-admin convenience); the
 * supabase/migrations/0002_integration_connections.sql table replaces this
 * once a Supabase project is connected — secrets must then live in Vault,
 * never in plain columns or localStorage.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  IntegrationId,
  IntegrationMode,
  IntegrationHealth,
  IntegrationsMap,
} from './types';
import { INITIAL_INTEGRATIONS, modeForState, rememberApiKey } from './types';
import { INTEGRATION_REGISTRY, integrationMeta } from './registry';
import { rememberIntegrations } from './connections';

const STORAGE_KEY = 'mercenta.integrations.v1';

export interface ConnectRequest {
  integrationId: IntegrationId;
  provider?: string;
  /** Field values from the wizard (e.g. api_key). Never persisted raw. */
  fields?: Record<string, string>;
}

interface IntegrationsContextValue {
  integrations: IntegrationsMap;
  /**
   * §8 — derived operational mode per integration, computed from connection
   * state + registry default. UI should read this, never re-derive colours.
   */
  modes: Record<IntegrationId, IntegrationMode>;
  startConnect: (req: ConnectRequest) => void;
  failConnect: (id: IntegrationId, error: string) => void;
  completeSandboxConnect: (
    id: IntegrationId,
    metadata?: Record<string, string>
  ) => void;
  completeApiKeyConnect: (
    id: IntegrationId,
    provider: string,
    metadata?: Record<string, string>
  ) => void;
  oauthCodeReceived: (id: IntegrationId, provider: string, codePreview: string) => void;
  disconnect: (id: IntegrationId) => void;
  /** §2A — operator-forced mode change (disable / restore simulation). */
  setMode: (id: IntegrationId, mode: IntegrationMode) => void;
  /** §2A — write a health snapshot for the Hub. */
  recordHealth: (id: IntegrationId, patch: Partial<IntegrationHealth>) => void;
  /** §2A — record a completed sync. */
  recordSync: (id: IntegrationId) => void;
  /** §22 — record a provider failure (bumps errorCount, surfaces error). */
  recordIntegrationError: (id: IntegrationId, error: string) => void;
}

const IntegrationsContext = createContext<IntegrationsContextValue | null>(null);

function loadPersisted(): IntegrationsMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_INTEGRATIONS;
    return { ...INITIAL_INTEGRATIONS, ...(JSON.parse(raw) as IntegrationsMap) };
  } catch {
    return INITIAL_INTEGRATIONS;
  }
}

export function IntegrationsProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  /** Seed states directly (tests now; Supabase hydration of connection records later). */
  initialState?: Partial<IntegrationsMap>;
}) {
  const [integrations, setIntegrations] = useState<IntegrationsMap>(() => {
    if (initialState) return { ...INITIAL_INTEGRATIONS, ...initialState };
    const persisted = loadPersisted();
    // Auto-connect OpenRouter when a demo key is provided via env var.
    // This lets the investor demo show a real connected integration without
    // opening the Integrations wizard. The key is never persisted to localStorage.
    const demoOpenRouterKey = (typeof import.meta !== 'undefined' && import.meta.env.VITE_OPENROUTER_API_KEY) as string | undefined;
    if (demoOpenRouterKey && persisted.openrouter.status !== 'connected') {
      rememberApiKey('openrouter', demoOpenRouterKey);
      persisted.openrouter = {
        status: 'connected',
        connectedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
        sandbox: false,
        metadata: { verified: 'env-var', note: 'Auto-connected via VITE_OPENROUTER_API_KEY for demo mode' },
      };
    }
    // Auto-connect Hunter.io when demo key is provided via env var.
    const demoHunterKey = (typeof import.meta !== 'undefined' && import.meta.env.VITE_HUNTER_API_KEY) as string | undefined;
    if (demoHunterKey && persisted.hunter.status !== 'connected') {
      rememberApiKey('hunter', demoHunterKey);
      persisted.hunter = {
        status: 'connected',
        connectedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
        sandbox: false,
        metadata: { verified: 'env-var', note: 'Auto-connected via VITE_HUNTER_API_KEY for demo mode' },
      };
    }
    // Auto-connect Instantly.ai when demo key is provided via env var.
    const demoInstantlyKey = (typeof import.meta !== 'undefined' && import.meta.env.VITE_INSTANTLY_API_KEY) as string | undefined;
    if (demoInstantlyKey && persisted.instantly.status !== 'connected') {
      rememberApiKey('instantly', demoInstantlyKey);
      persisted.instantly = {
        status: 'connected',
        connectedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
        sandbox: false,
        metadata: { verified: 'env-var', note: 'Auto-connected via VITE_INSTANTLY_API_KEY for demo mode' },
      };
    }
    return persisted;
  });

  useEffect(() => {
    try {
      // Secrets are intentionally NOT stored here — only status/metadata.
      const safe = Object.fromEntries(
        Object.entries(integrations).map(([k, v]) => [k, { ...v }])
      ) as IntegrationsMap;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
      // Mirror for non-React consumers (mock-first factories resolve LIVE here).
      rememberIntegrations(safe);
    } catch {
      /* storage unavailable (private mode) — in-memory only */
    }
  }, [integrations]);

  /** §8 — single derivation of every integration's operational mode. */
  const modes = useMemo(() => {
    const out = {} as Record<IntegrationId, IntegrationMode>;
    (Object.keys(INTEGRATION_REGISTRY) as IntegrationId[]).forEach((id) => {
      out[id] = modeForState(integrations[id], integrationMeta(id).defaultMode);
    });
    return out;
  }, [integrations]);

  const startConnect = useCallback((req: ConnectRequest) => {
    setIntegrations((prev) => ({
      ...prev,
      [req.integrationId]: {
        ...prev[req.integrationId],
        status: 'connecting',
        provider: req.provider,
        error: undefined,
        disabled: false,
      },
    }));
  }, []);

  const failConnect = useCallback((id: IntegrationId, error: string) => {
    setIntegrations((prev) => ({
      ...prev,
      [id]: { ...prev[id], status: 'needs_attention', error },
    }));
  }, []);

  const completeSandboxConnect = useCallback(
    (id: IntegrationId, metadata?: Record<string, string>) => {
      const now = new Date().toISOString();
      setIntegrations((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: 'connected',
          connectedAt: now,
          lastVerifiedAt: now,
          metadata: { ...prev[id].metadata, ...metadata, sandbox: 'true' },
          sandbox: true,
          disabled: false,
          error: undefined,
        },
      }));
    },
    []
  );

  /** §Stage-7 — a REAL live test call succeeded: genuine connected state. */
  const completeApiKeyConnect = useCallback(
    (id: IntegrationId, provider: string, metadata?: Record<string, string>) => {
      const now = new Date().toISOString();
      setIntegrations((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: 'connected',
          connectedAt: now,
          lastVerifiedAt: now,
          provider,
          sandbox: false,
          disabled: false,
          metadata: { ...prev[id].metadata, ...metadata, verified: 'live-test-call' },
          error: undefined,
        },
      }));
    },
    []
  );

  /** §Stage-7 — OAuth authorization code captured; exchange happens server-side. */
  const oauthCodeReceived = useCallback(
    (id: IntegrationId, provider: string, codePreview: string) => {
      const now = new Date().toISOString();
      setIntegrations((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: 'code_received',
          provider,
          lastVerifiedAt: now,
          sandbox: false,
          disabled: false,
          metadata: {
            ...prev[id].metadata,
            codePreview,
            note: 'Authorization code received — token exchange pending Edge Function deployment.',
          },
          error: undefined,
        },
      }));
    },
    []
  );

  const disconnect = useCallback((id: IntegrationId) => {
    setIntegrations((prev) => ({
      ...prev,
      [id]: { ...INITIAL_INTEGRATIONS[id], health: { errorCount: 0 } },
    }));
  }, []);

  /**
   * §2A — operator-forced mode change. Supports `disabled` (keep config,
   * stop using) and `simulation` (explicitly simulated). LIVE can never be
   * forced — it is earned only by a completed non-sandbox connect.
   */
  const setMode = useCallback((id: IntegrationId, mode: IntegrationMode) => {
    setIntegrations((prev) => {
      const cur = prev[id];
      if (mode === 'disabled') {
        return { ...prev, [id]: { ...cur, disabled: true, error: undefined } };
      }
      if (mode === 'simulation') {
        return { ...prev, [id]: { ...cur, disabled: false, sandbox: true } };
      }
      return { ...prev, [id]: { ...cur, disabled: false } };
    });
  }, []);

  /** §2A — merge a health snapshot (errorCount defaults to existing). */
  const recordHealth = useCallback((id: IntegrationId, patch: Partial<IntegrationHealth>) => {
    setIntegrations((prev) => {
      const cur = prev[id];
      const base = cur.health ?? { errorCount: 0 };
      return {
        ...prev,
        [id]: { ...cur, health: { ...base, ...patch, errorCount: patch.errorCount ?? base.errorCount } },
      };
    });
  }, []);

  /** §2A — record a completed sync (clears lastErrorAt, sets lastSyncAt). */
  const recordSync = useCallback((id: IntegrationId) => {
    setIntegrations((prev) => {
      const cur = prev[id];
      const base = cur.health ?? { errorCount: 0 };
      return {
        ...prev,
        [id]: {
          ...cur,
          health: {
            ...base,
            lastSyncAt: new Date().toISOString(),
            lastSuccessfulRequestAt: new Date().toISOString(),
            lastErrorAt: undefined,
          },
        },
      };
    });
  }, []);

  /** §22 — record a provider failure (increments errorCount, surfaces error). */
  const recordIntegrationError = useCallback((id: IntegrationId, error: string) => {
    setIntegrations((prev) => {
      const cur = prev[id];
      const base = cur.health ?? { errorCount: 0 };
      return {
        ...prev,
        [id]: {
          ...cur,
          status: 'needs_attention',
          error,
          health: {
            ...base,
            errorCount: base.errorCount + 1,
            lastErrorAt: new Date().toISOString(),
            authValid: false,
          },
        },
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      integrations,
      modes,
      startConnect,
      failConnect,
      completeSandboxConnect,
      completeApiKeyConnect,
      oauthCodeReceived,
      disconnect,
      setMode,
      recordHealth,
      recordSync,
      recordIntegrationError,
    }),
    [
      integrations,
      modes,
      startConnect,
      failConnect,
      completeSandboxConnect,
      completeApiKeyConnect,
      oauthCodeReceived,
      disconnect,
      setMode,
      recordHealth,
      recordSync,
      recordIntegrationError,
    ]
  );

  return (
    <IntegrationsContext.Provider value={value}>
      {children}
    </IntegrationsContext.Provider>
  );
}

export function useIntegrations(): IntegrationsContextValue {
  const ctx = useContext(IntegrationsContext);
  if (!ctx) throw new Error('useIntegrations must be used within IntegrationsProvider');
  return ctx;
}
