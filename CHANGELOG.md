# Changelog

## 1.3.1

### Features
- **Loading indicator for 3D simulation** — Pure-CSS spinning ring (`.ddr-loading`) replaces grey overlay + "Rolling..." text. Positioned top-left in renderer container. Color matches `primaryDiceColor` setting via `--ddr-loader-color` custom property. Styles in `src/styles/_loading-indicator.scss`.
- **Shared `buildGroupKey` helper** — Extracted duplicated group key construction from `dice-evaluator.ts` and `roll-orchestrator.ts` into `dice-logic/utils.ts`.

### Infrastructure
- **Edge-case tests (142 total, +26)** — Added tests for: empty pre-generated values map, max explosions capped (`1d1!` at `MAX_EXPLOSIONS`), 50-level nested parentheses, unicode rejection, negative expressions, and additional unique/reroll/explosion coverage.

## 1.3.0

### Features
- **Lexer-Based Parser** — Replaced regex-based parser with moo-based lexer (`dice-lexer.ts`) + recursive descent parser (`dice-parser.ts`). Supports order-of-operations with parentheses `(2d6+3)*2`, arithmetic operators (`*`, `/`, `%`, `^`), and chained modifiers (`4d6r1kh3`).
- **Custom Face Values & Range Dice** — Supports `1d[1,3,5,7,9]` and range expansion (`3-5` → `3,4,5`). Custom-faced dice fall back to 2D when no 3D geometry matches.
- **Conditional Modifiers** — All six operators (`>`, `>=`, `<`, `<=`, `=`, `!=`). Conditions compose with `kh`/`dl` modifiers. `sum` becomes success-counting mode when condition is present.
- **Fudge / Fate Dice (dF)** — `4dF` rolls fudge dice returning `-1`, `0`, or `+1`. `DiceDF.tsx` 2D component included. Sum can be negative.
- **Adaptive Camera** — Camera distance adapts to dice count: <6 = close, 6–9 = medium, >9 = far.
- **Quiet Mode** — `/roll 2d6 quiet=true` suppresses chat output. Return value still available for macros.
- **Generalized Lexer Token Types** — 22 generalized types replace 39+ specific types (KH, KL, KEEP, DH, DL, DROP, REROLL_ONCE, etc. removed). Modifier token text carries variant info (e.g., `!!p` → `{ compounding: true, penetrating: true }`).
- **No NOT_EQ Token** — `!=` is decomposed as `MOD_EXPLODE` + `EQ` (explosion with compare `=`). Users needing not-equal must use `<>`.
- **Lexer Ordering** — Modifier tokens (`MOD_EXPLODE`, `MOD_REROLL`, etc.) now appear before compare-point operators (`EQ`, `GTE`, etc.) in the lexer, preventing modifier vs. compare token conflicts.
- **Fixed Modifier Evaluation Order (1–11)** — All modifiers now execute in a canonical order regardless of their position in notation. Min/Max always apply (including pre-generated values). Explode/Reroll/Unique only for non-pre-gen.

### Bug Fixes
- **Duplicate group key collision** — `2d6+2d6` no longer gives both groups identical values. Added unique group index counters.
- **ResourceTracker memory leak** — `tracker.dispose()` now called when dice leave the scene via `RollSession`.
- **D100 logical/physical desync** — Combined D10 value pairs into D100 logical values, expanded reroll indices from logical to physical, and correctly mapped explosion values back.
- **Keep/drop modifiers capped at 10** — Replaced hardcoded arrays (`kh1..kh10`) with regex patterns matching any number of digits.
- **Dead code in fixBrightness** — Removed no-op `h = h ? h : 0` that executed before HSL calculation.
- **Double parse on error fallback** — Fixed block scoping so AST is preserved across catch, only re-parses on actual parse failure.
- **Window resize handling** — Added debounced resize listener in `DiceRenderer` that re-inits scene dimensions, camera, lighting, and physics world.
- **GPU resource cleanup** — `tracker.dispose()` now properly disposes geometries and materials on scene removal.
- **Backup file checked in** — Added `*~` to `.gitignore`, removed stray `settings.ts~`.
- **Missing error handling** — Added try/catch around `getElementById('extensions_settings')` in `createSettingsUI`.
- **Null safety** — Added null check before `.clone()` in `getOrCreateGeometry`.
- **Explosion infinite recursion** — `applyExplode` now uses a shared `{count: number}` counter object passed through recursive calls, preventing stack overflow when `<>` matches most/all faces.
- **Pre-generated value path** — Min/Max modifiers now correctly apply when pre-generated values are used (3D physics path).
- **Test expectations corrected** — All tests using `mockRandom(0.5, …)` for d6 now expect `4` (not `3`), because `Math.floor(0.5 * 6) + 1 = 4`.
- **Reroll mockRandom consumption order** — Tests now correctly model that ALL dice are initialized first, then rerolls/modifiers run, consuming mock values in that order.

### Infrastructure
- **Test Suite (116 tests)** — Added full Vitest test suite: parser (55), evaluator basic-rolls (11), evaluator combined (8), evaluator explosion (8), evaluator modifiers (20), evaluator reroll (7), integration (7).
- **Magic numbers → constants** — `MAX_EXPLOSIONS`, `MAX_ROLL_SECONDS`, `VELOCITY_THRESHOLD`, `FRAME_RATE` extracted to `src/utils/constants.ts`.
- **Subscriber pattern for settings** — Replaced polling with `subscribeSettings`/`notifySubscribers` in `settings.ts`.
- **Shared renderer pool** — 5-minute inactivity debounce for renderer reuse, replacing per-renderer 2-second timeout.
- **Dice class boilerplate reduction** — `formatModifiers`, `applyKeepDrop`, `formatRollValues` extracted to `utils.ts`.
- **Improved `checkRollFinished`** — Now checks velocity, angular velocity, and stale iterations.
- **ESLint 9 + TypeScript** — Both pass with zero errors across the entire codebase.
