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
  /**
   * True when the screen has a real implementation behind it.
   *
   * §FRONTEND-REDESIGN BATCH 2 (2026-11-26) — every one of the 89 declared views
   * now resolves to a real screen: the 12 that existed only in
   * `mercenta-frontend-v1` were ported in Batch 4, and the 7 that v1 had renamed
   * resolve to THIS project's own (newer) screens. A `false` here would mean "the
   * nav offers a destination that shows a placeholder", which is exactly the state
   * this batch ends.
   */
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
  { id: 'overview', label: 'Overview', group: 'Overview', implemented: true },
  {
    id: 'control_centre',
    label: 'Control Centre',
    group: 'Overview',
    implemented: true,
    superAdminOnly: true,
  },

  { id: 'work', label: 'Work Management', group: 'Operations', implemented: true },
  { id: 'purchase_orders_admin', label: 'Purchase Orders', group: 'Operations', implemented: true },
  { id: 'logistics', label: 'Logistics Hub', group: 'Operations', implemented: true },
  {
    /* §WAVE 3b — `returns_tracking` is NOT in `VIEW_ALLOWLIST.admin_staff`
       (`src/lib/auth/rbac.ts`), so the item was silently filtered out of the menu
       and the view was unreachable. RBAC is NOT widened here (that is a security
       decision): the item declares the closest permission the staff already hold,
       the same mechanism this nav already uses for the Ads Manager
       (`rbacViewId: 'marketing'`). Returns are worked alongside fulfilment. */
    id: 'returns_tracking',
    label: 'Returns Tracking',
    group: 'Operations',
    implemented: true,
    rbacViewId: 'fulfillment_track',
  },
  { id: 'calendar', label: 'Calendar', group: 'Operations', implemented: true },

  { id: 'crm', label: 'Brand CRM', group: 'Brands & Growth', implemented: true },
  { id: 'onboarding_pipeline', label: 'Onboarding', group: 'Brands & Growth', implemented: true },
  { id: 'marketing', label: 'Marketing', group: 'Brands & Growth', implemented: true },
  {
    id: 'ads_management',
    label: 'Ads Manager',
    group: 'Brands & Growth',
    implemented: true,
    rbacViewId: 'marketing',
  },
  {
    id: 'amazon_ads',
    /* §FRONTEND-REDESIGN BATCH 2 — v1 renamed this to 'Amazon Ad Spend'. REFUSED:
       `npm run validate:wording` flags a bare "Amazon" product claim in outward-facing
       copy (M12 — a claim about a retail-programme relationship must be distinguishable
       as fact/estimate/simulation/pending). The neutral label stays. */
    label: 'Ad Spend',
    group: 'Brands & Growth',
    implemented: true,
    rbacViewId: 'marketing',
  },
  {
    id: 'brand_intelligence',
    label: 'Brand Intelligence',
    group: 'Brands & Growth',
    /* §WAVE 3k — real: the ranked opportunity board derived from the canonical prospect
       store, with the ten-category rule shown firing. Super-Admin only. */
    implemented: true,
    superAdminOnly: true,
  },

  { id: 'catalog', label: 'Global Catalog', group: 'Catalogue & Commerce', implemented: true },
  { id: 'fulfillment_track', label: 'Fulfillment Track', group: 'Catalogue & Commerce', implemented: true },
  { id: 'retail_pipeline', label: 'Retail Pipeline', group: 'Catalogue & Commerce', implemented: true },

  { id: 'billing', label: 'Billing', group: 'Finance & Legal', implemented: true },
  { id: 'contracts_admin', label: 'Contract Cycle', group: 'Finance & Legal', implemented: true },

  { id: 'compliance', label: 'Compliance Approvals', group: 'Governance & Support', implemented: true },
  { id: 'messages', label: 'Messages', group: 'Governance & Support', implemented: true },
{
    /* §WAVE 3e — helpdesk TRIAGE is the support queue, so it declares the closest
       permission an admin_staff member already holds (`messages`). RBAC itself is
       not widened. */
    id: 'helpdesk',
    label: 'Helpdesk',
    group: 'Governance & Support',
    implemented: true,
    rbacViewId: 'messages',
  },
{
    /* §WAVE 3f — `monitoring` is NOT in `VIEW_ALLOWLIST.admin_staff`, so without a
       mapping the item would be silently filtered out. RBAC is not widened: the item
       declares the closest permission the staff already hold (`messages`). */
    id: 'monitoring',
    label: 'Monitoring',
    group: 'Governance & Support',
    implemented: true,
    rbacViewId: 'messages',
  },

  {
    id: 'super_admin',
    label: 'Super Admin',
    group: 'Administration',
    implemented: true,
    superAdminOnly: true,
  },
  {
    id: 'audit_log',
    label: 'Audit Log',
    group: 'Administration',
    /* §WAVE 3e — built, and reachable only by a super_admin session (see
       `superAdminOnly` and `SUPER_ADMIN_ONLY_ADMIN_IDS`). */
    implemented: true,
    superAdminOnly: true,
  },
  { id: 'usertour', label: 'Onboarding Tours', group: 'Administration', implemented: true },
  {
    id: 'integrations',
    label: 'Integration Settings',
    group: 'Administration',
    implemented: true,
    superAdminOnly: true,
  },

  {
    id: 'founder_centre',
    label: 'Founder Investor Centre',
    group: 'Founder',
    /* §WAVE 3k — real: the funding pipeline, the Model B capital case, the financing
       router and the pitch workspace, all read from their own owners. Super-Admin only. */
    implemented: true,
    superAdminOnly: true,
  },
  {
    id: 'partnerships',
    label: 'Partnerships & Fundraising',
    group: 'Founder',
    /* §WAVE 3k — real: the financier universe, the outreach pipeline and the
       financier lifecycle, each rendered from its own owner. Super-Admin only. */
    implemented: true,
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
  { id: 'calendar', label: 'Calendar', group: 'Operations', implemented: true },

  { id: 'catalog', label: 'Product Catalog', group: 'Catalogue', implemented: true },
  { id: 'inventory', label: 'Inventory', group: 'Catalogue', implemented: true },
  { id: 'commercial_readiness', label: 'Commercial Readiness', group: 'Catalogue', implemented: true },

  { id: 'lift_off', label: 'Lift Off', group: 'Programme', implemented: true },

  { id: 'onboarding', label: 'Onboarding & Legal', group: 'Compliance', implemented: true },
  { id: 'compliance', label: 'UK Compliance', group: 'Compliance', implemented: true },
  { id: 'contracts', label: 'Contracts', group: 'Compliance', implemented: true },

  { id: 'analytics', label: 'Analytics', group: 'Insights & Growth', implemented: true },
  { id: 'ads_management', label: 'Advertising', group: 'Insights & Growth', implemented: true },
  { id: 'market', label: 'Market Intel', group: 'Insights & Growth', implemented: true },
  { id: 'reports', label: 'Reports', group: 'Insights & Growth', implemented: true },

  { id: 'documents', label: 'Documents & Account', group: 'Account', implemented: true },
  { id: 'cases', label: 'Support & Cases', group: 'Account', implemented: true },
  { id: 'team', label: 'Support & Team', group: 'Account', implemented: true },
  { id: 'settings', label: 'Settings', group: 'Account', implemented: true },
];

