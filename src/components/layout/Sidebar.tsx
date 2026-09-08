import { type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { useApp } from '@/context/GlobalStateContext';
import brandMark from '@/assets/mercenta-mark-dark-bg.svg';

/**
 * §Phase 6 — grouped navigation model.
 * A flat nav list has been replaced with explicit sections. Section items
 * keep the exact same view ids/targets as before; sections are pure
 * presentation grouping so navigation behavior and RBAC are unchanged.
 */
export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  tourAttr?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  /** Sections (one implied for ungrouped navs). */
  sections: NavSection[];
  activeView: string;
  setActiveView: (v: string) => void;
  userName: string;
  themeAccent?: string;
}

export function Sidebar({
  sections,
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
    <aside
      id="app-sidebar"
      aria-label="Primary"
      className="flex h-full w-full flex-col bg-ink-900"
    >
      <div className="border-b border-white/[0.06] px-5 pb-5 pt-5">
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

      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-2">
        {sections.map((section) => (
          <div key={section.label}>
            {section.label && (
              <p className="mb-1 mt-1 px-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                {section.label}
              </p>
            )}
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActiveView(item.id)}
                    data-tour={item.tourAttr}
                    data-state={activeView === item.id ? 'active' : 'idle'}
                    aria-current={activeView === item.id ? 'page' : undefined}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-ds-md px-3 py-2 text-sm transition-ds',
                      activeView === item.id
                        ? 'bg-white/[0.08] text-white'
                        : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
                    )}
                  >
                    <span
                      className={cn(
                        'flex-shrink-0 h-4 w-4',
                        activeView === item.id ? 'text-white' : 'text-zinc-600'
                      )}
                      style={activeView === item.id ? { color: themeAccent } : {}}
                    >
                      {item.icon}
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-ds-md px-2 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 text-xs font-semibold text-white">
            {userName
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-white">
              {userName}
            </div>
            <div className="truncate text-[10px] text-zinc-500">
              {envLabel} User
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
