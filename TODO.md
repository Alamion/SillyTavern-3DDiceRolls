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

## Area 5: Advanced / Niche Features

### 5.1–5.6 — SW RPG Dice, Narrative Notation, Texture System, Surface Themes, Percentile Variants, Note-Based Rollers
**Status:** ALL ⬜ **NOT DONE**

---

## Dependency Graph

```
1.1 (Lexer Parser) ──┬── 1.4 (Forced Rolls)
                      ├── 1.5 (<> Lexer Opt)
                      ├── 1.6 (Stunt Dice)
                      └── 5.5 (Percentile Variants)

3.2 (Multi-Tab) ──────────── 3.8 (VtM Dice Pool) 🟡
                              ├── 5.1 (SW Dice) ⬜
                              └── 5.2 (Narrative Notation) ⬜

2.1 (Sound Effects) ──── 5.4 (Surface Themes)
```

---

## Suggested Execution Order

| Phase | Tasks | Rationale |
|-------|-------|-----------|
| **Phase 1** | 1.4 | Forced rolls |
| **Phase 2** | 2.1 | Sound effects system |
| **Phase 3** | 2.2 | Reroll-specific dice |
| **Phase 4** | 3.2, 3.8 (remaining WoD) | VtM botch mechanic + full pool behavior |
| **Phase 5** | 5.1–5.6 | Niche features |
