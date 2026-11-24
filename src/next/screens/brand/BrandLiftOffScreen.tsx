import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { isComplianceGateCleared } from '@/data/api';
import {
  LIFT_OFF_ENDORSEMENT,
  LIFT_OFF_INTEREST_LABELS,
  LIFT_OFF_NAME,
  LIFT_OFF_SUMMARY,
  LIFT_OFF_TERMS,
  LIFT_OFF_TERMS_VERIFIED,
  LIFT_OFF_VERIFICATION_NOTE,
  LIFT_OFF_VS_DISTRIBUTION,
} from '@/config/liftOff';
import { evaluateLiftOffEligibility } from '@/lib/liftOff/eligibility';
import { BrandLiftOffView } from './BrandLiftOffView';

export function BrandLiftOffScreen({ onOpenCases }: { onOpenCases?: () => void }) {
  const { brandProfile, session, products } = useApp();
  const tenantId = session?.tenantId ?? '';
  const [complianceCleared, setComplianceCleared] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    if (!tenantId) {
      setComplianceCleared(false);
      return () => {
        active = false;
      };
    }
    setComplianceCleared(null);
    isComplianceGateCleared(tenantId)
      .then((v) => {
        if (active) setComplianceCleared(v);
      })
      .catch(() => {
        if (active) setComplianceCleared(false);
      });
    return () => {
      active = false;
    };
  }, [tenantId]);

  const eligibility = useMemo(
    () =>
      evaluateLiftOffEligibility({
        category: brandProfile?.category,
        productCount: products.length,
        complianceCleared: complianceCleared === true,
        commercialModel: brandProfile?.commercialModel,
      }),
    [brandProfile?.category, brandProfile?.commercialModel, products.length, complianceCleared]
  );

  return (
    <BrandLiftOffView
      loading={complianceCleared === null}
      wordmark={`${LIFT_OFF_NAME} | ${LIFT_OFF_ENDORSEMENT}`}
      summary={LIFT_OFF_SUMMARY}
      terms={LIFT_OFF_TERMS}
      verificationNote={LIFT_OFF_VERIFICATION_NOTE}
      termsVerified={LIFT_OFF_TERMS_VERIFIED}
      statusLabel={LIFT_OFF_INTEREST_LABELS.not_registered}
      eligibility={eligibility}
      comparison={LIFT_OFF_VS_DISTRIBUTION}
      onOpenCases={onOpenCases}
    />
  );
}
export default BrandLiftOffScreen;
