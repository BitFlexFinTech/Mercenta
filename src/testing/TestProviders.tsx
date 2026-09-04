import type * as React from 'react';
/**
 * TEST-ONLY helper (scripts/*): composes the full provider stack inside the
 * Vite module graph so validators render views with consistent instances.
 * Not exported by the app bundle.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { AppProvider } from '@/context/GlobalStateContext';
import { IntegrationsProvider } from '@/integrations/IntegrationsContext';
import { INITIAL_INTEGRATIONS } from '@/integrations/types';

export function TestProviders({
  children,
  integrations,
  client,
}: {
  children: React.ReactNode;
  integrations?: Record<string, unknown>;
  /** Pass a pre-seeded QueryClient; one is created otherwise. */
  client?: QueryClient;
}) {
  const qc = client ?? new QueryClient();
  return createElement(
    AppProvider,
    null,
    createElement(IntegrationsProvider, {
      initialState: { ...INITIAL_INTEGRATIONS, ...(integrations ?? {}) },
      children: createElement(QueryClientProvider, { client: qc }, children),
    })
  );
}

export function makeQueryClient(): QueryClient {
  return new QueryClient();
}
