/**
 * §UI/UX Wave 1 — CANONICAL THEME & DESIGN-TOKEN ARCHITECTURE.
 *
 * Single source of truth for the FIVE Mercenta visual themes and every
 * design token they express. Nothing else may define a theme or a theme
 * colour: components consume `useTheme()` / the CSS variables emitted by
 * ThemeContext, and validators read THIS file. Hard-coded per-page colours
 * are forbidden by the standing single-source-of-truth rule.
 *
 * Themes are PURE PRESENTATION. They never change business logic, data,
 * permissions, routes, information architecture, tenant isolation, API
 * behaviour, simulation semantics or AI policy.
 *
 * The semantic colour language is ONE canonical Mercenta language:
 *   critical=red · warning=yellow · info=blue/cyan · success=green
 * plus expressive feature/context colours (violet, cyan, orange, pink,
 * indigo, emerald, slate). The same semantic colour keeps the same meaning
 * in every theme; only its EXPRESSION changes (indicator → tint → surface
 * → expressive → edge).
 *
 * §UI/UX Wave 2 — SATURATED FEATURE PALETTE. Colour must communicate state,
 * workflow, category, urgency, action, navigation and data meaning, so the
 * eight `--mr-palette-*` tokens carry a canonical HUE → DOMAIN mapping used
 * everywhere (nav identity, chart series, pipeline stages, queue accents):
 *
 *   indigo  → orders / purchase orders        amber  → compliance
 *   cyan    → intelligence / insight         orange → logistics / fulfilment
 *   green   → finance / payouts             pink   → communications / CRM
 *   violet  → catalogue / products          red    → risk / exceptions
 *
 * `--mr-on-palette` is the canonical text/icon colour to place ON a solid
 * palette surface (white on light themes, near-black on dark themes) so a
 * saturated fill is never paired with an unreadable label.
 *
 * BRASS IS IDENTITY ACCENT ONLY (`--mr-accent*`). It must never become the
 * dominant interactive colour of the product.
 *
 * §UI/UX Wave 2 — MOTION + DENSITY. `--mr-motion-*`, `--mr-ease-*` and
 * `--mr-density-*` are declared identically in all five themes (the foundation
 * validator enforces it) so one coherent motion language and one controlled
 * density scale are guaranteed across every theme expression.
 *
 * §Phase WAVE-0 — REPOINTED CONTRACT (supersedes the Wave 1 six-theme contract).
 * The selectable theme set is now EXACTLY FIVE: Minimal Light (default) ·
 * Professional · Bold · Fun · Serious. The retired legacy "Current Mercenta"
 * theme (id `current`, brass-on-ink identity) was REMOVED IN FULL: it is not
 * selectable, not a sixth theme, not a fallback, not recreated, and it must
 * never re-enter `THEME_ORDER`. `scripts/validate-theme-foundation.mjs`
 * asserts the `current` theme is absent, and a persisted
 * `mercenta.theme = "current"` from an earlier session is rejected by
 * `isThemeId()` so a returning visitor falls back to DEFAULT_THEME.
 */

export type ThemeId =
  | 'minimal-light'
  | 'professional'
  | 'bold'
  | 'fun'
  | 'serious';

export type ThemeMode = 'light' | 'dark';

/** How prominently a semantic severity is expressed in a theme (§10). */
export type SeverityExpression =
  | 'indicator' // tiny dot / edge marker (minimal)
  | 'tint' // subtle surface tint (professional)
  | 'surface' // strong flat semantic surface (bold)
  | 'expressive' // colourful, still professional (fun)
  | 'edge'; // restrained edge + icon (serious)

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  description: string;
  mode: ThemeMode;
  /** Per-severity expression mode for this theme. */
  severity: Record<'critical' | 'warning' | 'info' | 'success', SeverityExpression>;
  /** CSS custom properties applied to the document root. */
  vars: Record<string, string>;
  /** Chart visual system (delicate signature: thin strokes, quiet grids). */
  chart: {
    /** Ordered semantic palette used by line/area/doughnut charts. */
    palette: string[];
    /** Grid line colour (very subtle). */
    grid: string;
    /** Axis / tick label colour (quiet). */
    axis: string;
    /** Primary series stroke width in px (1–1.5). */
    strokeWidth: 1 | 1.5;
    /** Doughnut ring thickness in px (thin ring). */
    ring: number;
  };
}

