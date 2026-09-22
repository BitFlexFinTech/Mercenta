/**
 * §Multi-tour — Brand guided onboarding tours.
 *
 * All 9 tour definitions for the brand portal, matching the step format
 * used by TourEngine.tsx (types from TOUR_STEPS in src/types.ts).
 *
 * Each tour can auto-start, be force-shown before the user can act
 * (Tour 1, Tour 3), or be manually started from Settings.
 */

export interface TourStep {
  id: string;
  title: string;
  description: string;
  /** CSS selector for the target element. */
  targetSelector: string;
  /** Position relative to target. */
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  /** Action for the step button. */
  action: 'next' | 'finish';
  /** §Functional-completion — Knowledge Base article id shown as a
   *  contextual "Learn more" link on this step (UserTour → article). */
  learnMore?: string;
}

export interface TourDefinition {
  id: string;
  name: string;
  description: string;
  /** Whether this tour auto-starts when conditions are met. */
  autoStart: boolean;
  /** If true, brand MUST see this tour before they can act on related pages. */
  forceFirst: boolean;
  /** The tour steps. */
  steps: TourStep[];
  /** Which page view(s) trigger auto-start. */
  autoStartViews?: string[];
}
/* ── Tour 1: First Login / Orientation ─────────────────────────────── */

export const ORIENTATION_TOUR: TourDefinition = {
  id: 'orientation',
  name: 'Welcome & Orientation',
  description: 'First-time orientation — walks you through the main navigation and key rules.',
  autoStart: true,
  forceFirst: true,
  steps: [
    {
      id: 'orientation-welcome',
      title: 'Welcome to Mercenta Partners',
      description: 'Mercenta connects your brand to the UK retail channel\'s wholesale channel. Your role: manage products, acknowledge Purchase Orders, file shipments, and keep compliance documents current. This tour shows you what matters most.',
      targetSelector: '[data-tour="brand-dashboard"]',
      position: 'bottom',
      action: 'next',
      learnMore: 'kb-welcome',
    },
    {
      id: 'orientation-dashboard',
      title: 'Your Dashboard',
      description: 'This is your command centre. At a glance you\'ll see revenue, active shipments, your compliance score, and any deductions. Each metric card can be clicked for more detail.',
      targetSelector: '[data-tour="brand-dashboard"]',
      position: 'bottom',
      action: 'next',
      learnMore: 'kb-dashboard',
    },
    {
      id: 'orientation-purchase-orders',
      title: 'Purchase Orders — 24-Hour Rule',
      description: 'You will receive Purchase Orders from the retail channel. You must acknowledge each one within 24 hours or it will be flagged. A flagged PO may result in a vendor performance deduction. Visit this section daily.',
      targetSelector: '[data-tour="nav-purchase_orders"]',
      position: 'right',
      action: 'next',
      learnMore: 'kb-purchase-orders',
    },
    {
      id: 'orientation-catalog',
      title: 'Product Catalog',
      description: 'Upload and manage your products here. Each product needs a SKU, EAN, ex-works cost, case-pack quantity, and high-quality images. Your catalog must pass compliance before it goes live.',
      targetSelector: '[data-tour="nav-catalog"]',
      position: 'right',
      action: 'next',
      learnMore: 'kb-catalog',
    },
    {
      id: 'orientation-logistics',
      title: 'Inbound Shipments',
      description: 'When a PO is accepted, you create a shipment from your factory to the UK retail channel. You\'ll file carton-level details, choose a carrier, and submit an ASN (Advanced Shipment Notice).',
      targetSelector: '[data-tour="nav-logistics"]',
      position: 'right',
      action: 'next',
      learnMore: 'kb-shipments',
    },
    {
      id: 'orientation-compliance',
      title: 'Compliance — No Expiry Allowed',
      description: 'Your compliance documents must stay current. If ANY document expires, your catalog is automatically disabled and you cannot receive new POs. Mercenta handles customs (EORI/VAT) — you do not need to provide your own.',
      targetSelector: '[data-tour="nav-compliance"]',
      position: 'right',
      action: 'next',
      learnMore: 'kb-compliance',
    },
    {
      id: 'orientation-support',
      title: 'Support & Team',
      description: 'Use the Support section to contact Mercenta. Messages are logged and tracked. Your team members have different roles — they only see their relevant sections.',
      targetSelector: '[data-tour="team"]',
      position: 'right',
      action: 'next',
    },
    {
      id: 'orientation-settings',
      title: 'Settings',
      description: 'Manage your bank info, team permissions, and notifications here. You can restart any tour from Settings at any time.',
      targetSelector: '[data-tour="nav-settings"]',
      position: 'right',
      action: 'finish',
      learnMore: 'kb-guidance',
    },
  ],
};
/* ── Tour 2: Product Catalog & Image Upload ────────────────────────── */

