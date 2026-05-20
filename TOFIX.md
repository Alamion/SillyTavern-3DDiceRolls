# Grand Code Review: SillyTavern-3DDiceRolls

## Part 2: Architecture Review

### 2.1 The Biggest Architectural Crutch: Mixed Roll Orchestrator

**Problem**: `roll-orchestrator.ts` does a "mixed roll" where it runs 3D animation for supported dice, runs a parallel 2D roll for the same notation, then **merges** results by replacing 2D values with 3D values for supported dice types. This is fundamentally flawed:

1. **Modifiers are applied twice**: The 2D roller applies modifiers (kh/kl/explode/reroll), then the orchestrator **re-applies** keep/drop to the 3D values. Explode and reroll modifiers are **completely ignored** for 3D dice — the 3D animation just produces raw values, and the 2D roll's explode/reroll results are discarded.

2. **Race condition potential**: The 3D animation is async (waits for physics to settle), while the 2D roll is sync. The orchestrator awaits 3D first, then runs 2D. If 3D fails, it falls back to 2D — but the user has already watched a 3D animation that produced no result.

3. **D100 double-dice hack**: Each logical d100 creates 2 physical d10 dice, then the factory combines them. But the orchestrator's `results3D` Map uses `sides` as the key — so if you roll `2d100`, you get 4 physical d10s all keyed under `sides=10`, and the grouping logic breaks.

**How it should be**: The dice parser should produce an AST. The roller should evaluate the AST, and for each dice group, decide whether to use 3D or 2D. 3D dice should support modifiers natively (or at minimum, the orchestrator should not re-apply them — it should use the raw 3D values as-is and let the parser handle modifiers separately).

### 2.2 Parser is Regex-Based, Not Lexer-Based

**Problem**: The TODO.md and the reference dice-roller architecture both point to this. The current parser (`dice-parser.ts`) uses a single regex to match dice patterns and iterates through the string. This means:

