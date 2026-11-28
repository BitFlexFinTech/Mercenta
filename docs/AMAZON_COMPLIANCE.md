# AMAZON SP-API — COMPLIANCE AND DATA PROTECTION PACK

**Mercenta Partners · prepared 2026-11-28 · version 1.0**

This document is the pack Mercenta submits when Amazon reviews its use of the Selling
Partner API. It describes what the platform **actually does in code today**, names the
file that implements each control, and states plainly what is **not yet true**.

> ## STATUS OF THIS DOCUMENT — READ FIRST
>
> **Every clause below is sourced from training knowledge of Amazon's Data Protection
> Policy (DPP) and Acceptable Use Policy (AUP), not from a fetched copy.** The Amazon
> developer-docs slugs returned 404 from this environment, DuckDuckGo challenged the
> request, and Seller Central's policy pages sit behind a login — so no clause here is
> presented as a quotation of a fetched document.
>
> - **[TRAINING KNOWLEDGE]** — a requirement I am confident the DPP/AUP contains.
> - **[UNVERIFIED — confirm against G8888]** — a requirement I believe applies but whose
>   exact wording, threshold or window I cannot confirm without the policy text.
>
> **Before this pack is submitted, a human must open Amazon's policy pages (Seller
> Central → Developer Console → G8888 policy documents) and confirm every
> `[UNVERIFIED]` clause.** Nothing in this document should be read as a claim that
> Amazon has reviewed, approved or endorsed Mercenta.

---

## 1. THE RULEBOOK, CLAUSE BY CLAUSE

### 1.1 Data Protection Policy (DPP)

| # | Requirement | Tag | Where Mercenta satisfies it |
|---|---|---|---|
| DP-1 | Protect data in transit with current TLS | [TRAINING KNOWLEDGE] | All provider calls originate server-side over HTTPS; no provider call is made from a browser (`validate-no-browser-secrets`). |
| DP-2 | Protect data at rest | [TRAINING KNOWLEDGE] | Data resides in Supabase (Postgres) with encryption at rest, per §7. |
| DP-3 | Collect and use only the data the integration needs | [TRAINING KNOWLEDGE] | The proxy forwards only the fields the client already builds; no bulk export endpoint exists. |
| DP-4 | Keep personal data no longer than necessary | [TRAINING KNOWLEDGE] | Access log purged after `RETENTION_DAYS` (§5); no indefinite store of channel payloads. |
| DP-5 | Log access to protected data | [TRAINING KNOWLEDGE] | `spapi_access_audit` — one row per live ASIN access, `029`/`030`. |
| DP-6 | Restrict access to authorised personnel on a need-to-know basis | [TRAINING KNOWLEDGE] | RBAC (§3) — live calls require `super_admin`/`admin_staff`. |
| DP-7 | Isolate one data controller's data from another's | [TRAINING KNOWLEDGE] | ASIN tenant scope (§4) — a brand's ASINs are refused for any other brand. |
| DP-8 | Disclose sub-processors that handle the data | [TRAINING KNOWLEDGE] | §6. |
| DP-9 | Do not use Amazon data for any purpose beyond operating the integration | [TRAINING KNOWLEDGE] | No analytics, profiling or resale of channel data; the platform has no such feature. |
| DP-10 | Notify Amazon of a security incident without undue delay | [UNVERIFIED — confirm against G8888] | No incident runbook or SLA is recorded in this repository; **this is a real gap** (§9). |
| DP-11 | Support data-subject requests (access, correction, deletion) | [UNVERIFIED — confirm against G8888] | Not implemented as a workflow; deletions exist only for the audit log. **Real gap.** |
| DP-12 | Delete or return data on termination of the relationship | [UNVERIFIED — confirm against G8888] | Not implemented. **Real gap.** |
| DP-13 | Named security contact and annual attestation | [UNVERIFIED — confirm against G8888] | Not recorded here. **Real gap** (a business input, not code). |

### 1.2 Acceptable Use Policy (AUP)

