# Code Review: Remaining Issues

**Version:** 1.3.2-dev
**Last updated:** June 2026

---

## Open Code Smells & Technical Debt

| # | File | Lines | Issue | Status |
|---|------|-------|-------|--------|
| 3 | `dice-logic/index.ts` | — | **Unused exports.** `extractRawValuesFromAST`, `PRECEDENCE`, `parseDiceNotation` are exported but never consumed internally. | ⬜ OPEN (public API, kept for external consumers) |
| 4 | `roll-orchestrator.ts` | L81-86 | `prepareDiceGeometries` result used without checking if geometries is empty or null. If all dice types fail geometry creation, empty array passed to `startPhysicsRoll`. | ⬜ OPEN |
| 6 | `renderer/factory.ts` | L15 | `DiceGeometryClass` uses an overly complex inline type signature. Return type only specifies `clone()` but consumer also accesses `.values`. | ⬜ OPEN |
| 7 | `renderer/resource.ts` | L3-9 | **Overly broad types.** `TrackedResource = Trackable \| Trackable[] \| Disposable` makes the Map keys ambiguous. `resources` is `Map<TrackedResource, TrackedResource[]>` where both key and value are the same union — parent/child tracking is not type-safe. | ⬜ OPEN |

---

## Partially Resolved Areas

### 2.5 — UI Components are Not React-Idiomatic 🟡 **PARTIALLY FIXED**

**Fixed:** `DiceRollerProvider` context wraps the panel providing settings, history, favorites, and notation state. Components use `useDiceRoller()` instead of prop drilling. `$('#send_textarea')` replaced with `document.querySelector`.

**Still remaining:**
- `body-injection.tsx` still manually creates React roots (required by ST extension lifecycle — likely unfixable).

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

## UI Layer: Specific Findings

### MEDIUM

| # | File | Lines | Issue | Priority |
|---|------|-------|-------|----------|
| 20 | `components/2d_dices/DiceSvg.tsx` | 75-83 | **UI contains dice-logic.** The tens/ones splitting of a d100 value belongs in the evaluator layer, not the SVG component. | 🟡 Medium |
| 24 | `components/RollHistory.tsx` | 35-182 | Three tab render functions (`renderChatTab`, `renderFavoritesTab`, `renderRecentTab`) are structurally identical — DRY violation. | 🟡 Medium |
| 25 | `components/DiceRollerContext.tsx` | 59 | Module-level `saveTimeout` variable. Works with single provider instance but is a code smell — multiple providers would share the same timeout. | 🟡 Medium |
| 26 | `dice-logic/roll-orchestrator.ts` | 111-293 | The 3D roll loop (reroll → unique → explosion) is 182 lines of inline logic. Should be extracted into helper functions or a state machine. | 🟡 Medium |

### LOW

| # | File | Lines | Issue | Priority |
|---|------|-------|-------|----------|
| 27 | `utils/settings.ts` | 93-98 | `getContext()` called fresh in every persistence function. Could cache at module level. | 🟢 Low |
| 29 | `dice-logic/roll-orchestrator.ts` | 110-111 | `preGeneratedValues` map is created but the `d100` `multiplier` variable on line 105 is only used inside the loop iteration. Slight scope confusion. | 🟢 Low |

---

## Top Remaining Priorities

1. **RollHistory tab render functions DRY** — Three nearly-identical tab render functions (#24).
2. **DiceD100 tens/ones splitting in UI** — Belongs in evaluator layer, currently in `DiceSvg.tsx` (#20).
3. **Module-level `saveTimeout`** — Multiple providers would share single timeout (#25).
4. **3D roll loop inline logic** — 182 lines in `roll-orchestrator.ts` should be extracted (#26).
5. **Cache `getContext()` at module level** — Called fresh in every persistence function (#27).

---

## Legend

| Icon | Meaning |
|------|---------|
| 🟠 High | Significant code smell, refactor needed |
| 🟡 Medium | Minor code quality issue |
| 🟢 Low | Nitpick / nice-to-have |
| ⬜ OPEN | Unresolved |
