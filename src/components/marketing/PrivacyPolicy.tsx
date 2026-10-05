import { PublicLegalDocument, LegalLink, type PublicLegalSection } from './PublicLegalDocument';
import type { PublicPage } from './PublicNav';
import {
  PUBLIC_COMPANY_NAME,
  PUBLIC_COOKIE_NOTICE,
  PUBLIC_COOKIE_SETTINGS_LABEL,
  PUBLIC_PRIVACY_EMAIL,
  publicCompanyLine,
} from '@/config/positioning';
/**
 * §PHASE 15 (2026-10-05) — the "who we share it with" section now READS the
 * third-party data inventory (`src/config/dataProcessing.ts`) instead of holding
 * its own prose. The policy can therefore no longer silently fall behind the
 * platform when a new processor is engaged — the one list is the inventory, and
 * `scripts/validate-data-inventory.mjs` fails if a registered processor has no
 * public-safe row here. Supplier NAMES never appear: only the public-safe kind.
 */
import { publicProcessorCategories } from '@/config/dataProcessing';

/**
 * §PUBLIC MESSAGING B5 (2026-09-29) — REWRITTEN ON THE OWNER'S OWN FACTS.
 *
 * WHAT WAS WRONG. Four classes of defect, none of which a typecheck or a build
 * can see:
 *
 *  1. IT PUBLISHED THE REGULATED POSITION. "VAT and EORI numbers" in §2 and the
 *     "HMRC requirement" in §5 are two of the red-line claims
 *     `src/config/positioning.ts` §11 exists to stop — they say which positions
 *     Mercenta holds, and that position is the barrier the business exists to
 *     remove for a brand. Both statements are gone; every data category a policy
 *     has to list is still listed.
 *  2. IT CARRIED ITS OWN COPY OF THE COMPANY'S IDENTITY AND CONTACT ADDRESS,
 *     `mercenta.co.uk` included — facts that have owners (`src/config/brand.ts`,
 *     `src/config/company.ts`), derived through §7 of the positioning owner. Both
 *     are now READ: `publicCompanyLine()` and `PUBLIC_PRIVACY_EMAIL`.
 *  3. IT DID NOT TAKE THE SHELL THEME (`bg-black text-white`), so the light shell
 *     was ignored entirely — the defect B3 fixed on the four inner pages and B4
 *     on the footer, left standing on the documents a brand reads before signing.
 *  4. IT SAID NOTHING ABOUT WHAT IS STORED ON A VISITOR'S DEVICE, while
 *     `positioning.ts` §13 describes this page as "the place for the full
 *     picture". §6 now carries that picture, and READS the notice's own copy from
 *     its owner, so the notice and the policy cannot describe the same behaviour
 *     differently.
 *
 * The chrome (nav, footer, eyebrow, revision date, shell theme) comes from
 * `PublicLegalDocument`, shared with the terms, so the two documents cannot
 * drift apart.
 */
export function PrivacyPolicy({ onNavigate, onOpenPortal }: { onNavigate: (p: PublicPage) => void; onOpenPortal: () => void }) {
  const sections: readonly PublicLegalSection[] = [
    {
      title: '1. Who we are',
      body: (
        <>
          <p>{publicCompanyLine()}</p>
          <p className="mt-2">
            This policy covers this website, the platform it describes, and any contact you have with us about
            either.
          </p>
        </>
      ),
    },
    {
      title: '2. What we collect',
      body: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Identity: your name, job title, company name and signatory authority</li>
          <li>Contact: business email address, telephone number and business address</li>
          <li>
            Financial: bank account details and the business tax identifiers we need in order to pay you and to
            account for tax
          </li>
          <li>Transaction: order history, shipments, the documents that support them and catalogue content</li>
          <li>Communications: platform messages, support tickets and call notes</li>
          <li>Technical: IP address, browser type and login timestamps</li>
        </ul>
      ),
    },
    {
      title: '3. Why we are allowed to hold it',
      body: (
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Contract performance:</strong> running your orders, shipments and payments
          </li>
          <li>
            <strong>Legitimate interests:</strong> fraud prevention, platform security and improving the service
          </li>
          <li>
            <strong>Legal obligation:</strong> tax reporting and record-keeping
          </li>
          <li>
            <strong>Consent:</strong> marketing, and only where you have opted in
          </li>
        </ul>
      ),
    },
    {
      title: '4. Who we share it with',
      body: (
        <>
          <p>
            We share personal data only with the providers that deliver the service to you — the kinds listed
            below — together with regulators or public authorities where the law requires it. We never sell
            personal data, and we never share it for advertising.
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            {publicProcessorCategories().map((c) => (
              <li key={c.category}>
                <strong>{c.label}:</strong> {c.purpose}
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      title: '5. How long we keep it',
      body: (
        <p>
          Personal data is kept for the business relationship plus six years, the period UK tax law requires, and is
          then securely deleted or anonymised.
        </p>
      ),
    },
    {
      /**
       * §B5 — THE SECTION THAT MAKES `positioning.ts` §13 TRUE. The owner states
       * that the privacy policy is "the place for the full picture" of what is
       * stored on a visitor's device, and the policy said nothing about it. The
       * notice's copy is READ from its owner rather than rewritten here, so the
       * notice and the policy cannot describe the same behaviour differently —
       * and the re-open control's label is read for the same reason.
       */
      title: '6. What is stored on your device',
      body: (
        <>
          <p>{PUBLIC_COOKIE_NOTICE.body}</p>
          <p className="mt-2">
            That notice can be read again at any time from the “{PUBLIC_COOKIE_SETTINGS_LABEL}” control in the
            footer of every page on this site.
          </p>
        </>
      ),
    },
    {
      title: '7. Your rights',
      body: (
        <p>
          Access, rectification, erasure, restriction, portability, objection and the right to withdraw consent at
          any time — write to{' '}
          <LegalLink href={`mailto:${PUBLIC_PRIVACY_EMAIL}`}>{PUBLIC_PRIVACY_EMAIL}</LegalLink>.
        </p>
      ),
    },
    {
      title: '8. Security',
      body: <p>Encryption in transit, access controls, hosting in the UK and regular review.</p>,
    },
    {
      title: '9. Contact',
      body: (
        <>
          <p>
            Privacy questions: <LegalLink href={`mailto:${PUBLIC_PRIVACY_EMAIL}`}>{PUBLIC_PRIVACY_EMAIL}</LegalLink>
          </p>
          <p className="mt-1">
            The UK regulator for data protection is the Information Commissioner’s Office, Wycliffe House, Water
            Lane, Wilmslow SK9 5AF — <LegalLink href="https://ico.org.uk">ico.org.uk</LegalLink>
          </p>
        </>
      ),
    },
  ];

  return (
    <PublicLegalDocument
      page="privacy"
      heading="Privacy Policy"
      onNavigate={onNavigate}
      onOpenPortal={onOpenPortal}
      intro={
        <>
          This policy explains how {PUBLIC_COMPANY_NAME} collects, uses and protects personal data, in line with the
          UK GDPR and the Data Protection Act 2018. Write to us at{' '}
          <LegalLink href={`mailto:${PUBLIC_PRIVACY_EMAIL}`}>{PUBLIC_PRIVACY_EMAIL}</LegalLink>.
        </>
      }
      sections={sections}
    />
  );
}
