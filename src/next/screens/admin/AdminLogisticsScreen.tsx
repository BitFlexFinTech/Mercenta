import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useBrands, usePurchaseOrders, useShipmentsAll } from '@/data/queries';
import { setShipmentMilestone } from '@/data/demoStore';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { resolveProviderMode, INTEGRATION_MODE_LABELS } from '@/integrations/types';
import { listChannelInstructions } from '@/lib/commerce/channelInstructions';
import { asnForInstruction } from '@/lib/commerce/proxyProcessor';
import { advanceShipmentViaDhl } from '@/lib/dhl/domain';
import { buildPoDocumentPack, documentsAwaitingDownload } from '@/lib/documents/poDocumentPack';
import {
  buildSupplyRouteProfile,
  deriveSupplyRouteInput,
  evaluateLogisticsEscalation,
  type LogisticsRouteDecision,
} from '@/lib/fulfillment';
import {
  DECLARED_3PL_PARTNER,
  FULFILLMENT_ESCALATION_THRESHOLDS,
  getFulfillmentPartner,
} from '@/config/fulfillment';
import { OPERATIONAL_TRUTH } from '@/config/logisticsGeo';
import { buildOperationalMap } from '@/lib/logistics/operationsMap';
import { useRecordDeepLink } from '@/lib/runtime/recordDeepLink';
import { carrierProviderConfigurations } from '@/lib/shipping/providerConfiguration';
import { shipmentStatusPresentation } from '@/lib/statusPresentation';
import { daysBetween, demoToday, WORK_SOURCE_LABELS } from '@/lib/work/workStore';
import { useWorkItems } from '@/lib/work/useWork';
import type { WorkSource } from '@/lib/work/types';
import type { ShipmentStatus } from '@/types';
import type { MetricItem, SemanticTone } from '@/next/components/ConsolePrimitives';
import {
  AdminLogisticsView,
  type AdminLogisticsSelectedLeg,
  type AdminShipmentRow,
} from './AdminLogisticsView';

const CARRIER_MILESTONES: ShipmentStatus[] = [
  'factory_intake',
  'bak_depot',
  'sea_transit',
  'air_transit',
  'uk_customs_cleared',
  'destination_fc',
  'live_amazon',
];

const IN_TRANSIT: readonly string[] = ['sea_transit', 'air_transit', 'factory_intake'];
const LOGISTICS_WORK_SOURCES: WorkSource[] = ['shipment_exception', 'po_acknowledgement', 'po_window'];

const DECISION_META: Record<LogisticsRouteDecision, { label: string; tone: SemanticTone }> = {
  review: { label: 'Human review required', tone: 'warning' },
  direct_to_fc: { label: 'Direct to channel FC', tone: 'success' },
  escalate_to_3pl: { label: 'Escalate to UK buffer (3PL)', tone: 'info' },
};

