/**
 * §WAVE 3i (2026-11-25) — SUPER-ADMIN CONTROL CENTRE (data).
 *
 * The model is DERIVED by its one owner (`buildControlCentre`), which reads the work
 * layer, the pre-audit store, the commercial-readiness records, the automation
 * registry, the acquisition engine and the audit log. This screen holds no figures of
 * its own: it builds the model and lets the founder move between its ten areas.
 */
import { useMemo, useState } from 'react';
import { useCanonicalStoreVersion } from '@/data/queries';
import {
  buildControlCentre,
  CONTROL_CENTRE_SECTIONS,
  type ControlCentreSectionId,
} from '@/lib/commandCentre/controlCentre';
import { AdminControlCentreView } from './AdminControlCentreView';

export function AdminControlCentreScreen({ onNavigate }: { onNavigate: (viewId: string) => void }) {
  const canonicalVersion = useCanonicalStoreVersion();
  const [activeSection, setActiveSection] = useState<ControlCentreSectionId>('business');

  const model = useMemo(() => {
    void canonicalVersion; // the model is re-derived whenever a canonical record changes
    return buildControlCentre();
  }, [canonicalVersion]);

  return (
    <AdminControlCentreView
      model={model}
      sections={CONTROL_CENTRE_SECTIONS}
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      onNavigate={onNavigate}
    />
  );
}