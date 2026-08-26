import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/store';
import { Search, Bell, ChevronDown } from 'lucide-react';

interface HeaderProps {
  breadcrumb: string;
}

export function Header({ breadcrumb }: HeaderProps) {
  const { setEnvironment } = useApp();
  const [profileOpen, setProfileOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-14 flex-shrink-0 bg-ink-900 border-b border-white/[0.06] flex items-center justify-between px-6">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-zinc-600">Home</span>
        <span className="text-zinc-700">/</span>
        <span className="text-white font-medium">{breadcrumb}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-ink-850 border border-white/[0.06] rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-neon-500/40 w-56 transition-all"
          />
        </div>

        <button className="relative p-1.5 text-zinc-500 hover:text-white transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-neon-500 rounded-full" />
        </button>

        <div className="relative" ref={ref}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neon-600 to-neon-700 flex items-center justify-center text-xs font-semibold text-white">
              DA
            </div>
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-ink-850 border border-white/[0.08] rounded-xl shadow-2xl py-2 animate-fade-in z-50">
              <div className="px-4 py-2 border-b border-white/[0.06]">
                <div className="text-sm font-medium text-white">Dave Anderson</div>
                <div className="text-xs text-zinc-500">dave@boxbee.commerce</div>
              </div>
              <div className="py-1">
                {['Account Settings', 'Billing & Payouts', 'API Keys'].map(
                  (item) => (
                    <button
                      key={item}
                      className="w-full text-left px-4 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  onClick={() => setEnvironment('login')}
                  className="w-full text-left px-4 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors border-t border-white/[0.06] mt-1 pt-2"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
