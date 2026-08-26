export type Environment = 'home' | 'login' | 'brand' | 'admin' | 'carrier';

export type AdminDepartment = 'business_dev' | 'logistics' | 'compliance' | 'super_admin';

export type StaffRole =
  | 'Super Admin'
  | 'Business Development'
  | 'Logistics Coordinator'
  | 'UK HMRC Compliance Specialist'
  | 'Harare BAK Depot Lead'
  | 'Carrier Integration Manager';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  channel: string;
  active: boolean;
}

export type CarrierId = 'dhl' | 'fedex' | 'bak';

export type ShipmentStage =
  | 'factory_intake'
  | 'bak_depot'
  | 'international_forwarding'
  | 'uk_port_hmrc'
  | 'boxbee_hub'
  | 'live_amazon';

export const STAGE_LABELS: Record<ShipmentStage, string> = {
  factory_intake: 'Factory Intake',
  bak_depot: 'Regional Hub / Depot Processing',
  international_forwarding: 'International Forwarding',
  uk_port_hmrc: 'UK Port / HMRC Clearance',
  boxbee_hub: 'Boxbee UK Distribution Hub',
  live_amazon: 'Live on Amazon 1P',
};

export const STAGE_ORDER: ShipmentStage[] = [
  'factory_intake',
  'bak_depot',
  'international_forwarding',
  'uk_port_hmrc',
  'boxbee_hub',
  'live_amazon',
];

export type ShipmentStatus =
  | 'factory_intake'
  | 'bak_depot'
  | 'sea_transit'
  | 'air_transit'
  | 'uk_customs_cleared'
  | 'boxbee_hub'
  | 'live_amazon';

export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  factory_intake: 'Factory Intake',
  bak_depot: 'In BAK Depot',
  sea_transit: 'Sea Transit',
  air_transit: 'Air Transit',
  uk_customs_cleared: 'UK Customs Cleared',
  boxbee_hub: 'Boxbee UK Hub',
  live_amazon: 'Live on Amazon',
};

export const STATUS_COLORS: Record<ShipmentStatus, string> = {
  factory_intake: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  bak_depot: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  sea_transit: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  air_transit: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  uk_customs_cleared: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  boxbee_hub: 'bg-neon-500/20 text-neon-400 border-neon-500/30',
  live_amazon: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

export interface Shipment {
  id: string;
  reference: string;
  title: string;
  customer: string;
  value: number;
  status: ShipmentStatus;
  carrier: CarrierId;
  stage: ShipmentStage;
  cbm: number;
  origin: string;
  destination: string;
  date: string;
  trackingNumber: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  image: string;
  exWorksPrice: number;
  ukRetailPrice: number;
  commodityCode: string;
  vatStatus: string;
  hazmat: boolean;
  length: number;
  width: number;
  height: number;
  weight: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  shipmentRef: string;
  carrier: CarrierId;
  message: string;
  status: ShipmentStatus;
}

export interface Lead {
  id: string;
  persona: string;
  company: string;
  location: string;
  email: string;
  priority: 'High' | 'Medium';
  outreachStatus: 'Scraped' | 'Email Sent' | 'Replied' | 'Meeting Booked';
  segment: string;
  fitScore: number;
  region: 'us' | 'eu' | 'africa' | 'canada';
}

export interface Campaign {
  id: string;
  name: string;
  status: 'Scaling' | 'Active' | 'Paused';
  costPerLead: number;
  leads: number;
  dispatched: number;
  replies: number;
  meetings: number;
}

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  payload: Record<string, unknown>;
  status: number;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  orders: number;
}

export interface CarrierVolumePoint {
  month: string;
  courier: number;
  freight: number;
}

export type BrandRegion = 'north_america' | 'europe' | 'africa';

export interface BrandProfile {
  businessName: string;
  region: BrandRegion;
  nation: string;
  taxId: string;
  email: string;
  phone: string;
  signatory: string;
  agreed: boolean;
  bic: string;
  iban: string;
  payoutCurrency: string;
  dhlConnected: boolean;
  fedexConnected: boolean;
  bakConnected: boolean;
  onboarded: boolean;
}
