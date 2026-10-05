/**
 * §PHASE 15 — THE ONE OWNER OF TRANSACTIONAL EMAIL TEMPLATES (2026-10-05).
 *
 * TWO problems this owner fixes at source:
 *
 *   1. NO SINGLE OWNER. The applicant-facing email copy lived INLINE at its call
 *      sites, so the wording could drift. This is now the ONE owner.
 *   2. A LINE-BREAK BUG. Every body used `\\n` inside a template literal — which
 *      renders a LITERAL backslash-n, NOT a line break — so the emails shipped a
 *      visible "\n" instead of newlines. The break is fixed here, once.
 *
 * This owner holds COPY only. The transport is `mail.ts` (mock-first): nothing
 * here sends anything. Guarded by `scripts/validate-email-templates.mjs`.
 */
export interface EmailTemplate {
  subject: string;
  text: string;
}

/** The brand's account is ready (manual / approved onboarding). */
export function welcomeEmailTemplate(contactName: string): EmailTemplate {
  return {
    subject: 'Welcome to Mercenta Partners',
    text: `Hi ${contactName},\n\nYour brand account is ready. Log in at: https://mercenta.co.uk`,
  };
}

/** The applicant's brand has been approved. */
export function applicationApprovedTemplate(companyName: string): EmailTemplate {
  return {
    subject: 'Your Mercenta Partners application has been approved',
    text: `Dear ${companyName},\n\nYour application has been approved! Log in at: https://mercenta.co.uk`,
  };
}

/** The applicant's brand has been declined. */
export function applicationRejectedTemplate(companyName: string): EmailTemplate {
  return {
    subject: 'Update on your Mercenta Partners application',
    text: `Dear ${companyName},\n\nThank you for your interest. We're not able to onboard your brand at this time.`,
  };
}

/** More information is needed from the applicant. */
export function applicationInfoRequestedTemplate(companyName: string, notes: string): EmailTemplate {
  return {
    subject: 'Additional information required',
    text: `Dear ${companyName},\n\nWe need: ${notes}`,
  };
}
