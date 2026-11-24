import type { QueryClient } from '@tanstack/react-query';
import { createShipmentForPO, type AsnDetail } from '@/data/api';

export async function runCreateShipmentForPo(
  qc: QueryClient,
  poId: string,
  asn: AsnDetail,
  actorStaffId?: string,
  actingBrandId?: string
): Promise<{ ok: boolean; shipmentId?: string; warnings: string[]; error?: string }> {
  const res = createShipmentForPO(poId, asn, actorStaffId, actingBrandId);
  if (res.ok) {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['shipments'] }),
      qc.invalidateQueries({ queryKey: ['purchase_orders'] }),
      qc.invalidateQueries({ queryKey: ['purchase-orders'] }),
      qc.invalidateQueries({ queryKey: ['deductions'] }),
    ]);
  }
  return res;
}
