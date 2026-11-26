import { useState } from 'react';
import {
  ConsoleTabs,
  NoticeBanner,
  SectionCard,
  formatGbp,
} from '@/next/components/ConsoleCharts';
import {
  ConsoleTable,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  ConsoleHeader,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';

export type ApprovalQueueTab = 'submissions' | 'listings' | 'compliance' | 'purchase_orders';

export interface ApprovalSubmissionRow {
  id: string;
  brandId: string;
  brandName: string;
  productName: string;
  sku: string;
  asin?: string;
  status: string;
  statusLabel: string;
  statusTone: SemanticTone;
  submittedAt: string;
  simulated: boolean;
  rejectionReason?: string;
}

export interface ApprovalListingRow {
  id: string;
  brandId: string;
  brandName: string;
  sku: string;
  productName: string;
  area: string;
  title: string;
  detail: string;
  impact: string;
  status: 'suggested' | 'pending' | 'approved' | 'edited' | 'rejected';
  suggestedCopy?: string;
  editedCopy?: string;
}

export interface ApprovalComplianceRow {
  id: string;
  brandId: string;
  brandName: string;
  docTypeLabel: string;
  status: string;
  statusLabel: string;
  statusTone: SemanticTone;
  version: number;
  expiryDate?: string;
}

export interface ApprovalPoRow {
  id: string;
  brandId: string;
  brandName: string;
  poNumber: string;
  statusLabel: string;
  statusTone: SemanticTone;
  poValueGbp: number;
  orderDate: string;
  hasDraft: boolean;
  draftId?: string;
  draftReason?: string;
}

export interface TalentApprovalsViewProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  canMutate: boolean;
  activeTab: ApprovalQueueTab;
  onTabChange: (tab: ApprovalQueueTab) => void;
  metrics: MetricItem[];
  submissions: ApprovalSubmissionRow[];
  listings: ApprovalListingRow[];
  complianceDocs: ApprovalComplianceRow[];
  purchaseOrders: ApprovalPoRow[];
  notice: string | null;
  actionError: string | null;
  busyId: string | null;
  onPollSubmission: (submissionId: string) => void;
  onReviewListing: (
    brandId: string,
    recId: string,
    decision: 'approved' | 'edited' | 'rejected',
    editedCopy?: string
  ) => void;
  onReviewCompliance: (docId: string, decision: 'approve' | 'reject', note?: string) => void;
  onApprovePoDraft: (poId: string, brandId: string, draftId?: string) => void;
  onOpenPurchaseOrders: () => void;
}

function listingTone(s: ApprovalListingRow['status']): SemanticTone {
  if (s === 'approved' || s === 'edited') return 'success';
  if (s === 'rejected') return 'danger';
  return 'warning';
}