export const CATALOG_TOUR: TourDefinition = {
  id: 'catalog',
  name: 'Product Catalog & Images',
  description: 'Walk through adding a product and understanding image requirements.',
  autoStart: false,
  forceFirst: false,
  autoStartViews: ['catalog'],
  steps: [
    {
      id: 'catalog-add-product',
      title: 'Adding a Product',
      description: 'Click "Add Product" to create a new listing. You\'ll need: SKU (your internal code), EAN (barcode), Ex-Works cost (your factory price in GBP), and case-pack quantity (units per master carton). Get these right the first time.',
      targetSelector: '[data-tour="catalog-add-btn"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'catalog-image-requirements',
      title: 'Image Requirements',
      description: 'The retail channel requires: white background, minimum 1000×1000 px, at least 5 images per product. Include: 1× hero (front-facing), 2× lifestyle (in-use), 1× detail (close-up of features), 1× scale/size comparison. No text overlays on the main image.',
      targetSelector: '[data-tour="catalog-images"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'catalog-cost-pricing',
      title: 'Set Your Price Correctly',
      description: 'The retail channel auto-rejects cost increases after submission. If you submit a product at £10.00 and later try to increase it to £12.00, the retail channel will reject the change. Set your ex-works cost and margin correctly the first time.',
      targetSelector: '[data-tour="catalog-cost"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'catalog-net-ppm',
      title: 'Net PPM Benchmarks',
      description: 'Net PPM (Profit per Minute) measures your profitability in the retail channel\'s system. A healthy Net PPM is 15+. Below 10, the retail channel may delist your product. Check your Net PPM in the Operational Guidance section of Settings.',
      targetSelector: '[data-tour="nav-settings"]',
      position: 'right',
      action: 'next',
    },
    {
      id: 'catalog-compliance-gate',
      title: 'Compliance Gate',
      description: 'Your catalog sync is gated by compliance. If your documents are expired or missing, your products won\'t go live. Check your compliance status in the Compliance section before submitting new products.',
      targetSelector: '[data-tour="nav-compliance"]',
      position: 'right',
      action: 'finish',
    },
  ],
};
/* ── Tour 3: Purchase Order Acknowledgment ─────────────────────────── */

