# AGENTS.md - 3DDiceRolls

## Project
SillyTavern extension: 3D dice rolling with dice notation (`2d6+2`, `4d20kh3`). React 18, Webpack, SASS, SillyTavern theme vars.

## Key Reference
**Always check `context/st-context.js`** for actual SillyTavern `getContext()` API signatures.

## Commands
| Command | Purpose |
|---------|---------|
| `pnpm install` | Install dependencies |
| `pnpm run build` | Build to `dist/index.js` (webpack, prod) |
| `pnpm run dev` | Watch mode |
| `pnpm run test` | 142 tests (Vitest, 7 files) |
| `pnpm exec tsc --noEmit` | Typecheck |
| `pnpm run lint` / `lint:fix` | ESLint 9 + TS |

> **Important:** When adding new files in `src/components/`, especially tab components, don't forget to add them to the Project Structure section below.

## SillyTavern Integration
- `globalThis.SillyTavern.getContext()` — main API
- Extension docs: https://docs.sillytavern.app/for-contributors/writing-extensions/

## Project Structure
```
src/
├── dice-logic/          # Lexer, parser, evaluator, roller, orchestrator, notation-utils
│   └── renderer/        # Three.js + Cannon-es 3D visualization
├── utils/               # settings, commands, body-injection, events, logging, constants, function-tools, recolor_svg, types-ext
├── components/          # DicePanel, DicePool (~141 lines), dice-config, DiceButton, DiceTab{Standard,Dnd,Wod}, RollHistory, DiceRollerContext, SettingsPanel, 2d_dices/
├── styles/              # SCSS (_variables, index, dice-pool, roll-history, dice-container, extension_settings)
├── index.tsx            # Entry point
└── global.d.ts          # SillyTavern API types
```

## Settings
```typescript
interface DiceRollerSettings {
    enable3dDice: boolean;
    injectResult: boolean;
    sendAsChatMessage: boolean;
    showDiceButton: boolean;  // NOT showDiceButtons (no 's')
    functionTool: boolean;
    primaryDiceColor: string;
    secondaryDiceColor: string;
}
```
Access: `getSettings()` returns copy; `getRollConfig()` returns `{ diceColor, textColor, enable3dDice }`. Both from `src/utils/settings.ts`.

## API Access
```typescript
import { getContext, getSettings, getRollConfig, subscribeSettings } from './utils/settings';
import { debug, info, warn, error } from './utils/logging';
import { executeUnifiedRoll, execute2DRoll, onRollResult, applyAdvantage, applyDisadvantage, handleDiceNotation, parseParts } from './dice-logic';
import { useDiceRoller } from './components/DiceRollerContext';  // inside DiceRollerProvider
```

## Commands
`/roll <notation>` or `/r <notation>`

## External Event API
```typescript
// From any extension:
const ctx = SillyTavern.getContext();
ctx.eventSource.emit('3ddicerolls:roll', { notation: '2d6+3' });

// Direct import:
import { triggerRoll } from './utils/events';
const result = await triggerRoll('1d20+5');
```
Payload: `{ notation: string }`. Uses current extension settings for 3D/2D and output routing.

## UI Injection
- **Dice panel**: `#ddr-dices-container > .drawer` in `.top-settings-holder` (React, toggle drawer)
  - Contains `DiceRollerProvider` → `DicePool` (tabs + notation editor + favorite star) + `RollHistory`
- **Settings**: `#extensions_settings` (React, `inline-drawer` collapsible)
- Settings changes reactive via `DiceRollerProvider` subscribing to `subscribeSettings`

## Component Hierarchy
```
body-injection (manual React roots)
├── SettingsPanel       -> #extensions_settings
└── DicePanel           -> #ddr-dices-container in .top-settings-holder
    └── DiceRollerProvider  (context: settings, history, favorites, notationInput)
        ├── DicePool        (tab switcher + notation editor + Roll/Clear btns + favorite star)
        │   ├── StandardTab (memoized, dice grid via DiceButton)
        │   ├── DndTab      (memoized, dice grid + ADV/DIS via DiceButton)
        │   └── WodTab      (memoized, difficulty slider + d10 via DiceButton, owns wodDifficulty state)
        └── RollHistory     (3 tabs: All/Favorites/Recent, click-to-set, reroll btn, expand)
```

## State Management (Context/Provider)
- `DiceRollerProvider` wraps the entire panel, provides via `useDiceRoller()`:
  - `settings` — reactive `DiceRollerSettings` (subscribes to `subscribeSettings`)
  - `history` — `HistoryEntry[]` per-chat, persisted to `chatMetadata['3d_dice_rolls']`
  - `favorites` — `FavoriteNotation[]` global, persisted to `extensionSettings['3DDiceRolls'].favorites`
  - `recentNotations` — `string[]` global (last 10 unique), persisted to `extensionSettings['3DDiceRolls'].recentNotations`
  - `notationInput` — shared between DicePool editor and RollHistory click-to-set
  - `roll()`, `clearHistory()`, `toggleFavorite()`, `toggleExpand()`, `setActiveTab()`
  - `isFavorite()` uses `favoritesRef` for stable reference (no unnecessary re-renders)
- See `src/components/DiceRollerContext.tsx` and `src/utils/types-ext.ts`

## Dice-Logic Notation Utils
`src/dice-logic/notation-utils.ts` contains pure dice-notation transformation functions extracted from the UI:
- `parseParts(notation)` — splits notation on `+`, uses real `tokenize()` from the lexer (avoids regex divergence)
- `applyAdvantage(prev)` / `applyDisadvantage(prev)` — transforms d20 notation for ADV/DIS
- `handleDiceNotation(prev, btnNotation, increment, wodDifficulty?)` — increment/decrement die counts in the editor
- `makePartRaw(count, sides, modifier)`, `findLastMatch(parts, sides)` — internal helpers

## Extension CSS Variables
Defined in `:root` via `_variables.scss`:
- `--ddr-color-star` — filled star color (uses `var(--SmartThemeQuoteColor)`)
- `--ddr-color-valid` / `--ddr-color-invalid` — valid/invalid border & text colors (derive from `--SmartTheme*` vars)

## Styling
Use `--SmartTheme*` CSS vars from `src/styles/_variables.scss`.

## Logging
```typescript
import { debug, info, warn, error } from './utils/logging';
```
- `debug(...args)` — console only (dev)
- `info(msg, title?, consoleArgs?)` — toastr.success
- `warn(msg, title?, consoleArgs?)` — toastr.warning
- `error(msg, title?, consoleArgs?)` — toastr.error
- All prefix messages with module name automatically.

## Dice-Logic Deep Reference
For modifier evaluation order, lexer/parser architecture tokens & rules, MockRandom consumption order, and Roll Engine vs Render Engine separation, load the dice-logic skill:
```
.opencode/skills/dice-logic/SKILL.md
```

## Context
There are a bunch of useful references laying in `context/` folder:
- `context/dice-box-threejs` - npm lib that realizes 3D dice visualization and rolling + some extra features like sound or texturing
- `context/dice-roller` - Obsidian plugin with similar functionality as our one.
- `context/Extension-Dice` - Example of SillyTavern extension
- `context/original_app_css` - SillyTavern's css files
- `context/st-context.js` — SillyTavern API that plugin can use
- `context/variables.css` — All variables granted by SillyTavern

## Symbols and emojis
The source app uses `Font Awesome 6 Free` to show most of custom symbols. Try to follow the same pattern if the font has needed symbol.

