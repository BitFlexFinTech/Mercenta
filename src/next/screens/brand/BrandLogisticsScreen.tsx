import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BRAND_NAME } from '@/config/brand';
import { CarrierProviderConfigurationPanel } from '@/components/shared/logistics/CarrierProviderConfigurationPanel';
import { PoDocumentPackPanel } from '@/components/shared/logistics/PoDocumentPackPanel';
import { PoDocumentQueuePanel } from '@/components/shared/logistics/PoDocumentQueuePanel';
import { ProductThumb } from '@/components/shared/ProductThumb';
import { useApp } from '@/context/GlobalStateContext';
import {
  useBrands,
  useCanonicalStoreVersion,
  usePurchaseOrders,
  useShipmentsAll,
} from '@/data/queries';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { listChannelInstructions } from '@/lib/commerce/channelInstructions';
import { downloadHtml } from '@/lib/founder/documentExport';
import { buildDeliveryPerformance } from '@/lib/logistics/deliveryPerformance';
import { buildOperationalMap } from '@/lib/logistics/operationsMap';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
import { deriveCarrierEligibility } from '@/lib/shipping/carrierEligibility';
import { selectCarrierForShipment } from '@/lib/shipping/carrierRouting';
import { carrierProviderConfigurations } from '@/lib/shipping/providerConfiguration';
import type {
  ChannelInstruction,
  DeliveryAppointment,
  Shipment,
  ShipmentEta,
  ShipmentStage,
} from '@/types';
import {
  BrandLogisticsView,
  type LogisticsRowItem,
  type UnshippedAcceptedPo,
} from './BrandLogisticsView';
import { runCreateShipmentForPo } from './logisticsActions';