export const PO_ACKNOWLEDGMENT_TOUR: TourDefinition = {
  id: 'po-acknowledgment',
  name: 'PO Acknowledgment',
  description: 'How to acknowledge Purchase Orders — accept, reject, or backorder lines.',
  autoStart: true,
  forceFirst: true,
  autoStartViews: ['purchase_orders'],
  steps: [
    {
      id: 'po-new-arrival',
      title: 'New PO Arrived',
      description: 'A new Purchase Order from the retail channel has arrived. It shows the PO number, ship/delivery window, line items, quantities, and unit prices. Review everything carefully before acknowledging.',
      targetSelector: '[data-tour="po-list"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'po-line-items',
      title: 'Line-Item Decisions',
      description: 'For each line item you can: Accept (ship the full quantity), Reject (refuse the line), or Backorder (ship later). You cannot acknowledge more than the ordered quantity.',
      targetSelector: '[data-tour="po-line-items"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'po-24-hour-rule',
      title: '24-Hour Window',
      description: 'You have 24 hours to acknowledge this PO. If you miss the window, the PO is flagged and may result in a deduction from the retail channel. Always check your PO list at least once per day.',
      targetSelector: '[data-tour="po-deadline"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'po-reject-reason',
      title: 'Rejection Requires Reason Code',
      description: 'If you reject a line item, you must select a reason code (e.g. "Out of stock", "Discontinued", "Price dispute"). Frequent rejections affect your vendor performance score.',
      targetSelector: '[data-tour="po-reject-reason"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'po-backorder-date',
      title: 'Backorder Requires Ship Date',
      description: 'A line may only be backordered where the retail channel allows it on that line — otherwise accept it or reject it with a reason code. Where a backorder is allowed, you must provide a scheduled ship date, and the retail channel expects you to meet it.',
      targetSelector: '[data-tour="po-backorder-date"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'po-asn-accuracy',
      title: 'ASN Accuracy Warning',
      description: 'If you acknowledge a quantity and later file an ASN with different quantities, the retail channel may apply a deduction for ASN inaccuracy. Acknowledge only what you can actually ship.',
      targetSelector: '[data-tour="po-asn-warning"]',
      position: 'bottom',
      action: 'finish',
    },
  ],
};
/* ── Tour 4: Shipping & ASN Filing ─────────────────────────────────── */

export const SHIPPING_TOUR: TourDefinition = {
  id: 'shipping',
  name: 'Shipping & ASN Filing',
  description: 'Walk through creating a shipment and filing an ASN correctly.',
  autoStart: false,
  forceFirst: false,
  autoStartViews: ['logistics'],
  steps: [
    {
      id: 'shipping-create-shipment',
      title: 'Creating a Shipment',
      description: 'Click "Create Shipment" to start. You\'ll provide carton-level details: weight per carton (kg), dimensions (cm), number of cartons, carrier selection, and tracking number or BOL.',
      targetSelector: '[data-tour="shipment-create-btn"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'shipping-carton-matching',
      title: 'Carton Contents Must Match',
      description: 'Your carton contents must match your acknowledged quantities exactly. If you acknowledged 100 units and ship 95, the retail channel creates an automatic deduction. Count every carton before sealing.',
      targetSelector: '[data-tour="shipment-carton-detail"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'shipping-ship-window-vs-delivery',
      title: 'Ship Window vs. Delivery Window',
      description: 'If the retail channel is paying freight (Freight Collect), you must submit a Routing Request and ship within the Ship Window. If you\'re paying freight (Freight Prepaid), you must deliver within the fixed Delivery Window. Check the PO for which applies.',
      targetSelector: '[data-tour="shipment-window-info"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'shipping-late-penalties',
      title: 'Late = Automatic Deduction',
      description: 'Late shipment = automatic deduction. Mislabeled cartons (wrong contents, wrong SKU on box) = automatic deduction. the retail channel\'s receiving system automatically flags any discrepancy. No exceptions.',
      targetSelector: '[data-tour="shipment-penalty-warning"]',
      position: 'bottom',
      action: 'finish',
    },
  ],
};
/* ── Tour 5: Deductions & Disputes ─────────────────────────────────── */