export const THEME_ORDER: readonly ThemeId[] = [
  'minimal-light',
  'professional',
  'bold',
  'fun',
  'serious',
];

/** §UI/UX Wave 1 — the default first-load experience is MINIMAL LIGHT. */
export const DEFAULT_THEME: ThemeId = 'minimal-light';

/** Convenience helpers consumed by ThemeContext and validators. */
export function isThemeId(value: string): value is ThemeId {
  return THEME_ORDER.includes(value as ThemeId);
}

export function themeMode(id: ThemeId): ThemeMode {
  return THEMES[id].mode;
}

export function isDarkTheme(id: ThemeId): boolean {
  return THEMES[id].mode === 'dark';
}

export const THEMES: Record<ThemeId, ThemeMeta> = {
  'minimal-light': {
    id: 'minimal-light',
    label: 'Minimal Light',
    description:
      'Default. Clean, refined cool-neutral light surfaces, delicate borders, restrained colour with intelligent semantic emphasis. Premium enterprise feel.',
    mode: 'light',
    severity: {
      critical: 'indicator',
      warning: 'indicator',
      info: 'indicator',
      success: 'indicator',
    },
    vars: {
      '--mr-bg': '#F6F7F9',
      '--mr-bg-deep': '#EEF0F4',
      '--mr-surface': '#FFFFFF',
      '--mr-surface-raised': '#FFFFFF',
      '--mr-surface-overlay': '#FAFBFC',
      '--mr-surface-hover': '#F1F3F6',
      '--mr-surface-tint': '#EDF0F4',
      '--mr-hairline': '#E4E7ED',
      '--mr-hairline-strong': '#C9CFD9',
      '--mr-text-strong': '#16181D',
      '--mr-text': '#232731',
      '--mr-text-active': '#3A4150',
      '--mr-text-200': '#3A4150',
      '--mr-on-accent': '#16181D',
      '--mr-text-muted': '#5C6572',
      '--mr-text-faint': '#8A93A2',
      '--mr-text-soft': '#FDFDFE',
      '--mr-accent': '#C9A15A',
      '--mr-accent-300': '#E2C98F',
      '--mr-accent-400': '#D6B574',
      '--mr-accent-600': '#A98443',
      '--mr-accent-700': '#8A6C36',
      '--mr-state-critical': '#E5484D',
      '--mr-state-warning': '#F2A93B',
      '--mr-state-info': '#1E9AF0',
      '--mr-state-success': '#1FA45B',
      '--mr-state-muted': '#8A93A2',
      '--mr-feature-intel': '#3D7BFA',
      '--mr-feature-orders': '#5B6BF5',
      '--mr-feature-finance': '#10B981',
      '--mr-feature-compliance': '#F59E0B',
      '--mr-feature-ops': '#64748B',
      '--mr-exp-cyan': '#22C7F0',
      '--mr-exp-coral': '#F472A6',
      '--mr-focus': 'rgba(201,161,90,0.5)',
      '--mr-shadow-subtle': '0 1px 2px rgba(16,24,40,0.06)',
      '--mr-shadow-raised': '0 8px 24px rgba(16,24,40,0.10)',
      '--mr-shadow-overlay': '0 16px 48px rgba(16,24,40,0.14)',
      '--mr-scrollbar': '#C9CFD9',
      '--mr-overlay-tint': 'rgba(15,23,42,0.35)',
      '--mr-tracker-route': '#8A93A2',
      '--mr-tracker-dot': '#C9A15A',
      '--mr-tracker-live': '#1FA45B',
      /* §UI/UX Wave 2 — saturated Mercenta feature palette (solid, confident).
         HUE → DOMAIN is canonical everywhere: indigo=orders · cyan=intelligence
         · green=finance · amber=compliance · orange=logistics · pink=comms
         · violet=catalogue · red=risk. Brass stays identity accent ONLY. */
      '--mr-palette-indigo': '#4F46E5',
      '--mr-palette-cyan': '#0E7490',
      '--mr-palette-green': '#047857',
      '--mr-palette-amber': '#B45309',
      '--mr-palette-orange': '#C2410C',
      '--mr-palette-pink': '#BE185D',
      '--mr-palette-violet': '#6D28D9',
      '--mr-palette-red': '#B91C1C',
      '--mr-on-palette': '#FFFFFF',
      /* §UI/UX Wave 2 — motion + density language. Theme-invariant by contract
         (the foundation validator enforces identical declaration in all five). */
      '--mr-motion-fast': '140ms',
      '--mr-motion-base': '240ms',
      '--mr-motion-slow': '420ms',
      '--mr-ease-standard': 'cubic-bezier(0.2, 0, 0, 1)',
      '--mr-ease-emphasized': 'cubic-bezier(0.2, 0.9, 0.1, 1)',
      '--mr-density-row': '40px',
      '--mr-density-gap': '10px',
      '--mr-density-pad': '14px',
    },
    chart: {
      palette: ['#5B6BF5', '#C9A15A', '#10B981', '#8B5CF6', '#22C7F0', '#F472A6'],
      grid: 'rgba(24,28,40,0.08)',
      axis: '#8A93A2',
      strokeWidth: 1.5,
      ring: 11,
    },
  },

  professional: {
    id: 'professional',
    label: 'Professional',
    description:
      'Cooler, slightly more saturated light surfaces with classic B2B character. Subtle semantic tints and a confident blue-led intelligence identity.',
    mode: 'light',
    severity: {
      critical: 'tint',
      warning: 'tint',
      info: 'tint',
      success: 'tint',
    },
    vars: {
      '--mr-bg': '#EAEFF6',
      '--mr-bg-deep': '#E2E8F2',
      '--mr-surface': '#FCFDFE',
      '--mr-surface-raised': '#FFFFFF',
      '--mr-surface-overlay': '#F4F7FA',
      '--mr-surface-hover': '#E8EDF4',
      '--mr-surface-tint': '#E4EAF2',
      '--mr-hairline': '#DADFE9',
      '--mr-hairline-strong': '#C2CADB',
      '--mr-text-strong': '#10131A',
      '--mr-text': '#1C212B',
      '--mr-text-active': '#343B4A',
      '--mr-text-200': '#343B4A',
      '--mr-on-accent': '#FFFFFF',
      '--mr-text-muted': '#556070',
      '--mr-text-faint': '#8490A2',
      '--mr-text-soft': '#FDFDFE',
      '--mr-accent': '#3E5C8A',
      '--mr-accent-300': '#7C97C4',
      '--mr-accent-400': '#5E7BAE',
      '--mr-accent-600': '#33496E',
      '--mr-accent-700': '#283A58',
      '--mr-state-critical': '#DC3D3D',
      '--mr-state-warning': '#EFA722',
      '--mr-state-info': '#1E7FF0',
      '--mr-state-success': '#1D9C5D',
      '--mr-state-muted': '#8490A2',
      '--mr-feature-intel': '#1E7FF0',
      '--mr-feature-orders': '#4456E8',
      '--mr-feature-finance': '#0FA06A',
      '--mr-feature-compliance': '#E88F1A',
      '--mr-feature-ops': '#5A6A7C',
      '--mr-exp-cyan': '#17B8E8',
      '--mr-exp-coral': '#E85D8A',
      '--mr-focus': 'rgba(201,161,90,0.5)',
      '--mr-shadow-subtle': '0 1px 2px rgba(16,24,40,0.08)',
      '--mr-shadow-raised': '0 8px 24px rgba(16,24,40,0.12)',
      '--mr-shadow-overlay': '0 16px 48px rgba(16,24,40,0.16)',
      '--mr-scrollbar': '#C2CADB',
      '--mr-overlay-tint': 'rgba(10,17,32,0.4)',
      '--mr-tracker-route': '#8490A2',
      '--mr-tracker-dot': '#C9A15A',
      '--mr-tracker-live': '#1D9C5D',
      /* §UI/UX Wave 2 — saturated Mercenta feature palette (see minimal-light
         for the canonical hue → domain mapping). */
      '--mr-palette-indigo': '#4F46E5',
      '--mr-palette-cyan': '#0E7490',
      '--mr-palette-green': '#047857',
      '--mr-palette-amber': '#B45309',
      '--mr-palette-orange': '#C2410C',
      '--mr-palette-pink': '#BE185D',
      '--mr-palette-violet': '#6D28D9',
      '--mr-palette-red': '#B91C1C',
      '--mr-on-palette': '#FFFFFF',
      /* §UI/UX Wave 2 — motion + density language (theme-invariant contract). */
      '--mr-motion-fast': '140ms',
      '--mr-motion-base': '240ms',
      '--mr-motion-slow': '420ms',
      '--mr-ease-standard': 'cubic-bezier(0.2, 0, 0, 1)',
      '--mr-ease-emphasized': 'cubic-bezier(0.2, 0.9, 0.1, 1)',
      '--mr-density-row': '40px',
      '--mr-density-gap': '10px',
      '--mr-density-pad': '14px',
    },
    chart: {
      palette: ['#1E7FF0', '#C9A15A', '#0FA06A', '#7A5AD8', '#17B8E8', '#E85D8A'],
      grid: 'rgba(31,42,68,0.08)',
      axis: '#8490A2',
      strokeWidth: 1.5,
      ring: 11,
    },
  },
bold: {
    id: 'bold',
    label: 'Bold',
    description:
      'Genuinely near-black charcoal foundation with strong, saturated semantic surfaces. High visual energy, unmistakably professional.',
    mode: 'dark',
    severity: {
      critical: 'surface',
      warning: 'surface',
      info: 'surface',
      success: 'surface',
    },
    vars: {
      '--mr-bg': '#120B1F',
      '--mr-bg-deep': '#0B0714',
      '--mr-surface': '#121318',
      '--mr-surface-raised': '#17181D',
      '--mr-surface-overlay': '#1C1E24',
      '--mr-surface-hover': '#23252E',
      '--mr-surface-tint': '#2A2C36',
      '--mr-hairline': 'rgba(245,246,248,0.09)',
      '--mr-hairline-strong': 'rgba(245,246,248,0.16)',
      '--mr-text-strong': '#F5F6F8',
      '--mr-text': '#E6E8EE',
      '--mr-text-active': '#C9CDD8',
      '--mr-text-200': '#D8DCE5',
      '--mr-on-accent': '#FFFFFF',
      '--mr-text-muted': '#9AA1AC',
      '--mr-text-faint': '#6E7582',
      '--mr-text-soft': '#F1ECE1',
      '--mr-accent': '#7C3AED',
      '--mr-accent-300': '#A98BF5',
      '--mr-accent-400': '#9271F1',
      '--mr-accent-600': '#6A2BD6',
      '--mr-accent-700': '#5823B4',
      '--mr-state-critical': '#E5484D',
      '--mr-state-warning': '#F5A524',
      '--mr-state-info': '#2E9BF0',
      '--mr-state-success': '#2FBF71',
      '--mr-state-muted': '#9AA1AC',
      '--mr-feature-intel': '#3D7BFA',
      '--mr-feature-orders': '#6366F1',
      '--mr-feature-finance': '#10C981',
      '--mr-feature-compliance': '#F5A524',
      '--mr-feature-ops': '#8594A5',
      '--mr-exp-cyan': '#22D3EE',
      '--mr-exp-coral': '#F472B6',
      '--mr-focus': 'rgba(212,179,106,0.55)',
      '--mr-shadow-subtle': '0 1px 3px rgba(0,0,0,0.4)',
      '--mr-shadow-raised': '0 6px 20px rgba(0,0,0,0.5)',
      '--mr-shadow-overlay': '0 16px 48px rgba(0,0,0,0.62)',
      '--mr-scrollbar': '#3A3D47',
      '--mr-overlay-tint': 'rgba(0,0,0,0.6)',
      '--mr-tracker-route': '#6E7582',
      '--mr-tracker-dot': '#D4B36A',
      '--mr-tracker-live': '#2FBF71',
      /* §UI/UX Wave 2 — saturated Mercenta feature palette. Bright, solid,
         high-energy fills with dark on-palette text. */
      '--mr-palette-indigo': '#6C6FF2',
      '--mr-palette-cyan': '#06B6D4',
      '--mr-palette-green': '#22C55E',
      '--mr-palette-amber': '#FBBF24',
      '--mr-palette-orange': '#F97316',
      '--mr-palette-pink': '#EC4899',
      '--mr-palette-violet': '#8B5CF6',
      '--mr-palette-red': '#EF4444',
      '--mr-on-palette': '#0B0C0F',
      /* §UI/UX Wave 2 — motion + density language (theme-invariant contract). */
      '--mr-motion-fast': '140ms',
      '--mr-motion-base': '240ms',
      '--mr-motion-slow': '420ms',
      '--mr-ease-standard': 'cubic-bezier(0.2, 0, 0, 1)',
      '--mr-ease-emphasized': 'cubic-bezier(0.2, 0.9, 0.1, 1)',
      '--mr-density-row': '40px',
      '--mr-density-gap': '10px',
      '--mr-density-pad': '14px',
    },
    chart: {
      palette: ['#6366F1', '#D4B36A', '#2FBF71', '#A78BFA', '#22D3EE', '#F472B6'],
      grid: 'rgba(245,246,248,0.07)',
      axis: '#6E7582',
      strokeWidth: 1.5,
      ring: 12,
    },
  },

  fun: {
    id: 'fun',
    label: 'Fun',
    description:
      'Warm, expressive and colourful — still unmistakably professional. A lively light foundation with playful semantic treatments.',
    mode: 'light',
    severity: {
      critical: 'expressive',
      warning: 'expressive',
      info: 'expressive',
      success: 'expressive',
    },
    vars: {
      '--mr-bg': '#FCF4E8',
      '--mr-bg-deep': '#F6EBD9',
      '--mr-surface': '#FFFFFF',
      '--mr-surface-raised': '#FFFFFF',
      '--mr-surface-overlay': '#FBF8F4',
      '--mr-surface-hover': '#F0ECE6',
      '--mr-surface-tint': '#EDE7DF',
      '--mr-hairline': '#E8E2DA',
      '--mr-hairline-strong': '#D5CCC0',
      '--mr-text-strong': '#1C1A24',
      '--mr-text': '#2A2730',
      '--mr-text-active': '#4A4452',
      '--mr-text-200': '#4A4452',
      '--mr-on-accent': '#0B0C0F',
      '--mr-text-muted': '#6A6470',
      '--mr-text-faint': '#948C96',
      '--mr-text-soft': '#FDFCFA',
      '--mr-accent': '#0F9B8E',
      '--mr-accent-300': '#5CCCC2',
      '--mr-accent-400': '#2FB5A8',
      '--mr-accent-600': '#0B7F74',
      '--mr-accent-700': '#096A61',
      '--mr-state-critical': '#EB4D5E',
      '--mr-state-warning': '#F2A93B',
      '--mr-state-info': '#2E9BF0',
      '--mr-state-success': '#21B573',
      '--mr-state-muted': '#948C96',
      '--mr-feature-intel': '#2E9BF0',
      '--mr-feature-orders': '#5866EB',
      '--mr-feature-finance': '#18B981',
      '--mr-feature-compliance': '#F2A93B',
      '--mr-feature-ops': '#7C8698',
      '--mr-exp-cyan': '#22D3EE',
      '--mr-exp-coral': '#F472B6',
      '--mr-focus': 'rgba(201,161,90,0.5)',
      '--mr-shadow-subtle': '0 1px 3px rgba(60,46,90,0.08)',
      '--mr-shadow-raised': '0 8px 24px rgba(60,46,90,0.12)',
      '--mr-shadow-overlay': '0 16px 48px rgba(60,46,90,0.16)',
      '--mr-scrollbar': '#D5CCC0',
      '--mr-overlay-tint': 'rgba(38,28,52,0.35)',
      '--mr-tracker-route': '#948C96',
      '--mr-tracker-dot': '#C9A15A',
      '--mr-tracker-live': '#21B573',
      /* §UI/UX Wave 2 — saturated Mercenta feature palette. Bright playful
         fills with a dark on-palette text for AA contrast. */
      '--mr-palette-indigo': '#4F46E5',
      '--mr-palette-cyan': '#0E7490',
      '--mr-palette-green': '#047857',
      '--mr-palette-amber': '#B45309',
      '--mr-palette-orange': '#C2410C',
      '--mr-palette-pink': '#BE185D',
      '--mr-palette-violet': '#6D28D9',
      '--mr-palette-red': '#B91C1C',
      '--mr-on-palette': '#FFFFFF',
      /* §UI/UX Wave 2 — motion + density language (theme-invariant contract). */
      '--mr-motion-fast': '140ms',
      '--mr-motion-base': '240ms',
      '--mr-motion-slow': '420ms',
      '--mr-ease-standard': 'cubic-bezier(0.2, 0, 0, 1)',
      '--mr-ease-emphasized': 'cubic-bezier(0.2, 0.9, 0.1, 1)',
      '--mr-density-row': '40px',
      '--mr-density-gap': '10px',
      '--mr-density-pad': '14px',
    },
    chart: {
      palette: ['#E85D8A', '#5866EB', '#22D3EE', '#C9A15A', '#21B573', '#F59E0B'],
      grid: 'rgba(60,46,90,0.08)',
      axis: '#948C96',
      strokeWidth: 1.5,
      ring: 11,
    },
  },

  serious: {
    id: 'serious',
    label: 'Serious',
    description:
      'Restrained charcoal operation deck. Quiet edges and icon-driven severity states — built for focused, decision-heavy work.',
    mode: 'dark',
    severity: {
      critical: 'edge',
      warning: 'edge',
      info: 'edge',
      success: 'edge',
    },
    vars: {
      '--mr-bg': '#0E0F11',
      '--mr-bg-deep': '#0A0B0D',
      '--mr-surface': '#141518',
      '--mr-surface-raised': '#191A1E',
      '--mr-surface-overlay': '#1F2024',
      '--mr-surface-hover': '#26272B',
      '--mr-surface-tint': '#2D2E33',
      '--mr-hairline': 'rgba(234,236,239,0.07)',
      '--mr-hairline-strong': 'rgba(234,236,239,0.13)',
      '--mr-text-strong': '#EAECEF',
      '--mr-text': '#D6D9DE',
      '--mr-text-active': '#ABB0BC',
      '--mr-text-200': '#C4C9D2',
      '--mr-on-accent': '#0B0C0F',
      '--mr-text-muted': '#8A909A',
      '--mr-text-faint': '#6A7078',
      '--mr-text-soft': '#EAECEF',
      '--mr-accent': '#8CA0B8',
      '--mr-accent-300': '#C3D0DE',
      '--mr-accent-400': '#A8B9CC',
      '--mr-accent-600': '#6D8199',
      '--mr-accent-700': '#5A6B80',
      '--mr-state-critical': '#D9463F',
      '--mr-state-warning': '#D9A018',
      '--mr-state-info': '#4C8FD9',
      '--mr-state-success': '#2BA164',
      '--mr-state-muted': '#8A909A',
      '--mr-feature-intel': '#4C8FD9',
      '--mr-feature-orders': '#5A70B8',
      '--mr-feature-finance': '#2BA164',
      '--mr-feature-compliance': '#B9831D',
      '--mr-feature-ops': '#6E7684',
      '--mr-exp-cyan': '#4CB9D9',
      '--mr-exp-coral': '#C96A8C',
      '--mr-focus': 'rgba(184,155,94,0.5)',
      '--mr-shadow-subtle': '0 1px 3px rgba(0,0,0,0.38)',
      '--mr-shadow-raised': '0 6px 20px rgba(0,0,0,0.46)',
      '--mr-shadow-overlay': '0 16px 48px rgba(0,0,0,0.56)',
      '--mr-scrollbar': '#34363C',
      '--mr-overlay-tint': 'rgba(0,0,0,0.55)',
      '--mr-tracker-route': '#6A7078',
      '--mr-tracker-dot': '#B89B5E',
      '--mr-tracker-live': '#2BA164',
      /* §UI/UX Wave 2 — saturated Mercenta feature palette, held to a cool,
         restrained saturation appropriate to a decision-heavy deck. */
      '--mr-palette-indigo': '#6C6FF2',
      '--mr-palette-cyan': '#06B6D4',
      '--mr-palette-green': '#22C55E',
      '--mr-palette-amber': '#FBBF24',
      '--mr-palette-orange': '#F97316',
      '--mr-palette-pink': '#EC4899',
      '--mr-palette-violet': '#8B5CF6',
      '--mr-palette-red': '#EF4444',
      '--mr-on-palette': '#0B0C0F',
      /* §UI/UX Wave 2 — motion + density language (theme-invariant contract). */
      '--mr-motion-fast': '140ms',
      '--mr-motion-base': '240ms',
      '--mr-motion-slow': '420ms',
      '--mr-ease-standard': 'cubic-bezier(0.2, 0, 0, 1)',
      '--mr-ease-emphasized': 'cubic-bezier(0.2, 0.9, 0.1, 1)',
      '--mr-density-row': '40px',
      '--mr-density-gap': '10px',
      '--mr-density-pad': '14px',
    },
    chart: {
      palette: ['#4C8FD9', '#B89B5E', '#2BA164', '#7A6CB8', '#4CB9D9', '#C96A8C'],
      grid: 'rgba(234,236,239,0.06)',
      axis: '#6A7078',
      strokeWidth: 1.5,
      ring: 12,
    },
  },
};

