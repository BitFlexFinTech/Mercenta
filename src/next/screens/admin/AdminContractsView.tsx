import { useMemo, useState } from 'react';
import type { Contract, FulfillmentTrack } from '@/types';
import {
  ConsoleTable,
  EmptyStateBlock,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  MetricStrip,
  PageHeader,
  SlideOverDrawer,
  type ConsoleColumn,
  type SemanticTone,
} from '@/next/components/ConsolePrimitives';
import { ConsoleTabs, NoticeBanner, SectionCard, formatGbp } from '@/next/components/ConsoleCharts';

export interface AdminContractRow {
  id: string;
  brandId: string;
  brandName: string;
  brandCategory: string;
  type: string;
  commissionRate: number;
  monthlyFee: number;
  fulfillmentTrack: FulfillmentTrack;
  trackLabel: string;
  status: Contract['status'];
  statusLabel: string;
  statusTone: SemanticTone;
  effectiveDate: string;
  renewalDate: string;
  urgency: 'ok' | '60d' | '30d' | '7d' | 'expired';
  signatoriesCount: number;
  version: number;
  agreementPreview: string;
  raw: Contract;
}

export interface ContractBrandOption {
  id: string;
  businessName: string;
  category: string;
  defaultRate: number;
  defaultFee: number;
  defaultTrack: FulfillmentTrack;
}

export interface AdminContractsViewProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  canMutate: boolean;
  esignLive: boolean;
  lastEnvelope: string | null;
  rows: AdminContractRow[];
  brandOptions: ContractBrandOption[];
  statusOptions: { id: string; label: string }[];
  statusFilter: string;
  onStatusFilterChange: (next: string) => void;
  searchQuery: string;
  onSearchQueryChange: (next: string) => void;
  selectedContract: AdminContractRow | null;
  onSelectContract: (row: AdminContractRow | null) => void;
  brandVersions: AdminContractRow[];
  trackLabels: Record<FulfillmentTrack, string>;
  buildAgreementText: (params: {
    businessName: string;
    commissionRate: number;
    monthlyFee: number;
    category: string;
    fulfillmentTrack: FulfillmentTrack;
  }) => string;
  onCreateContract: (params: {
    brand: ContractBrandOption;
    rate: number;
    fee: number;
    track: FulfillmentTrack;
    previewText: string;
  }) => Promise<void>;
  onCreateRenewalDraft: (contract: Contract) => void;
  onCreateAmendment: (contract: Contract) => void;
  onRenew: (contractId: string) => void;
  onTerminate: (contractId: string) => void;
}

function urgencyBadge(urgency: AdminContractRow['urgency']) {
  if (urgency === 'ok') return null;
  const tone: SemanticTone =
    urgency === 'expired' || urgency === '7d'
      ? 'danger'
      : urgency === '30d'
        ? 'warning'
        : 'info';
  const label = urgency === 'expired' ? 'Expired' : `≤ ${urgency.replace('d', '')} days`;
  return <InlineStatus label={label} tone={tone} dataStatus={urgency} />;
}

