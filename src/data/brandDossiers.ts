/**
 * §Stage-20.1 — Per-brand demo dossiers for ALL 11 ALL_DEMO_BRANDS entries.
 *
 * DERIVED from the canonical dataset (demoData) so they structurally cannot
 * drift from it — no hand-maintained per-brand fixtures. activateDemoBrand()
 * hydrates from these exactly like the original activateDemo() regional
 * dossiers: full profile, products, shipments, financials, compliance docs,
 * carrier tokens, onboarded: true.
 *
 * Reference-implementation parity (rule 05): same state depth as
 * REGIONAL_DOSSIERS, not just the same UI.
 */
import { DEMO_PRODUCTS, DEMO_SHIPMENTS } from './demoData'
import type { DemoBrand, DemoShipment } from './demoData';
import type {
  BrandProfile,
  RegionalComplianceDoc,
  RegionalDossier,
  Shipment,
  FinancialRecord,
  CarrierTokens,
  FinancialCurrency,
} from '@/types';

const CURRENCY_BY_REGION: Record<DemoBrand['region'], FinancialCurrency> = {
  north_america: 'USD',
  europe: 'EUR',
  africa: 'USD',
};

const REGION_LABEL: Record<DemoBrand['region'], string> = {
  north_america: 'North America',
  europe: 'Europe',
  africa: 'Africa',
};

/** Mirrors GlobalStateContext.statusToStage — kept in sync by validator. */
const STAGE_BY_STATUS: Record<DemoShipment['status'], Shipment['stage']> = {
  factory_intake: 'factory_intake',
  bak_depot: 'bak_depot',
  sea_transit: 'international_forwarding',
  air_transit: 'international_forwarding',
  uk_customs_cleared: 'uk_port_hmrc',
  mercenta_hub: 'mercenta_hub',
  live_amazon: 'live_amazon',
};

function buildProfile(brand: DemoBrand): BrandProfile {
  return {
    businessName: brand.name,
    region: brand.region === 'africa' ? 'africa' : brand.region,
    nation: brand.nation,
    // Unmistakable placeholders (mock-first rule) — real values are admin-
    // supplied; banking changes route through admin approval (§19.6).
    taxId: `TAX-${brand.id.slice(6).toUpperCase()}-PENDING`,
    email: brand.email,
    phone: '+00 0 000 0000 (pending)',
    signatory: brand.signatory,
    agreed: true,
    bic: 'PENDING-BIC',
    iban: `${brand.nation.slice(0, 2).toUpperCase()}-PENDING-REGISTRATION`,
    payoutCurrency: CURRENCY_BY_REGION[brand.region],
    // §Stage-20.2 — carriers are admin-managed; brands never connect them.
    dhlConnected: false,
    fedexConnected: false,
    bakConnected: false,
    onboarded: true,
    fulfillmentTrack: brand.track,
    complianceGateStatus: 'cleared',
  };
}

/** §Stage-20 fix #1 — full dossier per brand, derived from canonical data. */
export function buildBrandDossier(brand: DemoBrand): RegionalDossier {
  const slug = brand.id.replace('brand-', '');
  const currency = CURRENCY_BY_REGION[brand.region];

  const products = DEMO_PRODUCTS.filter((p) => p.brandId === brand.id).map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    image: p.image,
    exWorksPrice: p.exWorksPrice,
    ukRetailPrice: p.ukRetailPrice,
    commodityCode: p.commodityCode,
    vatStatus: p.vatStatus,
    hazmat: p.hazmat,
    length: p.length,
    width: p.width,
    height: p.height,
    weight: p.weight,
  }));

  const shipments: Shipment[] = DEMO_SHIPMENTS.filter((s) => s.brandId === brand.id).map(
    (s) => ({
      id: s.id,
      reference: s.reference,
      title: s.title,
      customer: brand.name,
      value: s.value,
      status: s.status as Shipment['status'],
      carrier: s.carrier as Shipment["carrier"],
      stage: STAGE_BY_STATUS[s.status],
      cbm: Math.max(6, Math.round(s.value / 9000)),
      origin: s.origin,
      destination: s.destination,
      date: new Date().toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
      trackingNumber: `${s.carrier.toUpperCase()}-${slug.toUpperCase()}-${s.poNumber}`,
    })
  );

  const totalShipmentValue = shipments.reduce((a, s) => a + s.value, 0);
  const financials: FinancialRecord[] = [
    {
      id: `${slug}-f1`,
      currency,
      label: 'Wholesale payout — settled POs',
      amount: Math.round(totalShipmentValue * 0.82),
      type: 'payout',
      date: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      note: 'Net of commission per distribution agreement',
      taxRef: 'VAT GB-VAT-PENDING-REGISTRATION',
    },
    {
      id: `${slug}-f2`,
      currency,
      label: 'Pipeline receivable — in-transit POs',
      amount: Math.round(totalShipmentValue * 0.18),
      type: 'receivable',
      date: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
      note: 'Payable on delivery confirmation',
      taxRef: 'EORI GB-EORI-PENDING-REGISTRATION',
    },
  ];

  const compliance: RegionalComplianceDoc[] = [
    {
      id: `${slug}-c1`,
      title: 'Certificate of Origin',
      type: 'customs',
      status: 'verified',
      region: REGION_LABEL[brand.region],
      detail: `Issued ${brand.nation} chamber of commerce`,
    },
    {
      id: `${slug}-c2`,
      title: 'Product liability insurance certificate',
      type: 'insurance',
      status: 'verified',
      region: REGION_LABEL[brand.region],
      detail: 'Cover confirmed for UK wholesale distribution',
    },
    {
      id: `${slug}-c3`,
      title: 'Category compliance pack',
      type: 'regulatory',
      status: 'pending',
      region: REGION_LABEL[brand.region],
      detail: 'Awaiting Mercenta compliance review',
    },
  ];

  // §Stage-20.2 — carrier accounts are ADMIN-managed (3PL Carrier Terminal);
  // tokens here are read-only demo context, never brand-configured.
  const tokens: CarrierTokens = {
    dhl: `DHL-${slug.toUpperCase()}-DEMO`,
    fedex: `FDX-${slug.toUpperCase()}-DEMO`,
    bak: `BAK-${slug.toUpperCase()}-DEMO`,
  };

  return {
    region: brand.region === 'north_america' ? 'usa' : brand.region,
    profile: buildProfile(brand),
    products,
    shipments,
    financials,
    compliance,
    tokens,
  };
}

