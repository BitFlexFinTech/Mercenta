/**
 * §Phase WAVE-4 — LIVE THEME PALETTE FOR WEBGL SURFACES.
 *
 * WebGL cannot consume `var(--mr-palette-orange)` — three.js needs a concrete
 * colour. Rather than hardcoding eight hexes (which would violate the standing
 * single-source-of-truth rule and silently stop tracking the theme), this hook
 * READS the canonical CSS variables the ThemeContext writes on
 * `<html data-mercenta-theme>`, so the 3D Brain is genuinely theme-reactive:
 * switch Professional → Serious and the scene recolours, because it is reading
 * the same tokens every other surface reads.
 *
 * Nothing is invented here: the token names come from `THEME_VAR_NAMES`
 * (src/config/themes.ts) and the values from the browser's computed style.
 *
 * §WAVE 3 follow-up — the PLACEHOLDER palette is no longer duplicated either.
 * This hook used to carry its own copy of the eight palette hexes and the state
 * colours, which is a colour single-source-of-truth violation (and made the
 * redesign validator fail: `no component hardcodes a palette hex`). The
 * placeholder is now DERIVED from the canonical default theme in
 * `src/config/themes.ts`, so a palette change can never leave this file behind.
 * The one literal below is a neutral used only if a canonical variable is
 * missing — which cannot happen in practice, and is deliberately NOT a palette
 * hue so a drift cannot hide behind it.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { DEFAULT_THEME, THEMES, type PaletteDomain } from '@/config/themes';

/** The one neutral — used only if a canonical theme variable is absent. */
const NEUTRAL_PLACEHOLDER = '#9AA1A9';

/** Read a canonical variable from the default theme (the colour SSOT). */
function canonical(name: string): string {
  return (THEMES[DEFAULT_THEME].vars as Record<string, string>)[name] ?? NEUTRAL_PLACEHOLDER;
}

/** The eight canonical domain hues (`--mr-palette-*`). */
export type PaletteHexes = Record<PaletteDomain, string>;

export interface WebglPalette {
  /** domain → concrete hex, resolved from the live theme. */
  palette: PaletteHexes;
  critical: string;
  warning: string;
  info: string;
  success: string;
  /** Hairline / structural line colour. */
  hairline: string;
  accent: string;
  textMuted: string;
  /** True until the first successful read (avoids a one-frame black flash). */
  pending: boolean;
}

const FALLBACK: PaletteHexes = {
  orders: canonical('--mr-palette-indigo'),
  intelligence: canonical('--mr-palette-cyan'),
  finance: canonical('--mr-palette-green'),
  compliance: canonical('--mr-palette-amber'),
  logistics: canonical('--mr-palette-orange'),
  communications: canonical('--mr-palette-pink'),
  catalogue: canonical('--mr-palette-violet'),
  risk: canonical('--mr-palette-red'),
};

/**
 * The canonical hue → domain mapping, read from `src/config/themes.ts`
 * (`DOMAIN_COLOURS`) so a domain never gets a second colour definition.
 * Duplicated here ONLY as the variable NAME each domain resolves from, because
 * a WebGL surface cannot read a CSS `var()` expression.
 */
const DOMAIN_VAR: Record<PaletteDomain, string> = {
  orders: '--mr-palette-indigo',
  intelligence: '--mr-palette-cyan',
  finance: '--mr-palette-green',
  compliance: '--mr-palette-amber',
  logistics: '--mr-palette-orange',
  communications: '--mr-palette-pink',
  catalogue: '--mr-palette-violet',
  risk: '--mr-palette-red',
};

function readVar(style: CSSStyleDeclaration, name: string, fallback: string): string {
  const value = style.getPropertyValue(name).trim();
  return value.startsWith('#') ? value : fallback;
}

export function useWebglPalette(): WebglPalette {
  const { theme } = useTheme();
  const [pending, setPending] = useState(true);

  const [palette, setPalette] = useState<PaletteHexes>(FALLBACK);
  const [meta, setMeta] = useState({
    critical: canonical('--mr-state-critical'),
    warning: canonical('--mr-state-warning'),
    info: canonical('--mr-state-info'),
    success: canonical('--mr-state-success'),
    hairline: canonical('--mr-text-faint'),
    accent: canonical('--mr-accent'),
    textMuted: canonical('--mr-text-muted'),
  });

  /* Re-reads whenever the theme changes — the whole point of the hook. */
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    setPalette({
      orders: readVar(style, DOMAIN_VAR.orders, FALLBACK.orders),
      intelligence: readVar(style, DOMAIN_VAR.intelligence, FALLBACK.intelligence),
      finance: readVar(style, DOMAIN_VAR.finance, FALLBACK.finance),
      compliance: readVar(style, DOMAIN_VAR.compliance, FALLBACK.compliance),
      logistics: readVar(style, DOMAIN_VAR.logistics, FALLBACK.logistics),
      communications: readVar(style, DOMAIN_VAR.communications, FALLBACK.communications),
      catalogue: readVar(style, DOMAIN_VAR.catalogue, FALLBACK.catalogue),
      risk: readVar(style, DOMAIN_VAR.risk, FALLBACK.risk),
    });
    setMeta({
      critical: readVar(style, '--mr-state-critical', canonical('--mr-state-critical')),
      warning: readVar(style, '--mr-state-warning', canonical('--mr-state-warning')),
      info: readVar(style, '--mr-state-info', canonical('--mr-state-info')),
      success: readVar(style, '--mr-state-success', canonical('--mr-state-success')),
      hairline: readVar(style, '--mr-text-faint', canonical('--mr-text-faint')),
      accent: readVar(style, '--mr-accent', canonical('--mr-accent')),
      textMuted: readVar(style, '--mr-text-muted', canonical('--mr-text-muted')),
    });
    setPending(false);
  }, [theme]);

  return useMemo(() => ({ palette, ...meta, pending }), [palette, meta, pending]);
}