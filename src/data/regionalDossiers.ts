/**
 * Regional demo dossiers — CANONICAL home (moved verbatim from the retired
 * src/mockData.ts during the Stage-20 fixture collapse). Consumed by the
 * GlobalStateContext one-click demo login and the audit checks.
 */
import type {
  DemoRegion,
  RegionalDossier,
} from '../types';


const AFRICA_DOSSIER: RegionalDossier = {
  region: 'africa',
  profile: {
    businessName: 'Zambezi Organic Extracts Ltd',
    region: 'africa',
    nation: 'Zimbabwe',
    taxId: 'BP-77129-2026',
    email: 'trade@zambeziorganics.co.zw',
    phone: '+263 24 277 0912',
    signatory: 'Tendai Moyo',
    agreed: true,
    bic: 'ZBBLZWHA',
    iban: 'ZW 4030 7712 2298 4410',
    payoutCurrency: 'USD',
    dhlConnected: false,
    fedexConnected: false,
    bakConnected: true,
    onboarded: true,
    fulfillmentTrack: 'direct_fulfillment',
    complianceGateStatus: 'cleared',
  },
  products: [
    { id: 'afr-p1', name: 'Baobab Cold-Press Oil (1L)', sku: 'ZOE-BAO-1000', barcode: '6009612081340', image: '🌳', exWorksPrice: 18.5, ukRetailPrice: 42, commodityCode: '1515906010', vatStatus: 'Zero-rated', hazmat: false, length: 10, width: 10, height: 30, weight: 0.95 },
    { id: 'afr-p2', name: 'Marula Kernel Oil (500ml)', sku: 'ZOE-MAR-500', barcode: '6009612081357', image: '🥜', exWorksPrice: 24, ukRetailPrice: 58, commodityCode: '1515906090', vatStatus: 'Zero-rated', hazmat: false, length: 8, width: 8, height: 22, weight: 0.48 },
    { id: 'afr-p3', name: 'Moringa Seed Oil (250ml)', sku: 'ZOE-MOR-250', barcode: '6009612081364', image: '🌿', exWorksPrice: 16.75, ukRetailPrice: 39.5, commodityCode: '1515906090', vatStatus: 'Zero-rated', hazmat: false, length: 6, width: 6, height: 16, weight: 0.25 },
    { id: 'afr-p4', name: 'Raw Shea Butter Blend (1kg)', sku: 'ZOE-SHE-1000', barcode: '6009612081371', image: '🧈', exWorksPrice: 8.9, ukRetailPrice: 21, commodityCode: '3304990090', vatStatus: 'Standard 20%', hazmat: false, length: 15, width: 15, height: 12, weight: 1 },
    { id: 'afr-p5', name: 'Mongongo Nut Oil (100ml)', sku: 'ZOE-MON-100', barcode: '6009612081388', image: '🌰', exWorksPrice: 15.2, ukRetailPrice: 36, commodityCode: '1515906090', vatStatus: 'Zero-rated', hazmat: false, length: 5, width: 5, height: 12, weight: 0.1 },
  ],
  shipments: [
    { id: 'afr-s1', reference: 'BOX-ZW-2604', title: 'Q1 Organic Oil Bulk Order', customer: 'Zambezi Organic Extracts Ltd', value: 460000, status: 'bak_depot', carrier: 'bak', stage: 'bak_depot', cbm: 42, origin: 'Harare, Zimbabwe', destination: 'London, UK', date: 'Feb 4', trackingNumber: 'BAK-ZW-7741' },
    { id: 'afr-s2', reference: 'BOX-ZW-2605', title: 'Marula Kernel Freight', customer: 'Zambezi Organic Extracts Ltd', value: 128000, status: 'sea_transit', carrier: 'bak', stage: 'international_forwarding', cbm: 18, origin: 'Bulawayo Hub, Zimbabwe', destination: 'Felixstowe, UK', date: 'Feb 1', trackingNumber: 'BAK-ZW-9912' },
    { id: 'afr-s3', reference: 'BOX-MZ-2606', title: 'Beira Corridor Container', customer: 'Zambezi Organic Extracts Ltd', value: 305000, status: 'sea_transit', carrier: 'bak', stage: 'international_forwarding', cbm: 34, origin: 'Beira, Mozambique', destination: 'London, UK', date: 'Jan 29', trackingNumber: 'BAK-MZ-5521' },
    { id: 'afr-s4', reference: 'BOX-ZA-2607', title: 'Durban Consolidation Lot', customer: 'Zambezi Organic Extracts Ltd', value: 88000, status: 'uk_customs_cleared', carrier: 'bak', stage: 'uk_port_hmrc', cbm: 15, origin: 'Durban, South Africa', destination: 'Felixstowe, UK', date: 'Jan 20', trackingNumber: 'BAK-ZA-8843' },
  ],
  financials: [
    { id: 'afr-f1', currency: 'USD', label: 'Pipeline Receivable — Q1 Bulk Order', amount: 460000, type: 'receivable', date: 'Feb 2026', note: 'Dual-posted in ZWL 386,400,000 at ZIMRA interbank', taxRef: 'ZIMRA TAX ZW-2026-001' },
    { id: 'afr-f2', currency: 'USD', label: 'Bi-weekly Wholesale Payout', amount: 128000, type: 'payout', date: 'Feb 2026', note: 'Settled to ZB Bank USD FCA', taxRef: 'PAYE ZW-8841' },
    { id: 'afr-f3', currency: 'ZWL', label: 'Local Cost Ledger (RTGS)', amount: 193200000, type: 'payable', date: 'Feb 2026', note: 'ZWL equivalent of USD 230,000', taxRef: 'ZIMRA VAT ZW-8842' },
  ],
  compliance: [
    { id: 'afr-c1', title: 'ZIMRA CD1 Customs Form', type: 'customs', status: 'verified', region: 'Africa', detail: 'CD1-2026-0042 — Beira corridor' },
    { id: 'afr-c2', title: 'ZIMRA Customs Power of Attorney', type: 'customs', status: 'verified', region: 'Africa', detail: 'POA-ZW-2026-1177' },
    { id: 'afr-c3', title: 'Phytosanitary Certificate (Organic)', type: 'agri', status: 'pending', region: 'Africa', detail: 'Awaiting Ministry of Agriculture stamp' },
  ],
  tokens: { bak: 'BAK-ZW-7741-WILLOWVALE' },
};

