/**
 * §31 — MERCENTA LAUNCH CENTRE: the submission package generator.
 *
 * Where a platform exposes no authorised API (all 14 today), the product's job is
 * to produce the COMPLETE package the founder pastes into that platform's form —
 * name, tagline, descriptions, categories, links — plus an explicit checklist of
 * what still has to be verified against the platform's own published requirements.
 *
 * Pure: no network, no model call, no credential access.
 */
import {
  LAUNCH_PLATFORMS,
  type LaunchPlatform,
  type LaunchProfile,
} from '@/config/launchPlatforms';
import type { LaunchRecord } from '@/data/launchStore';

export interface SubmissionChecklistItem {
  label: string;
  /** TRUE when the platform's own page must be re-read before submitting. */
  verifyOnPlatform: boolean;
  done: boolean;
}

/**
 * The submission package as copyable plain text. Deliberately free of marketing
 * claims: it describes what Mercenta does, and nothing Mercenta is not.
 */
export function buildSubmissionPackage(platform: LaunchPlatform, profile: LaunchProfile): string {
  return [
    `PLATFORM: ${platform.name}`,
    `SITE: ${platform.siteUrl}`,
    `SUBMIT VIA: ${platform.submissionChannel}`,
    `REQUIREMENTS: ${platform.requirementsUrl}${platform.requirementsVerified ? '' : '  (NOT YET VERIFIED — read this page before submitting)'}`,
    '',
    `NAME: ${'Mercenta Partners'}`,
    `TAGLINE: ${profile.tagline}`,
    '',
    'SHORT DESCRIPTION:',
    profile.shortDescription,
    '',
    'LONG DESCRIPTION:',
    profile.longDescription,
    '',
    `CATEGORIES: ${profile.categories.join(', ')}`,
    `WEBSITE: ${profile.website}`,
    '',
    'FOUNDER:',
    profile.founderProfile,
    '',
    'AUDIENCE ON THIS PLATFORM:',
    platform.audience,
    '',
    'WHAT THIS PLATFORM EXPECTS:',
    ...platform.knownRequirements.map((r) => `- ${r}`),
    '',
    'NOTE: Mercenta provides no automated submission and claims no integration with this platform.',
  ].join('\n');
}

/** §31 — the guided checklist, per platform, driven by the stored state. */
export function buildSubmissionChecklist(
  platform: LaunchPlatform,
  record: LaunchRecord
): SubmissionChecklistItem[] {
  return [
    {
      label: `Verify the current requirements at ${platform.requirementsUrl}`,
      verifyOnPlatform: true,
      done: platform.requirementsVerified,
    },
    {
      label: 'Create / confirm the account',
      verifyOnPlatform: false,
      done: record.accountStatus !== 'not_started',
    },
    {
      label: 'Paste the prepared profile copy',
      verifyOnPlatform: false,
      done: record.profileStatus !== 'not_prepared',
    },
    {
      label: 'Add logo, screenshots and links',
      verifyOnPlatform: true,
      done: record.profileStatus === 'submitted',
    },
    {
      label: `Submit through the platform's ${platform.submissionChannel} channel`,
      verifyOnPlatform: false,
      done: record.profileStatus === 'submitted',
    },
  ];
}

/** Can the founder claim this platform is done? Only when it really is. */
export function launchPlatformIsComplete(record: LaunchRecord): boolean {
  return record.profileStatus === 'submitted' && record.submittedAt !== null;
}

/** Platforms still needing the founder's attention, in declared order. */
export function outstandingPlatforms(
  records: readonly LaunchRecord[]
): { platform: LaunchPlatform; record: LaunchRecord }[] {
  return LAUNCH_PLATFORMS.map((platform) => ({
    platform,
    record: records.find((r) => r.platformId === platform.id) ?? {
      platformId: platform.id,
      accountStatus: 'not_started' as const,
      profileStatus: 'not_prepared' as const,
      profileUrl: '',
      launchDate: null,
      submittedAt: null,
      notes: '',
    },
  })).filter(({ record }) => !launchPlatformIsComplete(record));
}