/**
 * §P8 — BRAND INVENTORY (programme decision 5), linked to the catalogue.
 *
 * Per catalogue product: image · SKU · ASIN · available · UoM (Eaches/Cases) ·
 * on-hand · committed · inbound · safety stock — entered INSIDE Mercenta, never
 * by logging into a retail channel.
 *
 * Everything shown is DERIVED from the canonical append-only ledger
 * (`src/lib/inventory/inventoryRecord.ts` — the ONE owner). The surface never
 * re-derives a stock figure and never invents an identifier: the ASIN is the
 * brand's own declaration for a product that already exists on the channel, or
 * the value Mercenta recorded from the channel's acceptance.
 *
 * HONEST LIMITS, stated on the surface itself: the figures are Mercenta's own
 * model (no Vendor inventory-availability API exists) and the ledger is
 * in-memory in this environment.
 */
import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useCanonicalStoreVersion } from '@/data/queries';
import { Badge, Button, Card, Checkbox, DataTable, Input, Select } from '@/components/ui';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { cn } from '@/utils/cn';
import { PackageSearch } from 'lucide-react';
import type { InventoryMovementType, InventoryUom } from '@/types';
import {
  declareBrandAsin,
  inventorySummaryForBrand,
  listBrandInventory,
  listInventoryMovements,
  recordStockMovement,
  setInventorySettings,
  type InventoryActor,
} from '@/lib/inventory/inventoryLifecycle';
import {
  INVENTORY_DERIVATION_BASIS,
  INVENTORY_MOVEMENT_TYPES,
  INVENTORY_MOVEMENT_TYPE_LABELS,
  INVENTORY_RULES,
  INVENTORY_STATUS_LABELS,
  INVENTORY_UOMS,
  INVENTORY_UOM_LABELS,
  INVENTORY_UOM_SOURCE,
  type MovementRequest,
} from '@/lib/inventory/inventoryRecord';
import {
  ASIN_RULES,
  ASIN_RULE_SOURCE,
  ASIN_SOURCE_LABELS,
  ASIN_STATE_LABELS,
} from '@/lib/catalog/asin';

const MONO = 'font-mono text-ds-label';

/** The status pill colours, so the derived status reads at a glance. */
const STATUS_TONE: Record<string, string> = {
  in_stock: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  below_safety_stock: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  out_of_stock: 'bg-red-500/15 text-red-300 border-red-500/20',
};

