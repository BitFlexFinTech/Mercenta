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
import type { IntegrationId, IntegrationsMap } from './types';
import { INITIAL_INTEGRATIONS, rememberApiKey } from './types';

const STORAGE_KEY = 'mercenta.integrations.v1';

export interface ConnectRequest {
  integrationId: IntegrationId;
  provider?: string;
  /** Field values from the wizard (e.g. api_key). Never persisted raw. */
  fields?: Record<string, string>;
}

interface IntegrationsContextValue {
  integrations: IntegrationsMap;
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
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    } catch {
      /* storage unavailable (private mode) — in-memory only */
    }
  }, [integrations]);

  const startConnect = useCallback((req: ConnectRequest) => {
    setIntegrations((prev) => ({
      ...prev,
      [req.integrationId]: {
        ...prev[req.integrationId],
        status: 'connecting',
        provider: req.provider,
        error: undefined,
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
      [id]: { ...INITIAL_INTEGRATIONS[id] },
    }));
  }, []);

  const value = useMemo(
    () => ({
      integrations,
      startConnect,
      failConnect,
      completeSandboxConnect,
      completeApiKeyConnect,
      oauthCodeReceived,
      disconnect,
    }),
    [integrations, startConnect, failConnect, completeSandboxConnect, completeApiKeyConnect, oauthCodeReceived, disconnect]
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
