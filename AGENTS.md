# AGENTS.md - Development Guide for 3DDiceRolls

## Project Overview

This is a SillyTavern extension providing 3D dice rolling mechanics with dice notation support (e.g., `2d6+2`, `4d20kh3`). Built with React 18, Webpack, and scoped CSS using SillyTavern's theme variables.

## Important Reference Files

**ALWAYS check `tmp/st-context.js` when working with SillyTavern APIs!**
This file contains the actual exports from SillyTavern's getContext() method, including:
- All available context methods (saveSettingsDebounced, writeExtensionField, etc.)
- Proper API signatures
- Available services and managers

## Build Commands

### Build
```bash
npm run build
```
Builds the extension to `dist/index.js` using webpack in production mode with minification.

### Install Dependencies
```bash
npm install
```
Installs all dependencies defined in `package.json`.

### Development
- Run `npm run dev` to start a watcher.

### Linting
ESLint 9 with TypeScript support. Run via:
```bash
npm run lint
npm run lint:fix
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

**Popup Functions (for important dialogs):**

```typescript
const { Popup } = getContext();

// Confirmation dialog
const confirmed = await Popup.show.confirm('Clear History', 'Are you sure?');

// Input dialog
const value = await Popup.show.input('Dice Count', 'Enter number of dice:', '2');

// Information dialog
await Popup.show.text('Info', 'Operation completed successfully.');
```

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
├── utils/
│   ├── settings.ts          # Settings management with save/load
│   ├── commands.ts          # Slash command registration (/roll)
│   ├── dice-parser.ts       # Parse dice notation (e.g., 2d6+2, 4d20kh3)
│   ├── dice-roller.ts       # Core dice rolling logic
│   ├── body-injection.ts    # Vanilla JS injection of UI to document.body
│   └── logging.ts           # Logging utilities with module prefix
├── components/
│   └── SettingsPanel.tsx    # React settings panel for extensions_settings
├── App.tsx                  # Minimal pass-through component
├── index.tsx                # Entry point - mounts React + inits body UI
├── index.css                # Scoped CSS using SillyTavern theme variables
└── global.d.ts              # TypeScript declarations for SillyTavern API
dist/
  index.js       # Built output
docs/            # Reference images
global.d.ts      # TypeScript declarations for SillyTavern API
manifest.json    # Extension manifest
webpack.config.js # Build configuration
postcss.config.js # PostCSS configuration
package.json     # Dependencies and scripts
tsconfig.json    # TypeScript configuration
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
- All styles are scoped via CSS file
- Import in `src/index.tsx`: `import './index.css'`
- Use `var(--SmartThemeBlurTintColor)` for theme-aware colors

## Slash Commands

The extension registers the `/roll` command using:
```typescript
SillyTavern.getContext().SlashCommandParser.addCommandObject({
    name: 'roll',
    aliases: ['r'],
    callback: async (args: string, value: string) => {// ... 
        },
    helpString: 'Roll dice (e.g., /roll 2d6+2)',
    returns: 'roll result',
});
```

## Cursor Rules (Applied)

Core security, commenting/logging, and architecture patterns from `.cursor/rules/` are in effect. Key points:
- No sensitive info in code—use environment variables
- Brief, purposeful comments only
- Use bounded contexts for complex logic
- Strict typing and function documentation
- No magic numbers—use config objects
- UI elements go in document.body (not extensionsMenu for non-settings UI)
- Settings UI goes in extensions_settings
- **Always check st-context.js for actual API availability**
