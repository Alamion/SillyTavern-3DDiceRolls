# TODO — 3DDiceRolls Feature Roadmap

Tasks are grouped by **area** (logical dependency) and ordered by priority within each area.
Each task includes: name, description, priority, estimated effort, impact, and dependencies.

---

## Area 1: Core Parser & Roller

> These change the fundamental dice parsing and rolling logic. All UI features depend on these being correct.

### 1.1 — Lexer-Based Parser Replacement
**Priority:** Medium-High | **Effort:** High | **Impact:** High
**Dependencies:** None (foundational)

Replace the current regex-based `dice-parser.ts` with a proper lexer + shunting-yard parser, modeled after the Obsidian dice-roller's `lexer.ts` (Moo-based tokenizer). This enables:
- Full order-of-operations with parentheses: `(2d6+3)*2`, `1d20+(1d4+1)d6`
- Multiplication, division, modulo, exponent operators: `*`, `/`, `%`, `^`
- Chained modifiers on a single die group: `4d6r1kh3`
- Foundation for all subsequent notation features (custom faces, conditions, etc.)

**Acceptance criteria:**
- All existing notation (`2d6+3`, `4d20kh3`, `2d6!!`, `2d6r1`) continues to work
- Parenthesized expressions parse and evaluate correctly
- Full arithmetic operators work with proper precedence
- Parser exports same `ParseResult` interface (or updated one)

---

### 1.2 — Custom Face Values & Custom Range Dice
**Priority:** High | **Effort:** Medium | **Impact:** High
**Dependencies:** 1.1 (Lexer-Based Parser)

Support explicit face value lists and range shorthand in notation:
- `1d[1,3,5,7,9]` — roll from explicit list
- `1d[3,5]` — roll from range (equivalent to `1d[3,4,5]`)
- `2d[2,4,6,8,10,12]` — multiple dice with custom faces

**Implementation notes:**
- Parser must recognize `[...]` syntax and produce a `customFaces` field on `DiceGroup`
- Roller must use `customFaces` array instead of `1..sides` for value generation
- 3D renderer: custom-faced dice fall back to 2D (no matching geometry) unless faces map to a standard die

**Acceptance criteria:**
- `1d[1,3,5]` returns only 1, 3, or 5
- `1d[3,5]` returns 3, 4, or 5
- Roll history shows the custom face notation
- Invalid ranges (e.g., `1d[5,3]`) produce a clear error

---

### 1.3 — Conditional Modifiers
**Priority:** Medium-High | **Effort:** High | **Impact:** High
**Dependencies:** 1.1 (Lexer-Based Parser)

Support condition-based filtering and counting on dice:
- `5d6>3` — count how many dice are greater than 3 (Shadowrun/World of Darkness style)
- `5d6>=4` — count successes at threshold 4
- `5d6=6` — count exact matches
- `5d6!=1` — count non-failures
- Conditions can chain: `5d6>3kh2` — count successes, keep highest 2

**Implementation notes:**
- Add `condition?: { operator: '>'|'>='|'<'|'<='|'='|'!='; value: number }` to `DiceModifiers`
- When a condition is present, the group's `sum` becomes the count of matching dice instead of the arithmetic sum
- Display format changes: `5d6>3: [4, 2, 6, 1, 5] = 3 successes`

**Acceptance criteria:**
- `5d6>3` correctly counts dice above 3
- All six operators work (`>`, `>=`, `<`, `<=`, `=`, `!=`)
- Conditions compose with other modifiers (`kh`, `dl`, etc.)
- WoD tab (see 4.2) uses this under the hood

---

### 1.4 — Predetermined / Forced Rolls (`@` notation)
**Priority:** High | **Effort:** Medium | **Impact:** Medium
**Dependencies:** 1.1 (Lexer-Based Parser)

Support forcing specific outcomes via `@` notation:
- `6d6@4,4,4,4,4,4` — all six dice show 4
- `2d20@20,1` — first shows 20, second shows 1

