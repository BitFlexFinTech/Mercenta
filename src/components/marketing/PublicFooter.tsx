import { BRAND_NAME } from "@/config/brand";
import { publicCompanyLine } from "@/config/positioning";
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
  /**
   * §PUBLIC MESSAGING (2026-09-28) — MEASURED CONTRAST FIX.
   *
   * These links were `text-zinc-600` on the `ink-900` footer surface, which
   * measures 2.56:1 — below the WCAG AA floor of 4.5:1 for normal text and even
   * below the 3:1 large-text floor. They now use `steel`, the design system's own
   * muted-text token, which measures 6.37:1 on the same surface and passes AA.
   */
  const linkClass = "text-ds-label text-steel hover:text-brass-400 transition-colors cursor-pointer block py-0.5";

  return (
    <footer className="bg-ink-900 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
{/* Col 1 — Company */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src={logoLockup} alt={BRAND_NAME} className="h-8 rounded-md" />
            </div>
            <p className="text-ds-label text-steel leading-relaxed mb-4">
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
                <span key={cat} className="text-ds-label text-steel block py-0.5">{cat}</span>
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
          {/*
            §PUBLIC MESSAGING (2026-09-28) — THE LEGAL LINE CARRIES THE COMPANY'S
            PUBLIC IDENTITY AND NOTHING ELSE. It previously read "… · UK Importer
            of Record — EORI Registered", which published the operating model on
            every one of the eight public pages. The block is now DERIVED from
            `src/config/positioning.ts` (which derives it from the statutory
            record), so the footer, the privacy policy and the terms cannot
            disagree, and nothing internal can be retyped here.
          */}
          <div className="font-mono text-ds-micro text-steel tracking-wide text-center md:text-left">
            {publicCompanyLine()}
          </div>
          <div className="font-mono text-ds-micro text-steel">
            &copy; {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
