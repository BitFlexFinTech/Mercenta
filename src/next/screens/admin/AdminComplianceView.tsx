/**
 * §WAVE 3b (2026-11-25) — ADMIN compliance approvals (presentation).
 *
 * The approval action is real: it calls the SAME canonical command the brand
 * compliance screen uses (`reviewGateDocument` from the app context), so a decision
 * is recorded once, in one place, attributed to the acting staff member.
 */
import { useEffect, useState } from 'react';
import {
  ConsoleHeader,
  ConsoleTable,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  SlideOverDrawer,
  toSemanticTone,
  type ConsoleColumn,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { SectionCard } from '@/next/components/ConsoleCharts';
import { complianceDocStatusPresentation } from '@/lib/statusPresentation';
import type { ComplianceDocument } from '@/types';

export interface AdminComplianceRow {
  doc: ComplianceDocument;
  brandName: string;
}

export interface AdminComplianceViewProps {
  rows: AdminComplianceRow[];
  totalCount: number;
  brandOptions: { id: string; name: string }[];
  statusOptions: string[];
  brandFilter: string;
  statusFilter: string;
  search: string;
  awaitingReview: number;
  approved: number;
  blocked: number;
  selected: ComplianceDocument | null;
  selectedBrandName: string;
  busyDocId: string | null;
  notice: string | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
  onRetry: () => void;
  onChangeBrand: (value: string) => void;
  onChangeStatus: (value: string) => void;
  onChangeSearch: (value: string) => void;
  onSelect: (doc: ComplianceDocument | null) => void;
  /**
   * §WAVE 3e — the decision carries a REASON. A manual verification is required to
   * record one (`recordManualDocumentVerification` refuses a decision without it),
   * and the reason is what makes the audit entry meaningful.
   */
  onDecision: (doc: ComplianceDocument, decision: 'approve' | 'reject', reason: string) => void;
}

export function AdminComplianceView({
  rows,
  totalCount,
  brandOptions,
  statusOptions,
  brandFilter,
  statusFilter,
  search,
  awaitingReview,
  approved,
  blocked,
  selected,
  selectedBrandName,
  busyDocId,
  notice,
  isLoading,
  isError,
  errorMessage,
  onRetry,
  onChangeBrand,
  onChangeStatus,
  onChangeSearch,
  onSelect,
  onDecision,
}: AdminComplianceViewProps) {
  /* The decision reason is view state, and it resets per document so a reason
     written for one document can never be submitted against another. */
  const [reason, setReason] = useState('');
  useEffect(() => {
    setReason('');
  }, [selected?.id]);

  const hasExpiry = rows.some((row) => Boolean(row.doc.expiryDate));
  const hasReviewer = rows.some((row) => Boolean(row.doc.reviewedBy));

  const metrics: MetricItem[] = [
    {
      id: 'awaiting',
      label: 'Awaiting review',
      value: String(awaitingReview),
      context: 'Uploaded or under review',
      onClick: () => onChangeStatus('awaiting'),
      active: statusFilter === 'awaiting',
    },
    {
      id: 'approved',
      label: 'Approved',
      value: String(approved),
      context: 'Across the portfolio',
      onClick: () => onChangeStatus('approved'),
      active: statusFilter === 'approved',
    },
    {
      id: 'blocked',
      label: 'Not approved',
      value: String(blocked),
      context: 'Rejected, expired or missing',
      onClick: () => onChangeStatus('not_approved'),
      active: statusFilter === 'not_approved',
    },
  ];

  const columns: ConsoleColumn<AdminComplianceRow>[] = [
    {
      key: 'brand',
      header: 'Brand',
      mobilePrimary: true,
      render: (row) => (
        <div className="min-w-0">
          <div className="font-medium text-strong truncate">{row.brandName}</div>
          <div className="text-ds-label text-faint truncate">
            {row.doc.type.replace(/_/g, ' ')}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const pres = complianceDocStatusPresentation(row.doc.status);
        return (
          <InlineStatus
            label={pres.label}
            tone={toSemanticTone(pres.tone)}
            dataStatus={pres.dataStatus}
          />
        );
      },
    },
    ...(hasExpiry
      ? [
          {
            key: 'expiry',
            header: 'Expiry',
            align: 'right' as const,
            hideOnMobile: true,
            render: (row: AdminComplianceRow) => (
              <span className="tabular-nums text-ds-label text-muted">
                {row.doc.expiryDate ? row.doc.expiryDate.slice(0, 10) : '—'}
              </span>
            ),
          },
        ]
      : []),
    /* A column that would render "—" on every row is noise, so it appears only
       when the data holds at least one value. */
    ...(hasReviewer
      ? [
          {
            key: 'reviewedBy',
            header: 'Reviewed by',
            hideOnMobile: true,
            render: (row: AdminComplianceRow) => (
              <span className="text-ds-label text-muted">{row.doc.reviewedBy ?? '—'}</span>
            ),
          },
        ]
      : []),
  ];
return (
    <div>
      <ConsoleHeader
        eyebrow="Mercenta · Governance"
        title="Compliance approvals"
        description="Every brand document awaiting a decision, and the ones already decided."
      />

      {notice && (
        <p role="status" className="mb-4 text-ds-label text-secondary">
          {notice}
        </p>
      )}

      {isError ? (
        <ErrorStateBlock
          title="Compliance documents could not be loaded"
          message={errorMessage}
          onRetry={onRetry}
        />
      ) : isLoading ? (
        <LoadingRows rows={8} />
      ) : (
        <>
          <MetricStrip items={metrics} columns={3} />

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={search}
              onChange={(event) => onChangeSearch(event.target.value)}
              placeholder="Search brand or document"
              aria-label="Search compliance documents"
              className="px-3 py-2 text-ds-body border border-hairline-strong rounded-ds-md bg-surface-raised text-strong w-64"
            />
            <select
              value={brandFilter}
              onChange={(event) => onChangeBrand(event.target.value)}
              aria-label="Filter by brand"
              className="px-3 py-2 text-ds-body border border-hairline-strong rounded-ds-md bg-surface-raised text-strong"
            >
              <option value="all">All brands</option>
              {brandOptions.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => onChangeStatus(event.target.value)}
              aria-label="Filter by status"
              className="px-3 py-2 text-ds-body border border-hairline-strong rounded-ds-md bg-surface-raised text-strong"
            >
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {complianceDocStatusPresentation(status as ComplianceDocument['status']).label}
                </option>
              ))}
            </select>
          </div>

          <SectionCard title="Documents" description={`${rows.length} of ${totalCount} shown`}>
            <ConsoleTable
              rows={rows}
              columns={columns}
              rowKey={(row) => row.doc.id}
              onRowClick={(row) => onSelect(row.doc)}
              emptyTitle="No documents match these filters"
              emptyDescription="Clear the filters to see the whole portfolio."
            />
          </SectionCard>
        </>
      )}

      <SlideOverDrawer
        open={Boolean(selected)}
        onClose={() => onSelect(null)}
        title={selected ? selected.type.replace(/_/g, ' ') : ''}
        subtitle={selected ? selectedBrandName : undefined}
        testId="admin-compliance-drawer"
      >
        {selected && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-3 text-ds-body">
              <div>
                <dt className="text-ds-label text-faint">Status</dt>
                <dd className="font-medium text-strong">
                  {complianceDocStatusPresentation(selected.status).label}
                </dd>
              </div>
              <div>
                <dt className="text-ds-label text-faint">Expiry</dt>
                <dd className="font-medium text-strong">
                  {selected.expiryDate ? selected.expiryDate.slice(0, 10) : 'No expiry recorded'}
                </dd>
              </div>
            </dl>

            {(selected.status === 'uploaded' || selected.status === 'under_review') && (
              <div className="space-y-3">
                <label className="text-ds-body block">
                  <span className="text-ds-label text-faint block mb-1">
                    Reason for the decision (required, and recorded in the audit trail)
                  </span>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-ds-body border border-hairline-strong rounded-ds-md bg-surface-raised text-strong"
                    placeholder="e.g. Certificate verified against the issuing body's public register."
                  />
                </label>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyDocId === selected.id || reason.trim().length < 3}
                    onClick={() => onDecision(selected, 'approve', reason)}
                    className="px-3 py-2 text-ds-label font-medium rounded-ds-md bg-accent text-on-dark hover:bg-accent-600 disabled:opacity-50"
                  >
                    {busyDocId === selected.id ? 'Recording…' : 'Approve document'}
                  </button>
                  <button
                    type="button"
                    disabled={busyDocId === selected.id || reason.trim().length < 3}
                    onClick={() => onDecision(selected, 'reject', reason)}
                    className="px-3 py-2 text-ds-label font-medium rounded-ds-md border border-hairline-strong bg-surface-raised text-ink-800 hover:bg-surface disabled:opacity-50"
                  >
                    Reject document
                  </button>
                </div>
              </div>
            )}

            {selected.status !== 'uploaded' && selected.status !== 'under_review' && (
              <p className="text-ds-body text-muted">
                This document has already been decided
                {selected.reviewedBy ? ` by ${selected.reviewedBy}` : ''}. A new upload is needed
                before it can be reviewed again.
              </p>
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}