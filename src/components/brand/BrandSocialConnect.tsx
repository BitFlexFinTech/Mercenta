/**
 * §Phase E7 — BrandSocialConnect is now the compatibility adapter for the
 * canonical MERCENTA SOCIAL surface.
 *
 * Before E7 this component kept its OWN module-scope Map of "connections" that
 * never touched the social engine, and rendered a "Live" badge for a connection
 * that existed only inside that map — a capability claim the platform could not
 * honour, and exactly the kind of fabricated success E7 removes.
 *
 * The surface it now renders resolves the brand's Mercenta Social workspace
 * automatically (deterministic + idempotent), gates access on the canonical
 * Mercenta brand status, hosts the full application when the engine is
 * configured, and otherwise reports its real state as Simulation.
 *
 * The export name and file path are unchanged, so no other module changes and
 * no component is orphaned.
 */
import { MercentaSocial } from './MercentaSocial';

export function BrandSocialConnect() {
  return <MercentaSocial />;
}


