import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import {
  useBrands,
  useCanonicalStoreVersion,
  useCatalogSubmissions,
  useProducts,
} from '@/data/queries';
import { pushProductInventoryToChannel } from '@/data/api';
import {
  latestSubmissionForProduct,
  updateProductAvailability,
  updateProductCost,
} from '@/data/demoStore';
import { ASIN_RULES, ASIN_SOURCE_LABELS } from '@/lib/catalog/asin';
import { evaluateProductCompleteness } from '@/lib/catalog/productCompleteness';
import {
  adminOverrideAsin,
  inventoryForProduct,
  listInventoryMovements,
} from '@/lib/inventory/inventoryLifecycle';
import {
  INVENTORY_DERIVATION_BASIS,
  INVENTORY_STATUS_LABELS,
  INVENTORY_UOM_LABELS,
} from '@/lib/inventory/inventoryRecord';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
import { SUBMISSION_STATUS_LABELS } from '@/lib/spapi/transform';
import { submissionStatusPresentation } from '@/lib/statusPresentation';
import { APPROVED_CATEGORIES } from '@/types';
import {
  AdminCatalogView,
  type AdminCatalogProductRow,
  type CatalogFocus,
} from './AdminCatalogView';

function mapTone(t: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (t === 'success' || t === 'warning' || t === 'danger' || t === 'info') return t;
  return 'neutral';
}

