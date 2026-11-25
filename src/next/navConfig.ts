import { canAccessView, type SessionTier } from '@/lib/auth/rbac';

export type OperatingSurfaceId =
  | 'core_admin'
  | 'core_brand'
  | 'bws'
  | 'talent_commerce';

export interface NavItemDef {
  id: string;
  label: string;
  group: string;
  /** True when the screen is implemented in the current release phase (Phases 1-2). */
  implemented: boolean;
  /** Optional underlying RBAC view id when mapped to an existing Mercenta allowlist key. */
  rbacViewId?: string;
  /** True for views restricted exclusively to Super Admin sessions. */
  superAdminOnly?: boolean;
}

export interface SurfaceConfig {
  id: OperatingSurfaceId;
  label: string;
  subtitle: string;
  environment: 'admin' | 'brand';
  defaultViewId: string;
  items: NavItemDef[];
}

const SUPER_ADMIN_ONLY_ADMIN_IDS = new Set([
  'control_centre',
  'brand_intelligence',
  'super_admin',
  'audit_log',
  'integrations',
  'founder_centre',
  'partnerships',
]);

/**
 * CORE — Admin surface (28 exact IDs: all 27 from AdminShell.tsx + ads_management).
 */
export const CORE_ADMIN_ITEMS: NavItemDef[] = [
  { id: 'overview', label: 'Overview', group: 'Overview', implemented: false },
  {
    id: 'control_centre',
    label: 'Control Centre',
    group: 'Overview',
    implemented: false,
    superAdminOnly: true,
  },

  { id: 'work', label: 'Work Management', group: 'Operations', implemented: false },
  { id: 'purchase_orders_admin', label: 'Purchase Orders', group: 'Operations', implemented: false },
  { id: 'logistics', label: 'Logistics Hub', group: 'Operations', implemented: false },
  { id: 'returns_tracking', label: 'Returns Tracking', group: 'Operations', implemented: false },
  { id: 'calendar', label: 'Calendar', group: 'Operations', implemented: false },

  { id: 'crm', label: 'Brand CRM', group: 'Brands & Growth', implemented: false },
  { id: 'onboarding_pipeline', label: 'Onboarding', group: 'Brands & Growth', implemented: false },
  { id: 'marketing', label: 'Marketing', group: 'Brands & Growth', implemented: false },
  {
    id: 'ads_management',
    label: 'Ads Manager',
    group: 'Brands & Growth',
    implemented: true,
    rbacViewId: 'marketing',
  },
  {
    id: 'amazon_ads',
    label: 'Ad Spend',
    group: 'Brands & Growth',
    implemented: true,
    rbacViewId: 'marketing',
  },
  {
    id: 'brand_intelligence',
    label: 'Brand Intelligence',
    group: 'Brands & Growth',
    implemented: false,
    superAdminOnly: true,
  },

  { id: 'catalog', label: 'Global Catalog', group: 'Catalogue & Commerce', implemented: false },
  { id: 'fulfillment_track', label: 'Fulfillment Track', group: 'Catalogue & Commerce', implemented: false },
  { id: 'retail_pipeline', label: 'Retail Pipeline', group: 'Catalogue & Commerce', implemented: false },

  { id: 'billing', label: 'Billing', group: 'Finance & Legal', implemented: false },
  { id: 'contracts_admin', label: 'Contract Cycle', group: 'Finance & Legal', implemented: false },

  { id: 'compliance', label: 'Compliance Approvals', group: 'Governance & Support', implemented: false },
  { id: 'messages', label: 'Messages', group: 'Governance & Support', implemented: false },
  { id: 'helpdesk', label: 'Helpdesk', group: 'Governance & Support', implemented: false },
  { id: 'monitoring', label: 'Monitoring', group: 'Governance & Support', implemented: false },

  {
    id: 'super_admin',
    label: 'Super Admin',
    group: 'Administration',
    implemented: false,
    superAdminOnly: true,
  },
  {
    id: 'audit_log',
    label: 'Audit Log',
    group: 'Administration',
    implemented: false,
    superAdminOnly: true,
  },
  { id: 'usertour', label: 'Onboarding Tours', group: 'Administration', implemented: false },
  {
    id: 'integrations',
    label: 'Integration Settings',
    group: 'Administration',
    implemented: false,
    superAdminOnly: true,
  },

  {
    id: 'founder_centre',
    label: 'Founder Investor Centre',
    group: 'Founder',
    implemented: false,
    superAdminOnly: true,
  },
  {
    id: 'partnerships',
    label: 'Partnerships & Fundraising',
    group: 'Founder',
    implemented: false,
    superAdminOnly: true,
  },
];

