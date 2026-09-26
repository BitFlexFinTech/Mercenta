# §CG — THE CONVERSION GATE (2026-09-26, session 36)

**Scope row (the only written scope):** `requirements-registry.json → phase15-conversion` —
*"conversion launch gate: form validation, spam protection, submission reliability, the primary CTA and
the Partner Login hierarchy. The CTA hierarchy part is DONE … **spam protection and submission
reliability remain**."*

This record is written the way the PO-ACK programme wrote its stages: **the contract is fixed from the
repository FIRST**, before implementing, and every finding below was verified against the real code.

---

## §1 THE CONTRACT, FIXED FROM THE REPOSITORY FIRST

### 1.1 What the repository claimed

The registry recorded one remainder: **spam protection** and **submission reliability** (with **form
validation** named in the same row). The starting point is therefore the public conversion surface:

```
/ (marketing) → Partner Login → Request Partner Access → PartnerApplicationForm → Application Received
```

`src/components/auth/PartnerApplicationForm.tsx` → `submitApplication` in
`src/data/applicationStore.ts` → `verifyLinks` in `src/lib/verification/linkVerifier.ts`.

### 1.2 What the code ACTUALLY showed (verified before any implementation)

| # | Finding (evidence) | Why it is a real gap |
|---|---|---|
| 1 | **No spam protection anywhere.** `grep -rni 'honeypot\|rate.limit\|spam' src e2e scripts` returned hits only in *unrelated* provider simulations (Companies House, Xero, Google). | The public form — the only unauthenticated write path in the product — accepted unlimited automated submissions. |
| 2 | **No submission reliability.** `handleSubmit` had no `try/catch` and reset `submitting` only on the success path. | A throw anywhere in the handler left the button on `...` **forever**, with no message and no way to retry. The applicant is simply lost. |
| 3 | **The real link check held the applicant open.** The handler did `await verifyLinks(...)` — a real `fetch` of the applicant's own links — **before** writing the record, with `TIMEOUT_MS = 10_000` **per link** (`linkVerifier.ts:9`). | Up to ~30s of dead button on three links, and in a browser most of those fetches are CORS-blocked, so the result is usually `unverified_manual_check` after the full wait. An unused `verifyLinksNonBlocking` already existed — the non-blocking path was **written and never wired**. |
| 4 | **A double submit could record two applications.** `submitApplication` unconditionally `unshift`ed a new record; nothing de-duplicated. | Two rows for one brand, and the admin pipeline sees two decisions for one applicant. |
| 5 | **Validation was three checks.** `if (!companyName) / if (!selectedCountry) / if (!atLeastOneLink)`, then `parseInt(skuCount, 10)`. | A non-numeric product count became `NaN` (stored as a real value); `"not a url"` passed as a link; the country had to be *selected* but any typed text was accepted by the UI path; one banner string reported every failure at once, with no field association and no announcement. |

### 1.3 What was explicitly NOT in scope

- **No CAPTCHA / reputation service.** Neither exists without an external provider, and inventing a
  score would be a lie. The gate uses only signals a browser can supply on its own.
- **No change to the commercial rule for phone numbers.** See §5.2.
- **No new persistence.** The demo store stays in-memory; the attempt ledger is session state.

---

## §2 THE OWNERS (one declaration each)

| Role | File | What it owns |
|---|---|---|
| **SSOT** | `src/config/partnerApplication.ts` | The honeypot (field name, label, class), `minFillMs`, the session window (`maxAttempts`/`windowMs`), the duplicate window, the field/payload limits, the country list, the verification promise and **every applicant-facing sentence** (`APPLICATION_SUBMISSION_MESSAGES`) — each threshold with its reason. |
| **Pure decision** | `src/lib/onboarding/applicationGuard.ts` | `validateApplicationInput` → `evaluateSpamSignals` → **one** `evaluateApplicationSubmission` decision. Pure: the clock (`now`) and the attempt ledger are **injected**; **zero network**; **fail closed** (a missing/non-string/non-finite/malformed signal is a refusal, never an acceptance). |
| **State** | `src/data/applicationStore.ts` | The session attempt ledger (**refused attempts included**), the duplicate fail-safe **at the domain boundary**, `getRecentApplications`, and `updateApplicationLinkStatus` for the deferred verification patch. |
| **Surface** | `src/components/auth/PartnerApplicationForm.tsx` | The honeypot (off-screen, `aria-hidden`, `tabIndex={-1}`, `autoComplete="off"`), the form-mount clock seam, the **synchronous** double-submit ref, per-field announced refusals, the non-blocking verification, and `try/catch/finally`. |

