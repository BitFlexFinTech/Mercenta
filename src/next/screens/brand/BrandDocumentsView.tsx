import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import {
  ConsoleTable,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  PageHeader,
  type ConsoleColumn,
} from '@/next/components/ConsolePrimitives';
import { NoticeBanner, SectionCard, formatGbp } from '@/next/components/ConsoleCharts';
import type { Contract } from '@/types';

export const ACCOUNT_CHANGE_FIELDS = [
  'businessName',
  'email',
  'phone',
  'signatory',
  'iban',
  'bic',
] as const;
export type AccountChangeField = (typeof ACCOUNT_CHANGE_FIELDS)[number];

export interface ProfileChangeRequestRow {
  id: string;
  field: string;
  requestedValue: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface BrandDocumentsViewProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  signedContracts: Contract[];
  remittance: {
    statementNumber: string;
    netPaid: number;
    html: string;
  } | null;
  requests: ProfileChangeRequestRow[];
  notice: string | null;
  onDownloadAgreement: (contract: Contract) => void;
  onDownloadRemittance: () => void;
  onSubmitChangeRequest: (input: {
    field: AccountChangeField;
    requestedValue: string;
    reason: string;
  }) => void;
}

export function BrandDocumentsView({
  loading,
  error,
  onRetry,
  signedContracts,
  remittance,
  requests,
  notice,
  onDownloadAgreement,
  onDownloadRemittance,
  onSubmitChangeRequest,
}: BrandDocumentsViewProps) {
  const [field, setField] = useState<AccountChangeField>('email');
  const [requestedValue, setRequestedValue] = useState('');
  const [reason, setReason] = useState('');

  const reqColumns: ConsoleColumn<ProfileChangeRequestRow>[] = [
    {
      key: 'field',
      header: 'Field',
      mobilePrimary: true,
      render: (r) => <span className="font-medium capitalize text-ink-950">{r.field}</span>,
    },
    {
      key: 'val',
      header: 'Requested Value',
      render: (r) => <span className="font-mono text-[12px] text-ink-950">{r.requestedValue}</span>,
    },
    {
      key: 'reason',
      header: 'Reason',
      hideOnMobile: true,
      render: (r) => <span className="text-[12px] text-ink-600">{r.reason}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <InlineStatus
          label={r.status}
          tone={
            r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'
          }
        />
      ),
    },
  ];

  function submitForm() {
    if (!requestedValue.trim() || !reason.trim()) return;
    onSubmitChangeRequest({ field, requestedValue: requestedValue.trim(), reason: reason.trim() });
    setRequestedValue('');
    setReason('');
  }

  return (
    <div className="space-y-6" data-testid="brand-documents-account">
      <PageHeader
        title="Documents & Account"
        description="Download signed distribution agreements, monthly remittance statements, and submit verification-gated account or banking change requests."
      />

      {notice && <NoticeBanner tone="info" message={notice} />}
      {error && <ErrorStateBlock message={error} onRetry={onRetry} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          title="Document Library"
          description="Signed contracts and net PO remittance statements."
        >
          {loading ? (
            <LoadingRows rows={3} label="Loading signed documents…" />
          ) : (
            <div className="space-y-2">
              {signedContracts.length === 0 && !remittance && (
                <p className="text-[12px] text-faint">No signed documents available yet.</p>
              )}
              {signedContracts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 py-2 border-b border-hairline last:border-0 text-[12px]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-faint shrink-0" aria-hidden="true" />
                    <span className="font-medium text-ink-950 truncate">
                      Distribution Agreement v{c.version} ({c.status})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDownloadAgreement(c)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    Download
                  </button>
                </div>
              ))}

              {remittance && (
                <div className="flex items-center justify-between gap-3 py-2 text-[12px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-[var(--mr-accent)] shrink-0" aria-hidden="true" />
                    <span className="font-medium text-ink-950 truncate">
                      Remittance {remittance.statementNumber} · Net {formatGbp(remittance.netPaid, 2)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onDownloadRemittance}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    Download
                  </button>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Request an Account or Banking Change"
          description="Banking and signatory changes always require Mercenta verification before applying."
        >
          <div className="space-y-3 text-[12px]">
            <label className="block space-y-1">
              <span className="text-ink-600">Field to update</span>
              <select
                value={field}
                onChange={(e) => setField(e.target.value as AccountChangeField)}
                className="w-full px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-ink-950"
              >
                {ACCOUNT_CHANGE_FIELDS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-ink-600">Requested new value</span>
              <input
                value={requestedValue}
                onChange={(e) => setRequestedValue(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-ink-950"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-ink-600">Verification reason</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for Mercenta verification team…"
                className="w-full px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-ink-950"
              />
            </label>
            <button
              type="button"
              disabled={!requestedValue.trim() || !reason.trim()}
              onClick={submitForm}
              className="px-4 py-1.5 rounded bg-[var(--mr-accent)] text-on-dark font-medium hover:bg-[var(--mr-accent-600)] disabled:opacity-40"
            >
              Submit Change Request
            </button>
          </div>
        </SectionCard>
      </div>

      <ConsoleTable
        rows={requests}
        columns={reqColumns}
        rowKey={(r) => r.id}
        emptyTitle="No account change requests"
        emptyDescription="Submitted banking or contact change requests will appear here with verification status."
      />
    </div>
  );
}