export function AdminLogisticsScreen({ onOpenIntegrations }: { onOpenIntegrations?: () => void }) {
  const shipmentsQuery = useShipmentsAll();
  const brandsQuery = useBrands();
  const poQuery = usePurchaseOrders();

  const shipments = useMemo(() => shipmentsQuery.data?.data ?? [], [shipmentsQuery.data]);
  const brands = useMemo(() => brandsQuery.data?.data ?? [], [brandsQuery.data]);
  const pos = useMemo(() => poQuery.data?.data ?? [], [poQuery.data]);

  const { modes, integrations } = useIntegrations();
  const { addApiLog, apiLogs, products } = useApp();

  const [focus, setFocus] = useState<'all' | 'in_transit' | 'delayed' | 'exceptions'>('all');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [routeConsignmentId, setRouteConsignmentId] = useState<string>('');
  const [busyShipmentId, setBusyShipmentId] = useState<string | null>(null);
  const [lastCarrierResult, setLastCarrierResult] = useState<Record<string, string>>({});

  const deepLinkShipment = useRecordDeepLink('shipment');
  useEffect(() => {
    if (!deepLinkShipment) return;
    if (shipments.some((s) => s.id === deepLinkShipment)) setSelectedShipmentId(deepLinkShipment);
  }, [deepLinkShipment, shipments]);

  const brandName = (id: string) =>
    brands.find((b) => b.id === id)?.profile.businessName ?? id;

  const poByNumber = useMemo(() => {
    const m = new Map<string, (typeof pos)[number]>();
    for (const p of pos) m.set(p.poNumber, p);
    return m;
  }, [pos]);

  const inTransit = shipments.filter((s) => IN_TRANSIT.includes(s.status));
  const delayed = inTransit.filter((s) => s.delayed);
  const exceptions = shipments.filter((s) => s.exception);

  const logisticsWorkRaw = useWorkItems('admin').filter((w) =>
    LOGISTICS_WORK_SOURCES.includes(w.source)
  );
  const today = demoToday();
  const overdueWorkCount = logisticsWorkRaw.filter((w) => w.dueDate !== null && w.dueDate < today).length;
  const dueThisWeekCount = logisticsWorkRaw.filter((w) => {
    if (!w.dueDate) return false;
    const d = daysBetween(today, w.dueDate);
    return d >= 0 && d <= 7;
  }).length;

  const visibleShipments = useMemo<AdminShipmentRow[]>(() => {
    const filtered =
      focus === 'exceptions'
        ? shipments.filter((s) => s.exception)
        : focus === 'delayed'
          ? shipments.filter((s) => IN_TRANSIT.includes(s.status) && s.delayed)
          : focus === 'in_transit'
            ? shipments.filter((s) => IN_TRANSIT.includes(s.status))
            : shipments;

    return filtered.map((s) => {
      const pres = shipmentStatusPresentation(s.status);
      return {
        id: s.id,
        reference: s.reference,
        title: s.title,
        poNumber: s.poNumber,
        brandId: s.brandId,
        brandName: brandName(s.brandId),
        carrier: s.carrier,
        status: s.status as ShipmentStatus,
        statusLabel: pres.label,
        statusTone: pres.tone as SemanticTone,
        origin: s.origin,
        destination: s.destination,
        valueGbp: s.value,
        delayed: Boolean(s.delayed),
        exception: Boolean(s.exception),
        trackingNumber: s.trackingNumber ?? null,
        simulatedPo: poByNumber.get(s.poNumber)?.simulated === true,
      };
    });
  }, [focus, shipments, brands, poByNumber]);

  const mapModel = useMemo(
    () =>
      buildOperationalMap(
        shipments.map((s) => ({
          id: s.id,
          reference: s.reference,
          title: s.title,
          poNumber: s.poNumber,
          brandId: s.brandId,
          carrier: s.carrier,
          status: s.status,
          origin: s.origin,
          destination: s.destination,
          value: s.value,
          delayed: s.delayed,
          exception: s.exception,
          waybill: s.waybill ?? null,
          trackingNumber: s.trackingNumber ?? null,
          freightTerm: poByNumber.get(s.poNumber)?.freightTerm ?? null,
          simulated: poByNumber.get(s.poNumber)?.simulated,
          providerModes: modes,
        }))
      ),
    [shipments, poByNumber, modes]
  );

  const selectedLegRaw = mapModel.legs.find((l) => l.id === selectedShipmentId) ?? null;
  const selectedLeg: AdminLogisticsSelectedLeg | null = selectedLegRaw
    ? {
        id: selectedLegRaw.id,
        reference: selectedLegRaw.reference,
        poNumber: selectedLegRaw.poNumber || '—',
        brandName: brandName(selectedLegRaw.brandId),
        carrier: selectedLegRaw.carrier,
        origin: selectedLegRaw.origin.raw || '—',
        destination: selectedLegRaw.destination.raw || '—',
        valueGbp: selectedLegRaw.value,
        truthLabel: OPERATIONAL_TRUTH[selectedLegRaw.truth].label,
        truthTone: OPERATIONAL_TRUTH[selectedLegRaw.truth].tone as SemanticTone,
        truthReason: selectedLegRaw.truthReason,
        channelArranged: selectedLegRaw.channelArranged,
      }
    : null;

  const providerConfigs = useMemo(
    () => carrierProviderConfigurations({ modes, connections: integrations }),
    [modes, integrations]
  );

  const routeEvaluation = useMemo(() => {
    const partner = getFulfillmentPartner(DECLARED_3PL_PARTNER);
    const thresholds = FULFILLMENT_ESCALATION_THRESHOLDS;
    const activeId = shipments.some((s) => s.id === routeConsignmentId)
      ? routeConsignmentId
      : (shipments[0]?.id ?? '');
    const selected = shipments.find((s) => s.id === activeId) ?? null;
    const brand = selected ? brands.find((b) => b.id === selected.brandId) : undefined;
    const route = buildSupplyRouteProfile(
      deriveSupplyRouteInput({
        origin: selected?.origin ?? null,
        brandNation: brand?.nation ?? null,
        shipmentStatus: selected?.status ?? 'factory_intake',
        appointmentRequired: Boolean(selected?.appointment),
      })
    );
    const result = evaluateLogisticsEscalation({ route, poFrequencyPerMonth: null });
    const dMeta = DECISION_META[result.decision];
    return {
      partnerName: partner.name,
      partnerRole: partner.role === '3pl' ? '3PL — fulfils, does not carry' : partner.role,
      partnerCapability: partner.capability.label,
      deltaModeLabel: INTEGRATION_MODE_LABELS[modes.delta_fulfillment],
      maxDirectDaysLabel:
        thresholds.maxDirectDoorToFcDays === null ? 'Not agreed' : String(thresholds.maxDirectDoorToFcDays),
      minPoFreqLabel:
        thresholds.minPoFrequencyPerMonth === null ? 'Not agreed' : String(thresholds.minPoFrequencyPerMonth),
      thresholdsBasis: thresholds.basis,
      consignmentOptions: shipments.map((s) => ({
        id: s.id,
        label: `${s.poNumber} · ${brandName(s.brandId)}`,
      })),
      selectedConsignmentId: activeId,
      selectedOrigin: selected?.origin ?? 'Not recorded',
      freightMode: route.freightMode,
      customsLabel: route.customsRequired ? 'Yes — international lane' : 'No — UK domestic lane',
      appointmentLabel: route.appointmentRequired ? 'Required' : 'Not required',
      doorToFcLabel: route.totalDoorToFcDays === null ? 'Unknown' : String(route.totalDoorToFcDays),
      planningLeadLabel: route.planningLeadTimeDays === null ? 'Unknown' : String(route.planningLeadTimeDays),
      decision: result.decision,
      decisionLabel: dMeta.label,
      decisionTone: dMeta.tone,
      reasons: result.reasons,
      unknowns: route.unknowns,
    };
  }, [shipments, brands, routeConsignmentId, modes.delta_fulfillment]);

  const poDocSummaries = useMemo(() => {
    const queue = pos.filter(documentsAwaitingDownload);
    const instructions = listChannelInstructions();
    return queue.map((po) => {
      const instruction =
        instructions.find((i) => i.purchaseOrderId === po.id && i.type === 'po_acknowledgement') ??
        instructions.find((i) => i.purchaseOrderId === po.id);
      const shipment = shipments.find((s) => s.poNumber === po.poNumber) ?? null;
      const pack = buildPoDocumentPack({
        po,
        brandName: brandName(po.brandId),
        brandNation: brands.find((b) => b.id === po.brandId)?.nation ?? null,
        products,
        asn: instruction ? asnForInstruction(instruction, po) : null,
        carrier: shipment
          ? {
              carrier: shipment.carrier,
              trackingNumber: shipment.trackingNumber ?? null,
              waybill: shipment.waybill ?? null,
            }
          : null,
        instruction: instruction ?? null,
      });
      return {
        poId: po.id,
        poNumber: po.poNumber,
        brandName: brandName(po.brandId),
        statusLabel: po.status.replace(/_/g, ' '),
        destinationLabel: pack.destinationLabel,
        laneLabel: pack.lane === 'international' ? 'International' : 'UK domestic',
        readyCount: pack.readyCount,
        applicableCount: pack.applicableCount,
        generatedAt: instruction?.outcome?.documentsGeneratedAt,
      };
    });
  }, [pos, shipments, brands, products]);

  const metrics: MetricItem[] = [
    {
      id: 'logistics-in-transit',
      label: 'In transit',
      value: String(inTransit.length),
      context: `${shipments.length} total shipments`,
      active: focus === 'in_transit',
      onClick: () => setFocus('in_transit'),
    },
    {
      id: 'logistics-delayed',
      label: 'Delayed',
      value: String(delayed.length),
      context: delayed.length > 0 ? 'Carrier delay flagged' : 'No delays',
      active: focus === 'delayed',
      onClick: () => setFocus('delayed'),
    },
    {
      id: 'logistics-exceptions',
      label: 'Exceptions',
      value: String(exceptions.length),
      context: exceptions.length > 0 ? 'Needs resolution' : 'No exceptions',
      active: focus === 'exceptions',
      onClick: () => setFocus('exceptions'),
    },
    {
      id: 'logistics-work',
      label: 'Open logistics work',
      value: String(logisticsWorkRaw.length),
      context: `${overdueWorkCount} overdue`,
      active: focus === 'all',
      onClick: () => setFocus('all'),
    },
  ];

  async function handleRequestDhlUpdate(row: AdminShipmentRow) {
    if (busyShipmentId) return;
    setBusyShipmentId(row.id);
    try {
      const res = await advanceShipmentViaDhl({
        shipmentId: row.id,
        brandId: row.brandId,
        manifest: {
          reference: row.reference,
          customer: row.brandName,
          origin: row.origin,
          destination: row.destination,
          value: row.valueGbp,
        },
        getMode: (pid) => resolveProviderMode(modes, pid),
        actorId: 'mercenta-admin-logistics',
      });
      if (res.ok && res.to) {
        setShipmentMilestone(row.id, res.to);
        if (res.waybill) {
          addApiLog({
            id: `api-${row.id}-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            method: 'GET',
            endpoint: `/v1/dhl/shipments/${res.waybill}`,
            payload: { milestone: res.milestone, exception: res.exception, delayed: res.delayed },
            status: 200,
          });
        }
        setLastCarrierResult((prev) => ({
          ...prev,
          [row.id]: res.exception
            ? `Exception: ${res.milestone ?? 'hold'}`
            : `${res.from ?? ''} → ${res.to}`,
        }));
      } else {
        setLastCarrierResult((prev) => ({
          ...prev,
          [row.id]: res.safetyReason ?? res.error ?? 'Refused / unavailable',
        }));
      }
    } finally {
      setBusyShipmentId(null);
    }
  }

  return (
    <AdminLogisticsView
      loading={shipmentsQuery.isPending && shipments.length === 0}
      error={shipmentsQuery.isError && shipments.length === 0}
      onRetry={() => {
        void shipmentsQuery.refetch();
        void poQuery.refetch();
      }}
      totalShipments={shipments.length}
      brandsCount={new Set(shipments.map((s) => s.brandId)).size}
      focus={focus}
      onFocusChange={setFocus}
      metrics={metrics}
      shipments={visibleShipments}
      selectedLeg={selectedLeg}
      onSelectShipment={setSelectedShipmentId}
      providerConfigs={providerConfigs}
      onOpenIntegrations={onOpenIntegrations}
      routeEvaluation={routeEvaluation}
      onSelectRouteConsignment={setRouteConsignmentId}
      poDocSummaries={poDocSummaries}
      milestoneOptions={CARRIER_MILESTONES.map((v) => ({
        value: v,
        label: shipmentStatusPresentation(v).label,
      }))}
      busyShipmentId={busyShipmentId}
      lastCarrierResult={lastCarrierResult}
      onUpdateMilestone={(row, next) => {
        if (setShipmentMilestone(row.id, next)) {
          addApiLog({
            id: `api-${row.id}-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            }),
            method: 'PUT',
            endpoint: `/v1/shipments/${row.reference}/status`,
            payload: { status: next, carrier: row.carrier },
            status: 200,
          });
        }
      }}
      onRequestDhlUpdate={(row) => void handleRequestDhlUpdate(row)}
      apiLogs={apiLogs.map((l) => ({
        id: l.id,
        timestamp: l.timestamp,
        method: l.method,
        endpoint: l.endpoint,
        status: l.status,
      }))}
      logisticsWork={logisticsWorkRaw.map((w) => ({
        id: w.id,
        sourceLabel: WORK_SOURCE_LABELS[w.source],
        title: w.title,
        dueDate: w.dueDate,
      }))}
      overdueWorkCount={overdueWorkCount}
      dueThisWeekCount={dueThisWeekCount}
    />
  );
}
