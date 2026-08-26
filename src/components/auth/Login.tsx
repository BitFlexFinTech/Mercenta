import { useApp } from '@/store';
import { cn } from '@/utils/cn';
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  Truck,
  ArrowRight,
  Lock,
} from 'lucide-react';

const DEMO_LOGINS = [
  {
    label: 'Login as Brand Partner',
    description: 'Access the 4-step onboarding wizard and brand overview dashboard',
    icon: Building2,
    color: 'border-neon-500/30 hover:bg-neon-500/10 text-neon-400',
    environment: 'brand' as const,
  },
  {
    label: 'Login as Boxbee Admin Hub',
    description: 'Enter the corporate management space with full department access',
    icon: ShieldCheck,
    color: 'border-blue-500/30 hover:bg-blue-500/10 text-blue-400',
    environment: 'admin' as const,
  },
  {
    label: 'Login as 3PL Carrier Terminal',
    description: 'Jump to the DHL / FedEx / BAK simulation and manifest desk',
    icon: Truck,
    color: 'border-amber-500/30 hover:bg-amber-500/10 text-amber-400',
    environment: 'carrier' as const,
  },
];

export function Login() {
  const { setEnvironment } = useApp();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
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
            <div className="w-10 h-10 rounded-lg bg-neon-500 flex items-center justify-center text-white font-bold">
              B
            </div>
            <span className="text-xl font-semibold text-white">Boxbee Commerce</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Client Portal Access</h1>
          <p className="text-sm text-zinc-500">
            Choose your environment to enter the platform
          </p>
        </div>

        {/* Demo Login Buttons */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-zinc-600 mb-2">
            <Lock className="w-3.5 h-3.5" />
            <span>Developer Demo Access — skip database checks</span>
          </div>
          {DEMO_LOGINS.map((login) => {
            const Icon = login.icon;
            return (
              <button
                key={login.label}
                onClick={() => setEnvironment(login.environment)}
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

        {/* Security note */}
        <div className="mt-8 text-center">
          <p className="text-xs text-zinc-600">
            Demo mode bypasses authentication for environment testing.
            Production deployments require Supabase email/password verification.
          </p>
        </div>
      </div>
    </div>
  );
}
