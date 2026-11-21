import {
  PUBLIC_COOKIE_SETTINGS_LABEL,
  PUBLIC_PROMISE,
  PUBLIC_NAV,
  PUBLIC_FOOTER_COLUMNS,
  PUBLIC_COMPANY_NUMBER,
  PUBLIC_REGISTERED_OFFICE,
  PUBLIC_JURISDICTION_LINE,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_LINK,
  publicCompanyLine,
  type PublicLinkPage,
} from '@/config/positioning';
import { COMPANY_TAX_REGISTRATION } from '@/config/company';
import { COOKIE_SETTINGS_EVENT } from '@/components/marketing/CookieNotice';
import { BrandLockup } from '@/components/shared/BrandLockup';
import { APPROVED_CATEGORIES } from '@/types';

/**
 * §BRAND REDESIGN (2026-11-19) — THE FOOTER, REBUILT TO THE APPROVED SPEC.
 *
 * THREE DEFECTS THIS CLOSES:
 *  1. THE LOGO DID NOT SWITCH — it rendered the WHITE wordmark on every
 *     background, so it was invisible on the light appearance. `BrandLockup` now
 *     picks the approved master for the actual background.
 *  2. THE COMPANY DISCLOSURE WAS INCOMPLETE — the legal name, jurisdiction and
 *     registered office were published, but NOT the company number, the VAT
 *     number or a contact address. All three already existed in the config; they
 *     are now published from their owners.
 *  3. THERE WAS NO TRUST ROW — six positions plus a reserved seventh now exist.
 *
 * §EORI IS DELIBERATELY ABSENT. `COMPANY_TAX_REGISTRATION.eoriNumber` is marked
 * `eoriPublicationAllowed: false` and is NOT referenced in this file at all, so
 * it cannot leak by accident. Explicit owner instruction.
 *
 * §NOTHING IS INVENTED. Every fact is read from its owner.
 */

interface TrustPosition {
  id: string;
  label: string;
  detail?: string;
  reserved?: boolean;
}

/**
 * The six trust positions plus the seventh reserved for a future AWRS
 * registration. Positions 1–3 carry the three APPROVED memberships; their
 * official artwork is installed separately, and until it is present the position
 * states the membership in WORDS rather than showing a fabricated badge — a
 * made-up logo would be worse than no logo.
 */
/* §LINT FIX (2026-11-19) — NOT EXPORTED. This list is used only by the footer
   below. Exporting a constant from a module that also exports a component trips
   `react-refresh/only-export-components`, because Fast Refresh cannot tell
   whether an edit changed the component or the constant. Keeping it module-local
   is the honest fix: nothing else imports it. */
const TRUST_POSITIONS: readonly TrustPosition[] = [
  { id: 'enterprise-nation', label: 'Enterprise Nation', detail: 'Member' },
  { id: 'btn-community', label: 'Beverage Trade Network (BTN)', detail: 'Member' },
  { id: 'sme-climate-hub', label: 'SME Climate Hub', detail: 'UN Race to Zero' },
  { id: 'companies-house', label: 'Companies House', detail: `Reg. No. ${PUBLIC_COMPANY_NUMBER}` },
  {
    id: 'uk-vat',
    label: 'UK VAT',
    detail: COMPANY_TAX_REGISTRATION.vatRegistered ? COMPANY_TAX_REGISTRATION.vatNumber : '',
  },
  { id: 'england-wales', label: 'Registered in', detail: 'England & Wales' },
  /* §RESERVED — HMRC AWRS is NOT held. The position keeps the row's shape and
     makes no claim. */
  { id: 'awrs', label: 'AWRS', detail: 'Reserved', reserved: true },
] as const;

interface PublicFooterProps {
  onNavigate: (page: PublicLinkPage) => void;
  onOpenPortal: () => void;
}

