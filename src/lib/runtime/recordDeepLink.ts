/**
 * §BATCH 7 (Part 4.1a) — THE RECORD DEEP-LINK READER (single source of truth).
 *
 * WHAT THIS MODULE IS
 * -------------------
 * `src/lib/runtime/productRoutes.ts` declares what a record deep link MEANS (the
 * `RECORD_LINK_PARAMS` registry + `recordLinkQuery`). This module is the ONE
 * reader: every surface that OWNS a record consumes its link through
 * `useRecordDeepLink`, so no surface keeps its own copy of the read logic.
 *
 * WHY IT REACTS TO NAVIGATION, NOT JUST TO MOUNT
 * ----------------------------------------------
 * The pre-existing readers (the purchase-order lists and the Logistics Hub)
 * captured the parameter ONCE at mount (`useMemo(() => currentQueryParam('po'), [])`).
 * That is a real defect, fixed here: a deep link into the view you are ALREADY
 * on does not remount the panel, so the captured value stayed stale and the
 * record never opened — the click silently did nothing. The shells dispatch
 * `popstate` on every product navigation, so this hook re-reads the address on
 * that event and returns each record id ONCE, when it is first seen. Closing a
 * record therefore does not re-open it, while a genuine navigation always does.
 *
 * FAIL-CLOSED
 * -----------
 * An absent (or empty) parameter returns `null` — never a guessed id. The caller
 * decides what an unknown record means (normally: leave the surface as it is).
 */
import { useEffect, useRef, useState } from 'react';
import { currentQueryParam, RECORD_LINK_PARAMS, type RecordLinkKind } from './productRoutes';

/**
 * The record id the CURRENT address names for this kind, returned ONCE per
 * distinct value — including when the address changes without a remount.
 */
export function useRecordDeepLink(kind: RecordLinkKind): string | null {
  const key = RECORD_LINK_PARAMS[kind];
  const applied = useRef<string | null>(null);
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const read = () => {
      const next = currentQueryParam(key);
      if (!next || applied.current === next) return;
      applied.current = next;
      setId(next);
    };
    /** The mount read (a full page load carrying the link). */
    read();
    /** Every subsequent product navigation (the shells dispatch this). */
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, [key]);

  return id;
}

/**
 * Focus the record's own element in a surface that has NO detail view of its own
 * (a ledger row, a tile, a card). The caller supplies the selector that finds the
 * record — e.g. `[data-testid="catalog-asin-${sku}"]` — and this marks it with
 * `data-record-focused="true"` and scrolls it into view, ONCE per element.
 *
 * A selector that matches nothing is a no-op: the record may be filtered out of
 * the current view, which is honest — the surface never invents a record.
 */
export function useFocusRecordElement(selector: string | null): void {
  const applied = useRef<string | null>(null);
  useEffect(() => {
    if (!selector || applied.current === selector) return;
    const el = document.querySelector(selector);
    if (!el) return;
    applied.current = selector;
    el.setAttribute('data-record-focused', 'true');
    el.scrollIntoView({ block: 'center' });
  }, [selector]);
}
