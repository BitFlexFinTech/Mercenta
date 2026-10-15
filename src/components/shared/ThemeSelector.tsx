/**
 * §UI/UX Wave 1 — THEME SELECTOR.
 *
 * Accessible theme switcher (popover + swatch + label per theme). Themes are
 * PURE PRESENTATION — switching never affects data, permissions, routes or
 * business logic (verified by e2e/uiux-foundation.spec.ts).
 */
import { useRef, useState, useEffect } from 'react';
import { THEMES, THEME_ORDER } from '@/config/themes';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/utils/cn';
import { Palette, Check, ChevronDown } from 'lucide-react';

export function ThemeSelector({ compact = false }: { compact?: boolean } = {}) {
  const { theme, setTheme, shellMode } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const label = THEMES[theme].label;

  return (
    <div className="relative" ref={rootRef} data-testid="theme-selector">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="theme-menu"
        aria-haspopup="menu"
        data-state={open ? 'open' : 'closed'}
        title={`Theme: ${label}`}
        className="inline-flex h-9 items-center gap-1.5 rounded-ds-md px-2.5 text-ds-label hover:bg-tint transition-colors"
      >
        <Palette className="w-3.5 h-3.5" aria-hidden="true" />
        {!compact && <span className="font-medium hidden sm:inline">{label}</span>}
        <ChevronDown className="w-3 h-3 opacity-70" aria-hidden="true" />
      </button>

      {open && (
        <div
          id="theme-menu"
          role="menu"
          aria-label="Visual theme"
          /* §OPENSHIP BATCH 4 — the dropdown surface: TRANSLUCENT (`bg-ink-800/70`,
             the theme's own flyout token at 70%) with the reference's
             `backdrop-blur-xl` (spec §7.6). */
          className="absolute right-0 top-full mt-2 z-50 w-64 rounded-ds-lg bg-ink-800/70 backdrop-blur-xl border border-white/[0.08] shadow-ds-overlay animate-fade-in p-2"
        >
          <p className="px-3 py-1.5 text-ds-micro uppercase tracking-wider text-zinc-500">
            Visual theme · {shellMode === 'light' ? 'light' : 'dark'} mode
          </p>
          {THEME_ORDER.map((id) => {
            const t = THEMES[id];
            const active = id === theme;
            return (
              <button
                key={id}
                role="menuitemradio"
                aria-checked={active}
                data-theme-option={id}
                data-state={active ? 'active' : 'idle'}
                onClick={() => setTheme(id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs rounded-ds-sm transition-colors',
                  /* §OPENSHIP BATCH 4 — the row STATES come off the theme rather than
                     the legacy near-white `bg-white/[0.0x]` shims, which are invisible
                     on the now-translucent (lightest-case white) menu: the selected row
                     takes the theme's `--mr-surface-hover` step at 60%, and hover takes
                     the canonical foreground tint (`bg-tint`). */
                  active
                    ? 'bg-ink-700/60 text-white'
                    : 'text-zinc-400 hover:bg-tint hover:text-white'
                )}
              >
                <span
                  aria-hidden="true"
                  className="w-4 h-4 rounded-ds-sm border border-white/[0.2] shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${t.vars['--mr-bg']} 50%, ${t.vars['--mr-accent']} 50%)`,
                  }}
                />
                <span className="min-w-0 flex-1 truncate font-medium">{t.label}</span>
                {active && <Check className="w-3.5 h-3.5 text-brass-400" aria-hidden="true" />}
              </button>
            );
          })}
          <p className="px-3 pb-2 pt-1 text-ds-micro text-zinc-600 leading-snug">
            Presentation only — data, permissions and workflows never change.
          </p>
        </div>
      )}
    </div>
  );
}