export function PublicFooter({ onNavigate, onOpenPortal }: PublicFooterProps) {
  const linkClass =
    'text-ds-label text-[var(--mr-text-muted)] hover:text-[var(--mr-accent)] transition-colors cursor-pointer block py-0.5 text-left';

  /**
   * §BATCH 2 GATE DEFECT FIXED AT SOURCE (2026-11-21) — EACH DESTINATION IS
   * PUBLISHED ONCE.
   *
   * MEASURED DEFECT: `PUBLIC_NAV` legitimately offers "Category Specialization"
   * in TWO groups (Solutions and Categories), so the footer — which renders every
   * group's children — printed the same link twice. The browser spec
   * `e2e/public-chrome.spec.ts` caught it as a strict-mode violation; the static
   * validator could not, because it collects the referenced ids into a Set and a
   * Set collapses duplicates. A sitemap that lists one destination twice is a real
   * defect (duplicate content, two tab stops for one page), so the footer now
   * records what it has already published and skips a repeat.
   *
   * The HEADER is deliberately unchanged: a menu may offer the same destination in
   * two places without being wrong. Only the footer, whose job is an exhaustive
   * and unambiguous sitemap, is de-duplicated.
   */
  const renderedPages = new Set<string>();

  return (
    <footer className="border-t border-hairline bg-[var(--mr-surface)]">
      <div className="mx-auto max-w-7xl px-6 py-14">
        {/* ── Brand column + the navigation groups ─────────────────────────── */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,320px)_1fr]">
          <div>
            <BrandLockup className="h-14 w-auto" variant="dark" />
            <p className="mt-5 text-ds-label leading-relaxed text-[var(--mr-text-muted)]">
              {PUBLIC_PROMISE}
            </p>
            <button
              onClick={onOpenPortal}
              className="mt-5 bg-[var(--mr-accent)] px-5 py-2.5 text-ds-label font-semibold text-[var(--mr-on-accent)] transition-opacity hover:opacity-90"
            >
              Request Partner Access
            </button>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 md:grid-cols-3 xl:grid-cols-4">
            {PUBLIC_FOOTER_COLUMNS.map((column) => {
              if (column.kind === 'categories') {
                return (
                  <div key={column.heading}>
                    <h4 className="mb-3 font-mono text-ds-label uppercase tracking-[0.16em] text-[var(--mr-text-strong)]">
                      {column.heading}
                    </h4>
                    <div>
                      {APPROVED_CATEGORIES.map((cat) => (
                        <span
                          key={cat}
                          className="block py-0.5 text-ds-label text-[var(--mr-text-muted)]"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              }
              const legalPages = new Set<string>([PUBLIC_LINK.privacy.page, PUBLIC_LINK.terms.page]);
              const children = column.links.filter((child) => {
                if (legalPages.has(child.page)) return false;
                /* §EACH DESTINATION ONCE — see the note on `renderedPages`. */
                if (renderedPages.has(child.page)) return false;
                renderedPages.add(child.page);
                return true;
              });
              if (children.length === 0) return null;
              return (
                <div key={column.heading}>
                  <h4 className="mb-3 font-mono text-ds-label uppercase tracking-[0.16em] text-[var(--mr-text-strong)]">
                    {column.heading}
                  </h4>
                  <div>
                    {children.map((child) => (
                      <button
                        key={child.page}
                        onClick={() => onNavigate(child.page)}
                        className={linkClass}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* §BATCH 2 GATE DEFECT FIXED AT SOURCE (2026-11-21) — the hardcoded
                "Product Categories" block that used to sit here is DELETED. The
                column model already declares a `kind: 'categories'` column, which
                renders the same ten APPROVED_CATEGORIES. Two owners meant the
                footer printed the heading and the full list TWICE, and the
                approved categories were being retyped in a second place — the
                exact single-source-of-truth violation the model exists to
                prevent. The model's column is now the only one. */}
            <div>
              <h4 className="mb-3 font-mono text-ds-label uppercase tracking-[0.16em] text-[var(--mr-text-strong)]">
                Legal
              </h4>
              <div>
                {[PUBLIC_LINK.privacy, PUBLIC_LINK.terms].map((link) => (
                  <button key={link.page} onClick={() => onNavigate(link.page)} className={linkClass}>
                    {link.label}
                  </button>
                ))}
                <button
                  onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}
                  className={linkClass}
                >
                  {PUBLIC_COOKIE_SETTINGS_LABEL}
                </button>
              </div>
            </div>
          </nav>
        </div>

        {/* ── Trust and membership positions (6 + 1 reserved for AWRS) ─────── */}
        <div
          className="mt-14 grid grid-cols-2 gap-px border border-hairline bg-[var(--mr-hairline)] sm:grid-cols-3 lg:grid-cols-7"
          data-testid="footer-trust-row"
        >
          {TRUST_POSITIONS.map((pos) => (
            <div
              key={pos.id}
              data-testid={`footer-trust-${pos.id}`}
              className={
                pos.reserved
                  ? 'bg-[var(--mr-surface)] px-4 py-5 opacity-60'
                  : 'bg-[var(--mr-surface)] px-4 py-5'
              }
            >
              <p className="font-mono text-ds-micro uppercase tracking-[0.14em] text-[var(--mr-text-muted)]">
                {pos.label}
              </p>
              {pos.detail && (
                <p className="mt-1.5 text-ds-label font-semibold leading-snug text-[var(--mr-text-strong)]">
                  {pos.detail}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* ── Company disclosure ───────────────────────────────────────────── */}
        <div className="mt-10 border-t border-hairline pt-8">
          <p className="font-mono text-ds-label uppercase tracking-[0.16em] text-[var(--mr-text-strong)]">
            {publicCompanyLine()}
          </p>
          <div className="mt-3 flex flex-col gap-1.5 text-ds-label text-[var(--mr-text-muted)]">
            <span>
              {PUBLIC_JURISDICTION_LINE} · Company number {PUBLIC_COMPANY_NUMBER}
            </span>
            <span>Registered office: {PUBLIC_REGISTERED_OFFICE}</span>
            {COMPANY_TAX_REGISTRATION.vatRegistered && (
              <span>VAT registration number: {COMPANY_TAX_REGISTRATION.vatNumber}</span>
            )}
            <span>
              Contact:{' '}
              <a
                href={`mailto:${PUBLIC_CONTACT_EMAIL}`}
                className="text-[var(--mr-accent)] hover:underline"
              >
                {PUBLIC_CONTACT_EMAIL}
              </a>
            </span>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-2 border-t border-hairline pt-6 text-center">
          <p className="font-mono text-ds-micro uppercase tracking-[0.14em] text-[var(--mr-text-muted)]">
            Global Brands. UK Distribution. Smarter Growth.
          </p>
          <p className="font-mono text-ds-micro text-[var(--mr-text-muted)]">
            &copy; {new Date().getFullYear()} Mercenta Partners Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
