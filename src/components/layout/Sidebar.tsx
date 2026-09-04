import { type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { useApp } from '@/context/GlobalStateContext';
import brandMark from '@/assets/mercenta-mark-dark-bg.svg';

interface SidebarProps {
  items: { id: string; label: string; icon: ReactNode; tourAttr?: string }[];
  activeView: string;
  setActiveView: (v: string) => void;
  userName: string;
  themeAccent?: string;
}

export function Sidebar({
  items,
  activeView,
  setActiveView,
  userName,
  themeAccent = '#A855F7',
}: SidebarProps) {
  const { environment } = useApp();

  const envLabel =
    environment === 'brand'
      ? 'Brand Portal'
      : environment === 'admin'
      ? 'Admin Hub'
      : 'Carrier View';

  return (
    <aside className="w-60 flex-shrink-0 bg-ink-900 border-r border-white/[0.06] flex flex-col">
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <img
            src={brandMark}
            alt="Mercenta Partners hexagon mark"
            className="w-8 h-8"
          />
          <div>
            <div className="text-sm font-semibold text-white tracking-tight">
              Mercenta
            </div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {envLabel}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            data-tour={item.tourAttr}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 mb-0.5',
              activeView === item.id
                ? 'bg-white/[0.06] text-white'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
            )}
          >
            <span
              className={cn(
                'flex-shrink-0 w-4 h-4',
                activeView === item.id ? 'text-white' : 'text-zinc-600'
              )}
              style={activeView === item.id ? { color: themeAccent } : {}}
            >
              {item.icon}
            </span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-xs font-semibold text-white">
            {userName
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-white truncate">
              {userName}
            </div>
            <div className="text-[10px] text-zinc-500 truncate">
              {envLabel} User
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
