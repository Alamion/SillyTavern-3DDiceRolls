# Code Review: Remaining Issues

**Version:** 1.3.0-dev
**Last updated:** May 2026

---

## Open Code Smells & Technical Debt

| # | File | Lines | Issue | Status                                              |
|---|------|-------|-------|-----------------------------------------------------|
| 3 | `dice-logic/index.ts` | — | **Unused exports.** `extractRawValuesFromAST`, `PRECEDENCE`, `parseDiceNotation` are exported but never consumed internally. | ⬜ OPEN (public API, kept for external consumers)    |
| 4 | `roll-orchestrator.ts` | L82-86 | `prepareDiceGeometries` result used without checking if geometries is empty or null. | ⬜ OPEN                                              |
| 6 | `renderer/factory.ts` | L15 | `DiceGeometryClass` uses `any`-like type signature. `create()` returns `{ clone(): DiceGeometryData }` without proper generics. | ⬜ OPEN                                              |
| 7 | `renderer/resource.ts` | L3-9 | Overly broad types. `TrackedResource = Trackable \| Trackable[] \| Disposable` makes the Map values ambiguous. | ⬜ OPEN                                              |

---

## Partially Resolved Areas

### 2.4 — Settings Management 🟡 **PARTIALLY FIXED**

**Fixed:** Polling removed. `subscribeSettings`/`notifySubscribers` pattern added. body-injection uses it.

**Still remaining:**
- `SettingsPanel.tsx` does **not** subscribe to settings changes — only updates when its own `handleChange` fires.
- No React Context/Provider pattern wrapping the app.
- `DicePool.tsx` and `RollHistory.tsx` call `getSettings()` in render body.

---

### 2.5 — UI Components are Not React-Idiomatic 🟡 **PARTIALLY FIXED**

**Fixed:** `SettingsPanel.tsx` uses `useState<DiceRollerSettings>(getSettings())`. body-injection uses `subscribeSettings` instead of polling.

**Still remaining:**
- `body-injection.tsx` **still manually creates React roots** and calls `.render()` imperatively. No app-level component tree.
- `DicePool.tsx:50` and `RollHistory.tsx:33` still call `getSettings()` inline.

---

### 2.7 — Resource Management 🟡 **PARTIALLY FIXED**

**Fixed:**
- Shared renderer pool with 5-minute inactivity debounce.
- `clearTextureCache()` exists.
- `ResourceTracker` created per roll is properly disposed via `RollSession`.
- `removeDiceFromScene` now disposes geometries/materials via tracker.

**Still remaining:**
- Textures in `textureCache` only cleared on color changes, not after each roll.

---

## No Longer Tracked

The following issues from the previous code review have been **fully resolved** and are no longer tracked in this file:

- Duplicate group key collision — fixed via unique group index counters
- ResourceTracker memory leak — fixed via RollSession disposal
- D100 logical/physical desync — fixed via combined D10 pairs
- Keep/drop modifiers capped at 10 — replaced hardcoded arrays with regex
- Dead code in `fixBrightness` — removed no-op
- Double parse on error fallback — moved AST to outer scope
- Duplicated interface declaration — removed duplicate
- No window resize handling — added debounced resize listener
- Adaptive camera not wired — initCamera(diceCount?) selects distance
- Magic numbers — extracted to constants.ts
- Backup file checked in — added to .gitignore, removed
- No GPU resource cleanup — tracker.dispose() handles geometry/material disposal
- Missing try/catch in createSettingsUI — added error handling
- getOrCreateGeometry null safety — added null check before .clone()
- No test infrastructure — 116 tests now exist
- Generalized lexer token types (22 instead of 39+)
- No NOT_EQ token — `!=` = `!` + `=`
- Shared explosion counter prevents infinite recursion
- Min/max always apply on pre-generated values
- Fix mockRandom consumption order in reroll tests
- scene.ts duplicate import comment — stale entry, file was already clean
- shapes.ts `stopped` type — reviewed, not actually wrong
- Group key duplication — extracted shared `buildGroupKey` helper to `dice-logic/utils.ts`
- Edge-case test gaps — added tests: empty pre-gen map, max explosions cap, 50-level parens, unicode rejection, negative expressions
- Mixed jQuery with React/TS — source app uses pare js and the plugin uses React/TS
- COMPARE tokens could use moo `%type`. - moo 0.5.3's API uses {tokenType: keywordString} and combining all COMPARE operators into one regex conflicts with moo's fast single-char matching
---

## Top 3 Remaining Priorities

1. **DicePool/RollHistory call getSettings() in render body** — Breaks React reactivity.
2. **Renderer code smells** — Items 4, 6, 7 (geometry safety, confusing types, overly broad types).
3. **Mixed jQuery with React** — Item 2 (`$('#send_textarea')` in body-injection).
