import { PublicLegalDocument, LegalLink, type PublicLegalSection } from './PublicLegalDocument';
import type { PublicPage } from './PublicNav';
import { PUBLIC_COMPANY_NAME, PUBLIC_LEGAL_EMAIL, PUBLIC_LINK } from '@/config/positioning';

/**
 * §PUBLIC MESSAGING B5 (2026-09-29) — REWRITTEN ON THE OWNER'S OWN FACTS.
 *
 * WHAT WAS WRONG. Like the privacy policy, this page published the operating
 * model, carried a second copy of the company's identity and address, ignored the
 * shell theme, and had no navigation or footer. Its two red-line hits:
 *
 *  1. "Acknowledge POs within 24 hours per retail network requirements" — written
 *     as another company's operating rule, it says Mercenta answers to that
 *     company's timetable and counts as family 6 (`\backnowledg`, `24-hour`).
 *     A brand is told the thing that actually matters to them instead: there is a
 *     short window for a reply, and an order can be lost when it closes.
 *  2. "Mercenta charges commission on each PO" — family 4, the commercial model
 *     and its arithmetic, which is agreed privately and is never published. It
 *     now says the same thing the FAQ already says: what you pay is agreed
 *     privately before anything starts.
 *
 * "Retail Network: the UK fulfilment partners we distribute to" is gone with it —
 * it described the channel's structure rather than the service. The parties are
 * now defined in the words the rest of the public surface uses.
 */
export function TermsOfService({ onNavigate, onOpenPortal }: { onNavigate: (p: PublicPage) => void; onOpenPortal: () => void }) {
  const sections: readonly PublicLegalSection[] = [
    {
      title: '1. Acceptance',
      body: (
        <p>
          By using the {PUBLIC_COMPANY_NAME} platform you agree to these terms. If you do not agree with them,
          please do not use the platform.
        </p>
      ),
    },
    {
      title: '2. Definitions',
      body: (
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Platform:</strong> the {PUBLIC_COMPANY_NAME} service described on this website
          </li>
          <li>
            <strong>Brand:</strong> a supplier whose products are sold through the platform
          </li>
          <li>
            <strong>Order:</strong> a purchase order for a brand’s products raised by the retail channel
          </li>
          <li>
            <strong>We and us:</strong> {PUBLIC_COMPANY_NAME}
          </li>
        </ul>
      ),
    },
    {
      title: '3. What a brand is responsible for',
      body: (
        <ul className="list-disc pl-5 space-y-1">
          <li>Accurate product information, pricing and supporting documentation</li>
          <li>
            A prompt reply to every order — the retail channel allows a short window for that reply, and an order
            can be lost when the window closes
          </li>
          <li>Fulfilling accepted orders to the agreed quantities and delivery windows</li>
          <li>Keeping each product’s compliance documentation valid for as long as it is listed</li>
          <li>Telling us promptly when your business or banking details change</li>
        </ul>
      ),
    },
    {
      title: '4. What you pay',
      body: (
        <p>
          What you pay is agreed privately with you before anything starts, and it is never published here. Any fees
          that apply are set out in your agreement and are deducted from the payments we remit to you.
        </p>
      ),
    },
    {
      title: '5. Payment terms',
      body: (
        <p>
          Payments are remitted to brands on the schedule set out in your agreement, once the order has been
          delivered and any deduction raised against it has been resolved.
        </p>
      ),
    },
    {
      title: '6. Compliance',
      body: (
        <p>
          Brands are responsible for making sure their products meet UK regulations — including UKCA or CE marking,
          REACH and GPSR — together with any requirements specific to their sector. We may suspend a listing while a
          product’s compliance is in question.
        </p>
      ),
    },
    {
      title: '7. Limitation of liability',
      body: (
        <p>
          Our total liability for any claim arising from use of the platform is limited to the fees paid by the brand
          in the twelve months before the claim. We are not liable for indirect or consequential losses.
        </p>
      ),
    },
    {
      title: '8. Termination',
      body: (
        <p>
          Either party may end the agreement with 30 days’ written notice. We may suspend access for a material
          breach, for non-compliance, or for activity that puts the retail relationship at risk.
        </p>
      ),
    },
    {
      title: '9. Governing law',
      body: (
        <p>
          These terms are governed by the laws of England and Wales, and disputes are subject to the exclusive
          jurisdiction of the English courts.
        </p>
      ),
    },
    {
      title: '10. Contact',
      body: (
        <>
          <p>
            Questions about these terms:{' '}
            <LegalLink href={`mailto:${PUBLIC_LEGAL_EMAIL}`}>{PUBLIC_LEGAL_EMAIL}</LegalLink>
          </p>
          <p className="mt-1">
            How we handle personal data is set out in our{' '}
            {/*
              The label is READ from the navigation owner, so the two legal
              documents cannot name the same destination two different ways.
            */}
            <button
              type="button"
              onClick={() => onNavigate('privacy')}
              className="text-accent underline underline-offset-2 transition-colors hover:text-accent-400"
            >
              {PUBLIC_LINK.privacy.label}
            </button>
            .
          </p>
        </>
      ),
    },
  ];

  return (
    <PublicLegalDocument
      page="terms"
      heading="Terms of Service"
      onNavigate={onNavigate}
      onOpenPortal={onOpenPortal}
      intro={
        <>
          These terms set out how the {PUBLIC_COMPANY_NAME} platform may be used and what each side is responsible
          for. If anything here is unclear, ask us before you agree to it.
        </>
      }
      sections={sections}
    />
  );
}
