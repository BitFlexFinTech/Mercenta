/**
 * §BRAND REDESIGN (2026-11-19) — CANONICAL BRAND TOKENS AND THE TWO APPEARANCES.
 *
 * THE ONE OWNER of every colour in the product. Nothing else may define a theme
 * or a theme colour: components consume `useTheme()` / the CSS variables emitted
 * by ThemeContext, and validators read THIS file. Hard-coded per-page colours
 * are forbidden by the standing single-source-of-truth rule.
 *
 * §REPOINTED CONTRACT (supersedes the five-theme OpenShip-mapped contract).
 * The selectable set is now EXACTLY TWO, both built from the approved Mercenta
 * identity (black #000000 / white #FFFFFF / orange #FF6A00):
 *
 *   `brand-dark` (DEFAULT)  ·  `brand-light`
 *
 * The five retired themes — minimal-light, professional, bold, fun, serious —
 * are REMOVED IN FULL. They are not selectable, not a fallback, not recreated,
 * and must never re-enter `THEME_ORDER`. A persisted `mercenta.theme` value from
 * an earlier session is rejected by `isThemeId()`, so a returning visitor lands
 * on `DEFAULT_THEME`. `scripts/validate-theme-foundation.mjs` asserts all five
 * retired ids are absent.
 *
 * THE BRAND PALETTE IS DECLARED ONCE (`BRAND_PALETTE`) and both appearances READ
 * it, so the accent cannot drift between them. No brand hex is retyped in a
 * theme block.
 *
 * Themes are PURE PRESENTATION. They never change business logic, data,
 * permissions, routes, information architecture, tenant isolation, API
 * behaviour, simulation semantics or AI policy.
 *
 * HOMEPAGE DESIGN SELECTION IS A SEPARATE AXIS. Which homepage composition
 * renders (A/B/C/D) is owned by `src/config/homepageDesign.ts` and is NOT a
 * theme. Appearance and homepage design are independent, by contract.
 *
 * The semantic colour language remains ONE canonical Mercenta language:
 *   critical=red · warning=amber · info=blue · success=green
 * plus expressive feature/context colours. The same semantic colour keeps the
 * same meaning in every appearance; only its EXPRESSION changes.
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
 * §BRAND REDESIGN (2026-11-19) — THE TOKEN NAMES ARE HISTORICAL, THE VALUES ARE
 * BRAND-ALIGNED. The eight `--mr-palette-*` NAMES above are kept because hundreds
 * of call sites and the `PaletteDomain` union reference them; the VALUES no longer
 * include purple, teal, violet or lime, which the approved identity forbids.
 * Measured defect this closed: the navigation rail's **Catalogue** section
 * resolved to `--mr-palette-violet` (`#6941C6`), which rendered as a PURPLE
 * sidebar. Re-tuned to brand-aligned hues that remain distinguishable from each
 * other, so charts and status semantics still work:
 *
 *   indigo → blue      cyan → sky       violet → slate
 *
 * Do NOT re-introduce a purple, teal, violet or lime value here.
 *
 * `--mr-on-palette` is the canonical text/icon colour to place ON a solid
 * palette surface so a saturated fill is never paired with an unreadable label.
 *
 * THE ACCENT IS THE BRAND ORANGE (`--mr-accent*`), not a decorative tint.
 *
 * §UI/UX Wave 2 — MOTION + DENSITY. `--mr-motion-*`, `--mr-ease-*` and
 * `--mr-density-*` are declared identically in both appearances (the foundation
 * validator enforces it) so one coherent motion language and one controlled
 * density scale are guaranteed across every expression.
 */

export type ThemeId = 'brand-dark' | 'brand-light';

/**
 * §BRAND REDESIGN — the approved Mercenta appearance a theme implements.
 * REPOINTED from the retired `OpenShipDesign` (`'light' | 'dim' | 'dark' | 'preserved'`),
 * which described the five-theme OpenShip mapping that no longer exists.
 */
