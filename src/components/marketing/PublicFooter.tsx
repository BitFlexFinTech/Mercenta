import { BRAND_NAME } from "@/config/brand";
import {
  PUBLIC_COOKIE_SETTINGS_LABEL,
  PUBLIC_FOOTER_COLUMNS,
  PUBLIC_PROMISE,
  publicCompanyLine,
  type PublicLinkPage,
} from "@/config/positioning";
import { COOKIE_SETTINGS_EVENT } from "@/components/marketing/CookieNotice";
import { APPROVED_CATEGORIES } from "@/types";
import logoLockup from "@/assets/mercenta-logo-lockup.svg";

interface PublicFooterProps {
  onNavigate: (page: PublicLinkPage) => void;
  onOpenPortal: () => void;
}

/**
 * §PUBLIC MESSAGING B4 (2026-09-28) — THE FOOTER, REBUILT TO ITS FIVE-COLUMN SHAPE.
 *
 * WHAT WAS WRONG.
 *
 *  1. IT PUBLISHED A DESCRIPTION THE REST OF THE SITE HAD ALREADY RETIRED. The
 *     brand column read "Self-service wholesale distribution platform connecting
 *     independent brands with UK retail channels" — the exact wording B3 removed
 *     from `HowItWorks`, and it contradicts `PUBLIC_CATEGORY` ("Retail channel
 *     partner"). It is now `PUBLIC_PROMISE`, the canonical owner, so the footer
 *     cannot describe the business differently from the pages above it.
 *
 *  2. IT RETAINED A SECOND COPY OF THE TEN CATEGORIES. `CATEGORIES` here was a
 *     hand-maintained literal duplicating `APPROVED_CATEGORIES` in `src/types.ts`
 *     — two sources of truth for the ten approved categories, which the SSOT rule
 *     forbids and which the audit's dataset-completeness check exists to catch.
 *     The list is now READ from its owner, so the footer renders exactly ten
 *     whenever the canonical list holds ten.
 *
 *  3. IT WAS FOUR COLUMNS, AND ITS LINKS DID NOT COME FROM THE NAVIGATION
 *     OWNER — so a label could differ from the header's. Both now read
 *     `src/config/positioning.ts` §12, and the four owner columns plus the brand
 *     column make the declared five.
 *
 *  4. THE `onNavigate` PROP COULD NOT EXPRESS THE EXPLORE ROUTE the header
 *     offers. It is now the owner's route union, so the footer can link anywhere
 *     the model allows.
 *
 * THE CONTRAST FIX REMAINS: these links were `text-zinc-600` on the `ink-900`
 * footer surface, which measures 2.56:1 — below the WCAG AA floor of 4.5:1 for
 * normal text and even below the 3:1 large-text floor. They use `steel`, the
 * design system's muted-text token (6.37:1 on the same surface).
 *
 * The legal line stays DERIVED from `publicCompanyLine()` and is never retyped.
 */
export function PublicFooter({ onNavigate, onOpenPortal }: PublicFooterProps) {
  /**
   * §PUBLIC MESSAGING (2026-09-28) — MEASURED CONTRAST FIX.
   *
   * These links were `text-zinc-600` on the `ink-900` footer surface, which
   * measures 2.56:1 — below the WCAG AA floor of 4.5:1 for normal text and even
   * below the 3:1 large-text floor. They now use `steel`, the design system's own
   * muted-text token, which measures 6.37:1 on the same surface and passes AA.
   */
  const linkClass = "text-ds-label text-steel hover:text-brass-400 transition-colors cursor-pointer block py-0.5 text-left";

  return (
    <footer className="bg-ink-900 border-t border-white/[0.06]">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* The declared FIVE-column shape: the brand column, then four owner columns. */}
        <div className="grid grid-cols-2 gap-8 mb-10 md:grid-cols-3 lg:grid-cols-5">
          {/* Col 1 — Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img src={logoLockup} alt={BRAND_NAME} className="h-8 rounded-md" />
            </div>
            <p className="text-ds-label text-steel leading-relaxed mb-4">
              {PUBLIC_PROMISE}
            </p>
            <button onClick={onOpenPortal} className="text-xs font-medium bg-brass hover:bg-brass-600 text-ink px-4 py-1.5 rounded-lg transition-colors">
              Request Partner Access
            </button>
          </div>

          {PUBLIC_FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-xs font-semibold text-parchment mb-3">{col.heading}</h4>
              {col.kind === "categories" ? (
                <div className="space-y-1">
                  {APPROVED_CATEGORIES.map((cat) => (
                    <span key={cat} className="text-ds-label text-steel block py-0.5">{cat}</span>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {col.links.map((link) => (
                    <button key={link.page} onClick={() => onNavigate(link.page)} className={linkClass}>
                      {link.label}
                    </button>
                  ))}
                  {/*
                    §B4 — the cookie notice is RE-OPENABLE. The notice records only
                    that it was read; this control clears that record and raises the
                    notice again, so a visitor can always read it a second time.
                  */}
                  {col.withCookieSettings && (
                    <button
                      onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}
                      className={linkClass}
                    >
                      {PUBLIC_COOKIE_SETTINGS_LABEL}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
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
