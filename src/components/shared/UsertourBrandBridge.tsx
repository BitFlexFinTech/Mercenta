/**
 * §Batch B — Usertour brand bridge component.
 *
 * Renders nothing visible — just calls the useUsertour() hook so the
 * Usertour SDK is loaded and identify() is called for the brand session.
 * Placed inside the brand portal's ErrorBoundary.
 */
import { useUsertour } from '@/lib/usertour/useUsertour';

export function UsertourBrandBridge() {
  useUsertour();
  return null;
}