export function TalentApprovalsView({
  loading,
  error,
  onRetry,
  canMutate,
  activeTab,
  onTabChange,
  metrics,
  submissions,
  listings,
  complianceDocs,
  purchaseOrders,
  notice,
  actionError,
  busyId,
  onPollSubmission,
  onReviewListing,
  onReviewCompliance,
  onApprovePoDraft,
  onOpenPurchaseOrders,
}: TalentApprovalsViewProps) {
  const [selectedListing, setSelectedListing] = useState<ApprovalListingRow | null>(null);
  const [editedCopyDraft, setEditedCopyDraft] = useState('');
  const [selectedCompliance, setSelectedCompliance] = useState<ApprovalComplianceRow | null>(null);
  const [complianceReason, setComplianceReason] = useState('');

  const subColumns: ConsoleColumn<ApprovalSubmissionRow>[] = [
    {
      key: 'product',
      header: 'Product Submission',
      render: (r) => (
        <div>
          <div className="font-medium text-ink-950">{r.productName}</div>
          <div className="text-ds-label text-faint font-mono">
            {r.sku} · {r.brandName}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Submission State',
      render: (r) => <InlineStatus label={r.statusLabel} tone={r.statusTone} />,
    },
    {
      key: 'asin',
      header: 'ASIN / Date',
      render: (r) => (
        <div className="text-ds-label font-mono text-faint">
          {r.asin || 'Pending ASIN'} · {r.submittedAt}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          disabled={!canMutate || busyId === r.id}
          onClick={() => onPollSubmission(r.id)}
          className="px-2.5 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label font-medium text-ink-800 hover:bg-surface disabled:opacity-40"
        >
          {busyId === r.id ? 'Checking…' : 'Poll status'}
        </button>
      ),
    },
  ];

  const listingColumns: ConsoleColumn<ApprovalListingRow>[] = [
    {
      key: 'title',
      header: 'Listing Recommendation',
      render: (r) => (
        <div>
          <div className="font-medium text-ink-950">{r.title}</div>
          <div className="text-ds-label text-faint">
            {r.productName} ({r.sku}) · {r.brandName}
          </div>
        </div>
      ),
    },
    {
      key: 'area',
      header: 'Area',
      render: (r) => <span className="text-ds-label text-secondary">{r.area}</span>,
    },
    {
      key: 'status',
      header: 'Review Status',
      render: (r) => <InlineStatus label={r.status} tone={listingTone(r.status)} />,
    },
    {
      key: 'actions',
      header: 'Inspect',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={() => {
            setSelectedListing(r);
            setEditedCopyDraft(r.editedCopy ?? r.suggestedCopy ?? '');
          }}
          className="px-2.5 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label font-medium text-ink-900 hover:bg-surface"
        >
          Review
        </button>
      ),
    },
  ];

  const complianceColumns: ConsoleColumn<ApprovalComplianceRow>[] = [
    {
      key: 'doc',
      header: 'Compliance Document',
      render: (r) => (
        <div>
          <div className="font-medium text-ink-950">{r.docTypeLabel}</div>
          <div className="text-ds-label text-faint">
            {r.brandName} · v{r.version}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Verification State',
      render: (r) => <InlineStatus label={r.statusLabel} tone={r.statusTone} />,
    },
    {
      key: 'expiry',
      header: 'Expiry',
      render: (r) => (
        <span className="font-mono text-ds-label text-faint">{r.expiryDate ?? '—'}</span>
      ),
    },
    {
      key: 'review',
      header: 'Decision',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={() => {
            setSelectedCompliance(r);
            setComplianceReason('');
          }}
          className="px-2.5 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label font-medium text-ink-900 hover:bg-surface"
        >
          Inspect &amp; Decide
        </button>
      ),
    },
  ];

  const poColumns: ConsoleColumn<ApprovalPoRow>[] = [
    {
      key: 'po',
      header: 'Purchase Order',
      render: (r) => (
        <div>
          <div className="font-mono font-medium text-ink-950">{r.poNumber}</div>
          <div className="text-ds-label text-faint">
            {r.brandName} · {r.orderDate}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Order Status',
      render: (r) => <InlineStatus label={r.statusLabel} tone={r.statusTone} />,
    },
    {
      key: 'value',
      header: 'PO Value',
      align: 'right',
      render: (r) => <span className="font-mono tabular-nums">{formatGbp(r.poValueGbp)}</span>,
    },
    {
      key: 'action',
      header: 'Queue Action',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {r.hasDraft && (
            <button
              type="button"
              disabled={!canMutate || busyId === r.id}
              onClick={() => onApprovePoDraft(r.id, r.brandId, r.draftId)}
              className="px-2.5 py-1 rounded-ds-sm bg-accent text-on-dark text-ds-label font-medium hover:brightness-95 disabled:opacity-40"
            >
              Approve Draft
            </button>
          )}
          <button
            type="button"
            onClick={onOpenPurchaseOrders}
            className="px-2.5 py-1 rounded-ds-sm border border-hairline-strong bg-surface-raised text-ds-label font-medium text-ink-900 hover:bg-surface"
          >
            Open PO Queue
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ConsoleHeader
        title="Approvals & Review Queues"
        description="Canonical Mercenta approval workflows across product catalog submissions, listing copy recommendations, UK compliance documents, and purchase order acknowledgements."
      />

      <NoticeBanner
        tone="warning"
        title="IP Creative, Storefront & Royalty approvals omitted (entities not modelled)"
        message="This queue renders Mercenta’s 4 canonical approval streams (ProductSubmission, ListingRecommendation, ComplianceDocument, PurchaseOrder ack/draft). CAA-TalAg approvals for Talent IP Creative Assets, Brand Storefronts, and Royalty Agreements are omitted until those schemas exist."
      />

      {notice && <NoticeBanner tone="success" message={notice} />}
      {actionError && <NoticeBanner tone="danger" message={actionError} />}

      {loading ? (
        <LoadingRows rows={6} />
      ) : error ? (
        <ErrorStateBlock message={error} onRetry={onRetry} />
      ) : (
        <>
          <MetricStrip items={metrics} columns={4} />

          <ConsoleTabs<ApprovalQueueTab>
            value={activeTab}
            onChange={onTabChange}
            ariaLabel="Approval queues"
            tabs={[
              { id: 'submissions', label: 'Product Submissions', count: submissions.length },
              { id: 'listings', label: 'Listing Recommendations', count: listings.length },
              { id: 'compliance', label: 'Compliance Documents', count: complianceDocs.length },
              { id: 'purchase_orders', label: 'PO Ack & Drafts', count: purchaseOrders.length },
            ]}
          />

          <SectionCard
            title={
              activeTab === 'submissions'
                ? 'Catalog Product Submissions'
                : activeTab === 'listings'
                  ? 'Listing Copy & Readiness Recommendations'
                  : activeTab === 'compliance'
                    ? 'Compliance Document Verification Queue'
                    : 'Purchase Orders Awaiting Action or Draft Approval'
            }
          >
            {activeTab === 'submissions' && (
              <ConsoleTable
                rows={submissions}
                columns={subColumns}
                rowKey={(r) => r.id}
                emptyTitle="No catalog submissions recorded"
                emptyDescription="Submitted SKUs will appear here for SP-API status polling."
              />
            )}
            {activeTab === 'listings' && (
              <ConsoleTable
                rows={listings}
                columns={listingColumns}
                rowKey={(r) => r.id}
                emptyTitle="No listing recommendations open"
                emptyDescription="Run catalog listing analysis to review copy and image proposals."
              />
            )}
            {activeTab === 'compliance' && (
              <ConsoleTable
                rows={complianceDocs}
                columns={complianceColumns}
                rowKey={(r) => r.id}
                emptyTitle="No compliance documents in queue"
                emptyDescription="Uploaded brand compliance documents will appear here."
              />
            )}
            {activeTab === 'purchase_orders' && (
              <ConsoleTable
                rows={purchaseOrders}
                columns={poColumns}
                rowKey={(r) => r.id}
                emptyTitle="No POs awaiting acknowledgement"
                emptyDescription="Received or under-review POs and on-behalf rejection drafts appear here."
              />
            )}
          </SectionCard>
        </>
      )}

      <SlideOverDrawer
        open={Boolean(selectedListing)}
        onClose={() => setSelectedListing(null)}
        title={selectedListing?.title ?? 'Review Recommendation'}
        subtitle={
          selectedListing
            ? `${selectedListing.productName} (${selectedListing.sku}) · ${selectedListing.brandName}`
            : undefined
        }
      >
        {selectedListing && (
          <div className="space-y-4 text-ds-body">
            <p className="text-secondary">{selectedListing.detail}</p>
            <div className="text-ds-label text-faint">Expected impact: {selectedListing.impact}</div>

            <div className="space-y-1.5">
              <label className="block text-ds-label font-medium text-secondary">
                Suggested / Amended Copy
              </label>
              <textarea
                rows={4}
                value={editedCopyDraft}
                onChange={(e) => setEditedCopyDraft(e.target.value)}
                className="w-full rounded-ds-md border border-hairline-strong px-3 py-2 text-ds-label"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={!canMutate || busyId === selectedListing.id}
                onClick={() => {
                  onReviewListing(selectedListing.brandId, selectedListing.id, 'approved');
                  setSelectedListing(null);
                }}
                className="px-3.5 py-2 rounded-ds-md bg-ink-950 text-on-dark text-ds-label font-medium disabled:opacity-40"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={!canMutate || !editedCopyDraft.trim() || busyId === selectedListing.id}
                onClick={() => {
                  onReviewListing(
                    selectedListing.brandId,
                    selectedListing.id,
                    'edited',
                    editedCopyDraft
                  );
                  setSelectedListing(null);
                }}
                className="px-3.5 py-2 rounded-ds-md bg-accent text-on-dark text-ds-label font-medium disabled:opacity-40"
              >
                Save Amended Copy
              </button>
              <button
                type="button"
                disabled={!canMutate || busyId === selectedListing.id}
                onClick={() => {
                  onReviewListing(selectedListing.brandId, selectedListing.id, 'rejected');
                  setSelectedListing(null);
                }}
                className="px-3.5 py-2 rounded-ds-md border border-hairline-strong bg-surface-raised text-ds-label font-medium text-state-danger disabled:opacity-40"
              >
                Reject
              </button>
            </div>
          </div>
        )}
      </SlideOverDrawer>

      <SlideOverDrawer
        open={Boolean(selectedCompliance)}
        onClose={() => setSelectedCompliance(null)}
        title={selectedCompliance?.docTypeLabel ?? 'Compliance Review'}
        subtitle={
          selectedCompliance
            ? `${selectedCompliance.brandName} · v${selectedCompliance.version}`
            : undefined
        }
      >
        {selectedCompliance && (
          <div className="space-y-4 text-ds-body">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <span className="text-faint">Current status</span>
              <InlineStatus
                label={selectedCompliance.statusLabel}
                tone={selectedCompliance.statusTone}
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-ds-label font-medium text-secondary">
                Verification / Decision Note
              </label>
              <textarea
                rows={3}
                value={complianceReason}
                onChange={(e) => setComplianceReason(e.target.value)}
                placeholder="Optional approval note or mandatory rejection explanation…"
                className="w-full rounded-ds-md border border-hairline-strong px-3 py-2 text-ds-label"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="button"
                disabled={!canMutate || busyId === selectedCompliance.id}
                onClick={() => {
                  onReviewCompliance(selectedCompliance.id, 'approve', complianceReason);
                  setSelectedCompliance(null);
                }}
                className="px-3.5 py-2 rounded-ds-md bg-ink-950 text-on-dark text-ds-label font-medium disabled:opacity-40"
              >
                Approve Document
              </button>
              <button
                type="button"
                disabled={!canMutate || busyId === selectedCompliance.id}
                onClick={() => {
                  onReviewCompliance(selectedCompliance.id, 'reject', complianceReason);
                  setSelectedCompliance(null);
                }}
                className="px-3.5 py-2 rounded-ds-md border border-hairline-strong bg-surface-raised text-ds-label font-medium text-state-danger disabled:opacity-40"
              >
                Reject Document
              </button>
            </div>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