### 2.1 The four spam signals (and why each is honest)

1. **Honeypot** (`company_fax`) — a field no human sees, cannot tab to, and no screen reader announces.
   A form-filling bot completes every field it finds. Positioned **off-screen** rather than
   `display:none`, because some bots skip hidden inputs.
2. **Minimum fill time** (`minFillMs = 2500`) — a person cannot read and complete this form in under
   ~2.5s; a script can. Below it, the submission is refused and **nothing is recorded**.
3. **Session attempt budget** (`3` per `10` minutes) — **refused attempts count**. A refusal that costs
   a bot nothing is not a rate limit.
4. **Duplicate window** (`60s`) over **RECORDED** applications only — see §3.2: this distinction is
   what keeps the message truthful.

---

## §3 WHAT WAS REPOINTED (old contracts recorded, never weakened)

### 3.1 The submit path — `§CG — REPOINTED` inline in the form

Old contract: three inline checks → `await verifyLinks(...)` → `submitApplication(...)` → `onSubmitted()`,
with no `catch`. All three original rules still hold; they are now enforced by the declared owner and
rendered per field. The verification now runs **after** the record exists.

### 3.2 A truthfulness defect found while designing the live legs

The first version of the duplicate rule counted **every** attempt. That made a real applicant who
submitted too fast and then retried the same answers receive *"This application was already received"* —
**false**, because nothing had been received. Fixed: the **rate** limit counts every attempt, the
**duplicate** rule counts only attempts where `recorded === true`, and the ledger's `recorded` flag is
**required** (an entry without it fails closed). The gate asserts both behaviours:

- *"the SAME application inside the duplicate window is refused"* (`recorded: true`)
- *"a REFUSED earlier attempt does NOT make the retry a duplicate (the message stays true)"* (`recorded: false`)

### 3.3 Two specs repointed (assertions unchanged)

`e2e/access-gate.spec.ts` (6 form-opens) and `e2e/status-semantics.spec.ts` (1) submitted within ~1s of
opening the form, which the new gate correctly refuses. Each form-open gained the declared wait, marked
inline `§CG minFillMs=2600`, and the gate asserts that marker against the SSOT so a spec can never
silently wait less than the policy. **24 + 4 insertions, 0 deletions** — no assertion was altered.

### 3.4 A UI claim corrected (not a new requirement)

The phone field carried a `*` but the domain never required it (`BrandApplication.phone` is
`string | null`, and both the type and the store accepted `null`). The label now reads `(optional)`;
the guard validates the value **only when it is given** (`6–15` digits).

---

## §4 THE EVIDENCE SET

| Artefact | Role |
|---|---|
| `scripts/validate-conversion-gate.mjs` (`npm run validate:conversion-gate`) | The owner gate: SSOT uniqueness across all of `src/`, the guard exercised case-by-case against the real module, purity + fail-closed assertions, the store's fail-safe/budget/patch, the form's bindings, the two registry reconciliations, the spec/live legs and the npm registration. Zero network (`fetch` sabotaged before any module loads). |
| `e2e/conversion-gate.spec.ts` (5 cases) | Real browser: honeypot refusal, too-fast refusal, per-field announced refusals + focus, duplicate-once, and **submission never waits for the link check** (every third-party host deliberately left pending). |
| `scripts/verify-demo-live.mjs` `§P13/CG` | The DEPLOYED build enforces the same gate: honeypot present/unannounced/unfocusable, bot refused with nothing recorded, too-fast refused, genuine submission confirmed, session budget enforced. |
| `applicationAttempts` in `investorDemo.ts`'s `RESTORABLE` | The attempt ledger participates in the deterministic reset — the §P4 precedent: a replay must find an empty budget, or the run could be refused as `attempt_limit`. |

---

## §5 HONEST LIMITS AND OPEN DECISIONS

