/**
 * §BATCH1a — THE DEFAULT LIVE TRANSPORT.
 *
 * The ONE place a proxy function performs a real network call. Injectable at the
 * seam (`ProxyLiveFetch`) so automated tests and the validator can spy on it —
 * which is how "simulation makes ZERO network calls" is PROVEN rather than
 * asserted.
 */
import type { ProxyLiveFetch } from './proxyRoutes.ts';

export const defaultLiveFetch: ProxyLiveFetch = async (url, init) => {
  const res = await fetch(url, {
    method: init.method,
    headers: init.headers,
    body: init.body,
  });
  return { ok: res.ok, status: res.status, text: () => res.text() };
};
