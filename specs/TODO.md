# TODO

The execution task queue. Path-level intent and statuses live in
[ROADMAP.md](ROADMAP.md); tasks here reference paths by slug and never restate their
scope. Every entry has a stable `T-###` identifier — assigned once, never reused for a
different entry, never renumbered (gaps after removals are permanent) — and exactly one
status. The release a task is scheduled for is recorded only in the roadmap's release
plan.

Entries marked "backport" already exist in TTGamer (`ttgamer/src/dice_roller/`) and are
ported rather than designed from scratch; the sub-bullets name the source.

## Legend

| Encoding | Status                                            |
| -------- | ------------------------------------------------- |
| `[x] ✅` | done                                              |
| `[ ] 🟡` | in progress                                       |
| `[ ] ⬜` | not started                                       |
| `[ ] 🚫` | closed — declined or superseded (entry names why) |

Required per entry: identifier, one-line name, status, section, scope (what becomes
possible and for whom), dependencies (or "none"). Optional: notes, effort, breaking-
change warnings, open questions. Priority ordering lives only in the section grouping.

### Major

- [ ] ⬜ **T-001 — Last roll injected into the prompt** (none) — the model sees each player roll through `setExtensionPrompt` at a configurable depth, without an extra chat message or text in the input box; a hidden-roll option lets a model-GM know a result the player does not see. (task for roadmap path `ai-roleplay`)
    - Also resolves F-007 by giving the model a supported route to roll results.
- [ ] ⬜ **T-002 — Clickable dice notation in chat messages** (none) — when a reply contains `[[1d20+5]]` (and optionally bare notation such as "roll 1d20+5"), the player clicks it to roll with the current 3D/2D settings. (task for roadmap path `ai-roleplay`)
    - Hook `CHARACTER_MESSAGE_RENDERED` / `USER_MESSAGE_RENDERED`; never mutate the stored message text.
    - Idea source: TTGamer `components/InlineRoll.tsx` (docs inline rolls).
- [ ] ⬜ **T-003 — Function tool difficulty and verdict** (none) — the model can pass a difficulty and a reason to `RollTheDice` and receives "success by N" / "failure by N" plus the roller's name, instead of a bare total. (task for roadmap path `ai-roleplay`)
    - Additive schema change only (new optional parameters).
- [ ] ⬜ **T-004 — Script-friendly `/roll` output and `{{lastroll}}`** (none) — STscript authors choose `format=total|compact|full` and pass `dc=` to get `success`/`fail` for `/if` branching; a `{{lastroll}}` macro exposes the most recent result. (task for roadmap path `scripting-interop`)
- [ ] ⬜ **T-005 — Named favorites** (none) — players label a favorite ("Stealth: 1d20+5") and invoke it by name from the panel, `/roll Stealth`, and `{{ddroll::Stealth}}`, with name autocomplete in the slash command. (task for roadmap path `scripting-interop`, `panel-usability`)
- [ ] ⬜ **T-006 — Outgoing `3ddicerolls:rolled` hook** (none) — other extensions react to every finished roll (notation, total, source, roller) through a documented event, emitted without awaiting listeners. (task for roadmap path `scripting-interop`)
    - Pattern source: WorldInfo-Workspace `src/adapters/hooks.ts`, `docs/hooks.md`, and its docs-vs-constants test.
- [ ] ⬜ **T-007 — Roller name on every roll** (none) — history, injected text, chat output, and the function tool name who rolled (persona, character, or group member), so group chats stay readable. (task for roadmap path `ai-roleplay`)
    - The function tool already receives `who` but drops it.
- [ ] ⬜ **T-008 — Strict notation with pinpointed errors** (none) — anyone typing a roll sees the offending span highlighted and a message saying what was expected or which limit was hit, instead of "Invalid notation"; the same message reaches `/roll`, the macro, the event API, and the model. (task for roadmap path `notation-engine`)
    - Backport: `dice-logic/errors.ts` (`NotationError`, `diagnoseNotation`), strict `dice-parser.ts`, token offsets in `dice-lexer.ts`; UI `components/dice_pool/NotationInput.tsx` + `notationDiagnosticMessage.ts` (replace i18n with a plain message map).
    - BREAKING: sloppy notation that rolls today (`2d6+`, `(2d6`, trailing junk) starts failing; resolves F-016, F-024, F-033. Needs a CHANGELOG migration note for favorites and character cards.
