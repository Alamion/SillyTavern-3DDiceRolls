---
name: backlog
description: Editing specs/ROADMAP.md, specs/TODO.md, or specs/TOFIX.md, or normalizing raw input (ideas, bug reports) into backlog entries. Read before touching the backlog files or recording new tasks/defects.
---

# 3DDiceRolls Backlog (ROADMAP / TODO / TOFIX)

## Scope and authority

- `specs/ROADMAP.md` owns product-level paths: slug, status, users, dependencies,
  scope, and the release plan. It is the only place path scope is written.
- `specs/TODO.md` is the execution task queue; `specs/TOFIX.md` is the queue of open
  defects found outside feature cycles. Both reference roadmap paths by slug and never
  restate their scope.
- The **executable truth** of the entry format is `scripts/validate-backlog.ts`
  (`pnpm run validate:backlog`). This skill teaches _when and how_; it never
  redefines the schema.
- Defects discovered while implementing a spec belong to that spec's `tasks.md` —
  `TOFIX.md` only receives issues found outside a feature cycle.

## Task entry grammar (TODO.md)

`- [x| ] <emoji> **T-### — Name** (dependencies or "none") — <scope: what becomes
possible and for whom>[ (task for roadmap path \`slug\`[, \`slug\`])]`

- Status is the checkbox + emoji pair, and the pair must agree:
  `[x] ✅` done · `[ ] 🟡` in progress · `[ ] ⬜` not started · `[ ] 🚫` closed
  (the body names declined/superseded and why).
- Illegal: `[/]`, a bare checkbox without emoji, parenthetical status suffixes like
  "(in progress)", per-entry priority values (priority = section grouping only).
- Optional indented sub-bullets carry notes: source references (e.g. the TTGamer file
  a backport comes from), effort, breaking-change warnings, open questions.
- Identifiers: next free `T-###` in the file; never reuse or renumber; gaps are
  permanent.

## Defect entry grammar (TOFIX.md)

`### F-### — Name` under exactly one severity section (`🟠 Critical` / `🟡 High` /
`🟢 Medium` / `⬜ Low` — the section IS the severity), with three required fields:
`**Area:**`, `**Evidence:**` (observable symptom, with `file:line` where known),
`**Recommendation:**`.

- No lifecycle status: an entry is open until its fix ships; the fix removes the entry
  in the same change (the CHANGELOG entry is the durable record).
- A fix that would change a delivered contract (constitution, "Delivered Contracts")
  is routed to a spec; the Recommendation says so.

## Normalizing raw input

1. Classify: executable task → `TODO.md`; defect → `TOFIX.md`; path-level product
   intent → a new or amended `ROADMAP.md` path.
2. Pick the section: task priority group (`Major` / `Minor`) or defect severity by
   impact (Critical: data loss, wrong roll results, crash, tab freeze; High: broken
   feature or significant smell; Medium: minor defect or quality issue; Low: nitpick).
3. Fill every required field from the input. Ask clarifying questions **only** when a
   required field cannot be filled (what the work is, who it serves, what it depends
   on). Optional fields are never a reason to ask.
4. If required information is unavailable, do not write the entry and do not guess.
5. If the work is scheduled, add its identifier to the release plan in `ROADMAP.md`.
6. Validate: `pnpm run validate:backlog` must pass. For scratch rehearsals the
   validator accepts explicit paths:
   `node scripts/validate-backlog.ts <todo> <tofix> <roadmap>`.