**Implementation notes:**
- Parser recognizes `@values` suffix and stores forced values on `DiceGroup`
- 3D renderer: run full physics simulation, then swap face materials post-simulation (see `dice-box-threejs` `swapDiceFace` method)
- 2D roller: directly use forced values instead of random
- Result metadata includes `reason: 'forced'` for tracking

**Acceptance criteria:**
- Forced values always appear in the result
- 3D animation still plays naturally (physics runs normally, only visual result is swapped)
- D4 uses special rotation-based swap (different face topology)
- Mismatched value count (e.g., `2d6@1,2,3`) produces a clear error

---

### 1.5 — Fudge / Fate Dice (dF)
**Priority:** High | **Effort:** Low | **Impact:** Medium
**Dependencies:** 1.1 (Lexer-Based Parser)

Support Fudge/Fate dice notation:
- `4dF` — roll 4 fudge dice (each returns -1, 0, or +1)
- Display: `[+, 0, -, +] = +1`

**Implementation notes:**
- Parser recognizes `dF` / `df` as a special die type
- 2D roller: returns random value from `[-1, 0, +1]`
- 3D renderer: reuse D6 geometry, label faces as `-`, `-`, `0`, `0`, `+`, `+`
- Add `DiceDF` 2D component (already exists in `2d_dices/`)
- Sum of fudge dice can be negative — display must handle this

**Acceptance criteria:**
- `4dF` returns values between -4 and +4
- 3D fudge dice display `-`, `0`, `+` on faces
- Roll history shows individual face symbols and total

---

### 1.6 — Fantasy AGE Stunt Dice (dS)
**Priority:** Medium | **Effort:** Medium | **Impact:** Low-Medium
**Dependencies:** 1.1 (Lexer-Based Parser)

Support Fantasy AGE stunt dice mechanic:
- `1dS` — roll 2d6 + a red stunt die; if any two dice match, show stunt points
- Display: `[3, 5, 3] = 11 (stunt: 3)` — doubles on 3, stunt die shows 3

**Implementation notes:**
- Stunt die is a D6 with special coloring (red in 3D)
- When doubles occur, stunt points = value of the stunt die
- No doubles = no stunt points
- Display format distinguishes regular dice from stunt die

**Acceptance criteria:**
- `1dS` always rolls 3 dice (2 regular + 1 stunt)
- Stunt points shown only when doubles occur
- Stunt die visually distinct in 3D (red color)

---

## Area 2: Sound & Physics

### 2.1 — Sound Effects System
**Priority:** High | **Effort:** Medium | **Impact:** High
**Dependencies:** None (can be done in parallel with Area 1)

Add audio feedback for 3D dice rolls:
- **Surface sounds**: dice hitting the table (felt, wood, metal variants)
- **Dice-hit sounds**: dice colliding with each other (plastic, wood, metal, coin variants)
- Velocity-based volume scaling (harder hits = louder)
- Debounce logic to prevent audio spam (minimum 10ms between sounds, skip collisions below velocity threshold 250)

**Implementation notes:**
- Hook into Cannon-es `body.on('collide')` events in `physics.ts`
- Create `AudioManager` module in `src/utils/` with preload, play, and volume control
- Sound files stored in `public/sounds/` (can be bundled or loaded from CDN)
- Start with a minimal set (1 surface + 1 dice-hit pool), expand later

**Settings to add:**
- `enableSounds: boolean` (default: `false`)
- `soundVolume: number` (default: `50`, range 0-100)
- `surfaceTheme: string` (default: `'felt'`)

**Acceptance criteria:**
- Sounds play during 3D rolls when enabled
- Volume scales with collision velocity
- No audio spam during rapid collisions
- Sounds respect volume setting (0 = silent)
- Graceful fallback when audio files fail to load

---

### 2.2 — Reroll Specific Dice
**Priority:** Medium-High | **Effort:** Medium | **Impact:** Medium
**Dependencies:** None (can be done in parallel)

Allow re-rolling individual dice from the 3D scene:
- Click a specific die in the 3D view to re-roll it
- Or call `reroll(diceIdArray)` programmatically
- Re-rolled dice wake up, get new velocity `(0, 0, 3000)` and angular velocity `(25, 25, 25)`
- Track reroll count per die, result reason = `'reroll'`

