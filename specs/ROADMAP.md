# ROADMAP

Product-level intent for the 3D Dice Roller SillyTavern extension: what each path must
achieve for its users and why. This document is the single source of truth for path
scope, status, and dependencies, and for the release plan.

**Relationship to [TODO.md](TODO.md) and [TOFIX.md](TOFIX.md)**: `TODO.md` is the
execution task queue and `TOFIX.md` the open-defect queue. Entries there reference
paths by slug (for example `notation-engine`) and never restate path scope, status, or
dependencies — those live only here.

**Status vocabulary**: `done` — usable today; `in progress` — with remaining gaps
listed explicitly; `not started`. Closed outcomes: `shipped`, `declined` (with a brief
reason), `superseded (by <slug>)`. A closed path stays visible with its outcome. Status
changes land in the same change as the work itself.

**Paths are user outcomes, not code modules**: how a path maps to modules is decided in
that path's own spec.

## Overview

| Slug                | Path                            | Status      | Priority |
| ------------------- | ------------------------------- | ----------- | -------- |
| `notation-engine`   | Rich, trustworthy dice notation | in progress | 1        |
| `3d-dice`           | Physical 3D dice                | in progress | 2        |
| `ai-roleplay`       | Rolls the AI understands        | in progress | 3        |
| `scripting-interop` | Scripting and extension interop | in progress | 4        |
| `system-pools`      | Game-system dice pools          | in progress | 5        |
| `panel-usability`   | Dice panel and roll history     | in progress | 6        |
| `project-health`    | Contributor and release hygiene | in progress | 7        |

## Path entries

### `notation-engine` — Rich, trustworthy dice notation

- **Status**: in progress
- **Priority**: 1
- **Users**: players, GMs, character-card authors, and the model itself
- **Depends on**: none
- **Scope**: One notation covers the dice people actually use at the table — keep and
  drop, exploding and compounding, rerolls, success targets, botches, Fate, forced
  values — and every roll is correct. Whoever triggers a roll (a person, a macro in a
  card, a script, another extension, or the model) gets either the right result or a
  clear explanation of what is wrong with the notation; no input can freeze the page.
- **Open questions**: which narrative systems (Genesys / Star Wars FFG, Fantasy AGE)
  are worth their own symbols.
- **Remaining gaps**: strict validation with pinpointed errors, resource limits,
  narrative and stunt dice.

### `3d-dice` — Physical 3D dice

- **Status**: in progress
- **Priority**: 2
- **Users**: players who enjoy seeing and hearing the roll
- **Depends on**: `notation-engine`
- **Scope**: Dice tumble on top of the chat with sound, land fairly, and show exactly
  the values the result reports. Rolls look the same on any display and stay smooth
  with large pools; players can react to a roll (accept, cancel, reroll a die) and can
  tune how lively the dice feel. When 3D is not possible the roll still completes in
  2D and the player is told why.
- **Open questions**: whether dragging individual dice is worth its cost.
- **Remaining gaps**: several result-correctness defects, frame-rate-independent
  timing, large-pool performance, forced values landing in 3D, dice feel setting.

### `ai-roleplay` — Rolls the AI understands

- **Status**: in progress
- **Priority**: 3
- **Users**: roleplayers running solo or group chats with a model as narrator or GM
- **Depends on**: `notation-engine`
- **Scope**: The model and the player share the same truth about every roll. The model
  can ask for a roll and receive an unambiguous outcome (who rolled, against what
  difficulty, success or failure by how much), the player's rolls reach the model's
  context without cluttering the chat, and a roll the model suggests in its reply is
  one click away for the player. Hidden rolls let a model-GM know results the player
  does not see.
- **Open questions**: default injection depth and lifetime of a roll in the prompt.

### `scripting-interop` — Scripting and extension interop

- **Status**: in progress
- **Priority**: 4
- **Users**: STscript and Quick Reply authors, character-card authors, other extension
  developers
- **Depends on**: `notation-engine`
- **Scope**: Rolls are a building block for automation. Slash commands, macros, and
  events return results in the shape a script needs (total, formatted text, pass/fail
  against a difficulty), saved rolls can be invoked by name, and other extensions can
  both request rolls and react to finished ones through a documented, stable event
  surface.
- **Open questions**: none recorded.

### `system-pools` — Game-system dice pools

- **Status**: in progress
- **Priority**: 5
- **Users**: players of specific tabletop systems (D&D, World of Darkness classic and
  5th edition, narrative-dice systems)
- **Depends on**: `notation-engine`
- **Scope**: The dice panel speaks each supported system's language: a player builds
  a pool the way their rulebook describes it (advantage, difficulty thresholds,
  botches, Hunger dice) and the result is read out in that system's terms — successes,
  margin, criticals, messy or bestial outcomes — instead of a bare number.
- **Open questions**: whether systems should be pluggable tabs registered by other
  extensions.
- **Remaining gaps**: WoD pool v2 (threshold rewrite, successes needed, verdicts), V5
  mode, extensible tab registration, narrative dice pool UI.

### `panel-usability` — Dice panel and roll history

- **Status**: in progress
- **Priority**: 6
- **Users**: every player using the dice drawer
- **Depends on**: none
- **Scope**: The drawer is quick, forgiving, and native to SillyTavern on desktop and
  mobile: invalid notation is caught before rolling, history, favorites, and recent
  rolls can be reused and cleared with confirmation, choices are remembered between
  sessions, a finished roll is always visible somewhere, and the panel is usable with
  a keyboard and assistive technology.
- **Open questions**: none recorded.

### `project-health` — Contributor and release hygiene

- **Status**: in progress
- **Priority**: 7
- **Users**: maintainers and contributors
- **Depends on**: none
- **Scope**: Every change to the plugin is safe to ship: the SillyTavern-facing
  surfaces are covered by contract tests, persisted user data survives upgrades
  through versioned migrations, the bundle stays lean and debuggable, and
  documentation always describes the current behavior.
- **Open questions**: whether to add CI for the quality gates.

## Release plan

The plan groups backlog identifiers into releases. Maintenance releases carry only
fixes that alter no delivered contract (constitution IX); anything else is a spec.

| Release | Theme                                        | Items                                                                              |
| ------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1.4.2   | Maintenance: data safety and correct results | done — see CHANGELOG 1.4.2                                                         |
| 1.5.0   | Rolls the AI understands (spec)              | T-001, T-002, T-003, T-004, T-005, T-006, T-007, T-017, T-023, T-024, F-003, F-007 |
| 1.6.0   | Strict notation and WoD pool v2 (spec)       | T-008, T-009, T-010, T-011, T-012, T-013, T-014, F-016, F-024, F-033               |
| 1.7.0   | Smooth, fair 3D (spec)                       | T-015, T-016, T-018, T-019, F-020, F-021                                           |
| later   | Unscheduled                                  | everything else, ordered by TODO sections                                          |
