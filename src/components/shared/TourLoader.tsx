/**
 * §Batch 33 — Tour loader component.
 *
 * Decides between Usertour-powered tours vs. the fallback TourEngine.
 * - When Usertour is connected (real credentials configured): loads the
 *   Usertour SDK, calls identify() with the brand session, and starts the
 *   onboarding tour via the SDK.
 * - When Usertour is NOT connected: falls back to the existing TourEngine
 *   (custom-built tour system) so the brand experience is never broken.
 *
 * This is a drop-in replacement for the existing <TourEngine> component
 * in App.tsx. No other code changes needed.
 */
import { useEffect, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { TourEngine } from '@/components/shared/TourEngine';
import { useUsertour } from '@/lib/usertour/useUsertour';
import { ONBOARDING_TOUR, tourToUsertourPayload } from '@/lib/usertour/tourDefinitions';

interface TourLoaderProps {
  currentView: string;
  isBrandPortal: boolean;
}

export function TourLoader({ currentView, isBrandPortal }: TourLoaderProps) {
  const { session } = useApp();
  const { integrations } = useIntegrations();
  const utState = integrations.usertour;
  const usertourConnected = utState?.status === 'connected';
  const { loaded: usertourLoaded } = useUsertour();
  const [tourStarted, setTourStarted] = useState(false);

  // When Usertour SDK is loaded, start the onboarding tour
  useEffect(() => {
    if (!usertourConnected || !usertourLoaded || !window.usertour || tourStarted) return;
    if (!session?.tenantId) return;

    // Start the onboarding tour via Usertour SDK
    // The SDK handles step progression, dismissals, and completion tracking
    const payload = tourToUsertourPayload(ONBOARDING_TOUR);
    window.usertour.identify(session.tenantId, {
      role: session.tier ?? 'brand',
      tenantId: session.tenantId,
      tour: payload.id,
    });
    setTourStarted(true);
  }, [usertourConnected, usertourLoaded, session, tourStarted]);

  // If Usertour is connected and loaded, just render the bridge (SDK handles everything)
  if (usertourConnected && usertourLoaded) {
    return null;
  }

  // Fallback to the existing TourEngine when Usertour is not connected
  return <TourEngine currentView={currentView} isBrandPortal={isBrandPortal} />;
}
