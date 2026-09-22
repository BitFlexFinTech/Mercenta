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
 */
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import type { PaletteDomain } from '@/config/themes';

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
  orders: '#5B6BF5',
  intelligence: '#22C7F0',
  finance: '#2FBF71',
  compliance: '#F2A93B',
  logistics: '#F97316',
  communications: '#F472A6',
  catalogue: '#A855F7',
  risk: '#EF4444',
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
    critical: '#E5533F',
    warning: '#F2A93B',
    info: '#6AA6FF',
    success: '#2FBF71',
    hairline: '#6B7280',
    accent: '#C9A15A',
    textMuted: '#8A93A0',
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
      critical: readVar(style, '--mr-state-critical', '#E5533F'),
      warning: readVar(style, '--mr-state-warning', '#F2A93B'),
      info: readVar(style, '--mr-state-info', '#6AA6FF'),
      success: readVar(style, '--mr-state-success', '#2FBF71'),
      hairline: readVar(style, '--mr-text-faint', '#6B7280'),
      accent: readVar(style, '--mr-accent', '#C9A15A'),
      textMuted: readVar(style, '--mr-text-muted', '#8A93A0'),
    });
    setPending(false);
  }, [theme]);

  return useMemo(() => ({ palette, ...meta, pending }), [palette, meta, pending]);
}