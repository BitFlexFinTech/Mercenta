# CLICKUP DEMO TASK ROLLBACK — 2026-11-19

Nine generic ClickUp demo tasks were ARCHIVED (not deleted) from the Mercenta Partners
workspace on 2026-11-19, with the Owner approval recorded that day.

- Workspace: `1200400000014349`
- Space: `1200400000053894` (Software Development) — RETAINED, not renamed
- Operation: `task.archive` — REVERSIBLE; each task keeps every field and its history
- Reason: ClickUp seeded these nine generic software-project examples into the brand-new
  workspace. NONE contains Mercenta information. The workspace held only these nine tasks
  and one member, so no Mercenta content could be affected.

## How to restore any of them

Use the `task.unarchive` operation with the id, or open the url in ClickUp and unarchive it.

## The nine archived tasks

1. `123r7ktkhaa` — **Workspace search foundation** · status: released · list: Releases · priority: normal
   description: Completed foundation release with monitoring handoff.
   url: https://app.clickup.com/t/123r7ktkhaa

2. `123r7ktkha6` — **Mobile sync stability patch** · status: ready to ship · list: Releases · priority: urgent
   description: Small patch for intermittent sync retries on mobile.
   url: https://app.clickup.com/t/123r7ktkha6

3. `123r7ktkha7` — **Onboarding activation improvements** · status: in qa · list: Releases · priority: high
   description: Final analytics, migration, and regression checks before rollout.
   url: https://app.clickup.com/t/123r7ktkha7

4. `123r7ktkhab` — **Expose search relevance diagnostics** · status: accepted · list: Stories · priority: normal
   description: Add internal diagnostics for search quality investigations.
   url: https://app.clickup.com/t/123r7ktkhab

5. `123r7ktkha9` — **Persist mobile sync retry state** · status: ready · list: Stories · priority: high
   description: Avoid repeated sync failures when connectivity changes.
   url: https://app.clickup.com/t/123r7ktkha9

6. `123r7ktkha8` — **Show a useful empty state after signup** · status: in development · list: Stories · priority: urgent
   description: Give new users a clear next action instead of a blank workspace.
   url: https://app.clickup.com/t/123r7ktkha8

7. `123r7ktkhae` — **Search returns archived docs first** · status: verified · list: Bugs · priority: normal
   description: Fixed in 2026.09, verified in prod.
   url: https://app.clickup.com/t/123r7ktkhae

8. `123r7ktkhad` — **Mobile sync spinner never clears after wake** · status: fix in progress · list: Bugs · priority: high
   description: A resumed mobile session can remain stuck in a syncing state.
   url: https://app.clickup.com/t/123r7ktkhad

9. `123r7ktkhac` — **Invite CTA fires twice on slow connection** · status: new · list: Bugs · priority: urgent
   description: Duplicate invite requests appear when the CTA is clicked during a slow response.
   url: https://app.clickup.com/t/123r7ktkhac

## Note on the template artefacts

The three Lists (Releases, Stories, Bugs) sit inside three HIDDEN template Folders
(`1200400000063112`, `1200400000063113`, `1200400000063114`). The demo tasks also carried
ClickUp custom task types (Release, Story, Bug) and trial custom fields. These belong to
ClickUp template scaffolding, not to Mercenta.