/**
 * CORE — Brand Portal surface (20 canonical BrandShell IDs + first-class ads_management entry).
 */
export const CORE_BRAND_ITEMS: NavItemDef[] = [
  { id: 'overview', label: 'Dashboard', group: 'Overview', implemented: true },

  { id: 'purchase_orders', label: 'Purchase Orders', group: 'Operations', implemented: true },
  { id: 'logistics', label: 'Logistics Hub', group: 'Operations', implemented: true },
  { id: 'returns', label: 'Returns', group: 'Operations', implemented: true },
  { id: 'work', label: 'Tasks & Deadlines', group: 'Operations', implemented: true },
  { id: 'calendar', label: 'Calendar', group: 'Operations', implemented: false },

  { id: 'catalog', label: 'Product Catalog', group: 'Catalogue', implemented: true },
  { id: 'inventory', label: 'Inventory', group: 'Catalogue', implemented: true },
  { id: 'commercial_readiness', label: 'Commercial Readiness', group: 'Catalogue', implemented: true },

  { id: 'lift_off', label: 'Lift Off', group: 'Programme', implemented: true },

  { id: 'onboarding', label: 'Onboarding & Legal', group: 'Compliance', implemented: true },
  { id: 'compliance', label: 'UK Compliance', group: 'Compliance', implemented: true },
  { id: 'contracts', label: 'Contracts', group: 'Compliance', implemented: true },

  { id: 'analytics', label: 'Analytics', group: 'Insights & Growth', implemented: true },
  { id: 'ads_management', label: 'Advertising', group: 'Insights & Growth', implemented: true },
  { id: 'market', label: 'Market Intel', group: 'Insights & Growth', implemented: false },
  { id: 'reports', label: 'Reports', group: 'Insights & Growth', implemented: true },

  { id: 'documents', label: 'Documents & Account', group: 'Account', implemented: true },
  { id: 'cases', label: 'Support & Cases', group: 'Account', implemented: false },
  { id: 'team', label: 'Support & Team', group: 'Account', implemented: false },
  { id: 'settings', label: 'Settings', group: 'Account', implemented: false },
];

/**
 * BWS — Alcohol Operating Model (22 exact IDs matching BitFlexFinTech/Dash-1).
 */
export const BWS_ITEMS: NavItemDef[] = [
  { id: 'overview', label: 'Overview', group: 'Intelligence', implemented: false },
  { id: 'country-discovery', label: 'Country Discovery', group: 'Intelligence', implemented: false },
  { id: 'brand-discovery', label: 'Brand Discovery', group: 'Intelligence', implemented: false },
  { id: 'brand-intelligence', label: 'Brand Intelligence', group: 'Intelligence', implemented: false },
  { id: 'uk-distribution', label: 'UK Distribution Research', group: 'Intelligence', implemented: false },
  { id: 'uk-channel-research', label: 'UK Channel Research', group: 'Intelligence', implemented: false },
  { id: 'pitch-targets', label: 'Pitch Targets', group: 'Intelligence', implemented: false },
  { id: 'opportunity-assessment', label: 'Opportunity Assessment', group: 'Intelligence', implemented: false },

  { id: 'acquisition-pipeline', label: 'Acquisition Pipeline', group: 'Commercial & Portfolio', implemented: false },
  { id: 'brand-portfolio', label: 'Brand Portfolio', group: 'Commercial & Portfolio', implemented: false },
  { id: 'product-catalogue', label: 'Product Catalogue', group: 'Commercial & Portfolio', implemented: false },
  { id: 'brand-onboarding', label: 'Brand Onboarding', group: 'Commercial & Portfolio', implemented: false },
  { id: 'partner-portal', label: 'Partner Portal', group: 'Commercial & Portfolio', implemented: false },

  { id: 'compliance-regulatory', label: 'Compliance & Regulatory', group: 'Operations & Compliance', implemented: false },
  { id: 'import-excise', label: 'Import & Excise', group: 'Operations & Compliance', implemented: false },
  { id: 'wholesale-distribution', label: 'Wholesale Distribution', group: 'Operations & Compliance', implemented: false },
  { id: 'inventory-fulfilment', label: 'Inventory & Fulfilment', group: 'Operations & Compliance', implemented: false },

  { id: 'campaign-studio', label: 'Campaign Studio', group: 'Growth & Platform', implemented: true },
  { id: 'brand-growth', label: 'Brand Growth', group: 'Growth & Platform', implemented: false },
  { id: 'financials', label: 'Financials', group: 'Growth & Platform', implemented: false },
  { id: 'reports-analytics', label: 'Reports & Analytics', group: 'Growth & Platform', implemented: false },
  { id: 'settings', label: 'Admin & Settings', group: 'Growth & Platform', implemented: false },
];

