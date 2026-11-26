import { useState } from 'react';
import type { ComplianceDocument } from '@/types';
import {
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  ConsoleHeader,
  SlideOverDrawer,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';
import { NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';

export type ComplianceReviewFilter = 'all' | 'awaiting' | 'approved' | 'attention';

export interface ComplianceDocRow {
  id: string;
  brandId: string;
  brandName: string;
  type: ComplianceDocument['type'];
  version: number;
  status: ComplianceDocument['status'];
  statusLabel: string;
  statusTone: SemanticTone;
  verificationLabel: string | null;
  verificationTone: SemanticTone | null;
  supersedesDocumentId?: string;
  expiryDate?: string;
  issuer?: string;
}

export interface ComplianceBrandGroup {
  brandId: string;
  brandName: string;
  docs: ComplianceDocRow[];
  total: number;
  pending: number;
  approved: number;
}

export interface ComplianceDeclarationBundle {
  title: string;
  poNumber: string;
  brandName: string;
  preFilled: { label: string; value: string }[];
  productNames: string[];
}

export interface AdminComplianceViewProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  canMutate: boolean;
  note: string | null;
  metrics: {
    total: number;
    awaiting: number;
    approved: number;
    attention: number;
    brands: number;
  };
  reviewFilter: ComplianceReviewFilter;
  onReviewFilterChange: (next: ComplianceReviewFilter) => void;
  groups: ComplianceBrandGroup[];
  drawerDoc: ComplianceDocRow | null;
  drawerProductsCount: number;
  onSelectDrawerDoc: (id: string | null) => void;
  fullRecordDoc: ComplianceDocRow | null;
  fullRecordBundle: ComplianceDeclarationBundle | null;
  onSelectFullRecordDoc: (id: string | null) => void;
  onManualVerdict: (id: string, decision: 'approve' | 'reject') => Promise<void>;
  /**
   * §FRONTEND-REDESIGN (2026-11-26) — RESTORED, and why it matters.
   *
   * The ported screen recorded a manual verification with a HARD-CODED reason and
   * collected nothing from the operator, so the §WAVE 3e property this project
   * established — a manual decision on a regulated document carries the operator's
   * own reason — was silently dropped. The audit record still existed; the reason
   * behind it did not. These two props are the input it needs.
   */
  verdictReason: string;
  onVerdictReasonChange: (value: string) => void;
  onRunAutomated: (id: string) => Promise<void>;
  onUploadOnBehalf: (brandId: string, type: ComplianceDocument['type']) => void;
}

export function AdminComplianceView({
  loading,
  error,
  onRetry,
  canMutate,
  note,
  metrics,
  reviewFilter,
  onReviewFilterChange,
  groups,
  drawerDoc,
  drawerProductsCount,
  onSelectDrawerDoc,
  fullRecordDoc,
  fullRecordBundle,
  onSelectFullRecordDoc,
  onManualVerdict,
  verdictReason,
  onVerdictReasonChange,
  onRunAutomated,
  onUploadOnBehalf,
}: AdminComplianceViewProps) {
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null);
  const [density, setDensity] = useState<'compact' | 'comfortable'>('compact');

  return (
    <div className="space-y-6">
      <ConsoleHeader
        title="Compliance Approvals"
        description="Per-brand compliance gate — automated verification via Companies House / HMRC and Founder / Super Admin sign-off."
        meta={
          <>
            <span>{metrics.total} documents on file</span>
            <span>{metrics.awaiting} awaiting review</span>
            <span>{metrics.brands} brands</span>
          </>
        }
        actions={
          <div className="flex items-center gap-2">
            <select
              value={reviewFilter}
              onChange={(e) => onReviewFilterChange(e.target.value as ComplianceReviewFilter)}
              aria-label="Filter by review state"
              className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label text-ink-950"
            >
              <option value="all">All ({metrics.total})</option>
              <option value="awaiting">Awaiting review ({metrics.awaiting})</option>
              <option value="approved">Approved ({metrics.approved})</option>
              <option value="attention">Needs attention ({metrics.attention})</option>
            </select>
            <select
              value={density}
              onChange={(e) => setDensity(e.target.value as 'compact' | 'comfortable')}
              aria-label="Row density"
              className="px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label text-ink-950"
            >
              <option value="compact">Density: Compact</option>
              <option value="comfortable">Density: Comfortable</option>
            </select>
          </div>
        }
      />

      {note && (
        <NoticeBanner tone="info" title="Verification update" message={note} />
      )}

      {error && <ErrorStateBlock message={error} onRetry={onRetry} />}

      <MetricStrip
        loading={loading}
        columns={4}
        items={[
          {
            id: 'docs-total',
            label: 'Documents',
            value: String(metrics.total),
            context: `${metrics.brands} brands`,
            active: reviewFilter === 'all',
            onClick: () => onReviewFilterChange('all'),
          },
          {
            id: 'docs-awaiting',
            label: 'Awaiting review',
            value: String(metrics.awaiting),
            context: metrics.awaiting > 0 ? 'Operator review needed' : 'Nothing pending',
            active: reviewFilter === 'awaiting',
            onClick: () => onReviewFilterChange('awaiting'),
          },
          {
            id: 'docs-approved',
            label: 'Approved',
            value: String(metrics.approved),
            context: 'Clears the compliance gate',
            active: reviewFilter === 'approved',
            onClick: () => onReviewFilterChange('approved'),
          },
          {
            id: 'docs-attention',
            label: 'Needs attention',
            value: String(metrics.attention),
            context: metrics.attention > 0 ? 'Expired or missing' : 'None',
            active: reviewFilter === 'attention',
            onClick: () => onReviewFilterChange('attention'),
          },
        ]}
      />

      <SectionCard
        title="Document Queue"
        description="Grouped by partner brand. Approving a document satisfies its compliance gate requirement for the products in scope."
      >
        {loading ? (
          <LoadingRows rows={5} label="Loading compliance documents…" />
        ) : groups.length === 0 ? (
          <EmptyStateBlock
            title={
              reviewFilter === 'all'
                ? 'No compliance documents on file'
                : 'No documents match this filter'
            }
            description="Partner brands appear here with per-document review states once document records are created."
            actionLabel={reviewFilter !== 'all' ? 'Show all documents' : undefined}
            onAction={reviewFilter !== 'all' ? () => onReviewFilterChange('all') : undefined}
          />
        ) : (
          <div className="space-y-3">
            {groups.map((g) => {
              const isExpanded = expandedBrandId === g.brandId;
              return (
                <div
                  key={g.brandId}
                  data-testid="compliance-brand-card"
                  className="border border-hairline rounded-ds-md overflow-hidden bg-surface-raised"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedBrandId(isExpanded ? null : g.brandId)}
                    className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-surface"
                  >
                    <div>
                      <div className="text-ds-body font-semibold text-ink-950">{g.brandName}</div>
                      <div className="text-ds-label text-faint font-mono">
                        {g.total} docs · {g.pending} pending · {g.approved} approved
                      </div>
                    </div>
                    <span className="text-ds-label font-medium text-secondary">
                      {isExpanded ? 'Collapse' : 'Inspect'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-hairline divide-y divide-hairline-06">
                      {g.docs.map((d) => (
                        <div
                          key={d.id}
                          data-density={density}
                          className={`px-4 flex flex-wrap items-center justify-between gap-3 ${
                            density === 'compact' ? 'py-2' : 'py-3'
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="text-ds-label font-medium text-ink-950 capitalize">
                              {d.type.replace(/_/g, ' ')}
                            </span>
                            <span className="text-ds-micro font-mono text-faint">v{d.version}</span>
                            <InlineStatus
                              label={d.statusLabel}
                              tone={d.statusTone}
                              dataStatus={d.status}
                            />
                            {d.verificationLabel && (
                              <InlineStatus
                                label={d.verificationLabel}
                                tone={d.verificationTone ?? 'neutral'}
                              />
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => onSelectDrawerDoc(d.id)}
                              className="px-2 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-micro font-medium text-ink-800 hover:bg-surface"
                            >
                              Preview
                            </button>
                            <button
                              type="button"
                              onClick={() => onSelectFullRecordDoc(d.id)}
                              className="px-2 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-micro font-medium text-ink-800 hover:bg-surface"
                            >
                              Full record
                            </button>
                            {canMutate && d.status !== 'approved' && (
                              <button
                                type="button"
                                onClick={() => void onManualVerdict(d.id, 'approve')}
                                className="px-2 py-1 rounded-ds-sm bg-ink-950 text-on-dark text-ds-micro font-medium hover:bg-ink-800"
                              >
                                Approve (manual)
                              </button>
                            )}
                            {canMutate && d.status !== 'missing' && (
                              <button
                                type="button"
                                onClick={() => void onManualVerdict(d.id, 'reject')}
                                className="px-2 py-1 rounded-ds-sm border border-state-danger/20 bg-state-danger/10 text-state-danger text-ds-micro font-medium hover:bg-state-danger/10"
                              >
                                Reject
                              </button>
                            )}
                            {canMutate && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void onRunAutomated(d.id)}
                                  className="px-2 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-micro font-medium text-accent hover:bg-surface"
                                >
                                  Verify (auto)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUploadOnBehalf(d.brandId, d.type)}
                                  className="px-2 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-micro font-medium text-secondary hover:bg-surface"
                                >
                                  Upload
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      <div className="px-4 py-1.5 text-ds-micro text-faint bg-canvas-50 text-right">
                        Actions attributed as admin on behalf of brand
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Preview Record Drawer */}
      <SlideOverDrawer
        open={drawerDoc !== null}
        onClose={() => onSelectDrawerDoc(null)}
        title={drawerDoc ? drawerDoc.type.replace(/_/g, ' ') : ''}
        subtitle={drawerDoc ? `${drawerDoc.brandName} · v${drawerDoc.version}` : undefined}
        testId="doc-record-drawer"
        footer={
          drawerDoc ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-ds-micro text-faint">
                Version {drawerDoc.version} · operator attributed
              </span>
              <div className="flex items-center gap-2">
                {canMutate && drawerDoc.status !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => void onManualVerdict(drawerDoc.id, 'approve')}
                    className="px-3 py-1.5 rounded-ds-sm bg-accent text-on-dark text-ds-label font-medium hover:brightness-95"
                  >
                    Approve (manual)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const id = drawerDoc.id;
                    onSelectDrawerDoc(null);
                    onSelectFullRecordDoc(id);
                  }}
                  className="px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label font-medium text-ink-800 hover:bg-surface"
                >
                  Open full record
                </button>
              </div>
            </div>
          ) : undefined
        }
      >
        {drawerDoc && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <InlineStatus
                label={drawerDoc.statusLabel}
                tone={drawerDoc.statusTone}
                dataStatus={drawerDoc.status}
              />
              {drawerDoc.verificationLabel && (
                <InlineStatus
                  label={drawerDoc.verificationLabel}
                  tone={drawerDoc.verificationTone ?? 'neutral'}
                />
              )}
            </div>

            <dl className="divide-y divide-hairline-06 border border-hairline rounded-ds-md text-ds-label">
              {[
                { label: 'Brand', value: drawerDoc.brandName },
                { label: 'Document type', value: drawerDoc.type.replace(/_/g, ' ') },
                { label: 'Version', value: String(drawerDoc.version) },
                {
                  label: 'Verification state',
                  value: drawerDoc.verificationLabel ?? 'Not yet verified',
                },
                {
                  label: 'Supersedes',
                  value: drawerDoc.supersedesDocumentId
                    ? `v${Math.max(1, drawerDoc.version - 1)}`
                    : '—',
                },
                { label: 'Expiry', value: drawerDoc.expiryDate ?? '—' },
                { label: 'Products in scope', value: String(drawerProductsCount) },
                { label: 'Issuing body', value: drawerDoc.issuer ?? '—' },
              ].map((row) => (
                <div key={row.label} className="px-3 py-2 flex items-center justify-between gap-3">
                  <dt className="text-faint">{row.label}</dt>
                  <dd className="font-medium text-ink-950 text-right capitalize">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className="border border-hairline rounded-ds-md p-3 bg-canvas-70 text-ds-label text-secondary">
              <div className="font-semibold text-ink-950 mb-1">Gate effect</div>
              {drawerDoc.status === 'approved'
                ? 'This document satisfies its requirement for the products in scope.'
                : 'This document does not yet satisfy its requirement — affected products stay behind the compliance gate.'}
            </div>
          </div>
        )}
      </SlideOverDrawer>

      {/* Full Declaration / Record Drawer (structured preview without iframe srcDoc) */}
      <SlideOverDrawer
        open={fullRecordDoc !== null}
        onClose={() => onSelectFullRecordDoc(null)}
        title={
          fullRecordDoc
            ? `${fullRecordDoc.type.replace(/_/g, ' ')} — ${fullRecordDoc.brandName}`
            : ''
        }
        subtitle="Generated UKCA Conformity & Customs Declaration Record"
        testId="doc-full-record-drawer"
        footer={
          fullRecordDoc ? (
            <div className="space-y-3">
              {/* §FRONTEND-REDESIGN — the operator's OWN reason for the decision.
                  It is what the audit record must carry; left blank, the canonical
                  command falls back to its truthful default sentence. */}
              <label className="block">
                <span className="block text-ds-micro font-mono uppercase tracking-[0.06em] text-faint mb-1">
                  Reason for the decision (recorded in the audit trail)
                </span>
                <input
                  type="text"
                  value={verdictReason}
                  onChange={(e) => onVerdictReasonChange(e.target.value)}
                  aria-label="Reason for the decision"
                  placeholder="e.g. Verified against the issuing body public register."
                  className="w-full px-2.5 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label text-ink-950"
                />
              </label>
              <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onSelectFullRecordDoc(null)}
                className="px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label text-secondary hover:bg-surface"
              >
                Close
              </button>
              {canMutate && (
                <>
                  <button
                    type="button"
                    onClick={() => void onRunAutomated(fullRecordDoc.id)}
                    className="px-3 py-1.5 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label font-medium text-accent hover:bg-surface"
                  >
                    Verify (automated)
                  </button>
                  <button
                    type="button"
                    onClick={() => void onManualVerdict(fullRecordDoc.id, 'reject')}
                    className="px-3 py-1.5 rounded-ds-sm border border-state-danger/20 bg-state-danger/10 text-state-danger text-ds-label font-medium hover:bg-state-danger/10"
                  >
                    Reject document
                  </button>
                  <button
                    type="button"
                    onClick={() => void onManualVerdict(fullRecordDoc.id, 'approve')}
                    className="px-3 py-1.5 rounded-ds-sm bg-ink-950 text-on-dark text-ds-label font-medium hover:bg-ink-800"
                  >
                    Approve document
                  </button>
                </>
              )}
              </div>
            </div>
          ) : undefined
        }
      >
        {fullRecordDoc && (
          <div className="space-y-4">
            {fullRecordBundle ? (
              <>
                <div className="border border-hairline rounded-ds-md p-4 bg-canvas-50 space-y-2">
                  <div className="text-ds-body font-semibold text-ink-950">
                    {fullRecordBundle.title}
                  </div>
                  <div className="text-ds-label font-mono text-faint">
                    Reference {fullRecordBundle.poNumber} · {fullRecordBundle.brandName}
                  </div>
                </div>
                <dl className="divide-y divide-hairline-06 border border-hairline rounded-ds-md text-ds-label">
                  {fullRecordBundle.preFilled.map((item) => (
                    <div
                      key={item.label}
                      className="px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <dt className="text-faint">{item.label}</dt>
                      <dd className="font-mono text-ink-950">{item.value}</dd>
                    </div>
                  ))}
                </dl>
                <div>
                  <div className="text-ds-label font-semibold text-ink-950 mb-1.5">
                    Products covered ({fullRecordBundle.productNames.length})
                  </div>
                  <ul className="border border-hairline rounded-ds-md divide-y divide-hairline-06 text-ds-label">
                    {fullRecordBundle.productNames.map((name) => (
                      <li key={name} className="px-3 py-2 text-ink-800">
                        {name}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <EmptyStateBlock
                title="No product catalogue bundle for preview"
                description="This brand currently has no linked SKUs for generating a UKCA conformity preview. Use the verification actions below directly."
              />
            )}
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
