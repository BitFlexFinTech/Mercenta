/**
 * §Batch 33 — Usertour tour definitions.
 *
 * Mirrors the existing TOUR_STEPS from src/types.ts into a format that
 * can be loaded into Usertour's SDK for visual tour management.
 *
 * These definitions serve as the default/seed tour data when Usertour is first
 * connected. The admin can then modify them visually via the Usertour dashboard.
 *
 * Each tour targets the brand portal and can be segmented by brand team role
 * (Owner, Shipping, Accounts, Compliance) via Usertour's Segmentation feature.
 */

export interface UsertourStep {
  id: string;
  title: string;
  description: string;
  /** CSS selector for the target element. */
  targetSelector: string;
  /** Position relative to target. */
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  /** Whether this is the last step. */
  isLast?: boolean;
}

export interface UsertourDefinition {
  id: string;
  name: string;
  description: string;
  /** Which brand role(s) this tour targets. Empty = all roles. */
  targetRoles?: string[];
  /** Whether the tour auto-starts on first login. */
  autoStart: boolean;
  steps: UsertourStep[];
}

/**
 * The default onboarding tour — mirrors the existing TOUR_STEPS from types.ts.
 * This is the first tour a brand sees when they log in for the first time.
 * It guides them through the brand portal's key sections.
 */
export const ONBOARDING_TOUR: UsertourDefinition = {
  id: 'brand-onboarding',
  name: 'Brand Portal Onboarding',
  description: 'Quick tour of the brand portal — shows you around the key sections.',
  targetRoles: [],
  autoStart: true,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Mercenta Partners',
      description: 'This quick tour will show you around the brand portal. You can revisit this guide anytime from the Help menu.',
      targetSelector: '[data-tour="brand-dashboard"]',
      position: 'bottom',
    },
    {
      id: 'dashboard',
      title: 'Your Dashboard',
      description: 'Your dashboard shows your revenue, active shipments, compliance score, and any deductions at a glance.',
      targetSelector: '[data-tour="brand-dashboard"]',
      position: 'bottom',
    },
    {
      id: 'purchase_orders',
      title: 'Purchase Orders',
      description: 'Review and accept or reject POs here. Rejection affects your vendor performance — read the guidance in Settings > Operational Guidance.',
      targetSelector: '[data-tour="nav-purchase_orders"]',
      position: 'right',
    },
    {
      id: 'catalog',
      title: 'Product Catalog',
      description: 'Upload and manage your products. Your first product submission requires compliance gate approval.',
      targetSelector: '[data-tour="nav-catalog"]',
      position: 'right',
    },
    {
      id: 'logistics',
      title: 'Inbound Shipments',
      description: 'Track shipments from your factory to the UK retail fulfilment network. Use DHL for parcel freight and Palletline for palletised loads.',
      targetSelector: '[data-tour="nav-logistics"]',
      position: 'right',
    },
    {
      id: 'compliance',
      title: 'UK Compliance',
      description: 'Submit required compliance documents. The compliance gate must be cleared before you can submit products to the retail channel.',
      targetSelector: '[data-tour="nav-compliance"]',
      position: 'right',
    },
    {
      id: 'settings',
      title: 'Settings & Guidance',
      description: 'Manage your bank info, team permissions, and notification preferences. The Operational Guidance section explains Net PPM, packaging standards, and PO rejection consequences.',
      targetSelector: '[data-tour="nav-settings"]',
      position: 'right',
      isLast: true,
    },
  ],
};

/**
 * A shorter tour for returning brands who have already completed onboarding.
 * Highlights new features and recent changes.
 */
export const WHATS_NEW_TOUR: UsertourDefinition = {
  id: 'whats-new',
  name: "What's New",
  description: 'Highlights of new features and recent changes in the brand portal.',
  targetRoles: [],
  autoStart: false,
  steps: [
    {
      id: 'freight-terms',
      title: 'Freight Term Info',
      description: 'Purchase Orders now show their freight terms (Collect vs Prepaid) and the relevant ship or delivery window dates.',
      targetSelector: '[data-tour="nav-purchase_orders"]',
      position: 'right',
    },
    {
      id: 'routing-request',
      title: 'Routing Request',
      description: 'For Freight Collect POs, you now need to submit a Routing Request before shipping — see the indicator in the PO card.',
      targetSelector: '[data-tour="nav-purchase_orders"]',
      position: 'right',
    },
    {
      id: 'csv-import',
      title: 'Bulk CSV Import',
      description: 'You can now import products in bulk via CSV. Click the "CSV Import" button in your Product Catalog page.',
      targetSelector: '[data-tour="nav-catalog"]',
      position: 'right',
      isLast: true,
    },
  ],
};

/**
 * PO Fulfillment Flow Tour — guides the brand through acknowledging a PO,
 * filling in carton details, and shipping.
 */
export const PO_FULFILLMENT_TOUR: UsertourDefinition = {
  id: 'po-fulfillment',
  name: 'PO Fulfillment Flow',
  description: 'Step-by-step guide through acknowledging a new purchase order and preparing the shipment.',
  targetRoles: [],
  autoStart: false,
  steps: [
    {
      id: 'po-arrived',
      title: 'You\'ve received a new PO',
      description: 'Here\'s what to do: A new purchase order has been issued to your brand. Click "View Details" to review it.',
      targetSelector: '[data-tour="nav-purchase_orders"]',
      position: 'right',
    },
    {
      id: 'accept-lines',
      title: 'Accept each line item',
      description: 'Review each product line in the PO. You have 24 hours to accept, reject, or backorder each line. Rejected lines require a reason code.',
      targetSelector: '[data-tour="po-line-ack"]',
      position: 'bottom',
    },
    {
      id: 'auto-shipment',
      title: 'Shipment auto-created',
      description: 'Once all lines are accepted, your shipment is automatically created for you. You just need to add carton details — the product names and quantities are already pre-filled.',
      targetSelector: '[data-tour="nav-logistics"]',
      position: 'right',
    },
    {
      id: 'carton-details',
      title: 'Add carton details',
      description: 'Enter how many cartons you\'re shipping, the weight per carton (kg), and dimensions (L×W×H cm). That\'s all the information we need.',
      targetSelector: '[data-tour="shipment-carton-form"]',
      position: 'bottom',
    },
    {
      id: 'download-labels',
      title: 'Download shipping labels',
      description: 'Download your shipping labels here. Stick one label on each carton before DHL collects them.',
      targetSelector: '[data-tour="btn-download-labels"]',
      position: 'left',
    },
    {
      id: 'pack-ship',
      title: 'Pack and ship',
      description: 'Pack your boxes. DHL will collect them at the scheduled time. We handle the rest — the ASN (Advanced Ship Notice) is filed with Amazon automatically. You don\'t need to do anything else.',
      targetSelector: '[data-tour="nav-logistics"]',
      position: 'right',
      isLast: true,
    },
  ],
};
/**
 * All available tours for the brand portal.
 * Admin can manage these visually via the Usertour dashboard.
 */
export const ALL_TOURS: UsertourDefinition[] = [
  ONBOARDING_TOUR,
PO_FULFILLMENT_TOUR,
  WHATS_NEW_TOUR,
];

/**
 * Converts a UsertourDefinition to a Usertour-compatible JSON payload
 * for the SDK's `startTour` method.
 */
export function tourToUsertourPayload(tour: UsertourDefinition): Record<string, unknown> {
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