export const DEDUCTIONS_TOUR: TourDefinition = {
  id: 'deductions',
  name: 'Deductions & Disputes',
  description: 'Understanding deduction categories and how to dispute them.',
  autoStart: false,
  forceFirst: false,
  autoStartViews: ['analytics', 'reports'],
  steps: [
    {
      id: 'deductions-ledger',
      title: 'Deductions Ledger',
      description: 'This is your deductions ledger. Every deduction the retail channel applies appears here — from late shipments, ASN inaccuracies, carton mismatches, compliance failures, and chargebacks.',
      targetSelector: '[data-tour="deductions-ledger"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'deductions-categories',
      title: 'Deduction Categories',
      description: 'Common categories: Late Shipment (missed the window), ASN Inaccuracy (quantities don\'t match), Carton Mislabel (wrong SKU on box), Compliance Failure (expired documents), and Damaged Goods (customer returns). Each shows the amount deducted and the PO reference.',
      targetSelector: '[data-tour="deductions-categories"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'deductions-dispute-workflow',
      title: 'Dispute Workflow',
      description: 'If you believe a deduction is wrong, click "Dispute". You have a limited window (typically 14 days from the deduction date). Provide evidence: shipping documents, proof of delivery, photos of cartons.',
      targetSelector: '[data-tour="deductions-dispute-btn"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'deductions-dispute-outcome',
      title: 'Dispute Outcomes',
      description: 'Disputes can be: Won (full refund), Lost (deduction stands), or Partially Resolved (partial refund). The outcome affects your fulfillment score. Repeated lost disputes may hurt your standing.',
      targetSelector: '[data-tour="deductions-outcome-info"]',
      position: 'bottom',
      action: 'finish',
    },
  ],
};
/* ── Tour 6: Compliance Documents ──────────────────────────────────── */

export const COMPLIANCE_TOUR: TourDefinition = {
  id: 'compliance',
  name: 'Compliance Documents',
  description: 'Walk through the 5 required documents and 2 legal agreements.',
  autoStart: false,
  forceFirst: false,
  autoStartViews: ['compliance'],
  steps: [
    {
      id: 'compliance-dashboard',
      title: 'Compliance Dashboard',
      description: 'This dashboard shows your compliance status. You need 5 documents and 2 legal agreements to be fully compliant. Each document has an expiry date.',
      targetSelector: '[data-tour="nav-compliance"]',
      position: 'right',
      action: 'next',
    },
    {
      id: 'compliance-required-docs',
      title: '5 Required Documents',
      description: '1) Certificate of Origin, 2) Product Liability Insurance, 3) CE/UKCA Declaration of Conformity, 4) Manufacturer\'s Safety Data Sheet, 5) UKCA Authorised Representative letter. All must be current.',
      targetSelector: '[data-tour="compliance-doc-list"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'compliance-legal-agreements',
      title: '2 Legal Agreements',
      description: '1) Mercenta Service Agreement (your commercial terms with Mercenta), 2) the retail channel Vendor Agreement (the retail channel\'s vendor terms). Both must be accepted before you can transact.',
      targetSelector: '[data-tour="compliance-legal-agreements"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'compliance-expiry-consequence',
      title: 'Expiry = Catalog Disabled',
      description: 'If ANY document expires, your catalog is automatically disabled. You cannot receive new Purchase Orders until the document is renewed. Set calendar reminders 30 days before each expiry.',
      targetSelector: '[data-tour="compliance-expiry-warning"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'compliance-customs',
      title: 'Customs is Handled',
      description: 'Mercenta handles all customs requirements — EORI registration and VAT reporting for UK import. You do NOT need to provide your own EORI number or VAT details. Just ship to our UK hub.',
      targetSelector: '[data-tour="compliance-customs-info"]',
      position: 'bottom',
      action: 'finish',
    },
  ],
};

/* ── Tour 7: Billing & Remittance ──────────────────────────────────── */