export function AdminContractsView({
  loading,
  error,
  onRetry,
  canMutate,
  esignLive,
  lastEnvelope,
  rows,
  brandOptions,
  statusOptions,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange,
  selectedContract,
  onSelectContract,
  brandVersions,
  trackLabels,
  buildAgreementText,
  onCreateContract,
  onCreateRenewalDraft,
  onCreateAmendment,
  onRenew,
  onTerminate,
}: AdminContractsViewProps) {
  const [drawerTab, setDrawerTab] = useState<'document' | 'history'>('document');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState(brandOptions[0]?.id ?? '');
  const [draftRate, setDraftRate] = useState('');
  const [draftFee, setDraftFee] = useState('');
  const [draftTrack, setDraftTrack] = useState<FulfillmentTrack>('financed');
  const [busy, setBusy] = useState(false);

  const generateBrand = useMemo(
    () => brandOptions.find((b) => b.id === selectedBrandId) ?? brandOptions[0] ?? null,
    [brandOptions, selectedBrandId]
  );

  function openGenerate() {
    const target = brandOptions[0];
    if (target) {
      setSelectedBrandId(target.id);
      setDraftRate(String(target.defaultRate));
      setDraftFee(String(target.defaultFee));
      setDraftTrack(target.defaultTrack);
    }
    setGenerateOpen(true);
  }

  function handleBrandSelect(brandId: string) {
    setSelectedBrandId(brandId);
    const target = brandOptions.find((b) => b.id === brandId);
    if (target) {
      setDraftRate(String(target.defaultRate));
      setDraftFee(String(target.defaultFee));
      setDraftTrack(target.defaultTrack);
    }
  }

  const previewText = useMemo(() => {
    if (!generateBrand) return '';
    return buildAgreementText({
      businessName: generateBrand.businessName,
      commissionRate: Number(draftRate) || 0,
      monthlyFee: Number(draftFee) || 0,
      category: generateBrand.category,
      fulfillmentTrack: draftTrack === 'unassigned' ? 'financed' : draftTrack,
    });
  }, [generateBrand, draftRate, draftFee, draftTrack, buildAgreementText]);

  const activeCount = rows.filter((r) => r.status === 'active' || r.status === 'signed').length;
  const draftCount = rows.filter((r) => r.status === 'draft').length;
  const urgentCount = rows.filter((r) => r.urgency !== 'ok').length;

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        r.brandName.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.statusLabel.toLowerCase().includes(q) ||
        r.renewalDate.toLowerCase().includes(q)
      );
    });
  }, [rows, statusFilter, searchQuery]);

  const columns: ConsoleColumn<AdminContractRow>[] = [
    {
      key: 'brand',
      header: 'Brand',
      mobilePrimary: true,
      render: (r) => (
        <div>
          <div className="font-medium text-ink-950">{r.brandName}</div>
          <div className="text-[11px] font-mono text-faint">v{r.version}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (r) => <span className="capitalize text-secondary">{r.type.replace(/_/g, ' ')}</span>,
    },
    {
      key: 'commissionRate',
      header: 'Comm.',
      align: 'right',
      render: (r) => <span className="font-mono">{r.commissionRate}%</span>,
    },
    {
      key: 'monthlyFee',
      header: 'Fee',
      align: 'right',
      render: (r) => <span className="font-mono">{formatGbp(r.monthlyFee)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <InlineStatus label={r.statusLabel} tone={r.statusTone} dataStatus={r.status} />
      ),
    },
    {
      key: 'renewal',
      header: 'Renewal',
      align: 'right',
      render: (r) => (
        <div className="inline-flex items-center justify-end gap-2">
          <span className="font-mono text-[12px] text-secondary">{r.renewalDate}</span>
          {urgencyBadge(r.urgency)}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contract Cycle"
        description="Full distribution agreement lifecycle — generate from canonical terms, dispatch e-signature envelopes, and process renewals or terminations."
        meta={
          <>
            <span>{rows.length} contracts</span>
            <span>{activeCount} active/signed</span>
            <span>{esignLive ? 'E-signature live' : 'E-signature mock mode'}</span>
          </>
        }
        actions={
          <button
            type="button"
            disabled={brandOptions.length === 0 || !canMutate}
            onClick={openGenerate}
            className="px-3.5 py-2 rounded-md bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)] disabled:opacity-40 whitespace-nowrap"
          >
            New contract
          </button>
        }
      />

      {!esignLive && (
        <NoticeBanner
          tone="warning"
          title="E-signature running in simulation (Mock) mode"
          message="Generated envelopes use mock:env-… identifiers until DocuSign or PandaDoc is verified in Integration Settings."
        />
      )}

      {lastEnvelope && (
        <NoticeBanner
          tone="success"
          title="E-sign envelope sent"
          message={
            <span>
              Last envelope id: <code className="font-mono">{lastEnvelope}</code>
            </span>
          }
        />
      )}

      {error && <ErrorStateBlock message={error} onRetry={onRetry} />}

      <MetricStrip
        loading={loading}
        columns={4}
        items={[
          {
            id: 'contracts-total',
            label: 'Total contracts',
            value: String(rows.length),
            context: 'Canonical store agreements',
            active: statusFilter === 'all',
            onClick: () => onStatusFilterChange('all'),
          },
          {
            id: 'contracts-active',
            label: 'Active / Signed',
            value: String(activeCount),
            context: 'In-force terms',
            active: statusFilter === 'active',
            onClick: () => onStatusFilterChange('active'),
          },
          {
            id: 'contracts-drafts',
            label: 'Drafts',
            value: String(draftCount),
            context: 'Awaiting completion',
            active: statusFilter === 'draft',
            onClick: () => onStatusFilterChange('draft'),
          },
          {
            id: 'contracts-urgent',
            label: 'Renewal attention',
            value: String(urgentCount),
            context: 'Within 60 days or expired',
            onClick: () => onStatusFilterChange('all'),
          },
        ]}
      />

      <SectionCard
        title="Agreements"
        description="Select a row to inspect the distribution agreement text, version history, or advance renewal/termination."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search brand, type, renewal…"
              aria-label="Search contracts"
              className="w-56 px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-ink-950"
            />
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              aria-label="Filter contracts by status"
              className="px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-ink-950"
            >
              <option value="all">Status: all</option>
              {statusOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {loading ? (
          <LoadingRows rows={5} label="Loading contracts…" />
        ) : filtered.length === 0 ? (
          <EmptyStateBlock
            title="No contracts match"
            description="Clear the status filter or search query to inspect all contracts."
            actionLabel="Reset filters"
            onAction={() => {
              onStatusFilterChange('all');
              onSearchQueryChange('');
            }}
          />
        ) : (
          <ConsoleTable
            rows={filtered}
            columns={columns}
            rowKey={(r) => r.id}
            selectedKey={selectedContract?.id ?? null}
            onRowClick={(r) => {
              setDrawerTab('document');
              onSelectContract(r);
            }}
            testId="contract-cycle-table"
          />
        )}
      </SectionCard>

      {/* Contract detail slide-over drawer */}
      <SlideOverDrawer
        open={selectedContract !== null}
        onClose={() => onSelectContract(null)}
        title={
          selectedContract
            ? `${selectedContract.type.replace(/_/g, ' ')} — ${selectedContract.brandName}`
            : ''
        }
        subtitle={
          selectedContract
            ? `v${selectedContract.version} · ${selectedContract.statusLabel} · ${selectedContract.trackLabel}`
            : undefined
        }
        testId="contract-detail-drawer"
        footer={
          selectedContract ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {canMutate && selectedContract.status !== 'draft' && (
                  <button
                    type="button"
                    onClick={() => onCreateRenewalDraft(selectedContract.raw)}
                    className="px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
                  >
                    Create renewal draft
                  </button>
                )}
                {canMutate && selectedContract.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => onCreateAmendment(selectedContract.raw)}
                    className="px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
                  >
                    Track amendment
                  </button>
                )}
                {canMutate && selectedContract.status !== 'terminated' && (
                  <button
                    type="button"
                    onClick={() => onRenew(selectedContract.id)}
                    className="px-2.5 py-1.5 rounded bg-ink-950 text-on-dark text-[12px] font-medium hover:bg-ink-800"
                  >
                    Renew (advance term)
                  </button>
                )}
                {canMutate && selectedContract.status !== 'terminated' && (
                  <button
                    type="button"
                    onClick={() => onTerminate(selectedContract.id)}
                    className="px-2.5 py-1.5 rounded border border-state-danger/20 bg-state-danger/10 text-state-danger text-[12px] font-medium hover:bg-red-100"
                  >
                    Terminate
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => onSelectContract(null)}
                className="px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-secondary hover:bg-surface"
              >
                Close
              </button>
            </div>
          ) : undefined
        }
      >
        {selectedContract && (
          <div className="space-y-4">
            <ConsoleTabs
              ariaLabel="Contract detail views"
              value={drawerTab}
              onChange={setDrawerTab}
              tabs={[
                { id: 'document', label: 'Agreement Document' },
                { id: 'history', label: 'Version History', count: brandVersions.length },
              ]}
            />

            {drawerTab === 'document' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-[12px] border border-hairline rounded-md p-3 bg-surface/60">
                  <div>
                    <div className="text-faint">Commission</div>
                    <div className="font-mono font-medium text-ink-950">
                      {selectedContract.commissionRate}%
                    </div>
                  </div>
                  <div>
                    <div className="text-faint">Monthly Fee</div>
                    <div className="font-mono font-medium text-ink-950">
                      {formatGbp(selectedContract.monthlyFee)}
                    </div>
                  </div>
                  <div>
                    <div className="text-faint">Effective</div>
                    <div className="font-mono text-ink-950">{selectedContract.effectiveDate}</div>
                  </div>
                  <div>
                    <div className="text-faint">Renewal</div>
                    <div className="font-mono text-ink-950">{selectedContract.renewalDate}</div>
                  </div>
                </div>
                <pre className="whitespace-pre-wrap rounded-md border border-hairline bg-surface p-4 text-[12px] leading-relaxed text-ink-900 font-mono">
                  {selectedContract.agreementPreview}
                </pre>
              </div>
            ) : (
              <div className="space-y-2.5">
                <p className="text-[12px] text-ink-600">
                  {brandVersions.length} version(s) of {selectedContract.brandName}&rsquo;s distribution agreement.
                </p>
                {brandVersions.map((v) => (
                  <div
                    key={v.id}
                    className={`border rounded-md p-3 text-[12px] ${
                      v.version === selectedContract.version
                        ? 'border-ink-900 bg-surface'
                        : 'border-hairline bg-surface-raised'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink-950">
                        Version {v.version}
                        {v.version === selectedContract.version ? ' (Current)' : ''}
                      </span>
                      <InlineStatus label={v.statusLabel} tone={v.statusTone} />
                    </div>
                    <div className="mt-1 text-ink-600 font-mono">
                      {v.commissionRate}% commission · {formatGbp(v.monthlyFee)}/mo · {v.trackLabel}
                    </div>
                    <div className="mt-1 text-faint">
                      Effective {v.effectiveDate} · Renewal {v.renewalDate}
                      {v.signatoriesCount > 0 ? ` · ${v.signatoriesCount} signatory(s)` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </SlideOverDrawer>

      {/* Generate new contract slide-over drawer */}
      <SlideOverDrawer
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="New Distribution Contract"
        subtitle={
          generateBrand ? `Pre-filled from ${generateBrand.businessName} fulfillment terms` : undefined
        }
        testId="contract-generate-drawer"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setGenerateOpen(false)}
              className="px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-secondary hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!generateBrand || busy}
              onClick={async () => {
                if (!generateBrand) return;
                setBusy(true);
                try {
                  await onCreateContract({
                    brand: generateBrand,
                    rate: Number(draftRate) || 0,
                    fee: Number(draftFee) || 0,
                    track: draftTrack,
                    previewText,
                  });
                  setGenerateOpen(false);
                } finally {
                  setBusy(false);
                }
              }}
              className="px-3.5 py-1.5 rounded bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)] disabled:opacity-40"
            >
              {esignLive ? 'Create & send for e-signature' : 'Create & send (Mock E-Signature)'}
            </button>
          </div>
        }
      >
        {generateBrand ? (
          <div className="space-y-4">
            <label className="block text-[12px]">
              <span className="text-ink-600 font-medium block mb-1">Partner Brand</span>
              <select
                value={generateBrand.id}
                onChange={(e) => handleBrandSelect(e.target.value)}
                className="w-full px-2.5 py-2 rounded border border-hairline-strong bg-surface-raised text-[12px] text-ink-950"
              >
                {brandOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.businessName} ({b.category})
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="block text-[12px]">
                <span className="text-ink-600 font-medium block mb-1">Commission (%)</span>
                <input
                  type="number"
                  value={draftRate}
                  onChange={(e) => setDraftRate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] font-mono text-ink-950"
                />
              </label>
              <label className="block text-[12px]">
                <span className="text-ink-600 font-medium block mb-1">Monthly Fee (£)</span>
                <input
                  type="number"
                  value={draftFee}
                  onChange={(e) => setDraftFee(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] font-mono text-ink-950"
                />
              </label>
              <label className="block text-[12px]">
                <span className="text-ink-600 font-medium block mb-1">Track</span>
                <select
                  value={draftTrack}
                  onChange={(e) => setDraftTrack(e.target.value as FulfillmentTrack)}
                  className="w-full px-2.5 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] text-ink-950"
                >
                  <option value="direct_fulfillment">{trackLabels.direct_fulfillment}</option>
                  <option value="financed">{trackLabels.financed}</option>
                  <option value="unassigned">{trackLabels.unassigned}</option>
                </select>
              </label>
            </div>

            <pre className="whitespace-pre-wrap rounded-md border border-hairline bg-surface p-3 text-[12px] leading-relaxed text-ink-900 font-mono max-h-72 overflow-y-auto">
              {previewText}
            </pre>
          </div>
        ) : (
          <EmptyStateBlock
            title="No brands available"
            description="At least one partner brand is required to generate an agreement."
          />
        )}
      </SlideOverDrawer>
    </div>
  );
}
