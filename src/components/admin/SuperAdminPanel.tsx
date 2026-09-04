import { useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { Card, Badge, Button, Input, Select } from '@/components/ui';
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
} from 'lucide-react';

const SUPER_ADMIN_TABS = [
  { id: 'staff', label: 'Staff & RBAC', icon: Users },
  { id: 'homepage', label: 'Homepage Editor', icon: Layout },
  { id: 'research', label: 'Product Research', icon: Search },
  { id: 'manufacturer', label: 'Manufacturer Sourcing', icon: Factory },
  { id: 'grants', label: 'Grants & Investors', icon: Handshake },
  { id: 'pitch', label: 'Investor Pitch', icon: FileText },
  { id: 'financing', label: 'Bank Financing', icon: PiggyBank },
];
import { EU_MARKET_ENABLED } from '@/config/customs';
import { HomepageEditor } from './HomepageEditor';
import { ProductResearchSection } from './ProductResearchSection';
import { ManufacturerSourcingSection } from './ManufacturerSourcingSection';
import { GrantsInvestorsSection } from './GrantsInvestorsSection';
import { InvestorPitchSection } from './InvestorPitchSection';
import { BankFinancingSection } from './BankFinancingSection';

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'Super Admin', label: 'Super Admin' },
  { value: 'Business Development', label: 'Business Development' },
  { value: 'Logistics Coordinator', label: 'Logistics Coordinator' },
  { value: 'Cross-Border Logistics Lead', label: 'Cross-Border Logistics Lead' },
  { value: 'UK HMRC Compliance Specialist', label: 'UK HMRC Compliance Specialist' },
  { value: 'Harare BAK Depot Lead', label: 'Harare BAK Depot Lead' },
  { value: 'Carrier Integration Manager', label: 'Carrier Integration Manager' },
];

