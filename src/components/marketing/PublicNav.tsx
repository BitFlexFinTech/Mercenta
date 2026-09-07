import { useState, useRef, useEffect } from 'react';
import { BRAND_NAME } from '@/config/brand';
import { cn } from '@/utils/cn';
import logoMark from '@/assets/mercenta-mark-dark-bg.svg';
import { ChevronDown, Menu, X } from 'lucide-react';

export type PublicPage = 'home' | 'how-it-works' | 'uk-market-access' | 'for-brands' | 'faq' | 'privacy' | 'terms';

interface PublicNavProps {
  currentPage: PublicPage;
  onNavigate: (page: PublicPage) => void;
  onOpenPortal: () => void;
}

const NAV_LINKS: { label: string; page: PublicPage; children?: { label: string; page: PublicPage }[] }[] = [
  {
    label: 'Solutions & Services',
    page: 'how-it-works',
    children: [
      { label: 'How It Works', page: 'how-it-works' },
      { label: 'UK Market Access', page: 'uk-market-access' },
      { label: 'For Brands', page: 'for-brands' },
    ],
  },
  {
    label: 'Resources',
    page: 'faq',
    children: [
      { label: 'FAQ', page: 'faq' },
      { label: 'Privacy Policy', page: 'privacy' },
      { label: 'Terms of Service', page: 'terms' },
    ],
  },
];

function NavLink({
  label,
  page,
  onNavigate,
  className,
}: {
  label: string;
  page: PublicPage;
  onNavigate: (p: PublicPage) => void;
  className?: string;
}) {
  const href = `/${page === 'home' ? '' : page}`;
  return (
    <a
      href={href}
      onClick={(e) => { e.preventDefault(); onNavigate(page); }}
      className={cn('text-xs text-zinc-400 hover:text-brass-400 transition-colors', className)}
    >
      {label}
    </a>
  );
}

export function PublicNav({ currentPage, onNavigate, onOpenPortal }: PublicNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNav = (page: PublicPage) => {
    onNavigate(page);
    setMobileOpen(false);
    setOpenDropdown(null);
  };

  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-ink/80 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a
          href="/"
          onClick={(e) => { e.preventDefault(); handleNav('home'); }}
          className="flex items-center gap-2.5"
        >
          <img src={logoMark} alt={`${BRAND_NAME} hexagon mark`} className="w-7 h-7" />
          <span className="text-sm font-semibold text-parchment hidden sm:inline">{BRAND_NAME}</span>
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6" ref={dropdownRef}>
          {NAV_LINKS.map((item) => (
            <div key={item.page} className="relative">
              {item.children ? (
                <button
                  onClick={() => setOpenDropdown(openDropdown === item.page ? null : item.page)}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-brass-400 transition-colors"
                >
                  {item.label}
                  <ChevronDown className={cn('w-3 h-3 transition-transform', openDropdown === item.page && 'rotate-180')} />
                </button>
              ) : (
                <NavLink label={item.label} page={item.page} onNavigate={handleNav} />
              )}
              {item.children && openDropdown === item.page && (
                <div className="absolute top-full left-0 mt-2 w-52 bg-ink-850 border border-white/[0.08] rounded-xl shadow-2xl py-2 animate-fade-in">
                  {item.children.map((child) => (
                    <a
                      key={child.page}
                      href={`/${child.page}`}
                      onClick={(e) => { e.preventDefault(); handleNav(child.page); }}
                      className={cn(
                        'block px-4 py-2 text-xs text-zinc-400 hover:text-brass-400 hover:bg-white/[0.04] transition-colors',
                        currentPage === child.page && 'text-brass-400'
                      )}
                    >
                      {child.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button
            onClick={onOpenPortal}
            className="text-xs font-medium bg-brass hover:bg-brass-600 text-ink px-4 py-1.5 rounded-lg transition-colors"
          >
            Partner Login
          </button>
        </div>

        {/* Mobile */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="md:hidden text-zinc-400 hover:text-white transition-colors"
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-ink-900 border-b border-white/[0.06] px-6 py-4 space-y-3 animate-fade-in">
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); handleNav('home'); }}
            className={cn('block text-sm text-zinc-400 hover:text-brass-400', currentPage === 'home' && 'text-brass-400')}
          >
            Home
          </a>
          {NAV_LINKS.flatMap((item) =>
            item.children
              ? item.children.map((child) => (
                  <a
                    key={child.page}
                    href={`/${child.page}`}
                    onClick={(e) => { e.preventDefault(); handleNav(child.page); }}
                    className={cn('block text-sm text-zinc-400 hover:text-brass-400 pl-4', currentPage === child.page && 'text-brass-400')}
                  >
                    {child.label}
                  </a>
                ))
              : (
                  <a
                    key={item.page}
                    href={`/${item.page === 'home' ? '' : item.page}`}
                    onClick={(e) => { e.preventDefault(); handleNav(item.page); }}
                    className={cn('block text-sm text-zinc-400 hover:text-brass-400', currentPage === item.page && 'text-brass-400')}
                  >
                    {item.label}
                  </a>
                )
          )}
          <button
            onClick={() => { setMobileOpen(false); onOpenPortal(); }}
            className="w-full text-sm font-medium bg-brass hover:bg-brass-600 text-ink px-4 py-2 rounded-lg transition-colors"
          >
            Partner Login
          </button>
        </div>
      )}
    </nav>
  );
}