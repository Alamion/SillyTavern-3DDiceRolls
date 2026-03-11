import ReactDOM from 'react-dom/client';
import { getContext, getSettings } from './settings';
import { executeRoll, type RollResult } from './commands';
import DicePool from '../components/DicePool';
import RollHistory from '../components/RollHistory';
import { debug, warn, error } from './logging';
import { onRollResult } from '../dice-logic';
import type { MixedRollConfig } from '../dice-logic';

const DICE_ROLL_HISTORY_KEY = '3d_dice_rolls';

let diceButtonsContainer: HTMLElement | null = null;
let rollHistoryContainer: HTMLElement | null = null;
let rollHistory: RollResult[] = [];
let settingsCheckInterval: ReturnType<typeof setInterval> | null = null;
let diceButtonsRoot: ReactDOM.Root | null = null;
let rollHistoryRoot: ReactDOM.Root | null = null;
let chatChangeUnsubscribe: (() => void) | null = null;

export function initBodyUI(): void {
    debug('Initializing body UI components');
    loadRollHistoryFromChat();
    createDiceButtons();
    createRollHistory();
    setupRollListener();
    setupChatChangeListener();
    startSettingsWatcher();
}

function loadRollHistoryFromChat(): void {
    try {
        const context = getContext();
        const chatMetadata = context.chatMetadata || {};
        const savedRolls = chatMetadata[DICE_ROLL_HISTORY_KEY];

        if (savedRolls && Array.isArray(savedRolls)) {
            rollHistory = savedRolls.slice(0, 50);
            debug('Loaded roll history from chat:', rollHistory.length, 'rolls');
        } else {
            rollHistory = [];
        }
    } catch (err) {
        warn('Failed to load roll history from chat', 'Roll History', [err]);
        rollHistory = [];
    }
}

async function saveRollHistoryToChat(): Promise<void> {
    try {
        const context = getContext();
        if (!context.chatMetadata.chat_id_hash) {
            debug('Cannot save roll history to chat as no chat is open');
            return;
        }
        context.chatMetadata[DICE_ROLL_HISTORY_KEY] = rollHistory.slice(0, 50);
        await context.saveMetadata();
        debug('Saved roll history to chat:', rollHistory.length, 'rolls');
    } catch (err) {
        error('Failed to save roll history to chat', 'Roll History', [err]);
    }
}

function setupChatChangeListener(): void {
    try {
        const context = getContext();
        const handleChatChange = () => {
            debug('Chat changed, reloading roll history');
            loadRollHistoryFromChat();
            if (rollHistoryRoot) {
                rollHistoryRoot.render(
                    <RollHistory
                        rolls={rollHistory}
                        onClear={clearHistory}
                    />,
                );
            }
        };

        context.eventSource.on(context.eventTypes.CHAT_CHANGED, handleChatChange);
        chatChangeUnsubscribe = () => {
            context.eventSource.off(context.eventTypes.CHAT_CHANGED, handleChatChange);
        };
    } catch (err) {
        error('Failed to setup chat change listener', 'Event Listener', [err]);
    }
}

function getRollConfig(): MixedRollConfig {
    const settings = getSettings();
    const textColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--SmartThemeBodyColor').trim() || '#ffffff';

    return {
        diceColor: settings.primaryDiceColor,
        textColor: textColor,
        enable3dDice: settings.enable3dDice,
    };
}

