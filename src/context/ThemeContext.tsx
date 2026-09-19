/**
 * §UI/UX Wave 1 — THEME CONTEXT.
 *
 * Applies the canonical theme (src/config/themes.ts) to the document root:
 *  - sets <html data-mercenta-theme="…">
 *  - writes every theme CSS variable on the root element
 *  - persists the user's choice (localStorage) — presentation ONLY.
 *
 * Themes never change business logic, data, permissions, routes, tenant
 * isolation or API behaviour — they alter visual expression only.
 */
import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import {
  DEFAULT_THEME,
  THEMES,
  isDarkTheme,
  isThemeId,
  type ThemeId,
} from '@/config/themes';

const STORAGE_KEY = 'mercenta.theme';

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  /** light | dark — drives `data-shell-theme` so the remap layer activates. */
  shellMode: 'light' | 'dark';
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): ThemeId {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && isThemeId(raw)) return raw;
  } catch {
    /* storage may be unavailable (private mode) — fall back to default. */
  }
  return DEFAULT_THEME;
}

function applyTheme(id: ThemeId) {
  const root = document.documentElement;
  root.dataset.mercentaTheme = id;
  const vars = THEMES[id].vars;
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readStoredTheme);

  // useLayoutEffect → the theme is applied before the first paint, so a
  // returning visitor's saved theme never flashes the light default.
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (id: ThemeId) => {
    setThemeState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* non-fatal */
    }
  };

  const isDark = isDarkTheme(theme);
  const value: ThemeContextValue = {
    theme,
    setTheme,
    shellMode: isDark ? 'dark' : 'light',
    isDark,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/** Re-exported so consumers never import themes.ts for the active theme. */
export { THEMES, DEFAULT_THEME } from '@/config/themes';
export type { ThemeId } from '@/config/themes';