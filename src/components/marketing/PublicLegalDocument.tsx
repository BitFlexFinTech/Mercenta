import type { ReactNode } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { PublicNav, type PublicPage } from './PublicNav';
import { PublicFooter } from './PublicFooter';
import { PUBLIC_CATEGORY, PUBLIC_LEGAL_LAST_UPDATED } from '@/config/positioning';

/**
 * §PUBLIC MESSAGING B5 (2026-09-29) — THE SHARED SHELL FOR THE TWO LEGAL PAGES.
 *
 * WHY THIS EXISTS.
 *
 * `PrivacyPolicy.tsx` and `TermsOfService.tsx` were the last two public surfaces
 * that did not behave like public pages at all:
 *
 *  1. THEY HARDCODED THE DARK PALETTE (`bg-black text-white`), so the light
 *     shell was ignored completely — the same defect B3 fixed on the four inner
 *     pages, left standing on the two documents a brand is most likely to read
 *     before signing anything.
 *  2. THEY CARRIED NO PUBLIC NAVIGATION AND NO FOOTER, so a visitor who reached
 *     them had no route back into the site and no sight of the company identity
 *     block the footer publishes.
 *  3. EACH HELD ITS OWN COPY of the company's identity and of its contact
 *     address, and each dated itself independently — two documents that could
 *     drift from the footer and from each other.
 *
 * They now take the shell theme, render `PublicNav` + `PublicFooter`, and read
 * the eyebrow and the revision date from `src/config/positioning.ts`. The chrome
 * exists ONCE, here, so the two documents cannot drift apart from each other
 * either — a legal page supplies only its heading, its intro and its sections.
 *
 * The section renderer is deliberately plain: a legal document is read in
 * paragraphs, so it is left-aligned (unlike the centred marketing headers) and
 * uses the design system's own text tokens rather than new colours.
 */
export interface PublicLegalSection {
  title: string;
  body: ReactNode;
}

interface PublicLegalDocumentProps {
  /** The owner's own route union, so a page cannot exist that the model denies. */
  page: PublicPage;
  heading: string;
  intro: ReactNode;
  sections: readonly PublicLegalSection[];
  onNavigate: (page: PublicPage) => void;
  onOpenPortal: () => void;
}

export function PublicLegalDocument({
  page,
  heading,
  intro,
  sections,
  onNavigate,
  onOpenPortal,
}: PublicLegalDocumentProps) {
  const { shellMode } = useTheme();

  return (
    <div data-shell-theme={shellMode} className="min-h-screen font-plex" style={{ backgroundColor: 'var(--mr-bg)' }}>
      <PublicNav currentPage={page} onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
      <main className="pt-24 pb-16">
        <section className="px-6 pb-12">
          {/*
            The eyebrow is the FIRST `font-mono` paragraph in `<main>`, which is
            the element the live check measures for its one-line assertion, and it
            steps down to the 11px micro floor below `sm` so it holds one line at
            390px exactly as it does on the marketing pages.
          */}
          <div className="mx-auto max-w-3xl">
            <p className="font-mono uppercase text-ds-micro tracking-[0.06em] text-brass sm:text-ds-label sm:tracking-[0.25em]">
              {PUBLIC_CATEGORY}
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.12] md:text-4xl">{heading}</h1>
            <p className="mt-3 font-mono text-ds-micro uppercase tracking-[0.14em]" style={{ color: 'var(--mr-text-muted)' }}>
              Last updated: {PUBLIC_LEGAL_LAST_UPDATED}
            </p>
            <div className="mt-4 text-sm leading-relaxed md:text-base" style={{ color: 'var(--mr-text-muted)' }}>
              {intro}
            </div>
          </div>
        </section>

        <div className="border-t border-hairline px-6 py-12">
          <div className="mx-auto max-w-3xl space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="mb-2 font-display text-base font-semibold text-parchment">{section.title}</h2>
                <div className="text-sm leading-relaxed text-steel">{section.body}</div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <PublicFooter onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
    </div>
  );
}

/** A link inside a legal document — one treatment, so the two documents match. */
export function LegalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="text-brass underline underline-offset-2 transition-colors hover:text-brass-400">
      {children}
    </a>
  );
}
