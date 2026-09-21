import { BRAND_NAME, BRAND_LEGAL_NAME } from "@/config/brand";
import logoLockup from "@/assets/mercenta-logo-lockup.svg";

interface PublicFooterProps {
  onNavigate: (page: 'home' | 'how-it-works' | 'uk-market-access' | 'for-brands' | 'faq' | 'privacy' | 'terms') => void;
  onOpenPortal: () => void;
}

const CATEGORIES = [
  "Home", "Baby", "Office Products", "Health & Personal Care",
  "Kitchen", "Consumer Electronics", "Automotive", "Grocery", "Personal Computer", "Apparel",
];

export function PublicFooter({ onNavigate, onOpenPortal }: PublicFooterProps) {
  const linkClass = "text-ds-label text-zinc-600 hover:text-brass-400 transition-colors cursor-pointer block py-0.5";

  return (
    <footer className="bg-ink-900 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
{/* Col 1 — Company */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src={logoLockup} alt={BRAND_LEGAL_NAME} className="h-8 rounded-md" />
            </div>
            <p className="text-ds-label text-zinc-500 leading-relaxed mb-4">
              Self-service wholesale distribution platform connecting independent brands with UK retail channels.
            </p>
            <button onClick={onOpenPortal} className="text-xs font-medium bg-brass hover:bg-brass-600 text-ink px-4 py-1.5 rounded-lg transition-colors">
              Request Partner Access
            </button>
          </div>

          {/* Col 2 — Solutions */}
          <div>
            <h4 className="text-xs font-semibold text-parchment mb-3">Solutions &amp; Services</h4>
            <div className="space-y-1">
              <button onClick={() => onNavigate('how-it-works')} className={linkClass}>How It Works</button>
              <button onClick={() => onNavigate('uk-market-access')} className={linkClass}>UK Market Access</button>
              <button onClick={() => onNavigate('for-brands')} className={linkClass}>For Brands</button>
            </div>
          </div>

          {/* Col 3 — Categories */}
          <div>
            <h4 className="text-xs font-semibold text-parchment mb-3">Product Categories</h4>
            <div className="space-y-1">
              {CATEGORIES.map((cat) => (
                <span key={cat} className="text-ds-label text-zinc-600 block py-0.5">{cat}</span>
              ))}
            </div>
          </div>

          {/* Col 4 — Resources */}
          <div>
            <h4 className="text-xs font-semibold text-parchment mb-3">Resources</h4>
            <div className="space-y-1">
              <button onClick={() => onNavigate('faq')} className={linkClass}>FAQ</button>
              <button onClick={() => onNavigate('privacy')} className={linkClass}>Privacy Policy</button>
              <button onClick={() => onNavigate('terms')} className={linkClass}>Terms of Service</button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/[0.06] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="font-mono text-ds-micro text-zinc-600 tracking-wide text-center md:text-left">
            {BRAND_LEGAL_NAME} &middot; UK Importer of Record &mdash; EORI Registered
          </div>
          <div className="font-mono text-ds-micro text-zinc-600">
            &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
