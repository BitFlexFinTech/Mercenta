import { useState } from 'react';
import { PackageSearch } from 'lucide-react';
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
  type MetricItem,
} from '@/next/components/ConsolePrimitives';
import { NoticeBanner } from '@/next/components/ConsoleCharts';
import { ProductThumb } from '@/components/shared/ProductThumb';
import {
  INVENTORY_MOVEMENT_TYPES,
  INVENTORY_MOVEMENT_TYPE_LABELS,
  INVENTORY_STATUS_LABELS,
  INVENTORY_UOMS,
  INVENTORY_UOM_LABELS,
} from '@/lib/inventory/inventoryRecord';
import { ASIN_SOURCE_LABELS, ASIN_STATE_LABELS } from '@/lib/catalog/asin';
import type { InventoryMovement, InventoryMovementType, InventoryRecord, InventoryUom, Product } from '@/types';

export interface InventorySummaryTotals {
  products: number;
  unitsOnHand: number;
  unitsCommitted: number;
  unitsInbound: number;
  unitsAvailable: number;
  belowSafetyStock: number;
}

export interface BrandInventoryViewProps {
  hasTenant: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  records: InventoryRecord[];
  products: Product[];
  totals?: InventorySummaryTotals;
  derivationBasis: string;
  uomSource: string;
  selectedSku: string | null;
  onSelectSku: (sku: string | null) => void;
  ledger: InventoryMovement[];
  notice: string | null;
  mutationError: string | null;
  onRecordMovement: (input: {
    sku: string;
    type: InventoryMovementType;
    quantity: number;
    uom: InventoryUom;
    reason: string;
  }) => boolean;
  onSaveSettings: (input: { sku: string; uom: InventoryUom; safetyStock: number }) => boolean;
  onDeclareAsin: (input: {
    sku: string;
    asin: string;
    productExistsOnChannel: boolean;
  }) => boolean;
}

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  in_stock: 'success',
  below_safety_stock: 'warning',
  out_of_stock: 'danger',
};

