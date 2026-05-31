import ReactDOM from 'react-dom/client';
import { getContext, getSettings, subscribeSettings } from './settings';
import DicePool from '../components/DicePool';
import RollHistory from '../components/RollHistory';
import { debug, error, warn } from './logging';
import { formatResultForDisplay, onRollResult, RollResult } from '../dice-logic';
import { handleRollEvent } from './events';
import SettingsPanel from '../components/SettingsPanel';
import { clearTextureCache } from '../dice-logic/renderer';

const DICE_ROLL_HISTORY_KEY = '3d_dice_rolls';

let diceButtonsContainer: HTMLElement | null = null;
let rollHistoryContainer: HTMLElement | null = null;
let rollHistory: RollResult[] = [];
let settingsCheckInterval: ReturnType<typeof setInterval> | null = null;
let diceButtonsRoot: ReactDOM.Root | null = null;
let rollHistoryRoot: ReactDOM.Root | null = null;
let chatChangeUnsubscribe: (() => void) | null = null;
let unsubscribeSettings: (() => void) | null = null;

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
        if (!context) {
            rollHistory = [];
            return;
        }
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

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

async function saveRollHistoryToChat(): Promise<void> {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    saveTimeout = setTimeout(async () => {
        try {
            const context = getContext();
            if (!context) {
                debug('Cannot save roll history to chat as context is unavailable');
                return;
            }
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
    }, 500);
}

function setupChatChangeListener(): void {
    try {
        const context = getContext();
        if (!context) {
            error('Cannot setup chat listener - context unavailable', 'Event Listener');
            return;
        }
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
    let lastPrimaryColor = getSettings().primaryDiceColor;
    let lastSecondaryColor = getSettings().secondaryDiceColor;

    unsubscribeSettings = subscribeSettings((currentSettings) => {
        const primaryChanged = currentSettings.primaryDiceColor !== lastPrimaryColor;
        const secondaryChanged = currentSettings.secondaryDiceColor !== lastSecondaryColor;

        if (primaryChanged) {
            lastPrimaryColor = currentSettings.primaryDiceColor;
            debug('Primary color changed to:', currentSettings.primaryDiceColor);
        }
        if (secondaryChanged) {
            lastSecondaryColor = currentSettings.secondaryDiceColor;
            debug('Secondary color changed to:', currentSettings.secondaryDiceColor);
        }

        if (primaryChanged || secondaryChanged) {
            clearTextureCache();

            if (diceButtonsRoot) {
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

        if (diceButtonsContainer) {
            diceButtonsContainer.style.display = currentSettings.showDiceButtons ? '' : 'none';
        } else if (currentSettings.showDiceButtons) {
            createDiceButtons();
        }

        if (rollHistoryContainer) {
            rollHistoryContainer.style.display = currentSettings.showRollHistory ? '' : 'none';
        } else if (currentSettings.showRollHistory) {
            createRollHistory();
        }
    });
}

export function destroyBodyUI(): void {
    debug('Destroying body UI components');
    if (settingsCheckInterval) {
        clearInterval(settingsCheckInterval);
        settingsCheckInterval = null;
    }
    chatChangeUnsubscribe?.();
    chatChangeUnsubscribe = null;
    unsubscribeSettings?.();
    unsubscribeSettings = null;
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
    try {
        const rootContainer = document.getElementById('extensions_settings');
        if (!rootContainer) {
            warn('Extensions settings container not found', 'Settings UI');
            return;
        }
        const rootElement = document.createElement('div');
        rootElement.id = '3d-dice-rolls-settings';
        rootContainer.appendChild(rootElement);

        const root = ReactDOM.createRoot(rootElement);
        root.render(
            <SettingsPanel />,
        );
    } catch (err) {
        error('Failed to create settings UI', 'Settings UI', [err]);
    }
}

function createDiceButtons(): void {
    const settings = getSettings();
    if (!settings.showDiceButtons) {
        return;
    }

    diceButtonsContainer = document.createElement('div');
    diceButtonsContainer.id = 'ddr-dices-container';

    const body = document.body;
    const existingButtons = document.getElementById('ddr-dices-container');
    if (!existingButtons && body) {
        body.appendChild(diceButtonsContainer);

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
    rollHistoryContainer.id = 'ddr-roll-history-container';

    const body = document.body;
    const existingHistory = document.getElementById('ddr-roll-history-container');
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
    if (!context) {
        return;
    }
    context.sendSystemMessage('generic', formatResultForDisplay(result, 'compact'));
}