- [ ] 🟡 **T-009 — WoD pool v2** (none) — World of Darkness players change the difficulty and every `d10>=N` term already in the editor follows; the threshold can be left unset; a "successes needed" stepper and a d6 button are added. (task for roadmap path `system-pools`)
    - Done in 1.4.1: botch die (`d10>={difficulty}f=1`). Formerly TODO 3.8.
    - Backport: `notation-utils.ts` `rewriteWodDifficulty`, `addWodThreshold`, `isSuccessPool`; `DiceTabWod.tsx` `ClassicControls`.
- [ ] ⬜ **T-010 — Success verdicts** (T-009) — success-pool rolls report "success by N" or "failed by N" in history (badge collapsed, full line expanded), the result toast, and every output route. (task for roadmap path `system-pools`)
    - Backport: `utils/rollReader.ts` `rollVerdict`, `components/verdictText.ts`; leave out the pluggable `RollReader` registry.
- [ ] ⬜ **T-014 — Versioned settings with migration** (none) — users upgrading the plugin keep favorites, recents, and settings intact; malformed stored values are repaired field by field instead of breaking the panel. (task for roadmap path `project-health`)
    - Single save path for settings, favorites, and recents (see F-001).
    - Pattern source: WorldInfo-Workspace `src/core/state/schema.ts` (`SCHEMA_VERSION`, `migrate`, per-field validation) and `settingsStore.ts`.
- [ ] ⬜ **T-015 — Large 3D pools stay smooth** (none) — players rolling dozens to a couple of hundred dice get a smooth animation and a result within seconds. (task for roadmap path `3d-dice`)
    - Backport: face texture atlas (`geometries.ts` `faceAtlas`, `mapUvsToAtlas`), template cache in `factory.ts`, `crowd.ts`, `diceScaleFor` in the orchestrator, sleep tuning; physical dice limit 200.
    - Conflict: `renderer/resource.ts` ResourceTracker disposes shared textures; replace it with per-die material ownership as TTGamer did.
- [ ] ⬜ **T-017 — Contract tests against a fake SillyTavern host** (none) — maintainers get failing tests when `/roll`, `{{ddroll}}`, the event API, the function tool, or settings/history persistence break against the real app surface. (task for roadmap path `project-health`)
    - Pattern source: WorldInfo-Workspace `tests/support/fakeHost.ts`, `tests/contract/`, `tests/manifest.test.ts`.
- [ ] ⬜ **T-020 — Forced values land in 3D** (T-015, F-020) — `@` notation (`2d20@20,1`) shows the forced faces on the 3D dice instead of warning and rolling randomly. (task for roadmap path `3d-dice`)
    - Backport: `renderer/predict.ts`, `renderer/symmetry.ts`, `shapes.ts` face helpers, `physicalTargets` in the orchestrator. Needs deterministic fixed-step physics.
- [ ] ⬜ **T-021 — V5 mode for the WoD tab** (T-008, T-010) — Vampire and Hunter 5e players roll Hunger/Desperation dice in their own colour, count pairs of 10s as criticals, and get messy-critical / bestial-failure readings. (task for roadmap path `system-pools`)
    - Backport: `:h` label and set bonus `x{N}[.{K}]{cp}` across lexer/parser/evaluator, per-group dice colour in the renderer, `DiceTabWod.tsx` `V5Controls`; TTGamer spec `011-v5-dice-pools`.
- [ ] ⬜ **T-032 — Narrative dice (Genesys / Star Wars FFG)** (none) — narrative-system players roll ability, proficiency, difficulty, challenge, boost, setback, and force dice and read symbol totals instead of a sum. (task for roadmap path `notation-engine`, `system-pools`)
    - Formerly TODO 5.1; design notes preserved in [notes/narrative-dice.md](notes/narrative-dice.md).

### Minor

- [ ] ⬜ **T-011 — Clear and confirm across history tabs** (none) — players clear Favorites and Recent as well as chat history, each behind an app confirmation popup. (task for roadmap path `panel-usability`)
    - Backport: `clearFavorites`, `clearRecentNotations` in TTGamer `RollHistory.tsx`; popups via `callGenericPopup` (WorldInfo-Workspace `src/adapters/popups.ts`).
- [ ] ⬜ **T-012 — Remember panel choices** (none) — the selected dice tab and WoD difficulty survive reloads. (task for roadmap path `panel-usability`)
- [ ] ⬜ **T-013 — Accessibility pass** (none) — keyboard and screen-reader users can operate the dice grid, notation editor, and WoD controls. (task for roadmap path `panel-usability`)
    - `aria-label` on dice buttons and steppers, `aria-invalid` + `aria-describedby` + polite live region on the notation input, radio `fieldset`s for mode switches.
