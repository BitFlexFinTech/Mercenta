import { useApp } from '@/context/GlobalStateContext';
import { BRAND_NAME } from '@/config/brand';
import { ALL_DEMO_BRANDS } from '@/data/demoData';
import brandMark from '@/assets/mercenta-mark-dark-bg.svg';
import { cn } from '@/utils/cn';
import type { Environment, SessionRole } from '@/types';
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  Truck,
  ArrowRight,
  Lock,
  Crown,
} from 'lucide-react';

/** §Stage-17 fix — flag per nation of every seeded demo brand. */
const NATION_FLAGS: Record<string, string> = {
  Zimbabwe: '🇿🇼',
  Denmark: '🇩🇰',
  'United States': '🇺🇸',
  Germany: '🇩🇪',
  Netherlands: '🇳🇱',
  'South Africa': '🇿🇦',
  Morocco: '🇲🇦',
};

/** Rotating accents so 11 cards don't render as one monochrome wall. */
const ACCENTS = [
  'border-amber-500/30 hover:bg-amber-500/10',
  'border-blue-500/30 hover:bg-blue-500/10',
  'border-emerald-500/30 hover:bg-emerald-500/10',
];

/**
 * §Stage-17 fix #1 — demo login renders EVERY seeded brand from
 * ALL_DEMO_BRANDS via activateDemoBrand(brandId). The list is derived, not
 * hardcoded: adding a brand to demoData automatically adds its login card.
 */
const OPS_LOGINS: {
  label: string;
  description: string;
  icon: typeof Building2;
  color: string;
  environment: Environment;
  role: SessionRole;
}[] = [
  {
    label: 'Mercenta Admin Hub',
    description: 'Corporate control panel — departments & trade desk',
    icon: ShieldCheck,
    color: 'border-blue-500/30 hover:bg-blue-500/10 text-blue-400',
    environment: 'admin',
    role: 'Mercenta Admin',
  },
  {
    label: '3PL Carrier Terminal',
    description: 'DHL / FedEx / BAK manifest & tracking desk',
    icon: Truck,
    color: 'border-amber-500/30 hover:bg-amber-500/10 text-amber-400',
    environment: 'carrier',
    role: '3PL Carrier',
  },
  {
    label: 'Super Admin — Tadii',
    description: 'Master staff & role matrix with full deployment control',
    icon: Crown,
    color: 'border-red-500/30 hover:bg-red-500/10 text-red-400',
    environment: 'admin',
    role: 'Super Admin',
  },
];

export function Login() {
  const { signIn, setEnvironment, activateDemoBrand } = useApp();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl">
        {/* Back to home */}
        <button
          onClick={() => setEnvironment('home')}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </button>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <img
              src={brandMark}
              alt="Mercenta Partners hexagon mark"
              className="w-10 h-10"
            />
            <span className="text-xl font-semibold text-white">{BRAND_NAME}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Investor Demo Access</h1>
          <p className="text-sm text-zinc-500">
            One-click access as any seeded brand — or an operations environment
          </p>
        </div>

        {/* §Stage-17 — ALL seeded demo brands, derived from ALL_DEMO_BRANDS. */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs mb-3">
            <Building2 className="w-3.5 h-3.5 text-brass-400" />
            <span className="font-medium text-zinc-400 uppercase tracking-wider">
              Brand Partner Portals — all {ALL_DEMO_BRANDS.length} demo brands
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ALL_DEMO_BRANDS.map((brand, i) => (
              <button
                key={brand.id}
                onClick={() => activateDemoBrand(brand.id)}
                className={cn(
                  'bg-ink-900 border rounded-xl p-4 text-left transition-all group',
                  ACCENTS[i % ACCENTS.length]
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{NATION_FLAGS[brand.nation] ?? '🌍'}</span>
                  <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider truncate">
                    {brand.category}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white leading-snug">{brand.name}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{brand.nation} · {brand.signatory}</p>
                <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed capitalize">
                  {brand.track.replace(/_/g, ' ')} · contract {brand.contractStatus.replace(/_/g, ' ')}
                </p>
                <div className="flex items-center gap-1 mt-3 text-xs text-brass-400 font-medium">
                  Enter as brand
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Operations Access */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span className="font-medium text-zinc-400 uppercase tracking-wider">
              Operations & Control Access
            </span>
          </div>
          {OPS_LOGINS.map((login) => {
            const Icon = login.icon;
            return (
              <button
                key={login.label}
                onClick={() => signIn(login.environment, login.role)}
                className={cn(
                  'w-full bg-ink-900 border rounded-xl p-4 text-left transition-all group',
                  login.color
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">{login.label}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{login.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Demo mode notice */}
        <div className="mt-8 text-center">
          <p className="text-xs text-zinc-600">
            Mercenta Partners Investor Demo — data shown is illustrative.
            Production credentials and authentication can be activated at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
