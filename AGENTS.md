# AGENTS.md - Development Guide for 3DDiceRolls

## Project Overview

This is a SillyTavern extension providing 3D dice rolling mechanics with dice notation support (e.g., `2d6+2`, `4d20kh3`). Built with React 18, Webpack and SASS, and scoped CSS using SillyTavern's theme variables.

## Important Reference Files

**ALWAYS check `tmp/st-context.js` when working with SillyTavern APIs!**
This file contains the actual exports from SillyTavern's getContext() method, including:
- All available context methods (saveSettingsDebounced, writeExtensionField, etc.)
- Proper API signatures
- Available services and managers

## Build Commands

### Build
```bash
pnpm run build
```
Builds the extension to `dist/index.js` using webpack in production mode with minification.

### Install Dependencies
```bash
pnpm install
```
Installs all dependencies defined in `package.json`.

### Development
- Run `pnpm run dev` to start a watcher.

### Linting
ESLint 9 with TypeScript support. Run via:
```bash
pnpm run lint
pnpm run lint:fix
```

## Code Style Guidelines

### General Principles
- Follow React functional component patterns
- Use TSX for UI rendering
- Keep components small and focused (single responsibility)
- No magic numbers—use configuration objects for tunable values

### Naming Conventions
- **Components**: PascalCase (e.g., `DiceRoller`, `RollHistory`)
- **Functions/callbacks**: camelCase (e.g., `handleRoll`, `onDiceClick`)
- **Constants**: UPPER_SNAKE_CASE for true constants, otherwise camelCase
- **Files**: kebab-case for non-component files (e.g., `dice-parser.js`)

### Imports
- React imports: `import { useState, useEffect } from 'react'`
- Component imports: `import ComponentName from './ComponentName'`
- Third-party: Use named imports where appropriate
- Order: React → external libs → internal components → utils/config

### Formatting
- Use 4 spaces for indentation (match existing code)
- Max line length: 100 characters where practical
- One blank line between import groups
- Add semicolons at end of statements (consistent with project style)

### Types
- This project uses TypeScript (`.ts`/`.tsx` files)
- All functions must have explicit return types
- Use interfaces for complex object shapes
- Use `global.d.ts` for SillyTavern API types
- Check `tmp/st-context.js` for actual API types before declaring them in `global.d.ts`

### React Patterns
- Use functional components with hooks (`useState`, `useEffect`)
- Avoid class components
- Access SillyTavern API via `getContext() from src/utils/settings.ts` and settings via `getSettings() from src/utils/settings.ts`

### Error Handling
- Never let exceptions bubble unhandled
- Provide informative error messages with context
- Handle SillyTavern API failures gracefully with user feedback
- Use try/catch for async operations

### Comments
- Write in plain English
- Be extremely brief—comment only controversial or ambiguous code
- Avoid commenting for commenting's sake

### Logging

Use the logging functions from `src/utils/logging.ts` for consistent user feedback and debugging.

**Import:**
```typescript
import { debug, info, warn, error } from './utils/logging'
```

**Logging Levels:**

1. **`debug(...args)`** - Console-only logging
    - Use for development debugging and internal state tracking
    - outputs only in development environment
    - Never shows toastr notifications
    - Examples: state changes, internal calculations, event triggers

2. **`info(message, title?, consoleArgs?)`** - Success notifications
    - Shows `toastr.success()` to user
    - Use for successful operations users should know about
    - Examples: settings saved, command registered, successful roll

3. **`warn(message, title?, consoleArgs?)`** - Warning notifications
    - Shows `toastr.warning()` to user
    - Use for non-critical issues users should be aware of
    - Examples: feature not supported, fallback behavior, API unavailable

4. **`error(message, title?, consoleArgs?)`** - Error notifications
    - Shows `toastr.error()` to user
    - Use for critical failures preventing operation
    - Examples: parse errors, save failures, critical API errors

**Best Practices:**
- Always use the appropriate level for user visibility
- Use `debug()` for development-only logging
- Provide clear, concise messages for user-facing notifications
- Avoid logging sensitive information in any log level
- All log functions automatically prefix with module name

## Architecture Patterns

### Bounded Contexts
Partition complex logic into self-contained modules:
- **Dice Parser**: Parse notation like `2d6+2`, `4d20kh3`
- **Dice Roller**: Core rolling logic with modifiers
- **UI Components**: Settings panel, dice buttons, roll history
- **Integration**: SillyTavern slash commands and events

### UI Components Reactivity
- Settings changes must immediately affect UI visibility
- Use polling interval in `body-injection.ts` to watch for settings changes
- Create/destroy DOM elements dynamically based on settings

## SillyTavern Integration

### References
- SillyTavern extension docs: https://docs.sillytavern.app/for-contributors/writing-extensions/

### Global Variables
- `SillyTavern` - main API object accessed via `globalThis.SillyTavern`
- `SillyTavern.getContext()` - returns all available context methods

## Project Structure

