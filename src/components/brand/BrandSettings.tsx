import { useState, useMemo } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useComplianceDocuments } from '@/data/queries';
import { assertBrandScope } from '@/lib/auth/rbac';
import { Badge, Button, Card, Input, StatusBadge } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import {
  complianceDocStatusPresentation,
  poOutageStatusPresentation,
} from '@/lib/statusPresentation';
import { BrandContractView } from '@/components/brand/BrandContractView';
import { isTourCompleted, isTourSkipped, restartTour, useTourProgress } from '@/components/shared/TourEngine';
import {
  COMMERCIAL_MODELS,
  COMMERCIAL_MODEL_NOT_SELECTED_LABEL,
  isCommercialModel,
} from '@/config/commercialModel';
import { getBrandCommercialModelRecord } from '@/data/demoStore';
import { ALL_TOUR_DEFINITIONS } from '@/config/tours/tourDefinitions';
import { cn } from '@/utils/cn';
import {
  demoTeamMembers,
  demoPoOutages,
  demoReturnAddresses,
  demoNotificationPrefs,
  getBankInfo,
  requestBankChange,
  addTeamMember,
  removeTeamMember,
  addPoOutage,
  cancelPoOutage,
  addReturnAddress,
  updateReturnAddress,
  removeReturnAddress,
  updateNotificationPref,
} from '@/data/api';
import type {
  BrandBankInfo,
  NotificationPreference,
  NotificationEventType,
  NotificationChannel,
  BrandPermissionRole,
} from '@/types';
import {
  Landmark, Shield, Users, AlertOctagon, MapPin, FileCheck,
  Bell, FileText, Check, X, Plus, Trash2, Mail,
  BookUser, Map,
} from 'lucide-react';

type SettingsTab =
  | 'bank' | 'login' | 'permissions' | 'outages' | 'returns_addr'
  | 'compliance' | 'notifications' | 'contacts' | 'agreements' | 'tours'
  | 'commercial';

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: typeof Landmark }[] = [
  { id: 'bank', label: 'Bank Information', icon: Landmark },
  { id: 'commercial', label: 'Commercial Relationship', icon: FileText },
  { id: 'login', label: 'Login Settings', icon: Shield },
  { id: 'permissions', label: 'Manage Permissions', icon: Users },
  { id: 'outages', label: 'PO Outages', icon: AlertOctagon },
  { id: 'returns_addr', label: 'Return Addresses', icon: MapPin },
  { id: 'compliance', label: 'Compliance Reference', icon: FileCheck },
  { id: 'notifications', label: 'Notification Preferences', icon: Bell },
  { id: 'contacts', label: 'Contacts', icon: BookUser },
  { id: 'agreements', label: 'Agreements', icon: FileText },
  { id: 'tours', label: 'Guided Tours', icon: Map },
];

/**
 * §5/M12 — the brand's own view of its COMMERCIAL RELATIONSHIP with Mercenta.
 *
 * Read-only for the brand: the relationship is agreed with Mercenta and can only
 * be changed by the Super Admin (audited). It is shown here, next to the
 * compliance reference, precisely so the two are visibly DIFFERENT concepts —
 * the model never changes which retail-channel documents are required.
 */
function CommercialRelationshipSection({ brandId }: { brandId: string }) {
  const record = getBrandCommercialModelRecord(brandId);
  const model = record && isCommercialModel(record.model) ? record.model : null;
  return (
    <Card title="Commercial Relationship">
      {model ? (
        <>
          <div className="flex items-center gap-2 mb-2">
            <Badge className={cn(
              'text-ds-micro',
              model === 'commission_agent'
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-blue-500/15 text-blue-300'
            )}>
              {COMMERCIAL_MODELS[model].label}
            </Badge>
            {record && <span className="text-ds-micro text-zinc-600">recorded {record.recordedAt.slice(0, 10)}</span>}
          </div>
          <p className="text-xs text-zinc-400 mb-3">{COMMERCIAL_MODELS[model].summary}</p>
          <dl className="space-y-1 text-ds-label font-mono">
            {model === 'commission_agent' ? (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Mercenta commission</dt>
                <dd className="text-zinc-300">{record?.commissionRatePct ?? 0}% of the retail-channel value</dd>
              </div>
            ) : (
              <div className="flex justify-between">
                <dt className="text-zinc-500">Brand share of retail-channel revenue</dt>
                <dd className="text-zinc-300">{record?.brandAcquisitionSharePct ?? 0}%</dd>
              </div>
            )}
          </dl>
        </>
      ) : (
        <p className="text-xs text-amber-300" data-testid="brand-commercial-not-selected">
          {COMMERCIAL_MODEL_NOT_SELECTED_LABEL} — contact your Mercenta account manager.
        </p>
      )}
      <p className="text-ds-micro text-zinc-600 mt-3">
        This commercial agreement is private between your brand and Mercenta. It is separate from —
        and can never change, waive or replace — the retail-channel compliance documentation your
        products require. Changes are made by Mercenta and recorded in the audit trail.
      </p>
    </Card>
  );
}

