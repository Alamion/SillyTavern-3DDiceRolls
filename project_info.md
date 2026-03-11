### 3D dice roller
Key Features:
1. 3d Dices rolls mechanics - render shapes, run physics until dice settle, evaluate results
2. Dice notation reading (like `2d6+2`; `4d20kh3`)
3. Public event listeners and invokes to let other extensions interact with this one
4. Right code architecture - use React + Webpack + Typescript
5. References:
   - https://docs.sillytavern.app/for-contributors/writing-extensions/ - main info of how to interact with core of SillyTavern
   - https://docs.sillytavern.app/for-contributors/i18n/ - about i18n specifications
   - tmp/dice-roller - already done very similar extension, not for SillyTavern, but for Obsidian
   - tmp/Extension-Dice - already done extension for SillyTavern, but too minimalistic and without architecture patterns I want 

What do I want to get in result:
- In plugin settings:
  - Turn on/off 3d dices rolls (default: on)
  - Autoinject results in user promt in format `Roll: 5d20+10: 1+2+3+4+5+10=25` (default: off)
  - Send result as a chat message (default: off)
  - Show results in console (default: off)
  - Show extra html in left lower corner of the screen with buttons for dices (default: on) (look at images references at docs/*)
  - Chat-related dice roll history (default: on) - also an extra html, now in upper left corner, with dynamic list of dices rolled in chat
- Function tool for AI (default: off) - allows AI to invoke dice rolls via function calling
- On `/roll dice_notation` command - roll dices
- On buttons in extra html (if on) - roll dices; support wrap/unwrap buttons as it is in docs references
- Support dynamic roll history (detailed version and shon is saved only for the latest roll; button to clear history; see reference in docs/roll_history.png)