| # | Requirement | Tag | Where Mercenta satisfies it |
|---|---|---|---|
| AU-1 | Call only the APIs the application is authorised for | [TRAINING KNOWLEDGE] | The route manifest (`proxyRoutes.ts`, 21 routes) is the only way a call is made; unknown routes are refused. |
| AU-2 | Do not scrape, crawl or bulk-harvest Amazon data | [TRAINING KNOWLEDGE] | No scraper exists; the only Amazon data path is the signed SP-API proxy. |
| AU-3 | Do not reverse-engineer or circumvent rate limits | [TRAINING KNOWLEDGE] | `_shared/rateLimit.ts` is applied in the handler; no retry-storm logic exists. |
| AU-4 | Do not misrepresent your identity or application to Amazon | [TRAINING KNOWLEDGE] | One application identity; no spoofed headers are constructed anywhere. |
| AU-5 | Keep credentials secret and never expose them to a client | [TRAINING KNOWLEDGE] | Credentials resolve server-side only (`vault:` refs); no `VITE_*` provider key is read (`validate-no-browser-secrets`). |
| AU-6 | Use data only for the application's declared purpose | [TRAINING KNOWLEDGE] | Declared purpose: operating Mercenta's distribution relationship on behalf of brands (§2). |
| AU-7 | Do not resell or redistribute Amazon data | [TRAINING KNOWLEDGE] | Brands see only their OWN data (§4); there is no cross-brand view of channel data. |
| AU-8 | Do not use SP-API for competitive intelligence on Amazon | [TRAINING KNOWLEDGE] | No competitor or marketplace-comparison feature consumes SP-API data. |
| AU-9 | Comply with the DPP for any personal data received | [TRAINING KNOWLEDGE] | §1.1 and §8. |
| AU-10 | Report suspected credential compromise promptly | [UNVERIFIED — confirm against G8888] | No formal procedure recorded. **Real gap.** |

### 1.3 What this rulebook deliberately does NOT claim

- It does not claim Amazon has granted Mercenta any programme, category or vendor
  approval. Programme status is `not_confirmed_with_amazon`
  (`src/lib/intelligence/amazonWording.ts`), enforced by `validate:wording`.
- It does not claim a live SP-API integration is running. Every live SP-API route is
  currently declared `unsupported` with a stated reason in `proxyRoutes.ts`; nothing
  leaves this machine except a simulated response.
- It does not claim the `[UNVERIFIED]` items are satisfied. They are listed as gaps in §9.

---

## 2. DATA FLOW

```
Operator session (staff, MFA)                       Brand portal session
        │                                                     │
        │  calls the Edge Function with a JWT                 │  reads its OWN records only
        ▼                                                     ▼
supabase/functions/spapi/index.ts ── rate limit ── operator check ── ASIN scope ──┐
        │                                                                        │
        │  resolves credentials SERVER-SIDE (function env or Supabase Vault)      │
        ▼                                                                        │
Amazon Selling Partner API  (TLS, signed request)                                │
        │                                                                        │
        ▼                                                                        │
response → spapi_access_audit row (actor, brand, ASIN, route, time, result) ─────┘
        │
        ▼
brand view (its own rows only, via RLS)
```

1. **A person starts in a session.** Staff sessions carry `app_metadata.role` and, where
   relevant, `tenant_id`; a brand session carries its own `tenant_id`.
2. **The browser never holds a provider credential.** It calls an Edge Function with its
   session token; credentials are resolved inside the function from its environment or
   from Vault — never sent to, stored in, or bundled with the client.
3. **The proxy authorises, then scopes.** Live mode requires an operator role, passes the
   rate limiter, then — for every ASIN anywhere in the payload or query — checks
   `brand_asin_scope`. An ASIN that is not the session brand's is refused 403.
4. **Amazon is called from the server only**, over TLS, with the server-held credential.
5. **The access is logged** whether it succeeded, failed or was refused.
6. **The brand sees only its own data**, enforced by row-level security on every table
   carrying a `brand_id` (`validate-rls-hardening`).

**What the platform does NOT do:** it does not store channel response bodies wholesale, it
does not send channel data to a third-party analytics service, and it makes **no provider
call at all** in simulation mode — structural in `resolveProxyMode`/`handleProxyRequest`.

---

## 3. RBAC CONTROLS

