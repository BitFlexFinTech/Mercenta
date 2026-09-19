/**
 * §UI/UX Wave 1 — PROFILE IMAGE SEAM (mock-first).
 *
 * Users may add a profile picture. This seam stores the image reference
 * (data-URI or object URL) per user identity key and returns it to the
 * Avatar component. It is fully local and deterministic: no external image
 * service, no credentials, no network calls. A future upload provider can
 * replace the persistence behind the same function signatures.
 *
 * Keys are intentionally opaque identity keys (never raw PII beyond what
 * the caller already holds: the header already derives name/email from the
 * session). Nothing here exposes private information.
 */

/** In-memory mock store (durable:false — mirrors demoStore semantics). */
const profileImages: Map<string, string> = new Map();

/** Deterministic identity key for a user (stable per session/user). */
export function profileImageKey(args: { email?: string; userId?: string }): string {
  const base = args.email?.trim().toLowerCase() || args.userId || 'anon';
  return `profile-${base}`;
}

export function setProfileImage(key: string, url: string | null): void {
  if (url) profileImages.set(key, url);
  else profileImages.delete(key);
}

export function getProfileImage(key: string): string | null {
  return profileImages.get(key) ?? null;
}

export function hasProfileImage(key: string): boolean {
  return profileImages.has(key);
}

/** Test/validation hook — resets the store to pristine. */
export function _resetProfileImages(): void {
  profileImages.clear();
}