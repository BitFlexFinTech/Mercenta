import { useState } from 'react';
import {
  AlertOctagon,
  Bell,
  BookUser,
  Check,
  FileCheck,
  FileText,
  Landmark,
  Mail,
  Map,
  MapPin,
  Plus,
  Shield,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  ConsoleTable,
  InlineStatus,
  PageHeader,
  type ConsoleColumn,
} from '@/next/components/ConsolePrimitives';
import { NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';
import {
  COMMERCIAL_MODELS,
  COMMERCIAL_MODEL_NOT_SELECTED_LABEL,
  isCommercialModel,
} from '@/config/commercialModel';
import {
  complianceDocStatusPresentation,
  poOutageStatusPresentation,
} from '@/lib/statusPresentation';
import type {
  BrandBankInfo,
  BrandPermissionRole,
  BrandProfile,
  BrandTeamMember,
  ComplianceDocument,
  Contract,
  NotificationChannel,
  NotificationEventType,
  NotificationPreference,
  BrandPoOutage,
  BrandReturnAddress,
} from '@/types';

export type BrandSettingsTab =
  | 'bank'
  | 'commercial'
  | 'login'
  | 'permissions'
  | 'outages'
  | 'returns_addr'
  | 'compliance'
  | 'notifications'
  | 'contacts'
  | 'agreements'
  | 'tours';

export interface TourRow {
  id: string;
  name: string;
  description: string;
  state: 'In progress' | 'Completed' | 'Skipped' | 'Not started';
  tone: 'info' | 'success' | 'warning' | 'neutral';
}

export interface BrandSettingsViewProps {
  brandProfile: BrandProfile;
  bankInfo: BrandBankInfo | null;
  commercialRecord: {
    model: string;
    recordedAt: string;
    commissionRatePct?: number;
    brandAcquisitionSharePct?: number;
  } | null;
  teamMembers: BrandTeamMember[];
  outages: BrandPoOutage[];
  returnAddresses: BrandReturnAddress[];
  complianceDocs: ComplianceDocument[];
  notificationPrefs: NotificationPreference[];
  contracts: Contract[];
  tours: TourRow[];
  onRequestBankChange: (
    field: keyof BrandBankInfo,
    currentValue: string,
    newValue: string,
    reason: string
  ) => void;
  onAddTeamMember: (name: string, email: string, role: BrandPermissionRole) => void;
  onRemoveTeamMember: (memberId: string) => void;
  onAddOutage: (startDate: string, endDate: string, reason: string) => void;
  onCancelOutage: (outageId: string) => void;
  onAddReturnAddress: (addr: Omit<BrandReturnAddress, 'id'>) => void;
  onSetDefaultReturnAddress: (addrId: string) => void;
  onRemoveReturnAddress: (addrId: string) => void;
  onToggleNotificationChannel: (
    pref: NotificationPreference,
    channel: NotificationChannel
  ) => void;
  onToggleNotificationEnabled: (pref: NotificationPreference) => void;
  onRestartTour: (tourId: string) => void;
  onRequestProfileChange?: (note: string) => void;
  onOpenContracts?: () => void;
}

const SETTINGS_TABS: { id: BrandSettingsTab; label: string; icon: typeof Landmark }[] = [
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

export function BrandSettingsView({
  brandProfile,
  bankInfo,
  commercialRecord,
  teamMembers,
  outages,
  returnAddresses,
  complianceDocs,
  notificationPrefs,
  contracts,
  tours,
  onRequestBankChange,
  onAddTeamMember,
  onRemoveTeamMember,
  onAddOutage,
  onCancelOutage,
  onAddReturnAddress,
  onSetDefaultReturnAddress,
  onRemoveReturnAddress,
  onToggleNotificationChannel,
  onToggleNotificationEnabled,
  onRestartTour,
  onRequestProfileChange,
  onOpenContracts,
}: BrandSettingsViewProps) {
  const [activeTab, setActiveTab] = useState<BrandSettingsTab>('bank');

  // Bank change form state
  const [bankRequested, setBankRequested] = useState<Partial<Record<string, string>>>({});
  const [bankReason, setBankReason] = useState('');
  const [bankNote, setBankNote] = useState<string | null>(null);

  // Team permissions form state
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({
    name: '',
    email: '',
    role: 'Owner' as BrandPermissionRole,
  });

  // Outage form state
  const [showNewOutage, setShowNewOutage] = useState(false);
  const [outageForm, setOutageForm] = useState({ startDate: '', endDate: '', reason: '' });

  // Return address form state
  const [showNewAddr, setShowNewAddr] = useState(false);
  const [addrForm, setAddrForm] = useState({
    label: '',
    companyName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    country: 'United Kingdom',
    contactName: '',
    contactPhone: '',
  });

  // Contacts change request form
  const [editingContacts, setEditingContacts] = useState(false);
  const [contactForm, setContactForm] = useState({
    signatory: brandProfile.signatory,
    email: brandProfile.email,
    phone: brandProfile.phone,
  });
  const [contactNotice, setContactNotice] = useState<string | null>(null);

  const bankFields: { key: keyof BrandBankInfo; label: string; value: string }[] = bankInfo
    ? [
        { key: 'accountHolderName', label: 'Account Holder', value: bankInfo.accountHolderName },
        { key: 'bankName', label: 'Bank Name', value: bankInfo.bankName },
        { key: 'accountNumber', label: 'Account Number', value: bankInfo.accountNumber },
        { key: 'sortCode', label: 'Sort Code', value: bankInfo.sortCode },
        { key: 'iban', label: 'IBAN', value: bankInfo.iban ?? '' },
        { key: 'bic', label: 'BIC', value: bankInfo.bic ?? '' },
      ]
    : [];

  const complianceCols: ConsoleColumn<ComplianceDocument>[] = [
    {
      key: 'type',
      header: 'Document Type',
      mobilePrimary: true,
      render: (d) => <span className="capitalize font-medium">{d.type.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => {
        const p = complianceDocStatusPresentation(d.status);
        return <InlineStatus label={p.label} tone={p.tone} dataStatus={p.dataStatus} />;
      },
    },
    {
      key: 'expiry',
      header: 'Expiry / Updated',
      align: 'right',
      render: (d) => d.expiryDate?.slice(0, 10) || '—',
    },
  ];

  return (
    <div className="space-y-6" data-testid="brand-settings">
      <PageHeader
        title="Settings"
        description="Manage banking change requests, commercial terms, login posture, permissions, PO outages, return addresses, compliance references, notification preferences, contacts, and guided tours."
      />

      <div className="flex flex-wrap gap-1 border-b border-zinc-200 pb-2" role="tablist" aria-label="Brand settings sections">
        {SETTINGS_TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-zinc-950 text-white'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      <div className="max-w-3xl">
        {activeTab === 'bank' && (
          <SectionCard
            title={`Bank Information${bankInfo ? ` — ${bankInfo.currency}` : ''}`}
            description="Bank account mutations require admin verification before payouts route to new details."
          >
            {!bankInfo ? (
              <p className="text-[14px] text-zinc-600">Banking details are not configured yet.</p>
            ) : (
              <div className="space-y-3 text-[12px]">
                {bankInfo.status === 'pending_approval' && bankInfo.requestedChange && (
                  <NoticeBanner
                    tone="warning"
                    title="Pending admin approval"
                    message={`${bankInfo.requestedChange.field} → ${bankInfo.requestedChange.requestedValue}`}
                  />
                )}
                {bankNote && <NoticeBanner tone="success" message={bankNote} />}

                <div className="divide-y divide-zinc-200 border border-zinc-200 rounded">
                  {bankFields.map(({ key, label, value }) => (
                    <div
                      key={key}
                      className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3"
                    >
                      <span className="text-zinc-600 w-32 shrink-0">{label}</span>
                      <span className="font-mono text-zinc-950 flex-1">{value || '—'}</span>
                      <input
                        value={bankRequested[key] ?? ''}
                        onChange={(e) =>
                          setBankRequested((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        placeholder="Requested change…"
                        aria-label={`New value for ${label}`}
                        className="w-44 px-2.5 py-1 rounded border border-zinc-300 bg-white text-zinc-950 font-mono"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <input
                    value={bankReason}
                    onChange={(e) => setBankReason(e.target.value)}
                    placeholder="Reason for change…"
                    aria-label="Reason for bank change"
                    className="flex-1 min-w-[200px] px-3 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const active = bankFields.find((f) => bankRequested[f.key]?.trim());
                      if (!active || !bankReason.trim()) return;
                      onRequestBankChange(
                        active.key,
                        active.value,
                        bankRequested[active.key]!.trim(),
                        bankReason.trim()
                      );
                      setBankNote(
                        `Change request submitted for ${active.key} — pending admin approval.`
                      );
                      setBankReason('');
                    }}
                    className="px-3.5 py-1.5 rounded bg-[#C2410C] text-white font-medium hover:bg-[#9A3412]"
                  >
                    Submit Change
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === 'commercial' && (
          <SectionCard
            title="Commercial Relationship"
            description="Read-only record of your commercial model agreed with Mercenta (managed by Super Admin)."
          >
            {commercialRecord && isCommercialModel(commercialRecord.model) ? (
              <div className="space-y-3 text-[12px]">
                <div className="flex items-center justify-between gap-3">
                  <InlineStatus
                    label={COMMERCIAL_MODELS[commercialRecord.model].label}
                    tone={commercialRecord.model === 'commission_agent' ? 'success' : 'info'}
                  />
                  <span className="font-mono text-zinc-500">
                    Recorded {commercialRecord.recordedAt.slice(0, 10)}
                  </span>
                </div>
                <p className="text-[14px] text-zinc-700">
                  {COMMERCIAL_MODELS[commercialRecord.model].summary}
                </p>
                <dl className="divide-y divide-zinc-200 border border-zinc-200 rounded font-mono">
                  {commercialRecord.model === 'commission_agent' ? (
                    <div className="px-3.5 py-2.5 flex items-center justify-between">
                      <dt className="font-sans text-zinc-600">Mercenta Commission</dt>
                      <dd className="font-semibold text-zinc-950">
                        {commercialRecord.commissionRatePct ?? 0}% of retail-channel value
                      </dd>
                    </div>
                  ) : (
                    <div className="px-3.5 py-2.5 flex items-center justify-between">
                      <dt className="font-sans text-zinc-600">
                        Brand Share of Retail-Channel Revenue
                      </dt>
                      <dd className="font-semibold text-zinc-950">
                        {commercialRecord.brandAcquisitionSharePct ?? 0}%
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            ) : (
              <NoticeBanner
                tone="warning"
                message={`${COMMERCIAL_MODEL_NOT_SELECTED_LABEL} — contact your Mercenta account manager.`}
              />
            )}
            <p className="mt-4 text-[12px] text-zinc-500">
              This commercial agreement is separate from — and never changes or waives — UK
              compliance document requirements.
            </p>
          </SectionCard>
        )}

        {activeTab === 'login' && (
          <SectionCard
            title="Login Settings"
            description="Authentic session authentication posture — Mercenta does not store local passwords or run built-in 2FA."
          >
            <dl className="divide-y divide-zinc-200 text-[12px]">
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-zinc-600">Sign-in method</dt>
                <dd className="font-medium text-zinc-950">
                  Role-based session — no Mercenta password stored
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-zinc-600">Two-factor authentication</dt>
                <dd className="text-zinc-700">
                  Not offered locally — contacts rely on their identity provider&apos;s 2FA
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between gap-4">
                <dt className="text-zinc-600">Active sessions</dt>
                <dd className="font-mono text-zinc-950">1 active session</dd>
              </div>
            </dl>
          </SectionCard>
        )}

        {activeTab === 'permissions' && (
          <SectionCard
            title="Manage Permissions"
            description="Brand team access roles across purchasing, shipping, accounts, and compliance."
            actions={
              !showInvite ? (
                <button
                  type="button"
                  onClick={() => setShowInvite(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#C2410C] text-white text-[12px] font-medium hover:bg-[#9A3412]"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Invite Team Member
                </button>
              ) : undefined
            }
          >
            {teamMembers.length === 0 ? (
              <p className="text-[14px] text-zinc-600">No team members invited yet.</p>
            ) : (
              <div className="divide-y divide-zinc-200 border border-zinc-200 rounded mb-4">
                {teamMembers.map((m) => (
                  <div
                    key={m.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-[12px]"
                  >
                    <div>
                      <span className="font-medium text-zinc-950">{m.name}</span>
                      <span className="ml-2 text-zinc-500">{m.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <InlineStatus
                        label={m.role}
                        tone={
                          m.role === 'Owner'
                            ? 'info'
                            : m.role === 'Accounts'
                              ? 'success'
                              : 'neutral'
                        }
                      />
                      {!m.active && <InlineStatus label="Inactive" tone="warning" />}
                      <button
                        type="button"
                        onClick={() => onRemoveTeamMember(m.id)}
                        aria-label={`Remove ${m.name}`}
                        className="p-1 text-zinc-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showInvite && (
              <div className="space-y-3 border-t border-zinc-200 pt-4 text-[12px]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="space-y-1">
                    <span className="text-zinc-600">Name</span>
                    <input
                      value={invite.name}
                      onChange={(e) => setInvite({ ...invite, name: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-zinc-600">Email</span>
                    <input
                      value={invite.email}
                      onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-zinc-600">Role</span>
                    <select
                      value={invite.role}
                      onChange={(e) =>
                        setInvite({ ...invite, role: e.target.value as BrandPermissionRole })
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                    >
                      <option value="Owner">Owner</option>
                      <option value="Shipping">Shipping</option>
                      <option value="Accounts">Accounts</option>
                      <option value="Compliance">Compliance</option>
                    </select>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!invite.name.trim() || !invite.email.trim()) return;
                      onAddTeamMember(invite.name.trim(), invite.email.trim(), invite.role);
                      setInvite({ name: '', email: '', role: 'Owner' });
                      setShowInvite(false);
                    }}
                    className="px-3.5 py-1.5 rounded bg-[#C2410C] text-white font-medium hover:bg-[#9A3412]"
                  >
                    Send Invite
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInvite(false)}
                    className="px-3.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === 'outages' && (
          <SectionCard
            title="Purchase Order Outages"
            description="Declare periods when your warehouse cannot fulfil POs so order routing flags or suppresses PO dispatch."
            actions={
              !showNewOutage ? (
                <button
                  type="button"
                  onClick={() => setShowNewOutage(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#C2410C] text-white text-[12px] font-medium hover:bg-[#9A3412]"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Declare Outage
                </button>
              ) : undefined
            }
          >
            {outages.length === 0 ? (
              <p className="text-[14px] text-zinc-600">No outages declared.</p>
            ) : (
              <div className="divide-y divide-zinc-200 border border-zinc-200 rounded mb-4">
                {outages.map((o) => {
                  const p = poOutageStatusPresentation(o.status);
                  return (
                    <div
                      key={o.id}
                      className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-[12px]"
                    >
                      <div>
                        <div className="font-mono font-medium text-zinc-950">
                          {o.startDate} → {o.endDate}
                        </div>
                        <div className="text-zinc-600">{o.reason}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <InlineStatus label={p.label} tone={p.tone} dataStatus={p.dataStatus} />
                        {o.status === 'active' && (
                          <button
                            type="button"
                            onClick={() => onCancelOutage(o.id)}
                            className="text-red-700 hover:underline font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {showNewOutage && (
              <div className="space-y-3 border-t border-zinc-200 pt-4 text-[12px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-zinc-600">Start Date</span>
                    <input
                      type="date"
                      value={outageForm.startDate}
                      onChange={(e) =>
                        setOutageForm({ ...outageForm, startDate: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-zinc-600">End Date</span>
                    <input
                      type="date"
                      value={outageForm.endDate}
                      onChange={(e) => setOutageForm({ ...outageForm, endDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                    />
                  </label>
                </div>
                <label className="block space-y-1">
                  <span className="text-zinc-600">Reason</span>
                  <input
                    value={outageForm.reason}
                    onChange={(e) => setOutageForm({ ...outageForm, reason: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!outageForm.startDate || !outageForm.endDate || !outageForm.reason.trim())
                        return;
                      onAddOutage(outageForm.startDate, outageForm.endDate, outageForm.reason.trim());
                      setOutageForm({ startDate: '', endDate: '', reason: '' });
                      setShowNewOutage(false);
                    }}
                    className="px-3.5 py-1.5 rounded bg-[#C2410C] text-white font-medium hover:bg-[#9A3412]"
                  >
                    Declare Outage
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewOutage(false)}
                    className="px-3.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === 'returns_addr' && (
          <SectionCard
            title="Return Addresses"
            description="Authorised UK or origin return depots for damaged or recalled inventory."
            actions={
              !showNewAddr ? (
                <button
                  type="button"
                  onClick={() => setShowNewAddr(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#C2410C] text-white text-[12px] font-medium hover:bg-[#9A3412]"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Add Return Address
                </button>
              ) : undefined
            }
          >
            {returnAddresses.length === 0 ? (
              <p className="text-[14px] text-zinc-600">No return addresses configured.</p>
            ) : (
              <div className="divide-y divide-zinc-200 border border-zinc-200 rounded mb-4">
                {returnAddresses.map((a) => (
                  <div key={a.id} className="px-3.5 py-3 text-[12px] space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-zinc-950">{a.label}</span>
                      {a.isDefault && <InlineStatus label="Default" tone="success" />}
                    </div>
                    <div className="text-zinc-600">
                      {a.companyName} · {a.addressLine1}
                      {a.addressLine2 ? `, ${a.addressLine2}` : ''} · {a.city}, {a.postalCode},{' '}
                      {a.country}
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      {!a.isDefault && (
                        <button
                          type="button"
                          onClick={() => onSetDefaultReturnAddress(a.id)}
                          className="text-[#C2410C] hover:underline font-medium"
                        >
                          Set default
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemoveReturnAddress(a.id)}
                        className="text-red-700 hover:underline font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showNewAddr && (
              <div className="space-y-3 border-t border-zinc-200 pt-4 text-[12px]">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-zinc-600">Label</span>
                    <input
                      value={addrForm.label}
                      onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                      placeholder="UK Returns — Standard"
                      className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-zinc-600">Company Name</span>
                    <input
                      value={addrForm.companyName}
                      onChange={(e) => setAddrForm({ ...addrForm, companyName: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-zinc-600">Address Line 1</span>
                    <input
                      value={addrForm.addressLine1}
                      onChange={(e) => setAddrForm({ ...addrForm, addressLine1: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-zinc-600">City</span>
                    <input
                      value={addrForm.city}
                      onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-zinc-600">Postal Code</span>
                    <input
                      value={addrForm.postalCode}
                      onChange={(e) => setAddrForm({ ...addrForm, postalCode: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-zinc-600">Contact Name</span>
                    <input
                      value={addrForm.contactName}
                      onChange={(e) => setAddrForm({ ...addrForm, contactName: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!addrForm.label.trim() || !addrForm.addressLine1.trim()) return;
                      onAddReturnAddress({
                        brandId: brandProfile.businessName || '',
                        ...addrForm,
                        isDefault: returnAddresses.length === 0,
                      });
                      setShowNewAddr(false);
                    }}
                    className="px-3.5 py-1.5 rounded bg-[#C2410C] text-white font-medium hover:bg-[#9A3412]"
                  >
                    Add Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewAddr(false)}
                    className="px-3.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === 'compliance' && (
          <SectionCard
            title="Compliance Reference"
            description="View-only reference of filed compliance documents. Manage uploads in UK Compliance."
          >
            <ConsoleTable
              rows={complianceDocs}
              columns={complianceCols}
              rowKey={(d) => d.id}
              emptyTitle="No compliance documents filed"
              emptyDescription="Upload required statutory certificates in the UK Compliance workspace."
            />
          </SectionCard>
        )}

        {activeTab === 'notifications' && (
          <SectionCard
            title="Notification Preferences"
            description="Select operational events and delivery channels (email and in-app alerts)."
          >
            {notificationPrefs.length === 0 ? (
              <p className="text-[14px] text-zinc-600">No notification rules configured.</p>
            ) : (
              <div className="divide-y divide-zinc-200 border border-zinc-200 rounded">
                {notificationPrefs.map((p) => (
                  <div
                    key={p.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-[12px]"
                  >
                    <span className={p.enabled ? 'font-medium text-zinc-950' : 'text-zinc-500'}>
                      {EVENT_LABELS[p.eventType]}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleNotificationChannel(p, 'email')}
                        aria-label={`Toggle email notifications for ${EVENT_LABELS[p.eventType]}`}
                        className={`p-1.5 rounded border ${
                          p.channels.includes('email')
                            ? 'border-[#C2410C] bg-orange-50 text-[#C2410C]'
                            : 'border-zinc-200 text-zinc-400'
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleNotificationChannel(p, 'in_app')}
                        aria-label={`Toggle in-app notifications for ${EVENT_LABELS[p.eventType]}`}
                        className={`p-1.5 rounded border ${
                          p.channels.includes('in_app')
                            ? 'border-[#C2410C] bg-orange-50 text-[#C2410C]'
                            : 'border-zinc-200 text-zinc-400'
                        }`}
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleNotificationEnabled(p)}
                        aria-label={`Enable or disable ${EVENT_LABELS[p.eventType]}`}
                        className={`p-1.5 rounded border ${
                          p.enabled
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-zinc-200 text-zinc-400'
                        }`}
                      >
                        {p.enabled ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === 'contacts' && (
          <SectionCard
            title="Primary Contacts"
            description="Signatory and contact details shared with Mercenta operations."
          >
            {contactNotice && <NoticeBanner tone="success" message={contactNotice} />}
            {!editingContacts ? (
              <div className="space-y-3 text-[12px]">
                <dl className="divide-y divide-zinc-200 border border-zinc-200 rounded">
                  {[
                    ['Signatory', brandProfile.signatory],
                    ['Email', brandProfile.email],
                    ['Phone', brandProfile.phone],
                  ].map(([k, v]) => (
                    <div key={k} className="px-3.5 py-2.5 flex items-center justify-between">
                      <dt className="text-zinc-600">{k}</dt>
                      <dd className="font-medium text-zinc-950">{v || '—'}</dd>
                    </div>
                  ))}
                </dl>
                <button
                  type="button"
                  onClick={() => setEditingContacts(true)}
                  className="px-3.5 py-1.5 rounded border border-zinc-300 bg-white font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  Edit
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-[12px]">
                <label className="block space-y-1">
                  <span className="text-zinc-600">Signatory Name</span>
                  <input
                    value={contactForm.signatory}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, signatory: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-zinc-600">Email</span>
                  <input
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-zinc-600">Phone</span>
                  <input
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onRequestProfileChange?.(
                        `Contact update requested: ${contactForm.signatory} / ${contactForm.email} / ${contactForm.phone}`
                      );
                      setContactNotice('Contact change request queued for admin review.');
                      setEditingContacts(false);
                    }}
                    className="px-3.5 py-1.5 rounded bg-[#C2410C] text-white font-medium hover:bg-[#9A3412]"
                  >
                    Request Change
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingContacts(false)}
                    className="px-3.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === 'agreements' && (
          <SectionCard
            title="Distribution Agreements"
            description="Signed agreements and commercial schedule terms on record with Mercenta Partners."
            actions={
              onOpenContracts ? (
                <button
                  type="button"
                  onClick={onOpenContracts}
                  className="px-3 py-1.5 rounded bg-[#C2410C] text-white text-[12px] font-medium hover:bg-[#9A3412]"
                >
                  Open Contracts Workspace
                </button>
              ) : undefined
            }
          >
            {contracts.length === 0 ? (
              <p className="text-[14px] text-zinc-600">No contracts issued yet.</p>
            ) : (
              <div className="divide-y divide-zinc-200 border border-zinc-200 rounded">
                {contracts.map((c) => (
                  <div
                    key={c.id}
                    className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px]"
                  >
                    <div>
                      <div className="font-medium text-zinc-950 capitalize">
                        {c.type.replace(/_/g, ' ')} — v{c.version}
                      </div>
                      <div className="font-mono text-zinc-500">
                        {c.commissionRate}% commission · £{c.monthlyFee}/mo · Effective{' '}
                        {c.effectiveDate || '—'}
                      </div>
                    </div>
                    <InlineStatus
                      label={c.status}
                      tone={c.status === 'active' || c.status === 'signed' ? 'success' : 'info'}
                    />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {activeTab === 'tours' && (
          <SectionCard
            title="Guided Tours"
            description="Restart any onboarding walkthrough from step one without altering your account data."
          >
            <div className="divide-y divide-zinc-200 border border-zinc-200 rounded">
              {tours.map((t) => (
                <div
                  key={t.id}
                  className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-[12px]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-zinc-950">{t.name}</div>
                    <div className="text-zinc-600 truncate">{t.description}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <InlineStatus label={t.state} tone={t.tone} />
                    <button
                      type="button"
                      onClick={() => onRestartTour(t.id)}
                      className="px-2.5 py-1 rounded border border-zinc-300 bg-white font-medium text-zinc-900 hover:bg-zinc-50"
                    >
                      Restart Tour
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </div>
  );
}