/**
 * TALENT COMMERCE — IP / Licensing Operating Model (18 exact IDs matching BitFlexFinTech/CAA-TalAg).
 */
export const TALENT_COMMERCE_ITEMS: NavItemDef[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'Intelligence', implemented: false },
  { id: 'profile', label: 'Rights Holders', group: 'Intelligence', implemented: false },
  { id: 'brands', label: 'Brands & Products', group: 'Intelligence', implemented: false },
  { id: 'uk-opportunities', label: 'UK Opportunities', group: 'Intelligence', implemented: false },
  { id: 'acquisition', label: 'Brand Acquisition', group: 'Intelligence', implemented: false },
  { id: 'campaigns', label: 'Campaigns', group: 'Intelligence', implemented: true },
  { id: 'brand-stores', label: 'Brand Store Studio', group: 'Intelligence', implemented: false },

  { id: 'concepts', label: 'Product Concepts', group: 'Operations', implemented: false },
  { id: 'development', label: 'Product Development', group: 'Operations', implemented: false },
  { id: 'collections', label: 'Collections', group: 'Operations', implemented: false },
  { id: 'assets', label: 'Creative Assets', group: 'Operations', implemented: false },
  { id: 'approvals', label: 'Approvals', group: 'Operations', implemented: false },
  { id: 'purchase-orders', label: 'Purchase Orders', group: 'Operations', implemented: false },
  { id: 'fulfilment', label: 'Orders & Fulfilment', group: 'Operations', implemented: false },
  { id: 'inventory', label: 'Inventory', group: 'Operations', implemented: false },
  { id: 'royalties', label: 'Royalties', group: 'Operations', implemented: false },
  { id: 'financials', label: 'Financial Reports', group: 'Operations', implemented: false },
  { id: 'settings', label: 'Settings', group: 'Operations', implemented: false },
];

export const SURFACE_CONFIGS: Record<OperatingSurfaceId, SurfaceConfig> = {
  core_brand: {
    id: 'core_brand',
    label: 'Partner Portal',
    subtitle: 'Mercenta Partner Operations',
    environment: 'brand',
    defaultViewId: 'purchase_orders',
    items: CORE_BRAND_ITEMS,
  },
  core_admin: {
    id: 'core_admin',
    label: 'Operations Console',
    subtitle: 'Mercenta Staff & Super Admin',
    environment: 'admin',
    defaultViewId: 'ads_management',
    items: CORE_ADMIN_ITEMS,
  },
  bws: {
    id: 'bws',
    label: 'BWS Workspace',
    subtitle: 'Beers, Wines & Spirits (Wholesale)',
    environment: 'admin',
    defaultViewId: 'campaign-studio',
    items: BWS_ITEMS,
  },
  talent_commerce: {
    id: 'talent_commerce',
    label: 'Talent Commerce',
    subtitle: 'Talent IP & Licensing Operations',
    environment: 'admin',
    defaultViewId: 'campaigns',
    items: TALENT_COMMERCE_ITEMS,
  },
};

export function visibleNavItemsForSurface(
  surface: OperatingSurfaceId,
  tier: SessionTier | null
): NavItemDef[] {
  const cfg = SURFACE_CONFIGS[surface];
  if (surface === 'core_admin') {
    const isSuper = tier === 'super_admin';
    return cfg.items.filter((item) => {
      if (item.superAdminOnly || SUPER_ADMIN_ONLY_ADMIN_IDS.has(item.id)) {
        return isSuper;
      }
      if (!tier) return true;
      const checkId = item.rbacViewId ?? item.id;
      return tier === 'super_admin' || canAccessView(tier, checkId);
    });
  }
  return cfg.items;
}

export function groupNavItems(items: NavItemDef[]): { group: string; items: NavItemDef[] }[] {
  const groups = new Map<string, NavItemDef[]>();
  for (const item of items) {
    const existing = groups.get(item.group) ?? [];
    existing.push(item);
    groups.set(item.group, existing);
  }
  return Array.from(groups.entries()).map(([group, groupItems]) => ({
    group,
    items: groupItems,
  }));
}
