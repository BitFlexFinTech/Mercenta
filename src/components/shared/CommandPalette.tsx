/**
 * §UI/UX Wave 2 — COMMAND PALETTE (FIND).
 *
 * Real, functional findability over EXISTING data — never a fake search box:
 *  - navigation destinations for the active RBAC session (supplied by the shell
 *    from the SAME `NavSection[]` array it renders, so the palette can never
 *    offer a destination the user's role does not have);
 *  - real records supplied by the calling shell, already tenant-scoped there
 *    (admin: full portfolio by design; brand: narrowed via assertBrandScope).
 *
 * Keyboard: ⌘K / Ctrl-K opens, Escape closes, ↑/↓ move, Enter selects.
 * Accessibility: labelled dialog, roving `aria-activedescendant`, focus moved
 * into the input on open and returned to the invoking element on close.
 * It performs NO fetching of its own — it only filters what it is handed.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { CornerDownLeft, Search } from 'lucide-react';

export interface CommandItem {
  id: string;
  label: string;
  /** Secondary line — a reference, status or brand. */
  meta?: string;
  /** Optional leading icon. */
  icon?: ReactNode;
  /** Destination for this item. */
  onSelect: () => void;
}

export interface CommandGroup {
  label: string;
  items: CommandItem[];
}

export function CommandPalette({
  open,
  onClose,
  groups,
  placeholder = 'Search records, destinations…',
  testId = 'command-palette',
}: {
  open: boolean;
  onClose: () => void;
  groups: CommandGroup[];
  placeholder?: string;
  testId?: string;
}) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Flat, ordered view of the currently visible results (for keyboard nav). */
  const flat = useMemo(() => {
    const n = query.trim().toLowerCase();
    return groups
      .map((g) => ({
        label: g.label,
        items: n
          ? g.items.filter(
              (i) =>
                i.label.toLowerCase().includes(n) || (i.meta ?? '').toLowerCase().includes(n)
            )
          : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  const totalItems = flat.reduce((a, g) => a + g.items.length, 0);
  const orderedItems = useMemo(() => flat.flatMap((g) => g.items), [flat]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (open) setActiveIndex(0);
  }, [open, query]);

  if (!open) return null;

  const select = (item: CommandItem) => {
    item.onSelect();
    onClose();
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, totalItems - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      const item = orderedItems[activeIndex];
      if (item) select(item);
    }
  };

  let cursor = -1;


  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0"
        style={{ backgroundColor: 'var(--mr-overlay-tint)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search and navigate"
        data-testid={testId}
        className="animate-rise relative w-full max-w-xl overflow-hidden rounded-ds-lg border border-hairline-strong bg-ink-900 shadow-ds-overlay"
      >
        <div className="flex items-center gap-2.5 border-b border-hairline px-3.5 py-2.5">
          <Search className="h-4 w-4 flex-shrink-0 text-zinc-500" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={placeholder}
            aria-label="Search records and destinations"
            aria-controls={`${testId}-results`}
            aria-activedescendant={
              orderedItems[activeIndex]
                ? `${testId}-item-${orderedItems[activeIndex].id}`
                : undefined
            }
            className="w-full bg-transparent text-sm text-strong placeholder-zinc-600 outline-none"
            data-testid={`${testId}-input`}
          />
          <kbd className="hidden flex-shrink-0 rounded-ds-sm border border-hairline-strong px-1.5 py-0.5 font-mono text-ds-micro text-zinc-500 sm:block">
            ESC
          </kbd>
        </div>

        <div id={`${testId}-results`} className="max-h-[52vh] overflow-y-auto py-1.5">
          {flat.length === 0 ? (
            <p className="px-3.5 py-4 text-xs text-zinc-500" data-testid={`${testId}-empty`}>
              No match for “{query}”. Try a reference, brand or destination.
            </p>
          ) : (
            flat.map((g) => (
              <div key={g.label} className="mb-1">
                <p className="px-3.5 py-1 text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-600">
                  {g.label}
                </p>
                <ul>
                  {g.items.map((item) => {
                    cursor += 1;
                    const isActive = cursor === activeIndex;
                    return (
                      <li key={`${g.label}-${item.id}`}>
                        <button
                          type="button"
                          id={`${testId}-item-${item.id}`}
                          data-testid={`${testId}-item-${item.id}`}
                          onMouseEnter={() => setActiveIndex(cursor)}
                          onClick={() => select(item)}
                          className={cn(
                            'flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left transition-ds duration-ds-fast',
                            isActive ? 'bg-tint' : 'hover:bg-tint'
                          )}
                        >
                          {item.icon && (
                            <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center text-zinc-500">
                              {item.icon}
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs text-strong">{item.label}</span>
                            {item.meta && (
                              <span className="block truncate text-ds-micro text-zinc-500">
                                {item.meta}
                              </span>
                            )}
                          </span>
                          {isActive && (
                            <CornerDownLeft
                              className="h-3 w-3 flex-shrink-0 text-zinc-500"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-hairline px-3.5 py-1.5">
          <span className="font-mono text-ds-micro text-zinc-600">↑↓ navigate · ⏎ open</span>
          <span className="font-mono text-ds-micro text-zinc-600" data-testid={`${testId}-count`}>
            {totalItems} result{totalItems === 1 ? '' : 's'}
          </span>
        </div>
      </div>
    </div>
  );
}