| Capability | Who | Enforcement |
|---|---|---|
| Trigger a live SP-API call | `super_admin`, `admin_staff` | `operatorFromAuthorization` — a brand session is refused 403 |
| Read another brand's data | nobody | RLS: `brand_id = (auth.jwt() ->> 'tenant_id')::uuid` |
| Add/remove a brand's ASIN scope | `super_admin`, `admin_staff` | `029` policies on `brand_asin_scope` |
| Read the access log | staff (all), a brand (own rows) | `029` policies on `spapi_access_audit` |
| Purge the access log | the scheduled job only | `030` — `SECURITY DEFINER`, `EXECUTE` revoked from `anon`/`authenticated` |
| Read a provider credential | the Edge Function, server-side | Vault reference; never sent to the browser (`validate-no-browser-secrets`) |

Roles are read from the JWT, never from a client-supplied field or a UI toggle. A brand
cannot reach an operator surface: both the surface and the RLS policy check the role —
two independent checks, not one.

---

## 4. ASIN TENANT ISOLATION MECHANISM

**The claim:** an ASIN that is not the calling brand's is **refused**, and the refusal is
logged. It is never silently filtered out of a response.

**Implementation** (`supabase/functions/_shared/tenantScope.ts`):

1. `asinsInPayload(body)` walks the payload at any depth and collects every value under a
   key named `asin` or `amazonProductIdentifier` matching the 10-character ASIN shape;
   `asinsInQuery` does the same for GET parameters. ASINs travel inside item payloads, so
   a path-based check would find none — hence the payload-based check.
2. `assertAsinBelongsToBrand(jwtBrandId, asin)` queries
   `brand_asin_scope?brand_id=eq…&asin=eq…`:
   - no row → `ASIN_NOT_IN_BRAND_SCOPE`, **403**;
   - no brand tenant in the session → `TENANT_ASSERTION_REQUIRED`, **403** (fail-closed: an
     operator session is not a licence to touch an arbitrary ASIN);
   - the lookup fails → **403** (ownership unproven, so the call does not proceed).
3. A refusal writes `result = 'refused'` and returns 403 **before** the provider call.
4. A permitted call writes `result = 'granted'` (or `'error'`); **if that write fails the
   response is 503 rather than an unlogged access.**

**Proof:** `scripts/validate-spapi-tenant-scope.mjs` (22 assertions) proves the chain end
to end — including that the assertion is called **before** the provider call, and that the
builder really emits ASINs (so the scan is not vacuous).

**Known limit, stated plainly:** the assertion runs in **live** mode only. Simulation
returns mock shapes and touches no brand's data, so asserting against mock ASINs would
refuse the demo without protecting anything. A deliberate boundary, recorded so it is never
mistaken for an oversight.

---

## 5. RETENTION SCHEDULE

| Data | Retention | Mechanism |
|---|---|---|
| `spapi_access_audit` | **90 days** | `purge_spapi_access_audit(90)`, daily at 03:17 via pg_cron (`030`) |
| `brand_asin_scope` | Life of the relationship | Cascades on brand deletion |
| Provider credentials | Never in plaintext | Vault reference only; rotation is an operator action |
| Channel response bodies | **Not stored** | Returned to the caller, not persisted |
| Internal `audit_log` | Retained (append-only) | Separate ledger; not purgeable by design |

The number 90 is stated **once in SQL, once in TypeScript**; `validate-audit-retention.mjs`
fails the build if they disagree, if the purge stops deleting by age, or if a brand session
can execute the purge.

---

## 6. SUB-PROCESSORS

| Sub-processor | Purpose | Data it can see |
|---|---|---|
| **Supabase** (Postgres, Auth, Edge Functions, Vault) | Database, identity, server-side functions, secret storage | All platform records, including brand/ASIN scope and the access log |
| **Namecheap** (shared hosting, `demo.mercenta.co.uk`) | Static hosting of the demo build | The built application only — **no** database access, **no** credentials |
| **GitHub** (private repository) | Source control | Source code. **No** production data, **no** secrets: `.env*` and Vault values are never committed |
| **Amazon** (Selling Partner API) | The integration itself | Only the request payloads the operator sends |