export type BrandAppearance = 'dark' | 'light';

export type ThemeMode = 'light' | 'dark';

/** How prominently a semantic severity is expressed in a theme (§10). */
export type SeverityExpression =
  | 'indicator' // tiny dot / edge marker
  | 'tint' // subtle surface tint
  | 'surface' // strong flat semantic surface
  | 'expressive' // colourful, still professional
  | 'edge'; // restrained edge + icon

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  description: string;
  mode: ThemeMode;
  /** The approved brand appearance this theme implements. */
  appearance: BrandAppearance;
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

/**
 * §BRAND PALETTE — THE APPROVED MERCENTA IDENTITY, DECLARED ONCE.
 *
 * Source of truth: the approved brand guidelines (black #000000, white #FFFFFF,
 * orange #FF6A00 only). Both appearances READ these values, so the brand colours
 * are never retyped inside a theme block and cannot drift apart.
 */
export const BRAND_PALETTE = {
  black: '#000000',
  white: '#FFFFFF',
  orange: '#FF6A00',
  /** Derived steps of the orange action (not additional brand colours). */
  orangeHover: '#E05A00',
  orangeDeep: '#B34700',
  orangeLight: '#FF8F40',
  orangePale: '#FFC499',
  /** Dark appearance ladder (guidelines: surface #101010). */
  darkSurface: '#101010',
  darkBorder: '#2B2B2B',
  darkMuted: '#A5A5A5',
  /** Light appearance ladder (guidelines: surface #F4F4F2). */
  lightSurface: '#F4F4F2',
  lightBorder: '#DCDCDC',
  lightMuted: '#666666',
} as const;

export const THEME_ORDER: readonly ThemeId[] = ['brand-dark', 'brand-light'];

