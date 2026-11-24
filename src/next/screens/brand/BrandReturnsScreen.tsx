import { useMemo } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { demoReturns } from '@/data/api';
import { BrandReturnsView } from './BrandReturnsView';

export function BrandReturnsScreen({
  onOpenPo,
  onOpenDeductions,
}: {
  onOpenPo: (poNumber: string) => void;
  onOpenDeductions: () => void;
}) {
  const { session } = useApp();
  const brandId = session?.tenantId ?? '';
  const returns = useMemo(() => demoReturns.filter((r) => r.brandId === brandId), [brandId]);

  return (
    <BrandReturnsView
      returns={returns}
      onOpenPo={onOpenPo}
      onOpenDeductions={onOpenDeductions}
    />
  );
}