export function BrandInventoryView({
  hasTenant,
  loading,
  error,
  onRetry,
  records,
  products,
  totals,
  derivationBasis,
  uomSource,
  selectedSku,
  onSelectSku,
  ledger,
  notice,
  mutationError,
  onRecordMovement,
  onSaveSettings,
  onDeclareAsin,
}: BrandInventoryViewProps) {
  const [movementType, setMovementType] = useState<InventoryMovementType>('receipt');
  const [quantity, setQuantity] = useState('10');
  const [entryUom, setEntryUom] = useState<InventoryUom>('eaches');
  const [reason, setReason] = useState('');
  const [safetyStock, setSafetyStock] = useState('0');
  const [asinInput, setAsinInput] = useState('');
  const [existsOnChannel, setExistsOnChannel] = useState(false);

  const selected = records.find((r) => r.sku === selectedSku) ?? null;

  function openManager(r: InventoryRecord) {
    setEntryUom(r.uom);
    setSafetyStock(String(r.safetyStock));
    setReason('');
    setAsinInput('');
    setExistsOnChannel(false);
    onSelectSku(r.sku);
  }

  const metrics: MetricItem[] = totals
    ? [
        { id: 'products', label: 'Products', value: String(totals.products) },
        { id: 'onhand', label: 'Units on hand', value: String(totals.unitsOnHand) },
        { id: 'committed', label: 'Committed', value: String(totals.unitsCommitted) },
        { id: 'inbound', label: 'Inbound', value: String(totals.unitsInbound) },
        { id: 'available', label: 'Available', value: String(totals.unitsAvailable) },
        { id: 'low', label: 'Below safety', value: String(totals.belowSafetyStock) },
      ]
    : [];

  const columns: ConsoleColumn<InventoryRecord>[] = [
    {
      key: 'product',
      header: 'Product',
      mobilePrimary: true,
      render: (r) => {
        const p = products.find((x) => x.sku === r.sku);
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <ProductThumb product={p ?? { name: r.sku }} size={32} className="rounded" />
            <div className="min-w-0">
              <div className="font-medium text-zinc-950 truncate">{p?.name ?? r.sku}</div>
              <div className="text-[12px] font-mono text-zinc-500">{r.sku}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'asin',
      header: 'Channel ASIN',
      render: (r) => (
        <div data-testid={`inventory-asin-${r.sku}`}>
          {r.asin ? (
            <>
              <div className="font-mono text-[12px] text-zinc-950">{r.asin}</div>
              <div className="text-[11px] text-zinc-500">
                {r.asinSource ? ASIN_SOURCE_LABELS[r.asinSource] : ''}
                {r.asinSimulated ? ' (simulated)' : ''}
              </div>
            </>
          ) : (
            <span className="text-[12px] text-zinc-500">{ASIN_STATE_LABELS[r.identifierState]}</span>
          )}
        </div>
      ),
    },
    {
      key: 'uom',
      header: 'UoM',
      hideOnMobile: true,
      render: (r) => <span className="text-[12px] text-zinc-600">{INVENTORY_UOM_LABELS[r.uom]}</span>,
    },
    {
      key: 'onHand',
      header: 'On hand',
      align: 'right',
      render: (r) => <span data-testid={`inventory-onhand-${r.sku}`}>{r.onHand}</span>,
    },
    {
      key: 'committed',
      header: 'Committed',
      align: 'right',
      hideOnMobile: true,
      render: (r) => r.committed,
    },
    {
      key: 'inbound',
      header: 'Inbound',
      align: 'right',
      hideOnMobile: true,
      render: (r) => r.inbound,
    },
    {
      key: 'available',
      header: 'Available',
      align: 'right',
      render: (r) => (
        <span
          data-testid={`inventory-available-${r.sku}`}
          className={r.available < 0 ? 'text-red-800 font-semibold' : 'font-semibold text-zinc-950'}
        >
          {r.available}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <InlineStatus
          label={INVENTORY_STATUS_LABELS[r.status]}
          tone={STATUS_TONE[r.status] ?? 'neutral'}
          dataStatus={r.status}
        />
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (r) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openManager(r);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-200 bg-white text-[12px] font-medium text-zinc-800 hover:bg-zinc-50"
        >
          <PackageSearch className="w-3.5 h-3.5" aria-hidden="true" />
          Manage
        </button>
      ),
    },
  ];

  if (!hasTenant) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Inventory"
          description="Stock and channel identifiers linked to your catalogue inside Mercenta."
        />
        <EmptyStateBlock
          title="Sign in as a brand"
          description="Select a partner brand account to view and manage your inventory ledger."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Stock positions and channel identifiers for every catalogue SKU, derived from Mercenta's append-only movement ledger."
        meta={<span>{uomSource}</span>}
      />

      {totals && <MetricStrip items={metrics} columns={6} loading={loading} />}

      <NoticeBanner tone="info" title="Mercenta ledger model" message={derivationBasis} />

      {mutationError && (
        <NoticeBanner tone="danger" title="Action refused" message={mutationError} />
      )}
      {notice && (
        <NoticeBanner tone="success" title="Ledger updated" message={notice} />
      )}

      {error && <ErrorStateBlock message={error} onRetry={onRetry} />}
      {!error && loading && <LoadingRows rows={6} label="Loading inventory ledger…" />}

      {!error && !loading && (
        <ConsoleTable
          rows={records}
          columns={columns}
          rowKey={(r) => r.sku}
          selectedKey={selectedSku}
          onRowClick={openManager}
          testId="brand-inventory"
          emptyTitle="No products in your catalogue yet"
          emptyDescription="Add products in Product Catalog to start tracking stock movements and ASIN declarations."
        />
      )}

      <SlideOverDrawer
        open={Boolean(selected)}
        onClose={() => onSelectSku(null)}
        title={selected ? `Manage stock — ${selected.sku}` : 'Manage stock'}
        subtitle={
          selected
            ? `On hand ${selected.onHand} · Committed ${selected.committed} · Inbound ${selected.inbound} · Available ${selected.available}`
            : undefined
        }
      >
        {selected && (
          <div className="space-y-6">
            <section className="space-y-3 border-b border-zinc-200 pb-5" data-testid="inventory-movement-form">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-zinc-700">
                1. Record Stock Movement
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                <label className="space-y-1">
                  <span className="text-zinc-600">Movement type</span>
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value as InventoryMovementType)}
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                  >
                    {INVENTORY_MOVEMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {INVENTORY_MOVEMENT_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-600">Quantity</span>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950 tabular-nums"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-600">Unit</span>
                  <select
                    value={entryUom}
                    onChange={(e) => setEntryUom(e.target.value as InventoryUom)}
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                  >
                    {INVENTORY_UOMS.map((u) => (
                      <option key={u} value={u}>
                        {INVENTORY_UOM_LABELS[u]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-600">Reason</span>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Warehouse intake"
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() =>
                  onRecordMovement({
                    sku: selected.sku,
                    type: movementType,
                    quantity: Number(quantity),
                    uom: entryUom,
                    reason,
                  })
                }
                className="px-3.5 py-1.5 rounded bg-[var(--mr-accent)] text-white text-[12px] font-medium hover:bg-[var(--mr-accent-600)]"
              >
                Record movement
              </button>
            </section>

            <section className="space-y-3 border-b border-zinc-200 pb-5">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-zinc-700">
                2. Unit & Reorder Threshold
              </h3>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <label className="space-y-1">
                  <span className="text-zinc-600">Default UoM</span>
                  <select
                    value={entryUom}
                    onChange={(e) => setEntryUom(e.target.value as InventoryUom)}
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950"
                  >
                    {INVENTORY_UOMS.map((u) => (
                      <option key={u} value={u}>
                        {INVENTORY_UOM_LABELS[u]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-zinc-600">Safety stock (eaches)</span>
                  <input
                    type="number"
                    value={safetyStock}
                    onChange={(e) => setSafetyStock(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-zinc-950 tabular-nums"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() =>
                  onSaveSettings({
                    sku: selected.sku,
                    uom: entryUom,
                    safetyStock: Number(safetyStock),
                  })
                }
                className="px-3.5 py-1.5 rounded border border-zinc-300 bg-white text-[12px] font-medium text-zinc-900 hover:bg-zinc-50"
              >
                Save inventory settings
              </button>
            </section>

            <section className="space-y-3 border-b border-zinc-200 pb-5">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-zinc-700">
                3. Declare Existing Channel ASIN
              </h3>
              <div className="space-y-2 text-[12px]">
                <label className="flex items-center gap-2 text-zinc-700">
                  <input
                    type="checkbox"
                    checked={existsOnChannel}
                    onChange={(e) => setExistsOnChannel(e.target.checked)}
                  />
                  Product already exists on retail channel
                </label>
                <input
                  value={asinInput}
                  onChange={(e) => setAsinInput(e.target.value)}
                  placeholder="10-character ASIN (e.g. B08N5WRWNW)"
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-300 bg-white font-mono text-zinc-950"
                />
                <button
                  type="button"
                  onClick={() =>
                    onDeclareAsin({
                      sku: selected.sku,
                      asin: asinInput,
                      productExistsOnChannel: existsOnChannel,
                    })
                  }
                  className="px-3.5 py-1.5 rounded border border-zinc-300 bg-white text-[12px] font-medium text-zinc-900 hover:bg-zinc-50"
                >
                  Record ASIN declaration
                </button>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-zinc-700">
                Movement History ({ledger.length})
              </h3>
              {ledger.length === 0 ? (
                <p className="text-[12px] text-zinc-500">No ledger movements recorded yet.</p>
              ) : (
                <ul className="divide-y divide-zinc-200 border border-zinc-200 rounded-md">
                  {ledger.slice(0, 15).map((m) => (
                    <li key={m.id} className="px-3 py-2 flex items-center justify-between gap-3 text-[12px]">
                      <div className="min-w-0">
                        <div className="font-medium text-zinc-950">
                          {INVENTORY_MOVEMENT_TYPE_LABELS[m.type]} ({m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta} {m.enteredUom})
                        </div>
                        <div className="text-zinc-500 truncate">{m.reason}</div>
                      </div>
                      <span className="font-mono text-[11px] text-zinc-500 shrink-0">
                        {m.recordedAt.slice(0, 10)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </SlideOverDrawer>
    </div>
  );
}
