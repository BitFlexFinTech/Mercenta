# OPENPOST / SOCIAL PUBLISHING EVALUATION


> **§BATCH 5 (2026-10-10) — HISTORICAL: MERCENTA SOCIAL WAS REMOVED.** This dated record names the Mercenta
> Social feature (the Postiz engine and its admin control centre, the brand surface, the `social-session` Edge
> Function, `scripts/social-sso/`, and the `e2e/embedded-social.spec.ts` /
> `scripts/validate-e7-embedded-social.mjs` guards). All of it was DELETED on the owner's instruction, and
> `scripts/validate-retired-platforms.mjs` §2c now asserts its ABSENCE. The record is preserved as history;
> any Social-specific statement in it no longer describes the current product.

> Repository inspection performed 2026-09-21 (redesign workstream, session 3).
> **Postiz was NOT deployed. No social account was activated. No paid service was
> subscribed to.** This is an evaluation only.

## Current state in the repository

| Piece | File | What it actually does |
|---|---|---|
| Postiz admin surface | `src/components/admin/PostizAdminPanel.tsx` | An admin panel that exists in the tree |
| WhatsApp admin surface | `src/components/admin/WhatsAppAdminPanel.tsx` | Twilio WhatsApp surface |
| Embedded social | `src/components/brand/MercentaSocial.tsx`, `BrandSocialConnect.tsx` | Brand-facing social surface |
| Validator | `scripts/validate-e7-embedded-social.mjs` | Gates the embedded-social seams |
| Runtime AI policy | `src/lib/costs/modelPolicy.ts` | Free-model-only ladder, refusal rather than paid upgrade |

Mercenta already owns the parts the brief says must stay Mercenta's: content
strategy, knowledge, generation, platform variants, approval, the social
calendar, business context and analytics. **Publishing infrastructure is the only
replaceable piece**, which is exactly the intended boundary.

## OpenPost assessment

- **Not currently in the repository.** No OpenPost code, dependency, config or
  reference exists (`grep -i openpost` over `src/` and `docs/` returns nothing).
- **Not evaluated against its source**, because the brief's own instruction is
  that this evaluation must not block the redesign and must not activate
  production social accounts. Evaluating a project's licence and API surface
  properly requires fetching its repository, which was not done in this session —
  so **no licence claim is made here**. Stating a licence I did not read would be
  worse than stating that it is unverified.

### What a swap would require (the seam that already exists)

`PostizAdminPanel` is a **surface over a publishing adapter**, not the adapter
itself. Replacing Postiz with OpenPost therefore means implementing the same
adapter contract — provider identity, credential state, mode
(`simulation` / `configured` / `live` / `degraded` / `error`), and a publish
call — behind the existing seam. Per the mock-first policy, that adapter ships as
a `Mock*Client` first and becomes live only when real credentials are entered.

### Caveats that must be checked BEFORE any adoption (not yet checked)

1. **Licence compatibility** — unverified. A copyleft or non-commercial licence
   would change the integration approach entirely.
2. **API/credential model** — unverified.
3. **Platform coverage** — unverified against Mercenta's target platforms.
4. **Operational cost and hosting** — unverified.

## Conclusion

| Item | Status |
|---|---|
| Postiz deployed | **NO** (unchanged, by instruction) |
| OpenPost deployed / added | **NO** |
| OpenPost licence verified | **NO — deliberately not claimed** |
| Mercenta owns strategy / knowledge / generation / approval / calendar / analytics | **YES** (unchanged) |
| Publishing infrastructure replaceable behind one seam | **YES** (adapter + provider-mode contract) |
| Production social accounts activated | **NO** |

This evaluation does not block the UI/UX redesign, and nothing here changes
runtime behaviour.