1. **These are browser-side signals.** The honeypot, the fill time, the session budget and the
   duplicate window are what a browser can observe **without a third-party service**. They raise the
   cost of trivial automation; they are **not** a CAPTCHA, and the platform makes **no** claim that a
   determined attacker is blocked. A server-side rate limit only becomes possible when the application
   write path has a backend (Supabase); at that point the *same* declared policy must be enforced
   there too, and this gate should assert the seam.
2. **The phone field is now labelled `(optional)`.** Making a phone number **compulsory** is a
   commercial decision for the Founder, not a defect fix — it is recorded here as an **open question**
   rather than invented.
3. **Verification results are not shown to the applicant.** The link check fills the admin's record
   (`verified` / `not_found` / `unverified_manual_check`). In a browser, CORS means most results are
   `unverified_manual_check` — the record never overstates what was checked, and the form never claims
   a link was verified. Improving that check (a server-side fetcher) is future work, not claimed here.
4. **The attempt ledger is per browser session** (in-memory, like the rest of the demo store): a new tab
   is a new budget. Honest for the demo; replaceable by the server-side limit in (1).
5. **Internal only.** Nothing here calls a provider; the only network activity the form can produce is
   the applicant's own link check, which is the verification feature itself.

---

## §6 TWO REGISTRY ROWS RECONCILED IN THE SAME PASS

Both were discovered while searching for the recorded remainder, and both were **stale** — completed
work recorded as unfinished:

- `s0-discovered-carrier-architecture-disposition` (**blocked** → `built_and_tested`): §P9
  *"the 3PL carrier surface is REMOVED COMPLETELY"* (2026-09-23) had already done it;
  `src/components/layout/CarrierShell.tsx` and `src/components/carrier/` do not exist, and
  `src/lib/auth/rbac.ts` carries the inline §P9 repoint comments.
- `discovered-playwright-app-shell-390x844-timeout-under-load` (**deferred** → `built_and_tested`): the
  row's own text says *"REPAIRED … the suite re-run afterwards was fully green"* while its status still
  read `deferred`; `e2e/app-shell.spec.ts` carries the `test.slow()` repair.

The new gate asserts both facts, so neither can silently drift back to "unfinished".

---

## §7 THE VERIFICATION OF THIS INCREMENT (measured, with its honest corrections)

**Locally:** the owner gate **146 assertions PASS / 0 FAIL / 0 network calls**, proved able to fail in TWO independent
places (`minFillMs` 2_500→0 → the timing cases go RED; a repointed spec's wait 2600→200 → the *"the spec really waits
that long"* assertion goes RED), with both files restored **byte-identical** (sha256 `44db2d7e4f94…`,
`3eaaba092b27…`) · whole `validate:*` sweep **36/36 on EXIT CODES** (35 → 36) · `npm run typecheck` 0 · root
`tsc --noEmit` 0 · `eslint` 0 · `npm run build` ✓ 7.90s · `e2e/conversion-gate.spec.ts` **5/5 (13.7s)** · the three specs
together **18 passed / 0 failed / 2 skipped (42.3s)** · `validate-investor-demo` **PASS** (`reset → run` reproduces the
SAME digest, so the ledger joining `RESTORABLE` did not disturb determinism) · registry verifier **322/64/209/17**.

**Deployed:** `LIVE_VERIFICATION_PASS` — **205/205 checks, 0 page errors**, all ELEVEN `§P13/CG` legs green, on a build
proved to be this commit (the live `index.html` serves `assets/index-BcbITdAi.js`, the same hash as the local build).

**The two honest corrections made DURING verification** (recorded rather than hidden):

1. **A truthfulness defect in the gate itself** — the duplicate rule originally counted refused attempts, which would
   have told an applicant who retried after a *too fast* refusal that their application "was already received". Fixed
   (§3.2) and now asserted in both directions.
2. **A defect in MY OWN live legs** — the first live run reported 2 failures. Neither was a product defect: one leg
   assumed a remote fill could beat the declared clock (it cannot — the fill itself takes ~1.9s), and its fourth
   attempt submitted an **empty** form, which validation correctly refuses *before* any spam signal is evaluated. The
   legs were rewritten to be **measured** (the timing leg now asserts consistency between the measured elapsed time and
   the refusal actually displayed, so it can fail if the gate ever lies about the signal) and to carry a valid payload.
   The recorded run is the corrected one; the failed run is documented in `PROJECT_STATUS.md` and the registry.