/**
 * BWS — Alcohol Operating Model (22 exact IDs matching BitFlexFinTech/Dash-1).
 */
export const BWS_ITEMS: NavItemDef[] = [
  { id: 'overview', label: 'Overview', group: 'Intelligence', implemented: true },
  { id: 'country-discovery', label: 'Country Discovery', group: 'Intelligence', implemented: true },
  { id: 'brand-discovery', label: 'Brand Discovery', group: 'Intelligence', implemented: true },
  { id: 'brand-intelligence', label: 'Brand Intelligence', group: 'Intelligence', implemented: true },
  { id: 'uk-distribution', label: 'UK Distribution Research', group: 'Intelligence', implemented: true },
  { id: 'uk-channel-research', label: 'UK Channel Research', group: 'Intelligence', implemented: true },
  { id: 'pitch-targets', label: 'Pitch Targets', group: 'Intelligence', implemented: true },
  { id: 'opportunity-assessment', label: 'Opportunity Assessment', group: 'Intelligence', implemented: true },

  { id: 'acquisition-pipeline', label: 'Acquisition Pipeline', group: 'Commercial & Portfolio', implemented: true },
  { id: 'brand-portfolio', label: 'Brand Portfolio', group: 'Commercial & Portfolio', implemented: true },
  { id: 'product-catalogue', label: 'Product Catalogue', group: 'Commercial & Portfolio', implemented: true },
  { id: 'brand-onboarding', label: 'Brand Onboarding', group: 'Commercial & Portfolio', implemented: true },
  { id: 'partner-portal', label: 'Partner Portal', group: 'Commercial & Portfolio', implemented: true },

  { id: 'compliance-regulatory', label: 'Compliance & Regulatory', group: 'Operations & Compliance', implemented: true },
  { id: 'import-excise', label: 'Import & Excise', group: 'Operations & Compliance', implemented: true },
  { id: 'wholesale-distribution', label: 'Wholesale Distribution', group: 'Operations & Compliance', implemented: true },
  { id: 'inventory-fulfilment', label: 'Inventory & Fulfilment', group: 'Operations & Compliance', implemented: true },

  { id: 'campaign-studio', label: 'Campaign Studio', group: 'Growth & Platform', implemented: true },
  { id: 'brand-growth', label: 'Brand Growth', group: 'Growth & Platform', implemented: true },
  { id: 'financials', label: 'Financials', group: 'Growth & Platform', implemented: true },
  { id: 'reports-analytics', label: 'Reports & Analytics', group: 'Growth & Platform', implemented: true },
  { id: 'settings', label: 'Admin & Settings', group: 'Growth & Platform', implemented: true },
];

