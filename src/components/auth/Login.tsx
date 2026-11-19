import { useEffect, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { BRAND_NAME } from '@/config/brand';
import { ALL_DEMO_BRANDS, DEMO_LOGIN_BRAND_IDS } from '@/data/demoData';
import { approvedApplicationBrands } from '@/data/applicationStore';
import brandMark from '@/assets/mercenta-mark-dark-bg.svg';
import { cn } from '@/utils/cn';
import type { Environment, SessionRole } from '@/types';
import { environmentMode, subscribeEnvironment } from '@/config/environment';
import { PartnerApplicationForm, ApplicationReceived } from './PartnerApplicationForm';
import { RealSignIn } from './RealSignIn';
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  ArrowRight,
  Lock,
  Crown,
  UserPlus,
} from 'lucide-react';

/**
 * §Stage-17 fix + §Phase 4 — flag per nation of every seeded demo brand.
 * Nations of the canonical 20 real brands are listed; the fallback (a globe
 * emoji) keeps the login rendering safe if a new real brand is added whose
 * nation is not listed yet. Only real companies are ever rendered here.
 */
const NATION_FLAGS: Record<string, string> = {
  'United Kingdom': '🇬🇧',
  'United States': '🇺🇸',
  Mexico: '🇲🇽',
  France: '🇫🇷',
  Italy: '🇮🇹',
  Germany: '🇩🇪',
  Switzerland: '🇨🇭',
  'South Korea': '🇰🇷',
};
const nationFlag = (nation: string): string => NATION_FLAGS[nation] ?? '🌐';

/** Rotating accents so the demo cards don't render as one monochrome wall. */
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
    label: 'Super Admin — Tadii',
    description: 'Master staff & role matrix with full deployment control',
    icon: Crown,
    color: 'border-red-500/30 hover:bg-red-500/10 text-red-400',
    environment: 'admin',
    role: 'Super Admin',
  },
];

