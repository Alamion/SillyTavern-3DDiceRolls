import ReactDOM from 'react-dom/client';
import { getContext, getSettings } from './settings';
import DicePool from '../components/DicePool';
import RollHistory from '../components/RollHistory';
import { debug, error, warn } from './logging';
import { formatResultForDisplay, onRollResult, RollResult } from '../dice-logic';
import { handleRollEvent } from './events';
import SettingsPanel from '../components/SettingsPanel';

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
    createSettingsUI();
    createDiceButtons();
    createRollHistory();
    setupRollListeners();
    setupChatChangeListener();
    startSettingsWatcher();
}

function setupRollListeners(): void {
    onRollResult(updateRollHistory);
    onRollResult((result) => {
        const settings = getSettings();

        debug(result.formatted);

        if (settings.injectResult) {
            injectResult(result);
        }
        if (settings.sendAsChatMessage) {
            sendAsChatMessage(result);
        }
    });
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

function startSettingsWatcher(): void {
    let lastSettings = JSON.stringify(getSettings());
    let lastPrimaryColor = getSettings().primaryDiceColor;
    let lastSecondaryColor = getSettings().secondaryDiceColor;
    let lastShowDiceButtons = getSettings().showDiceButtons;

    settingsCheckInterval = setInterval(() => {
        const currentSettings = getSettings();
        const currentSettingsStr = JSON.stringify(currentSettings);
        if (currentSettingsStr !== lastSettings) {
            lastSettings = currentSettingsStr;

            // Check if primary color changed
            if (currentSettings.primaryDiceColor !== lastPrimaryColor || currentSettings.secondaryDiceColor !== lastSecondaryColor) {
                lastPrimaryColor = currentSettings.primaryDiceColor;
                lastSecondaryColor = currentSettings.secondaryDiceColor;
                debug('Colors changed to:', currentSettings.primaryDiceColor, currentSettings.secondaryDiceColor);
                // Rerender dice buttons with new color
                if (diceButtonsContainer && diceButtonsRoot) {
                    diceButtonsRoot.render(
                        <DicePool
                            onRoll={(notation) => {
                                handleRollEvent({ notation });
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

function createSettingsUI(): void {
    const rootContainer = document.getElementById('extensions_settings');
    if (rootContainer) {
        const rootElement = document.createElement('div');
        rootElement.id = '3d-dice-rolls-settings';
        rootContainer.appendChild(rootElement);

        const root = ReactDOM.createRoot(rootElement);
        root.render(
            <SettingsPanel />,
        );
    }
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
                    handleRollEvent({ notation });
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

async function updateRollHistory(result: RollResult): Promise<void> {
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
}

function injectResult(result: RollResult): void {
    const $user_input = $('#send_textarea');
    const userInput = String($user_input.val());
    const newValue = userInput ? `${userInput}\n${result.formatted}` : result.formatted;
    $user_input.val(newValue)[0].dispatchEvent(new Event('input', { bubbles: true }));
}

function sendAsChatMessage(result: RollResult): void {
    const context = getContext();
    context.sendSystemMessage('generic', formatResultForDisplay(result, 'compact'));
}
