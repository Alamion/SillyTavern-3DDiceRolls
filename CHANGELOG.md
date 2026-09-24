# Changelog

## 1.4.2 (2026-09-25)

### Improvements

- **The dice panel survives errors** — if a component or the 3D engine crashes, the drawer shows the error with a "Try again" button instead of going blank; the dice icon stays usable. (T-027)

### Bug Fixes

- **Favorites and recent rolls survive settings changes** — changing any setting used to erase saved favorites and recent notations on the next reload. (F-001)
- **Roll history is saved with its chat** — history was only saved in chats that happened to carry an internal id set by certain macros, so in most chats it vanished on switching; it could also be read from or written to the previously opened chat, and a roll made just before a switch could land in the next chat. (F-002)
- **A roll stays with the chat it was rolled in** — switching chats while 3D dice were still rolling put the result into the newly opened chat's history (and its input box or chat, when those outputs are on). The result now goes to the history of the chat it was started in, is added when you return to that chat, and a toast shows it instead of posting it to the wrong chat. (F-035)
- **All dice fit a narrow panel** — in a narrow drawer the dice wrapped to two per row and pushed the notation editor and Roll button out of view; dice now shrink to keep more per row, only the dice area scrolls, and the editor and buttons always stay visible. (F-036)
- **No error when the dice panel is torn down** — the chat-change listener is now removed with the app's `removeListener`; the old cleanup threw a TypeError. (F-005)
- **Favorites and Recent entries are clickable** — clicking an entry in the Favorites or Recent history tab now puts its notation into the editor; it used to do nothing. (F-006)
- **Roll button waits for valid notation** — the button is disabled while the notation is invalid, matching the Enter key. (F-012)
- **The notation editor catches malformed notation** — validation used to accept incomplete notation such as `2d6+`, `(2d6`, or `2d6>=` (the missing part silently counted as 0), `0d6` and `1d0` (rolled as `1d6`), a bare `f`, a wrong number of `@` values, and anything left after the roll; the editor now marks these invalid and the Roll button stays disabled. Rolling through `/roll`, `{{ddroll}}`, and events is unchanged. (F-016, partly)
- **Cancelling a roll is no longer an error** — pressing ✗ on the loading bar logged an uncaught `RollCancelledError` in the browser console; the panel now treats cancelling as a normal outcome. (F-037)
- **WoD difficulty stays put and stays consistent** — switching dice tabs no longer resets the difficulty to 6, and changing it moves the thresholds already in the editor instead of mixing `>=6` and `>=8` terms. (F-013)
- **Mixed 3D rolls keep each die's value** — in `1d7+2d6` the d7 (no 3D model) took the first d6's physical value; it is now rolled in 2D alongside the 3D dice. (F-004)
- **Exploding d100 throws a proper d100** — a d100 explosion threw two plain d10s and read their values in the wrong order; it now throws the same tens-and-ones pair as the original die. (F-010)
- **Compounding dice keep compounding in 3D** — `!!` stopped after one extra die in 3D while 2D kept chaining; both now chain until a die does not explode. (F-011)
- **No impossible values from a physics glitch** — an invalid physics value was replaced by a random 1–20 even on a d6; the roll now falls back to 2D. (F-014)
- **All dice fit on narrow screens** — the dice grid wraps into more rows when the drawer is narrow instead of clipping dice at the edge, and on mobile widths the drawer scrolls so lower rows are reachable.
- **Less work on every mouse move** — while 3D dice were loaded, each mouse move rewrote the page cursor style even when nothing changed, waking every page observer; it is now written only when it changes.
- **Dice sounds load with other extensions installed** — sounds were looked up next to whichever extension bundle named `dist/index.js` loaded last (for example WorldInfo-Workspace), producing a burst of 404 errors and silent dice; they now load from this extension's own folder. (F-034)
- **Dice no longer stay on screen after a failed roll** — if a 3D roll fails midway, the thrown dice are dismissed before the 2D fallback. (F-018)
- **3D rerolls follow the same limit as 2D** — 3D rerolls stopped after 10 attempts regardless of the notation. (F-031)
- **Clicking a 3D die no longer clicks the chat under it** — rerolling a die by clicking it used to also press whatever SillyTavern button or message lay beneath the dice. (F-008)
- **3D dice are read only once they have settled** — a die must stay still for 0.2 s and stop tipping before its face is read; dice could be read while still rolling onto another face, and a pile no longer jitters itself awake. (F-009)
- **Accept and Cancel act on the current roll only** — with several rolls in flight the buttons accepted or cancelled all of them, and the loading bar disappeared while other rolls were still running. (F-019)
- **3D dice no longer spawn inside each other** — every thrown, rethrown, or exploding die starts clear of the others, so dice are not blasted apart at the start of a throw. (F-022)
- **Fair 3D start orientations** — a die's starting rotation was drawn from a skewed distribution; it is now uniform, which matters most when dice barely tumble. (F-023)
- **One clear message when 3D dice cannot run** — instead of a raw "Unified roll failed" toast on every roll, the first failure explains that the roll fell back to 2D and later ones go to the console. (F-025)
- **No toasts about optional features on load** — messages such as "Macro system not available" are now written to the console only. (F-026)
- **Native toasts, smaller bundle** — notifications use SillyTavern's own toastr instead of a bundled copy with its own stylesheet; the plugin bundle shrinks by about 90 KB. (F-027)
- **Safe against double initialization** — the plugin sets itself up once even if the settings-loaded event fires again, and both React roots are kept so they can be unmounted. (F-028)
- **Typing in the notation editor stays in the plugin** — keystrokes no longer bubble to SillyTavern's document-level handlers; Escape still does. (F-029)
- **2D dice images are plain images** — the unused clickable-image path (an `<img role="button">`) was removed; dice buttons are real buttons. (F-030)

