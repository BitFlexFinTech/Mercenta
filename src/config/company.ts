/**
 * §14/§22–§25 (M13 Phase 9) — MERCENTA'S OWN COMPANY + GOVERNMENT COMPLIANCE:
 * single source of truth.
 *
 * Only founder-supplied facts live here. Anything that must come from the
 * registrar (incorporation date, registered office, SIC codes, confirmation
 * statement date, accounts due date) is explicitly `null` and marked
 * `awaiting_registrar_read` instead of being invented — the Company Control
 * Centre fills those fields from the connected Companies House client and
 * records which source produced each value.
 *
 * SECRETS ARE NEVER STORED IN THIS FILE. The Companies House authentication
 * code and the GOV.UK One Login personal code are entered by the founder in
 * Super Admin and held as a masked/secret reference only (see
 * `src/data/companyStore.ts`). No credential belongs in source, Git, docs,
 * prompts, Sheets or the review ZIP.
 */
import { BRAND_LEGAL_NAME } from './brand';

/** Provenance labels — the same claim discipline the opportunity engine uses. */
export type ComplianceValueSource =
  | 'founder_supplied'
  | 'registrar_read'
  | 'simulated_registrar'
  | 'not_read_yet';

export interface CompanyRegistration {
  legalName: string;
  companyNumber: string;
  jurisdiction: string;
  incorporated: boolean;
  /** Where the identity facts came from. Never used to claim a filing. */
  source: ComplianceValueSource;
  /** Filled ONLY from a registrar read. `null` = not yet retrieved. */
  registrar: {
    status: string | null;
    incorporationDate: string | null;
    registeredOfficeAddress: string | null;
    sicCodes: string[] | null;
    nextConfirmationStatementDue: string | null;
    nextAccountsDue: string | null;
  };
  registrarStatusLabel: string;
}

export const COMPANY_REGISTRATION: CompanyRegistration = {
  legalName: BRAND_LEGAL_NAME,
  companyNumber: '17457777',
  jurisdiction: 'England & Wales',
  incorporated: true,
  /**
   * §BATCH — read from the public register (2026-09-28). The values below are the
   * register's own, recorded with the provenance the type requires. They are the
   * INTERNAL statutory record: the public pages publish only the legal name, the
   * company number, the registered office and a contact address — never the
   * incorporation date, the status or the SIC codes.
   */
  source: 'registrar_read',
  registrar: {
    status: 'Active',
    incorporationDate: '2026-09-14',
    registeredOfficeAddress: '128 City Road, London, United Kingdom, EC1V 2NX',
    sicCodes: ['45310', '46342', '46900', '47910'],
    nextConfirmationStatementDue: '2027-09-27',
    nextAccountsDue: '2028-06-14',
  },
  registrarStatusLabel: 'read_from_register',
};

/**
 * §22–§25 — the confirmation-statement workflow. Detect → Prepare → Notify →
 * Review → Approve → File → Verify. Every stage is a real state transition in
 * `companyStore`; the APPROVE gate is the founder's explicit approval and
 * nothing may pass it automatically.
 */
export const CONFIRMATION_STATEMENT_WORKFLOW = [
  { id: 'detect', label: 'Detect', detail: 'Read the register and detect the next confirmation statement date.' },
  { id: 'prepare', label: 'Prepare', detail: 'Assemble the confirmation statement data from the company record.' },
  { id: 'notify', label: 'Notify', detail: 'Raise the founder task with the due date and what is required.' },
  { id: 'review', label: 'Review', detail: 'Founder reviews the prepared statement before any submission.' },
  { id: 'approve', label: 'Approve', detail: 'Founder approval. Nothing is filed without it.' },
  { id: 'file', label: 'File', detail: 'Submission through an official channel Mercenta is authorised to use.' },
  { id: 'verify', label: 'Verify', detail: 'Re-read the register and confirm the filing landed.' },
  { id: 'verified', label: 'Verified', detail: 'The register itself confirms the filing.' },
] as const;

export type ConfirmationStatementStage = (typeof CONFIRMATION_STATEMENT_WORKFLOW)[number]['id'];

/** Reminder windows (days before the due date) the founder is warned at. */
export const COMPLIANCE_DEADLINE_THRESHOLDS = [90, 60, 30, 7, 0] as const;

/**
 * §22–§25 — Mercenta does NOT hold an official electronic-filing capability for
 * Companies House at this time. The public Companies House API Mercenta uses
 * for reads does not provide confirmation-statement filing, so the ONLY honest
 * filing path today is the founder completing it on the official Companies House
 * service and recording the reference here. Flip this to `true` ONLY when an
 * official, documented filing channel is actually connected and credentials are
 * active — the store and the panel both read this single flag.
 */
export const OFFICIAL_CONFIRMATION_STATEMENT_FILING_CONFIGURED = false;

export const COMPANIES_HOUSE_MANUAL_ACTIONS = {
  filing: 'https://find-and-update.company-information.service.gov.uk/',
  register: 'https://find-and-update.company-information.service.gov.uk/company/17457777',
  apiKey: 'https://developer.company-information.service.gov.uk/manage-account',
} as const;

export const GOV_UK_MANUAL_ACTIONS = {
  oneLogin: 'https://www.gov.uk/one-login',
  oneLoginManage: 'https://www.gov.uk/one-login/manage-account',
} as const;

/**
 * The two government secrets the founder holds personally. Described here for
 * the UI and the vault; the VALUES are never written into this file, the store's
 * records, the audit trail, reports or the review ZIP.
 */
export const GOVERNMENT_SECRET_KINDS = [
  {
    id: 'ch_authentication_code',
    label: 'Companies House authentication code',
    purpose:
      'The code Companies House posts to the registered office. Required to file with Companies House.',
    enterAt: 'Companies House — WebFiling / authentication code',
    manualActionUrl: COMPANIES_HOUSE_MANUAL_ACTIONS.filing,
    relatedProvider: 'companies_house',
  },
  {
    id: 'govuk_one_login_personal_code',
    label: 'GOV.UK One Login personal code',
    purpose:
      'The personal code from the GOV.UK One Login account. GOV.UK does not provide a supported API for the company actions Mercenta needs, so this is held only as a masked reference with a manual-action link.',
    enterAt: 'GOV.UK One Login — manage account',
    manualActionUrl: GOV_UK_MANUAL_ACTIONS.oneLoginManage,
    relatedProvider: 'govuk_one_login',
  },
] as const;

export type GovernmentSecretKind = (typeof GOVERNMENT_SECRET_KINDS)[number]['id'];

/**
 * §16 — HMRC is READY but NOT CONNECTED. It must never be presented as live.
 * This flag is the single source of truth the panel, the store and the command
 * centre all read.
 */
export const HMRC_READINESS = {
  state: 'ready_not_connected' as const,
  reason:
    'VAT registration and Making Tax Digital credentials are not yet in place for Mercenta Partners Ltd.',
  blocker: 'Company VAT/tax setup must complete before HMRC can be connected.',
  providerId: 'hmrc' as const,
};

export const COMPANY_CENTRE_DISCLAIMER =
  'Registrar data below is labelled by source. Simulated registrar values are clearly marked and never presented as the real register, and Mercenta never reports a filing it did not make.';