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
 * Persistence: localStorage for now (super-admin convenience); once a Supabase
 * project is connected, secrets must live in Vault, never in plain columns or
 * localStorage.
 *
 * CORRECTED 2026-09-27 — THE CONNECTION-RECORD SCHEMA DOES NOT EXIST. This file
 * used to name `supabase/migrations/0002_integration_connections.sql` as the
 * table that replaces the localStorage map, but no such migration is in the
 * repository (27 migrations are present and none covers integration
 * connections). Writing it is Batch 1b work; until then a real key has nowhere
 * durable to go and nothing durable may be claimed.
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
import { INITIAL_INTEGRATIONS, modeForState } from './types';
import { probeServerSecrets, type ServerSecretPresence } from './serverSecrets';
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
  /**
   * §BATCH1b — record a provider that has NO API to connect (e.g. CSV import).
   * NOTHING is verified and NOTHING live is claimed: the mode stays the registry
   * default (`available`), never `live`.
   */
  markManualConnect: (
    id: IntegrationId,
    provider: string,
    metadata?: Record<string, string>
  ) => void;
  disconnect: (id: IntegrationId) => void;
  /** §2A — operator-forced mode change (disable / restore simulation). */
  setMode: (id: IntegrationId, mode: IntegrationMode) => void;
  /** §2A — write a health snapshot for the Hub. */
  recordHealth: (id: IntegrationId, patch: Partial<IntegrationHealth>) => void;
  /** §2A — record a completed sync. */
  recordSync: (id: IntegrationId) => void;
  /** §22 — record a provider failure (bumps errorCount, surfaces error). */
  recordIntegrationError: (id: IntegrationId, error: string) => void;
  /**
   * §PHASE B — which providers have a key held SERVER-side (Supabase Vault).
   *
   * A HINT ONLY: it means Mercenta holds a credential the server can use, so the
   * live test may be attempted. It is NEVER a connection state and must never be
   * rendered as `connected` or `live` (the business model forbids claiming a
   * provider is live when it is merely configured).
   *
   * Always empty in demo, and empty on any failure.
   */
  serverSecrets: ServerSecretPresence;
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
    /* §PHASE B (2026-10-13) — REPOINTED: the three "auto-connect from a VITE_*
       key" blocks that used to live here are REMOVED. They read `import.meta.env` in the
       BROWSER, and Vite inlines every `VITE_*` value into the public bundle, so
       they only worked by shipping the provider's key to every visitor. They also
       marked a provider `connected` (sandbox: false) on nothing more than a
       variable being set — the exact "never claim a provider is live when it is
       merely configured" failure the business model forbids.

       A server-held key is now reported as a HINT only (`serverSecrets`), and a
       real connection is still established through the connect wizard. */
    return loadPersisted();
  });

  /**
   * §PHASE B — which providers have a key held SERVER-side (Supabase Vault).
   *
   * Asked of the server, never read from the bundle. Empty in demo (no Supabase
   * project) and on any failure, so the demo needs no credential and no hint is
   * ever invented.
   */
  const [serverSecrets, setServerSecrets] = useState<ServerSecretPresence>({});

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

  /**
   * §PHASE B — ask the server which providers have a Vault-held key.
   *
   * This REPLACES the removed `import.meta.env` reads. It resolves to nothing at
   * all when there is no Supabase project (the demo) or when the server refuses,
   * so the investor demonstration never waits on it and never shows a hint it
   * cannot justify.
   */
  useEffect(() => {
    let cancelled = false;
    void probeServerSecrets().then((presence) => {
      if (!cancelled) setServerSecrets(presence);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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

  /**
   * §BATCH1b — a provider with no API (CSV import). The operator's choice is
   * recorded, but no verification happened, so the status stays NOT connected and
   * `modeForState` keeps the registry default. This replaces the previous
   * behaviour, which marked such a provider `connected` with `sandbox: false` —
   * i.e. it displayed "Live" without anything having been verified.
   */
  const markManualConnect = useCallback(
    (id: IntegrationId, provider: string, metadata?: Record<string, string>) => {
      setIntegrations((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: 'disconnected',
          provider,
          sandbox: undefined,
          disabled: false,
          metadata: {
            ...prev[id].metadata,
            ...metadata,
            mode: 'no-live-endpoint',
            verified: 'not-applicable-no-api',
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
      markManualConnect,
      disconnect,
      setMode,
      recordHealth,
      recordSync,
      recordIntegrationError,
      serverSecrets,
    }),
    [
      integrations,
      modes,
      startConnect,
      failConnect,
      completeSandboxConnect,
      completeApiKeyConnect,
      oauthCodeReceived,
      markManualConnect,
      disconnect,
      setMode,
      recordHealth,
      recordSync,
      recordIntegrationError,
      serverSecrets,
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
