import { useEffect, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { consumeAdminNavRequest } from '@/data/adminNav';
import { Card, Badge, Button, DataTable, Input, Select } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { StaffMember, StaffRole, CarrierMarkupConfig } from '@/types';
import { demoCarrierMarkup, updateCarrierMarkup } from '@/data/demoStore';
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Power,
  Users,
  Globe2,
  DollarSign,
  Truck,
  Layout,
  FileText,
  Search,
  Factory,
  Handshake,
  PiggyBank,
  ClipboardList,
  Receipt,
  Bot,
  Target,
  FlaskConical,
  Palette,
  FileCheck2,
  Megaphone,
  Building2,
  Link2,
  Wallet,
} from 'lucide-react';
import {
  ContextPanel,
  MetricBand,
  RecordFieldList,
  WorkspaceFrame,
  WorkspaceGrid,
  WorkspaceHeader,
  WorkspaceSection,
  type MetricTileData,
} from '@/components/shared/workspace';
import { useBrands } from '@/data/queries';
import { useWorkItems } from '@/lib/work/useWork';
import { WORK_COUNT_SETS, WORK_SOURCE_LABELS, demoToday, workCounts } from '@/lib/work/workStore';

const SUPER_ADMIN_TABS = [
  { id: 'staff', label: 'Staff & RBAC', icon: Users },
  { id: 'applications', label: 'Applications', icon: ClipboardList },
  { id: 'accounting', label: 'Accounting', icon: Receipt },
  { id: 'rakazo', label: 'Rakazo', icon: Bot },
  { id: 'homepage', label: 'Homepage Editor', icon: Layout },
  { id: 'research', label: 'Product Research', icon: Search },
  { id: 'manufacturer', label: 'Manufacturer Sourcing', icon: Factory },
  { id: 'grants', label: 'Grants & Investors', icon: Handshake },
  { id: 'pitch', label: 'Investor Pitch', icon: FileText },
  { id: 'commercial', label: 'Commercial Models', icon: Handshake },
  { id: 'launch', label: 'Launch Centre', icon: Megaphone },
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'google', label: 'Google', icon: Link2 },
  { id: 'costs', label: 'Operating Costs', icon: Wallet },
  { id: 'financing', label: 'Bank Financing', icon: PiggyBank },
  { id: 'brandintelligence', label: 'Brand Intelligence', icon: Target },
  { id: 'simulation', label: 'Simulation', icon: FlaskConical },
  { id: 'compliance', label: 'Compliance', icon: FileCheck2 },
  { id: 'designsystem', label: 'Design System', icon: Palette },
];
import { EU_MARKET_ENABLED } from '@/config/customs';
import { HomepageEditor } from './HomepageEditor';
import { ProductResearchSection } from './ProductResearchSection';
import { ManufacturerSourcingSection } from './ManufacturerSourcingSection';
import { GrantsInvestorsSection } from './GrantsInvestorsSection';
import { InvestorPitchSection } from './InvestorPitchSection';
import { BankFinancingSection } from './BankFinancingSection';
import { BrandIntelligencePanel } from './BrandIntelligencePanel';
import { ApplicationsPanel } from './ApplicationsPanel';
import { AccountingPanel } from './AccountingPanel';
import { RakazoPanel } from './RakazoPanel';
import { SimulationControl } from './integrations/SimulationControl';
import { CompliancePanel } from './CompliancePanel';
import { DesignSystemShowcase } from '../design/DesignSystemShowcase';
import { CommercialModelsPanel } from './CommercialModelsPanel';
import { LaunchCentre } from './LaunchCentre';
import { CompanyControlCentre } from './CompanyControlCentre';
import { GoogleSetupWizard } from './GoogleSetupWizard';
import { OperatingCostsPanel } from './OperatingCostsPanel';

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'Super Admin', label: 'Super Admin' },
  { value: 'Business Development', label: 'Business Development' },
  { value: 'Logistics Coordinator', label: 'Logistics Coordinator' },
  { value: 'Cross-Border Logistics Lead', label: 'Cross-Border Logistics Lead' },
  { value: 'UK HMRC Compliance Specialist', label: 'UK HMRC Compliance Specialist' },
  { value: 'Carrier Integration Manager', label: 'Carrier Integration Manager' },
];