const USA_DOSSIER: RegionalDossier = {
  region: 'usa',
  profile: {
    businessName: 'Austin Premium Botanicals',
    region: 'north_america',
    nation: 'United States',
    taxId: '12-3456789',
    email: 'trade@austinbotanicals.com',
    phone: '+1 512 555 0192',
    signatory: 'Derek Holland',
    agreed: true,
    bic: 'TCABUS44',
    iban: 'US 210000871 4822 10',
    payoutCurrency: 'USD',
    dhlConnected: false,
    fedexConnected: true,
    bakConnected: false,
    onboarded: true,
    fulfillmentTrack: 'direct_fulfillment',
    complianceGateStatus: 'cleared',
  },
  products: [
    { id: 'usa-p1', name: 'Texas Lavender Essential Oil (5L Bulk)', sku: 'APB-TXL-5000', barcode: '8500112233445', image: '💜', exWorksPrice: 145, ukRetailPrice: 320, commodityCode: '3301190000', vatStatus: 'Standard 20%', hazmat: false, length: 25, width: 25, height: 35, weight: 5.2 },
    { id: 'usa-p2', name: 'Organic Aloe Vera Gel (1 Gal)', sku: 'APB-ALO-3785', barcode: '8500112233452', image: '🌵', exWorksPrice: 22, ukRetailPrice: 56, commodityCode: '3304990090', vatStatus: 'Standard 20%', hazmat: false, length: 18, width: 18, height: 30, weight: 3.9 },
    { id: 'usa-p3', name: 'Pecan & Honey Body Butter (16oz)', sku: 'APB-PEC-454', barcode: '8500112233469', image: '🌰', exWorksPrice: 9.5, ukRetailPrice: 24.99, commodityCode: '3304990090', vatStatus: 'Standard 20%', hazmat: false, length: 10, width: 10, height: 12, weight: 0.46 },
    { id: 'usa-p4', name: 'Sweetgrass Botanical Serum (2oz)', sku: 'APB-SWG-59', barcode: '8500112233476', image: '🌾', exWorksPrice: 12.8, ukRetailPrice: 34.99, commodityCode: '3304990090', vatStatus: 'Standard 20%', hazmat: false, length: 5, width: 5, height: 12, weight: 0.08 },
    { id: 'usa-p5', name: 'Bluebonnet Floral Mist (8oz)', sku: 'APB-BLB-236', barcode: '8500112233483', image: '🌸', exWorksPrice: 11.4, ukRetailPrice: 29.99, commodityCode: '3304990090', vatStatus: 'Standard 20%', hazmat: false, length: 6, width: 6, height: 18, weight: 0.25 },
  ],
  shipments: [
    { id: 'usa-s1', reference: 'BOX-US-2608', title: 'Texas Lavender Bulk Air Freight', customer: 'Austin Premium Botanicals', value: 64000, status: 'air_transit', carrier: 'fedex', stage: 'international_forwarding', cbm: 3, origin: 'Austin, Texas, USA', destination: 'Heathrow, UK', date: 'Feb 6', trackingNumber: 'FDX-US-11807' },
    { id: 'usa-s2', reference: 'BOX-US-2609', title: 'Aloe Vera Gel Pallet', customer: 'Austin Premium Botanicals', value: 27500, status: 'factory_intake', carrier: 'fedex', stage: 'factory_intake', cbm: 2, origin: 'Austin, Texas, USA', destination: 'London, UK', date: 'Feb 7', trackingNumber: 'FDX-US-11808' },
    { id: 'usa-s3', reference: 'BOX-US-2610', title: 'Body Butter Sample Run', customer: 'Austin Premium Botanicals', value: 9400, status: 'uk_customs_cleared', carrier: 'fedex', stage: 'uk_port_hmrc', cbm: 1, origin: 'Dallas, Texas, USA', destination: 'Coventry, UK', date: 'Jan 30', trackingNumber: 'FDX-US-11790' },
  ],
  financials: [
    { id: 'usa-f1', currency: 'USD', label: 'Q1 Bulk Purchase Order', amount: 91000, type: 'receivable', date: 'Feb 2026', note: 'Net-15 automated USD settlement', taxRef: 'EIN 12-3456789' },
    { id: 'usa-f2', currency: 'USD', label: 'Automated USD Payout (FedEx)', amount: 64000, type: 'payout', date: 'Feb 2026', note: 'ACH to Texas Capital Bank', taxRef: 'W-8BEN-E on file' },
    { id: 'usa-f3', currency: 'USD', label: 'Cross-border Freight & Handling', amount: 4200, type: 'payable', date: 'Feb 2026', note: 'FedEx cross-border tariff', taxRef: 'US EXP 76-2026' },
  ],
  compliance: [
    { id: 'usa-c1', title: 'EIN Registration', type: 'tax', status: 'verified', region: 'North America', detail: 'EIN 12-3456789 — active' },
    { id: 'usa-c2', title: 'FDA Cosmetic Registration', type: 'fda', status: 'verified', region: 'North America', detail: 'FDA FEI 3010955487' },
    { id: 'usa-c3', title: 'FCC RF Exemption Letter', type: 'fcc', status: 'verified', region: 'North America', detail: 'No RF-emitting components' },
  ],
  tokens: { fedex: 'FDX-TX-88120-AUSTIN' },
};