**Implementation notes:**
- Add raycasting to detect clicks on 3D dice meshes
- Each die gets a unique ID tracked in `DiceFactory`
- `reroll()` method wakes selected dice, applies new toss vector
- Separate callback: `onRerollComplete`

**Acceptance criteria:**
- Clicking a die in the 3D view re-rolls only that die
- Other dice remain stationary
- Result updates correctly after reroll
- Reroll reason tracked in result metadata

---

### 2.3 — Adaptive Camera
**Priority:** Medium-High | **Effort:** Low | **Impact:** Medium
**Dependencies:** None

Adjust camera distance based on dice count to ensure all dice are visible:
- < 6 dice: close view (current FOV)
- 6-9 dice: medium view (pull back)
- > 9 dice: far view (pull back further)

**Implementation notes:**
- Simple conditional in `scene.ts` `SceneManager` when setting up the camera
- Adjust camera Z position or FOV based on `diceList.length`

**Acceptance criteria:**
- Rolling `10d6` shows all dice within viewport
- Rolling `1d20` maintains current close-up view
- No clipping or off-screen dice at any count

---

## Area 3: Slash Commands & Events

### 3.1 — Slash Command Quiet Mode
**Priority:** High | **Effort:** Low | **Impact:** Medium
**Dependencies:** None

Add `quiet=true` named argument to `/roll` and `/r` commands:
- `/roll quiet=true 1d20` — rolls silently, returns result for piping
- Enables command chaining: `/roll quiet=true 1d20 | /echo`
- Without `quiet`, behavior is unchanged (respects `injectResult` and `sendAsChatMessage` settings)

**Implementation notes:**
- Add named argument `quiet` (boolean, optional) to `SlashCommandArgument` list in `commands.ts`
- When `quiet=true`, skip `injectResult` and `sendAsChatMessage` logic
- Return value from callback enables SillyTavern command piping

**Acceptance criteria:**
- `/roll quiet=true 2d6` produces no chat output or textarea injection
- Result is returned from callback for piping
- `/roll 2d6` (without quiet) works exactly as before

---

## Area 4: UI Overhaul

> The largest change set. Should be done after core parser/roller is stable, since UI depends on correct roll results.

### 4.1 — Visual Overhaul: Dice Button & Panel Positioning
**Priority:** High | **Effort:** High | **Impact:** High
**Dependencies:** None (but should coordinate with 4.2, 4.3, 4.4)