const CHANNEL_OPTIONS = [
  'Global Operations',
  'US Brand Pipeline',
  'EU Brand Pipeline',
  'African Brand Pipeline',
  'UK HMRC Compliance',
  'BAK Logistics Network',
  'DHL Carrier Integration',
  'FedEx Carrier Integration',
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

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Tab navigation */}
      <div className="flex items-center gap-1 flex-wrap bg-ink-850 border border-white/[0.06] rounded-xl p-1">
        {SUPER_ADMIN_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors',
                activeTab === tab.id
                  ? 'bg-brass-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'staff' && (
        <>
          {/* Feature flags — disabled future capabilities */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
              <Globe2 className={cn('w-5 h-5', EU_MARKET_ENABLED ? 'text-emerald-400' : 'text-zinc-600')} />
            </div>
            <div>
              <div className="text-sm font-medium text-white">EU Market Module</div>
              <p className="text-[11px] text-zinc-500 mt-0.5 max-w-md">
                EU distribution capability (CE marking, EU EORI, REACH/GPSR).
                Currently disabled — UK-only operations. Enable when strategy
                expands; the module scaffolding is preserved.
              </p>
            </div>
          </div>
          <Badge className="text-[10px] bg-zinc-500/15 text-zinc-400 border-zinc-500/20">
            {EU_MARKET_ENABLED ? 'Enabled' : 'Disabled — future capability'}
          </Badge>
        </div>
      </Card>

      {/* §Batch-14 — Shipping Markup Config */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-brass-400" />
          <span className="text-xs font-semibold text-white">Shipping Markup Configuration</span>
          <Badge className="text-[9px] bg-amber-500/15 text-amber-300 border-amber-500/20 ml-auto">
            Integrated Logistics Revenue
          </Badge>
        </div>
        <p className="text-[11px] text-zinc-500 mb-3">
          Set the markup percentage applied per carrier. The brand sees the marked-up price
          in the shipping cost estimate. Markup revenue is tracked in the shipping margin ledger.
        </p>
        <div className="space-y-2">
          {demoCarrierMarkup.map((cfg) => (
            <div key={cfg.id} className="flex items-center gap-3 bg-ink-900 rounded-lg p-2.5">
              <Truck className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-white">{cfg.label}</span>
                <span className="text-[10px] text-zinc-600 ml-2">
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
                  onChange={(e) => {
                    const val = Number(e.target.value) / 100;
                    updateCarrierMarkup(cfg.id, { markupValue: val });
                    // Force re-render
                    setMarkupVersion((v) => v + 1);
                  }}
                  className="w-20 bg-ink-850 border border-white/[0.08] rounded px-2 py-1 text-xs text-white text-right font-mono focus:outline-none focus:border-brass-500/40"
                />
                <span className="text-[10px] text-zinc-500 w-4">%</span>
                <button
                  onClick={() => {
                    updateCarrierMarkup(cfg.id, { active: !cfg.active });
                    setMarkupVersion((v) => v + 1);
                  }}
                  className={cn(
                    'p-1 rounded text-[10px] border transition-colors',
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

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-crimson-accent/15 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Super Admin Panel — Tadii</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Master control matrix — staff, roles & channel assignments
          </p>
        </div>
      </div>

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
            className="bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-1.5 text-xs text-white cursor-pointer"
          >
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role}) — {s.permissionTier === 'full' ? 'Full admin' : 'View-only ops'}
              </option>
            ))}
          </select>
          <Badge
            className={cn(
              'text-[10px]',
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
          <div className="text-2xl font-bold text-white">{staff.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Power className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs text-zinc-500 font-medium">Active</span>
          </div>
          <div className="text-2xl font-bold text-white">{activeCount}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs text-zinc-500 font-medium">Channels</span>
          </div>
          <div className="text-2xl font-bold text-white">{CHANNEL_OPTIONS.length}</div>
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
              <Button onClick={handleAddStaff}>
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
        <Button onClick={() => setShowForm(true)}>
          <UserPlus className="w-3.5 h-3.5" />
          Add Staff Member
        </Button>
      )}

      {/* Staff & Roles Matrix */}
      <Card title="Staff & Roles Matrix" subtitle="Manage access permissions and channel assignments">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-zinc-500">
                <th className="text-left font-medium px-5 py-3">Name</th>
                <th className="text-left font-medium px-4 py-3">Email</th>
                <th className="text-left font-medium px-4 py-3">Role</th>
                <th className="text-left font-medium px-4 py-3">Channel</th>
                <th className="text-left font-medium px-4 py-3">Permission Tier</th>
                <th className="text-center font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="text-sm font-medium text-white">{member.name}</div>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono text-zinc-400">{member.email}</td>
                  <td className="px-4 py-3.5">
                    <select
                      value={member.role}
                      onChange={(e) => updateStaffRole(member.id, e.target.value as StaffRole)}
                      className="bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brass-500/40 cursor-pointer"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value} className="bg-ink-900">
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={member.channel}
                      onChange={(e) => updateStaffChannel(member.id, e.target.value)}
                      className="bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:border-brass-500/40 cursor-pointer"
                    >
                      {CHANNEL_OPTIONS.map((c) => (
                        <option key={c} value={c} className="bg-ink-900">
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  {/* §Stage-25 — RBAC permission tier: full vs view-only ops. */}
                  <td className="px-4 py-3.5">
                    <select
                      value={member.permissionTier}
                      onChange={(e) =>
                        updateStaffTier(member.id, e.target.value as StaffMember['permissionTier'])
                      }
                      className={cn(
                        'bg-ink-900 border rounded-md px-2.5 py-1 text-xs focus:outline-none cursor-pointer',
                        member.permissionTier === 'full'
                          ? 'border-emerald-500/30 text-emerald-300'
                          : 'border-amber-500/30 text-amber-300'
                      )}
                    >
                      <option value="full">Full admin</option>
                      <option value="view_only">View-only ops</option>
                    </select>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <Badge
                      className={cn(
                        'text-[10px]',
                        member.active
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                          : 'bg-zinc-500/15 text-zinc-500 border-zinc-500/20'
                      )}
                    >
                      {member.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleStaffActive(member.id)}
                        className="p-1.5 rounded-md hover:bg-white/[0.06] text-zinc-500 hover:text-emerald-400 transition-colors"
                        title={member.active ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeStaff(member.id)}
                        className="p-1.5 rounded-md hover:bg-white/[0.06] text-zinc-500 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

        </>
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

      {activeTab === 'financing' && (
        <BankFinancingSection />
      )}
    </div>
  );
}