- No operator precedence (`2d6+3*2` won't work correctly — no `*` or `/` support)
- No parentheses support
- No custom faces (`[1,2,3]d`)
- No fudge dice (`4dF`)
- No narrative dice
- No conditional modifiers

**Reference comparison**: The Obsidian dice-roller uses `moo` lexer → token stream → shunting-yard parser → postfix AST → stack-based evaluator. This is the industry-standard approach for dice notation (used by Dice-Notation libraries, Roll20, etc.).

**Recommendation for TODO items**: Implementing custom faces, conditional modifiers, and forced rolls from the TODO will be **nearly impossible** with the current regex parser. A lexer-based parser is a prerequisite for most TODO items.

### 2.3 No Separation Between "Roll Engine" and "Render Engine"

**Problem**: The 3D renderer (`DiceRenderer`) is tightly coupled to the roll result determination. The renderer creates shapes, runs physics, and **determines the result** via `getUpsideValue()`. This means:

- You cannot pre-determine a roll result and animate it (forced rolls)
- You cannot re-roll a single die without re-running the entire animation
- Sound effects (from TODO) would need to be bolted onto the renderer's animation loop

**Reference comparison**: `dice-box-threejs` has a `swapDiceFace()` method that changes the material indices on a settled die to show a desired result. This enables forced rolls. The Obsidian dice-roller separates `DiceRoller` (logic) from `DiceRenderer` (visuals) — the roller can use 3D values OR sync RNG, and the renderer is just a visualization layer.

**Recommendation**: The renderer should be a pure visualization layer. The roll engine should produce values, and the renderer should animate those values (or animate freely and report what it sees, depending on mode).

### 2.4 Settings Management is Fragile

**Problem**: Settings are stored in a module-level variable (`currentSettings` in `settings.ts`) and persisted to `context.extensionSettings[MODULE_NAME]`. But:

- The `body-injection.tsx` polls `getSettings()` every 500ms to detect changes
- The `SettingsPanel.tsx` polls every 100ms
- There's no event emitted when settings change
- If another extension modifies `extensionSettings`, this extension won't know

**Recommendation**: Use a proper state management pattern. Even a simple `EventEmitter` or SillyTavern's own event system would eliminate both polling loops.

### 2.5 UI Components are Not React-Idiomatic

**Problem**:
- `SettingsPanel` and `DicePool` call `getSettings()` directly inside render, bypassing React's state management. This means they won't re-render when settings change through external means (only through the polling hack).
- `RollHistory` receives `rolls` as a prop but also calls `getSettings()` inside render for colors.
- `body-injection.tsx` manually creates React roots and calls `.render()` imperatively instead of using a proper app-level component tree.

**Recommendation**: Create a `SettingsProvider` context that wraps the entire app. All components consume settings through `useContext`. Settings changes trigger a single re-render of the provider, which cascades to all consumers.

### 2.6 No Test Infrastructure

The project has zero tests. Given the complexity of:
- Dice notation parsing
- Modifier application order (reroll → explode → keep/drop → sort)
- 3D result determination
- Settings persistence

This is a significant risk. The reference dice-roller has a full test suite.

### 2.7 Resource Management

**Problem**: The `ResourceTracker` in `renderer/resource.ts` is good, but:
- `DiceRenderer.dispose()` is called after a 2-second timeout in `factory.ts:118-121`, but if the user initiates another roll before that timeout, the old renderer is disposed and a new one created — potentially mid-animation.
- Canvas textures created in `geometries.ts` are never explicitly disposed — they rely on `ResourceTracker` to catch them, but the tracker only disposes what it explicitly tracks.

### 2.8 Architecture Recommendations for TODO Items

Given the TODO.md items, here's the recommended refactoring order:

**Phase 1: Foundation (prerequisites for everything else)**
1. Replace regex parser with lexer-based parser (moo or hand-written)
2. Extract duplicated code (`formatModifiers`, `applyKeepDrop`, dice class boilerplate)
3. Replace polling with event-based settings management

**Phase 2: Core improvements**
4. Decouple renderer from roll logic — renderer becomes visualization-only
5. Add proper texture/material caching
6. Fix the `checkRollFinished` logic bug

**Phase 3: TODO features**
7. Sound effects (needs renderer decoupling first)
8. Forced rolls (needs renderer decoupling first)
9. Custom faces (needs lexer-based parser first)
10. Conditional modifiers (needs lexer-based parser first)
11. 3D d2 dice (needs geometry work, but architecture is ready)

### 2.9 What the Reference Projects Do Better

**dice-box-threejs**:
- Proper initialization lifecycle (`initialize()` async method)
- Sound system with collision events
- `swapDiceFace()` for forced rolls
- Theme system with colorsets, textures, materials
- Adaptive timestep for physics
- Proper resize handling with debounce

**Obsidian dice-roller**:
- Lexer-based parsing with moo
- Stack-based expression evaluation
- Clean separation: Lexer → Parser → Roller → Renderer
- Modifier system attached to individual dice rollers
- Support for fudge, narrative, custom faces, tables
- Full test suite

**What we should borrow**:
- The lexer → parser → roller → renderer pipeline from Obsidian
- The sound/collision event system from dice-box-threejs
- The `swapDiceFace` concept for forced rolls
- The theme/colorset system for configurable dice appearances

---

## Summary

| Category | Severity | Count |
|----------|----------|-------|
| Code duplication | High | 6 instances |
| Logic bugs | High | 4 |
| Performance issues | Medium | 4 |
| Magic numbers | Low | 10+ |
| Architecture crutches | High | 5 major |

The project works but carries significant technical debt. The two biggest architectural issues are: (1) the regex parser limiting future feature work, and (2) the mixed 3D/2D roll orchestrator that applies modifiers incorrectly and couples rendering to logic. Addressing these two would unlock 80% of the TODO items.
