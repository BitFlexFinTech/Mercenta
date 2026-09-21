/**
 * §CANONICAL CHANGE SIGNAL — THE ONE "THE DOMAIN CHANGED" NOTIFICATION.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * Every projection in this platform (Mercenta Brain, the Logistics operational
 * map, dashboards, work layer, attention lists) is derived from the SAME
 * canonical stores. A projection is only genuinely DYNAMIC when a change to a
 * canonical object is observable without a page reload — i.e. when the mutation
 * tells the projections that something changed.
 *
 * Before this module the platform had a change signal, but it lived inside
 * `prospectStore` (a Brand-Intelligence-specific module), was fired by only a
 * handful of mutation paths, and was consumed by only a few BI/ICP panels. The
 * measured consequence: **17 modules / 39 mutation sites** changed canonical
 * state silently, and neither the Brain nor the logistics queries subscribed at
 * all — so both surfaces showed a snapshot taken at mount even though their
 * rendering was a pure projection of canonical data.
 *
 * THE CONTRACT
 * ------------
 *   - ONE monotonic version counter, process-wide.
 *   - ONE notification list, `subscribeCanonicalStore(listener)`.
 *   - ONE notifier, `notifyCanonicalStoreChange()`, called by every mutation
 *     path AFTER it has applied its change.
 *
 * WHAT IT IS NOT
 * --------------
 *   - It carries NO payload and NO business state. It is a "re-read the
 *     canonical stores you already read" signal, exactly like a version bump.
 *     Nothing may treat it as an event log (the canonical event feed,
 *     `src/lib/events/eventFeed.ts`, is the event log).
 *   - It never decides anything. A subscriber that finds no change re-renders
 *     identically, which is why the signal is safe to fire generously.
 *   - It is NOT a persistence mechanism: with no durable backend the stores stay
 *     memory-only and this signal does not change that (see
 *     `src/data/domainRepository.ts` for the persistence port).
 *
 * `src/data/prospectStore.ts` re-exports all three functions from HERE, so every
 * existing import path keeps working while there is exactly ONE implementation.
 */

let canonicalTick = 0;
const canonicalListeners = new Set<() => void>();

/** The current version. Monotonic; never reset at runtime (tests use resetCanonicalStore). */
export function getCanonicalStoreVersion(): number {
  return canonicalTick;
}

/** Subscribe to canonical changes. Returns the unsubscribe function. */
export function subscribeCanonicalStore(listener: () => void): () => void {
  canonicalListeners.add(listener);
  return () => {
    canonicalListeners.delete(listener);
  };
}

/**
 * Announce that canonical domain state changed. Called by EVERY mutation path
 * immediately after the change is applied (never before — a subscriber that
 * re-reads must see the new state).
 */
export function notifyCanonicalStoreChange(): void {
  canonicalTick += 1;
  for (const listener of canonicalListeners) listener();
}

/** Test/validator helper — reboots the counter. Never called by product code. */
export function resetCanonicalStoreVersion(): void {
  canonicalTick = 0;
  canonicalListeners.clear();
}
