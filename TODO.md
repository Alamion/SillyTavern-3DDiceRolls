# TODO — 3DDiceRolls Feature Roadmap

Tasks are grouped by **area** (logical dependency) and ordered by priority within each area.
Each task includes: name, description, priority, effort, impact, and dependencies.

---

## Status Legend
- 🟡 **IN PROGRESS** — partially implemented
- ⬜ **NOT DONE** — not started

---

## Area 1: Core Parser & Roller

### 1.4 — Predetermined / Forced Rolls (`@` notation) ⬜
**Priority:** High | **Effort:** Medium | **Impact:** Medium

Support forcing specific outcomes via `@` notation:
- `6d6@4,4,4,4,4,4` — all six dice show 4
- `2d20@20,1` — first shows 20, second shows 1

**Implementation notes:**
- Parser must recognize `@values` suffix
- 3D renderer: run full physics simulation, then swap face materials post-simulation
- 2D roller: directly use forced values instead of random

**Acceptance criteria:**
- Forced values always appear in the result
- 3D animation still plays naturally (physics runs normally, only visual result is swapped)
- D4 uses special rotation-based swap
- Mismatched value count produces a clear error

---

### 1.5 — `<>` Lexer Optimization ⬜
**Priority:** Low | **Effort:** Low | **Impact:** Low

Use moo's `%{tokenType}` feature for COMPARE tokens (`>`, `>=`, etc.) instead of separate regex tokens.

**Status:** Tried moo.keywords() — API conflict with moo's fast single-char matching. Not compatible. Low priority.

---

### 1.6 — Fantasy AGE Stunt Dice (dS) ⬜
**Priority:** Medium | **Effort:** Medium | **Impact:** Low-Medium

Support Fantasy AGE stunt dice mechanic: `1dS` — roll 2d6 + a red stunt die.

---

## Area 2: Sound & Physics

### 2.1 — Sound Effects System ⬜
**Priority:** High | **Effort:** Medium | **Impact:** High

Add audio feedback for 3D dice rolls via Cannon-es `body.on('collide')` events.

---

### 2.2 — Reroll Specific Dice ⬜
**Priority:** Medium-High | **Effort:** Medium | **Impact:** Medium

Allow re-rolling individual dice via raycasting click detection or `reroll(diceIdArray)`.

---

## Area 3: Remaining Dice Pool & WoD

### 3.2 — Dice Pool: Multi-Tab System 🟡
**Priority:** High | **Effort:** High | **Impact:** High

**Done:** Standard, D&D, and WoD tabs implemented with tab switching.

**Remaining:**
- WoD tab: full VtM dice pool (each d10 gets `>=difficulty` modifier on left-click)
- `d10 roll = 1 => total result -= 1` botch mechanic
- Extensible tab registration for future game systems
- Per-tab dice pool persistence

---

### 3.8 — VtM Dice Pool 🟡
**Priority:** Medium | **Effort:** Medium | **Impact:** Medium

**Done:** WoD tab with difficulty slider, `d10>=difficulty` button, increment/decrement.

**Remaining:**
- Botch mechanic (`d10=1` decrements total)
- Full pool behavior (all dice use `>=difficulty`)
- Dice count persistence per tab

---

## Area 5: Symbolic & Narrative Dice

### 5.0 — Fate Dice: Symbolic Display ✅
**Priority:** Low | **Effort:** Easy | **Impact:** Low
**Implemented in 1.3.3:** 3D faces show `-`/`0`/`+` symbols, values return `-1`/`0`/`+1`, `faceLabel` field populated in both 2D and 3D paths.
**Remaining:** Display formatters to use `faceLabel` for chat/output. See `src/utils/dice-utils.ts` (formatting).

`dF` already rolls correctly via `rollFudgeDie()` → returns `-1, 0, 1`. Only display layer needs work.

| File | What to change |
|------|---------------|
| `src/dice-logic/types.ts:150` | `DiceRoll.value: number` — freeze as-is; add optional `faceLabel?: string` for symbolic display (`+`, `-`, ` `) |
| `src/dice-logic/dice-evaluator.ts:22-24` | `rollFudgeDie()` — populate `faceLabel` per die |
| `src/dice-logic/roll-orchestrator.ts:78` | Pass fudge flag through 3D pipeline |
| `src/dice-logic/renderer/geometries.ts:61` | Labels array — change `['-1','0','1']` to `['−',' ','+']` for D6 geometry when fudge |
| `src/dice-logic/renderer/factory.ts:83` | Detect fudge dice and assign fudge face labels |
| `src/utils/dice-utils.ts` (display formatting) | Show `faceLabel` in roll results and chat messages |

