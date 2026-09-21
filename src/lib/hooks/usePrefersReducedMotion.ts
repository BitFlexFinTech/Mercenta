/**
 * §MOTION — the SINGLE implementation of the reduced-motion preference.
 *
 * Extracted from the Mercenta Brain canvas (where it was module-private) so the
 * Brain canvas and the Logistics operational map cannot drift into two
 * different answers to "does this user want motion?". Behaviour is identical to
 * the original: initial `false`, sync on mount, live update on change, and a
 * safe no-op where `matchMedia` is unavailable.
 */
import { useEffect, useState } from 'react';

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const handler = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener?.('change', handler);
    return () => query.removeEventListener?.('change', handler);
  }, []);
  return reduced;
}