export function Login() {
  const { signIn, setEnvironment, activateDemoBrand, activateOnboardingBrand, authMode } =
    useApp();
  const [showForm, setShowForm] = useState(false);
  const [appSubmitted, setAppSubmitted] = useState(false);
  const [isDemo, setIsDemo] = useState(() => environmentMode() === 'demo');
  useEffect(() => subscribeEnvironment(() => setIsDemo(environmentMode() === 'demo')), []);


  /**
   * §Phase E2 — brands whose tenant came from the CANONICAL onboarding record.
   * Loaded lazily (the canonical store is not part of the marketing bundle), and
   * DERIVED from the store — never a hardcoded list. A brand that has been handed
   * off into the platform can therefore actually reach its portal.
   */
  const [onboardingBrands, setOnboardingBrands] = useState<
    { brandId: string; businessName: string; category: string; track: string; status: string }[]
  >([]);
  useEffect(() => {
    void import('@/data/acquisitionStore').then((store) => {
      setOnboardingBrands(
        store.listOnboardings().map((o) => ({
          brandId: o.brandId,
          businessName: o.businessName,
          category: o.category,
          track: o.track,
          status: o.status,
        }))
      );
    });
  }, []);

  // Combine demo brands + approved application brands for login cards.
  // §Phase 4 / §16: demo cards are a REPRESENTATIVE subset declared next to
  // the canonical 20 (DEMO_LOGIN_BRAND_IDS) — never 20 buttons, and never a
  // second hidden brand source. Real onboarding records always render.
  const demoSubset = DEMO_LOGIN_BRAND_IDS;
  const allBrands = [
    ...(isDemo ? ALL_DEMO_BRANDS.filter(b => demoSubset.includes(b.id)).map(b => ({ id: b.id, name: b.name, nation: b.nation, category: b.category, signatory: b.signatory, track: b.track, contractStatus: b.contractStatus, fromApp: false as const })) : []),
    ...approvedApplicationBrands.map(b => ({ id: b.id, name: b.name, nation: b.country, category: b.category, signatory: b.signatory, track: b.track, contractStatus: 'active' as const, fromApp: true as const })),
  ];

  /** The canonical tenant for a card, when that brand came through onboarding. */
  const canonicalFor = (id: string) => onboardingBrands.find((b) => b.brandId === id);

  /**
   * One card per portal tenant. Cards backed by a canonical onboarding record
   * enter through the canonical activation path; the demo fixtures keep using the
   * demo dossier path, so existing behaviour is unchanged.
   */
  const portalCards = [
    ...allBrands.map((b) => {
      const canonical = canonicalFor(b.id);
      return {
        id: b.id,
        name: b.name,
        nation: b.nation,
        category: b.category,
        signatory: b.signatory,
        track: b.track,
        contractStatus: b.contractStatus,
        canonical: !!canonical,
        onboardingStatus: canonical?.status,
      };
    }),
    ...onboardingBrands
      .filter((b) => !allBrands.some((a) => a.id === b.brandId))
      .map((b) => ({
        id: b.brandId,
        name: b.businessName,
        nation: '',
        category: b.category,
        signatory: '',
        track: b.track,
        contractStatus: 'pending',
        canonical: true,
        onboardingStatus: b.status,
      })),
  ];

  /**
   * §PHASE B — when REAL authentication is the required path (a Supabase project
   * configured AND the platform in `live`), the role-picker below must NOT be
   * shown: it would let anyone select "Super Admin". This guard sits AFTER every
   * hook (Rules of Hooks) and leaves the demo path — where the investor
   * demonstration runs — completely untouched.
   */
  if (authMode === 'real') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6">
        <RealSignIn />
      </div>
    );
  }

  if (appSubmitted) {
    return <ApplicationReceived onBack={() => { setAppSubmitted(false); setShowForm(false); }} />;
  }

  if (showForm) {
    return <PartnerApplicationForm onBack={() => setShowForm(false)} onSubmitted={() => setAppSubmitted(true)} />;
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl">
        {/* Back to home */}
        <button
          onClick={() => setEnvironment('home')}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-strong transition-colors mb-8"
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
            <span className="text-xl font-semibold text-strong">{BRAND_NAME}</span>
          </div>
          <h1 className="text-2xl font-bold text-strong mb-1">Partner Login</h1>
          <p className="text-sm text-zinc-500">
            Access your brand portal or operations environment
          </p>
        </div>

        {/* §Stage-17 — ALL seeded demo brands, derived from ALL_DEMO_BRANDS. */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs mb-3">
            <Building2 className="w-3.5 h-3.5 text-brass-400" />
            <span className="font-medium text-zinc-400 uppercase tracking-wider">
              Brand Partner Portals — all {portalCards.length} brands
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {portalCards.map((brand, i) => (
              <button
                key={brand.id}
                onClick={() =>
                  brand.canonical ? activateOnboardingBrand(brand.id) : activateDemoBrand(brand.id)
                }
                className={cn(
                  'bg-ink-900 border rounded-ds-lg p-4 text-left transition-all group',
                  ACCENTS[i % ACCENTS.length]
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{nationFlag(brand.nation)}</span>
                  <span className="text-ds-micro font-medium text-zinc-400 uppercase tracking-wider truncate">
                    {brand.category}
                  </span>
                  {brand.canonical && (
                    <span className="ml-auto text-ds-micro font-medium text-brass-400 uppercase tracking-wider">
                      Onboarding
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-strong leading-snug">{brand.name}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {[brand.nation, brand.signatory].filter(Boolean).join(' · ') || 'Details pending'}
                </p>
                <p className="text-ds-label text-zinc-400 mt-2 leading-relaxed capitalize">
                  {brand.canonical
                    ? `${brand.onboardingStatus?.replace(/_/g, ' ')} · onboarding record`
                    : `${brand.track.replace(/_/g, ' ')} · contract ${brand.contractStatus.replace(/_/g, ' ')}`}
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
                  'w-full bg-ink-900 border rounded-ds-lg p-4 text-left transition-all group',
                  login.color
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-ds-md bg-tint flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-strong">{login.label}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{login.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-strong transition-colors" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Request Partner Access */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-brass-500 hover:bg-brass-600 text-strong font-medium px-6 py-3 rounded-ds-md transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Request Partner Access
          </button>
          <p className="text-xs text-zinc-600 mt-2">
            Don&apos;t have an account? Apply to distribute through {BRAND_NAME}&apos;s UK wholesale network
          </p>
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