**Reference:** `context/dice-roller/src/rollers/dice/fudge.ts:1-12` — just overrides `possibilities = [-1, 0, 1]`, renderer handles symbol display via `RenderTypes.FUDGE`.

**Not doing:**
- No change to the numeric type chain (`DiceRoll.value` stays `number`)
- No new lexer/parser tokens for Fate
- No modifiers on fudge dice (no `kh`/`kl`/explode — they already work but don't make Fate sense)

---

### 5.1 — Star Wars FFG / Genesys Narrative Dice 🆕 ⬜
**Priority:** Medium | **Effort:** Moderate | **Impact:** Medium
**Depends on:** 5.0 (for shared face-label plumbing)

#### High-Level Approach
Narrative dice run through a **parallel code path**, not a refactor of the numeric system. Our existing numeric dice system stays untouched. The narrative dice get their own:

- **Lexer tokens** (letter-based notation like `3g2p` or `3dA2dD`)
- **Parser nodes** (new `NarrativeGroup` AST node, or a `narrativeType` flag on `DiceGroupNode`)
- **Evaluator path** (returns `NarrativeResult` with symbol counts, not `sum: number`)
- **3D renderer** (new face-label sets with symbols)

#### How the Reference Does It
`context/dice-roller/src/rollers/dice/narrative.ts:1-549`:

| Die | Letter | Die Size | Roller Class | Face→Symbol Mapping |
|-----|--------|----------|-------------|---------------------|
| Boost | `b` | d6 | `BoostRoller:25` | `6→1S`, `5→1A1S`, `4→1A`, `3→2A`, `2→blank`, `1→blank` |
| Setback | `s` | d6 | `SetbackRoller:61` | `6→1T`, `5→1T`, `4→1F`, `3→1F`, `2→blank`, `1→blank` |
| Ability | `g` | d8 | `AbilityRoller:93` | `8→2A`, `7→1A1S`, `6→1A`, `5→1A`, `4→2S`, `3→1S`, `2→1S`, `1→blank` |
| Difficulty | `p` | d8 | `DifficultyRoller:134` | `8→1T1F`, `7→2T`, `6→1T`, `5→1T`, `4→1T`, `3→2F`, `2→1F`, `1→blank` |
| Proficiency | `y` | d12 | `ProficiencyRoller:172` | `12→1Tr1S`, `11→2A`, `10→2A`, `9→1A1S`, `8→1A1S`, `7→1A1S`, `6→1A`, `5→2S`, `4→2S`, `3→1S`, `2→1S`, `1→blank` |
| Challenge | `r` | d12 | `ChallengeRoller:233` | `12→1Ds1F`, `11→2T`, `10→2T`, `9→1T1F`, `8→1T1F`, `7→1T`, `6→1T`, `5→2F`, `4→2F`, `3→1F`, `2→1F`, `1→blank` |
| Force | `w` | d12 | `ForceRoller:293` | `12→2L`, `11→2L`, `10→2L`, `9→1L`, `8→1L`, `7→2D`, `6→1D`, `5→1D`, `4→1D`, `3→1D`, `2→1D`, `1→1D` |

Symbols: `S`=Success, `F`=Failure, `A`=Advantage, `T`=Threat, `Tr`=Triumph, `Ds`=Despair, `L`=Light, `D`=Dark

**Result type** (`narrative.ts:8-15`):
```typescript
interface NarrativeResult {
    success: number;    // negative => failure
    advantage: number;  // negative => threat
    triumph: number;    // triumph & despair do not cancel
    despair: number;
    light: number;
    dark: number;       // light & dark are independent, do not cancel
}
```

**Lexer** (`context/dice-roller/src/lexer/lexer.ts:167-187`): Uses a regex that captures letter-and-number notation (`3g2p`), normalizes abbreviations (`pro→y`, `boo→b`, etc.), and expands digits (`3g` → `ggg`).

#### What We Need to Change

| File | What to change |
|------|---------------|
| `src/dice-logic/dice-lexer.ts:30-45` | Add new `NARRATIVE` token type for letter-based notation (`/^(?:\d*[gGyYbBrRpPsSwW]){1,}$/`) or standard notation (`dA`/`dP`/`dD`/`dC`/`dB`/`dS`/`dF`) |
| `src/dice-logic/types.ts:119-126` | Add `narrativeType?: 'boost' \| 'setback' \| 'ability' \| 'difficulty' \| 'proficiency' \| 'challenge' \| 'force'` to `DiceGroupNode` |
| `src/dice-logic/types.ts:164-188` | Add `NarrativeResult` type and make `RollResult` support multi-group hybrid rolls (numeric + narrative in same expression) |
| `src/dice-logic/dice-parser.ts:185-200` | Handle narrative token → `DiceGroupNode` with `narrativeType` set |
| `src/dice-logic/dice-evaluator.ts` | New `evaluateNarrativeGroup()` function for narrative dice; in `evaluateDiceGroup()` detect narrative type and branch |
| `src/dice-logic/roll-orchestrator.ts` | Detect narrative groups, use separate 3D pipeline for narrative face labels |
| `src/dice-logic/renderer/geometries.ts` | New label sets for each narrative die type (symbols like ⬟➡⬟, ★, etc.) |
| `src/dice-logic/renderer/factory.ts` | Map narrative `DiceGroupNode` to correct geometry + labels |
| `src/utils/formatting.ts` | New `formatNarrativeResult()` showing symbol counts |
| `src/components/RollHistory.tsx` | Display narrative results (symbol counts, not a single total) |

#### Core Design Decisions

1. **Narrative result is not a single `total`** — `NarrativeResult` replaces `DiceGroupResult.sum` for narrative groups. In hybrid rolls (`2d6+1g`), numeric groups contribute to `total`, narrative groups contribute to the `NarrativeResult` object.

2. **No modifiers on narrative dice** — `kh`/`kl`/explode/reroll/target/min/max/crit/sort are all meaningless for multi-dimensional symbols. Parser should reject modifiers on narrative dice.

3. **Binary operations don't apply** — `+ - * / % ^` between narrative types or between narrative and numeric is undefined. Parser should error on `1dA + 1dD`.

4. **3D fallback** — narrative dice use only supported physical geometries (d6=boost/setback, d8=ability/difficulty, d12=proficiency/challenge/force). Any unsupported die type falls back to 2D.

5. **Letter-based notation is preferred** — `2g1p` over `2dA1dD`. It's the standard in the FFG community and matches the reference.

#### Not Doing (Scope Boundaries)

- **No generic symbolic framework** — not creating a pluggable system for arbitrary face symbols
- **No crossover arithmetic** — narrative dice never mix with binary operators
- **No narrative modifiers** — no keep/drop/explode/reroll etc. on narrative groups
- **No 3D physics changes** — narrative dice use the same Cannon-es simulation, only face labels change
- **No Genesys-specific symbol rendering on 3D dice** (initially) — start with text labels (e.g. `S`, `A`, `T`) before custom icon textures
- **No dice pool UI** — narrative dice roll from the notation editor / `/roll` command only; tab UI is future work
- **No force die 3D textures** — force die symbols (light/dark) are text labels initially

---

## Dependency Graph

```
1.1 (Lexer Parser) ──┬── 1.4 (Forced Rolls)
                      ├── 1.5 (<> Lexer Opt)
                      ├── 1.6 (Stunt Dice)
                      └── 5.0 (Fate Symbolic Display)

3.2 (Multi-Tab) ──────────── 3.8 (VtM Dice Pool) 🟡

5.0 (Fate Display) ─────── 5.1 (Narrative Dice) ─── 3.2 (future tab)

2.1 (Sound Effects) ──── (Surface Themes)
```

---

## Suggested Execution Order

| Phase | Tasks | Rationale |
|-------|-------|-----------|
| **Phase 1** | 1.4 | Forced rolls |
| **Phase 2** | 2.1 | Sound effects system |
| **Phase 3** | 2.2 | Reroll-specific dice |
| **Phase 4** | 3.2, 3.8 (remaining WoD) | VtM botch mechanic + full pool behavior |
| **Phase 5** | 5.0 | Fate symbolic display (easy win, low risk) |
| **Phase 6** | 5.1 | Narrative dice system (depends on 5.0 face-label plumbing) |
