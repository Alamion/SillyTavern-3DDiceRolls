# AGENTS.md - 3DDiceRolls

## Project

SillyTavern extension: 3D dice rolling with dice notation (`2d6+2`, `4d20kh3`). React 18, Webpack, SASS, SillyTavern theme vars.

## Key Reference

**Always check `context/SillyTavern/public/scripts/st-context.js`** for actual SillyTavern `getContext()` API signatures. `context/` is git-ignored; populate it with `scripts/setup-context.sh`.

## Commands

| Command                      | Purpose                                                                     |
| ---------------------------- | --------------------------------------------------------------------------- |
| `pnpm install`               | Install dependencies                                                        |
| `pnpm run build`             | Build to `dist/index.js` (webpack, prod); copies `sounds/` → `dist/sounds/` |
| `pnpm run dev`               | Watch mode                                                                  |
| `pnpm run test`              | Vitest suite                                                                |
| `pnpm run typecheck`         | Typecheck (`tsc --noEmit`)                                                  |
| `pnpm run lint` / `lint:fix` | ESLint 9 + TS                                                               |
| `pnpm run validate:backlog`  | Check `specs/ROADMAP.md`, `specs/TODO.md`, `specs/TOFIX.md` format          |

All five gates (`typecheck`, `lint`, `test`, `build`, `validate:backlog`) MUST pass before any commit (constitution IV/V).

> **Important:** When adding new files in `src/components/`, especially tab components, don't forget to add them to the Project Structure section below.

## Constitution & Spec Workflow

`.specify/memory/constitution.md` (v1.0.0) governs the project — principles I–X:

1. Holistic, modular plugin (dice-logic / renderer / components / utils adapters)
2. App API first — cache context functions, read data fields (`chatMetadata`, …) fresh; emitter has `on`/`once`/`removeListener` (no `off`)
3. Pure, deterministic dice core — no DOM/ST in `dice-logic/` (outside `renderer/`); limits are engine invariants; every input is untrusted
4. Strict TypeScript, lint & format discipline
5. Risk-proportional testing — bug fixes start with a failing regression test
6. Stable delivered contracts (notation, output formats, `/roll`, `{{ddroll}}`, `3ddicerolls:*`, `RollTheDice`, persistence)
7. Graceful, observable degradation — no silent fallbacks, no toast spam
8. Native, accessible, lightweight experience
9. Spec-driven execution with a maintenance path
10. Language policy — conversation in any language; all artifacts English-only

Features and contract changes go through speckit (`/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`); feature specs live in `specs/NNN-*`.

## Maintenance changes

