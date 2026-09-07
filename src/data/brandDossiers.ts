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
import { DEMO_PRODUCTS, DEMO_SHIPMENTS, CLEARED_BRAND_IDS } from './demoData'
import type { DemoBrand, DemoShipment } from './demoData';
import type { BrandProfile, RegionalComplianceDoc, RegionalDossier, Shipment, FinancialRecord, CarrierTokens, FinancialCurrency } from '@/types';
import { BANKS_BY_COUNTRY } from './banksByCountry';

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
  const isCleared = CLEARED_BRAND_IDS.includes(brand.id);
  const countryBanks = BANKS_BY_COUNTRY[brand.nation];
  const defaultBank = countryBanks?.[0] ?? { name: 'Unknown', swift: 'PENDING-SWIFT', accountFormat: 'pending' };
  const bankAccount = generateBankAccount(brand.nation, defaultBank);
  return {
    businessName: brand.name,
    region: brand.region === 'africa' ? 'africa' : brand.region,
    nation: brand.nation,
    category: brand.category,
    taxId: generateTaxId(brand),
    email: brand.email,
    phone: generatePhone(brand),
    signatory: brand.signatory,
    agreed: true,
    bic: defaultBank.swift,
    iban: bankAccount,
    payoutCurrency: CURRENCY_BY_REGION[brand.region],
    dhlConnected: false,
    fedexConnected: false,
    bakConnected: false,
    onboarded: isCleared,
    fulfillmentTrack: brand.track,
    complianceGateStatus: isCleared ? 'cleared' : 'blocked',
  };
}

/** Generate realistic bank account number for a country. */
function generateBankAccount(nation: string, bank: { name: string; swift: string; accountFormat: string }): string {
  const m: Record<string, () => string> = {
    'United States': () => `US-${randDigits(9)}-${randDigits(8)}`,
    Canada: () => `CA-${randDigits(3)}-${randDigits(5)}-${randDigits(7)}`,
    'United Kingdom': () => `GB${randDigits(2)} ${randDigits(4)} ${randDigits(4)} ${randDigits(4)} ${randDigits(4)} ${randDigits(2)}`,
    Germany: () => `DE${randDigits(2)} ${randDigits(4)} ${randDigits(4)} ${randDigits(4)} ${randDigits(4)} ${randDigits(2)}`,
    France: () => `FR${randDigits(2)} ${randDigits(4)} ${randDigits(4)} ${randDigits(4)} ${randDigits(4)} ${randDigits(2)}`,
    Italy: () => `IT${randDigits(2)} ${randChar()} ${randDigits(4)} ${randDigits(4)} ${randDigits(4)} ${randDigits(4)}`,
    Netherlands: () => `NL${randDigits(2)} ${randLetters(4)} ${randDigits(4)} ${randDigits(4)} ${randDigits(2)}`,
    Spain: () => `ES${randDigits(2)} ${randDigits(4)} ${randDigits(4)} ${randDigits(4)} ${randDigits(4)}`,
    Zimbabwe: () => `ZW-BK-${randDigits(7)}`,
    'South Africa': () => `ZA-${randDigits(6)}-${randDigits(10)}`,
    Kenya: () => `KE-${randDigits(10)}`,
    Nigeria: () => `NG-${randDigits(10)}`,
  };
  const gen = m[nation];
  if (gen) return gen();
  return `${nation.slice(0, 2).toUpperCase()}-${randDigits(8)}-${randDigits(6)}`;
}

/** Generate realistic tax ID for a country. */
function generateTaxId(brand: DemoBrand): string {
  const m: Record<string, string> = {
    'United States': `${randDigits(2)}-${randDigits(7)}`,
    Canada: `BN${randDigits(9)}`,
    'United Kingdom': `GB${randDigits(3)} ${randDigits(4)} ${randDigits(4)}`,
    Germany: `DE${randDigits(9)}`,
    France: `FR${randDigits(2)} ${randDigits(9)}`,
    Italy: `IT${randDigits(11)}`,
    Netherlands: `NL${randDigits(9)}B01`,
    Spain: `ES${randChars(1)}${randDigits(8)}`,
    Zimbabwe: `${randDigits(3)}-${randDigits(6)}-${randDigits(3)}`,
    'South Africa': `${randDigits(2)}/${randDigits(7)}/${randDigits(2)}`,
    Kenya: `P${randDigits(9)}${randChar()}`,
    Nigeria: `${randDigits(8)}-${randDigits(3)}`,
    Ghana: `C-${randDigits(8)}`,
    Ethiopia: `${randDigits(3)}-${randDigits(6)}-${randDigits(3)}`,
    Tanzania: `${randDigits(9)}-${randDigits(4)}`,
    Rwanda: `${randDigits(7)}`,
  };
  return m[brand.nation] ?? `${brand.nation.slice(0, 2).toUpperCase()}TAX-${randDigits(6)}`;
}

/** Generate realistic phone number for a brand's country. */
function generatePhone(brand: DemoBrand): string {
  const m: Record<string, string> = {
    'United States': `+1 (${randDigits(3)}) ${randDigits(3)}-${randDigits(4)}`,
    Canada: `+1 (${randDigits(3)}) ${randDigits(3)}-${randDigits(4)}`,
    'United Kingdom': `+44 ${randDigits(4)} ${randDigits(6)}`,
    Germany: `+49 ${randDigits(3)} ${randDigits(7)}`,
    France: `+33 ${randDigits(1)} ${randDigits(2)} ${randDigits(2)} ${randDigits(2)} ${randDigits(2)}`,
    Italy: `+39 ${randDigits(3)} ${randDigits(7)}`,
    Netherlands: `+31 ${randDigits(2)} ${randDigits(7)}`,
    Spain: `+34 ${randDigits(3)} ${randDigits(3)} ${randDigits(3)}`,
    Zimbabwe: `+263 ${randDigits(3)} ${randDigits(6)}`,
    'South Africa': `+27 ${randDigits(2)} ${randDigits(7)}`,
    Kenya: `+254 ${randDigits(3)} ${randDigits(6)}`,
    Nigeria: `+234 ${randDigits(3)} ${randDigits(3)} ${randDigits(4)}`,
    Ghana: `+233 ${randDigits(3)} ${randDigits(6)}`,
    Ethiopia: `+251 ${randDigits(2)} ${randDigits(7)}`,
    Tanzania: `+255 ${randDigits(3)} ${randDigits(6)}`,
    Rwanda: `+250 ${randDigits(3)} ${randDigits(6)}`,
  };
  return m[brand.nation] ?? `+${randDigits(2)} ${randDigits(3)} ${randDigits(6)}`;
}

function randDigits(n: number): string {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
}
function randChar(): string {
  return String.fromCharCode(65 + Math.floor(Math.random() * 26));
}
function randChars(n: number): string {
  return Array.from({ length: n }, () => randChar()).join('');
}
function randLetters(n: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return Array.from({ length: n }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
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