**No analytics, advertising or profiling processor is used.** The public site ships no
analytics script, and `validate-data-preservation` asserts that (F9: zero external network
calls across the suite).

`[UNVERIFIED — confirm against G8888]`: whether Amazon requires each sub-processor to be
declared individually in the Developer Console, and whether a DPA copy must be attached.

---

## 7. ENCRYPTION ATTESTATION

| Layer | Claim | Basis |
|---|---|---|
| In transit, provider calls | TLS 1.2+ | Every provider call originates server-side over HTTPS; `defaultLiveFetch` makes no plaintext request |
| In transit, browser ↔ platform | TLS | Hosted endpoints are HTTPS; the app refuses to run provider calls from the browser |
| At rest, database | Encryption at rest, managed by Supabase | A property of the platform, not of this repository — **a provider claim, not proven here** |
| At rest, credentials | Never plaintext in the database | `secret_ref` is a `vault:` reference; plaintext lives in Vault |
| At rest, audit log | Same database encryption | Holds actor, brand, ASIN, route, time, result — no payload contents |
| Backups | Managed by Supabase | **Not verified from this repository** |

**Honest limitation:** the at-rest and backup claims are the hosting provider's. This
repository can prove Mercenta stores no plaintext credential and writes no provider payload
to disk; it cannot prove the provider's disk encryption.

---

## 8. PII INVENTORY — BRAND CONTACT FIELDS

| Field | Table | Why it exists | Retention |
|---|---|---|---|
| Contact name | `brand_contacts` | To operate the brand relationship | Life of the relationship |
| Contact email | `brand_contacts` | Day-to-day operational contact | Life of the relationship |
| Contact phone | `brand_contacts` | Escalation for operational issues | Life of the relationship |
| Contact role/title | `brand_contacts` | To route the right message | Life of the relationship |
| Operator email (`actor`) | `spapi_access_audit` | To attribute a data access | 90 days |
| Brand ASINs | `brand_asin_scope` | Tenant isolation | Life of the relationship |

**Not collected:** no consumer/end-customer personal data, no payment card data, no special
category data, no channel customer records. The SP-API routes in the manifest request no
customer-level personal data.

`[UNVERIFIED — confirm against G8888]`: whether the DPP requires a per-field retention
statement, and whether an operator email in an access log counts as "personal data received
from Amazon" (it does not originate from Amazon).

---

## 9. MFA AND ACCESS POLICY

**Sessions:** Supabase Auth; JWTs carry the role and, for a brand, `tenant_id`. A brand
cannot obtain an operator role, because the role lives in `app_metadata`, which a user
cannot write.

**MFA:** `[UNVERIFIED — confirm against G8888]`. Amazon requires MFA for Seller Central;
whether the DPP additionally requires MFA on the *application's* operator accounts cannot be
confirmed from training knowledge. **Current state: Mercenta does not enforce MFA on its own
operator logins.** That is a real gap, not a satisfied control.

**Gaps that remain — must be closed before submission, and must never be described as done:**

1. **MFA enforcement on operator accounts** — not implemented.
2. **Incident notification runbook and SLA** (DP-10, AU-10) — not written.
3. **Data-subject request workflow** (DP-11) — not implemented.
4. **Termination / data-return procedure** (DP-12) — not documented.
5. **Named security contact and annual attestation** (DP-13) — a business input, not code.
6. **Confirmation of every `[UNVERIFIED]` clause** against the live G8888 text.
7. **A live integration has never run** — every SP-API live route is declared `unsupported`;
   this pack therefore attests to controls that are *built and statically proven*, not to
   controls observed under live traffic.

---

## 10. DECLARATION

Mercenta states that the controls in §2–§5 are implemented in the files named, and that the
gaps in §9 are open. Mercenta makes **no** claim of Amazon approval, programme membership or
endorsement, and **no** claim that a live SP-API integration is operating.

Prepared from training knowledge of the DPP and AUP, tagged throughout, with every uncertain
clause marked for human confirmation. No clause was copied from a fetched policy page,
because none could be fetched from this environment.

**Next action (human):** open Seller Central → Developer Console → the G8888 policy documents,
confirm or correct each `[UNVERIFIED — confirm against G8888]` row, and close the seven gaps
in §9 before submitting.