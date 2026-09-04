import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { Search, ChevronDown, Settings, CreditCard, Key } from 'lucide-react';
import brandMark from '@/assets/mercenta-mark-dark-bg.svg';
import { NotificationCenter } from '@/components/shared/NotificationCenter';

interface HeaderProps {
  breadcrumb: string;
  /** Navigate to the account-settings view for the current session */
  onNavSettings?: () => void;
  /** Navigate to the billing/payouts view for the current session */
  onNavBilling?: () => void;
  /** Navigate to the API keys / integrations view for the current session */
  onNavApiKeys?: () => void;
  /** §Batch-10 — notification navigation callback */
  onNavNotification?: (view: string) => void;
}

/**
 * Derives the displayed user identity from the active session.
 * Brand sessions use brandProfile; admin/staff use actingStaff.
 */
function useSessionIdentity() {
  const { session, role, brandProfile, actingStaff } = useApp();

  if (!session) {
    return { name: 'Signed Out', email: '', initials: '?', roleLabel: '' };
  }

  // Brand session — derive from brand profile
  if (session.tier === 'brand') {
    const name = brandProfile.signatory || brandProfile.businessName || 'Brand Partner';
    const email = brandProfile.email || '';
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    return { name, email, initials, roleLabel: role ?? 'Brand Partner' };
  }

  // Admin / staff session — derive from actingStaff
  if (actingStaff) {
    const name = actingStaff.name;
    const email = actingStaff.email;
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    return { name, email, initials, roleLabel: actingStaff.role };
  }

  // Admin / super-admin fallback when no staff record is selected
  const fallbackName = role ?? 'Mercenta Staff';
  return {
    name: fallbackName,
    email: '',
    initials: fallbackName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2),
    roleLabel: role ?? 'Mercenta Staff',
  };
}

export function Header({
  breadcrumb,
  onNavSettings,
  onNavBilling,
  onNavApiKeys,
  onNavNotification,
}: HeaderProps) {
  const { signOut } = useApp();
  const identity = useSessionIdentity();
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
        <img
          src={brandMark}
          alt="Mercenta Partners hexagon mark"
          className="w-6 h-6"
        />
        <button
          onClick={signOut}
          className="text-zinc-600 hover:text-white transition-colors"
          title="Back to homepage"
        >
          Home
        </button>
        <span className="text-zinc-700">/</span>
        <span className="text-white font-medium">{breadcrumb}</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-ink-850 border border-white/[0.06] rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40 w-56 transition-all"
          />
        </div>

        {/* §Stage-19.3 — real notification center (was a static bell) — renders <NotificationCenter /> */}
        <NotificationCenter onNavigate={onNavNotification} />

        <div className="relative" ref={ref}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brass-600 to-brass-700 flex items-center justify-center text-xs font-semibold text-white">
              {identity.initials}
            </div>
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-ink-850 border border-white/[0.08] rounded-xl shadow-2xl py-2 animate-fade-in z-50">
              <div className="px-4 py-2 border-b border-white/[0.06]">
                <div className="text-sm font-medium text-white">{identity.name}</div>
                <div className="text-xs text-zinc-500">{identity.email || identity.roleLabel}</div>
              </div>
              <div className="py-1">
                {[
                  { label: 'Account Settings', icon: <Settings className="w-3.5 h-3.5" />, onClick: onNavSettings },
                  { label: 'Billing & Payouts', icon: <CreditCard className="w-3.5 h-3.5" />, onClick: onNavBilling },
                  { label: 'API Keys', icon: <Key className="w-3.5 h-3.5" />, onClick: onNavApiKeys },
                ].map(
                  ({ label, icon, onClick }) => (
                    <button
                      key={label}
                      onClick={onClick}
                      className="w-full flex items-center gap-2.5 text-left px-4 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                    >
                      <span className="text-zinc-600">{icon}</span>
                      {label}
                    </button>
                  )
                )}
                <button
                  onClick={signOut}
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
