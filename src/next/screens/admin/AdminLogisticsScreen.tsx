/**
 * §WAVE 3 (2026-11-25) — admin logistics hub (data).
 * Read-only monitoring: it shapes the portfolio's shipments for the view and
 * invents no status — the option list is derived from the shipments that exist.
 */
import { useMemo, useState } from 'react';
import { useBrands, useShipmentsAll } from '@/data/queries';
import type { DemoShipment } from '@/data/demoData';
import { activeShipments, shipmentsWithExceptions } from './adminPortfolio';
import { AdminLogisticsView, type AdminShipmentRow } from './AdminLogisticsView';

export function AdminLogisticsScreen() {
  const brandsQ = useBrands();
  const shipQ = useShipmentsAll();

  const [carrierFilter, setCarrierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [exceptionsOnly, setExceptionsOnly] = useState(false);
  const [selected, setSelected] = useState<DemoShipment | null>(null);

  const brands = brandsQ.data?.data ?? [];
  const shipments = shipQ.data?.data ?? [];

  const statusOptions = useMemo(
    () => Array.from(new Set(shipments.map((shipment) => shipment.status))).sort(),
    [shipments]
  );
  const carrierOptions = useMemo(
    () => Array.from(new Set(shipments.map((shipment) => shipment.carrier))).sort(),
    [shipments]
  );

  const rows = useMemo<AdminShipmentRow[]>(() => {
    const query = search.trim().toLowerCase();
    return shipments
      .filter((shipment) => !exceptionsOnly || Boolean(shipment.exception))
      .filter((shipment) => carrierFilter === 'all' || shipment.carrier === carrierFilter)
      .filter((shipment) => statusFilter === 'all' || shipment.status === statusFilter)
      .filter((shipment) => {
        if (!query) return true;
        const haystack = [
          shipment.poNumber ?? '',
          shipment.reference,
          shipment.origin,
          shipment.destination,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(query);
      })
      .map((shipment) => ({
        shipment,
        brandName:
          brands.find((brand) => brand.id === shipment.brandId)?.profile.businessName ??
          shipment.brandId,
      }));
  }, [shipments, brands, exceptionsOnly, carrierFilter, statusFilter, search]);

  return (
    <AdminLogisticsView
      rows={rows}
      totalCount={shipments.length}
      carrierOptions={carrierOptions}
      carrierFilter={carrierFilter}
      statusFilter={statusFilter}
      statusOptions={statusOptions}
      search={search}
      exceptionsOnly={exceptionsOnly}
      activeCount={activeShipments(shipments).length}
      exceptionCount={shipmentsWithExceptions(shipments).length}
      selected={selected}
      isLoading={shipQ.isPending || brandsQ.isPending}
      isError={shipQ.isError || brandsQ.isError}
      errorMessage={String(shipQ.error ?? brandsQ.error ?? '') || undefined}
      onRetry={() => {
        void shipQ.refetch();
        void brandsQ.refetch();
      }}
      onChangeCarrier={setCarrierFilter}
      onChangeStatus={setStatusFilter}
      onChangeSearch={setSearch}
      onToggleExceptions={() => setExceptionsOnly((previous) => !previous)}
      onSelect={setSelected}
    />
  );
}