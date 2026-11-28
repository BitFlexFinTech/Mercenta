import { CheckCircle2, FileCheck2 } from 'lucide-react';
import {
  ConsoleTable,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  PageHeader,
  SlideOverDrawer,
  type ConsoleColumn,
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';
import { MERCENTA_EORI, MERCENTA_VAT } from '@/config/customs';
import type { CustomsDocumentBundle } from '@/lib/customsDocs';
import { complianceDocStatusPresentation } from '@/lib/statusPresentation';
import type { ComplianceDocument, PurchaseOrder } from '@/types';

export interface ComplianceRequirementRow {
  type: string;
  label: string;
  doc?: ComplianceDocument;
  status: string;
  scope?: 'universal' | 'category' | 'conditional';
  blockingReason?: string;
  verificationSummary?: string;
  expiryLabel?: string | null;
  needsReplacement: boolean;
}

export interface CustomsOrderGroup {
  po: PurchaseOrder;
  brandName: string;
  docs: CustomsDocumentBundle[];
}

export interface BrandComplianceViewProps {
  hasTenant: boolean;
  loading: boolean;
  gateCleared: boolean;
  remainingBlockers: number;
  requirements: ComplianceRequirementRow[];
  requiredLabelsSummary: string;
  uploadedNotice: string | null;
  replacementError: string | null;
  busyType: string | null;
  onUploadDoc: (type: string) => void;
  onReplaceDoc: (type: string) => void;
  customsGroups: CustomsOrderGroup[];
  isCustomsConfirmed: (poId: string, docType: string) => boolean;
  previewDoc: { poId: string; doc: CustomsDocumentBundle } | null;
  onOpenPreview: (poId: string, doc: CustomsDocumentBundle) => void;
  onClosePreview: () => void;
  onConfirmPreview: () => void;
}

export function BrandComplianceView({
  hasTenant,
  loading,
  gateCleared,
  remainingBlockers,
  requirements,
  requiredLabelsSummary,
  uploadedNotice,
  replacementError,
  busyType,
  onUploadDoc,
  onReplaceDoc,
  customsGroups,
  isCustomsConfirmed,
  previewDoc,
  onOpenPreview,
  onClosePreview,
  onConfirmPreview,
}: BrandComplianceViewProps) {
  const approvedCount = requirements.filter((r) => r.status === 'approved').length;

  const metrics: MetricItem[] = [
    {
      id: 'gate',
      label: 'Compliance gate',
      value: gateCleared ? 'Cleared' : 'Blocked',
      context: gateCleared ? 'Catalog sync unlocked' : `${remainingBlockers} blocker(s) remain`,
    },
    {
      id: 'approved',
      label: 'Statutory docs approved',
      value: `${approvedCount} / ${requirements.length}`,
      context: 'Category + universal baseline',
    },
    {
      id: 'eori',
      label: 'Importer of Record EORI',
      value: MERCENTA_EORI,
      context: 'Held by Mercenta',
    },
    {
      id: 'vat',
      label: 'UK VAT registration',
      value: MERCENTA_VAT,
      context: 'Auto-applied to customs bundles',
    },
  ];

  const reqColumns: ConsoleColumn<ComplianceRequirementRow>[] = [
    {
      key: 'type',
      header: 'Document Requirement',
      mobilePrimary: true,
      render: (r) => (
        <div data-record-id={r.type}>
          <div className="font-medium text-ink-950 capitalize">{r.label}</div>
          {r.blockingReason && <div className="text-[11px] text-ink-600 mt-0.5">{r.blockingReason}</div>}
          {r.verificationSummary && (
            <div className="text-[11px] font-mono text-faint mt-0.5">{r.verificationSummary}</div>
          )}
        </div>
      ),
    },
    {
      key: 'scope',
      header: 'Scope',
      hideOnMobile: true,
      render: (r) => (
        <span className="text-[12px] text-ink-600 capitalize">{r.scope ?? 'universal'}</span>
      ),
    },
    {
      key: 'expiry',
      header: 'Expiry',
      hideOnMobile: true,
      render: (r) => (
        <span className="text-[12px] font-mono text-ink-600">{r.expiryLabel ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => {
        const pres = complianceDocStatusPresentation(r.status);
        return <InlineStatus label={pres.label} tone={pres.tone} dataStatus={pres.dataStatus} />;
      },
    },
    {
      key: 'action',
      header: 'Action',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center gap-2">
          {r.needsReplacement && (
            <button
              type="button"
              onClick={() => onReplaceDoc(r.type)}
              className="px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
            >
              Replace
            </button>
          )}
          {r.status !== 'approved' && (
            <button
              type="button"
              disabled={busyType === r.type}
              onClick={() => onUploadDoc(r.type)}
              className="px-2.5 py-1 rounded bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)] disabled:opacity-40"
            >
              {busyType === r.type ? 'Uploading…' : 'Upload'}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="UK Compliance & Customs"
        description="Mercenta acts as Importer of Record using its UK EORI and VAT numbers. Upload statutory product documents here and confirm auto-generated customs bundles for accepted POs."
      />

      <MetricStrip items={metrics} columns={4} loading={loading} />

      <NoticeBanner
        tone={gateCleared ? 'success' : 'warning'}
        title={gateCleared ? 'Compliance gate cleared' : 'Compliance gate not yet cleared'}
        message={
          gateCleared
            ? 'All required compliance documents and agreements are approved. Catalog submissions are unlocked.'
            : `${remainingBlockers} requirement(s) remain before products can be submitted. Required: ${requiredLabelsSummary}. A signed distribution agreement is also required.`
        }
      />

      {uploadedNotice && <NoticeBanner tone="success" message={uploadedNotice} />}
      {replacementError && <NoticeBanner tone="danger" title="Replacement refused" message={replacementError} />}

      {!hasTenant ? (
        <NoticeBanner tone="info" message="Sign in as a brand partner to manage compliance documents." />
      ) : loading ? (
        <LoadingRows rows={5} label="Loading compliance documents…" />
      ) : (
        <ConsoleTable
          rows={requirements}
          columns={reqColumns}
          rowKey={(r) => r.type}
          emptyTitle="No required documents listed"
          emptyDescription="Select a product category during onboarding to compute UK statutory document requirements."
        />
      )}

      <SectionCard
        title="Auto-Generated Customs Documentation"
        description="Pre-filled from accepted Purchase Orders and product tariff metadata. Review and confirm each bundle."
      >
        {loading ? (
          <LoadingRows rows={3} label="Loading PO customs bundles…" />
        ) : customsGroups.length === 0 ? (
          <p className="text-[12px] text-faint">
            No accepted purchase orders yet — customs bundles generate automatically once a PO is accepted.
          </p>
        ) : (
          <div className="space-y-4">
            {customsGroups.map(({ po, brandName, docs }) => (
              <div key={po.id} className="rounded border border-hairline p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[13px]">
                    <span className="font-mono font-semibold text-ink-950">{po.poNumber}</span>
                    <span className="ml-2 text-ink-600">{brandName}</span>
                  </div>
                  <InlineStatus label={po.status.replace(/_/g, ' ')} tone="info" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {docs.map((doc) => {
                    const confirmed = isCustomsConfirmed(po.id, doc.type);
                    return (
                      <button
                        key={doc.type}
                        type="button"
                        onClick={() => onOpenPreview(po.id, doc)}
                        className={`text-left rounded border p-3 transition-colors ${
                          confirmed
                            ? 'border-state-success/20 bg-state-success/10'
                            : 'border-hairline bg-surface-raised hover:border-hairline-strong'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <FileCheck2 className="w-4 h-4 text-[var(--mr-accent)]" aria-hidden="true" />
                          {confirmed && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-state-success">
                              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                              Confirmed
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-[13px] font-medium text-ink-950">{doc.title}</div>
                        <ul className="mt-1 space-y-0.5 text-[11px] font-mono text-faint">
                          {doc.preFilled.slice(0, 2).map((f) => (
                            <li key={f.label} className="truncate">
                              {f.label}: {f.value}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 text-[11px] font-medium text-[var(--mr-accent)]">
                          {confirmed ? 'Review document' : 'Review & confirm'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SlideOverDrawer
        open={Boolean(previewDoc)}
        onClose={onClosePreview}
        title={previewDoc?.doc.title ?? 'Customs Document'}
        subtitle={previewDoc ? `PO ${previewDoc.poId} — pre-filled Importer of Record copy` : undefined}
        footer={
          previewDoc && (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClosePreview}
                className="px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-secondary"
              >
                Close
              </button>
              {isCustomsConfirmed(previewDoc.poId, previewDoc.doc.type) ? (
                <span className="text-[12px] font-medium text-state-success">Already Confirmed</span>
              ) : (
                <button
                  type="button"
                  onClick={onConfirmPreview}
                  className="px-3.5 py-1.5 rounded bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)]"
                >
                  Confirm Pre-Filled Values
                </button>
              )}
            </div>
          )
        }
      >
        {previewDoc && (
          <iframe
            title={previewDoc.doc.title}
            srcDoc={previewDoc.doc.html}
            className="w-full h-[65vh] border border-hairline rounded bg-surface-raised"
          />
        )}
      </SlideOverDrawer>
    </div>
  );
}
