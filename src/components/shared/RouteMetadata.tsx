/**
 * §SEO FOUNDATION — the ONE component that writes the document's route metadata.
 *
 * Mounted once by `App.tsx`, so EVERY environment (public, login, brand, admin,
 * carrier) gets truthful metadata from the SAME code path. Before this, the only
 * metadata write in the whole application was `document.title = BRAND_NAME` in
 * `main.tsx` plus the static tags in `index.html` — which meant an authenticated
 * admin session, an unknown URL and the FAQ page all advertised the homepage's
 * title and canonical.
 *
 * It re-applies on:
 *   - a change of the canonical app environment (a sign-in/sign-out), and
 *   - a `popstate` (back/forward), and
 *   - an in-app navigation that pushed a public route (see `Home.tsx`).
 */
import { useEffect } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { applyRouteMetadata, buildRouteMetadata } from '@/lib/seo/routeMetadata';

export function RouteMetadata() {
  const { environment } = useApp();

  useEffect(() => {
    const apply = () => {
      applyRouteMetadata(
        buildRouteMetadata({ pathname: window.location.pathname, environment })
      );
    };
    apply();
    window.addEventListener('popstate', apply);
    return () => window.removeEventListener('popstate', apply);
  }, [environment]);

  return null;
}