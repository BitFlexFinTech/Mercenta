import type { ReactNode } from 'react';
import { useApp } from '@/store';
import type { Environment } from '@/types';
import { cn } from '@/utils/cn';
import { Boxes, ShieldCheck, Truck } from 'lucide-react';

const ENVIRONMENTS: {
  id: Environment;
  label: string;
  icon: ReactNode;
}[] = [
  { id: 'brand', label: 'Brand Portal', icon: <Boxes className="w-3.5 h-3.5" /> },
  { id: 'admin', label: 'Boxbee Admin Hub', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { id: 'carrier', label: '3PL Carrier View', icon: <Truck className="w-3.5 h-3.5" /> },
];

export function EnvironmentRouter() {
  const { environment, setEnvironment } = useApp();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-3 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1 bg-ink-850/95 backdrop-blur-xl border border-white/[0.08] rounded-full px-2 py-1.5 shadow-2xl">
        <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider px-2 hidden sm:inline">
          Environment Router
        </span>
        <span className="text-[10px] font-medium text-neon-400 uppercase tracking-wider px-1 sm:hidden">
          Dev
        </span>
        {ENVIRONMENTS.map((env) => (
          <button
            key={env.id}
            onClick={() => setEnvironment(env.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
              environment === env.id
                ? 'bg-neon-500 text-white shadow-lg shadow-neon-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
            )}
          >
            {env.icon}
            <span className="hidden sm:inline">{env.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
