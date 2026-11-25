/**
 * §WAVE 3g (2026-11-25) — a vertical portfolio (data).
 *
 * Scopes the canonical brands to ONE operating vertical and joins the catalogue,
 * orders and movements that already exist for them. It invents nothing: a vertical
 * with no brands reports that plainly, which is the truthful state for BWS and
 * Talent Commerce today.
 */
import { useMemo, useState } from 'react';
import { useBrands, useProducts, usePurchaseOrders, useShipmentsAll } from '@/data/queries';
import {
  VERTICAL_EMPTY_STATE,
  VERTICAL_LABELS,
  brandsInVertical,
  verticalOf,
} from '@/config/verticals';
import { isOpenPo, sumGbp } from '@/next/screens/admin/adminPortfolio';
import type { OperatingVertical } from '@/types';
import { VerticalPortfolioView, type VerticalBrandRow } from './VerticalPortfolioView';

export function VerticalPortfolioScreen({ vertical }: { vertical: OperatingVertical }) {
  const brandsQ = useBrands();
  const productsQ = useProducts();
  const posQ = usePurchaseOrders();
  const shipQ = useShipmentsAll();
  const [selected, setSelected] = useState<VerticalBrandRow | null>(null);

  const brands = brandsQ.data?.data ?? [];
  const products = productsQ.data?.data ?? [];
  const pos = posQ.data?.data ?? [];
  const shipments = shipQ.data?.data ?? [];

  const verticalBrands = useMemo(() => brandsInVertical(brands, vertical), [brands, vertical]);

  const rows = useMemo<VerticalBrandRow[]>(() => {
    return verticalBrands.map((brand) => {
      const brandPos = pos.filter((po) => po.brandId === brand.id);
      return {
        brand,
        products: products.filter((product) => product.brandId === brand.id).length,
        openPos: brandPos.filter(isOpenPo).length,
        poValue: sumGbp(brandPos.map((po) => po.poValue)),
        shipments: shipments.filter((shipment) => shipment.brandId === brand.id).length,
      };
    });
  }, [verticalBrands, products, pos, shipments]);

  /* Totals cover the whole vertical, not just the rows on screen. */
  const verticalBrandIds = new Set(verticalBrands.map((brand) => brand.id));
  const verticalPos = pos.filter((po) => verticalBrandIds.has(po.brandId));

  return (
    <VerticalPortfolioView
      vertical={vertical}
      verticalLabel={VERTICAL_LABELS[vertical]}
      emptyCopy={VERTICAL_EMPTY_STATE[vertical]}
      rows={rows}
      productCount={products.filter((product) => verticalBrandIds.has(product.brandId)).length}
      openPoCount={verticalPos.filter(isOpenPo).length}
      portfolioValue={sumGbp(verticalPos.map((po) => po.poValue))}
      selected={selected}
      isLoading={brandsQ.isPending || productsQ.isPending || posQ.isPending}
      isError={brandsQ.isError || productsQ.isError || posQ.isError}
      errorMessage={String(brandsQ.error ?? productsQ.error ?? posQ.error ?? '') || undefined}
      onRetry={() => {
        void brandsQ.refetch();
        void productsQ.refetch();
        void posQ.refetch();
      }}
      onSelect={setSelected}
    />
  );
}