## 1.4.1

### Features

- **Botch dice in WoD tab** — Added a second d10 dice button with botch mechanics (`d10>={difficulty}f=1`). Uses `blendColors` to tint 15% crimson red for visual distinction. Both dice buttons are properly memoized. Notation editor correctly preserves the `f=1` suffix when incrementing/decrementing botch dice.

### Bug Fixes

- **Botch markers now visible in details and formatted** — `csb`/`cfb` adjustments on individual dice are now visually indicated: details shows `***` (critical success botch) and `___` (critical failure botch); formatted shows `{value}+1`/`{value}-1` per affected die.
- **Target success rolls show count instead of raw values in formatted** — Rolls with a compare point (e.g. `1d10>=6`) now display `1+0+1` in formatted output instead of `10+3+7`, showing each die's binary success/failure result.

## 1.4.0

### Features

- **Forced / Predetermined Rolls (`@` notation)** — `2d20@20,1` forces specific outcomes. Works with modifiers (`4d6@3,3,3,3kh3`). In 3D mode, warns and proceeds with normal physics. `validateNotation('')` returns `false` for empty/whitespace strings. (TODO 1.4)
- **Botch Modifiers (`csb` / `cfb`)** — `csb` adds +1 to total per critical success, `cfb` subtracts -1 per critical failure. No target threshold needed: `3d6csb` works standalone. (TODO 1.7)
- **Sound Effects System** — Cannon-es collision events play surface/die audio via `SoundManager`. Dynamic runtime updates via `updateSoundConfig()`. Settings: `enableSound` toggle + `soundVolume` slider (0–100). (TODO 2.1)
- **Reroll Specific Dice (3D)** — Raycaster click-detection on 3D dice. Click a die to lock others and rethrow it. Works during `timeToReact` window and normal physics. Visual feedback: cursor → pointer on hover, emissive highlight. (TODO 2.2)
- **Time-to-React & Loading Controls** — New settings: `timeToReact` (bool) + `timeToReactSeconds` (slider 1–60). During rolling shows `ddr-loading` spinner with accept (✓) / cancel (✗) buttons. (TODO 4.0)
- **Custom Dice Macros (`{{ddroll}}`)** — `{{ddroll::2d6+3}}` via SillyTavern `macros.register()`. Uses `ddroll` name to avoid overwriting core `{{roll::1d20}}`. Outputs compact formatted result. (TODO 6.0)

### Bug Fixes

