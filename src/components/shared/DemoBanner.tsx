import { DEMO_BANNER_TEXT, DEMO_MODE } from '@/config/demo';
import { Info } from 'lucide-react';

/** Persistent demo-mode notice for dashboards fed by seed/integration-shaped data. */
export function DemoBanner() {
  if (!DEMO_MODE) return null;
  return (
    <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3 text-ds-label text-sky-200 flex items-start gap-2">
      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{DEMO_BANNER_TEXT}</span>
    </div>
  );
}
