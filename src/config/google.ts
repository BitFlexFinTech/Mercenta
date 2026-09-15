/**
 * §21 (M13 Phase 8) — GOOGLE integration: single source of truth.
 *
 * The founder's Google account is a PERSONAL account, not a paid Google Workspace
 * tenant, so everything here targets normal My Drive. No Shared Drives, no
 * Workspace-only features, no admin APIs.
 *
 * SECURITY POLICY (enforced by the wizard, the client and the validator):
 *  - Mercenta NEVER asks for, receives or stores the Google password.
 *  - OAuth client credentials are entered by the founder; the REFRESH TOKEN is
 *    never held in the browser, source, Git, reports, Sheets or the review ZIP —
 *    it belongs to the server-side exchange (Supabase Edge Function + Vault).
 *  - Nothing here creates a Google account.
 */

export const GOOGLE_ACCOUNT = {
  email: 'mercentapartners@gmail.com',
  kind: 'personal_google_account',
  /** Drives available to a personal account in this integration. */
  drives: ['My Drive'],
  sharedDrives: false,
  workspaceTenant: false,
  note:
    'Personal Google account — normal My Drive only. Shared Drives and Workspace admin features are not available and are not used.',
} as const;

/** Read/write scopes scoped to files Mercenta itself creates (least privilege). */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/presentations',
  'https://www.googleapis.com/auth/calendar.events',
] as const;

/** The authorization endpoint the wizard opens (full params added at runtime). */
export const GOOGLE_OAUTH = {
  authorizeUrlBase: 'https://accounts.google.com/o/oauth2/v2/auth',
  clientIdParam: 'client_id',
  clientIdLabel: 'Google OAuth Client ID (from Google Cloud Console)',
  redirectPath: '/oauth/callback.html',
  /** Google requires these for an offline refresh token. */
  extraParams: {
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  },
  consoleUrl: 'https://console.cloud.google.com/apis/credentials',
} as const;

export const GOOGLE_SETUP_DISCLAIMER =
  'Mercenta never asks for your Google password and never stores OAuth refresh tokens in the browser, source, reports or this ZIP — the token exchange belongs to the server-side secret store. Nothing here creates a Google account.';


/**
 * §21 — the Drive structure the setup wizard creates, mirroring the Mercenta
 * filesystem's owner folders. `kind` decides which API call creates it.
 */
export type GoogleWorkspaceItemKind = 'folder' | 'sheet' | 'doc' | 'slides' | 'calendar_event';

export interface GoogleWorkspacePlanItem {
  id: string;
  kind: GoogleWorkspaceItemKind;
  name: string;
  parent: string | null;
  /** Master sheets get their tabs created up-front. */
  tabs?: string[];
  purpose: string;
  /** Proves the corresponding API capability actually works. */
  capabilityTest?: boolean;
}

export const GOOGLE_ROOT_FOLDER = 'Mercenta';

export const GOOGLE_WORKSPACE_PLAN: GoogleWorkspacePlanItem[] = [
  { id: 'root', kind: 'folder', name: GOOGLE_ROOT_FOLDER, parent: null, purpose: 'Root Mercenta folder in My Drive.' },
  { id: 'company-documents', kind: 'folder', name: 'Company Documents', parent: 'root', purpose: 'Statutory and company documents.' },
  { id: 'partnerships', kind: 'folder', name: 'Partnerships', parent: 'root', purpose: 'Partner and relationship documents.' },
  { id: 'accounting', kind: 'folder', name: 'Accounting', parent: 'root', purpose: 'Accounting records and ledgers.' },
  { id: 'legal-compliance', kind: 'folder', name: 'Legal & Compliance', parent: 'root', purpose: 'Contracts, policies and compliance evidence.' },
  { id: 'integrations', kind: 'folder', name: 'Integrations', parent: 'root', purpose: 'Integration setup notes and evidence.' },
  { id: 'google', kind: 'folder', name: 'Google', parent: 'root', purpose: 'Google workspace artefacts created by Mercenta.' },
  { id: 'investors', kind: 'folder', name: 'Investors', parent: 'root', purpose: 'Investor materials and applications.' },
  { id: 'research', kind: 'folder', name: 'Research', parent: 'root', purpose: 'Market and opportunity research.' },
  { id: 'product-platform', kind: 'folder', name: 'Product & Platform', parent: 'root', purpose: 'Product and platform documentation.' },
  { id: 'marketing', kind: 'folder', name: 'Marketing', parent: 'root', purpose: 'Marketing assets and launch copy.' },
  { id: 'launch', kind: 'folder', name: 'Launch', parent: 'root', purpose: 'Launch Centre packages.' },
  { id: 'reports', kind: 'folder', name: 'Reports', parent: 'root', purpose: 'Generated reports.' },
  { id: 'templates', kind: 'folder', name: 'Templates', parent: 'root', purpose: 'Document, sheet and deck templates.' },
  {
    id: 'master-brand-pipeline',
    kind: 'sheet',
    name: 'Mercenta — Brand Pipeline (master)',
    parent: 'root',
    tabs: ['Brands', 'Contacts', 'Outreach', 'Status'],
    purpose: 'Master brand pipeline sheet created through the Sheets API.',
  },
  {
    id: 'master-costs',
    kind: 'sheet',
    name: 'Mercenta — Platform Costs (master)',
    parent: 'root',
    tabs: ['Providers', 'Monthly', 'AI usage'],
    purpose: 'Master platform-cost sheet created through the Sheets API.',
  },
  {
    id: 'template-proposal',
    kind: 'doc',
    name: 'Mercenta — Brand Partnership Proposal (template)',
    parent: 'templates',
    purpose: 'Proposal template created through the Docs API.',
  },
  {
    id: 'template-deck',
    kind: 'slides',
    name: 'Mercenta — Investor Brief (template)',
    parent: 'templates',
    purpose: 'Presentation template created through the Slides API.',
  },
  {
    id: 'test-sheet',
    kind: 'sheet',
    name: 'Mercenta — capability test (sheet)',
    parent: 'google',
    tabs: ['Test'],
    purpose: 'Capability test: proves Sheets creation works.',
    capabilityTest: true,
  },
  {
    id: 'test-doc',
    kind: 'doc',
    name: 'Mercenta — capability test (document)',
    parent: 'google',
    purpose: 'Capability test: proves Docs creation works.',
    capabilityTest: true,
  },
  {
    id: 'test-slides',
    kind: 'slides',
    name: 'Mercenta — capability test (presentation)',
    parent: 'google',
    purpose: 'Capability test: proves Slides creation works.',
    capabilityTest: true,
  },
  {
    id: 'test-calendar',
    kind: 'calendar_event',
    name: 'Mercenta — capability test (calendar event)',
    parent: null,
    purpose: 'Capability test: proves Calendar event creation works.',
    capabilityTest: true,
  },
];