function startSettingsWatcher(): void {
    let lastSettings = JSON.stringify(getSettings());
    let lastPrimaryColor = getSettings().primaryDiceColor;
    let lastShowDiceButtons = getSettings().showDiceButtons;

    settingsCheckInterval = setInterval(() => {
        const currentSettings = getSettings();
        const currentSettingsStr = JSON.stringify(currentSettings);
        if (currentSettingsStr !== lastSettings) {
            lastSettings = currentSettingsStr;

            // Check if primary color changed
            if (currentSettings.primaryDiceColor !== lastPrimaryColor) {
                lastPrimaryColor = currentSettings.primaryDiceColor;
                debug('Primary color changed to:', currentSettings.primaryDiceColor);
                // Rerender dice buttons with new color
                if (diceButtonsContainer && diceButtonsRoot) {
                    diceButtonsRoot.render(
                        <DicePool
                            onRoll={(notation) => {
                                executeRoll(notation);
                            }}
                        />,
                    );
                }
                if (rollHistoryRoot) {
                    rollHistoryRoot.render(
                        <RollHistory
                            rolls={rollHistory}
                            onClear={clearHistory}
                        />,
                    );
                }
            }

            // Update dice buttons visibility
            if (currentSettings.showDiceButtons !== lastShowDiceButtons) {
                lastShowDiceButtons = currentSettings.showDiceButtons;
                debug('Dice buttons visibility changed:', currentSettings.showDiceButtons);
                if (diceButtonsContainer) {
                    diceButtonsContainer.style.display = currentSettings.showDiceButtons ? '' : 'none';
                } else if (currentSettings.showDiceButtons) {
                    createDiceButtons();
                }
            }

            // Update roll history visibility
            if (rollHistoryContainer) {
                rollHistoryContainer.style.display = currentSettings.showRollHistory ? '' : 'none';
            } else if (currentSettings.showRollHistory) {
                createRollHistory();
            }
        }
    }, 500);
}

export function destroyBodyUI(): void {
    debug('Destroying body UI components');
    if (settingsCheckInterval) {
        clearInterval(settingsCheckInterval);
        settingsCheckInterval = null;
    }
    chatChangeUnsubscribe?.();
    chatChangeUnsubscribe = null;
    diceButtonsRoot?.unmount();
    diceButtonsRoot = null;
    rollHistoryRoot?.unmount();
    rollHistoryRoot = null;
    diceButtonsContainer?.remove();
    rollHistoryContainer?.remove();
    diceButtonsContainer = null;
    rollHistoryContainer = null;
}

function createDiceButtons(): void {
    const settings = getSettings();
    if (!settings.showDiceButtons) {
        return;
    }

    diceButtonsContainer = document.createElement('div');
    diceButtonsContainer.id = 'dices-container';

    const body = document.body;
    const existingButtons = document.getElementById('dices-container');
    if (!existingButtons && body) {
        body.appendChild(diceButtonsContainer);

        // Mount React component
        diceButtonsRoot = ReactDOM.createRoot(diceButtonsContainer);
        diceButtonsRoot.render(
            <DicePool
                onRoll={(notation) => {
                    executeRoll(notation);
                }}
            />,
        );
        debug('Dice buttons created');
    }
}

function createRollHistory(): void {
    const settings = getSettings();
    if (!settings.showRollHistory) {
        return;
    }

    rollHistoryContainer = document.createElement('div');
    rollHistoryContainer.id = 'roll-history-container';

    const body = document.body;
    const existingHistory = document.getElementById('roll-history-container');
    if (!existingHistory && body) {
        body.insertBefore(rollHistoryContainer, body.firstChild);

        rollHistoryRoot = ReactDOM.createRoot(rollHistoryContainer);
        rollHistoryRoot.render(
            <RollHistory
                rolls={rollHistory}
                onClear={clearHistory}
            />,
        );
        debug('Roll history created');
    }
}

async function clearHistory(): Promise<void> {
    debug('Clearing roll history');
    rollHistory = [];
    await saveRollHistoryToChat();
    if (rollHistoryRoot) {
        rollHistoryRoot.render(
            <RollHistory
                rolls={rollHistory}
                onClear={clearHistory}
            />,
        );
    }
}

function setupRollListener(): void {
    onRollResult(async (result: RollResult) => {
        rollHistory = [result, ...rollHistory].slice(0, 50);
        await saveRollHistoryToChat();
        if (rollHistoryRoot) {
            rollHistoryRoot.render(
                <RollHistory
                    rolls={rollHistory}
                    onClear={clearHistory}
                />,
            );
        }
    });
}

export function toggleDiceButtons(visible: boolean): void {
    if (diceButtonsContainer) {
        diceButtonsContainer.style.display = visible ? '' : 'none';
        debug('Dice buttons toggled:', visible);
    }
}

export function toggleRollHistory(visible: boolean): void {
    if (rollHistoryContainer) {
        rollHistoryContainer.style.display = visible ? '' : 'none';
        debug('Roll history toggled:', visible);
    }
}

export { getRollConfig };