- **`formatRollValues` `'+'` path now replaces all `+-`, not just the first** — Changed `replace('+-', '-')` to `replace(/\+-/g, '-')` so expressions with multiple negative terms (e.g. `1+2+-3+-4+5`) format correctly. (TOFIX #1 — CRITICAL)
- **Null geometry from `prepareDiceGeometries` no longer silently skipped** — `groupSizes[g]` now tracks actual successfully-created geometries rather than requested count. If no geometries could be built, orchestrator falls back to 2D evaluation instead of passing an empty array. (TOFIX #2 — CRITICAL)
- **Window resize during active roll no longer freezes dice** — `handleResize` now checks for active roll sessions before destroying the physics world. When dice are in play, it only updates camera dimensions and barriers in-place instead of recreating `PhysicsWorld` and `SceneManager`. (TOFIX #3 — CRITICAL)
- **Sound file URL resolution and deployment improved** — `getExtensionSoundsBaseUrl()` now also matches script src containing `/dist/index.js`. Build step copies `sounds/` → `dist/sounds/` via `require('fs').cpSync` so sounds are always bundled alongside the extension bundle. (TOFIX #4 — CRITICAL)
- **`handlePointerMove` no longer interacts through `.ddr-loading-bar`** — Added guard matching `handlePointerDown` to filter out loading-bar elements, preventing hover cursor changes through the loading overlay. (TOFIX #10 — HIGH)
- **`prepareDiceGeometries` result checked for empty/null before use** — Added explicit guard with 2D fallback when `geometries.length === 0`, completing the safety chain. (TOFIX #5 — RE-OPEN)
- **SoundManager.init() failure now logged** — `init()` catch logs warning. (TOFIX #15 — MEDIUM)
- **Sound loading errors logged per-clip** — Individual clip load failures silently skipped but `init()` warns if all sounds fail. (TOFIX #16 — MEDIUM)

### Refactors

- **3D roll loop extracted into named helpers** — Inline ~182-line per-group processing loop in `roll-orchestrator.ts` split into `convertFlatToGroupRolls`, `processRethrowLoop` (handles both reroll and unique phases), and `processExplosionLoop`. Main loop body now reads as a sequence of four clear calls. (TOFIX #6 — HIGH)
- **RollHistory tab renders DRY'd** — Three structurally identical render functions (`renderChatTab`, `renderFavoritesTab`, `renderRecentTab`) replaced with a single `renderList` helper parameterized by data source. (TOFIX #7 — HIGH)
- **`saveTimeout` moved from module-level to component ref** — Moved `saveTimeout` variable into `DiceRollerProvider` via `useRef`, eliminating shared state between potential multiple provider instances. (TOFIX #8 — HIGH)
- **d100 tens/ones splitting moved out of DiceSvg** — `splitD100Value()` utility added to `dice-logic/notation-utils.ts`. DiceSvg now accepts optional `d100Tens`/`d100Ones` props, keeping display logic separate from dice-arithmetic. (TOFIX #9 — HIGH)
- **Configurable collision velocity threshold** — `SoundManagerConfig.speedThreshold` field replaces hardcoded `SPEED_THRESHOLD = 250`. Default stays 250, adjustable per-instance. (TOFIX #19)

### Infrastructure

- **Unused `physCount` variable removed** from `roll-orchestrator.ts`.
- **`as any` cast replaced with `as DiceGroupNode`** in `tests/evaluator/basic-rolls.test.ts`.
- **`DiceGeometryData` import added** to `roll-orchestrator.ts` for typed handle parameter in explosion helper.
- **`getContext()` cached at module level** — `cachedContext` variable avoids calling `SillyTavern.getContext()` on every persistence operation. (TOFIX #11 — MEDIUM)
- **`TrackedResource` types narrowed** — Removed union-typed overloads; parent/child tracking now type-safe. (TOFIX #12 — MEDIUM)
- **`preGeneratedValues`/`multiplier` scope clarified** — Already clean after 1.4.0 loop extraction refactor, marked resolved. (TOFIX #18 — LOW)
- **`SPEED_THRESHOLD` removed as dead constant** — Replaced by configurable `speedThreshold` on `SoundManagerConfig`. (TOFIX #19 — LOW)

## 1.3.3

### Features

- **Fate / Fudge Dice (dF) — Full 3D Support** — `dF` now renders correctly in 3D with proper Fate symbols (`-`, `0`, `+`) on each cube face instead of standard 1-6 labels. Physics simulation returns correct fudge values (`-1`, `0`, `+1`) instead of 1-6. Factory updated to override D6 labels/values when `fudge` flag is set, skipping the `+1` value shift.

### Improvements

- **`faceLabel` field added to `DiceRoll`** — Optional string field on every die result, populated with `'-'`, `' '`, or `'+'` for fudge dice in both 2D and 3D paths. Ready for display formatters to show symbolic output.

### Bug Fixes

- **`dF` no longer rolls as D6 in 3D** — Root cause: `factory.ts` ignored the `fudge` flag on `DiceGroup`, created plain `D6DiceGeometry` with standard 1-6 labels and values. Now detects `group.fudge`, overrides face labels and values, and preserves `-1`/`0`/`+1` through the pipeline.

### Infrastructure

- **`DiceGeometryClass` type widened** — Exposes `labels: string[]` and `values: number[]` on the returned instance, enabling fudge label overrides in the factory layer.

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