- [ ] ⬜ **T-016 — Dice feel setting** (F-020) — players choose between heavy dice that stop almost where they land and today's lively tumbling (the default). (task for roadmap path `3d-dice`)
    - Backport: `renderer/liveliness.ts` and the `diceLiveliness` setting; value 100 reproduces current physics.
- [ ] ⬜ **T-018 — Load the 3D engine on demand** (T-019) — users who roll in 2D or have not rolled yet do not pay for three.js and cannon-es at page load. (task for roadmap path `3d-dice`, `project-health`)
    - Backport: memoized `import('./renderer')` in the orchestrator; needs a runtime webpack `publicPath` derived from the script URL (as `getExtensionSoundsBaseUrl` does).
- [ ] ⬜ **T-019 — Mode-aware build** (none) — maintainers get source maps in dev, a clean `dist/`, and sound copying through webpack instead of an inline `node -e` script. (task for roadmap path `project-health`)
    - Pattern source: WorldInfo-Workspace `webpack.config.js`.
- [ ] ⬜ **T-022 — Group modifiers after parentheses** (T-008) — `(3d10+1d10)>=6f=1` applies the modifiers to every dice term inside the group. (task for roadmap path `notation-engine`)
    - BREAKING: `1d20+(1d4+1)d6` changes meaning (the trailing `d6` becomes drop-lowest); decide in the spec whether to keep TTGamer's reading.
- [ ] ⬜ **T-023 — Manual rerolls are recorded** (none) — when a player clicks a 3D die to reroll it, history and every output route say so, keeping the table and the model honest. (task for roadmap path `ai-roleplay`)
    - Backport: `manuallyRerolled` from the renderer handle (`wasManuallyRerolled`).
- [ ] ⬜ **T-024 — Result toast fallback** (none) — a player who disabled both chat output and input injection still sees the result of a roll in a toast. (task for roadmap path `panel-usability`)
    - Idea source: TTGamer `RollToastContent.tsx`.
- [ ] ⬜ **T-025 — Pending-roll chip on the toolbar icon** (none) — a player builds a pool, closes the drawer, and rolls or clears it from the top bar icon. (task for roadmap path `panel-usability`)
    - Idea source: TTGamer `src/components/NavbarDiceRoller.tsx`. Check crowding on mobile.
- [ ] ⬜ **T-026 — Mobile-friendly editor** (none) — on phones Enter in the notation editor follows the app's send-on-enter preference and the drawer fits the screen. (task for roadmap path `panel-usability`)
    - Use `shouldSendOnEnter` / `isMobile()` from the context.
- [x] ✅ **T-027 — Error boundary around the dice panel** (none) — a crash in the 3D engine or a component shows a recoverable message instead of an empty drawer. (task for roadmap path `panel-usability`)
- [ ] ⬜ **T-028 — Stricter type checking** (none) — maintainers catch unchecked index access and type errors in tests through a `typecheck` script covering `src/` and `tests/`. (task for roadmap path `project-health`)
    - Adds `noUncheckedIndexedAccess`; may surface fixes.
- [ ] ⬜ **T-029 — Localization** (T-008) — non-English users see the panel, settings, and messages in their language through the app's `t` / `translate`. (task for roadmap path `panel-usability`)
- [ ] ⬜ **T-030 — Version shown in settings** (none) — users reporting a bug can read the installed plugin version in the settings drawer. (task for roadmap path `project-health`)
    - `getExtensionManifest` from the context.
- [ ] ⬜ **T-031 — Fantasy AGE stunt dice** (none) — Fantasy AGE players roll `1dS` (2d6 plus a distinguishable stunt die) and see stunt points. (task for roadmap path `notation-engine`)
    - Formerly TODO 1.6.
- [ ] ⬜ **T-033 — Nudge or drag individual 3D dice** (none) — players flick a resting die with a click, and later possibly drag it. (task for roadmap path `3d-dice`)
    - Formerly TODO 2.3. Start with an impulse on click; full drag needs a mouse constraint built from scratch (toggle body type, ray-plane projection, spring force, release momentum, touch support).
- [ ] ⬜ **T-034 — Lexer compare-token cleanup** (none) — maintainers get one lexer rule for comparison operators instead of several separate regex tokens. (task for roadmap path `project-health`)
    - Formerly TODO 1.5. `moo.keywords()` conflicts with moo's fast single-character matching; low priority.
- [ ] 🟡 **T-035 — Extensible dice tabs** (none) — new game systems plug in as tabs, each remembering its own pool. (task for roadmap path `system-pools`)
    - Formerly TODO 3.2. Done: Standard, D&D, and WoD tabs with switching.