/** Validates the CSS variable contract — every theme must define every name. */
export const THEME_VAR_NAMES: readonly string[] =
  THEME_ORDER.length > 0 ? Object.keys(THEMES[THEME_ORDER[0]].vars) : [];

/* ══════════════════════════════════════════════════════════════════════════
   §UI/UX Wave 2 — DOMAIN → SATURATED PALETTE BINDING (single source of truth).

   Every component that needs to say "this is the ORDERS area", "this is
   FINANCE", "this is the COMPLIANCE stage" resolves the colour HERE. No
   component may hardcode a palette hex or invent a domain colour, exactly as
   no component may define its own theme.

   `var(--mr-palette-*)` is used rather than the literal hex so the value stays
   theme-reactive (six expressions of one design system). `on` is the canonical
   text/icon colour to place ON the solid fill.
   ══════════════════════════════════════════════════════════════════════════ */

/** The eight canonical operational domains the palette expresses. */
export type PaletteDomain =
  | 'orders'
  | 'intelligence'
  | 'finance'
  | 'compliance'
  | 'logistics'
  | 'communications'
  | 'catalogue'
  | 'risk';

export interface DomainColour {
  /** Solid saturated fill / accent stroke. */
  solid: string;
  /** Text or icon colour to use ON `solid`. */
  on: string;
}

