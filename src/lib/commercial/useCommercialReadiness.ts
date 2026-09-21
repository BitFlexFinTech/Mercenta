/**
 * §Phase 2 — React bindings for the canonical commercial readiness store.
 *
 * The store is external and deterministic; components subscribe to its version so
 * a reassessment anywhere (the founder Control Centre, the brand surface, a
 * brand action) re-renders every other view of the SAME record. Tenant scoping
 * happens INSIDE `readinessRecordsForScope`, so a brand hook can never return
 * another tenant's commercial data.
 */
import { useSyncExternalStore } from 'react';
import {
  commercialReadinessVersion,
  readinessRecordsForScope,
  subscribeCommercialReadiness,
  type CommercialReadinessScope,
} from '@/data/commercialReadinessStore';
import type { CommercialReadinessRecord } from '@/types';

export function useCommercialReadiness(
  scope: CommercialReadinessScope
): CommercialReadinessRecord[] {
  const version = useSyncExternalStore(
    subscribeCommercialReadiness,
    commercialReadinessVersion,
    commercialReadinessVersion
  );
  // `version` participates so the result is recomputed on every mutation.
  void version;
  return readinessRecordsForScope(scope);
}

/** The mutation stamp — for a surface that derives its OWN model from the store. */
export function useCommercialReadinessVersion(): number {
  return useSyncExternalStore(
    subscribeCommercialReadiness,
    commercialReadinessVersion,
    commercialReadinessVersion
  );
}