/** §BRAND REDESIGN — the approved default first-load experience is DARK. */
export const DEFAULT_THEME: ThemeId = 'brand-dark';

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
  'brand-dark': {
    id: 'brand-dark',
    label: 'Mercenta Dark',
    description:
      'Default. The approved Mercenta identity on black: a #000000 page, #101010 surfaces, white type and the #FF6A00 accent. Separation is carried by hairlines and surface steps.',
    mode: 'dark',
    appearance: 'dark',
    severity: {
      critical: 'indicator',
      warning: 'indicator',
      info: 'indicator',
      success: 'indicator',
    },
    vars: {
      '--mr-bg': BRAND_PALETTE.black,
      '--mr-bg-deep': BRAND_PALETTE.black,
      '--mr-surface': BRAND_PALETTE.darkSurface,
      '--mr-surface-raised': '#141414',
      '--mr-surface-overlay': '#1A1A1A',
      '--mr-surface-hover': '#1F1F1F',
      '--mr-surface-tint': '#161616',
      '--mr-hairline': BRAND_PALETTE.darkBorder,
      '--mr-hairline-strong': '#3D3D3D',
      '--mr-text-strong': BRAND_PALETTE.white,
      '--mr-text': '#E8E8E8',
      '--mr-text-active': BRAND_PALETTE.white,
      '--mr-text-200': '#D4D4D4',
      '--mr-on-accent': BRAND_PALETTE.black,
      '--mr-text-muted': BRAND_PALETTE.darkMuted,
      /* §BRAND IDENTITY — was #7A7A7A, which measured 4.43:1 on #101010 and
         4.29:1 on the #141414 raised surface: BELOW the WCAG AA floor of 4.5:1
         for the 11px labels and timestamps that use it. #858585 measures 5.20:1
         on #101010 and 4.72:1 on #141414. */
      '--mr-text-faint': '#858585',
      '--mr-text-soft': BRAND_PALETTE.white,
      '--mr-accent': BRAND_PALETTE.orange,
      '--mr-accent-300': BRAND_PALETTE.orangePale,
      '--mr-accent-400': BRAND_PALETTE.orangeLight,
      '--mr-accent-600': BRAND_PALETTE.orangeHover,
      '--mr-accent-700': BRAND_PALETTE.orangeDeep,
      /* §BRAND IDENTITY (2026-11-20) — STATUS INSIDE THE APPROVED PALETTE.
         The approved identity is black, white and #FF6A00 plus neutrals. There
         is no green, blue, red, purple or teal in it. Status therefore keeps its
         MEANING through intensity, fill weight, text and icon — never through an
         unrelated hue. Critical is the strongest orange; warning is a lighter
         orange; info is neutral; success is the brightest neutral step. */
      '--mr-state-critical': BRAND_PALETTE.orange,
      '--mr-state-warning': BRAND_PALETTE.orangeLight,
      '--mr-state-info': BRAND_PALETTE.darkMuted,
      '--mr-state-success': '#E8E8E8',
      '--mr-state-muted': '#7A7A7A',
      '--mr-feature-intel': BRAND_PALETTE.darkMuted,
      '--mr-feature-orders': BRAND_PALETTE.orange,
      '--mr-feature-finance': '#D4D4D4',
      '--mr-feature-compliance': BRAND_PALETTE.orangeLight,
      '--mr-feature-ops': '#8A8A8A',
      /* §BRAND IDENTITY — `text-on-fill` was referenced by tailwind.config.js but
         never declared, so it resolved to an undefined variable. Declared here so
         the contract is complete. (The retired Social feature's token is gone with
         the feature — see §BATCH 5 in validate-retired-platforms.) */
      '--mr-on-fill': BRAND_PALETTE.black,
      '--mr-exp-cyan': BRAND_PALETTE.darkMuted,
      '--mr-exp-coral': BRAND_PALETTE.orange,
      '--mr-focus': 'rgba(255,106,0,0.60)',
      '--mr-shadow-subtle': 'none',
      '--mr-shadow-raised': '0 6px 20px rgba(0,0,0,0.55)',
      '--mr-shadow-overlay': '0 18px 48px rgba(0,0,0,0.70)',
      '--mr-scrollbar': '#333333',
      '--mr-overlay-tint': 'rgba(0,0,0,0.72)',
      '--mr-card-border': BRAND_PALETTE.darkBorder,
      '--mr-card-nested': '#161616',
      '--mr-hover-tint': 'rgba(255,255,255,0.05)',
      '--mr-card-border-hover': '#3D3D3D',
      '--mr-tracker-route': BRAND_PALETTE.darkMuted,
      '--mr-tracker-dot': BRAND_PALETTE.orange,
      '--mr-tracker-live': BRAND_PALETTE.orange,
      /* §BRAND IDENTITY (2026-11-20) — THE EIGHT DOMAIN TOKENS ARE NOW A
         SINGLE-HUE BRAND RAMP. The NAMES are historical (hundreds of call sites
         and the `PaletteDomain` type depend on them); the VALUES are all inside
         the approved identity: orange steps plus neutral steps. Charts and
         pipeline stages stay distinguishable by LIGHTNESS STEP, not by an
         unrelated hue. Nothing here is blue, green, pink, purple or teal. */
      '--mr-palette-indigo': BRAND_PALETTE.orange,
      '--mr-palette-cyan': BRAND_PALETTE.orangeLight,
      '--mr-palette-green': BRAND_PALETTE.orangePale,
      '--mr-palette-amber': BRAND_PALETTE.orangeHover,
      '--mr-palette-orange': BRAND_PALETTE.orange,
      /* A saturated orange step, not a grey: the token name is historical, but a
         desaturated value would make `pink` indistinguishable from `violet`. */
      '--mr-palette-pink': '#FF9E5C',
      '--mr-palette-violet': '#8A8A8A',
      '--mr-palette-red': BRAND_PALETTE.orangeDeep,
      '--mr-on-palette': BRAND_PALETTE.black,
      '--mr-accent-image': 'none',
      '--mr-accent-image-hover': 'none',
      '--mr-btn-bg': BRAND_PALETTE.orange,
      '--mr-btn-bg-hover': BRAND_PALETTE.orangeHover,
      '--mr-btn-text': BRAND_PALETTE.black,
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
      /* §BRAND IDENTITY — a single-hue brand ramp. Series stay separable by
         lightness step while every value remains inside the approved identity. */
      palette: [
        BRAND_PALETTE.orange,
        BRAND_PALETTE.orangeLight,
        BRAND_PALETTE.orangePale,
        BRAND_PALETTE.orangeHover,
        BRAND_PALETTE.orangeDeep,
        '#B8B8B8',
      ],
      grid: 'rgba(255,255,255,0.07)',
      axis: '#7A7A7A',
      strokeWidth: 1.5,
      ring: 11,
    },
  },

  'brand-light': {
    id: 'brand-light',
    label: 'Mercenta Light',
    description:
      'The approved Mercenta identity on white: a #FFFFFF page, #F4F4F2 surfaces, black type and the #FF6A00 accent.',
    mode: 'light',
    appearance: 'light',
    severity: {
      critical: 'indicator',
      warning: 'indicator',
      info: 'indicator',
      success: 'indicator',
    },
    vars: {
      '--mr-bg': BRAND_PALETTE.white,
      '--mr-bg-deep': BRAND_PALETTE.lightSurface,
      '--mr-surface': BRAND_PALETTE.white,
      '--mr-surface-raised': BRAND_PALETTE.white,
      '--mr-surface-overlay': BRAND_PALETTE.white,
      '--mr-surface-hover': BRAND_PALETTE.lightSurface,
      '--mr-surface-tint': BRAND_PALETTE.lightSurface,
      '--mr-hairline': BRAND_PALETTE.lightBorder,
      '--mr-hairline-strong': '#BFBFBF',
      '--mr-text-strong': BRAND_PALETTE.black,
      '--mr-text': '#333333',
      '--mr-text-active': BRAND_PALETTE.black,
      '--mr-text-200': '#1A1A1A',
      '--mr-on-accent': BRAND_PALETTE.black,
      '--mr-text-muted': BRAND_PALETTE.lightMuted,
      /* §BRAND IDENTITY — was #8A8A8A, which measured 3.45:1 on white: far
         BELOW the WCAG AA floor of 4.5:1 for the 11px labels that use it.
         #6B6B6B measures 5.33:1 on #FFFFFF and 4.85:1 on the #F4F4F2 surface. */
      '--mr-text-faint': '#6B6B6B',
      '--mr-text-soft': BRAND_PALETTE.white,
      '--mr-accent': BRAND_PALETTE.orange,
      /* §BRAND IDENTITY — the 300/400 steps are used as TEXT (`text-brass-300`
         badge labels), not only as tints. On white the pale steps measured
         1.54:1 (#FFC499) and 2.29:1 (#FF8F40) — unreadable. They now carry deep,
         legible steps; the pale LOOK of a tint is preserved by the `/opacity`
         form (the shim mixes the base toward transparent), so `bg-brass-300/15`
         is still a pale wash while the text is readable. */
      '--mr-accent-300': BRAND_PALETTE.orangeDeep,
      '--mr-accent-400': '#C45100',
      '--mr-accent-600': BRAND_PALETTE.orangeHover,
      '--mr-accent-700': BRAND_PALETTE.orangeDeep,
      /* §BRAND IDENTITY (2026-11-20) — STATUS INSIDE THE APPROVED PALETTE.
         On white the ramp steps deeper so contrast holds: critical is a deep
         orange, warning a strong orange, info a neutral grey, success a
         near-black "solid / complete" tone. Meaning is carried by intensity,
         fill weight, text and icon — never by an unrelated hue. */
      '--mr-state-critical': BRAND_PALETTE.orangeDeep,
      /* §BRAND IDENTITY — was `orangeHover` (#E05A00), which measured 3.73:1 as
         text on white: below the 4.5:1 floor for the 12px badge labels that use
         it. #C45100 measures 4.72:1. Critical stays the deeper #B34700 (5.46:1)
         so the two states remain distinguishable. */
      '--mr-state-warning': '#C45100',
      '--mr-state-info': BRAND_PALETTE.lightMuted,
      '--mr-state-success': '#333333',
      '--mr-state-muted': '#8A8A8A',
      '--mr-feature-intel': BRAND_PALETTE.lightMuted,
      '--mr-feature-orders': BRAND_PALETTE.orange,
      '--mr-feature-finance': '#333333',
      '--mr-feature-compliance': BRAND_PALETTE.orangeDeep,
      '--mr-feature-ops': '#8A8A8A',
      /* §BRAND IDENTITY — declared so the tailwind contract is complete. */
      '--mr-on-fill': BRAND_PALETTE.black,
      '--mr-exp-cyan': '#8A8A8A',
      '--mr-exp-coral': BRAND_PALETTE.orange,
      '--mr-focus': 'rgba(255,106,0,0.50)',
      '--mr-shadow-subtle': 'none',
      '--mr-shadow-raised': '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px -1px rgba(0,0,0,0.10)',
      '--mr-shadow-overlay': '0 16px 40px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)',
      '--mr-scrollbar': '#BFBFBF',
      '--mr-overlay-tint': 'rgba(0,0,0,0.50)',
      '--mr-card-border': BRAND_PALETTE.lightBorder,
      '--mr-card-nested': BRAND_PALETTE.lightSurface,
      '--mr-hover-tint': 'rgba(0,0,0,0.04)',
      '--mr-card-border-hover': '#BFBFBF',
      '--mr-tracker-route': BRAND_PALETTE.lightMuted,
      '--mr-tracker-dot': BRAND_PALETTE.orange,
      '--mr-tracker-live': BRAND_PALETTE.orange,
      /* §BRAND IDENTITY (2026-11-20) — THE EIGHT DOMAIN TOKENS AS A SINGLE-HUE
         BRAND RAMP. Names are historical; values are all inside the approved
         identity. On white the steps run deeper so every series stays legible. */
      '--mr-palette-indigo': BRAND_PALETTE.orange,
      '--mr-palette-cyan': BRAND_PALETTE.orangeLight,
      '--mr-palette-green': BRAND_PALETTE.orangeDeep,
      '--mr-palette-amber': BRAND_PALETTE.orangeHover,
      '--mr-palette-orange': BRAND_PALETTE.orange,
      /* A saturated orange step, not a grey: the token name is historical, but a
         desaturated value would make `pink` indistinguishable from `violet`. */
      '--mr-palette-pink': '#FF9E5C',
      '--mr-palette-violet': BRAND_PALETTE.lightMuted,
      '--mr-palette-red': BRAND_PALETTE.orangeDeep,
      /* §BRAND IDENTITY — black on orange. White on #FF6A00 fails contrast
         (≈2.9:1); black on the same fill is ≈7.4:1. Meaning must stay legible. */
      '--mr-on-palette': BRAND_PALETTE.black,
      '--mr-accent-image': 'none',
      '--mr-accent-image-hover': 'none',
      '--mr-btn-bg': BRAND_PALETTE.orange,
      '--mr-btn-bg-hover': BRAND_PALETTE.orangeHover,
      '--mr-btn-text': BRAND_PALETTE.black,
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
      /* §BRAND IDENTITY — single-hue brand ramp; separable by lightness step. */
      palette: [
        BRAND_PALETTE.orange,
        BRAND_PALETTE.orangeHover,
        BRAND_PALETTE.orangeDeep,
        BRAND_PALETTE.orangeLight,
        BRAND_PALETTE.orangePale,
        '#8A8A8A',
      ],
      grid: 'rgba(0,0,0,0.08)',
      axis: '#8A8A8A',
      strokeWidth: 1.5,
      ring: 11,
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