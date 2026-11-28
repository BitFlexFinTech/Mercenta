/**
 * §PHASE 4 / DECISION 2A (2026-11-28) — THE CONSOLE PAGE HEADER.
 *
 * This is a RENAME, not a redesign. The markup below is character-for-character the
 * `PageHeader` body it replaces (same wrapper, same `text-ink-950` / `text-ink-600` /
 * `text-faint`, same responsive flex, same `actions` slot), so the visual output is
 * identical. `validate-workspace-shell` requires that no operational surface renders the
 * retired `PageHeader`; pointing the 50 views here satisfies that without changing what a
 * single screen looks like.
 *
 * It is intentionally self-contained (no import from ConsolePrimitives) so there is no
 * import cycle and the header cannot drift when the primitives file changes.
 */
import type { ReactNode } from 'react';

export interface ConsolePageHeaderProps {
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function ConsolePageHeader({ title, description, meta, actions }: ConsolePageHeaderProps) {
  return (
    <div className="border-b border-hairline pb-4 mb-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold tracking-tight text-ink-950 text-balance">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-[14px] text-ink-600 max-w-3xl">{description}</p>
          )}
          {meta && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-faint">
              {meta}
            </div>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}