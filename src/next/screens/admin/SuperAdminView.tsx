import { useState, type ReactNode } from 'react';
import {
  ConsoleBarChart,
  ConsoleProgressTrack,
  ConsoleTabs,
  NoticeBanner,
  SectionCard,
  formatGbp,
} from '@/next/components/ConsoleCharts';
import {
  ConsoleTable,
  EmptyStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  ConsoleHeader,
  SlideOverDrawer,
  type MetricItem,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';
import type {
  ApplicationStatus,
  BrandApplication,
  CarrierMarkupConfig,
  PayoutDestinationStatus,
  StaffMember,
  StaffRole,
} from '@/types';

export type SuperAdminTabId =
  | 'staff'
  | 'applications'
  | 'accounting'
  /* §PHASE C BATCH C1 — the Homepage Editor joins the Super Admin tabs, which is where
     it has always lived (the legacy panel's `homepage` tab). Tabbing it rather than
     giving it its own nav item keeps the declared view count unchanged. */
  | 'homepage'
  | 'commercial'
  | 'company'
  | 'costs'
  | 'launch'
  | 'platform';

export interface SuperAdminOversightBrand {
  id: string;
  businessName: string;
  category: string;
  track: string;
  contractStatus: string;
}

export interface SuperAdminOversightWork {
  id: string;
  title: string;
  sourceLabel: string;
  tenantId: string | null;
  dueDate: string | null;
  priority: string;
}

export interface SuperAdminPayoutRow {
  id: string;
  brandId: string;
  brandName: string;
  purchaseOrderId: string;
  poValue: number;
  commissionAmount: number;
  netShareGbp: number;
  status: string;
  statusLabel: string;
  statusTone: SemanticTone;
  payoutStateLabel: string;
  payoutStateTone: SemanticTone;
  payoutBlockedReason?: string;
  reconciliationLabel: string;
  reconciliationTone: SemanticTone;
  paymentId?: string;
  createdAt: string;
}

export interface SuperAdminDestinationRow {
  id: string;
  accountName: string;
  accountRefMasked: string;
  bankName: string;
  status: PayoutDestinationStatus;
  statusLabel: string;
  statusTone: SemanticTone;
}

export interface SuperAdminCommercialRow {
  brandId: string;
  brandName: string;
  category: string;
  selectedModel: 'commission_agent' | 'buy_resell' | null;
  selectedModelLabel: string;
  termsSummary: string;
  requirementCount: number;
  workedFormula: string;
}

export interface SuperAdminCommercialAuditItem {
  id: string;
  brandName: string;
  action: string;
  modelLabel: string;
  actorId: string;
  reason: string;
  complianceUnchanged: boolean;
  createdAt: string;
}

export interface SuperAdminGovernmentSecretItem {
  id: string;
  label: string;
  purpose: string;
  enterAt: string;
  manualActionUrl: string;
  secretRef: string | null;
  masked: string | null;
  verifiedAt: string | null;
}

export interface SuperAdminLaunchItem {
  id: string;
  name: string;
  channelLabel: string;
  accountStatus: string;
  profileStatus: string;
  complete: boolean;
  siteUrl: string;
  signupUrl: string;
  requirementsUrl: string;
  requirementsVerified: boolean;
  audience: string;
  checklist: { label: string; verifyOnPlatform: boolean; done: boolean }[];
  packageText: string;
}

export interface SuperAdminViewProps {
  loading: boolean;
  isSuperAdmin: boolean;
  activeTab: SuperAdminTabId;
  onTabChange: (tab: SuperAdminTabId) => void;
  /**
   * §PHASE C BATCH C1 — the Homepage Editor, supplied by the SCREEN as a node so this
   * view stays pure (it renders what it is given and never fetches). The screen passes
   * null unless that tab is open, so the editor mounts only when it is actually shown.
   */
  homepagePanel: ReactNode;
  canMutate: boolean;
  staff: StaffMember[];
  actingStaffId: string;
  onActingStaffChange: (id: string) => void;
  roleOptions: { value: StaffRole; label: string }[];
  channelOptions: string[];
  onAddStaff: (input: {
    name: string;
    email: string;
    role: StaffRole;
    channel: string;
  }) => void;
  onToggleStaffActive: (id: string) => void;
  onRemoveStaff: (id: string) => void;
  onUpdateStaffRole: (id: string, role: StaffRole) => void;
  onUpdateStaffChannel: (id: string, channel: string) => void;
  onUpdateStaffTier: (id: string, tier: StaffMember['permissionTier']) => void;
  euMarketEnabled: boolean;
  carrierMarkups: CarrierMarkupConfig[];
  onUpdateCarrierMarkup: (id: string, patch: { markupValue?: number; active?: boolean }) => void;
  oversightBrands: SuperAdminOversightBrand[];
  oversightWork: SuperAdminOversightWork[];
  oversightCounts: { open: number; overdue: number; critical: number };
  workBySource: { sourceLabel: string; count: number }[];
  // Applications
  applications: BrandApplication[];
  approvedBrandCount: number;
  applicationMessage: string | null;
  onApplicationAction: (
    appId: string,
    action: ApplicationStatus,
    notes?: string
  ) => Promise<void>;
  onCreateManualBrand: (input: {
    companyName: string;
    contactName: string;
    email: string;
    country: string;
    category: string;
    track: 'direct_fulfillment' | 'financed';
  }) => Promise<{ ok: boolean; error?: string }>;
  // Accounting
  xeroConnected: boolean | null;
  xeroDemoMode: boolean;
  xeroLastSync: string | null;
  xeroDaysSinceReseed: number | null;
  xeroSummary: { revenue: number; expenses: number; netProfit: number } | null;
  xeroBusy: string | null;
  xeroNotice: string | null;
  xeroError: string | null;
  onXeroSaveCredentials: (creds: {
    clientId: string;
    clientSecret: string;
    tenantId: string;
    accessToken: string;
  }) => void;
  onXeroManualReseed: () => Promise<void>;
  payoutRows: SuperAdminPayoutRow[];
  payoutBusyId: string | null;
  payoutNotice: string | null;
  payoutError: string | null;
  onSettlePayout: (commissionId: string) => Promise<void>;
  destinations: SuperAdminDestinationRow[];
  destinationBusyId: string | null;
  destinationNotice: string | null;
  onReviewDestination: (
    destinationId: string,
    status: 'verified' | 'suspended'
  ) => Promise<void>;
  invoiceRegistry: {
    totalAllocated: number;
    voidCount: number;
    receivablesGbp: number;
    upcomingGbp: number;
    paymentBasis: string;
    recent: { number: string; voided: boolean }[];
  };
  // Commercial models
  modelAExample: {
    label: string;
    retailChannelRevenueGbp: number;
    commissionRatePct: number;
    mercentaCommissionGbp: number;
    brandAmountGbp: number;
    vatBasis: string;
  };
  modelBExample: {
    label: string;
    summary: string;
    retailChannelRevenueGbp: number;
    brandAcquisitionCostGbp: number;
    grossCommercialSpreadGbp: number;
    carrierCostGbp: number;
    paymentFeesGbp: number;
    otherAgreedFeesGbp: number;
    deductionsGbp: number;
    netMercentaMarginGbp: number;
    vatBasis: string;
  };
  shippingEconomicsText: string;
  commercialRows: SuperAdminCommercialRow[];
  commercialAudit: SuperAdminCommercialAuditItem[];
  commercialMessage: string | null;
  onRecordCommercialModel: (
    brandId: string,
    brandName: string,
    model: 'commission_agent' | 'buy_resell',
    reason: string
  ) => void;
  // Company Control Centre
  companyRegistration: {
    legalName: string;
    companyNumber: string;
    jurisdiction: string;
    registrarStatusLabel: string;
    disclaimer: string;
  };
  chModeLabel: string;
  canReadRegister: boolean;
  companyBusy: boolean;
  companyMessage: string | null;
  companyReadError: string | null;
  companySnapshot: {
    readAt: string | null;
    dataSource: string | null;
    status: string | null;
    incorporationDate: string | null;
    registeredOfficeAddress: string | null;
    sicCodes: string[];
    officers: { name: string; role: string; appointedOn?: string }[];
    psc: { name: string; description: string }[];
    filings: { transactionId: string; date: string; description: string }[];
    charges: { chargeId: string; createdAt: string; description?: string }[];
  };
  confirmationWorkflow: {
    steps: { id: string; label: string; detail: string }[];
    stage: string;
    nextDueDate: string | null;
    dueDateSource: string;
    csDueLabel: string;
    csDueState: string;
    accountsDueDate: string | null;
    accountsDueLabel: string;
    accountsDueState: string;
    founderApprovedAt: string | null;
    approvedBy: string | null;
    recordedReference: string | null;
    filingMethod: string | null;
    recordedAt: string | null;
    registerConfirmedAt: string | null;
    filingUrl: string;
  };
  companyAuditCount: number;
  governmentSecrets: SuperAdminGovernmentSecretItem[];
  hmrcReadiness: { state: string; reason: string; blocker: string };
  onReadCompanyRegister: () => Promise<void>;
  onAdvanceConfirmationReview: () => void;
  onApproveConfirmation: () => void;
  onFileViaOfficialApi: () => void;
  onRecordManualFiling: (reference: string, filedAt: string) => void;
  onVerifyFilingOnRegister: () => void;
  onStoreGovernmentSecret: (kind: string, value: string) => void;
  onVerifyGovernmentSecret: (kind: string) => void;
  onClearGovernmentSecret: (kind: string) => void;
  // Operating Costs
  operatingCostsDisclaimer: string;
  costSummary: {
    monthlyFixedGbp: number;
    aiMonthlySpendGbp: number;
    projectedMonthGbp: number;
    monthlyTotalGbp: number;
    aiCalls: number;
    aiTokens: number;
    aiCacheHits: number;
    aiCacheMisses: number;
    aiRefused: number;
    aiProtectionState: string;
    aiProtectionReason: string;
    aiProjectionMonthlyGbp: number;
    freeModelsLabel: string;
    ceilingsLabel: string;
    providers: {
      id: string;
      name: string;
      plan: string;
      billing: string;
      category: string;
      fixedMonthlyGbp: number;
      usageActualGbp: number;
      usageBudgetGbp: number;
      varianceGbp: number;
      source: string;
      note: string;
      manageUrl?: string;
    }[];
    byTask: { taskId: string; calls: number; tokens: number; estimatedCostGbp: number }[];
    recentUsage: {
      id: string;
      at: string;
      taskId: string;
      model: string | null;
      tokens: number;
      estimatedCostGbp: number;
      status: string;
      cache: string;
    }[];
    modelPolicyRows: { taskId: string; tier: string; model: string | null; reason: string }[];
    revenueStreams: { id: string; label: string; gbp: number; source: string }[];
    revenueTotalGbp: number;
    contributionGrossGbp: number;
    contributionMarginPct: number;
    contributionProvisional: boolean;
    units: { brands: number; opportunities: number; leads: number; aiOperations: number };
    perUnit: {
      perBrandGbp: number;
      perOpportunityGbp: number;
      perLeadGbp: number;
      perAiOperationGbp: number;
    };
    costInputs: {
      id: string;
      label: string;
      formattedValue: string;
      requiresFounderApproval: boolean;
      note: string;
    }[];
    minSubscriptionLabel: string;
    minSubscriptionNote: string;
    cacToleranceGbp: number;
    cacToleranceNote: string;
  };
  onResetAiUsageLog: () => void;
  // Launch Centre
  launchDisclaimer: string;
  launchItems: SuperAdminLaunchItem[];
  launchProfile: {
    tagline: string;
    shortDescription: string;
    longDescription: string;
    categories: string[];
    website: string;
  };
  launchMessage: string | null;
  onUpdateLaunchProfile: (patch: {
    tagline?: string;
    shortDescription?: string;
    longDescription?: string;
    categories?: string[];
    website?: string;
  }) => void;
  onPrepareLaunchProfile: (platformId: string) => void;
  onMarkLaunchSubmitted: (platformId: string) => void;
  onCopyLaunchText: (label: string, text: string) => Promise<void>;
  onNavigateView?: (viewId: string) => void;
}

const PRODUCT_CATEGORIES = [
  'Health & Personal Care',
  'Home',
  'Baby',
  'Office Products',
  'Kitchen',
  'Consumer Electronics',
  'Automotive',
  'Grocery',
  'Apparel',
  'Personal Computer',
  'Other',
];

export function SuperAdminView(props: SuperAdminViewProps) {
  const {
    loading,
    isSuperAdmin,
    activeTab,
    onTabChange,
    homepagePanel,
    canMutate,
    staff,
    actingStaffId,
    onActingStaffChange,
    roleOptions,
    channelOptions,
    onAddStaff,
    onToggleStaffActive,
    onRemoveStaff,
    onUpdateStaffRole,
    onUpdateStaffChannel,
    onUpdateStaffTier,
    euMarketEnabled,
    carrierMarkups,
    onUpdateCarrierMarkup,
    oversightBrands,
    oversightWork,
    oversightCounts,
    workBySource,
    applications,
    approvedBrandCount,
    applicationMessage,
    onApplicationAction,
    onCreateManualBrand,
    xeroConnected,
    xeroDemoMode,
    xeroLastSync,
    xeroDaysSinceReseed,
    xeroSummary,
    xeroBusy,
    xeroNotice,
    xeroError,
    onXeroSaveCredentials,
    onXeroManualReseed,
    payoutRows,
    payoutBusyId,
    payoutNotice,
    payoutError,
    onSettlePayout,
    destinations,
    destinationBusyId,
    destinationNotice,
    onReviewDestination,
    invoiceRegistry,
    modelAExample,
    modelBExample,
    shippingEconomicsText,
    commercialRows,
    commercialAudit,
    commercialMessage,
    onRecordCommercialModel,
    companyRegistration,
    chModeLabel,
    canReadRegister,
    companyBusy,
    companyMessage,
    companyReadError,
    companySnapshot,
    confirmationWorkflow,
    companyAuditCount,
    governmentSecrets,
    hmrcReadiness,
    onReadCompanyRegister,
    onAdvanceConfirmationReview,
    onApproveConfirmation,
    onFileViaOfficialApi,
    onRecordManualFiling,
    onVerifyFilingOnRegister,
    onStoreGovernmentSecret,
    onVerifyGovernmentSecret,
    onClearGovernmentSecret,
    operatingCostsDisclaimer,
    costSummary,
    onResetAiUsageLog,
    launchDisclaimer,
    launchItems,
    launchProfile,
    launchMessage,
    onUpdateLaunchProfile,
    onPrepareLaunchProfile,
    onMarkLaunchSubmitted,
    onCopyLaunchText,
    onNavigateView,
  } = props;

  const [oversightMode, setOversightMode] = useState<'none' | 'brands' | 'work' | 'overdue'>('none');
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<StaffRole>('Business Development');
  const [newChannel, setNewChannel] = useState(channelOptions[0] ?? 'Global Operations');

  // Applications local state
  const [appFilter, setAppFilter] = useState<ApplicationStatus | 'all'>('all');
  const [appSearch, setAppSearch] = useState('');
  const [showManualBrand, setShowManualBrand] = useState(false);
  const [manualCo, setManualCo] = useState('');
  const [manualContact, setManualContact] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualCountry, setManualCountry] = useState('');
  const [manualCat, setManualCat] = useState(PRODUCT_CATEGORIES[0]);
  const [manualTrack, setManualTrack] = useState<'direct_fulfillment' | 'financed'>(
    'direct_fulfillment'
  );
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualBusy, setManualBusy] = useState(false);
  const [noteInputByApp, setNoteInputByApp] = useState<
    Record<string, { mode: 'info_requested' | 'flagged'; text: string }>
  >({});

  // Accounting local state
  const [showXeroCreds, setShowXeroCreds] = useState(false);
  const [credClientId, setCredClientId] = useState('');
  const [credClientSecret, setCredClientSecret] = useState('');
  const [credTenantId, setCredTenantId] = useState('');
  const [credAccessToken, setCredAccessToken] = useState('');
  const [payoutFilter, setPayoutFilter] = useState<'pending' | 'settled' | 'all'>('pending');

  // Commercial model local state
  const [cmReason, setCmReason] = useState('');
  const [cmDraft, setCmDraft] = useState<Record<string, 'commission_agent' | 'buy_resell'>>({});

  // Company Control Centre local state
  const [filingRef, setFilingRef] = useState('');
  const [filedAt, setFiledAt] = useState('');
  const [secretDrafts, setSecretDrafts] = useState<Record<string, string>>({});

  // Launch centre drawer state
  const [selectedLaunchId, setSelectedLaunchId] = useState<string | null>(null);
  const [editingLaunchCopy, setEditingLaunchCopy] = useState(false);

  if (loading) return <LoadingRows rows={6} />;

  if (!isSuperAdmin) {
    return (
      <EmptyStateBlock
        title="Super Admin access required"
        description="Staff & RBAC, accounting, commercial relationship governance, company compliance and operating costs are restricted exclusively to Super Admin sessions."
      />
    );
  }

  const activeStaffCount = staff.filter((s) => s.active).length;

  const metrics: MetricItem[] = [
    {
      id: 'sa-staff',
      label: 'Staff & RBAC',
      value: `${activeStaffCount}/${staff.length}`,
      context: 'Active platform operators',
      active: activeTab === 'staff',
      onClick: () => onTabChange('staff'),
    },
    {
      id: 'sa-brands',
      label: 'Brand tenants',
      value: String(oversightBrands.length),
      context: 'Canonical brand directory',
      active: oversightMode === 'brands',
      onClick: () => setOversightMode((m) => (m === 'brands' ? 'none' : 'brands')),
    },
    {
      id: 'sa-work',
      label: 'Open work',
      value: String(oversightCounts.open),
      context: `${oversightCounts.critical} critical`,
      active: oversightMode === 'work',
      onClick: () => setOversightMode((m) => (m === 'work' ? 'none' : 'work')),
    },
    {
      id: 'sa-overdue',
      label: 'Overdue work',
      value: String(oversightCounts.overdue),
      context: oversightCounts.overdue > 0 ? 'Past deadline' : 'All within SLA',
      active: oversightMode === 'overdue',
      onClick: () => setOversightMode((m) => (m === 'overdue' ? 'none' : 'overdue')),
    },
  ];

  const todayIso = new Date().toISOString().slice(0, 10);
  const oversightWorkFiltered =
    oversightMode === 'overdue'
      ? oversightWork.filter((w) => w.dueDate !== null && w.dueDate < todayIso)
      : oversightWork;

  const visibleApps = applications.filter((a) => {
    if (appFilter !== 'all' && a.status !== appFilter) return false;
    if (appSearch.trim() && !a.companyName.toLowerCase().includes(appSearch.trim().toLowerCase())) {
      return false;
    }
    return true;
  });

  const filteredPayoutRows = payoutRows.filter((c) =>
    payoutFilter === 'pending'
      ? c.status !== 'paid'
      : payoutFilter === 'settled'
        ? c.status === 'paid'
        : true
  );

  const selectedLaunch = launchItems.find((i) => i.id === selectedLaunchId) ?? null;

  return (
    <div className="space-y-6">
      <ConsoleHeader
        title="Super Admin Control Plane"
        description="Master governance for staff & RBAC, brand applications, accounting payouts, internal commercial models, Mercenta statutory filings, operating cost guardrails, and founder launch directories."
        meta={
          <>
            <span>{staff.length} staff</span>
            <span>{oversightBrands.length} brand tenants</span>
            <span>{oversightWork.length} work items</span>
            <span>{canMutate ? 'Full admin permissions' : 'View-only mode'}</span>
          </>
        }
      />

      {!canMutate && (
        <NoticeBanner
          tone="warning"
          title="View-only staff session"
          message="The currently selected staff actor has view-only permissions. State-changing actions are disabled."
        />
      )}

      <MetricStrip items={metrics} columns={4} />

      {oversightMode !== 'none' && (
        <SectionCard
          title={
            oversightMode === 'brands'
              ? 'Canonical Brand Tenants'
              : oversightMode === 'overdue'
                ? 'Overdue Platform Work'
                : 'All Open Platform Work'
          }
          description="Live read from the canonical platform stores."
          actions={
            <button
              type="button"
              onClick={() => setOversightMode('none')}
              className="px-2.5 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label text-ink-800 hover:bg-surface"
            >
              Close drill-down
            </button>
          }
        >
          {oversightMode === 'brands' ? (
            <ConsoleTable
              rows={oversightBrands}
              rowKey={(r) => r.id}
              columns={[
                { key: 'name', header: 'Brand', render: (r) => <span className="font-medium">{r.businessName}</span> },
                { key: 'cat', header: 'Category', render: (r) => r.category },
                { key: 'track', header: 'Track', render: (r) => <span className="font-mono text-ds-label">{r.track}</span> },
                { key: 'contract', header: 'Contract', render: (r) => r.contractStatus },
              ]}
            />
          ) : (
            <ConsoleTable
              rows={oversightWorkFiltered}
              rowKey={(w) => w.id}
              columns={[
                { key: 'title', header: 'Work Item', render: (w) => <span className="font-medium">{w.title}</span> },
                { key: 'source', header: 'Source', render: (w) => w.sourceLabel },
                { key: 'tenant', header: 'Tenant', render: (w) => <span className="font-mono text-ds-label">{w.tenantId ?? 'platform'}</span> },
                { key: 'due', header: 'Due Date', render: (w) => <span className="font-mono text-ds-label">{w.dueDate ?? '—'}</span> },
              ]}
            />
          )}
        </SectionCard>
      )}

      <ConsoleTabs<SuperAdminTabId>
        ariaLabel="Super Admin sections"
        value={activeTab}
        onChange={onTabChange}
        tabs={[
          { id: 'staff', label: 'Staff & RBAC', count: staff.length },
          { id: 'applications', label: 'Applications', count: applications.length },
          { id: 'accounting', label: 'Accounting & Payouts', count: payoutRows.length },
          { id: 'homepage', label: 'Homepage Editor' },
          { id: 'commercial', label: 'Commercial Models', count: commercialRows.length },
          { id: 'company', label: 'Company & HMRC' },
          { id: 'costs', label: 'Operating Costs' },
          { id: 'launch', label: 'Launch Centre', count: launchItems.length },
          { id: 'platform', label: 'Secondary Modules' },
        ]}
      />

      {/* ── STAFF & RBAC ─────────────────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <SectionCard
                title="Staff & Roles Matrix"
                description="Manage access roles, operating channels and permission tiers."
                actions={
                  <button
                    type="button"
                    disabled={!canMutate}
                    onClick={() => setShowAddStaff((v) => !v)}
                    className="px-3 py-1.5 rounded-ds-sm bg-accent text-on-dark text-ds-label font-medium hover:brightness-95 disabled:opacity-40"
                  >
                    {showAddStaff ? 'Cancel' : 'Add Staff Member'}
                  </button>
                }
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-hairline text-ds-label">
                    <span className="font-medium text-secondary">Acting staff selector:</span>
                    <select
                      aria-label="Acting staff member"
                      value={actingStaffId}
                      onChange={(e) => onActingStaffChange(e.target.value)}
                      className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ink-950"
                    >
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role}) — {s.permissionTier === 'full' ? 'Full admin' : 'View-only'}
                        </option>
                      ))}
                    </select>
                    <InlineStatus
                      label={canMutate ? 'Mutations enabled' : 'View-only (blocked)'}
                      tone={canMutate ? 'success' : 'warning'}
                    />
                  </div>

                  {showAddStaff && (
                    <div className="border border-hairline rounded-ds-sm p-4 bg-canvas-70 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-ds-label">
                        <label className="block">
                          <span className="text-faint font-medium block mb-1">Full Name</span>
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Jane Doe"
                            className="w-full px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                          />
                        </label>
                        <label className="block">
                          <span className="text-faint font-medium block mb-1">Email</span>
                          <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="name@mercenta.co.uk"
                            className="w-full px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                          />
                        </label>
                        <label className="block">
                          <span className="text-faint font-medium block mb-1">Role</span>
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as StaffRole)}
                            className="w-full px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                          >
                            {roleOptions.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-faint font-medium block mb-1">Operating Channel</span>
                          <select
                            value={newChannel}
                            onChange={(e) => setNewChannel(e.target.value)}
                            className="w-full px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                          >
                            {channelOptions.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <button
                        type="button"
                        disabled={!newName.trim() || !newEmail.trim()}
                        onClick={() => {
                          onAddStaff({
                            name: newName.trim(),
                            email: newEmail.trim(),
                            role: newRole,
                            channel: newChannel,
                          });
                          setNewName('');
                          setNewEmail('');
                          setShowAddStaff(false);
                        }}
                        className="px-3.5 py-1.5 rounded-ds-sm bg-accent text-on-dark text-ds-label font-medium hover:brightness-95 disabled:opacity-40"
                      >
                        Create Staff Profile
                      </button>
                    </div>
                  )}

                  <ConsoleTable
                    rows={staff}
                    rowKey={(m) => m.id}
                    columns={[
                      {
                        key: 'name',
                        header: 'Operator',
                        render: (m) => (
                          <div>
                            <div className="font-medium text-ink-950">{m.name}</div>
                            <div className="text-ds-label font-mono text-faint">{m.email}</div>
                          </div>
                        ),
                      },
                      {
                        key: 'role',
                        header: 'Role',
                        render: (m) => (
                          <select
                            aria-label={`Role for ${m.name}`}
                            value={m.role}
                            disabled={!canMutate}
                            onChange={(e) => onUpdateStaffRole(m.id, e.target.value as StaffRole)}
                            className="px-2 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label"
                          >
                            {roleOptions.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        ),
                      },
                      {
                        key: 'channel',
                        header: 'Channel',
                        hideOnMobile: true,
                        render: (m) => (
                          <select
                            aria-label={`Channel for ${m.name}`}
                            value={m.channel}
                            disabled={!canMutate}
                            onChange={(e) => onUpdateStaffChannel(m.id, e.target.value)}
                            className="px-2 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label"
                          >
                            {channelOptions.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        ),
                      },
                      {
                        key: 'tier',
                        header: 'Tier',
                        render: (m) => (
                          <select
                            aria-label={`Permission tier for ${m.name}`}
                            value={m.permissionTier}
                            disabled={!canMutate}
                            onChange={(e) =>
                              onUpdateStaffTier(m.id, e.target.value as StaffMember['permissionTier'])
                            }
                            className="px-2 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label"
                          >
                            <option value="full">Full admin</option>
                            <option value="view_only">View-only</option>
                          </select>
                        ),
                      },
                      {
                        key: 'status',
                        header: 'Actions',
                        align: 'right',
                        render: (m) => (
                          <div className="flex items-center justify-end gap-2">
                            <InlineStatus
                              label={m.active ? 'Active' : 'Inactive'}
                              tone={m.active ? 'success' : 'neutral'}
                            />
                            <button
                              type="button"
                              disabled={!canMutate}
                              onClick={() => onToggleStaffActive(m.id)}
                              className="px-2 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-micro hover:bg-surface disabled:opacity-40"
                            >
                              {m.active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              disabled={!canMutate}
                              onClick={() => onRemoveStaff(m.id)}
                              className="px-2 py-1 rounded-ds-sm border border-state-danger/20 bg-state-danger/10 text-ds-micro text-state-danger hover:bg-state-danger/10 disabled:opacity-40"
                            >
                              Remove
                            </button>
                          </div>
                        ),
                      },
                    ]}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title="Carrier Shipping Markup Configuration"
                description="Markup percentage applied per carrier. Shown on brand shipping cost estimates and tracked in the shipping margin ledger."
              >
                <div className="space-y-2.5">
                  {carrierMarkups.map((cfg) => (
                    <div
                      key={cfg.id}
                      className="flex flex-wrap items-center justify-between gap-3 border border-hairline rounded-ds-sm px-3.5 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-ds-label font-medium text-ink-950">{cfg.label}</div>
                        <div className="text-ds-micro font-mono text-faint">
                          {cfg.carrier === 'global' ? 'Fallback across carriers' : cfg.carrier}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          disabled={!canMutate}
                          aria-label={`Markup percentage for ${cfg.label}`}
                          value={Math.round(cfg.markupValue * 10000) / 100}
                          onChange={(e) =>
                            onUpdateCarrierMarkup(cfg.id, {
                              markupValue: Math.max(0, Number(e.target.value)) / 100,
                            })
                          }
                          className="w-20 px-2 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-right font-mono text-ds-label"
                        />
                        <span className="text-ds-label text-faint">%</span>
                        <button
                          type="button"
                          disabled={!canMutate}
                          onClick={() => onUpdateCarrierMarkup(cfg.id, { active: !cfg.active })}
                          className={`px-2.5 py-1 rounded-ds-sm border text-ds-micro font-medium ${
                            cfg.active
                              ? 'border-state-success/40 bg-state-success/10 text-state-success'
                              : 'border-hairline-strong bg-surface-raised text-faint'
                          }`}
                        >
                          {cfg.active ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>

            <div className="space-y-6">
              <SectionCard title="Feature Modules & Isolation">
                <div className="space-y-3 text-ds-label">
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-hairline">
                    <div>
                      <div className="font-semibold text-ink-950">EU Market Module</div>
                      <p className="text-faint mt-0.5">
                        CE marking, EU EORI, REACH/GPSR scaffolding. Currently UK-only operations.
                      </p>
                    </div>
                    <InlineStatus
                      label={euMarketEnabled ? 'Enabled' : 'Disabled'}
                      tone={euMarketEnabled ? 'success' : 'neutral'}
                    />
                  </div>
                  <p className="text-faint leading-relaxed">
                    Super-Admin-only governance enforces strict tenant isolation: partner brand
                    sessions never receive platform-wide work, finance, compliance, or audit streams.
                  </p>
                </div>
              </SectionCard>

              <SectionCard title="Open Work by Source">
                {workBySource.length === 0 ? (
                  <p className="text-ds-label text-faint">No open operational work.</p>
                ) : (
                  <ul className="space-y-2 text-ds-label">
                    {workBySource.map((row) => (
                      <li
                        key={row.sourceLabel}
                        className="flex items-center justify-between border-b border-hairline pb-1.5"
                      >
                        <span className="text-secondary">{row.sourceLabel}</span>
                        <span className="font-mono font-semibold text-ink-950">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          </div>
        </div>
      )}

      {/* ── APPLICATIONS ─────────────────────────────────────────────────── */}
      {activeTab === 'applications' && (
        <div className="space-y-6">
          {applicationMessage && <NoticeBanner tone="success" message={applicationMessage} />}

          <SectionCard
            title={`Brand Applications (${applications.length})`}
            description={`${approvedBrandCount} approved partner accounts staged for onboarding.`}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  placeholder="Search company name…"
                  className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label"
                />
                <button
                  type="button"
                  disabled={!canMutate}
                  onClick={() => setShowManualBrand((v) => !v)}
                  className="px-3 py-1.5 rounded-ds-sm bg-accent text-on-dark text-ds-label font-medium hover:brightness-95 disabled:opacity-40"
                >
                  {showManualBrand ? 'Close Manual Form' : 'Add Brand Manually'}
                </button>
              </div>
            }
          >
            <div className="space-y-4">
              {showManualBrand && (
                <div className="border border-hairline rounded-ds-sm p-4 bg-canvas-70 space-y-3">
                  <div className="text-ds-label font-semibold text-ink-950">
                    Manual Brand Creation (deterministic tenant ID)
                  </div>
                  {manualError && <NoticeBanner tone="danger" message={manualError} />}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-ds-label">
                    <input
                      type="text"
                      value={manualCo}
                      onChange={(e) => setManualCo(e.target.value)}
                      placeholder="Company Legal Name *"
                      className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                    />
                    <input
                      type="text"
                      value={manualContact}
                      onChange={(e) => setManualContact(e.target.value)}
                      placeholder="Primary Signatory *"
                      className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                    />
                    <input
                      type="email"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      placeholder="Contact Email *"
                      className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                    />
                    <input
                      type="text"
                      value={manualCountry}
                      onChange={(e) => setManualCountry(e.target.value)}
                      placeholder="Origin Country *"
                      className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                    />
                    <select
                      value={manualCat}
                      onChange={(e) => setManualCat(e.target.value)}
                      className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                    >
                      {PRODUCT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <select
                      value={manualTrack}
                      onChange={(e) =>
                        setManualTrack(e.target.value as 'direct_fulfillment' | 'financed')
                      }
                      className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                    >
                      <option value="direct_fulfillment">Direct Track</option>
                      <option value="financed">Financed Track</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={manualBusy}
                    onClick={async () => {
                      setManualError(null);
                      setManualBusy(true);
                      const res = await onCreateManualBrand({
                        companyName: manualCo,
                        contactName: manualContact,
                        email: manualEmail,
                        country: manualCountry,
                        category: manualCat,
                        track: manualTrack,
                      });
                      setManualBusy(false);
                      if (!res.ok) {
                        setManualError(res.error ?? 'Creation failed.');
                        return;
                      }
                      setManualCo('');
                      setManualContact('');
                      setManualEmail('');
                      setManualCountry('');
                      setShowManualBrand(false);
                    }}
                    className="px-3.5 py-1.5 rounded-ds-sm bg-accent text-on-dark text-ds-label font-medium hover:brightness-95"
                  >
                    {manualBusy ? 'Creating…' : 'Create Brand & Start Onboarding'}
                  </button>
                </div>
              )}

              <MetricStrip
                columns={6}
                items={(
                  ['all', 'pending', 'flagged', 'info_requested', 'approved', 'rejected'] as const
                ).map((st) => ({
                  id: `app-${st}`,
                  label: st === 'all' ? 'All' : st.replace(/_/g, ' '),
                  value: String(
                    st === 'all'
                      ? applications.length
                      : applications.filter((a) => a.status === st).length
                  ),
                  active: appFilter === st,
                  onClick: () => setAppFilter(st),
                }))}
              />

              {visibleApps.length === 0 ? (
                <EmptyStateBlock
                  title="No matching applications"
                  description="Clear the search filter or add a brand manually above."
                />
              ) : (
                <div className="space-y-3">
                  {visibleApps.map((app) => {
                    const noteDraft = noteInputByApp[app.id];
                    const canReview =
                      app.status === 'pending' ||
                      app.status === 'flagged' ||
                      app.status === 'info_requested';
                    return (
                      <div
                        key={app.id}
                        className="border border-hairline rounded-ds-sm p-4 space-y-3 bg-surface-raised"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="text-ds-body font-semibold text-ink-950">
                              {app.companyName}
                            </div>
                            <div className="text-ds-label text-faint">
                              {app.country} · {app.category} · Phone: {app.phone} · SKUs:{' '}
                              {app.skuCount ?? 'N/A'} · Revenue: {app.monthlyRevenue ?? 'N/A'}
                            </div>
                          </div>
                          <InlineStatus
                            label={app.status.replace(/_/g, ' ')}
                            tone={
                              app.status === 'approved'
                                ? 'success'
                                : app.status === 'rejected'
                                  ? 'danger'
                                  : app.status === 'flagged' || app.status === 'info_requested'
                                    ? 'warning'
                                    : 'neutral'
                            }
                          />
                        </div>

                        {app.description && (
                          <p className="text-ds-label text-faint">{app.description}</p>
                        )}
                        {app.adminNotes && (
                          <div className="border border-state-warning/20 bg-state-warning/10 rounded-ds-sm px-3 py-2 text-ds-label text-state-warning">
                            <strong>Admin notes:</strong> {app.adminNotes}
                          </div>
                        )}

                        {canReview && (
                          <div className="pt-2 border-t border-hairline space-y-2">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={!canMutate}
                                onClick={() => void onApplicationAction(app.id, 'approved')}
                                className="px-3 py-1 rounded-ds-sm bg-accent text-on-dark text-ds-label font-medium hover:brightness-95 disabled:opacity-40"
                              >
                                Approve & Start Onboarding
                              </button>
                              <button
                                type="button"
                                disabled={!canMutate}
                                onClick={() => void onApplicationAction(app.id, 'rejected')}
                                className="px-3 py-1 rounded-ds-sm border border-state-danger/20 bg-state-danger/10 text-ds-label text-state-danger hover:bg-state-danger/10 disabled:opacity-40"
                              >
                                Reject
                              </button>
                              <button
                                type="button"
                                disabled={!canMutate}
                                onClick={() =>
                                  setNoteInputByApp((prev) => ({
                                    ...prev,
                                    [app.id]: { mode: 'info_requested', text: '' },
                                  }))
                                }
                                className="px-3 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label text-ink-800 hover:bg-surface disabled:opacity-40"
                              >
                                Request Info
                              </button>
                              <button
                                type="button"
                                disabled={!canMutate}
                                onClick={() =>
                                  setNoteInputByApp((prev) => ({
                                    ...prev,
                                    [app.id]: { mode: 'flagged', text: '' },
                                  }))
                                }
                                className="px-3 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label text-ink-800 hover:bg-surface disabled:opacity-40"
                              >
                                Flag for Review
                              </button>
                            </div>

                            {noteDraft && (
                              <div className="flex flex-wrap items-center gap-2 pt-2">
                                <input
                                  type="text"
                                  value={noteDraft.text}
                                  onChange={(e) =>
                                    setNoteInputByApp((prev) => ({
                                      ...prev,
                                      [app.id]: { ...noteDraft, text: e.target.value },
                                    }))
                                  }
                                  placeholder={
                                    noteDraft.mode === 'info_requested'
                                      ? 'Specify additional information requested…'
                                      : 'Add internal review flag notes…'
                                  }
                                  className="flex-1 min-w-[220px] px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label"
                                />
                                <button
                                  type="button"
                                  disabled={!noteDraft.text.trim()}
                                  onClick={() => {
                                    void onApplicationAction(
                                      app.id,
                                      noteDraft.mode,
                                      noteDraft.text.trim()
                                    );
                                    setNoteInputByApp((prev) => {
                                      const next = { ...prev };
                                      delete next[app.id];
                                      return next;
                                    });
                                  }}
                                  className="px-3 py-1.5 rounded-ds-sm bg-ink-950 text-on-dark text-ds-label font-medium disabled:opacity-40"
                                >
                                  Submit Note
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setNoteInputByApp((prev) => {
                                      const next = { ...prev };
                                      delete next[app.id];
                                      return next;
                                    })
                                  }
                                  className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── ACCOUNTING & PAYOUTS ─────────────────────────────────────────── */}
      {activeTab === 'accounting' && (
        <div className="space-y-6">
          <MetricStrip
            columns={4}
            items={[
              {
                id: 'acc-rev',
                label: 'Xero Revenue',
                value: xeroSummary ? formatGbp(xeroSummary.revenue) : '—',
                context: xeroConnected ? 'Connected' : 'Xero disconnected',
              },
              {
                id: 'acc-exp',
                label: 'Xero Expenses',
                value: xeroSummary ? formatGbp(xeroSummary.expenses) : '—',
                context: 'Recorded expenses',
              },
              {
                id: 'acc-net',
                label: 'Net Profit',
                value: xeroSummary ? formatGbp(xeroSummary.netProfit) : '—',
                context: xeroDemoMode ? '28-day demo sync' : 'Live sync',
              },
              {
                id: 'acc-rec',
                label: 'Receivables (30d)',
                value: formatGbp(invoiceRegistry.receivablesGbp, 2),
                context: `${invoiceRegistry.totalAllocated} invoice numbers (${invoiceRegistry.voidCount} void)`,
              },
            ]}
          />

          <SectionCard
            title="Xero Accounting Connection"
            description="Xero is the accounting and reconciliation layer — never the bank. Payout rails remain Payoneer / Wise with human approval."
            actions={
              !xeroConnected ? (
                <button
                  type="button"
                  onClick={() => setShowXeroCreds((v) => !v)}
                  className="px-3 py-1.5 rounded-ds-sm bg-accent text-on-dark text-ds-label font-medium hover:brightness-95"
                >
                  {showXeroCreds ? 'Cancel' : 'Enter Xero Credentials'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={Boolean(xeroBusy)}
                  onClick={() => void onXeroManualReseed()}
                  className="px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label font-medium hover:bg-surface"
                >
                  {xeroBusy || 'Manual Reseed'}
                </button>
              )
            }
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-ds-label">
                <InlineStatus
                  label={
                    xeroConnected === null
                      ? 'Checking Xero…'
                      : xeroConnected
                        ? `Xero Connected${xeroDemoMode ? ' (Demo)' : ''}`
                        : 'Xero Not Connected'
                  }
                  tone={xeroConnected ? 'success' : 'warning'}
                />
                {xeroLastSync && (
                  <span className="font-mono text-faint">
                    Last sync: {new Date(xeroLastSync).toLocaleString()}
                  </span>
                )}
              </div>

              {xeroDemoMode && xeroDaysSinceReseed !== null && (
                <ConsoleProgressTrack
                  value={xeroDaysSinceReseed}
                  max={28}
                  label={`28-day demo reset tracker (${xeroDaysSinceReseed}/28 days)`}
                />
              )}

              {xeroNotice && <NoticeBanner tone="success" message={xeroNotice} />}
              {xeroError && <NoticeBanner tone="danger" message={xeroError} />}

              {showXeroCreds && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-hairline rounded-ds-sm p-4 bg-canvas-60 text-ds-label">
                  <input
                    type="text"
                    value={credClientId}
                    onChange={(e) => setCredClientId(e.target.value)}
                    placeholder="Xero Client ID"
                    className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                  />
                  <input
                    type="password"
                    value={credClientSecret}
                    onChange={(e) => setCredClientSecret(e.target.value)}
                    placeholder="Xero Client Secret"
                    className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                  />
                  <input
                    type="text"
                    value={credTenantId}
                    onChange={(e) => setCredTenantId(e.target.value)}
                    placeholder="Xero Tenant ID"
                    className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                  />
                  <input
                    type="password"
                    value={credAccessToken}
                    onChange={(e) => setCredAccessToken(e.target.value)}
                    placeholder="Xero Access Token"
                    className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                  />
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      disabled={!credClientId || !credAccessToken}
                      onClick={() => {
                        onXeroSaveCredentials({
                          clientId: credClientId,
                          clientSecret: credClientSecret,
                          tenantId: credTenantId,
                          accessToken: credAccessToken,
                        });
                        setShowXeroCreds(false);
                      }}
                      className="px-3.5 py-1.5 rounded-ds-sm bg-accent text-on-dark text-ds-label font-medium disabled:opacity-40"
                    >
                      Save & Connect
                    </button>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Brand Payouts Ledger"
            description="Brand net share per commission row (PO value − commission). Transfers run in simulation unless Stripe Connect credentials are configured."
          >
            <div className="space-y-4">
              {payoutNotice && <NoticeBanner tone="success" message={payoutNotice} />}
              {payoutError && <NoticeBanner tone="danger" message={payoutError} />}

              <MetricStrip
                columns={3}
                items={[
                  {
                    id: 'pay-pending',
                    label: 'Pending payouts',
                    value: String(payoutRows.filter((r) => r.status !== 'paid').length),
                    context: formatGbp(
                      payoutRows
                        .filter((r) => r.status !== 'paid')
                        .reduce((s, r) => s + r.netShareGbp, 0),
                      2
                    ),
                    active: payoutFilter === 'pending',
                    onClick: () => setPayoutFilter('pending'),
                  },
                  {
                    id: 'pay-settled',
                    label: 'Settled',
                    value: String(payoutRows.filter((r) => r.status === 'paid').length),
                    context: formatGbp(
                      payoutRows
                        .filter((r) => r.status === 'paid')
                        .reduce((s, r) => s + r.netShareGbp, 0),
                      2
                    ),
                    active: payoutFilter === 'settled',
                    onClick: () => setPayoutFilter('settled'),
                  },
                  {
                    id: 'pay-all',
                    label: 'All commissions',
                    value: String(payoutRows.length),
                    context: formatGbp(
                      payoutRows.reduce((s, r) => s + r.netShareGbp, 0),
                      2
                    ),
                    active: payoutFilter === 'all',
                    onClick: () => setPayoutFilter('all'),
                  },
                ]}
              />

              <ConsoleTable
                rows={filteredPayoutRows}
                rowKey={(c) => c.id}
                columns={[
                  {
                    key: 'brand',
                    header: 'Brand / Commission',
                    render: (c) => (
                      <div>
                        <div className="font-medium text-ink-950">{c.brandName}</div>
                        <div className="font-mono text-ds-micro text-faint">{c.id}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'po',
                    header: 'PO',
                    render: (c) => <span className="font-mono text-ds-label">{c.purchaseOrderId}</span>,
                  },
                  {
                    key: 'net',
                    header: 'Net Share',
                    align: 'right',
                    render: (c) => (
                      <span className="font-mono font-semibold">{formatGbp(c.netShareGbp, 2)}</span>
                    ),
                  },
                  {
                    key: 'recon',
                    header: 'Reconciliation',
                    hideOnMobile: true,
                    render: (c) => (
                      <div>
                        <InlineStatus label={c.reconciliationLabel} tone={c.reconciliationTone} />
                        {c.paymentId && (
                          <div className="font-mono text-ds-micro text-faint">{c.paymentId}</div>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'payout',
                    header: 'Payout State',
                    render: (c) => (
                      <div>
                        <InlineStatus label={c.payoutStateLabel} tone={c.payoutStateTone} />
                        {c.payoutBlockedReason && (
                          <div className="text-ds-micro text-state-warning">{c.payoutBlockedReason}</div>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'action',
                    header: 'Settlement',
                    align: 'right',
                    render: (c) => (
                      <button
                        type="button"
                        disabled={!canMutate || payoutBusyId === c.id || c.status === 'paid'}
                        onClick={() => void onSettlePayout(c.id)}
                        className="px-2.5 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-micro font-medium hover:bg-surface disabled:opacity-40"
                      >
                        {payoutBusyId === c.id ? 'Settling…' : c.status === 'paid' ? 'Paid' : 'Settle (sim)'}
                      </button>
                    ),
                  },
                ]}
              />
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard
              title="Payout Destinations"
              description="Transfers can only settle into verified destinations; suspending blocks immediately."
            >
              <div className="space-y-3">
                {destinationNotice && <NoticeBanner tone="info" message={destinationNotice} />}
                {destinations.length === 0 ? (
                  <p className="text-ds-label text-faint">No brand payout destinations on file.</p>
                ) : (
                  <div className="divide-y divide-hairline-06">
                    {destinations.map((d) => (
                      <div key={d.id} className="py-2.5 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-ds-label font-medium text-ink-950">{d.accountName}</div>
                          <div className="text-ds-micro font-mono text-faint">
                            {d.accountRefMasked} · {d.bankName}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <InlineStatus label={d.statusLabel} tone={d.statusTone} />
                          {d.status !== 'verified' && (
                            <button
                              type="button"
                              disabled={!canMutate || destinationBusyId === d.id}
                              onClick={() => void onReviewDestination(d.id, 'verified')}
                              className="px-2 py-1 rounded-ds-sm border border-state-success/40 bg-state-success/10 text-ds-micro text-state-success"
                            >
                              Verify
                            </button>
                          )}
                          {d.status !== 'suspended' && (
                            <button
                              type="button"
                              disabled={!canMutate || destinationBusyId === d.id}
                              onClick={() => void onReviewDestination(d.id, 'suspended')}
                              className="px-2 py-1 rounded-ds-sm border border-state-danger/20 bg-state-danger/10 text-ds-micro text-state-danger"
                            >
                              Suspend
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              title="Retail-Channel Invoice Number Registry"
              description={`Append-only registry (${invoiceRegistry.paymentBasis}). Cancelled numbers are never reused.`}
            >
              <div className="space-y-3 text-ds-label">
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div className="border border-hairline rounded-ds-sm p-2.5">
                    <div className="text-faint">Allocated / Void</div>
                    <div className="font-semibold text-ink-950 mt-0.5">
                      {invoiceRegistry.totalAllocated} / {invoiceRegistry.voidCount}
                    </div>
                  </div>
                  <div className="border border-hairline rounded-ds-sm p-2.5">
                    <div className="text-faint">Upcoming 30d</div>
                    <div className="font-semibold text-ink-950 mt-0.5">
                      {formatGbp(invoiceRegistry.upcomingGbp, 2)}
                    </div>
                  </div>
                </div>
                {invoiceRegistry.recent.length > 0 && (
                  <ul className="space-y-1">
                    {invoiceRegistry.recent.map((r) => (
                      <li key={r.number} className="flex justify-between font-mono">
                        <span>{r.number}</span>
                        <span className="text-faint">
                          {r.voided ? 'void — never reusable' : 'in force'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── COMMERCIAL MODELS ────────────────────────────────────────────── */}
      {activeTab === 'commercial' && (
        <div className="space-y-6">
          <SectionCard
            title="Model A vs Model B — Canonical Economics & Separation"
            description="Commercial relationship is strictly internal between Mercenta and the brand. Switching Model A <-> Model B never alters retail-channel compliance requirements."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-ds-label">
                <div className="border border-hairline rounded-ds-sm p-4 space-y-2">
                  <div className="font-semibold text-ink-950">{modelAExample.label}</div>
                  <div className="flex justify-between font-mono">
                    <span className="text-faint">Retail-channel PO</span>
                    <span>{formatGbp(modelAExample.retailChannelRevenueGbp, 2)}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-faint">Commission ({modelAExample.commissionRatePct}%)</span>
                    <span className="text-state-success">
                      {formatGbp(modelAExample.mercentaCommissionGbp, 2)}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono border-t border-hairline pt-1.5">
                    <span className="text-faint">Brand economic amount</span>
                    <span className="font-semibold">{formatGbp(modelAExample.brandAmountGbp, 2)}</span>
                  </div>
                  <p className="text-ds-micro text-faint">{modelAExample.vatBasis}</p>
                </div>

                <div className="border border-hairline rounded-ds-sm p-4 space-y-2">
                  <div className="font-semibold text-ink-950">{modelBExample.label}</div>
                  <p className="text-faint">{modelBExample.summary}</p>
                  <div className="flex justify-between font-mono">
                    <span className="text-faint">Retail-channel revenue</span>
                    <span>{formatGbp(modelBExample.retailChannelRevenueGbp, 2)}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-faint">Brand acquisition cost</span>
                    <span>{formatGbp(modelBExample.brandAcquisitionCostGbp, 2)}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-faint">Gross commercial spread</span>
                    <span>{formatGbp(modelBExample.grossCommercialSpreadGbp, 2)}</span>
                  </div>
                  <div className="flex justify-between font-mono border-t border-hairline pt-1.5">
                    <span className="text-faint">NET Mercenta margin</span>
                    <span className="font-semibold text-state-success">
                      {formatGbp(modelBExample.netMercentaMarginGbp, 2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border border-hairline rounded-ds-sm p-3 bg-canvas-60 font-mono text-ds-label text-secondary">
                {shippingEconomicsText}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Recorded Brand Commercial Relationships"
            description="Every override requires an explicit reason and appends to the canonical audit trail."
          >
            <div className="space-y-4">
              {commercialMessage && <NoticeBanner tone="info" message={commercialMessage} />}
              <label className="block max-w-md text-ds-label">
                <span className="text-faint font-medium block mb-1">
                  Audit reason (required before recording change)
                </span>
                <input
                  type="text"
                  value={cmReason}
                  onChange={(e) => setCmReason(e.target.value)}
                  placeholder="e.g. Agreed at quarterly commercial review"
                  className="w-full px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                />
              </label>

              <ConsoleTable
                rows={commercialRows}
                rowKey={(r) => r.brandId}
                columns={[
                  {
                    key: 'brand',
                    header: 'Brand',
                    render: (r) => (
                      <div>
                        <div className="font-medium text-ink-950">{r.brandName}</div>
                        <div className="text-ds-label text-faint">{r.category}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'model',
                    header: 'Recorded Model',
                    render: (r) => (
                      <div>
                        <InlineStatus
                          label={r.selectedModelLabel}
                          tone={r.selectedModel === 'commission_agent' ? 'success' : r.selectedModel === 'buy_resell' ? 'info' : 'warning'}
                        />
                        <div className="font-mono text-ds-micro text-faint">{r.termsSummary}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'compliance',
                    header: 'Required Docs',
                    hideOnMobile: true,
                    render: (r) => (
                      <span className="text-ds-label text-secondary">
                        {r.requirementCount} required (model-independent)
                      </span>
                    ),
                  },
                  {
                    key: 'change',
                    header: 'Override Model',
                    align: 'right',
                    render: (r) => (
                      <div className="flex items-center justify-end gap-2">
                        <select
                          aria-label={`Commercial model for ${r.brandName}`}
                          value={cmDraft[r.brandId] ?? ''}
                          onChange={(e) =>
                            setCmDraft((prev) => ({
                              ...prev,
                              [r.brandId]: e.target.value as 'commission_agent' | 'buy_resell',
                            }))
                          }
                          className="px-2 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label"
                        >
                          <option value="">Select…</option>
                          <option value="commission_agent">Model A — Commission</option>
                          <option value="buy_resell">Model B — Buy/Resell</option>
                        </select>
                        <button
                          type="button"
                          disabled={!canMutate || !cmDraft[r.brandId]}
                          onClick={() => {
                            const nextModel = cmDraft[r.brandId];
                            if (!nextModel) return;
                            onRecordCommercialModel(r.brandId, r.brandName, nextModel, cmReason);
                            setCmReason('');
                          }}
                          className="px-2.5 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-micro font-medium hover:bg-surface disabled:opacity-40"
                        >
                          Record
                        </button>
                      </div>
                    ),
                  },
                ]}
              />

              {commercialAudit.length > 0 && (
                <div className="pt-3 border-t border-hairline space-y-1.5 text-ds-label">
                  <div className="font-semibold text-ink-950">Commercial Model Audit Trail</div>
                  {commercialAudit.map((e) => (
                    <div key={e.id} className="border-b border-hairline pb-1.5">
                      <span className="font-medium">{e.brandName}</span> · {e.action} ·{' '}
                      {e.modelLabel} · {e.actorId} — {e.reason} (compliance unchanged:{' '}
                      {String(e.complianceUnchanged)})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      )}

      {/* ── COMPANY & HMRC ───────────────────────────────────────────────── */}
      {activeTab === 'company' && (
        <div className="space-y-6">
          <SectionCard
            title={`Company Control Centre — ${companyRegistration.legalName}`}
            description={companyRegistration.disclaimer}
            actions={
              <button
                type="button"
                disabled={companyBusy || !canReadRegister}
                onClick={() => void onReadCompanyRegister()}
                className="px-3 py-1.5 rounded-ds-sm bg-accent text-on-dark text-ds-label font-medium hover:brightness-95 disabled:opacity-40"
              >
                {companyBusy ? 'Reading register…' : 'Read Company Record'}
              </button>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-ds-label">
                <InlineStatus label={`Companies House: ${chModeLabel}`} tone="info" />
                <span className="font-mono text-faint">
                  Company No: {companyRegistration.companyNumber}
                </span>
                <span className="font-mono text-faint">Audit entries: {companyAuditCount}</span>
              </div>

              {companyMessage && <NoticeBanner tone="success" message={companyMessage} />}
              {companyReadError && <NoticeBanner tone="danger" message={companyReadError} />}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-ds-label">
                <div className="border border-hairline rounded-ds-sm p-3">
                  <div className="text-faint">Status ({companySnapshot.dataSource ?? 'founder'})</div>
                  <div className="font-semibold text-ink-950 mt-0.5">
                    {companySnapshot.status ?? companyRegistration.registrarStatusLabel}
                  </div>
                </div>
                <div className="border border-hairline rounded-ds-sm p-3">
                  <div className="text-faint">Incorporation Date</div>
                  <div className="font-semibold text-ink-950 mt-0.5">
                    {companySnapshot.incorporationDate ?? 'Not read from register'}
                  </div>
                </div>
                <div className="border border-hairline rounded-ds-sm p-3">
                  <div className="text-faint">Registered Office</div>
                  <div className="font-semibold text-ink-950 mt-0.5">
                    {companySnapshot.registeredOfficeAddress ?? 'Not read from register'}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Confirmation Statement Workflow & Deadlines"
            description="Monotonic state machine (Detect -> Verified) with founder approval gate."
          >
            <div className="space-y-4 text-ds-label">
              <div className="flex flex-wrap gap-1.5">
                {confirmationWorkflow.steps.map((s) => (
                  <span
                    key={s.id}
                    title={s.detail}
                    className={`px-2.5 py-1 rounded-ds-sm border font-mono ${
                      s.id === confirmationWorkflow.stage
                        ? 'border-accent bg-ink-950 text-on-dark'
                        : 'border-hairline bg-surface text-secondary'
                    }`}
                  >
                    {s.label}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border border-hairline rounded-ds-sm p-3">
                  <div className="font-semibold text-ink-950">Confirmation Statement</div>
                  <div className="text-faint mt-0.5">
                    Due: {confirmationWorkflow.nextDueDate ?? 'Not read'} ·{' '}
                    {confirmationWorkflow.csDueLabel} ({confirmationWorkflow.csDueState})
                  </div>
                </div>
                <div className="border border-hairline rounded-ds-sm p-3">
                  <div className="font-semibold text-ink-950">Annual Accounts</div>
                  <div className="text-faint mt-0.5">
                    Due: {confirmationWorkflow.accountsDueDate ?? 'Not read'} ·{' '}
                    {confirmationWorkflow.accountsDueLabel} ({confirmationWorkflow.accountsDueState})
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onAdvanceConfirmationReview}
                  className="px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised font-medium hover:bg-surface"
                >
                  Move to Review
                </button>
                <button
                  type="button"
                  onClick={onApproveConfirmation}
                  className="px-3 py-1.5 rounded-ds-sm bg-accent text-on-dark font-medium hover:brightness-95"
                >
                  Founder Approve
                </button>
                <button
                  type="button"
                  onClick={onFileViaOfficialApi}
                  className="px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised font-medium hover:bg-surface"
                >
                  File via Official API
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end pt-2 border-t border-hairline">
                <input
                  type="text"
                  value={filingRef}
                  onChange={(e) => setFilingRef(e.target.value)}
                  placeholder="Companies House filing reference"
                  className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                />
                <input
                  type="date"
                  value={filedAt}
                  onChange={(e) => setFiledAt(e.target.value)}
                  className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onRecordManualFiling(filingRef, filedAt);
                      setFilingRef('');
                    }}
                    className="px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised font-medium hover:bg-surface"
                  >
                    Record Reference
                  </button>
                  <button
                    type="button"
                    onClick={onVerifyFilingOnRegister}
                    className="px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised font-medium hover:bg-surface"
                  >
                    Verify on Register
                  </button>
                </div>
              </div>
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard
              title="Government Credentials (Masked References)"
              description="Values are masked on entry and never logged or exported."
            >
              <div className="space-y-3 text-ds-label">
                {governmentSecrets.map((sec) => (
                  <div key={sec.id} className="border border-hairline rounded-ds-sm p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink-950">{sec.label}</span>
                      <InlineStatus
                        label={sec.secretRef ? `Stored ${sec.masked}` : 'Not stored'}
                        tone={sec.secretRef ? 'success' : 'neutral'}
                      />
                    </div>
                    <p className="text-faint">{sec.purpose}</p>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="password"
                        value={secretDrafts[sec.id] ?? ''}
                        onChange={(e) =>
                          setSecretDrafts((p) => ({ ...p, [sec.id]: e.target.value }))
                        }
                        placeholder={sec.enterAt}
                        className="flex-1 min-w-[160px] px-2.5 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          onStoreGovernmentSecret(sec.id, secretDrafts[sec.id] ?? '');
                          setSecretDrafts((p) => ({ ...p, [sec.id]: '' }));
                        }}
                        className="px-2.5 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised font-medium"
                      >
                        Store Mask
                      </button>
                      <button
                        type="button"
                        disabled={!sec.secretRef}
                        onClick={() => onVerifyGovernmentSecret(sec.id)}
                        className="px-2.5 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised disabled:opacity-40"
                      >
                        Confirm Working
                      </button>
                      <button
                        type="button"
                        disabled={!sec.secretRef}
                        onClick={() => onClearGovernmentSecret(sec.id)}
                        className="px-2.5 py-1 rounded-ds-sm border border-state-danger/20 bg-state-danger/10 text-state-danger disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="HMRC Making Tax Digital"
              description="Live readiness state — never fabricated as active."
            >
              <div className="space-y-3 text-ds-label">
                <InlineStatus
                  label={
                    hmrcReadiness.state === 'ready_not_connected'
                      ? 'READY / NOT CONNECTED'
                      : hmrcReadiness.state
                  }
                  tone="warning"
                />
                <p className="text-secondary">{hmrcReadiness.reason}</p>
                <p className="text-faint">Blocker: {hmrcReadiness.blocker}</p>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── OPERATING COSTS ──────────────────────────────────────────────── */}
      {activeTab === 'costs' && (
        <div className="space-y-6">
          <NoticeBanner tone="info" title="Cost & Spend Disclosure" message={operatingCostsDisclaimer} />

          <MetricStrip
            columns={4}
            items={[
              {
                id: 'cost-fixed',
                label: 'Fixed Monthly',
                value: formatGbp(costSummary.monthlyFixedGbp, 2),
                context: 'Manual baseline',
              },
              {
                id: 'cost-ai',
                label: 'AI Usage (Month)',
                value: formatGbp(costSummary.aiMonthlySpendGbp, 2),
                context: `${costSummary.aiCalls} calls · ${costSummary.aiTokens} tokens`,
              },
              {
                id: 'cost-proj',
                label: 'Projected Month',
                value: formatGbp(costSummary.projectedMonthGbp, 2),
                context: `Protection: ${costSummary.aiProtectionState}`,
              },
              {
                id: 'cost-gross',
                label: 'Contribution (Gross)',
                value: formatGbp(costSummary.contributionGrossGbp, 2),
                context: `${costSummary.contributionMarginPct}% (${costSummary.contributionProvisional ? 'provisional' : 'confirmed'})`,
              },
            ]}
          />

          <SectionCard
            title="Provider Infrastructure & Runtime AI Policy"
            description={`${costSummary.freeModelsLabel}. Ceilings: ${costSummary.ceilingsLabel}.`}
            actions={
              <button
                type="button"
                onClick={onResetAiUsageLog}
                className="px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label font-medium hover:bg-surface"
              >
                Clear Demo Usage Log
              </button>
            }
          >
            <ConsoleTable
              rows={costSummary.providers}
              rowKey={(p) => p.id}
              columns={[
                {
                  key: 'name',
                  header: 'Provider',
                  render: (p) => (
                    <div>
                      <div className="font-medium text-ink-950">{p.name}</div>
                      <div className="text-ds-label text-faint">
                        {p.plan} · {p.billing} · {p.category}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'fixed',
                  header: 'Fixed',
                  align: 'right',
                  render: (p) => formatGbp(p.fixedMonthlyGbp, 2),
                },
                {
                  key: 'usage',
                  header: 'Usage',
                  align: 'right',
                  render: (p) => formatGbp(p.usageActualGbp, 2),
                },
                {
                  key: 'budget',
                  header: 'Budget',
                  align: 'right',
                  render: (p) => formatGbp(p.usageBudgetGbp, 2),
                },
                {
                  key: 'source',
                  header: 'Source',
                  render: (p) => <span className="font-mono text-ds-micro">{p.source}</span>,
                },
              ]}
            />
          </SectionCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Revenue Streams (Non-Blended)">
              <ConsoleBarChart
                data={costSummary.revenueStreams.map((s) => ({
                  label: s.label.slice(0, 14),
                  value: s.gbp,
                  hint: `${s.label}: ${formatGbp(s.gbp, 2)} (${s.source})`,
                }))}
                formatValue={(v) => formatGbp(v, 2)}
              />
            </SectionCard>

            <SectionCard title="Unit Economics & Pricing Inputs">
              <div className="space-y-3 text-ds-label">
                <div className="grid grid-cols-2 gap-2 font-mono">
                  <div className="border border-hairline rounded-ds-sm p-2.5">
                    Per brand ({costSummary.units.brands}): {formatGbp(costSummary.perUnit.perBrandGbp, 2)}
                  </div>
                  <div className="border border-hairline rounded-ds-sm p-2.5">
                    Per opportunity ({costSummary.units.opportunities}):{' '}
                    {formatGbp(costSummary.perUnit.perOpportunityGbp, 2)}
                  </div>
                  <div className="border border-hairline rounded-ds-sm p-2.5">
                    Per lead ({costSummary.units.leads}): {formatGbp(costSummary.perUnit.perLeadGbp, 2)}
                  </div>
                  <div className="border border-hairline rounded-ds-sm p-2.5">
                    Per AI op ({costSummary.units.aiOperations}):{' '}
                    {formatGbp(costSummary.perUnit.perAiOperationGbp, 2)}
                  </div>
                </div>
                <div className="border-t border-hairline pt-2 space-y-1">
                  {costSummary.costInputs.map((ci) => (
                    <div key={ci.id} className="flex justify-between">
                      <span className="text-faint">{ci.label}</span>
                      <span className="font-mono font-medium">
                        {ci.formattedValue} {ci.requiresFounderApproval ? '(Founder approval)' : ''}
                      </span>
                    </div>
                  ))}
                  <div className="text-faint pt-1">
                    Break-even subscription: <strong>{costSummary.minSubscriptionLabel}</strong> ·{' '}
                    {costSummary.minSubscriptionNote}
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── LAUNCH CENTRE ────────────────────────────────────────────────── */}
      {activeTab === 'launch' && (
        <div className="space-y-6">
          <NoticeBanner tone="info" title="Mercenta Launch Centre" message={launchDisclaimer} />
          {launchMessage && <NoticeBanner tone="success" message={launchMessage} />}

          <MetricStrip
            columns={4}
            items={[
              { id: 'ln-total', label: 'Directories', value: String(launchItems.length) },
              {
                id: 'ln-acct',
                label: 'Accounts Created',
                value: String(launchItems.filter((i) => i.accountStatus !== 'not_started').length),
              },
              {
                id: 'ln-prep',
                label: 'Prepared',
                value: String(launchItems.filter((i) => i.profileStatus !== 'not_prepared').length),
              },
              {
                id: 'ln-sub',
                label: 'Submitted',
                value: String(launchItems.filter((i) => i.complete).length),
              },
            ]}
          />

          <SectionCard
            title="Founder Startup Launch Directories"
            actions={
              <button
                type="button"
                onClick={() => setEditingLaunchCopy((v) => !v)}
                className="px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label font-medium hover:bg-surface"
              >
                {editingLaunchCopy ? 'Close Copy Editor' : 'Modify Launch Copy'}
              </button>
            }
          >
            <div className="space-y-4">
              {editingLaunchCopy && (
                <div className="border border-hairline rounded-ds-sm p-4 bg-canvas-70 space-y-3 text-ds-label">
                  <label className="block">
                    <span className="font-medium text-secondary block mb-1">Tagline</span>
                    <input
                      type="text"
                      value={launchProfile.tagline}
                      onChange={(e) => onUpdateLaunchProfile({ tagline: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                    />
                  </label>
                  <label className="block">
                    <span className="font-medium text-secondary block mb-1">Short Description</span>
                    <textarea
                      rows={2}
                      value={launchProfile.shortDescription}
                      onChange={(e) => onUpdateLaunchProfile({ shortDescription: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                    />
                  </label>
                  <label className="block">
                    <span className="font-medium text-secondary block mb-1">Long Description</span>
                    <textarea
                      rows={4}
                      value={launchProfile.longDescription}
                      onChange={(e) => onUpdateLaunchProfile({ longDescription: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised"
                    />
                  </label>
                </div>
              )}

              <ConsoleTable
                rows={launchItems}
                rowKey={(item) => item.id}
                onRowClick={(item) => setSelectedLaunchId(item.id)}
                columns={[
                  {
                    key: 'name',
                    header: 'Platform',
                    render: (item) => <span className="font-medium">{item.name}</span>,
                  },
                  { key: 'channel', header: 'Channel', render: (item) => item.channelLabel },
                  {
                    key: 'acct',
                    header: 'Account',
                    render: (item) => (
                      <span className="font-mono text-ds-label">{item.accountStatus}</span>
                    ),
                  },
                  {
                    key: 'prof',
                    header: 'Profile',
                    render: (item) => (
                      <InlineStatus
                        label={item.profileStatus}
                        tone={item.complete ? 'success' : item.profileStatus === 'prepared' ? 'info' : 'neutral'}
                      />
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    align: 'right',
                    render: (item) => (
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => onPrepareLaunchProfile(item.id)}
                          className="px-2 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-micro hover:bg-surface"
                        >
                          Prepare
                        </button>
                        <button
                          type="button"
                          onClick={() => void onCopyLaunchText(item.name, item.packageText)}
                          className="px-2 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-micro hover:bg-surface"
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          onClick={() => onMarkLaunchSubmitted(item.id)}
                          className="px-2 py-1 rounded-ds-sm bg-accent text-on-dark text-ds-micro hover:brightness-95"
                        >
                          Mark Submitted
                        </button>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          </SectionCard>

          <SlideOverDrawer
            open={selectedLaunch !== null}
            onClose={() => setSelectedLaunchId(null)}
            title={selectedLaunch?.name ?? ''}
            subtitle={
              selectedLaunch
                ? `${selectedLaunch.channelLabel} · requirements ${
                    selectedLaunch.requirementsVerified ? 'verified' : 'verify on platform'
                  }`
                : undefined
            }
          >
            {selectedLaunch && (
              <div className="space-y-4 text-ds-label">
                <p className="text-secondary">{selectedLaunch.audience}</p>
                <div className="space-y-1.5">
                  <div className="font-semibold text-ink-950">Submission Checklist</div>
                  {selectedLaunch.checklist.map((c) => (
                    <div key={c.label} className="flex items-start gap-2">
                      <span className={c.done ? 'text-state-success font-bold' : 'text-state-warning'}>
                        {c.done ? '✓' : '○'}
                      </span>
                      <span>
                        {c.label}
                        {c.verifyOnPlatform ? ' (verify on platform)' : ''}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <a
                    href={selectedLaunch.siteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent font-medium hover:underline"
                  >
                    Open site
                  </a>
                  <a
                    href={selectedLaunch.requirementsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent font-medium hover:underline"
                  >
                    Requirements URL
                  </a>
                </div>
                <pre className="whitespace-pre-wrap bg-surface border border-hairline rounded-ds-sm p-3 font-mono text-ds-micro">
                  {selectedLaunch.packageText}
                </pre>
              </div>
            )}
          </SlideOverDrawer>
        </div>
      )}

      {/* ── SECONDARY PLATFORM MODULES ───────────────────────────────────── */}
      {activeTab === 'platform' && (
        <SectionCard
          title="Dedicated Operations Modules"
          description="Legacy secondary Super Admin tabs are hosted as full first-class screens in Operations Console."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-ds-label">
            {[
              {
                title: 'Brand Intelligence & Rakazo',
                desc: 'ICP scoring, territory enrichment, prospect outreach & acquisition.',
                viewId: 'brand_intelligence',
              },
              {
                title: 'Compliance & Verification',
                desc: 'UKCA declarations, automated Companies House verification & uploads.',
                viewId: 'compliance',
              },
              {
                title: 'Integration Settings & Simulation',
                desc: 'Provider OAuth/API credentials, health checks & deterministic simulation modes.',
                viewId: 'integrations',
              },
              {
                title: 'Founder Investor Centre',
                desc: 'Live platform metrics, worked commercial slide decks & HTML packet export.',
                viewId: 'founder_centre',
              },
              {
                title: 'Partnerships & Fundraising',
                desc: 'Strategic retail/distributor pipeline, grant programmes & bank financing.',
                viewId: 'partnerships',
              },
              {
                title: 'Audit Log',
                desc: 'Immutable platform mutation timeline with entity & actor filtering.',
                viewId: 'audit_log',
              },
            ].map((card) => (
              <div
                key={card.viewId}
                className="border border-hairline rounded-ds-sm p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="font-semibold text-ink-950">{card.title}</div>
                  <p className="text-faint mt-1">{card.desc}</p>
                </div>
                {onNavigateView && (
                  <button
                    type="button"
                    onClick={() => onNavigateView(card.viewId)}
                    className="self-start px-3 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised font-medium text-ink-900 hover:bg-surface"
                  >
                    Open Screen
                  </button>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── §PHASE C BATCH C1 — HOMEPAGE EDITOR ───────────────────────────
          Rendered by the SCREEN and passed in, so this view keeps its single job
          (render what it is given). It is null unless the tab is open, so the editor's
          data load happens only when an operator actually opens it. */}
      {activeTab === 'homepage' && homepagePanel}
    </div>
  );
}
