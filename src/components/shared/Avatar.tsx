/**
 * §UI/UX Wave 1 — AVATAR (profile image / initials fallback / placeholder).
 *
 * Reusable across the shell header, profile menus and brand profiles.
 * - profile image when the mock-first seam (src/lib/profile/profileImage.ts)
 *   holds one for the user's identity key
 * - initials fallback
 * - placeholder fallback ("?")
 * - responsive sizing, accessible alt text, theme-aware presentation
 * The component never inspects private data beyond name/email its caller
 * already has; no external service or network call is involved.
 */
import { useTheme } from '@/context/ThemeContext';
import {
  getProfileImage,
  profileImageKey,
} from '@/lib/profile/profileImage';

const SIZES = {
  xs: 'h-6 w-6 text-ds-micro',
  sm: 'h-7 w-7 text-ds-label',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-14 w-14 text-base',
} as const;

export type AvatarSize = keyof typeof SIZES;

export interface AvatarProps {
  name: string;
  /** Email used to derive the stable profile-image key (never rendered). */
  email?: string;
  size?: AvatarSize;
  className?: string;
  /** Accessible alternative text. Defaults to the person's name. */
  alt?: string;
}

function initialsOf(name: string): string {
  const parts = name
    .split(' ')
    .filter((p) => p.length > 0 && /[a-z0-9]/i.test(p));
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => (p[0] ?? '').toUpperCase())
    .join('');
}

export function Avatar({
  name,
  email,
  size = 'md',
  className,
  alt,
}: AvatarProps) {
  const { isDark } = useTheme();
  const key = profileImageKey({ email });
  const image = getProfileImage(key);
  const label = alt || name || 'Profile';
  const initials = initialsOf(name || email || '?');

  const base = `relative inline-flex items-center justify-center overflow-hidden rounded-full shrink-0 ${SIZES[size]}`;

  if (image) {
    return (
      <img
        src={image}
        alt={label}
        title={name}
        className={`${base} ${className ?? ''}`}
      />
    );
  }

  // Initials fallback with deterministic hue derived from the name;
  // theme-aware (darker stronger hue on dark themes).
  let h = 0;
  const seed = (name || 'profile').toLowerCase();
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  const bg = isDark ? `hsl(${h} 28% 26%)` : `hsl(${h} 34% 88%)`;
  const fg = isDark ? `hsl(${h} 40% 82%)` : `hsl(${h} 55% 30%)`;

  return (
    <span
      role="img"
      aria-label={`${label} avatar`}
      className={base + (className ? ` ${className}` : '')}
      style={{ backgroundColor: bg, color: fg }}
    >
      <span aria-hidden="true" className="font-semibold tracking-wide">
        {initials}
      </span>
    </span>
  );
}