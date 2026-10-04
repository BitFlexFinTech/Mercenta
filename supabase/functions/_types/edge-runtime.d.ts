/**
 * §OPTION-A (2026-10-04) — AMBIENT RUNTIME TYPES FOR THE SUPABASE EDGE FUNCTIONS.
 *
 * The functions in this folder run on Deno in Supabase's edge runtime, NOT on the
 * Vite/Node build this project ships, and Deno is not installed here. `tsc`
 * therefore cannot resolve their runtime surface on its own. Until this file
 * existed the editor invented ~98 problems in this folder and `npm run typecheck`
 * NEVER checked it at all.
 *
 * WHAT IS DECLARED HERE — AND WHY THAT IS HONEST
 * ----------------------------------------------
 *  - `Deno` — ONLY the surface these functions actually use, measured from the
 *    source: `Deno.env.get(key)` and `Deno.serve(handler)`. Declaring the exact
 *    members used means a real misuse (a typo, a missing `await`, a wrong
 *    argument) still fails the check; a blanket `any` would hide it.
 *  - the TWO `deno.land/std` modules the functions import by URL. Deno fetches
 *    these at run time; they are not on disk, so they are declared as opaque
 *    modules. (The `@supabase/supabase-js` remote import is NOT declared here —
 *    it is mapped to the REAL installed package in `tsconfig.functions.json`, so
 *    the Supabase client calls are genuinely type-checked.)
 */

/** The Supabase edge runtime's `Deno` global — only the members this code uses. */
declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
  function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): unknown;
}

/* Remote Deno standard-library modules loaded by URL at run time — opaque by necessity:
   they are not present locally, so calls INTO them cannot be checked. Everything
   around them is. */
declare module 'https://deno.land/std@0.177.0/http/server.ts';
declare module 'https://deno.land/std@0.177.0/crypto/mod.ts';
