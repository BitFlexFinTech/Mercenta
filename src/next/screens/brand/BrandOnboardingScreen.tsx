import { useApp } from '@/context/GlobalStateContext';
import { acceptBrandAgreement } from '@/data/api';
import { BANKS_BY_COUNTRY } from '@/data/banksByCountry';
import { useBrandAgreements } from '@/data/queries';
import { AGREEMENT_VERSIONS, type BrandAgreementType } from '@/types';
import { BrandOnboardingView } from './BrandOnboardingView';

export function BrandOnboardingScreen({ onNavigateSettings }: { onNavigateSettings?: () => void }) {
  const { session, brandProfile, setBrandProfile, completeOnboarding, gateDocs } = useApp();
  const brandAgreements = useBrandAgreements().data?.data ?? [];
  const brandId = session?.tenantId ?? '';
  const logisticsSlaAccepted = brandAgreements.some(
    (a) => a.brandId === brandId && a.agreementType === 'logistics_sla'
  );
  const chargebackIndemnityAccepted = brandAgreements.some(
    (a) => a.brandId === brandId && a.agreementType === 'chargeback_indemnity'
  );
  const allGateDocsApproved = gateDocs.length > 0 && gateDocs.every((d) => d.status === 'approved');
  const banksForNation = brandProfile.nation ? BANKS_BY_COUNTRY[brandProfile.nation] ?? [] : [];

  return (
    <BrandOnboardingView
      profile={brandProfile}
      banksForNation={banksForNation}
      logisticsSlaAccepted={logisticsSlaAccepted}
      chargebackIndemnityAccepted={chargebackIndemnityAccepted}
      allGateDocsApproved={allGateDocsApproved}
      onUpdateProfile={(patch) => setBrandProfile({ ...brandProfile, ...patch })}
      onCompleteOnboarding={({ poRulesAcknowledged, logisticsSla, chargebackIndemnity }) => {
        const targetId = session?.tenantId || `brand-${Date.now()}`;
        if (logisticsSla) {
          acceptBrandAgreement(
            targetId,
            'logistics_sla' as BrandAgreementType,
            AGREEMENT_VERSIONS.logistics_sla
          );
        }
        if (chargebackIndemnity) {
          acceptBrandAgreement(
            targetId,
            'chargeback_indemnity' as BrandAgreementType,
            AGREEMENT_VERSIONS.chargeback_indemnity
          );
        }
        completeOnboarding({ poRulesAcknowledged });
      }}
      onNavigateSettings={onNavigateSettings}
    />
  );
}
export default BrandOnboardingScreen;