Replace the current fixed-position dice button with an injected button in the SillyTavern button row:
- **Desktop**: Dice button appears inline with other extension buttons (e.g., in `#extension_menu` or the row of wand buttons)
- **Behavior**: Clicking opens the corresponding panel(s) based on settings — dice pool, history, or both simultaneously
- **Persistence**: The trigger button does NOT disappear when panels are open
- **Mobile**: Button stays as a floating/fixed element (can't fit in row), but with a more native-looking style matching SillyTavern's mobile UI

**Implementation notes:**
- Change injection target from `document.body` to the appropriate ST button container
- Panels become anchored to the button position (not fixed bottom-left/top-left)
- Mobile detection via `window.innerWidth` or user agent
- SCSS needs separate desktop/mobile layouts

**Acceptance criteria:**
- Dice button appears in the extension button row on desktop
- Clicking opens configured panel(s)
- Button remains visible while panels are open
- Mobile shows a styled floating button
- Settings control which panel(s) open on click

---

### 4.2 — Dice Pool: Multi-Tab System
**Priority:** High | **Effort:** High | **Impact:** High
**Dependencies:** 4.1 (Visual Overhaul), 1.3 (Conditional Modifiers)

Replace the single dice pool with a tabbed interface:

**Tab: Standard** (default)
- D2, D4, D6, D8, D10, D12, D20, D100
- Current behavior preserved

**Tab: DnD**
- D4, D6, D8, D10, D12, D20 (no D2)
- ADV / DIS buttons (roll `2d20kh1` / `2d20kl1`)
- Natural 1 shown as crimson-red, natural 20 as emerald-green (both in 2D SVG and 3D)

**Tab: WoD (World of Darkness)**
- Only D10 dice button
- Difficulty scale selector (default: 6)
- Counts successes instead of summing (`Nd10>=difficulty`)
- Optional: "1 = subtract 1 from total" toggle
- Optional: "10 = explode" toggle

**Future tabs (placeholders):**
- SW (Star Wars) — for narrative dice (see 5.1, 5.2)
- Other system tabs as needed

**Implementation notes:**
- Each tab defines its own dice set, default notation patterns, and roll behavior
- WoD tab uses conditional modifiers (1.3) under the hood
- Tab state persists in settings

**Settings to add:**
- `defaultTab: 'standard' | 'dnd' | 'wod'` (default: `'standard'`)
- `wodDifficulty: number` (default: `6`)
- `wodOnesSubtract: boolean` (default: `false`)
- `wodTensExplode: boolean` (default: `false`)

**Acceptance criteria:**
- Tabs switch correctly with distinct dice sets
- DnD tab: ADV/DIS buttons work, 1/20 color highlighting works
- WoD tab: difficulty slider works, success counting works, optional toggles work
- Tab selection persists across sessions

---

### 4.3 — Dice Pool: Notation Editor with Live Validation
**Priority:** High | **Effort:** Medium | **Impact:** High
**Dependencies:** 4.1 (Visual Overhaul), 1.1 (Lexer-Based Parser)

Add a text input field below the dice buttons for manual notation entry:
- User can type any dice formula: `2d6+3d8+5`, `4d6kh3`, `1d[1,3,5]`
- Live validation: green border = valid, red border = invalid
- Roll button is disabled when notation is invalid
- Pressing Enter triggers the roll
- Clicking dice buttons appends to the notation field (not just the pool)

**Implementation notes:**
- Use `validateNotation()` from parser for live checking
- Debounce validation (200ms) to avoid excessive parsing
- Show error tooltip on invalid notation

**Acceptance criteria:**
- Typing `2d6+3` shows valid state, Roll button enabled
- Typing `2d+3` shows invalid state, Roll button disabled
- Clicking D6 appends `d6` to the field
- Enter key triggers roll
- Error message shown for invalid notation

---

### 4.4 — Favorites System
**Priority:** Medium-High | **Effort:** Medium | **Impact:** Medium
**Dependencies:** 4.1 (Visual Overhaul)

Allow users to save and quickly access favorite dice formulas:
- "Star" button in the dice pool saves the current notation as a favorite
- Favorites tab in the dice pool shows saved formulas
- Click a favorite to load it into the notation editor
- Favorites are persisted in SillyTavern's global extension settings (not chat-scoped)
- `/fav <name> <notation>` — save a favorite via command
- `/fav <name>` — roll a saved favorite
- `/fav list` — list all favorites

**Implementation notes:**
- Store as `Record<string, string>` in extension settings: `{ "My Attack": "2d6+3d8+5", ... }`
- Favorites are global (persist across chats)
- UI: small star icon next to the notation editor, favorites tab in pool

**Acceptance criteria:**
- Saving a favorite persists across page reloads
- Clicking a favorite loads it into the editor
- `/fav` commands work as described
- Favorites can be deleted/renamed

---

### 4.5 — History Overhaul: Tabs, Click-to-Reroll, Favorites
**Priority:** High | **Effort:** Medium | **Impact:** High
**Dependencies:** 4.1 (Visual Overhaul), 4.4 (Favorites System)

Redesign the roll history component with multiple tabs:

**Tab: Recent** (current view)
- Shows last 10 rolls (latest first), latest highlighted
- **Click any entry to re-roll** the same notation
- Clear button

**Tab: Favorites**
- Shows rolls that have been marked as favorites (separate from formula favorites — these are specific past rolls)
- Star button on each history entry to promote it
- Persisted in global metadata

**Implementation notes:**
- History entries become clickable buttons
- Click triggers `handleRollEvent({ notation: entry.notation })`
- Favorite rolls stored separately from favorite formulas
- Increase history limit from 10 to 20-50 visible entries with scroll

**Acceptance criteria:**
- Clicking a history entry re-rolls the same notation
- New result appears at top of history
- Star button on entries promotes to favorites tab
- Favorites tab persists across sessions
- Both tabs scroll properly

---

### 4.6 — Advantage / Disadvantage Buttons
**Priority:** High | **Effort:** Low | **Impact:** High
**Dependencies:** 4.2 (Multi-Tab System) — part of DnD tab

Add one-click ADV/DIS buttons in the DnD tab:
- **ADV**: rolls `2d20kh1` (roll 2d20, keep highest)
- **DIS**: rolls `2d20kl1` (roll 2d20, keep lowest)
- Visually distinct buttons (green for ADV, red for DIS)
- Can be combined with modifiers (e.g., ADV + 5 = `2d20kh1+5`)

**Acceptance criteria:**
- ADV button rolls `2d20kh1`
- DIS button rolls `2d20kl1`
- Buttons are only visible in DnD tab
- Visual distinction is clear

---

## Area 5: Advanced / Niche Features

### 5.1 — Star Wars RPG Dice
**Priority:** Medium | **Effort:** High | **Impact:** Niche (high for SW players)
**Dependencies:** 4.2 (Multi-Tab System) — SW tab

Support Star Wars RPG dice systems using ligature-based symbols:
- SWRPG (Genesys): Ability (d8), Difficulty (d8), Proficiency (d12), Challenge (d12), Boost (d6), Setback (d6), Force (d12)
- Symbols: Success, Failure, Advantage, Threat, Triumph, Despair, Light Side, Dark Side
- **Approach**: Redraw symbols in Figma, export as font ligatures (not a font file with glyphs — actual ligature substitutions)

**Implementation notes:**
- Each die type has custom face labels using ligature characters
- 3D renderer: canvas textures render ligature characters
- Results parsed into symbol counts: `[Success, Success, Advantage] = 2 success, 1 advantage`
- SW tab in dice pool (see 4.2)

**Acceptance criteria:**
- All 7 Genesys die types roll correctly
- Symbols display correctly in 2D and 3D
- Results show symbol counts, not numeric values
- SW tab available in dice pool

---

### 5.2 — Genesys / SWRPG Narrative Dice (Notation)
**Priority:** Medium | **Effort:** High | **Impact:** Niche (high for SW players)
**Dependencies:** 1.1 (Lexer-Based Parser), 5.1 (SW RPG Dice)

Support narrative dice notation in the parser:
- `GgPpYyRrBbSsWw` shorthand (from Obsidian dice-roller):
  - `G` = Ability (green d8), `g` = count
  - `P` = Proficiency (gold d12), `p` = count
  - `Y` = Difficulty (purple d8), `y` = count
  - `R` = Challenge (red d12), `r` = count
  - `B` = Boost (cyan d6), `b` = count
  - `S` = Setback (black d6), `s` = count
  - `W` = Force (white d12), `w` = count

**Acceptance criteria:**
- `2g1p` rolls 2 Ability + 1 Proficiency dice
- Results show symbol breakdown
- Compatible with SW tab

---

### 5.3 — Texture / Theme System
**Priority:** Low-Medium | **Effort:** High | **Impact:** High (visual)
**Dependencies:** None (can be done anytime)

Add texture overlays and material types for 3D dice:
- **Textures**: clouds, fire, marble, wood, metal, glitter, skulls, etc. (applied via canvas compositing with blend modes)
- **Material types**: plastic, metal, wood, glass (affects Three.js roughness/metalness)
- **Color presets**: 40+ presets (damage types, dragons, factions, etc.)
- **Bump maps**: optional depth textures for realism

**Implementation notes:**
- Extend `geometries.ts` texture generation to composite overlay textures with blend modes (`multiply`, `destination-in`)
- Cache textures by composite key to avoid regeneration
- Settings: `diceTexture`, `diceMaterial`, `colorPreset`

**Acceptance criteria:**
- Selecting a texture applies it to 3D dice
- Material type changes visual appearance (metallic, wooden, etc.)
- Color presets change dice colors instantly
- Textures are cached for performance

---

### 5.4 — Surface Themes (Table / Tray)
**Priority:** Low | **Effort:** Low-Medium | **Impact:** Medium
**Dependencies:** 5.3 (Texture/Theme System) — partially, 2.1 (Sound Effects)

Configurable table surfaces for the 3D scene:
- Green felt, red felt, mahogany wood, stainless steel, cyberpunk metal
- Affects shadow plane appearance
- Auto-selects matching sound material (felt surface → felt sounds)

**Acceptance criteria:**
- Surface theme changes the table appearance
- Surface theme auto-selects matching sound material
- At least 5 surface options available

---

### 5.5 — Percentile Variants (d66%, d7367%)
**Priority:** Low | **Effort:** Low | **Impact:** Low
**Dependencies:** 1.1 (Lexer-Based Parser)

Support concatenated percentile dice:
- `d66` — roll 2d6, concatenate results (e.g., 3 and 5 = 35)
- `d7367` — custom digit ranges (e.g., first die d7, second d3, etc.)

**Acceptance criteria:**
- `d66` returns values 11-66
- Custom digit ranges work correctly
- Display shows individual dice and concatenated result

---

### 5.6 — Note-Based Rollers (for Docusaurus MDX)
**Priority:** Medium | **Effort:** High | **Impact:** Medium (for future Docusaurus project)
**Dependencies:** None (separate project context)

Roll from external data sources (notes, tables, tags, lines):
- `[[Note]]` — random block from a note
- `[[Note^block-id]]` — random cell from a table
- `#tag` — random block from all notes with a tag
- `[[Note]]|line` — random line from a note

**Implementation notes:**
- This is for a future Docusaurus MDX project, not SillyTavern
- Requires a data source adapter interface
- Keep the roller architecture extensible to support non-random-number rollers

**Acceptance criteria:**
- Architecture supports pluggable data sources
- At least one note-based roller works in Docusaurus context

---

## Dependency Graph

```
1.1 (Lexer Parser) ──┬── 1.2 (Custom Faces)
                     ├── 1.3 (Conditions)
                     ├── 1.4 (Forced Rolls)
                     ├── 1.5 (Fudge Dice)
                     ├── 1.6 (Stunt Dice)
                     ├── 4.3 (Notation Editor)
                     ├── 5.2 (Narrative Notation)
                     └── 5.5 (Percentile Variants)

1.3 (Conditions) ──── 4.2 (WoD Tab)

4.1 (Visual Overhaul) ──┬── 4.2 (Multi-Tab)
                        ├── 4.3 (Notation Editor)
                        ├── 4.4 (Favorites)
                        └── 4.5 (History Overhaul)

4.2 (Multi-Tab) ────────┬── 4.6 (ADV/DIS)
                        ├── 5.1 (SW Dice)
                        └── 5.2 (Narrative Notation)

2.1 (Sound Effects) ──── 5.4 (Surface Themes)

5.3 (Texture/Theme) ──── 5.4 (Surface Themes)
```

---

## Suggested Execution Order

| Phase | Tasks | Rationale |
|-------|-------|-----------|
| **Phase 1** | 1.1, 1.2, 1.5 | Core parser foundation + most requested dice types |
| **Phase 2** | 1.3, 1.4, 2.1, 3.1 | Conditional logic, forced rolls, sounds, quiet mode — all independent |
| **Phase 3** | 4.1, 4.2, 4.3, 4.6 | UI overhaul + multi-tab + notation editor + ADV/DIS |
| **Phase 4** | 4.4, 4.5, 2.2, 2.3 | Favorites, history reroll, reroll dice, adaptive camera |
| **Phase 5** | 1.6, 5.1, 5.2 | Stunt dice, SW RPG dice, narrative notation |
| **Phase 6** | 5.3, 5.4, 5.5, 5.6 | Texture system, surface themes, percentile variants, note rollers |
