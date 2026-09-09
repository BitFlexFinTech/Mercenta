/**
 * HomeShell — lazy-loaded homepage + login environment.
 * Keeps ~50 component imports out of the critical path.
 *
 * §Phase 7E — the public Home now renders the LIVE copy fetched through the
 * React Query hook (`useHomepageContent`) instead of the static default, so a
 * demo-mode publish propagates to the mounted public page in-place.
 */
import { useApp } from '@/context/GlobalStateContext';
import { useHomepageContent } from '@/data/queries';
import { DEFAULT_HOMEPAGE_CONTENT } from '@/config/homepageContent';
import { Home } from '@/components/marketing/Home';
import { Login } from '@/components/auth/Login';

export default function HomeShell() {
  const { environment } = useApp();
  const homeQuery = useHomepageContent();
  if (environment === 'home') {
    const live = homeQuery.data?.live ?? DEFAULT_HOMEPAGE_CONTENT;
    return <Home content={live} />;
  }
  if (environment === 'login') return <Login />;
  return null;
}