export const DOMAIN_COLOURS: Record<PaletteDomain, DomainColour> = {
  orders: { solid: 'var(--mr-palette-indigo)', on: 'var(--mr-on-palette)' },
  intelligence: { solid: 'var(--mr-palette-cyan)', on: 'var(--mr-on-palette)' },
  finance: { solid: 'var(--mr-palette-green)', on: 'var(--mr-on-palette)' },
  compliance: { solid: 'var(--mr-palette-amber)', on: 'var(--mr-on-palette)' },
  logistics: { solid: 'var(--mr-palette-orange)', on: 'var(--mr-on-palette)' },
  communications: { solid: 'var(--mr-palette-pink)', on: 'var(--mr-on-palette)' },
  catalogue: { solid: 'var(--mr-palette-violet)', on: 'var(--mr-on-palette)' },
  risk: { solid: 'var(--mr-palette-red)', on: 'var(--mr-on-palette)' },
};

/**
 * Maps the shell's feature-identity section colours onto the saturated
 * palette. Used by the navigation rail so a section's colour is chosen once.
 */
export const SECTION_PALETTE: Record<string, PaletteDomain> = {
  Overview: 'orders',
  Brands: 'communications',
  Catalogue: 'catalogue',
  Commerce: 'orders',
  Finance: 'finance',
  Logistics: 'logistics',
  Compliance: 'compliance',
  Communications: 'communications',
  Support: 'communications',
  Monitoring: 'intelligence',
  Administration: 'intelligence',
  Integrations: 'catalogue',
  Insights: 'intelligence',
  Account: 'intelligence',
};

/** Resolve a section label to its palette domain (fallback: orders). */
export function sectionDomain(label: string): PaletteDomain {
  return SECTION_PALETTE[label] ?? 'orders';
}