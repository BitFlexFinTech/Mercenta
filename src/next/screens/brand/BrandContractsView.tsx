import { Download, Eye } from 'lucide-react';
import {
  ConsoleTable,
  ErrorStateBlock,
  InlineStatus,
  LoadingRows,
  SlideOverDrawer,
  type ConsoleColumn,
} from '@/next/components/ConsolePrimitives';
import { ConsolePageHeader } from '@/next/components/ConsolePageHeader';
import { CONTRACT_STATUS_LABELS, renewalUrgency } from '@/lib/contracts';
import type { Contract } from '@/types';

export interface BrandContractsViewProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  contracts: Contract[];
  nowIso: string;
  viewingContract: Contract | null;
  viewingText: string;
  onOpenContract: (id: string) => void;
  onCloseContract: () => void;
  onDownloadContract: (contract: Contract) => void;
}

export function BrandContractsView({
  loading,
  error,
  onRetry,
  contracts,
  nowIso,
  viewingContract,
  viewingText,
  onOpenContract,
  onCloseContract,
  onDownloadContract,
}: BrandContractsViewProps) {
  const columns: ConsoleColumn<Contract>[] = [
    {
      key: 'title',
      header: 'Agreement',
      mobilePrimary: true,
      render: (c) => (
        <div>
          <div className="font-medium text-ink-950 capitalize">
            {c.type.replace(/_/g, ' ')} — v{c.version}
          </div>
          <div className="text-[11px] font-mono text-faint">
            Effective {c.effectiveDate || '—'} · Renews {c.renewalDate || '—'}
          </div>
        </div>
      ),
    },
    {
      key: 'track',
      header: 'Track',
      hideOnMobile: true,
      render: (c) => (
        <span className="capitalize text-secondary">{c.fulfillmentTrack.replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'commission',
      header: 'Commission',
      align: 'right',
      render: (c) => `${c.commissionRate}%`,
    },
    {
      key: 'fee',
      header: 'Monthly Fee',
      align: 'right',
      render: (c) => `£${c.monthlyFee}`,
    },
    {
      key: 'urgency',
      header: 'Renewal',
      hideOnMobile: true,
      render: (c) => {
        const u = renewalUrgency(c.renewalDate, nowIso);
        if (u === 'ok') return <span className="text-[12px] text-faint">Current</span>;
        return (
          <InlineStatus
            label={u === 'expired' ? 'Expired' : `Renews ≤ ${u.replace('d', '')}d`}
            tone={u === 'expired' || u === '7d' ? 'danger' : 'warning'}
          />
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <InlineStatus
          label={CONTRACT_STATUS_LABELS[c.status]}
          tone={c.status === 'active' || c.status === 'signed' ? 'success' : 'info'}
          dataStatus={c.status}
        />
      ),
    },
    {
      key: 'open',
      header: '',
      align: 'right',
      render: (c) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenContract(c.id);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
        >
          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          Open
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6" data-testid="brand-contracts">
      <ConsolePageHeader
        title="Contracts"
        description="Your signed distribution agreements, commercial tracks, commission terms, and renewal schedule."
      />

      {error && <ErrorStateBlock message={error} onRetry={onRetry} />}
      {!error && loading && <LoadingRows rows={3} label="Loading distribution contracts…" />}

      {!error && !loading && (
        <ConsoleTable
          rows={contracts}
          columns={columns}
          rowKey={(c) => c.id}
          onRowClick={(c) => onOpenContract(c.id)}
          emptyTitle="No active contracts yet"
          emptyDescription="Your distribution agreement is generated automatically once onboarding completes."
        />
      )}

      <SlideOverDrawer
        open={Boolean(viewingContract)}
        onClose={onCloseContract}
        title={
          viewingContract
            ? `${viewingContract.type.replace(/_/g, ' ')} — v${viewingContract.version}`
            : 'Agreement'
        }
        subtitle={
          viewingContract
            ? `Clause set: ${viewingContract.fulfillmentTrack.replace(/_/g, ' ')}`
            : undefined
        }
        footer={
          viewingContract && (
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onDownloadContract(viewingContract)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-hairline-strong bg-surface-raised text-[12px] font-medium text-ink-900 hover:bg-surface"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Download text copy
              </button>
              <button
                type="button"
                onClick={onCloseContract}
                className="px-3.5 py-1.5 rounded bg-[var(--mr-accent)] text-on-dark text-[12px] font-medium hover:bg-[var(--mr-accent-600)]"
              >
                Done
              </button>
            </div>
          )
        }
      >
        <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-ink-800 bg-surface border border-hairline rounded p-4">
          {viewingText}
        </pre>
      </SlideOverDrawer>
    </div>
  );
}
