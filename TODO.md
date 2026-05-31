# TODO — 3DDiceRolls Feature Roadmap

Tasks are grouped by **area** (logical dependency) and ordered by priority within each area.
Each task includes: name, description, priority, effort, impact, and dependencies.

---

## Status Legend
- ✅ **DONE** — implemented and verified
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

Use moo's `%{tokenType}` feature for COMPARE tokens (`>`, `>=`, etc.) instead of separate regex tokens. This simplifies the lexer and makes token-type-to-CompareOperator mapping direct.

**Status:** Tried moo.keywords() — API conflict with moo's fast single-char matching (`moo.keywords()` uses `{tokenType: keywordString}` orientation). Not compatible with current lexer architecture. Marked low priority.

---

### 1.6 — Fantasy AGE Stunt Dice (dS) ⬜
**Priority:** Medium | **Effort:** Medium | **Impact:** Low-Medium

Support Fantasy AGE stunt dice mechanic:
- `1dS` — roll 2d6 + a red stunt die; if any two dice match, show stunt points

**Not started.** No `dS` support in lexer, parser, or evaluator.

---

## Area 2: Sound & Physics

### 2.1 — Sound Effects System ⬜
**Priority:** High | **Effort:** Medium | **Impact:** High

Add audio feedback for 3D dice rolls via Cannon-es `body.on('collide')` events. Hook in `physics.ts`, create `AudioManager`.

---

### 2.2 — Reroll Specific Dice ⬜
**Priority:** Medium-High | **Effort:** Medium | **Impact:** Medium

Allow re-rolling individual dice via raycasting click detection or `reroll(diceIdArray)`.

---

## Area 3: UI Overhaul

> Should be done after core parser/roller is stable.

### 3.1 — Visual Overhaul: Dice Button & Panel Positioning ⬜
**Priority:** High | **Effort:** High | **Impact:** High

Replace fixed-position dice button with injected button in the SillyTavern button row. Desktop/mobile responsive.

---

### 3.2 — Dice Pool: Multi-Tab System ⬜
**Priority:** High | **Effort:** High | **Impact:** High
**Dependencies:** 3.1 (Visual Overhaul)

Replace single dice pool with tabbed interface (Standard, DnD, WoD).

---

### 3.3 — Dice Pool: Notation Editor with Live Validation ⬜
**Priority:** High | **Effort:** Medium | **Impact:** High

Add text input field with live validation.

---

### 3.4 — Favorites System ⬜
**Priority:** Medium-High | **Effort:** Medium | **Impact:** Medium

Allow saving/loading favorite dice formulas. Persisted in global extension settings.

---

### 3.5 — History Overhaul: Tabs, Click-to-Reroll, Favorites ⬜
**Priority:** High | **Effort:** Medium | **Impact:** High

Redesign roll history with click-to-reroll, favorites tab, scroll support.

---

### 3.6 — Advantage / Disadvantage Buttons ⬜
**Priority:** High | **Effort:** Low | **Impact:** High
**Dependencies:** 3.2 (Multi-Tab System)

Add one-click ADV (`2d20kh1`) / DIS (`2d20kl1`) buttons.

---

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
                      ├── 3.3 (Notation Editor)
                      ├── 5.2 (Narrative Notation)
                      └── 5.5 (Percentile Variants)

3.1 (Visual Overhaul) ──┬── 3.2 (Multi-Tab)
                         ├── 3.3 (Notation Editor)
                         ├── 3.4 (Favorites)
                         └── 3.5 (History Overhaul)

3.2 (Multi-Tab) ──────────── 3.6 (ADV/DIS)
                             ├── 5.1 (SW Dice)
                             └── 5.2 (Narrative Notation)

2.1 (Sound Effects) ──── 5.4 (Surface Themes)
5.3 (Texture/Theme) ──── 5.4 (Surface Themes)
```

---

## Suggested Execution Order

| Phase | Tasks | Rationale |
|-------|-------|-----------|
| **Phase 0** ✅ | N.1, N.2, N.5, N.6, N.7 + 1.1, 1.2, 1.3, 4.1, 4.2 | Critical bugs + core parser + tests + loading state |
| **Phase 1** | 1.4 | Forced rolls |
| **Phase 2** | 2.1 | Sound effects system |
| **Phase 3** | 3.1, 3.2, 3.3, 3.6 | UI overhaul |
| **Phase 4** | 3.4, 3.5, 2.2 | Favorites, history reroll |
| **Phase 5** | 5.1–5.6 | Niche features |
