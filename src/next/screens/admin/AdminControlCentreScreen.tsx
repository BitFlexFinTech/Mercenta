/**
 * §WAVE 3i (2026-11-25) — SUPER-ADMIN CONTROL CENTRE (data).
 * §WAVE 3j (2026-11-25) — the specialised panels are derived here too.
 *
 * The model is DERIVED by its one owner (`buildControlCentre`), which reads the work
 * layer, the pre-audit store, the commercial-readiness records, the automation
 * registry, the acquisition engine and the audit log. The PANELS are derived from that
 * model by `buildControlPanels` — the same figures, arranged so every sub-model the
 * owner computes is actually drawn. This screen holds no figures of its own: it builds
 * the model, builds the panels, and lets the founder move between the ten areas.
 */
import { useMemo, useState } from 'react';
import { useCanonicalStoreVersion } from '@/data/queries';
import {
  buildControlCentre,
  CONTROL_CENTRE_SECTIONS,
  type ControlCentreSectionId,
} from '@/lib/commandCentre/controlCentre';
import { buildControlPanels, panelsForSection } from './controlCentrePanels';
import { AdminControlCentreView } from './AdminControlCentreView';

export function AdminControlCentreScreen({ onNavigate }: { onNavigate: (viewId: string) => void }) {
  const canonicalVersion = useCanonicalStoreVersion();
  const [activeSection, setActiveSection] = useState<ControlCentreSectionId>('business');

  const { model, panels } = useMemo(() => {
    void canonicalVersion; // the model is re-derived whenever a canonical record changes
    const built = buildControlCentre();
    return { model: built, panels: buildControlPanels(built) };
  }, [canonicalVersion]);

  const sectionPanels = useMemo(() => panelsForSection(panels, activeSection), [panels, activeSection]);

  return (
    <AdminControlCentreView
      model={model}
      sections={CONTROL_CENTRE_SECTIONS}
      activeSection={activeSection}
      sectionPanels={sectionPanels}
      onSelectSection={setActiveSection}
      onNavigate={onNavigate}
    />
  );
}