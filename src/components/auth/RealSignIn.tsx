/**
 * §PHASE B (2026-10-13) — the REAL sign-in form.
 *
 * Rendered by `Login` ONLY when `authMode === 'real'` — i.e. a Supabase project
 * is configured AND the platform is in `live` mode (`isRealAuthAvailable`). In
 * `demo` this component is never mounted, so the investor sign-in path and its
 * browser specs are untouched.
 *
 * It reuses the platform's own primitives (`Button`, `Input`) rather than
 * introducing a second form language, and it never reveals whether an address
 * exists (one message for both failure cases).
 */
import { useState } from 'react';
import { Lock } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useApp } from '@/context/GlobalStateContext';

export function RealSignIn() {
  const { signInWithCredentials } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await signInWithCredentials(email, password);
    if (!result.ok) {
      setError(result.error ?? 'Sign-in failed.');
      setBusy(false);
    }
    /* On success the provider switches the environment and this screen unmounts,
       so `busy` is deliberately left set — the button must not flicker back to
       an enabled state while the portal is mounting. */
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 flex items-center gap-2 text-xs">
        <Lock className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
        <span className="font-medium uppercase tracking-wider text-muted">
          Secure sign-in
        </span>
      </div>

      <h1 className="font-display text-2xl font-semibold text-soft">
        Sign in to Mercenta
      </h1>
      <p className="mt-1 text-sm text-muted">
        Use the account Mercenta set up for you.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4" data-testid="real-sign-in">
        {/* §PHASE B — `ariaLabel` is deliberately NOT passed. `Input` already
            renders a `<label htmlFor>` for its visible `label`, and an
            `aria-label` OVERRIDES that label as the accessible name — so passing
            both would mean the visible text and the announced name are two
            separate strings that can drift apart, which is exactly what
            WCAG 2.5.3 (Label in Name) forbids. The visible label is the name. */}
        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          dataTestid="sign-in-email"
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          required
          dataTestid="sign-in-password"
        />

        {/* §PHASE B — the form-level error reuses the design system's own danger
            token (`state.danger` → `var(--mr-state-critical)`, declared in
            `tailwind.config.js`) rather than a bespoke colour, so it matches every
            other error in the product AND follows the palette when the theme
            changes. `role="alert"` announces it on appearance.
            NOTE: `Input` computes its own `aria-describedby` internally and does
            NOT forward one, so associating this block with the fields would be a
            silent no-op — deliberately not attempted rather than left as dead
            code that reads as if it worked. */}
        {error && (
          <p
            id="sign-in-error"
            role="alert"
            data-testid="sign-in-error"
            className="rounded-ds-md border border-state-danger/40 bg-state-danger/10 px-3 py-2 text-ds-label text-state-danger"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={busy || !email.trim() || !password}
          loading={busy}
          data-testid="sign-in-submit"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
