/**
 * §WAVE 3h (2026-11-25) — BRAND settings (presentation).
 *
 * What a brand may do here is exactly what the platform permits: SEE its own record,
 * and REQUEST a change to an allowed field with a reason (M12 §5 — banking and
 * identity changes always require Mercenta verification, so they are requests, never
 * edits). The commercial relationship is shown READ-ONLY, as the business model
 * requires.
 */
import { useEffect, useState } from 'react';
import { ConsoleHeader, InlineStatus, SlideOverDrawer } from '@/next/components/ConsolePrimitives';
import { NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';
import type { BrandProfile, ProfileChangeField, ProfileChangeRequest } from '@/types';

export interface BrandSettingsViewProps {
  profile: BrandProfile;
  verticalLabel: string;
  commercialRelationshipLabel: string;
  fulfilmentTrackLabel: string;
  requests: ProfileChangeRequest[];
  fieldOptions: { id: ProfileChangeField; label: string; currentValue: string }[];
  busy: boolean;
  notice: string | null;
  onSubmitRequest: (input: {
    field: ProfileChangeField;
    requestedValue: string;
    reason: string;
  }) => void;
}

export function BrandSettingsView({
  profile,
  verticalLabel,
  commercialRelationshipLabel,
  fulfilmentTrackLabel,
  requests,
  fieldOptions,
  busy,
  notice,
  onSubmitRequest,
}: BrandSettingsViewProps) {
  const [field, setField] = useState<ProfileChangeField>(fieldOptions[0]?.id ?? 'email');
  const [requestedValue, setRequestedValue] = useState('');
  const [reason, setReason] = useState('');

  /* Switching field clears the draft, so a value typed for one field can never be
     submitted against another. */
  useEffect(() => {
    setRequestedValue('');
  }, [field]);

  const current = fieldOptions.find((option) => option.id === field)?.currentValue ?? '';
  const canSubmit =
    !busy && requestedValue.trim().length > 0 && requestedValue.trim() !== current && reason.trim().length >= 3;

  return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Partner Portal"
        title="Settings"
        description="Your account record, and the changes you can request."
      />

      {notice && (
        <div className="mb-4">
          <NoticeBanner tone="info" message={notice} />
        </div>
      )}

      <div className="space-y-6">
        <SectionCard title="Brand record" description="Held by Mercenta; changes are requested below.">
          <dl className="grid grid-cols-2 gap-3 text-ds-body">
            <div>
              <dt className="text-ds-label text-zinc-500">Business name</dt>
              <dd className="font-medium text-zinc-950">{profile.businessName}</dd>
            </div>
            <div>
              <dt className="text-ds-label text-zinc-500">Region / nation</dt>
              <dd className="font-medium text-zinc-950">
                {profile.region.replace(/_/g, ' ')} · {profile.nation}
              </dd>
            </div>
            <div>
              <dt className="text-ds-label text-zinc-500">Tax ID</dt>
              <dd className="font-mono text-ds-label text-zinc-950">{profile.taxId}</dd>
            </div>
            <div>
              <dt className="text-ds-label text-zinc-500">Signatory</dt>
              <dd className="font-medium text-zinc-950">{profile.signatory}</dd>
            </div>
            <div>
              <dt className="text-ds-label text-zinc-500">Email</dt>
              <dd className="font-medium text-zinc-950">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-ds-label text-zinc-500">Phone</dt>
              <dd className="font-medium text-zinc-950">{profile.phone}</dd>
            </div>
            <div>
              <dt className="text-ds-label text-zinc-500">Payout currency</dt>
              <dd className="font-medium text-zinc-950">{profile.payoutCurrency}</dd>
            </div>
            <div>
              <dt className="text-ds-label text-zinc-500">Bank (BIC / IBAN)</dt>
              <dd className="font-mono text-ds-label text-zinc-950">
                {profile.bic} · {profile.iban ? `${profile.iban.slice(0, 4)}…` : 'not recorded'}
              </dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard
          title="Commercial relationship"
          description="Set by Mercenta when you onboarded. Read-only here."
        >
          <dl className="grid grid-cols-2 gap-3 text-ds-body">
            <div>
              <dt className="text-ds-label text-zinc-500">Relationship</dt>
              <dd className="font-medium text-zinc-950">{commercialRelationshipLabel}</dd>
            </div>
            <div>
              <dt className="text-ds-label text-zinc-500">Operating model</dt>
              <dd className="font-medium text-zinc-950">{verticalLabel}</dd>
            </div>
            <div>
              <dt className="text-ds-label text-zinc-500">Fulfilment</dt>
              <dd className="font-medium text-zinc-950">{fulfilmentTrackLabel}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard
          title="Request a change"
          description="Only the fields Mercenta allows a request for. Your reason is recorded and reviewed."
        >
          <div className="grid grid-cols-1 gap-3 max-w-2xl">
            <label className="text-ds-body">
              <span className="text-ds-label text-zinc-500 block mb-1">Field</span>
              <select
                value={field}
                onChange={(event) => setField(event.target.value as ProfileChangeField)}
                className="w-full px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
              >
                {fieldOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-ds-body">
              <span className="text-ds-label text-zinc-500 block mb-1">
                New value (current: {current || 'not recorded'})
              </span>
              <input
                value={requestedValue}
                onChange={(event) => setRequestedValue(event.target.value)}
                className="w-full px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
              />
            </label>

            <label className="text-ds-body">
              <span className="text-ds-label text-zinc-500 block mb-1">
                Reason (required, and recorded)
              </span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-ds-body border border-zinc-300 rounded-ds-md bg-white text-zinc-950"
                placeholder="e.g. The registered office has moved; a new certificate is attached."
              />
            </label>

            <div>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={() =>
                  onSubmitRequest({ field, requestedValue: requestedValue.trim(), reason: reason.trim() })
                }
                className="px-3 py-2 text-ds-label font-medium rounded-ds-md bg-accent text-white hover:bg-accent-600 disabled:opacity-50"
              >
                {busy ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Your requests" description="What you have asked for, and where it stands.">
          {requests.length === 0 ? (
            <p className="text-ds-body text-zinc-600">You have not requested any changes yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-200">
              {requests.map((request) => (
                <li key={request.id} className="py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0 text-ds-body">
                    <div className="text-zinc-950">
                      {request.field}: {request.currentValue || 'not recorded'} →{' '}
                      {request.requestedValue}
                    </div>
                    <div className="text-ds-label text-zinc-500">
                      {request.requestedAt.slice(0, 10)} · {request.reason}
                      {request.reviewNote ? ` · ${request.reviewNote}` : ''}
                    </div>
                  </div>
                  <InlineStatus
                    label={request.status}
                    tone={
                      request.status === 'approved'
                        ? 'success'
                        : request.status === 'rejected'
                          ? 'danger'
                          : 'warning'
                    }
                    dataStatus={request.status}
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}