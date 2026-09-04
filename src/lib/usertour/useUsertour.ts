/**
 * §Batch B — Usertour SDK integration hook.
 * Loads the Usertour.js SDK into the brand portal and calls identify()
 * with the brand's session/role so Segmentation can target tours by team role.
 */
import { useEffect, useRef } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useIntegrations } from '@/integrations/IntegrationsContext';

declare global {
  interface Window {
    usertour?: {
      init: (config: { appId: string }) => void;
      identify: (userId: string, traits: Record<string, unknown>) => void;
      reset: () => void;
    };
  }
}

export function useUsertour(): { loaded: boolean } {
  const { session } = useApp();
  const { integrations } = useIntegrations();
  const utState = integrations.usertour;
  const loadedRef = useRef(false);
  const connected = utState?.status === 'connected';
  const apiUrl = utState?.metadata?.api_url || 'http://localhost:8090';
  const appId = utState?.metadata?.app_id || 'mercenta-brand-portal';

  useEffect(() => {
    if (!connected || loadedRef.current) return;
    const script = document.createElement('script');
    script.src = apiUrl + '/sdk.js';
    script.async = true;
    script.onload = () => {
      window.usertour?.init({ appId });
      loadedRef.current = true;
    };
    document.head.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [connected, apiUrl, appId]);

  useEffect(() => {
    if (!connected || !loadedRef.current || !window.usertour) return;
    if (!session?.tenantId) return;
    window.usertour.identify(session.tenantId, {
      role: session.tier ?? 'brand',
      tenantId: session.tenantId,
    });
  }, [connected, session]);

  return { loaded: loadedRef.current };
}