export function BrandInventory() {
  const { session, products } = useApp();
  const version = useCanonicalStoreVersion();
  void version; // canonical store change signal → re-read the derived rows

  const brandId = session?.tier === 'brand' ? session.tenantId ?? null : null;
  const actor = useMemo<InventoryActor>(
    () => ({ staffId: `brand:${brandId ?? 'none'}`, canMutate: true, tenantId: brandId ?? undefined }),
    [brandId]
  );

  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<InventoryMovementType>('receipt');
  const [quantity, setQuantity] = useState('10');
  const [entryUom, setEntryUom] = useState<InventoryUom>('eaches');
  const [reason, setReason] = useState('');
  const [asinInput, setAsinInput] = useState('');
  const [existsOnChannel, setExistsOnChannel] = useState(false);
  const [safetyStock, setSafetyStock] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(() => {
    void version; // canonical store change signal → re-read the derived rows
    return brandId ? listBrandInventory(brandId, actor) : { ok: false as const, error: 'NO_TENANT' };
  }, [brandId, actor, version]);
  const summary = useMemo(() => {
    void version;
    return brandId ? inventorySummaryForBrand(brandId, actor) : { ok: false as const, error: 'NO_TENANT' };
  }, [brandId, actor, version]);

  const records = list.ok ? list.value : [];
  const totals = summary.ok ? summary.value : undefined;
  const selected = records.find((r) => r.sku === selectedSku) ?? null;
  /** The provenance behind the selected product's figures (the ledger itself). */
  const ledgerResult =
    selected && brandId ? listInventoryMovements(brandId, selected.sku, actor) : undefined;
  const ledger = ledgerResult?.ok ? ledgerResult.value : [];

  /** ONE outcome handler, so a refusal is never silently swallowed. */
  function run(label: string, fn: () => { ok: boolean; error?: string }, describe?: () => string) {
    setNotice(null);
    setError(null);
    const res = fn();
    if (!res.ok) {
      setError(`${label}: ${res.error ?? 'refused'}`);
      return false;
    }
    setNotice(`${label}: ${describe ? describe() : 'recorded'}`);
    return true;
  }

  /** Record one stock movement for the selected product. */
  function handleMovement() {
    if (!brandId || !selected) return;
    run(
      'Stock movement',
      () =>
        recordStockMovement(
          {
            brandId,
            sku: selected.sku,
            type: movementType,
            quantity: Number(quantity),
            uom: entryUom,
            reason,
            bucket: movementType === 'adjustment' ? 'on_hand' : undefined,
          },
          actor
        ),
      () => `${selected.sku}: ${INVENTORY_MOVEMENT_TYPE_LABELS[movementType]} recorded`
    );
  }

  /** Save the brand's own unit + reorder trigger for the selected product. */
  function handleSettings() {
    if (!brandId || !selected) return;
    run(
      'Inventory settings',
      () =>
        setInventorySettings(
          { brandId, sku: selected.sku, uom: entryUom, safetyStock: Number(safetyStock) },
          actor
        ),
      () => `${selected.sku}: settings saved`
    );
  }

  /** DECISION 10 — the brand supplies the identifier for an existing listing. */
  function handleDeclareAsin() {
    if (!brandId || !selected) return;
    run(
      'Channel identifier',
      () =>
        declareBrandAsin(
          {
            brandId,
            sku: selected.sku,
            asin: asinInput,
            productExistsOnChannel: existsOnChannel,
          },
          actor
        ),
      () => `${selected.sku}: identifier recorded`
    );
  }

  if (!brandId) {
    return (
      <WorkspaceFrame className="space-y-4">
        <WorkspaceHeader
          eyebrow="BRAND PORTAL · CATALOGUE"
          title="Inventory"
          description="Inventory is linked to your catalogue and is kept here, inside Mercenta."
        />
        <Card className="p-4 text-sm text-zinc-400">Sign in as a brand to see your inventory.</Card>
      </WorkspaceFrame>
    );
  }

  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="BRAND PORTAL · CATALOGUE"
        title="Inventory"
        description="Stock and the channel identifier for every product in your catalogue — recorded inside Mercenta, never in a retail-channel login."
      />

      {/* The derived roll-up. Every figure is the ledger's own sum. */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-strong">Inventory position</h3>
            <p className="text-ds-label text-zinc-500">
              Derived from the movement ledger · {INVENTORY_UOM_SOURCE}
            </p>
          </div>
          <Badge className="text-ds-micro bg-brass-500/15 text-brass-400 border-brass-500/20">
            Mercenta’s own model
          </Badge>
        </div>
        {totals && (
          <div
            data-testid="inventory-summary"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
          >
            {[
              { label: 'Products', value: totals.products },
              { label: 'Units on hand', value: totals.unitsOnHand },
              { label: 'Committed', value: totals.unitsCommitted },
              { label: 'Inbound', value: totals.unitsInbound },
              { label: 'Available', value: totals.unitsAvailable },
              { label: 'Below safety stock', value: totals.belowSafetyStock },
            ].map((tile) => (
              <div
                key={tile.label}
                className="bg-tint border border-hairline rounded-ds-md p-3"
              >
                <div className="text-ds-micro uppercase tracking-wide text-zinc-500">{tile.label}</div>
                <div className="text-lg font-semibold text-strong tabular-nums">{tile.value}</div>
              </div>
            ))}
          </div>
        )}
        <p className="text-ds-label text-zinc-500 leading-relaxed">{INVENTORY_DERIVATION_BASIS}</p>
      </Card>

      {error && (
        <div
          data-testid="inventory-error"
          className="bg-red-500/10 border border-red-500/20 rounded-ds-md p-3 text-xs text-red-300"
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          data-testid="inventory-notice"
          className="bg-tint border border-hairline rounded-ds-md p-3 text-xs text-zinc-300"
        >
          {notice}
        </div>
      )}

      <Card>
        <DataTable
          dataTable="brand-inventory"
          caption="Inventory by catalogue product"
          rows={records}
          rowKey={(r) => r.sku}
          emptyMessage="No products in your catalogue yet."
          columns={[
            {
              key: 'product',
              label: 'Product',
              primary: true,
              render: (r) => {
                const p = products.find((x) => x.sku === r.sku);
                return (
                  <div className="flex items-center gap-2.5">
                    {/* §Wave-3 Part 4 — the raw `image` value was painted as TEXT
                        here (a `picsum.photos` URL for a seeded product), so a
                        ~45-character URL overflowed this 32px box as garbled
                        overlapping text. It renders through the ONE owner
                        (`ProductThumb`, §Wave-3 Part 3) like every other surface,
                        so a URL becomes an <img> and a missing image becomes the
                        neutral icon — never text. */}
                    <ProductThumb product={p ?? { name: r.sku }} size={32} className="rounded-ds-md" />
                    <div>
                      <div className="text-sm font-medium text-strong">{p?.name ?? r.sku}</div>
                      <div className={cn(MONO, 'text-zinc-500')}>{r.sku}</div>
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'asin',
              label: 'ASIN',
              render: (r) => (
                <div data-testid={`inventory-asin-${r.sku}`}>
                  {r.asin ? (
                    <>
                      <div className={cn(MONO, 'text-zinc-300')}>{r.asin}</div>
                      <div className="text-ds-micro text-zinc-500">
                        {r.asinSource ? ASIN_SOURCE_LABELS[r.asinSource] : ''}
                        {r.asinSimulated ? ' (simulated placeholder)' : ''}
                      </div>
                    </>
                  ) : (
                    <div className="text-ds-label text-zinc-500">
                      {ASIN_STATE_LABELS[r.identifierState]}
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'uom',
              label: 'UoM',
              render: (r) => <span className="text-xs text-zinc-400">{INVENTORY_UOM_LABELS[r.uom]}</span>,
            },
            {
              key: 'onHand',
              label: 'On hand',
              align: 'right',
              render: (r) => (
                <span
                  data-testid={`inventory-onhand-${r.sku}`}
                  className={cn(MONO, 'text-zinc-200 tabular-nums')}
                >
                  {r.onHand}
                </span>
              ),
            },
            {
              key: 'committed',
              label: 'Committed',
              align: 'right',
              render: (r) => <span className={cn(MONO, 'text-zinc-400 tabular-nums')}>{r.committed}</span>,
            },
            {
              key: 'inbound',
              label: 'Inbound',
              align: 'right',
              render: (r) => <span className={cn(MONO, 'text-zinc-400 tabular-nums')}>{r.inbound}</span>,
            },
            {
              key: 'available',
              label: 'Available',
              align: 'right',
              render: (r) => (
                <span
                  data-testid={`inventory-available-${r.sku}`}
                  className={cn(MONO, 'tabular-nums', r.available < 0 ? 'text-red-300' : 'text-strong')}
                >
                  {r.available}
                </span>
              ),
            },
            {
              key: 'safety',
              label: 'Safety stock',
              align: 'right',
              hideBelow: 'lg',
              render: (r) => (
                <span className={cn(MONO, 'text-zinc-400 tabular-nums')}>{r.safetyStock}</span>
              ),
            },
            {
              key: 'status',
              label: 'Status',
              render: (r) => (
                <span
                  data-testid={`inventory-status-${r.sku}`}
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 text-ds-micro',
                    STATUS_TONE[r.status] ?? 'bg-tint text-zinc-300 border-hairline'
                  )}
                >
                  {INVENTORY_STATUS_LABELS[r.status]}
                </span>
              ),
            },
            {
              key: 'actions',
              label: '',
              render: (r) => (
                <Button
                  variant="ghost"
                  className="text-xs"
                  onClick={() => {
                    setSelectedSku(r.sku);
                    setEntryUom(r.uom);
                    setReason('');
                    setAsinInput('');
                    setExistsOnChannel(false);
                    setSafetyStock(String(r.safetyStock));
                    setNotice(null);
                    setError(null);
                  }}
                >
                  <PackageSearch className="w-3.5 h-3.5 mr-1" /> Manage
                </Button>
              ),
            },
          ]}
        />
      </Card>

      {/* The management panel for ONE product — a rules-of-hooks-safe single form
          rather than a form per row. */}
      {selected && (
        <Card className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-strong">
                Manage stock — <span className={MONO}>{selected.sku}</span>
              </h3>
              <p className="text-ds-label text-zinc-500">
                On hand {selected.onHand} · committed {selected.committed} · inbound {selected.inbound}{' '}
                · available {selected.available} eaches
              </p>
            </div>
            <Button variant="ghost" className="text-xs" onClick={() => setSelectedSku(null)}>
              Close
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* 1 — a stock movement: the ONLY way a figure changes. */}
            <div className="space-y-2" data-testid="inventory-movement-form">
              <div className="text-xs font-medium text-zinc-300">Record a movement</div>
              <Select
                label="Movement"
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as InventoryMovementType)}
                options={INVENTORY_MOVEMENT_TYPES.map((t) => ({
                  value: t,
                  label: INVENTORY_MOVEMENT_TYPE_LABELS[t],
                }))}
              />
              <Input
                label="Quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
              <Select
                label="Unit of measure"
                value={entryUom}
                onChange={(e) => setEntryUom(e.target.value as InventoryUom)}
                options={INVENTORY_UOMS.map((u) => ({
                  value: u,
                  label: INVENTORY_UOM_LABELS[u],
                }))}
              />
              <Input
                label={movementType === 'adjustment' ? 'Reason (required)' : 'Note (optional)'}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  movementType === 'adjustment' ? 'Why the count differs' : 'Optional context'
                }
              />
              <Button className="text-xs" onClick={handleMovement}>
                Record movement
              </Button>
            </div>

            {/* 2 — the brand's own unit + reorder trigger. */}
            <div className="space-y-2" data-testid="inventory-settings-form">
              <div className="text-xs font-medium text-zinc-300">Safety stock</div>
              <Input
                label="Safety stock (eaches)"
                type="number"
                value={safetyStock}
                onChange={(e) => setSafetyStock(e.target.value)}
              />
              <Button className="text-xs" onClick={handleSettings}>
                Save settings
              </Button>
              <p className="text-ds-label text-zinc-500">
                Available = on hand − committed (eaches). Below the trigger ⇒ “below safety stock”.
              </p>
            </div>

            {/* 3 — decision 10: the brand's half of the identifier rule. */}
            <div className="space-y-2" data-testid="inventory-asin-form">
              <div className="text-xs font-medium text-zinc-300">Channel identifier</div>
              <Input
                label="ASIN"
                value={asinInput}
                onChange={(e) => setAsinInput(e.target.value)}
                placeholder="10 alphanumeric characters"
              />
              <Checkbox
                label="This product already exists on the channel"
                checked={existsOnChannel}
                onChange={setExistsOnChannel}
              />
              <Button variant="accent" className="text-xs" onClick={handleDeclareAsin}>
                Add ASIN
              </Button>
              <p className="text-ds-label text-zinc-500">
                {selected.asin
                  ? `Recorded: ${selected.asin} — ${selected.asinSource ? ASIN_SOURCE_LABELS[selected.asinSource] : ''}`
                  : ASIN_STATE_LABELS[selected.identifierState]}
              </p>
            </div>
          </div>

          {/* The provenance: the ledger behind the figures above. */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-300">
              Movement ledger ({selected.movementCount} recorded)
            </div>
            <ul
              data-testid="inventory-ledger"
              className="max-h-48 overflow-y-auto space-y-1 text-ds-label text-zinc-400"
            >
              {[...ledger].reverse().map((m) => (
                <li key={m.id} className="flex flex-wrap gap-x-3">
                  <span className={MONO}>{m.recordedAt.slice(0, 10)}</span>
                  <span>{INVENTORY_MOVEMENT_TYPE_LABELS[m.type]}</span>
                  <span className={cn(MONO, 'tabular-nums')}>
                    {m.quantityDelta > 0 ? '+' : ''}
                    {m.quantityDelta}
                  </span>
                  <span className="text-zinc-500">
                    {m.enteredQuantity} {INVENTORY_UOM_LABELS[m.enteredUom]}
                    {m.enteredUom === 'cases' ? ` × ${m.unitsPerCaseUsed}` : ''}
                  </span>
                  {m.reason && <span className="text-zinc-500">— {m.reason}</span>}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      {/* The rule, stated where the figures and the identifier are handled. */}
      <Card className="p-4 space-y-2">
        <div className="text-xs font-semibold text-strong">How these figures work</div>
        <ul data-testid="inventory-rules" className="space-y-1 text-ds-label text-zinc-400">
          {INVENTORY_RULES.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
        <div data-testid="inventory-asin-rules" className="pt-1 space-y-1">
          <div className="text-ds-label text-zinc-500">{ASIN_RULE_SOURCE}</div>
          <ul className="space-y-1 text-ds-label text-zinc-400">
            {ASIN_RULES.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
        </div>
        <p className="text-ds-label text-zinc-500">
          The movement ledger is held in memory in this environment; nothing here contacts a retail
          channel.
        </p>
      </Card>
    </WorkspaceFrame>
  );
}