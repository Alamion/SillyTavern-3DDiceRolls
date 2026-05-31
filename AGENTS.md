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
| `pnpm run test` | 116 tests (Vitest, 7 files) |
| `pnpm exec tsc --noEmit` | Typecheck |
| `pnpm run lint` / `lint:fix` | ESLint 9 + TS |

## SillyTavern Integration
- `globalThis.SillyTavern.getContext()` — main API
- Extension docs: https://docs.sillytavern.app/for-contributors/writing-extensions/

## Project Structure
```
src/
├── dice-logic/          # Lexer, parser, evaluator, roller, orchestrator
│   └── renderer/        # Three.js + Cannon-es 3D visualization
├── utils/               # settings, commands, body-injection, events, logging, constants, function-tools, recolor_svg
├── components/          # SettingsPanel, DicePool, RollHistory, 2d_dices/
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
    showDiceButtons: boolean;
    showRollHistory: boolean;
    functionTool: boolean;
    primaryDiceColor: string;
    secondaryDiceColor: string;
}
```
Access: `getSettings()` returns copy; `getRollConfig()` returns `{ diceColor, textColor, enable3dDice }`. Both from `src/utils/settings.ts`.

## API Access
```typescript
import { getContext, getSettings, getRollConfig } from './utils/settings';
import { debug, info, warn, error } from './utils/logging';
import { executeUnifiedRoll, execute2DRoll, onRollResult } from './dice-logic';
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
- **Dice buttons**: `#dices-container` in `document.body` (bottom-left, React)
- **Roll history**: `#roll-history-container` in `document.body` (top-left, React)
- **Settings**: `#extensions_settings` (React, `inline-drawer` collapsible)
- Settings changes polled in `body-injection.tsx` for immediate show/hide.

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
