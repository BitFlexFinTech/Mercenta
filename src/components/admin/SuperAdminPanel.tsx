import { useState } from 'react';
import { Card, Badge, Button, Input, Select } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { StaffMember, StaffRole } from '@/types';
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Power,
  Users,
} from 'lucide-react';

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'Super Admin', label: 'Super Admin' },
  { value: 'Business Development', label: 'Business Development' },
  { value: 'Logistics Coordinator', label: 'Logistics Coordinator' },
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

const INITIAL_STAFF: StaffMember[] = [
  {
    id: 'staff-001',
    name: 'Dave Anderson',
    email: 'dave@boxbee.com',
    role: 'Super Admin',
    channel: 'Global Operations',
    active: true,
  },
  {
    id: 'staff-002',
    name: 'Sarah Chen',
    email: 'sarah@boxbee.com',
    role: 'Business Development',
    channel: 'US Brand Pipeline',
    active: true,
  },
  {
    id: 'staff-003',
    name: 'Klaus Bauer',
    email: 'klaus@boxbee.com',
    role: 'Logistics Coordinator',
    channel: 'EU Brand Pipeline',
    active: true,
  },
  {
    id: 'staff-004',
    name: 'Farai Chari',
    email: 'farai@boxbee.com',
    role: 'Harare BAK Depot Lead',
    channel: 'BAK Logistics Network',
    active: true,
  },
  {
    id: 'staff-005',
    name: 'Emily Watson',
    email: 'emily@boxbee.com',
    role: 'UK HMRC Compliance Specialist',
    channel: 'UK HMRC Compliance',
    active: false,
  },
];

export function SuperAdminPanel() {
  const [staff, setStaff] = useState<StaffMember[]>(INITIAL_STAFF);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<StaffRole>('Business Development');
  const [newChannel, setNewChannel] = useState('Global Operations');

  const addStaff = () => {
    if (!newName || !newEmail) return;
    const member: StaffMember = {
      id: `staff-${String(staff.length + 1).padStart(3, '0')}`,
      name: newName,
      email: newEmail,
      role: newRole,
      channel: newChannel,
      active: true,
    };
    setStaff([...staff, member]);
    setNewName('');
    setNewEmail('');
    setShowForm(false);
  };

  const toggleActive = (id: string) =>
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );

  const deleteStaff = (id: string) =>
    setStaff((prev) => prev.filter((s) => s.id !== id));

  const updateRole = (id: string, role: StaffRole) =>
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, role } : s))
    );

  const updateChannel = (id: string, channel: string) =>
    setStaff((prev) =>
      prev.map((s) => (s.id === id ? { ...s, channel } : s))
    );

  const activeCount = staff.filter((s) => s.active).length;

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-crimson-accent/15 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Super Admin Panel</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Master control matrix — staff, roles & channel assignments
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-3.5 h-3.5 text-neon-400" />
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
                placeholder="name@boxbee.com"
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
              <Button onClick={addStaff}>
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
                      onChange={(e) => updateRole(member.id, e.target.value as StaffRole)}
                      className="bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:border-neon-500/40 cursor-pointer"
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
                      onChange={(e) => updateChannel(member.id, e.target.value)}
                      className="bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:border-neon-500/40 cursor-pointer"
                    >
                      {CHANNEL_OPTIONS.map((c) => (
                        <option key={c} value={c} className="bg-ink-900">
                          {c}
                        </option>
                      ))}
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
                        onClick={() => toggleActive(member.id)}
                        className="p-1.5 rounded-md hover:bg-white/[0.06] text-zinc-500 hover:text-emerald-400 transition-colors"
                        title={member.active ? 'Deactivate' : 'Activate'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteStaff(member.id)}
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
    </div>
  );
}
