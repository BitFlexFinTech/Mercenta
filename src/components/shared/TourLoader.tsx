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
/* ── Usertour-format tour definition (embedded — single onboarding tour
     for the Usertour SDK path, kept here as its only consumer) ────── */

interface UsertourStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  isLast?: boolean;
}

interface UsertourDefinition {
  id: string;
  name: string;
  description: string;
  targetRoles?: string[];
  autoStart: boolean;
  steps: UsertourStep[];
}

const ONBOARDING_TOUR: UsertourDefinition = {
  id: 'brand-onboarding',
  name: 'Brand Portal Onboarding',
  description: 'Quick tour of the brand portal — shows you around the key sections.',
  targetRoles: [],
  autoStart: true,
  steps: [
    {
      id: 'welcome', title: 'Welcome to Mercenta Partners',
      description: 'This quick tour will show you around the brand portal. You can revisit this guide anytime from the Help menu.',
      targetSelector: '[data-tour="brand-dashboard"]', position: 'bottom',
    },
    {
      id: 'dashboard', title: 'Your Dashboard',
      description: 'Your dashboard shows your revenue, active shipments, compliance score, and any deductions at a glance.',
      targetSelector: '[data-tour="brand-dashboard"]', position: 'bottom',
    },
    {
      id: 'purchase_orders', title: 'Purchase Orders',
      description: 'Review and accept or reject POs here. Rejection affects your vendor performance — read the guidance in Settings > Operational Guidance.',
      targetSelector: '[data-tour="nav-purchase_orders"]', position: 'right',
    },
    {
      id: 'catalog', title: 'Product Catalog',
      description: 'Upload and manage your products. Your first product submission requires compliance gate approval.',
      targetSelector: '[data-tour="nav-catalog"]', position: 'right',
    },
    {
      id: 'logistics', title: 'Logistics Hub',
      description: 'Track shipments from your factory to the UK retail fulfilment network.',
      targetSelector: '[data-tour="nav-logistics"]', position: 'right',
    },
    {
      id: 'compliance', title: 'UK Compliance',
      description: 'Submit required compliance documents. The compliance gate must be cleared before you can submit products.',
      targetSelector: '[data-tour="nav-compliance"]', position: 'right',
    },
    {
      id: 'settings', title: 'Settings & Guidance',
      description: 'Configure your brand profile, team members, and operational guidance. The Operational Guidance page contains PO-rejection rules, shipping defaults, and compliance deadlines.',
      targetSelector: '[data-tour="nav-settings"]', position: 'right', isLast: true,
    },
  ],
};

function tourToUsertourPayload(tour: UsertourDefinition): Record<string, unknown> {
  return {
    id: tour.id,
    name: tour.name,
    description: tour.description,
    autoStart: tour.autoStart,
    targetRoles: tour.targetRoles,
    steps: tour.steps.map((step, i) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      targetSelector: step.targetSelector,
      position: step.position,
      isLast: step.isLast ?? i === tour.steps.length - 1,
    })),
  };
}

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