```
src/
├── dice-logic/           # Core dice logic
│   ├── index.ts          # Exports all dice-logic modules
│   ├── types.ts         # TypeScript interfaces (DiceGroup, RollResult, etc.)
│   ├── dice-parser.ts    # Parse dice notation
│   ├── dice-roller.ts   # Core rolling logic
│   ├── roll-orchestrator.ts  # Coordinates 2D/3D rolling
│   └── renderer/        # 3D rendering (Three.js + Cannon-es)
│       ├── renderer.ts  # Main renderer
│       ├── scene.ts     # Three.js scene management
│       ├── physics.ts   # Cannon-es physics world
│       ├── factory.ts   # Dice factory
│       ├── shapes.ts    # Dice mesh definitions
│       └── geometries.ts # Dice geometry data
├── utils/
│   ├── settings.ts       # Settings management (getSettings, getContext, getRollConfig)
│   ├── commands.ts       # Slash command registration (/roll)
│   ├── body-injection.tsx # Vanilla JS DOM for dice buttons + roll history
│   ├── logging.ts        # debug(), info(), warn(), error() - use for debugging andtoastr notifications
│   ├── constants.ts      # DEFAULT_SETTINGS, MODULE_NAME
│   ├── function-tools.ts # AI function tools
│   └── recolor_svg.ts    # Color utilities, like blending color and changing brightness
├── components/
│   ├── SettingsPanel.tsx # Extension settings panel
│   ├── DicePool.tsx      # Dice button pool component
│   ├── RollHistory.tsx   # Roll history component
│   └── 2d_dices/        # 2D dice SVG components (DiceD4, DiceD6, etc.)
├── styles/              # SASS stylesheets
│   ├── _variables.scss  # Style variables (spacing, fonts, colors)
│   ├── index.scss       # Main stylesheet
│   ├── _dice-pool.scss
│   ├── _roll-history.scss
│   ├── _dice-container.scss
│   └── _extension_settings.scss
├── index.tsx            # Entry point
└── global.d.ts          # TypeScript declarations for SillyTavern API
```

## UI Injection Strategy

### Settings Panel
- **Target**: `#extensions_settings` element
- **Tech**: React component
- **File**: `src/components/SettingsPanel.tsx`
- Uses `inline-drawer` class for collapsible section

### Dice Buttons
- **Target**: `document.body` (fixed position bottom-left)
- **Tech**: Vanilla JS DOM manipulation
- **File**: `src/utils/body-injection.ts`
- Position: `bottom: 60px; left: 20px`
- Settings change triggers immediate show/hide

### Roll History
- **Target**: `document.body` (fixed position top-left)
- **Tech**: Vanilla JS DOM manipulation
- **File**: `src/utils/body-injection.ts`
- Shows last 10 rolls with latest highlighted
- Settings change triggers immediate show/hide

## Styling

### CSS Variables
Use SillyTavern's theme variables for consistent styling:
- `--SmartThemeBlurTintColor` - Background color
- `--SmartThemeEmColor` - Highlight/emphasis color
- `--SmartThemeBorderColor` - Border color
- `--SmartThemeBodyColor` - Text color
- `--SmartThemeShadowColor` - Shadow color

### Usage
- All styles are scoped via SCSS file `src/styles/_variables.scss`
- Import in `_some_element.scss`: `@use 'variables' as *;'`
- Use `var(--SmartThemeBlurTintColor)` for theme-aware colors

## Extension settings

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

Access: `getSettings()` returns a copy of current settings; `getRollConfig()` returns specifically
```typescript
interface MixedRollConfig {
    diceColor: string;
    textColor: string;
    enable3dDice: boolean;
}
```

## API Access

```typescript
import { getContext, getSettings, getRollConfig } from './utils/settings';
import { debug, info, warn, error } from './utils/logging';
import { executeUnifiedRoll, execute2DRoll, onRollResult } from './dice-logic';

const context = getContext(); // SillyTavern context
const settings = getSettings();
```

## Dice Types

3D supported: D4, D6, D8, D10, D12, D20, D100

Ordinary random: Dn; n>1

Light dice notation support: `!`, `!!`, `kh`, etc.

## Commands

`/roll <notation>` or `/r <notation>` - Roll dice

## External Event API

Other extensions can trigger dice rolls through the event system. The roll uses the extension's current settings for processing (3D vs 2D) and output (inject result, send as chat message, etc.).

### Event: `3ddicerolls:roll`

**Trigger via SillyTavern eventSource:**
```typescript
const context = SillyTavern.getContext();
context.eventSource.emit('3ddicerolls:roll', { notation: '2d6+3' });
```

**Payload:**
```typescript
interface DiceRollEventPayload {
    notation: string;  // Dice notation (e.g., '2d6+3', '4')
}
```

**d20kh3Behavior:**
- Processes the roll using current extension settings (`enable3dDice`)
- Outputs based on settings (`injectResult`, `sendAsChatMessage`)
- Returns the roll result to any registered callbacks

### Direct Function Call

You can also directly trigger a roll from code:
 
```typescript
import { triggerRoll } from './utils/events';

const result = await triggerRoll('1d20+5');
console.log(result.total);
```

### External Extensions

Other SillyTavern extensions can trigger dice rolls via the event system. The roll uses this extension's settings (3D/2D mode, output destinations).

```typescript
// Trigger a roll from another extension
const context = SillyTavern.getContext();
context.eventSource.emit('3ddicerolls:roll', { notation: '2d6+3' });
```

## UI Injection

- **Dice buttons**: `#dices-container` in `document.body` (bottom-left, React mounted)
- **Roll history**: `#roll-history-container` in `document.body` (top-left, React mounted)
- **Settings**: `#extensions_settings` element (React)

Settings changes trigger polling in `body-injection.tsx`.

## Core Rules

Core security, commenting/logging, and architecture patterns. Key points:
- No sensitive info in code—use environment variables
- Brief, purposeful comments only
- Use bounded contexts for complex logic
- Strict typing and function documentation
- No magic numbers—use config objects
- UI elements go in document.body (not extensionsMenu for non-settings UI)
- Settings UI goes in extensions_settings
- Always check st-context.js for actual API availability