/**
 * TALENT COMMERCE — IP / Licensing Operating Model (18 exact IDs matching BitFlexFinTech/CAA-TalAg).
 */
export const TALENT_COMMERCE_ITEMS: NavItemDef[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'Intelligence', implemented: true },
  { id: 'profile', label: 'Rights Holders', group: 'Intelligence', implemented: true },
  { id: 'brands', label: 'Brands & Products', group: 'Intelligence', implemented: true },
  { id: 'uk-opportunities', label: 'UK Opportunities', group: 'Intelligence', implemented: true },
  { id: 'acquisition', label: 'Brand Acquisition', group: 'Intelligence', implemented: true },
  { id: 'campaigns', label: 'Campaigns', group: 'Intelligence', implemented: true },
  { id: 'brand-stores', label: 'Brand Store Studio', group: 'Intelligence', implemented: true },

  { id: 'concepts', label: 'Product Concepts', group: 'Operations', implemented: true },
  { id: 'development', label: 'Product Development', group: 'Operations', implemented: true },
  { id: 'collections', label: 'Collections', group: 'Operations', implemented: true },
  { id: 'assets', label: 'Creative Assets', group: 'Operations', implemented: true },
  { id: 'approvals', label: 'Approvals', group: 'Operations', implemented: true },
  { id: 'purchase-orders', label: 'Purchase Orders', group: 'Operations', implemented: true },
  { id: 'fulfilment', label: 'Orders & Fulfilment', group: 'Operations', implemented: true },
  { id: 'inventory', label: 'Inventory', group: 'Operations', implemented: true },
  { id: 'royalties', label: 'Royalties', group: 'Operations', implemented: true },
  { id: 'financials', label: 'Financial Reports', group: 'Operations', implemented: true },
  { id: 'settings', label: 'Settings', group: 'Operations', implemented: true },
];

export const SURFACE_CONFIGS: Record<OperatingSurfaceId, SurfaceConfig> = {
  core_brand: {
    id: 'core_brand',
    label: 'Partner Portal',
    subtitle: 'Mercenta Partner Operations',
    environment: 'brand',
    /* §FRONTEND-REDESIGN BATCH 2 — a brand session opens on its dashboard, not on
       the PO list. `overview` is the first declared item ('Dashboard'). */
    defaultViewId: 'overview',
    items: CORE_BRAND_ITEMS,
  },
  core_admin: {
    id: 'core_admin',
    label: 'Operations Console',
    subtitle: 'Mercenta Staff & Super Admin',
    environment: 'admin',
    /* §FRONTEND-REDESIGN BATCH 2 — opens on Overview. It previously opened on
       `ads_management`, so every staff session landed on the advertising screen
       instead of the console's summary. */
    defaultViewId: 'overview',
    items: CORE_ADMIN_ITEMS,
  },
  bws: {
    id: 'bws',
    label: 'BWS Workspace',
    /* §FRONTEND-REDESIGN BATCH 2 — v1's subtitle said "(1P Wholesale)". REFUSED for
       the same reason as the label above: the wording guard bans the "1P"/first-party
       claim in outward-facing copy. The business meaning is unchanged — Mercenta buys
       and resells — it is simply not asserted in a navigation subtitle. */
    subtitle: 'Beers, Wines & Spirits (Wholesale)',
    environment: 'admin',
    defaultViewId: 'overview',
    items: BWS_ITEMS,
  },
  talent_commerce: {
    id: 'talent_commerce',
    label: 'Talent Commerce',
    subtitle: 'Talent IP & Licensing Operations',
    environment: 'admin',
    defaultViewId: 'dashboard',
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
