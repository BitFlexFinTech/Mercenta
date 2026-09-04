import { useEffect, useState } from 'react';
import { useApp } from '@/store';
import { cn } from '@/utils/cn';
import {
  Globe2,
  ArrowRight,
  Building2,
  Warehouse,
} from 'lucide-react';
import {
  fetchHomepageContent,
  getIconByName,
  type HomepageContent,
} from '@/services/homepage';

const FALLBACK_DEFAULTS: HomepageContent = {
  nav_items: ['Home', 'About Us', 'Services', 'Global Network'],
  global_pathways: [],
  services: [],
  hero_text: 'Global 1P Wholesale Trade Platform',
};

export function Home() {
  const { setEnvironment } = useApp();
  const [content, setContent] = useState<HomepageContent>(FALLBACK_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHomepageContent().then((data) => {
      setContent(data);
      setLoading(false);
    });
  }, []);

  // Render nothing until data is available (prevents flash of wrong content)
  if (loading) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Bar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-neon-500 flex items-center justify-center text-white font-bold">
              B
            </div>
            <span className="text-lg font-semibold">Boxbee Commerce</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {content.nav_items.map((item) => (
              <button
                key={item}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {item}
              </button>
            ))}
          </div>
          <button
            onClick={() => setEnvironment('login')}
            className="flex items-center gap-2 bg-neon-500 hover:bg-neon-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Get Started
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-neon-500/10 border border-neon-500/20 rounded-full px-4 py-1.5 mb-6">
            <Globe2 className="w-3.5 h-3.5 text-neon-400" />
            <span className="text-xs text-neon-400 font-medium">{content.hero_text}</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Scale your brand into the{' '}
            <span className="text-neon-400">UK market</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
            Boxbee Commerce is the exclusive UK Importer of Record for American, European,
            and African brands. We buy your inventory wholesale, clear customs, and route it
            straight to Amazon 1P channels.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setEnvironment('login')}
              className="flex items-center gap-2 bg-neon-500 hover:bg-neon-400 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Client Portal
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEnvironment('login')}
              className="text-zinc-400 hover:text-white text-sm font-medium px-6 py-3 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* Global Network Pathways */}
      <section className="py-16 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">Global Network</h2>
          <p className="text-sm text-zinc-500 text-center mb-10">
            Three regional pathways, one UK distribution hub
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.global_pathways.map((path) => {
              const Icon = getIconByName(path.icon);
              return (
                <div
                  key={path.region}
                  className={cn(
                    'bg-ink-900 border rounded-xl p-6 hover:bg-ink-850 transition-colors',
                    path.color
                  )}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{path.flag}</span>
                    <Icon className="w-5 h-5" />
                    <h3 className="text-base font-semibold text-white">{path.region}</h3>
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">{path.route}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">What We Do</h2>
          <p className="text-sm text-zinc-500 text-center mb-10">
            End-to-end wholesale distribution infrastructure
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {content.services.map((service) => {
              const Icon = getIconByName(service.icon);
              return (
                <div
                  key={service.title}
                  className="bg-ink-900 border border-white/[0.06] rounded-xl p-6"
                >
                  <div className="w-10 h-10 rounded-lg bg-neon-500/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-neon-400" />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{service.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto text-center">
          <Building2 className="w-10 h-10 text-neon-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-3">Ready to enter the UK market?</h2>
          <p className="text-sm text-zinc-500 mb-8">
            Join brands from the US, Europe, and Africa already scaling through Boxbee Commerce.
          </p>
          <button
            onClick={() => setEnvironment('login')}
            className="inline-flex items-center gap-2 bg-neon-500 hover:bg-neon-400 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Get Started
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-neon-500 flex items-center justify-center text-white text-xs font-bold">
              B
            </div>
            <span className="text-sm text-zinc-500">Boxbee Commerce Ltd</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-600">
            <Warehouse className="w-3.5 h-3.5" />
            UK Importer of Record — EORI Registered
          </div>
        </div>
      </footer>
    </div>
  );
}