A change may skip the spec only if it adds **no new user capability** and alters **no delivered contract** (see the constitution's "Delivered Contracts" table). When unclear, write a spec. Maintenance changes:

- are tracked as a `specs/TOFIX.md` (defect) or `specs/TODO.md` (task) entry;
- start with a failing regression test where the behavior is testable;
- remove the TOFIX entry / mark the TODO entry done in the same change;
- get one user-facing line in `CHANGELOG.md` under the release.

The maintenance path shortens documentation, never verification.

## Backlog (`specs/`)

- `specs/ROADMAP.md` — product paths (slugs, status, scope) and the **release plan** mapping `T-###` / `F-###` to versions.
- `specs/TODO.md` — task queue (`T-###`), `specs/TOFIX.md` — open defects (`F-###`).
- `specs/notes/` — preserved design notes (not specifications).
- Format owner: `scripts/validate-backlog.ts`; how-to: `.opencode/skills/backlog/SKILL.md`. Read the skill before editing the backlog.
- Items marked "backport" already exist in TTGamer (`../../../../ttgamer/src/dice_roller/`, i.e. `WebstormProjects/ttgamer`); port rather than redesign.

## SillyTavern Integration

- `globalThis.SillyTavern.getContext()` — main API
- Extension docs: https://docs.sillytavern.app/for-contributors/writing-extensions/

## Project Structure

```
src/
├── dice-logic/          # Lexer, parser, evaluator, roller, orchestrator, notation-utils
│   └── renderer/        # Three.js + Cannon-es 3D visualization, sound-manager, rest (die-at-rest check), spawn (spawn separation)
├── utils/               # settings, persistence, commands, body-injection, events, logging, constants, function-tools, macros, recolor_svg, types-ext
├── components/          # DicePanel, DicePool, dice-config, DiceButton, DiceTab{Standard,Dnd,Wod}, RollHistory, DiceRollerContext, SettingsPanel, ErrorBoundary, 2d_dices/
├── styles/              # SCSS (_variables, index, dice-pool, roll-history, dice-container, extension_settings, loading-indicator)
├── index.tsx            # Entry point
└── global.d.ts          # SillyTavern API types
scripts/validate-backlog.ts  # Backlog format validator (run with plain `node`)
specs/                   # ROADMAP.md, TODO.md, TOFIX.md, notes/, NNN-* feature specs
tests/                   # Vitest (evaluator/, parser/, logic/, integration/, contract/, renderer/, backlog-format/); support/fakeHost.ts fakes the ST host
.specify/                # speckit (constitution, templates, sh scripts)
.opencode/               # speckit commands; skills: dice-logic, backlog
```

## Settings

```typescript
interface DiceRollerSettings {
    enable3dDice: boolean;
    injectResult: boolean;
    sendAsChatMessage: boolean;
    showDiceButton: boolean; // NOT showDiceButtons (no 's')
    functionTool: boolean;
    primaryDiceColor: string;
    secondaryDiceColor: string;
    enableSound: boolean;
    soundVolume: number; // 0-100
    timeToReact: boolean;
    timeToReactSeconds: number; // 1-60
}
```

Access: `getSettings()` returns copy; `getRollConfig()` returns `{ diceColor, textColor, enable3dDice, enableSound, soundVolume, timeToReact, timeToReactSeconds }`. Both from `src/utils/settings.ts`.

## API Access

```typescript
import { getContext, getLiveContext, getSettings, getRollConfig, subscribeSettings } from './utils/settings'; // getLiveContext for data fields (chatMetadata, …)
import { debug, info, warn, error } from './utils/logging';
import {
    executeUnifiedRoll,
    execute2DRoll,
    onRollResult,
    applyAdvantage,
    applyDisadvantage,
    handleDiceNotation,
    parseParts,
    detectRerolls,
    detectExplosion,
} from './dice-logic';
import { useDiceRoller } from './components/DiceRollerContext'; // inside DiceRollerProvider
import { triggerRoll } from './utils/events';
```

## Commands

`/roll <notation>` or `/r <notation>` — supports `quiet=true` to suppress output.

## Macros

`{{ddroll::2d6+3}}` — registered via `macros.register('ddroll', ...)`. Uses our enhanced dice engine (supports forced values, target success/failure, modifiers). Returns compact formatted result. Avoids overwriting core `{{roll::1d20}}`.

## External Event API

```typescript
// From any extension:
const ctx = SillyTavern.getContext();
ctx.eventSource.emit('3ddicerolls:roll', { notation: '2d6+3' });

// Direct import:
import { triggerRoll } from './utils/events';
const result = await triggerRoll('1d20+5');
```

Payload: `{ notation: string, quiet?: boolean }`. Uses current extension settings for 3D/2D and output routing.

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
    - `history` — `HistoryEntry[]` per-chat, persisted to `chatMetadata['3DDiceRolls']`
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
- `--ddr-loader-color` — loading spinner color (matches primaryDiceColor)

## Styling

Use `--SmartTheme*` CSS vars from `src/styles/_variables.scss`.

## Logging

```typescript
import { debug, consoleWarn, info, warn, error } from './utils/logging';
```

Toasts use SillyTavern's global `toastr` (never bundle one). Toast only what the user must see or act on.

- `debug(...args)` — console only (dev)
- `consoleWarn(msg, title?, consoleArgs?)` — console warning, no toast (missing optional app features, bad payloads from other extensions)
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

Read-only reference material in the git-ignored `context/` folder (shallow clones; create or refresh with `scripts/setup-context.sh`). Never import or bundle it.

- `context/SillyTavern/` — SillyTavern app source (`release` branch). Key files:
    - `public/scripts/st-context.js` — the `getContext()` API the plugin can use
    - `public/script.js` — core app (chat loading, `chat_metadata`, events wiring)
    - `public/scripts/events.js` — `event_types`; `public/lib/eventemitter.js` — emitter surface (`on`/`once`/`removeListener`, no `off`)
    - `public/scripts/system-messages.js`, `public/scripts/popup.js`, `public/scripts/slash-commands/`, `public/scripts/macros/`
    - `public/style.css` (`:root` `--SmartTheme*` variables) and `public/css/` — app styles
- `context/dice-box-threejs` — npm lib for 3D dice visualization and rolling, plus sound and texturing
- `context/dice-roller` — Obsidian dice plugin with similar functionality (narrative dice reference: `src/rollers/dice/narrative.ts`)
- `context/Extension-Dice` — SillyTavern's official dice extension (example extension, core `/roll`)

## Symbols and emojis

The source app uses `Font Awesome 6 Free` to show most of custom symbols. Try to follow the same pattern if the font has needed symbol.
