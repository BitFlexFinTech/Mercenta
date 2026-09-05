/**
 * §Access-gate — Link verification for brand applications.
 *
 * Runs on form submit to check whether provided URLs are valid and reachable.
 * Timeouts do NOT block submission — they result in "unverified_manual_check".
 */
import type { LinkVerificationStatus } from '@/types';

const TIMEOUT_MS = 10_000;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchWithTimeout(url: string, method: 'HEAD' | 'GET' = 'HEAD', signal: AbortSignal): Promise<Response> {
  return fetch(url, {
    method,
    signal,
    headers: {
      'User-Agent': USER_AGENT,
    },
    redirect: 'follow',
  });
}

async function checkWebsite(url: string): Promise<{ status: LinkVerificationStatus; title?: string }> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { status: 'unreachable' };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchWithTimeout(url, 'HEAD', controller.signal);
    clearTimeout(timeout);
    if (res.status === 200 || res.status === 301 || res.status === 302) {
      // Check for <title> tag with content
      try {
        const getRes = await fetchWithTimeout(url, 'GET', controller.signal);
        const html = await getRes.text();
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const titleContent = titleMatch?.[1]?.trim() ?? '';
        if (titleContent.length > 0) {
          return { status: 'verified', title: titleContent };
        }
        return { status: 'no_content' };
      } catch {
        // If GET fails after HEAD succeeded, consider it reachable but couldn't verify content
        return { status: 'verified' };
      }
    }
    return { status: 'unreachable' };
  } catch {
    clearTimeout(timeout);
    return { status: 'unverified_manual_check' };
  }
}

async function checkInstagram(url: string): Promise<LinkVerificationStatus> {
  const pattern = /^(https?:\/\/)?(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/;
  if (!pattern.test(url)) {
    return 'not_found';
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchWithTimeout(url, 'GET', controller.signal);
    clearTimeout(timeout);
    if (res.status === 200) return 'verified';
    if (res.status === 429 || res.status === 403) return 'unverified_manual_check';
    return 'not_found';
  } catch {
    clearTimeout(timeout);
    return 'unverified_manual_check';
  }
}

async function checkFacebook(url: string): Promise<LinkVerificationStatus> {
  const pattern = /^(https?:\/\/)?(www\.)?(facebook|fb)\.com\/[a-zA-Z0-9.]+\/?$/;
  if (!pattern.test(url)) {
    return 'not_found';
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetchWithTimeout(url, 'GET', controller.signal);
    clearTimeout(timeout);
    if (res.status === 200) return 'verified';
    if (res.status === 429 || res.status === 403) return 'unverified_manual_check';
    return 'not_found';
  } catch {
    clearTimeout(timeout);
    return 'unverified_manual_check';
  }
}

export interface LinkVerificationResult {
  websiteStatus: LinkVerificationStatus | null;
  instagramStatus: LinkVerificationStatus | null;
  facebookStatus: LinkVerificationStatus | null;
}

/**
 * Run link verification for all provided URLs.
 * Does NOT throw on timeout — marks as unverified_manual_check.
 */
export async function verifyLinks(inputs: {
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
}): Promise<LinkVerificationResult> {
  const result: LinkVerificationResult = {
    websiteStatus: null,
    instagramStatus: null,
    facebookStatus: null,
  };

  const checks: Promise<void>[] = [];

  if (inputs.websiteUrl?.trim()) {
    checks.push(
      checkWebsite(inputs.websiteUrl.trim()).then((r) => {
        result.websiteStatus = r.status;
      })
    );
  }

  if (inputs.instagramUrl?.trim()) {
    checks.push(
      checkInstagram(inputs.instagramUrl.trim()).then((s) => {
        result.instagramStatus = s;
      })
    );
  }

  if (inputs.facebookUrl?.trim()) {
    checks.push(
      checkFacebook(inputs.facebookUrl.trim()).then((s) => {
        result.facebookStatus = s;
      })
    );
  }

  await Promise.allSettled(checks);
  return result;
}

/**
 * Verify links and return results (sync wrapper that initiates but
 * doesn't await — used for non-blocking verification).
 */
export function verifyLinksNonBlocking(inputs: {
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
}): Promise<LinkVerificationResult> {
  return verifyLinks(inputs);
}