export function BrandLogisticsScreen() {
  const qc = useQueryClient();
  const { session, products, actingStaffId } = useApp();
  const shipmentsQuery = useShipmentsAll();
  const posQuery = usePurchaseOrders();
  const brandsQuery = useBrands();
  const { modes, integrations } = useIntegrations();
  const canonicalVersion = useCanonicalStoreVersion();
  const deepLinkPo = useRecordDeepLink('po');

  void canonicalVersion;

  const isBrandSession = session?.tier === 'brand';
  const tenantId = session?.tenantId ?? null;
  const brands = brandsQuery.data?.data ?? [];

  const scopedPos = useMemo(
    () =>
      (posQuery.data?.data ?? []).filter(
        (po) => !isBrandSession || po.brandId === tenantId
      ),
    [posQuery.data, isBrandSession, tenantId]
  );

  const poByNumber = useMemo(() => {
    const map = new Map<string, (typeof scopedPos)[number]>();
    for (const po of scopedPos) map.set(po.poNumber, po);
    return map;
  }, [scopedPos]);

  const rows = useMemo<LogisticsRowItem[]>(
    () =>
      ((shipmentsQuery.data?.data ?? []) as unknown as Shipment[])
        .filter(
          (s) =>
            !isBrandSession ||
            (s as unknown as { brandId?: string }).brandId === tenantId
        )
        .map((s) => {
          const raw = s as unknown as {
            brandId?: string;
            poNumber?: string;
            delayed?: boolean;
            exception?: boolean;
            waybill?: string;
            title?: string;
            eta?: ShipmentEta | null;
            appointment?: DeliveryAppointment | null;
          };
          const po = raw.poNumber ? poByNumber.get(raw.poNumber) : undefined;
          return {
            id: s.id,
            reference: s.reference,
            title: s.title || raw.title || s.reference,
            poNumber: raw.poNumber ?? '',
            brandId: raw.brandId ?? '',
            customer: (s as unknown as { customer?: string }).customer ?? '',
            value: s.value,
            status: s.status,
            carrier: s.carrier,
            stage: s.stage as ShipmentStage,
            cbm: (s as unknown as { cbm?: number }).cbm ?? Math.max(6, Math.round(s.value / 9000)),
            origin: s.origin,
            destination: s.destination,
            date: (s as unknown as { date?: string }).date ?? '',
            trackingNumber: (s as unknown as { trackingNumber?: string }).trackingNumber ?? '',
            delayed: Boolean(raw.delayed),
            exception: Boolean(raw.exception),
            waybill: raw.waybill ?? null,
            freightTerm: po?.freightTerm ?? null,
            simulated: po?.simulated,
            eta: raw.eta ?? undefined,
            appointment: raw.appointment ?? undefined,
          };
        }),
    [shipmentsQuery.data, isBrandSession, tenantId, poByNumber]
  );

  const model = useMemo(
    () => buildOperationalMap(rows.map((r) => ({ ...r, providerModes: modes }))),
    [rows, modes]
  );

  const performance = useMemo(
    () =>
      buildDeliveryPerformance(
        model.legs.map((leg) => ({
          status: leg.status,
          stage: leg.stage,
          truth: leg.truth,
          delayed: leg.delayed,
          exception: leg.exception,
        }))
      ),
    [model.legs]
  );

  const etaCoverage = useMemo(() => {
    let dated = 0;
    let simulated = 0;
    let delivered = 0;
    let unavailable = 0;
    for (const s of rows) {
      const eta = s.eta;
      if (!eta) {
        unavailable += 1;
        continue;
      }
      if (eta.basis === 'delivered') delivered += 1;
      else if (eta.basis === 'unavailable') unavailable += 1;
      else {
        dated += 1;
        if (eta.simulated) simulated += 1;
      }
    }
    return { dated, simulated, delivered, unavailable, total: rows.length };
  }, [rows]);

  const eligibility = useMemo(() => {
    const leg = model.legs[0];
    return deriveCarrierEligibility({
      brandNation: null,
      originCountry: leg?.origin.raw ?? null,
      destinationCountry: leg?.destination.raw ?? null,
      freightTerm: leg?.freightTerm ?? undefined,
      providerModes: modes,
    });
  }, [model.legs, modes]);

  const providerConfigurations = useMemo(
    () => carrierProviderConfigurations({ modes, connections: integrations }),
    [modes, integrations]
  );

  const acceptedUnshippedPos = useMemo<UnshippedAcceptedPo[]>(() => {
    const shippedPoNumbers = new Set(rows.map((r) => r.poNumber).filter(Boolean));
    return scopedPos
      .filter(
        (po) =>
          (po.status === 'accepted' || po.status === 'ready_to_fulfil') &&
          !shippedPoNumbers.has(po.poNumber)
      )
      .map((po) => {
        const b = brands.find((item) => item.id === po.brandId);
        return {
          id: po.id,
          poNumber: po.poNumber,
          freightTerm: po.freightTerm ?? null,
          brandCategory: b?.category,
          defaultCarrier:
            po.freightTerm === 'collect'
              ? 'amazon_partner'
              : selectCarrierForShipment({ brandNation: b?.nation }).carrier,
          lineItems: po.lineItems,
        };
      });
  }, [scopedPos, rows, brands]);

  const instructionForPo = (poId: string): ChannelInstruction | undefined => {
    const list = listChannelInstructions().filter((i) => i.purchaseOrderId === poId);
    return list.find((i) => i.type === 'po_acknowledgement') ?? list[0];
  };

  return (
    <BrandLogisticsView
      brandDisplayName={BRAND_NAME}
      tenantLabel={tenantId ?? 'Mercenta operations'}
      isBrandSession={isBrandSession}
      isLoading={shipmentsQuery.isPending || posQuery.isPending}
      isError={shipmentsQuery.isError || posQuery.isError}
      errorMessage={String(shipmentsQuery.error ?? posQuery.error ?? '') || undefined}
      onRetry={() => {
        void shipmentsQuery.refetch();
        void posQuery.refetch();
      }}
      rows={rows}
      model={model}
      performance={performance}
      etaCoverage={etaCoverage}
      eligibility={eligibility}
      providerModes={modes}
      deepLinkPoNumber={deepLinkPo}
      acceptedUnshippedPos={acceptedUnshippedPos}
      onCreateShipment={(poId, asn) =>
        runCreateShipmentForPo(
          qc,
          poId,
          asn,
          isBrandSession ? undefined : actingStaffId,
          isBrandSession ? tenantId ?? undefined : undefined
        )
      }
      onDownloadHtml={downloadHtml}
      renderDocumentQueueSlot={(openArtefact) => (
        <PoDocumentQueuePanel
          pos={scopedPos}
          brandNameFor={(bId) => brands.find((b) => b.id === bId)?.profile.businessName ?? bId}
          brandNationFor={(bId) => brands.find((b) => b.id === bId)?.nation ?? null}
          products={products}
          instructionForPo={instructionForPo}
          shipmentForPo={(poNumber) => {
            const match = rows.find((r) => r.poNumber === poNumber);
            return match
              ? {
                  id: match.id,
                  status: match.status,
                  carrier: match.carrier,
                  trackingNumber: match.trackingNumber || null,
                  waybill: match.waybill,
                }
              : null;
          }}
          onOpenCarrierArtefact={openArtefact}
          scope="brand"
        />
      )}
      renderDocumentPackSlot={(selectedLeg, selectedRow, openArtefact) => {
        const selectedPo = selectedLeg?.poNumber ? poByNumber.get(selectedLeg.poNumber) : null;
        if (!selectedPo) {
          return (
            <p className="text-[12px] text-ink-600" data-testid="po-documents-unavailable">
              This consignment is not linked to a purchase order in your scope, so no document pack applies.
            </p>
          );
        }
        return (
          <PoDocumentPackPanel
            po={selectedPo}
            brandName={
              brands.find((b) => b.id === selectedPo.brandId)?.profile.businessName ??
              selectedPo.brandId
            }
            brandNation={brands.find((b) => b.id === selectedPo.brandId)?.nation ?? null}
            products={products}
            carrier={{
              carrier: selectedLeg?.carrier ?? '',
              trackingNumber: selectedRow?.trackingNumber ?? null,
              waybill: selectedRow?.waybill ?? null,
            }}
            instruction={instructionForPo(selectedPo.id)}
            shipmentStatus={selectedLeg?.status ?? null}
            onOpenCarrierArtefact={(kind) => openArtefact(kind, selectedLeg?.id ?? '')}
          />
        );
      }}
      providerConfigsSlot={
        <CarrierProviderConfigurationPanel configurations={providerConfigurations} scope="brand" />
      }
      renderTrackingProducts={(poNumber) => {
        const po = poByNumber.get(poNumber);
        const skus = new Set(po?.lineItems.map((li) => li.sku) ?? []);
        const matched = products.filter((p) => skus.has(p.sku) || skus.has(p.id));
        if (matched.length === 0) return null;
        return (
          <ul className="space-y-2">
            {matched.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded border border-hairline bg-surface p-2"
              >
                <ProductThumb product={p} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium text-ink-950">{p.name}</div>
                  <div className="text-[11px] font-mono text-faint">
                    SKU {p.sku} · EAN {p.barcode || '—'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        );
      }}
    />
  );
}
