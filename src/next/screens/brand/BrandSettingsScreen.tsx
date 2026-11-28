import { useMemo, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { ALL_TOUR_DEFINITIONS } from '@/config/tours/tourDefinitions';
import {
  isTourCompleted,
  isTourSkipped,
  restartTour,
  useTourProgress,
} from '@/components/shared/TourEngine';
import {
  addPoOutage,
  addReturnAddress,
  addTeamMember,
  cancelPoOutage,
  demoNotificationPrefs,
  demoPoOutages,
  demoReturnAddresses,
  demoTeamMembers,
  getBankInfo,
  logMessage,
  removeReturnAddress,
  removeTeamMember,
  requestBankChange,
  updateNotificationPref,
  updateReturnAddress,
} from '@/data/api';
import { getBrandCommercialModelRecord } from '@/data/demoStore';
import { useComplianceDocuments, useContracts } from '@/data/queries';
import { assertBrandScope } from '@/lib/auth/rbac';
import { BrandSettingsView, type TourRow } from './BrandSettingsView';

export function BrandSettingsScreen({ onOpenContracts }: { onOpenContracts?: () => void }) {
  const { session, brandProfile } = useApp();
  const brandId = session?.tenantId ?? '';
  const [, setVersion] = useState(0);

  const docsQ = useComplianceDocuments();
  const contractsQ = useContracts();
  const tourProgress = useTourProgress(brandId);

  const bankInfo = getBankInfo(brandId) ?? null;
  const commercialRecord = getBrandCommercialModelRecord(brandId);
  const teamMembers = demoTeamMembers.filter((m) => m.brandId === brandId);
  const outages = demoPoOutages.filter((o) => o.brandId === brandId);
  const returnAddresses = demoReturnAddresses.filter((a) => a.brandId === brandId);
  const notificationPrefs = demoNotificationPrefs.filter((p) => p.brandId === brandId);

  const complianceDocs = useMemo(
    () => assertBrandScope(session, docsQ.data?.data ?? []),
    [session, docsQ.data]
  );

  const contracts = useMemo(
    () => (contractsQ.data?.data ?? []).filter((c) => (brandId ? c.brandId === brandId : true)),
    [contractsQ.data, brandId]
  );

  const tours: TourRow[] = ALL_TOUR_DEFINITIONS.map((t) => {
    const completed = isTourCompleted(brandId, t.id);
    const skipped = isTourSkipped(brandId, t.id);
    const inProgress = tourProgress.currentTourId === t.id;
    const state = inProgress
      ? 'In progress'
      : completed
        ? 'Completed'
        : skipped
          ? 'Skipped'
          : 'Not started';
    const tone = inProgress
      ? 'info'
      : completed
        ? 'success'
        : skipped
          ? 'warning'
          : 'neutral';
    return { id: t.id, name: t.name, description: t.description, state, tone };
  });

  const bump = () => setVersion((v) => v + 1);

  return (
    <BrandSettingsView
      brandProfile={brandProfile}
      bankInfo={bankInfo}
      commercialRecord={commercialRecord}
      teamMembers={teamMembers}
      outages={outages}
      returnAddresses={returnAddresses}
      complianceDocs={complianceDocs}
      notificationPrefs={notificationPrefs}
      contracts={contracts}
      tours={tours}
      onRequestBankChange={(field, currentValue, newValue, reason) => {
        requestBankChange(brandId, field, currentValue, newValue, reason);
        bump();
      }}
      onAddTeamMember={(name, email, role) => {
        addTeamMember({
          id: `tm-${Date.now()}`,
          brandId,
          name,
          email,
          role,
          active: true,
          invitedAt: new Date().toISOString(),
        });
        bump();
      }}
      onRemoveTeamMember={(memberId) => {
        removeTeamMember(memberId);
        bump();
      }}
      onAddOutage={(startDate, endDate, reason) => {
        addPoOutage({ brandId, startDate, endDate, reason, status: 'active' });
        bump();
      }}
      onCancelOutage={(outageId) => {
        cancelPoOutage(outageId);
        bump();
      }}
      onAddReturnAddress={(addr) => {
        addReturnAddress({ ...addr, brandId });
        bump();
      }}
      onSetDefaultReturnAddress={(addrId) => {
        updateReturnAddress(addrId, { isDefault: true });
        bump();
      }}
      onRemoveReturnAddress={(addrId) => {
        removeReturnAddress(addrId);
        bump();
      }}
      onToggleNotificationChannel={(pref, channel) => {
        const channels = pref.channels.includes(channel)
          ? pref.channels.filter((c) => c !== channel)
          : [...pref.channels, channel];
        updateNotificationPref(pref.id, { channels, enabled: channels.length > 0 });
        bump();
      }}
      onToggleNotificationEnabled={(pref) => {
        updateNotificationPref(pref.id, { enabled: !pref.enabled });
        bump();
      }}
      onRestartTour={(tourId) => {
        restartTour(brandId, tourId);
        bump();
      }}
      onRequestProfileChange={(note) => {
        void logMessage({
          brandId,
          channel: 'in_app',
          direction: 'inbound',
          subject: 'Settings Contact Change Request',
          body: note,
          sentBy: 'staff',
          requiresHuman: true,
        });
      }}
      onOpenContracts={onOpenContracts}
    />
  );
}

export default BrandSettingsScreen;