const EUROPE_DOSSIER: RegionalDossier = {
  region: 'europe',
  profile: {
    businessName: 'Munich Clean-Care GmbH',
    region: 'europe',
    nation: 'Germany',
    taxId: 'DE314159265',
    email: 'trade@muc-cleancare.de',
    phone: '+49 89 555 0177',
    signatory: 'Klaus Bauer',
    agreed: true,
    bic: 'HYVEDEMM',
    iban: 'DE89 3704 0044 0532 0130 00',
    payoutCurrency: 'EUR',
    dhlConnected: true,
    fedexConnected: false,
    bakConnected: false,
    onboarded: true,
    fulfillmentTrack: 'direct_fulfillment',
    complianceGateStatus: 'cleared',
  },
  products: [
    { id: 'eu-p1', name: 'pH-Balanced Facial Cleanser (200ml)', sku: 'MCC-PHC-200', barcode: '4260189721013', image: '🧼', exWorksPrice: 7.2, ukRetailPrice: 18.99, commodityCode: '3304990090', vatStatus: 'Standard 20%', hazmat: false, length: 6, width: 6, height: 16, weight: 0.22 },
    { id: 'eu-p2', name: 'Organic Chamomile Serum (30ml)', sku: 'MCC-CHA-30', barcode: '4260189721020', image: '🌼', exWorksPrice: 14.6, ukRetailPrice: 38, commodityCode: '3304990090', vatStatus: 'Standard 20%', hazmat: false, length: 4, width: 4, height: 10, weight: 0.06 },
    { id: 'eu-p3', name: 'Alpine Mineral Toner (150ml)', sku: 'MCC-ALP-150', barcode: '4260189721037', image: '🏔️', exWorksPrice: 8.4, ukRetailPrice: 21.5, commodityCode: '3304990090', vatStatus: 'Standard 20%', hazmat: false, length: 5, width: 5, height: 14, weight: 0.18 },
    { id: 'eu-p4', name: 'Vegan Foam Cleanser (250ml)', sku: 'MCC-VFC-250', barcode: '4260189721044', image: '🫧', exWorksPrice: 6.9, ukRetailPrice: 17.5, commodityCode: '3304990090', vatStatus: 'Standard 20%', hazmat: false, length: 6, width: 6, height: 18, weight: 0.28 },
    { id: 'eu-p5', name: 'Alpen Herbal Night Cream (50ml)', sku: 'MCC-HNC-50', barcode: '4260189721051', image: '🌙', exWorksPrice: 19.5, ukRetailPrice: 46, commodityCode: '3304990090', vatStatus: 'Standard 20%', hazmat: false, length: 5, width: 5, height: 10, weight: 0.09 },
  ],
  shipments: [
    { id: 'eu-s1', reference: 'BOX-DE-2611', title: 'Munich Cleanser Air Freight', customer: 'Munich Clean-Care GmbH', value: 52000, status: 'air_transit', carrier: 'dhl', stage: 'international_forwarding', cbm: 4, origin: 'Munich, Germany', destination: 'Heathrow, UK', date: 'Feb 5', trackingNumber: 'DHL-DE-3390' },
    { id: 'eu-s2', reference: 'BOX-DE-2612', title: 'Chamomile Serum Line', customer: 'Munich Clean-Care GmbH', value: 41000, status: 'mercenta_hub', carrier: 'dhl', stage: 'mercenta_hub', cbm: 2, origin: 'Munich, Germany', destination: 'Northampton, UK', date: 'Jan 28', trackingNumber: 'DHL-DE-3389' },
    { id: 'eu-s3', reference: 'BOX-DE-2613', title: 'Alpine Night Cream Lot', customer: 'Munich Clean-Care GmbH', value: 36000, status: 'uk_customs_cleared', carrier: 'dhl', stage: 'uk_port_hmrc', cbm: 2, origin: 'Stuttgart, Germany', destination: 'London, UK', date: 'Jan 26', trackingNumber: 'DHL-DE-3387' },
  ],
  financials: [
    { id: 'eu-f1', currency: 'EUR', label: 'Munich Bulk Order (DHL)', amount: 68500, type: 'receivable', date: 'Feb 2026', note: 'EUR valuation node — SEPA settlement', taxRef: 'DE VAT DE314159265' },
    { id: 'eu-f2', currency: 'EUR', label: 'EUR Payout (SEPA)', amount: 52000, type: 'payout', date: 'Feb 2026', note: 'SEPA to HypoVereinsbank', taxRef: 'MWST-2026-011' },
    { id: 'eu-f3', currency: 'EUR', label: 'Customs & VAT (HMRC)', amount: 3100, type: 'payable', date: 'Feb 2026', note: 'UK import VAT offset', taxRef: 'EORI DE314159265000' },
  ],
  compliance: [
    { id: 'eu-c1', title: 'EORI Number', type: 'customs', status: 'verified', region: 'Europe', detail: 'DE314159265000 — active' },
    { id: 'eu-c2', title: 'CE Declaration of Conformity', type: 'ce', status: 'verified', region: 'Europe', detail: 'CE-DoC-2026-0041' },
    { id: 'eu-c3', title: 'Multilingual Label Check (EN/DE/FR)', type: 'labeling', status: 'verified', region: 'Europe', detail: 'Trilingual label batch verified' },
  ],
  tokens: { dhl: 'DHL-DE-3390-MUC' },
};

export const REGIONAL_DOSSIERS: Record<DemoRegion, RegionalDossier> = {
  africa: AFRICA_DOSSIER,
  usa: USA_DOSSIER,
  europe: EUROPE_DOSSIER,
};
