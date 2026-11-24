import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useCanonicalStoreVersion } from '@/data/queries';
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
  INVENTORY_MOVEMENT_TYPE_LABELS,
  INVENTORY_UOM_SOURCE,
} from '@/lib/inventory/inventoryRecord';
import type { InventoryMovementType, InventoryUom } from '@/types';
import { BrandInventoryView } from './BrandInventoryView';

export function BrandInventoryScreen() {
  const { session, products } = useApp();
  const version = useCanonicalStoreVersion();
  void version;

  const brandId = session?.tier === 'brand' ? session.tenantId ?? null : null;
  const actor = useMemo<InventoryActor>(
    () => ({ staffId: `brand:${brandId ?? 'none'}`, canMutate: true, tenantId: brandId ?? undefined }),
    [brandId]
  );

  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const list = useMemo(() => {
    void version;
    return brandId ? listBrandInventory(brandId, actor) : { ok: false as const, error: 'NO_TENANT' };
  }, [brandId, actor, version]);

  const summary = useMemo(() => {
    void version;
    return brandId ? inventorySummaryForBrand(brandId, actor) : { ok: false as const, error: 'NO_TENANT' };
  }, [brandId, actor, version]);

  const records = list.ok ? list.value : [];
  const totals = summary.ok ? summary.value : undefined;
  const ledgerRes =
    selectedSku && brandId ? listInventoryMovements(brandId, selectedSku, actor) : undefined;
  const ledger = ledgerRes?.ok ? ledgerRes.value : [];

  function runAction(label: string, fn: () => { ok: boolean; error?: string }, successMsg: string): boolean {
    setNotice(null);
    setMutationError(null);
    const res = fn();
    if (!res.ok) {
      setMutationError(`${label}: ${res.error ?? 'Refused'}`);
      return false;
    }
    setNotice(`${label}: ${successMsg}`);
    return true;
  }

  return (
    <BrandInventoryView
      hasTenant={Boolean(brandId)}
      loading={false}
      error={null}
      onRetry={() => {}}
      records={records}
      products={products}
      totals={totals}
      derivationBasis={INVENTORY_DERIVATION_BASIS}
      uomSource={INVENTORY_UOM_SOURCE}
      selectedSku={selectedSku}
      onSelectSku={(sku) => {
        setSelectedSku(sku);
        setNotice(null);
        setMutationError(null);
      }}
      ledger={ledger}
      notice={notice}
      mutationError={mutationError}
      onRecordMovement={({ sku, type, quantity, uom, reason }) => {
        if (!brandId) return false;
        return runAction(
          'Stock movement',
          () =>
            recordStockMovement(
              {
                brandId,
                sku,
                type: type as InventoryMovementType,
                quantity,
                uom: uom as InventoryUom,
                reason,
                bucket: type === 'adjustment' ? 'on_hand' : undefined,
              },
              actor
            ),
          `${sku}: ${INVENTORY_MOVEMENT_TYPE_LABELS[type]} recorded`
        );
      }}
      onSaveSettings={({ sku, uom, safetyStock }) => {
        if (!brandId) return false;
        return runAction(
          'Inventory settings',
          () => setInventorySettings({ brandId, sku, uom, safetyStock }, actor),
          `${sku}: settings saved`
        );
      }}
      onDeclareAsin={({ sku, asin, productExistsOnChannel }) => {
        if (!brandId) return false;
        return runAction(
          'Channel identifier',
          () => declareBrandAsin({ brandId, sku, asin, productExistsOnChannel }, actor),
          `${sku}: ASIN declaration recorded`
        );
      }}
    />
  );
}
export default BrandInventoryScreen;
