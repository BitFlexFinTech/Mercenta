/**
 * Demo chart series for dashboard visualisations.
 * Extracted from the retired mockData universe during the Stage-2 collapse:
 * these are presentational constants only — entity data lives exclusively in
 * demoStore/api.
 */

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

export const REVENUE_DATA: RevenuePoint[] = [
  { month: 'Sep', revenue: 42000, orders: 12 },
  { month: 'Oct', revenue: 68000, orders: 18 },
  { month: 'Nov', revenue: 95000, orders: 24 },
  { month: 'Dec', revenue: 142000, orders: 31 },
  { month: 'Jan', revenue: 168000, orders: 38 },
  { month: 'Feb', revenue: 175000, orders: 42 },
];

export const CARRIER_VOLUME_DATA: CarrierVolumePoint[] = [
  { month: 'Sep', courier: 8, freight: 4 },
  { month: 'Oct', courier: 12, freight: 6 },
  { month: 'Nov', courier: 15, freight: 9 },
  { month: 'Dec', courier: 19, freight: 14 },
  { month: 'Jan', courier: 24, freight: 18 },
  { month: 'Feb', courier: 28, freight: 22 },
];
