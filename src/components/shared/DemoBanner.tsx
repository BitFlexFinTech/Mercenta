import { useEffect, useState } from 'react';
import { DEMO_BANNER_TEXT } from '@/config/demo';
import { environmentMode, subscribeEnvironment } from '@/config/environment';
import { Info } from 'lucide-react';

/**
 * §P1/§Batch-0 — the demo-mode notice, driven by the ONE environment switch.
 *
 * It used to read the hardcoded DEMO_MODE constant, so it showed even in LIVE
 * mode. It now follows src/config/environment.ts: it appears in demo and is
 * silent in live (a live platform shows real data, never a demo notice).
 */
export function DemoBanner() {
  const [isDemo, setIsDemo] = useState(() => environmentMode() === 'demo');
  useEffect(() => subscribeEnvironment(() => setIsDemo(environmentMode() === 'demo')), []);
  if (isDemo === false) return null;
  return (
    <div className="bg-sky-500/10 border border-sky-500/20 rounded-ds-md p-3 text-ds-label text-sky-200 flex items-start gap-2">
      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span>{DEMO_BANNER_TEXT}</span>
    </div>
  );
}
