# Development

---

## Build from Source

```bash
pnpm install       # Install dependencies
pnpm run build     # Build to dist/index.js (webpack, production)
pnpm run dev       # Watch mode
pnpm run test      # Run 142+ tests (Vitest)
pnpm exec tsc --noEmit  # Typecheck
pnpm run lint      # ESLint
pnpm run lint:fix  # ESLint with auto-fix
```

Output: `dist/index.js`

---

## Project Structure

```
src/
├── dice-logic/           # Lexer (moo), parser (recursive descent),
│   │                     # evaluator, roller, orchestrator, notation-utils
│   ├── renderer/         # Three.js + Cannon-es 3D visualization
│   │   ├── renderer.ts   # DiceRenderer class, roll phases
│   │   ├── renderer-pool.ts  # Shared renderer pool (5min inactivity debounce)
│   │   ├── scene.ts      # Three.js scene management
│   │   ├── physics.ts    # Cannon-es physics world
│   │   ├── shapes.ts     # Dice shape definitions (D2-D20, D100)
│   │   ├── geometries.ts # Three.js buffer geometries with face labels
│   │   ├── factory.ts    # Geometry factory (handles fudge overrides)
│   │   └── resource.ts   # ResourceTracker for GPU cleanup
│   ├── index.ts          # Barrel exports
│   ├── types.ts          # All type definitions
│   ├── dice-lexer.ts     # moo-based tokenizer (22 token types)
│   ├── dice-parser.ts    # Recursive descent parser → AST
│   ├── dice-evaluator.ts # AST evaluator (modifier order 1-11)
│   ├── dice-roller.ts    # Public roll API + callback system
│   ├── roll-orchestrator.ts # 2D/3D orchestration
│   ├── notation-utils.ts # UI helpers (parseParts, advantage, etc.)
│   └── utils.ts          # Internal helpers (keep/drop/sort/format)
├── utils/
│   ├── settings.ts       # Settings get/set/subscribe, MixedRollConfig
│   ├── commands.ts       # /roll slash command registration
│   ├── events.ts         # External event API (3ddicerolls:roll)
│   ├── function-tools.ts # AI RollTheDice tool registration
│   ├── body-injection.tsx # React DOM injection + roll side effects
│   ├── logging.ts        # Debug/info/warn/error with toastr
│   ├── recolor_svg.ts    # Color blending utilities
│   ├── constants.ts      # DEFAULT_SETTINGS, MAX_EXPLOSIONS, etc.
│   └── types-ext.ts      # UI-specific types (HistoryEntry, etc.)
├── components/
│   ├── DicePanel.tsx     # Toggle drawer container
│   ├── DiceRollerContext.tsx  # React Context/Provider for state
│   ├── SettingsPanel.tsx # Settings UI (inline-drawer)
│   ├── RollHistory.tsx   # 3-tab history (Chat/Favorites/Recent)
│   ├── dice-config.ts    # Dice button configurations
│   ├── dice_pool/
│   │   ├── DicePool.tsx      # Tab switcher + notation editor
│   │   ├── DiceButton.tsx    # Single die button (memoized)
│   │   ├── DiceTabStandard.tsx  # Standard dice grid
│   │   ├── DiceTabDnd.tsx    # D&D dice grid + ADV/DIS
│   │   └── DiceTabWod.tsx    # WoD difficulty slider + d10
│   └── 2d_dices/
│       ├── index.ts      # Barrel exports (DiceD2-DiceDF)
│       ├── DiceSvg.tsx   # All SVG shapes (factory component)
│       └── utils.tsx     # SvgImage, useDiceColors
├── styles/
│   ├── index.scss        # Aggregator
│   ├── _variables.scss   # CSS custom properties
│   ├── _dice-container.scss
│   ├── _dice-pool.scss
│   ├── _roll-history.scss
│   ├── _extension_settings.scss
│   └── _loading-indicator.scss  # CSS spinner
├── index.tsx             # Extension entry point
└── global.d.ts           # SillyTavern API type definitions
```

---

## Key Architecture Decisions

### Lexer → Parser → Evaluator

1. **Lexer** (moo): 22 token types, converts raw text to tokens
2. **Parser** (recursive descent): Tokens → AST (`NumericLiteral`, `DiceGroup`, `BinaryOp`, `UnaryOp`, `Parenthesized`)
3. **Evaluator**: AST → roll results with modifier execution in fixed order (1-11): Raw → Min → Max → Explode → Reroll → Unique → Keep/Drop → Target → Crit Success → Crit Failure → Sort

### 2D vs 3D Path

- **`execute2DRoll`** — pure math, synchronous, returns immediately
- **`executeUnifiedRoll`** — async, uses 3D physics for supported sides
  {2,4,6,8,10,12,20,100}; falls back to 2D on error or unsupported dice

In 3D mode: physics runs → raw values extracted → reroll/unique/explode
iterated via rethrows → pre-generated values fed back to evaluator for
keep/drop/sort/crit labeling.

### Modifier Execution Order

1. **Roll generation** (raw values or pre-generated)
2. **Min** — floor values
3. **Max** — cap values
4. **Explode** — compound/penetrating with compare point
5. **Reroll** — indefinite or once
6. **Unique** — remove duplicates
7. **Keep/Drop** — keep highest/lowest, drop highest/lowest
8. **Target success/failure** — success counting
9. **Critical success** — mark crits
10. **Critical failure** — mark crit fails
11. **Sort** — asc/desc

### React State Management

`DiceRollerProvider` wraps the entire panel and provides via `useDiceRoller()`:
- `settings` — reactive via `subscribeSettings`
- `history` — per-chat, persisted to `chatMetadata['3d_dice_rolls']`
- `favorites` — global, persisted to `extensionSettings['3DDiceRolls']`
- `recentNotations` — last 10 unique, global persistence
- `notationInput` — shared editor state
- Action functions: `roll()`, `clearHistory()`, `toggleFavorite()`, etc.

---

## External API

### Event-Based

```javascript
const ctx = SillyTavern.getContext();
ctx.eventSource.emit('3ddicerolls:roll', { notation: '2d6+3', quiet: false });
```

### Direct Import

```typescript
import { triggerRoll } from './utils/events';
const result = await triggerRoll('1d20+5');
```

### Payload

```typescript
interface DiceRollEventPayload {
    notation: string;   // required
    quiet?: boolean;    // optional, default false
}
```

### RollResult

```typescript
interface RollResult {
    notation: string;
    diceGroups: DiceGroupResult[];
    total: number;
    details: string;     // "(4+3+6) + (2)" style
    formatted: string;   // "3d6+1d4: (4+3+6) + (2) = 15"
}
```

---

## Build Output

The extension builds to a single file `dist/index.js` that SillyTavern loads
as an extension script.

---

## Testing

142+ tests across 7 files (Vitest):

- Parser tests (55) — tokenization, AST construction, edge cases
- Evaluator basic rolls (11)
- Evaluator combined expressions (8)
- Evaluator explosion (8)
- Evaluator modifiers (20)
- Evaluator reroll (7)
- Integration tests (7)

Run with:

```bash
pnpm run test
```
