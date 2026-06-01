# Changelog

## 1.3.2

### Features
- **UI Overhaul: Toolbar integration** — Replaced floating dice button with a SillyTavern-native `drawer-icon` toggle injected into `.top-settings-holder`. Uses `fa-solid fa-dice-d20 fa-fw` Font Awesome icon with `closedIcon`/`openIcon` states and `interactable` class for proper toolbar styling and accessibility.
- **Combined dice pool + roll history panel** — Single toggle panel contains both the dice pool builder (8-die grid) and roll history list. Toggle button stays visible as a persistent open/close control; removed close buttons from both windows.
- **RollHistory simplified** — Removed standalone collapsed/expanded toggle and floating container. Now renders inline inside the DicePool panel without its own header/close chrome.
- **Invalid notation reference link** — When notation is invalid, star button replaced with `fa-regular fa-circle-question` icon linking to dice notation docs at `https://dice-roller.github.io/documentation/guide/notation/modifiers.html`.

### Bug Fixes
- **Removed background highlight on hover** — Dice pool toggle no longer highlights on hover, matching SillyTavern drawer-icon behavior.
- **Star/favorite icons use Font Awesome** — Replaced text `★`/`☆` characters with `fa-solid fa-star`/`fa-regular fa-star` in DicePool.tsx and RollHistory.tsx, matching app convention (TOFIX #15).
- **`isFavorite` reference stabilization** — `useCallback` deps changed from `[favorites]` to `favoritesRef` to prevent cascading re-renders (TOFIX #16).
- **jQuery removed from body-injection** — Replaced `$('#send_textarea')` with `document.querySelector<HTMLTextAreaElement>` (TOFIX #9).
- **SettingsPanel subscribes to settings changes** — Added `useEffect(() => subscribeSettings(setSettings), [])` for external reactivity (TOFIX #10).
- **RollHistory dead code removed** — Stripped misleading `history.slice(0, 100)` (TOFIX #8).
- **Hardcoded colors replaced with CSS vars** — `#4caf50`/`#f44336`/`#ffd700` replaced by `--ddr-color-valid`/`--ddr-color-invalid`/`--ddr-color-star` deriving from `--SmartTheme*` vars (TOFIX #17).
- **Reroll button title clarifies right-click action** — Changed from "Set notation" to "Set notation | Right-click to roll" across all three RollHistory tabs (TOFIX #21).
- **`unregisterFunctionTool` moved inside capability guard** — No longer called before `isToolCallingSupported` check; only unregisters when tool calling is supported (TOFIX #30).

### Infrastructure
- **Removed standalone RollHistory React root** — `body-injection.tsx` no longer creates a separate `#ddr-roll-history-container`. Roll history data is passed down as props to DicePool, which renders RollHistory inline.
- **React Context/Provider pattern** — Introduced `DiceRollerProvider` (`DiceRollerContext.tsx`) as the single source of truth for settings, roll history, favorites, and notation input state. Components use `useDiceRoller()` hook instead of prop drilling.
- **Per-chat history persistence** — `DiceRollerProvider` manages `HistoryEntry[]` loaded/saved to `chatMetadata['3d_dice_rolls']` automatically via debounced `saveMetadata()`.
- **Global favorites & recent notations** — `FavoriteNotation[]` and last-10-unique notations persisted to `extensionSettings['3DDiceRolls']` via `saveSettingsDebounced()`.
- **Removed history management from `body-injection.tsx`** — No longer owns `rollHistory` array, chat change listener, or manual re-renders. Side effects (injectResult, sendAsChatMessage) kept as independent `onRollResult` subscriptions.
- **Domain logic extracted to `dice-logic/notation-utils.ts`** — `parseParts` (uses real `tokenize()` from lexer), `applyAdvantage`, `applyDisadvantage`, and `handleDiceNotation` moved from DicePool.tsx into new dedicated module. DicePool.tsx shrank from 442→251 lines (TOFIX #12, #13, #18).
- **CSS custom properties for theme colors** — Added `:root`-scoped `--ddr-color-star`, `--ddr-color-valid`, `--ddr-color-invalid` in `_variables.scss` using `color-mix()` with `--SmartThemeQuoteColor`/`--SmartThemeBodyColor` for automatic light/dark adaptation.
- **DicePool god component split** — 297→141 lines (~53% reduction). Tab bodies extracted into `DiceTabStandard`, `DiceTabDnd`, `DiceTabWod`. `renderDiceButton` inner function extracted as standalone `DiceButton` (`React.memo`). `DiceConfig` type and dice arrays moved to `dice-config.ts` (TOFIX #11, #22, #23).
- **Tab components are memoized** — `StandardTab`, `DndTab`, `WodTab` use `React.memo`; only the active tab re-renders on state changes (TOFIX #23).
- **WoD state localized** — `wodDifficulty` moved from `DicePool` into `DiceTabWod`, eliminating cross-tab coupling (TOFIX #11).
- **9 duplicate 2D dice components consolidated** — Individual `DiceD2.tsx` through `DiceDF.tsx` removed; single `DiceSvg` factory component with `diceType` prop + shape descriptors (TOFIX #14).
- **`DiceDUnknownProps` type alias removed** — Old `DiceD2.tsx` file deleted as part of consolidation, misleading naming no longer exists (TOFIX #19).
- **Unused `_width`/`_height` params removed from `DiceFactory`** — Constructor no longer takes unused dimensions; `create3DDiceRoll` marks them as intentionally unused for API compatibility (TOFIX #13).
- **`useDiceColors` dependency uses `JSON.stringify`** — Replaced `eslint-disable` with `JSON.stringify(shades)` for proper dependency tracking (TOFIX #28).

### Features
- **History Overhaul (3.5)** — Redesigned `RollHistory.tsx` with 3 tabs:
  - **Chat** — per-chat entries, latest auto-expanded with `--SmartThemeQuoteColor`, click entry to copy notation to input and toggle details, reroll button (↻) to roll immediately, star icon to toggle favorite.
  - **Favorites** — global `FavoriteNotation[]` list, click to set notation, reroll button, unstar to remove.
  - **Recent** — last 10 unique notations globally, click to set notation, reroll button.
  - Only the "All" tab shows expanded details; Favorites and Recent tabs show notation only.
- **Favorites System (3.4)** — Star button in notation editor saves current notation as global favorite. Star icon on each history entry toggles favorite. Favorites persist across chats via `extensionSettings`.
- **DicePool reads settings from context** — `getSettings()` no longer called in render body. Uses `useDiceRoller().settings`, fixing React reactivity and the TOFIX 2.4 issue.
- **Notation input shared via context** — `DicePool` editor and `RollHistory` click-to-set both use the same `notationInput` state from `DiceRollerProvider`.

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