/**
 * §P9 (programme decisions 1/4) — REPOINTED. The old list also offered
 * `'Harare BAK Depot Lead'`, `'BAK Logistics Network'` and
 * `'FedEx Carrier Integration'`: retired third parties that are not Mercenta
 * carrier accounts. Only Mercenta's own channel vocabulary remains.
 */
const CHANNEL_OPTIONS = [
  'Global Operations',
  'US Brand Pipeline',
  'EU Brand Pipeline',
  'African Brand Pipeline',
  'UK HMRC Compliance',
  'DHL Carrier Integration',
];

let staffIdCounter = 100;

export function SuperAdminPanel() {
  const {
    staff,
    addStaff,
    removeStaff,
    toggleStaffActive,
    updateStaffRole,
    updateStaffChannel,
    updateStaffTier,
    actingStaffId,
    setActingStaffId,
    canCurrentUserMutate,
  } = useApp();

  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('staff');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<StaffRole>('Business Development');
  const [newChannel, setNewChannel] = useState('Global Operations');
  const [markupVersion, setMarkupVersion] = useState(0);

  /**
   * §32 (M13 Phase 11) — consume a pending command-centre navigation intent so a
   * CTA lands on the EXACT Super Admin tab (Company / Google / Operating Costs /
   * Launch Centre / Applications) rather than the default one.
   */
  useEffect(() => {
    const req = consumeAdminNavRequest('super_admin');
    if (req?.tab && SUPER_ADMIN_TABS.some((t) => t.id === req.tab)) setActiveTab(req.tab);
  }, []);

  const handleAddStaff = () => {
    if (!newName || !newEmail) return;
    const member: StaffMember = {
      id: `staff-${staffIdCounter++}`,
      name: newName,
      email: newEmail,
      role: newRole,
      channel: newChannel,
      active: true,
      permissionTier: 'full',
    };
    addStaff(member);
    setNewName('');
    setNewEmail('');
    setNewRole('Business Development');
    setNewChannel('Global Operations');
    setShowForm(false);
  };

  const activeCount = staff.filter((s) => s.active).length;

  /* §Sprint 2 — platform oversight read from the SAME canonical stores the rest
     of the platform uses. Nothing here is a second data source. */
  const brands = useBrands().data?.data ?? [];
  const allWork = useWorkItems('admin');
  const today = demoToday();
  /**
   * §SSOT S5 — the platform-wide numbers come from the ONE counting owner
   * (`workCounts`), the same function the nav badge and the work workspace read.
   * `criticalWork` below is a separate drill-down fact (critical ONLY), not the
   * declared `attention` set, and is labelled as such.
   */
  const counts = workCounts('admin');
  const criticalWork = allWork.filter((w) => w.priority === 'critical');
  /**
   * §SSOT S5 — this array selects the ROWS of the overdue drill-down; the NUMBER
   * rendered anywhere is `counts.overdue` (the one owner). The gate asserts the
   * two agree, so the selection can never drift from the count.
   */
  const overdueWork = allWork.filter((w) => w.dueDate !== null && w.dueDate < today);
  const [oversight, setOversight] = useState<'none' | 'work' | 'overdue' | 'brands'>('none');

  const oversightMetrics: MetricTileData[] = [
    {
      id: 'sa-staff',
      label: 'Staff & RBAC',
      value: String(staff.length),
      size: 'hero',
      tone: activeCount === staff.length ? 'success' : 'warning',
      statusText: `${activeCount} active`,
      context: 'Staff accounts, roles, channels and permission tiers',
      domain: 'compliance',
      onOpen: () => setActiveTab('staff'),
      testId: 'sa-metric-staff',
      valueTestId: 'sa-metric-staff-value',
    },
    {
      id: 'sa-brands',
      label: 'Brand tenants',
      value: String(brands.length),
      tone: 'info',
      statusText: 'Canonical universe',
      context: 'Operational brand tenants on the platform',
      domain: 'catalogue',
      onOpen: () => setOversight('brands'),
      testId: 'sa-metric-brands',
      valueTestId: 'sa-metric-brands-value',
    },
    {
      id: 'sa-work',
      label: 'Operational work',
      value: String(counts.open),
      tone: criticalWork.length > 0 ? 'danger' : 'warning',
      statusText: `${criticalWork.length} critical`,
      context: 'Every unresolved work item across the platform',
      domain: 'logistics',
      onOpen: () => setOversight('work'),
      testId: 'sa-metric-work',
      valueTestId: 'sa-metric-work-value',
    },
    {
      id: 'sa-overdue',
      label: WORK_COUNT_SETS.overdue.label,
      value: String(counts.overdue),
      tone: counts.overdue > 0 ? 'danger' : 'success',
      statusText: counts.overdue > 0 ? 'Past deadline' : 'Nothing overdue',
      context: WORK_COUNT_SETS.overdue.definition,
      domain: 'finance',
      onOpen: () => setOversight('overdue'),
      testId: 'sa-metric-overdue',
      valueTestId: 'sa-metric-overdue-value',
    },
  ];

  const oversightRows =
    oversight === 'overdue' ? overdueWork : oversight === 'work' ? allWork : [];

  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="Super Admin · Governance"
        title="Super Admin Panel — Tadii"
        description="Master control matrix — staff, roles & channel assignments, plus platform-wide oversight of brands, operational work, finance, compliance, integrations, provider state and audit. Nothing on this surface is exposed to a brand session."
        meta={
          <>
            <span className="font-mono text-ds-label text-zinc-500">{staff.length} staff</span>
            <span className="font-mono text-ds-label text-zinc-500">{brands.length} brand tenants</span>
            <span className="font-mono text-ds-label text-zinc-500">{allWork.length} work items</span>
            <span className="font-mono text-ds-label text-zinc-500">
              acting as {canCurrentUserMutate ? 'full admin' : 'view-only ops'}
            </span>
          </>
        }
        toolbar={
          <div className="flex items-center gap-1 flex-wrap" data-testid="super-admin-tabs">
            {SUPER_ADMIN_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`super-admin-tab-${tab.id}`}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-ds-md text-xs font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-brass-500 text-strong shadow-ds-subtle'
                      : 'text-zinc-400 hover:text-strong hover:bg-tint'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        }
      />

      <MetricBand items={oversightMetrics} columns={4} />

      <WorkspaceGrid
        rail={
          <>
            <ContextPanel title="Platform oversight">
              <RecordFieldList
                fields={[
                  { label: 'Staff', value: `${activeCount}/${staff.length} active` },
                  { label: 'Brand tenants', value: String(brands.length) },
                  { label: WORK_COUNT_SETS.open.label, value: String(counts.open) },
                  { label: 'Critical work', value: String(criticalWork.length) },
                  { label: WORK_COUNT_SETS.overdue.label, value: String(counts.overdue) },
                  { label: 'Simulation state', value: 'Simulated providers only' },
                ]}
              />
            </ContextPanel>
            <ContextPanel title="Work by source">
              <ul className="space-y-1.5">
                {Object.entries(
                  allWork.reduce<Record<string, number>>((acc, w) => {
                    acc[w.source] = (acc[w.source] ?? 0) + 1;
                    return acc;
                  }, {})
                )
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8)
                  .map(([source, count]) => (
                    <li key={source} className="flex items-center justify-between text-ds-label text-zinc-400">
                      <span>{WORK_SOURCE_LABELS[source as keyof typeof WORK_SOURCE_LABELS]}</span>
                      <span className="font-mono text-zinc-500">{count}</span>
                    </li>
                  ))}
                {allWork.length === 0 && (
                  <li className="text-ds-label text-zinc-500">No open operational work.</li>
                )}
              </ul>
            </ContextPanel>
            <ContextPanel title="Tenant isolation">
              <p className="text-ds-label leading-snug text-zinc-400">
                This surface is Super-Admin-only. Brand sessions never receive platform-wide work,
                finance, compliance or audit data — the domain refuses it, not just the navigation.
              </p>
            </ContextPanel>
          </>
        }
      >
      {oversight !== 'none' && (
        <WorkspaceSection
          title={
            oversight === 'brands'
              ? 'Brand tenants'
              : oversight === 'overdue'
                ? 'Overdue operational work'
                : 'All operational work'
          }
          description="Read from the canonical work layer / brand store — the same records every other workspace uses."
          domain="compliance"
          action={
            <Button variant="ghost" className="text-ds-label" onClick={() => setOversight('none')} data-testid="sa-oversight-close">
              Close
            </Button>
          }
        >
          {oversight === 'brands' ? (
            <ul className="divide-y divide-hairline-06 overflow-hidden rounded-ds-lg border border-hairline bg-ink-850">
              {brands.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2" data-testid={`sa-brand-${b.id}`}>
                  <span className="text-xs font-medium text-strong">{b.profile.businessName}</span>
                  <span className="font-mono text-ds-micro text-zinc-500">
                    {b.category} · {b.track} · {b.contractStatus}
                  </span>
                </li>
              ))}
              {brands.length === 0 && <li className="px-3.5 py-3 text-ds-label text-zinc-500">No brand tenants.</li>}
            </ul>
          ) : (
            <ul className="divide-y divide-hairline-06 overflow-hidden rounded-ds-lg border border-hairline bg-ink-850">
              {oversightRows.map((w) => (
                <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2" data-testid={`sa-work-${w.id}`}>
                  <span className="text-xs font-medium text-strong">{w.title}</span>
                  <span className="font-mono text-ds-micro text-zinc-500">
                    {WORK_SOURCE_LABELS[w.source]} · {w.tenantId ?? 'platform'} · {w.dueDate ?? 'no deadline'}
                  </span>
                </li>
              ))}
              {oversightRows.length === 0 && (
                <li className="px-3.5 py-3 text-ds-label text-zinc-500">Nothing matches this view.</li>
              )}
            </ul>
          )}
        </WorkspaceSection>
      )}

      <div className="space-y-4">

      {activeTab === 'staff' && (
        <>
          {/* Feature flags — disabled future capabilities */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-ds-md bg-tint flex items-center justify-center">
              <Globe2 className={cn('w-5 h-5', EU_MARKET_ENABLED ? 'text-emerald-400' : 'text-zinc-600')} />
            </div>
            <div>
              <div className="text-sm font-medium text-strong">EU Market Module</div>
              <p className="text-ds-label text-zinc-500 mt-0.5 max-w-md">
                EU distribution capability (CE marking, EU EORI, REACH/GPSR).
                Currently disabled — UK-only operations. Enable when strategy
                expands; the module scaffolding is preserved.
              </p>
            </div>
          </div>
          <Badge className="text-ds-micro bg-zinc-500/15 text-zinc-400 border-zinc-500/20">
            {EU_MARKET_ENABLED ? 'Enabled' : 'Disabled — future capability'}
          </Badge>
        </div>
      </Card>

      {/* §Batch-14 — Shipping Markup Config */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-brass-400" />
          <span className="text-xs font-semibold text-strong">Shipping Markup Configuration</span>
          <Badge className="text-ds-micro bg-amber-500/15 text-amber-300 border-amber-500/20 ml-auto">
            Integrated Logistics Revenue
          </Badge>
        </div>
        <p className="text-ds-label text-zinc-500 mb-3">
          Set the markup percentage applied per carrier. The brand sees the marked-up price
          in the shipping cost estimate. Markup revenue is tracked in the shipping margin ledger.
        </p>
        <div className="space-y-2">
          {demoCarrierMarkup.map((cfg) => (
            <div key={cfg.id} className="flex items-center gap-3 bg-ink-900 rounded-ds-md p-2.5">
              <Truck className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-strong">{cfg.label}</span>
                <span className="text-ds-micro text-zinc-600 ml-2">
                  ({cfg.carrier === 'global' ? 'fallback for all carriers' : cfg.carrier})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={cfg.markupValue * 100}
                  aria-label={`Markup percentage for ${cfg.label}`}
                  onChange={(e) => {
                    const val = Number(e.target.value) / 100;
                    updateCarrierMarkup(cfg.id, { markupValue: val });
                    // Force re-render
                    setMarkupVersion((v) => v + 1);
                  }}
                  className="w-20 bg-ink-850 border border-hairline rounded-ds-sm px-2 py-1 text-xs text-strong text-right font-mono focus:outline-none focus:border-brass-500/40"
                />
                <span className="text-ds-micro text-zinc-500 w-4">%</span>
                <button
                  onClick={() => {
                    updateCarrierMarkup(cfg.id, { active: !cfg.active });
                    setMarkupVersion((v) => v + 1);
                  }}
                  className={cn(
                    'p-1 rounded-ds-sm text-ds-micro border transition-colors',
                    cfg.active
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-zinc-500/15 text-zinc-500 border-zinc-500/20'
                  )}
                  title={cfg.active ? 'Active' : 'Disabled'}
                >
                  {cfg.active ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* §Sprint 2 — the page identity now lives in WorkspaceHeader (always
          visible), so the tab no longer renders its own duplicate header. */}

      {/* §Stage-25 — act-as-staff selector: exercises the RBAC tiers end to
          end. Selecting a view-only staff member disables mutating actions
          across the admin surfaces that enforce canCurrentUserMutate. */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs text-zinc-500 font-medium whitespace-nowrap">
            Acting as staff:
          </span>
          <select
            value={actingStaffId}
            onChange={(e) => setActingStaffId(e.target.value)}
            className="bg-ink-900 border border-hairline rounded-ds-sm px-2.5 py-1.5 text-xs text-strong cursor-pointer"
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role}) — {s.permissionTier === 'full' ? 'Full admin' : 'View-only ops'}
              </option>
            ))}
          </select>
          <Badge
            className={cn(
              'text-ds-micro',
              canCurrentUserMutate
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/20'
            )}
          >
            {canCurrentUserMutate ? 'Mutations allowed' : 'View-only — mutations blocked'}
          </Badge>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-3.5 h-3.5 text-brass-400" />
            <span className="text-xs text-zinc-500 font-medium">Total Staff</span>
          </div>
          <div className="text-2xl font-bold text-strong">{staff.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Power className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-zinc-500 font-medium">Active</span>
          </div>
          <div className="text-2xl font-bold text-strong">{activeCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-zinc-500 font-medium">Channels</span>
          </div>
          <div className="text-2xl font-bold text-strong">{CHANNEL_OPTIONS.length}</div>
        </Card>
      </div>

      {/* Add Staff Form */}
      {showForm ? (
        <Card title="Create New Staff Profile">
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Full Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Jane Doe"
              />
              <Input
                label="Email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@mercenta.co.uk"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as StaffRole)}
                options={ROLE_OPTIONS}
              />
              <Select
                label="Operating Channel"
                value={newChannel}
                onChange={(e) => setNewChannel(e.target.value)}
                options={CHANNEL_OPTIONS.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Button variant="accent" onClick={handleAddStaff}>
                <UserPlus className="w-3.5 h-3.5" />
                Create Profile
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Button variant="accent" onClick={() => setShowForm(true)}>
          <UserPlus className="w-3.5 h-3.5" />
          Add Staff Member
        </Button>
      )}

      {/* Staff & Roles Matrix */}
      <Card title="Staff & Roles Matrix" subtitle="Manage access permissions and channel assignments">
        {/* §Phase D — canonical DataTable: the three inline RBAC controls
            (role / channel / permission tier) stay interactive and usable on a
            phone (labelled cards below md), never clipped or read-only. */}
        <DataTable
          dataTable="staff-roles"
          caption="Staff and roles matrix"
          rows={staff}
          rowKey={(member) => member.id}
          emptyMessage="No staff members yet."
          columns={[
            {
              key: 'name',
              label: 'Name',
              primary: true,
              render: (member) => (
                <span className="text-sm font-medium text-strong">{member.name}</span>
              ),
            },
            {
              key: 'email',
              label: 'Email',
              render: (member) => (
                <span className="font-mono text-xs text-zinc-400">{member.email}</span>
              ),
            },
            {
              key: 'role',
              label: 'Role',
              render: (member) => (
                <select
                  value={member.role}
                  aria-label={`Role for ${member.name}`}
                  onChange={(e) => updateStaffRole(member.id, e.target.value as StaffRole)}
                  className="bg-ink-900 border border-hairline rounded-ds-sm px-2.5 py-1 text-xs text-strong focus:outline-none focus:border-brass-500/40 cursor-pointer"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value} className="bg-ink-900">
                      {r.label}
                    </option>
                  ))}
                </select>
              ),
            },
            {
              key: 'channel',
              label: 'Channel',
              render: (member) => (
                <select
                  value={member.channel}
                  aria-label={`Channel for ${member.name}`}
                  onChange={(e) => updateStaffChannel(member.id, e.target.value)}
                  className="bg-ink-900 border border-hairline rounded-ds-sm px-2.5 py-1 text-xs text-strong focus:outline-none focus:border-brass-500/40 cursor-pointer"
                >
                  {CHANNEL_OPTIONS.map((c) => (
                    <option key={c} value={c} className="bg-ink-900">
                      {c}
                    </option>
                  ))}
                </select>
              ),
            },
            {
              key: 'permissionTier',
              label: 'Permission Tier',
              render: (member) => (
                <select
                  value={member.permissionTier}
                  aria-label={`Permission tier for ${member.name}`}
                  onChange={(e) =>
                    updateStaffTier(member.id, e.target.value as StaffMember['permissionTier'])
                  }
                  className={cn(
                    'bg-ink-900 border rounded-ds-sm px-2.5 py-1 text-xs focus:outline-none cursor-pointer',
                    member.permissionTier === 'full'
                      ? 'border-emerald-500/30 text-emerald-300'
                      : 'border-amber-500/30 text-amber-300'
                  )}
                >
                  <option value="full">Full admin</option>
                  <option value="view_only">View-only ops</option>
                </select>
              ),
            },
            {
              key: 'active',
              label: 'Status',
              align: 'center',
              render: (member) => (
                <Badge
                  className={cn(
                    'text-ds-micro',
                    member.active
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                      : 'bg-zinc-500/15 text-zinc-500 border-zinc-500/20'
                  )}
                >
                  {member.active ? 'Active' : 'Inactive'}
                </Badge>
              ),
            },
            {
              key: 'actions',
              label: 'Actions',
              align: 'right',
              render: (member) => (
                <span className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => toggleStaffActive(member.id)}
                    className="p-1.5 rounded-ds-sm hover:bg-tint text-zinc-500 hover:text-emerald-400 transition-colors"
                    title={member.active ? 'Deactivate' : 'Activate'}
                    aria-label={member.active ? `Deactivate ${member.name}` : `Activate ${member.name}`}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeStaff(member.id)}
                    className="p-1.5 rounded-ds-sm hover:bg-tint text-zinc-500 hover:text-red-400 transition-colors"
                    title="Delete"
                    aria-label={`Delete ${member.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ),
            },
          ]}
        />
      </Card>

        </>
      )}

      {activeTab === 'applications' && (
        <ApplicationsPanel />
      )}

      {activeTab === 'accounting' && (
        <AccountingPanel />
      )}

      {activeTab === 'rakazo' && (
        <RakazoPanel />
      )}

      {activeTab === 'homepage' && (
        <HomepageEditor />
      )}

      {activeTab === 'research' && (
        <ProductResearchSection />
      )}

      {activeTab === 'manufacturer' && (
        <ManufacturerSourcingSection />
      )}

      {activeTab === 'grants' && (
        <GrantsInvestorsSection />
      )}

      {activeTab === 'pitch' && (
        <InvestorPitchSection />
      )}

      {/* §5/M12 — the commercial relationship is a first-class, brand-level concept. */}
      {activeTab === 'commercial' && (
        <CommercialModelsPanel />
      )}

      {activeTab === 'financing' && (
        <BankFinancingSection />
      )}

      {activeTab === 'brandintelligence' && (
        <BrandIntelligencePanel />
      )}

      {activeTab === 'simulation' && (
        <SimulationControl />
      )}

      {activeTab === 'compliance' && (
        <CompliancePanel />
      )}

      {activeTab === 'launch' && <LaunchCentre />}

      {/* §22–§25 (M13 Phase 9) — company + government compliance centre. */}
      {activeTab === 'company' && <CompanyControlCentre />}

      {/* §21 (M13 Phase 8) — Google OAuth + workspace setup wizard. */}
      {activeTab === 'google' && <GoogleSetupWizard />}

      {/* §27/§34 (M13 Phase 10) — operating costs + AI spend controls. */}
      {activeTab === 'costs' && <OperatingCostsPanel />}

      {activeTab === 'designsystem' && (
        <DesignSystemShowcase />
      )}
      </div>
      </WorkspaceGrid>
    </WorkspaceFrame>
  );
}
