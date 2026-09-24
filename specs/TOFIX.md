# TOFIX

The queue of open defects found outside feature cycles. Fixed entries are removed in the
same change that ships the fix — the durable record lives in `CHANGELOG.md`. Defects
discovered while implementing a spec belong to that spec's task list, not here. The
release a fix is scheduled for is recorded only in the roadmap's release plan.

Severity is carried exclusively by the section an entry sits in; entries carry no
lifecycle status. Every entry has a stable `F-###` identifier — assigned once, never
reused for a different entry, never renumbered (gaps after removals are permanent).

"Backport" in a recommendation means TTGamer (`ttgamer/src/dice_roller/`) already ships
the fix.

## Legend

| Section     | Severity                                                  |
| ----------- | --------------------------------------------------------- |
| 🟠 Critical | Data loss, wrong roll results, crash, or a frozen tab     |
| 🟡 High     | Broken feature, visible misbehavior, or significant smell |
| 🟢 Medium   | Minor defect or code quality issue                        |
| ⬜ Low      | Nitpick / nice-to-have                                    |

## 🟠 Critical

### F-003 — Unbounded notation can freeze the tab

**Area:** dice engine limits (`src/dice-logic/`, `src/utils/constants.ts`)

**Evidence:** Only `MAX_EXPLOSIONS = 1000` exists. `/roll 99999999d99999`, a `{{ddroll}}` macro in a character card, an external `3ddicerolls:roll` event, or the model through `RollTheDice` can request arbitrarily many dice, sides, or AST nodes, blocking the main thread.

**Recommendation:** Backport TTGamer limits (`utils/constants.ts`: notation length 500, AST nodes 200, dice 200, sides 100 000, numeric literal 1e9, custom faces 1000, explosions 100, physical 3D dice 200) enforced in lexer/parser/evaluator with `parser/limits.test.ts`. Rejecting rolls that work today touches the notation contract, so it ships under a spec with a CHANGELOG note.

### F-033 — Penetrating explosions stop after the first extra die

**Area:** dice evaluator and orchestrator explosions (`src/dice-logic/dice-evaluator.ts` `applyExplode`, `src/dice-logic/roll-orchestrator.ts` `processExplosionLoop`)

**Evidence:** For `!p` the continuation check runs on the value after subtracting 1 (`dice-evaluator.ts` `applyExplode`, non-compounding branch: `matchesExplosionCondition(explosionVal, …)`), so a rolled maximum on an extra die never explodes again: `1d6!p` rolling 6, 6, 3 totals 11 (6+5) instead of 13 (6+5+2). The 3D path copies the same rule. Compounding penetration (`!!p`) checks the raw value and is correct.

**Recommendation:** Decide the explosion on the raw rolled value and subtract 1 only from the kept value, in both 2D and 3D; changes roll totals, so it ships under the strict-notation spec (T-008) with a CHANGELOG note.

## 🟡 High

### F-007 — "Send as chat message" output is invisible to the model

**Area:** output routing (`src/utils/body-injection.tsx`)

**Evidence:** `sendAsChatMessage` uses `sendSystemMessage('generic', …)` (`body-injection.tsx:134`); SillyTavern builds these with `is_system: true` (`scripts/system-messages.js:40`), and system messages are excluded from the prompt. Users enabling the option to inform the model get no effect on generation.

**Recommendation:** Resolved by T-001 (prompt injection); until then state in the setting's label/help that the message is display-only. Changing what this option sends is a contract change and goes through that spec.

## 🟢 Medium

### F-016 — Rolling still accepts malformed notation

**Area:** dice parser, lenient rolling mode (`src/dice-logic/dice-parser.ts`)

**Evidence:** Validation is strict since 1.4.2 (the panel's Roll button and Enter refuse `2d6+`, `(2d6`, `2d6>=`, trailing input, `0d6`, `1d0`, bare `f`, and wrong `@` counts), but rolling still parses leniently: `/roll`, `{{ddroll}}`, the `3ddicerolls:roll` event, the function tool, and history rerolls turn unexpected tokens into 0 with a toast, drop trailing input, roll `0d6`/`1d0` as `1d6`, ignore a bare `f`, and fail on a wrong `@` count only inside the evaluator. Merged F-015 and F-017.

**Recommendation:** Roll with `parseToAST(notation, { strict: true })` and surface the `NotationError` message in every entry point; changes which notation rolls, so it ships with T-008 with a CHANGELOG migration note for favorites and character cards.

### F-020 — 3D timing depends on the display refresh rate

**Area:** 3D renderer timing (`src/dice-logic/renderer/renderer.ts`, `physics.ts`)

**Evidence:** Show and fade are counted in frames (`showFrames: 60`, `fadeFrames: 60`, `renderer.ts:283-284`, `:537`) and the roll timeout is checked per frame; at 144–240 Hz the result vanishes early, and a hidden tab reads dice mid-air on return. `world.step(step, dt)` advances sleep timing by wall time.

**Recommendation:** Backport the fixed-step accumulator with interpolation (`physics.ts` `step`, `resetClock`), simulated-time `SHOW_SECONDS` / `FADE_SECONDS` / `ACCEPTED_SHOW_SECONDS`, and interpolated poses in `shapes.ts`. Ship together with F-021.

### F-021 — Concurrent rolls interfere with each other

**Area:** 3D renderer handle API (`src/dice-logic/renderer/renderer.ts`, `renderer-pool.ts`)

**Evidence:** `lockDice`, `rethrowDice`, `addDice`, `readFlatValues`, and `arrangeAndDismiss` always act on `this.sessions[this.sessions.length - 1]` (`renderer.ts:304`, `:318`, `:356`, `:398`, `:404`), so a second roll started during the first one hijacks its rerolls and explosions.

**Recommendation:** Backport the session-scoped `PhysicsRollHandle` (methods bound to `sessionId`) and adapt `SettingsPanel.tsx` `updateSoundConfig` usage.

### F-024 — Modulo by zero and overflow yield NaN or Infinity totals

**Area:** dice evaluator (`src/dice-logic/dice-evaluator.ts`)

**Evidence:** `x % 0` (`dice-evaluator.ts:523`) returns NaN, and `99999^99999` returns Infinity, both reported as the roll total.

**Recommendation:** Modulo by zero → 0 and throw a `RangeError` for non-finite totals (TTGamer evaluator ~621, 631, 721); ships with T-008.

## ⬜ Low