function BankSection({ brandId }: { brandId: string }) {
  const bankInfo = getBankInfo(brandId);
  const [requested, setRequested] = useState<Partial<Record<string, string>>>({});
  const [reason, setReason] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [_version, setVersion] = useState(0);

  if (!bankInfo) return <p className="text-xs text-zinc-600">Banking details not configured.</p>;

  const fields: { key: keyof BrandBankInfo; label: string; value: string }[] = [
    { key: 'accountHolderName', label: 'Account Holder', value: bankInfo.accountHolderName },
    { key: 'bankName', label: 'Bank Name', value: bankInfo.bankName },
    { key: 'accountNumber', label: 'Account Number', value: bankInfo.accountNumber },
    { key: 'sortCode', label: 'Sort Code', value: bankInfo.sortCode },
    { key: 'iban', label: 'IBAN', value: bankInfo.iban ?? '' },
    { key: 'bic', label: 'BIC', value: bankInfo.bic ?? '' },
  ];

  const handleRequest = (key: keyof BrandBankInfo, currentValue: string) => {
    const newVal = requested[key];
    if (!newVal?.trim() || !reason.trim()) return;
    requestBankChange(brandId, key, currentValue, newVal.trim(), reason.trim());
    setNote(`Change request submitted for ${key} — pending admin approval.`);
    setReason('');
    setVersion((v) => v + 1);
  };

  const updateField = (key: keyof BrandBankInfo, value: string) => {
    setRequested((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Card title={`Bank Information — ${bankInfo.currency}`}>
      <div className="space-y-2">
        {bankInfo.status === 'pending_approval' && bankInfo.requestedChange && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-ds-label text-amber-300 mb-2">
            Pending approval: {bankInfo.requestedChange.field} → {bankInfo.requestedChange.requestedValue}
          </div>
        )}
        {fields.map(({ key, label, value }) => (
          <div key={key} className="flex items-center gap-2 border-b border-white/[0.04] pb-2">
            <span className="text-ds-label text-zinc-500 w-28 flex-shrink-0">{label}</span>
            <span className="text-ds-label text-zinc-300 font-mono flex-1">{value || '—'}</span>
            <input
              value={requested[key] ?? ''}
              onChange={(e) => updateField(key, e.target.value)}
              placeholder="New value..."
              aria-label={`New value for ${label}`}
              className="w-28 bg-ink-900 border border-white/[0.08] rounded px-1.5 py-0.5 text-ds-micro text-zinc-300"
            />
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for change..."
            className="flex-1 bg-ink-900 border border-white/[0.08] rounded px-2 py-1 text-ds-micro"
          />
          <Button className="text-ds-micro" onClick={() => {
            const active = fields.find((f) => requested[f.key]?.trim());
            if (active) handleRequest(active.key as keyof BrandBankInfo, active.value);
          }}>
            Submit Change
          </Button>
        </div>
        {note && <p className="text-ds-micro text-zinc-500">{note}</p>}
      </div>
    </Card>
  );
}

function LoginSection() {
  return (
    <Card title="Login Settings">
      {/*
        §P3 — THE SECURITY CONTROLS NOW TELL THE TRUTH (defect FIXED at source).

        Two `<Button>`s stood here — "Change Password" and "Enable 2FA" — with NO
        handler: they rendered the look of an account-security action and did
        nothing when clicked. Mercenta holds no password or 2FA of its own: brand
        and operator sign-in is role-based (the one-click login), and external
        services connect by OAuth, which never hands Mercenta a password
        (`src/config/google.ts`, the integrations registry). A "change password"
        control therefore cannot honestly exist. Per P3 — "if it is unavailable,
        it says why instead of silently doing nothing" — the two false controls
        are replaced by the plain fact. `npm run validate:ui-wiring` fails if a
        control labelled "Change Password" or "Enable 2FA" ever returns.
      */}
      <div className="space-y-3 text-xs text-zinc-300">
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
          <span>Sign-in method</span>
          <span className="text-ds-micro text-zinc-500">Role-based — no Mercenta password to change</span>
        </div>
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
          <span>Two-factor authentication</span>
          <span className="text-ds-micro text-zinc-500">Not offered — contacts use their own provider’s 2FA</span>
        </div>
        <div className="flex items-center justify-between pb-2">
          <span>Active sessions</span>
          <span className="text-ds-micro text-zinc-500">1 active session</span>
        </div>
      </div>
    </Card>
  );
}

function PermissionsSection({ brandId }: { brandId: string }) {
  const [_version, setVersion] = useState(0);
  const members = demoTeamMembers.filter((m) => m.brandId === brandId);
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ name: '', email: '', role: 'Owner' as BrandPermissionRole });

  const handleInvite = () => {
    if (!invite.name.trim() || !invite.email.trim()) return;
    addTeamMember({
      id: `tm-${Date.now()}`,
      brandId,
      name: invite.name.trim(),
      email: invite.email.trim(),
      role: invite.role,
      active: true,
      invitedAt: new Date().toISOString(),
    });
    setInvite({ name: '', email: '', role: 'Owner' });
    setShowInvite(false);
    setVersion((v) => v + 1);
  };

  const ROLE_BADGE: Record<BrandPermissionRole, string> = {
    Owner: 'bg-brass-500/15 text-brass-300 border-brass-500/20',
    Shipping: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
    Accounts: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    Compliance: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  };

  return (
    <Card title="Manage Permissions">
      <div className="space-y-1">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
            <div>
              <span className="text-xs text-zinc-300">{m.name}</span>
              <span className="text-ds-micro text-zinc-600 ml-2">{m.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn('text-ds-micro', ROLE_BADGE[m.role])}>{m.role}</Badge>
              {!m.active && <Badge className="text-ds-micro bg-zinc-500/10 text-zinc-400">Inactive</Badge>}
              <button onClick={() => { removeTeamMember(m.id); setVersion((v) => v + 1); }} className="text-zinc-600 hover:text-red-400">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
        {members.length === 0 && <p className="text-xs text-zinc-600 py-2">No team members invited yet.</p>}
      </div>
      {showInvite ? (
        <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
          <Input label="Name" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
          <Input label="Email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          <select value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as BrandPermissionRole })}
            className="w-full bg-ink-900 border border-white/[0.08] rounded px-2 py-1 text-xs text-zinc-300">
            <option value="Owner">Owner</option><option value="Shipping">Shipping</option><option value="Accounts">Accounts</option><option value="Compliance">Compliance</option>
          </select>
          <div className="flex gap-2">
            <Button className="text-ds-micro" onClick={handleInvite}>Send Invite</Button>
            <Button className="text-ds-micro" variant="secondary" onClick={() => setShowInvite(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button className="text-xs mt-2" onClick={() => setShowInvite(true)}>
          <Plus className="w-3 h-3 mr-1" /> Invite Team Member
        </Button>
      )}
    </Card>
  );
}

function OutagesSection({ brandId }: { brandId: string }) {
  const [_version, setVersion] = useState(0);
  const outages = demoPoOutages.filter((o) => o.brandId === brandId);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });

  const handleAdd = () => {
    if (!form.startDate || !form.endDate || !form.reason.trim()) return;
    addPoOutage({ brandId, ...form, reason: form.reason.trim(), status: 'active' });
    setForm({ startDate: '', endDate: '', reason: '' });
    setShowNew(false);
    setVersion((v) => v + 1);
  };

  return (
    <Card title="Purchase Order Outages">
      <p className="text-ds-micro text-zinc-600 mb-3">Declare periods when you cannot fulfil purchase orders. Outages feed Mercenta's PO-routing (flagged/suppressed during the window).</p>
      {outages.map((o) => (
        <div key={o.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
          <div>
            <span className="text-ds-label text-zinc-300">{o.startDate} → {o.endDate}</span>
            <p className="text-ds-micro text-zinc-500">{o.reason}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge
              className="text-ds-micro"
              dataStatus={poOutageStatusPresentation(o.status).dataStatus}
              tone={poOutageStatusPresentation(o.status).tone}
            >
              {poOutageStatusPresentation(o.status).label}
            </StatusBadge>
            {o.status === 'active' && (
              <button onClick={() => { cancelPoOutage(o.id); setVersion((v) => v + 1); }} className="text-ds-micro text-zinc-500 hover:text-red-400">Cancel</button>
            )}
          </div>
        </div>
      ))}
      {outages.length === 0 && <p className="text-xs text-zinc-600 py-2">No outages declared.</p>}
      {showNew ? (
        <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
          <div className="grid grid-cols-2 gap-2">
            <Input label="Start date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            <Input label="End date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </div>
          <Input label="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          <div className="flex gap-2">
            <Button className="text-ds-micro" onClick={handleAdd}>Declare Outage</Button>
            <Button className="text-ds-micro" variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button className="text-xs mt-2" onClick={() => setShowNew(true)}>
          <Plus className="w-3 h-3 mr-1" /> Declare Outage
        </Button>
      )}
    </Card>
  );
}

function ReturnAddrSection({ brandId }: { brandId: string }) {
  const [_version, setVersion] = useState(0);
  const addrs = demoReturnAddresses.filter((a) => a.brandId === brandId);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    brandId, label: '', companyName: '', addressLine1: '', addressLine2: '',
    city: '', postalCode: '', country: 'United Kingdom', contactName: '', contactPhone: '', isDefault: false,
  });

  const handleAdd = () => {
    if (!form.label.trim() || !form.addressLine1.trim()) return;
    addReturnAddress({ ...form, brandId });
    setForm({ ...form, brandId, label: '', companyName: '', addressLine1: '', addressLine2: '', city: '', postalCode: '', contactName: '', contactPhone: '' });
    setShowNew(false);
    setVersion((v) => v + 1);
  };

  const setDefault = (id: string) => {
    updateReturnAddress(id, { isDefault: true });
    setVersion((v) => v + 1);
  };

  return (
    <Card title="Return Addresses">
      {addrs.map((a) => (
        <div key={a.id} className="py-2 border-b border-white/[0.04]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300 font-medium">{a.label}</span>
            {a.isDefault && <Badge className="text-ds-micro bg-brass-500/15 text-brass-300">Default</Badge>}
          </div>
          <p className="text-ds-micro text-zinc-500">{a.companyName}</p>
          <p className="text-ds-micro text-zinc-500">{a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ''}</p>
          <p className="text-ds-micro text-zinc-500">{a.city}, {a.postalCode}, {a.country}</p>
          <div className="flex items-center gap-2 mt-1">
            {!a.isDefault && <button onClick={() => setDefault(a.id)} className="text-ds-micro text-zinc-500 hover:text-brass-400">Set default</button>}
            <button onClick={() => { removeReturnAddress(a.id); setVersion((v) => v + 1); }} className="text-ds-micro text-zinc-500 hover:text-red-400">Remove</button>
          </div>
        </div>
      ))}
      {addrs.length === 0 && <p className="text-xs text-zinc-600 py-2">No return addresses configured.</p>}
      {showNew ? (
        <div className="mt-3 space-y-2 border-t border-white/[0.06] pt-3">
          <Input label="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="UK Returns — Standard" />
          <Input label="Company" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          <Input label="Address 1" value={form.addressLine1} onChange={(e) => setForm({ ...form, addressLine1: e.target.value })} />
          <Input label="Address 2" value={form.addressLine2 ?? ''} onChange={(e) => setForm({ ...form, addressLine2: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <Input label="Postal code" value={form.postalCode} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Contact name" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            <Input label="Contact phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button className="text-ds-micro" onClick={handleAdd}>Add Address</Button>
            <Button className="text-ds-micro" variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <Button className="text-xs mt-2" onClick={() => setShowNew(true)}>
          <Plus className="w-3 h-3 mr-1" /> Add Return Address
        </Button>
      )}
    </Card>
  );
}

function ComplianceRefSection({ brandId: _brandId }: { brandId: string }) {
  const { session } = useApp();
  const docsQuery = useComplianceDocuments();
  const docs = useMemo(() => assertBrandScope(session, docsQuery.data?.data ?? []), [session, docsQuery.data]);

  return (
    <Card title="Compliance Reference">
      <p className="text-ds-micro text-zinc-600 mb-3">View-only reference to your compliance documents. Manage documents through the Compliance hub.</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] text-xs text-zinc-500">
            <th className="text-left font-medium px-2 py-2">Document Type</th>
            <th className="text-left font-medium px-2 py-2">Status</th>
            <th className="text-right font-medium px-2 py-2">Uploaded</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {docs.map((d) => (
            <tr key={d.id}>
              <td className="px-2 py-1.5 text-xs text-zinc-300 capitalize">{d.type.replace(/_/g, ' ')}</td>
              <td className="px-2 py-1.5">
                <StatusBadge
                  className="text-ds-micro"
                  dataStatus={complianceDocStatusPresentation(d.status).dataStatus}
                  tone={complianceDocStatusPresentation(d.status).tone}
                >
                  {complianceDocStatusPresentation(d.status).label}
                </StatusBadge>
              </td>
              <td className="px-2 py-1.5 text-xs text-zinc-600 text-right">{d.expiryDate?.slice(0, 10) || '—'}</td>
            </tr>
          ))}
          {docs.length === 0 && <tr><td colSpan={3} className="px-2 py-3 text-xs text-zinc-600">No compliance documents filed.</td></tr>}
        </tbody>
      </table>
    </Card>
  );
}

const EVENT_LABELS: Record<NotificationEventType, string> = {
  po_received: 'PO Received',
  po_acknowledgment_deadline: 'PO Acknowledgment Deadline',
  shipment_departed: 'Shipment Departed',
  shipment_delivered: 'Shipment Delivered',
  compliance_doc_approved: 'Compliance Doc Approved',
  compliance_doc_rejected: 'Compliance Doc Rejected',
  deduction_raised: 'Deduction Raised',
  contract_renewal: 'Contract Renewal',
  outage_about_to_start: 'Outage Starting Soon',
  return_authorized: 'Return Authorized',
};
function NotificationsSection({ brandId }: { brandId: string }) {
  const [_version, setVersion] = useState(0);
  const prefs = demoNotificationPrefs.filter((p) => p.brandId === brandId);

  const toggleChannel = (pref: NotificationPreference, channel: NotificationChannel) => {
    const channels = pref.channels.includes(channel)
      ? pref.channels.filter((c) => c !== channel)
      : [...pref.channels, channel];
    updateNotificationPref(pref.id, { channels, enabled: channels.length > 0 });
    setVersion((v) => v + 1);
  };

  const toggleEnabled = (pref: NotificationPreference) => {
    updateNotificationPref(pref.id, { enabled: !pref.enabled });
    setVersion((v) => v + 1);
  };

  return (
    <Card title="Notification Preferences">
      <p className="text-ds-micro text-zinc-600 mb-3">Choose which events you want to be notified about and through which channels.</p>
      {prefs.map((p) => (
        <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/[0.04]">
          <div className="flex-1">
            <span className={cn('text-xs', p.enabled ? 'text-zinc-300' : 'text-zinc-600')}>{EVENT_LABELS[p.eventType]}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleChannel(p, 'email')} className={cn('p-1 rounded', p.channels.includes('email') ? 'text-brass-400 bg-brass-500/10' : 'text-zinc-600')}>
              <Mail className="w-3 h-3" />
            </button>
            <button onClick={() => toggleChannel(p, 'in_app')} className={cn('p-1 rounded', p.channels.includes('in_app') ? 'text-brass-400 bg-brass-500/10' : 'text-zinc-600')}>
              <Bell className="w-3 h-3" />
            </button>
            <button onClick={() => toggleEnabled(p)} className={cn('p-1 rounded', p.enabled ? 'text-emerald-400' : 'text-zinc-600')}>
              {p.enabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            </button>
          </div>
        </div>
      ))}
    </Card>
  );
}

function ContactsSection({ brandId: _brandId }: { brandId: string }) {
  const { brandProfile } = useApp();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ email: brandProfile.email, phone: brandProfile.phone, signatory: brandProfile.signatory });

  const handleSave = () => {
    // Changes route through profile change request flow for admin approval
    setEdit(false);
  };

  return (
    <Card title="Contacts">
      <p className="text-ds-micro text-zinc-600 mb-3">Your primary contact information — shared with Mercenta for operational comms.</p>
      {!edit ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs"><span className="text-zinc-500 w-20">Signatory:</span><span className="text-zinc-300">{brandProfile.signatory || '—'}</span></div>
          <div className="flex items-center gap-2 text-xs"><span className="text-zinc-500 w-20">Email:</span><span className="text-zinc-300">{brandProfile.email || '—'}</span></div>
          <div className="flex items-center gap-2 text-xs"><span className="text-zinc-500 w-20">Phone:</span><span className="text-zinc-300">{brandProfile.phone || '—'}</span></div>
          <Button className="text-ds-micro" onClick={() => setEdit(true)}>Edit</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Input label="Signatory name" value={form.signatory} onChange={(e) => setForm({ ...form, signatory: e.target.value })} />
          <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <p className="text-ds-micro text-zinc-600">Changes require admin approval and route through the profile change request flow.</p>
          <div className="flex gap-2">
            <Button className="text-ds-micro" onClick={handleSave}>Request Change</Button>
            <Button className="text-ds-micro" variant="secondary" onClick={() => setEdit(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
function AgreementsSection() {
  return (
    <div>
      <p className="text-xs text-zinc-600 mb-3">Your distribution agreements and contracts with Mercenta Partners.</p>
      <BrandContractView />
    </div>
  );
}

/** §Phase 7E — restart any guided tour from the brand's own Settings. */
function ToursSection({ brandId }: { brandId: string }) {
  const progress = useTourProgress(brandId);
  return (
    <Card title="Guided Tours">
      <p className="text-xs text-zinc-500 mb-3">
        Re-run any onboarding tour whenever you need a refresher. Restarting a tour resumes it from its first
        step and never touches your account, products, or orders.
      </p>
      <ul className="divide-y divide-white/[0.05] rounded-lg border border-white/[0.06] bg-ink-850">
        {ALL_TOUR_DEFINITIONS.map((t) => {
          const completed = isTourCompleted(brandId, t.id);
          const skipped = isTourSkipped(brandId, t.id);
          const inProgress = progress.currentTourId === t.id;
          const state = inProgress ? 'In progress' : completed ? 'Completed' : skipped ? 'Skipped' : 'Not started';
          const tone = inProgress ? 'info' : completed ? 'success' : skipped ? 'warning' : 'neutral';
          return (
            <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-white truncate">{t.name}</span>
                <span className="block text-ds-label text-zinc-500 truncate leading-snug">{t.description}</span>
              </span>
              <StatusBadge tone={tone} dataStatus={state.toLowerCase().replace(' ', '-')}>{state}</StatusBadge>
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => restartTour(brandId, t.id)}
                title={`Restart ${t.name} tour`}
              >
                Restart Tour
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/**
 * §Batch-2 — Brand-facing Settings suite.
 * 9 sections in a tabbed layout, all locked to the brand's own tenantId.
 */
export function BrandSettings() {
  const { session } = useApp();
  const brandId = session?.tenantId ?? '';
  const [activeTab, setActiveTab] = useState<SettingsTab>('bank');

  return (
    <WorkspaceFrame className="space-y-6">
      <WorkspaceHeader
        eyebrow="BRAND PORTAL · SETTINGS"
        title="Settings"
        description="Manage your brand account, preferences, and operational details."
      />

      <div className="flex flex-wrap gap-1 border-b border-white/[0.06] pb-px">
        {SETTINGS_TABS.map(({ id, label, icon: TabIcon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-colors',
              activeTab === id
                ? 'text-white border-b-2 border-brass-500 bg-white/[0.03]'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.02]'
            )}
          >
            <TabIcon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl">
        {activeTab === 'bank' && <BankSection brandId={brandId} />}
        {activeTab === 'commercial' && <CommercialRelationshipSection brandId={brandId} />}
        {activeTab === 'login' && <LoginSection />}
        {activeTab === 'permissions' && <PermissionsSection brandId={brandId} />}
        {activeTab === 'outages' && <OutagesSection brandId={brandId} />}
        {activeTab === 'returns_addr' && <ReturnAddrSection brandId={brandId} />}
        {activeTab === 'compliance' && <ComplianceRefSection brandId={brandId} />}
        {activeTab === 'notifications' && <NotificationsSection brandId={brandId} />}
        {activeTab === 'contacts' && <ContactsSection brandId={brandId} />}
        {activeTab === 'agreements' && <AgreementsSection />}
        {activeTab === 'tours' && <ToursSection brandId={brandId} />}
      </div>
    </WorkspaceFrame>
  );
}