export function AdminCatalogScreen() {
  const { actingStaffId, canCurrentUserMutate } = useApp();
  const brandsQuery = useBrands();
  const productsQuery = useProducts();
  const submissionsQuery = useCatalogSubmissions();
  const canonicalVersion = useCanonicalStoreVersion();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [focus, setFocus] = useState<CatalogFocus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const brands = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const products = useMemo(() => productsQuery.data?.data ?? [], [productsQuery.data]);
  const submissions = useMemo(() => submissionsQuery.data?.data ?? [], [submissionsQuery.data]);

  const deepLinkSubmission = useRecordDeepLink('submission');
  useEffect(() => {
    if (!deepLinkSubmission) return;
    const sub = submissions.find((s) => s.id === deepLinkSubmission);
    if (!sub) return;
    const product =
      products.find((p) => p.id === sub.productId) ??
      products.find((p) => p.brandId === sub.brandId && p.sku === sub.sku);
    if (product) setSelectedId(product.id);
  }, [deepLinkSubmission, submissions, products]);

  const brandMap = useMemo(() => {
    const m = new Map<string, { name: string; category: string }>();
    for (const b of brands) m.set(b.id, { name: b.profile.businessName, category: b.category });
    return m;
  }, [brands]);

  const inventoryActor = useMemo(
    () => ({ staffId: actingStaffId, canMutate: canCurrentUserMutate }),
    [actingStaffId, canCurrentUserMutate]
  );

  const allRows: AdminCatalogProductRow[] = useMemo(() => {
    void canonicalVersion;
    void submissions;
    return products.map((p) => {
      const b = brandMap.get(p.brandId);
      const sub = latestSubmissionForProduct(p.brandId, p.sku);
      const subPres = sub ? submissionStatusPresentation(sub.status) : null;
      const comp = evaluateProductCompleteness(p as unknown as Record<string, unknown>);
      const invRes = inventoryForProduct(p.brandId, p.sku, inventoryActor);
      const inv = invRes.ok ? invRes.value : undefined;
      const ledRes = listInventoryMovements(p.brandId, p.sku, inventoryActor);
      const ledger = ledRes.ok ? ledRes.value : [];
      const rawImgs = Array.isArray(p.productImages) ? p.productImages : [];
      const images = rawImgs
        .map((img) =>
          typeof img === 'string'
            ? img
            : typeof (img as { url?: unknown })?.url === 'string'
              ? (img as { url: string }).url
              : ''
        )
        .filter(Boolean);

      return {
        id: p.id,
        brandId: p.brandId,
        brandName: b?.name ?? p.brandId,
        category: b?.category ?? 'Uncategorized',
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        commodityCode: p.commodityCode,
        vatStatus: p.vatStatus,
        hazmat: Boolean(p.hazmat),
        exWorksPrice: p.exWorksPrice,
        ukRetailPrice: p.ukRetailPrice,
        length: p.length,
        width: p.width,
        height: p.height,
        weight: p.weight,
        unitsPerCase: p.unitsPerCase,
        caseOrderable: p.caseOrderable,
        isAvailable: p.isAvailable !== false,
        leadTimeDays: p.leadTimeDays ?? 14,
        images,
        completenessComplete: comp.complete,
        completenessMissing: comp.missingLabels,
        submissionLabel: sub ? SUBMISSION_STATUS_LABELS[sub.status] : 'Not submitted',
        submissionTone: subPres ? mapTone(subPres.tone) : 'neutral',
        submissionSimulated: sub?.simulated,
        submissionTrackingId: sub?.submissionId,
        submissionRejectionReason: sub?.rejectionReason,
        inventory: inv
          ? {
              onHand: inv.onHand,
              committed: inv.committed,
              inbound: inv.inbound,
              available: inv.available,
              safetyStock: inv.safetyStock,
              uomLabel: INVENTORY_UOM_LABELS[inv.uom],
              statusLabel: INVENTORY_STATUS_LABELS[inv.status],
              statusTone:
                inv.status === 'in_stock'
                  ? 'success'
                  : inv.status === 'out_of_stock'
                    ? 'danger'
                    : 'warning',
              asin: inv.asin,
              asinSourceLabel: inv.asinSource ? ASIN_SOURCE_LABELS[inv.asinSource] : undefined,
              asinSimulated: inv.asinSimulated,
              ledger: ledger.map((m) => ({
                id: m.id,
                recordedAt: m.recordedAt,
                type: m.type,
                quantityDelta: m.quantityDelta,
                enteredQuantity: m.enteredQuantity,
                enteredUom: m.enteredUom,
                bucket: m.bucket,
                actorId: m.actorId,
              })),
            }
          : undefined,
      };
    });
  }, [products, brandMap, submissions, inventoryActor, canonicalVersion]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of allRows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    const list = [{ id: 'all', label: 'All', count: allRows.length }];
    for (const cat of APPROVED_CATEGORIES) {
      const c = counts.get(cat) ?? 0;
      if (c > 0) list.push({ id: cat, label: cat, count: c });
    }
    return list;
  }, [allRows]);

  const filteredRows = useMemo(() => {
    let rows = allRows;
    if (categoryFilter !== 'all') rows = rows.filter((r) => r.category === categoryFilter);
    if (focus === 'not_submitted') rows = rows.filter((r) => r.submissionLabel === 'Not submitted');
    if (focus === 'inactive') rows = rows.filter((r) => !r.isAvailable);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          r.brandName.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
      );
    }
    return rows;
  }, [allRows, categoryFilter, focus, searchQuery]);

  const selectedProduct = allRows.find((r) => r.id === selectedId) ?? null;

  const errorObj = productsQuery.error || brandsQuery.error || submissionsQuery.error;
  const error =
    errorObj instanceof Error ? errorObj.message : errorObj ? 'Failed to load catalog.' : null;

  return (
    <AdminCatalogView
      loading={productsQuery.isPending || brandsQuery.isPending || submissionsQuery.isPending}
      error={error}
      onRetry={() => {
        void productsQuery.refetch();
        void brandsQuery.refetch();
        void submissionsQuery.refetch();
      }}
      canMutate={canCurrentUserMutate}
      totalProducts={allRows.length}
      totalBrands={brands.length}
      categoryCount={new Set(allRows.map((r) => r.category)).size}
      notSubmittedCount={allRows.filter((r) => r.submissionLabel === 'Not submitted').length}
      inactiveCount={allRows.filter((r) => !r.isAvailable).length}
      categories={categories}
      categoryFilter={categoryFilter}
      onCategoryFilterChange={setCategoryFilter}
      focus={focus}
      onFocusChange={setFocus}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      rows={filteredRows}
      selectedProduct={selectedProduct}
      onSelectProduct={(row) => setSelectedId(row?.id ?? null)}
      inventoryDerivationBasis={INVENTORY_DERIVATION_BASIS}
      asinRules={[...ASIN_RULES]}
      onSaveAvailability={(sku, av, lt) => {
        if (!canCurrentUserMutate) return;
        updateProductAvailability(sku, av, lt);
      }}
      onUpdatePrice={(sku, price) => {
        if (!canCurrentUserMutate) return;
        updateProductCost(sku, price);
      }}
      onOverrideAsin={(brandId, sku, asin, reason) => {
        const res = adminOverrideAsin({ brandId, sku, asin, reason }, inventoryActor);
        return res.ok ? `Identifier recorded: ${res.value.asin}` : res.error;
      }}
      onPushStock={async (productId) => {
        if (!canCurrentUserMutate) return 'View-only staff cannot push stock.';
        const rec = await pushProductInventoryToChannel({ productId });
        if (rec.refusal) return rec.refusal;
        return `Reported ${rec.quantity} ${rec.unitOfMeasure} (${rec.eaches} eaches)${
          rec.simulated ? ' — simulated submission' : ''
        }.`;
      }}
    />
  );
}