export const BILLING_TOUR: TourDefinition = {
  id: 'billing',
  name: 'Billing & Remittance',
  description: 'Understand your monthly fees, commission, and remittance statements.',
  autoStart: false,
  forceFirst: false,
  autoStartViews: ['settings'],
  steps: [
    {
      id: 'billing-panel',
      title: 'Billing Panel',
      description: 'This is your billing overview. You pay a flat monthly fee to Mercenta for platform access and account management.',
      targetSelector: '[data-tour="billing-panel"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'billing-commission',
      title: 'Commission Structure',
      description: 'Mercenta earns a commission on each Purchase Order fulfilled. The commission is calculated as a percentage of the gross PO value, deducted before your payout is calculated.',
      targetSelector: '[data-tour="billing-commission-info"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'billing-remittance-statement',
      title: 'Remittance Statement',
      description: 'Your remittance statement shows the full calculation: Gross PO Value − Mercenta Commission − the retail channel Deductions = Net Amount Paid to You. Review each statement for accuracy and dispute any deductions you believe are wrong.',
      targetSelector: '[data-tour="billing-remittance"]',
      position: 'bottom',
      action: 'finish',
    },
  ],
};
/* ── Tour 8: Support & Communication ────────────────────────────────── */

export const SUPPORT_TOUR: TourDefinition = {
  id: 'support',
  name: 'Support & Communication',
  description: 'How to contact Mercenta support and understand team roles.',
  autoStart: false,
  forceFirst: false,
  autoStartViews: ['team'],
  steps: [
    {
      id: 'support-chat-widget',
      title: 'Support Chat',
      description: 'Use this chat widget to contact Mercenta support for any issue — PO questions, compliance help, billing inquiries. All messages are logged and tracked. You\'ll get a response within 24 hours.',
      targetSelector: '[data-tour="support-chat"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'support-team-roles',
      title: 'Team Roles',
      description: 'Your team members have different roles: Shipping (can see logistics and PO data), Accounts (can see billing and remittance), Compliance (can see documents only). They only see the sections relevant to their role. The Owner sees everything.',
      targetSelector: '[data-tour="team-roles-info"]',
      position: 'bottom',
      action: 'finish',
    },
  ],
};

/* ── Tour 9: Team Management ───────────────────────────────────────── */

export const TEAM_TOUR: TourDefinition = {
  id: 'team-management',
  name: 'Team Management',
  description: 'How to invite team members and assign role presets.',
  autoStart: false,
  forceFirst: false,
  autoStartViews: ['settings'],
  steps: [
    {
      id: 'team-invite',
      title: 'Invite Team Members',
      description: 'Click "Invite Member" to add someone to your account. Enter their email and select a role. They\'ll receive an invitation email with a sign-up link.',
      targetSelector: '[data-tour="team-invite-btn"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'team-role-presets',
      title: 'Role Presets',
      description: 'Role presets control what each person can see and do: Shipping (logistics + PO acknowledgment), Accounts (billing + remittance), Compliance (document upload only), and Owner (full access including team management and billing).',
      targetSelector: '[data-tour="team-role-presets"]',
      position: 'bottom',
      action: 'next',
    },
    {
      id: 'team-owner-control',
      title: 'Owner Controls',
      description: 'Only the Owner can manage team members and billing. If you are the Owner, you control who has access and what they can see. Keep your Owner credentials secure.',
      targetSelector: '[data-tour="team-owner-badge"]',
      position: 'bottom',
      action: 'finish',
    },
  ],
};

/* ── Registry ──────────────────────────────────────────────────────── */

export const ALL_TOUR_DEFINITIONS: TourDefinition[] = [
  ORIENTATION_TOUR,
  CATALOG_TOUR,
  PO_ACKNOWLEDGMENT_TOUR,
  SHIPPING_TOUR,
  DEDUCTIONS_TOUR,
  COMPLIANCE_TOUR,
  BILLING_TOUR,
  SUPPORT_TOUR,
  TEAM_TOUR,
];

export const TOUR_REGISTRY: Record<string, TourDefinition> = {
  orientation: ORIENTATION_TOUR,
  catalog: CATALOG_TOUR,
  'po-acknowledgment': PO_ACKNOWLEDGMENT_TOUR,
  shipping: SHIPPING_TOUR,
  deductions: DEDUCTIONS_TOUR,
  compliance: COMPLIANCE_TOUR,
  billing: BILLING_TOUR,
  support: SUPPORT_TOUR,
  'team-management': TEAM_TOUR,
};
