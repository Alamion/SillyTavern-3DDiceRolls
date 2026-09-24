import ReactDOM from 'react-dom/client';
import { getContext, getSettings, subscribeSettings } from './settings';
import DicePanel from '../components/DicePanel';
import { debug, error, consoleWarn, info } from './logging';
import { finishedInAnotherChat } from './persistence';
import { formatResultForDisplay, onRollResult } from '../dice-logic';
import SettingsPanel from '../components/SettingsPanel';
import { clearTextureCache } from '../dice-logic/renderer';

const SETTINGS_ROOT_ID = '3d-dice-rolls-settings';
const DICE_CONTAINER_ID = 'ddr-dices-container';

let diceButtonsContainer: HTMLElement | null = null;
let diceButtonsRoot: ReactDOM.Root | null = null;
let settingsContainer: HTMLElement | null = null;
let settingsRoot: ReactDOM.Root | null = null;

/** Typing events that the app's document-level jQuery handlers would otherwise inspect. */
const TYPING_EVENTS = ['keydown', 'keyup', 'keypress', 'beforeinput', 'input', 'change', 'compositionend'] as const;

function isEditable(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
    );
}

/**
 * React has already handled typing events at its root, so they stop there instead of making
 * the app's delegated jQuery handlers inspect every keystroke. Escape still propagates so the
 * app's close-on-Escape keeps working.
 */
export function isolateTyping(container: HTMLElement): void {
    for (const type of TYPING_EVENTS) {
        container.addEventListener(type, (event) => {
            if (!isEditable(event.target)) return;
            if (event instanceof KeyboardEvent && event.key === 'Escape') return;
            event.stopPropagation();
        });
    }
}
let chatChangeUnsubscribe: (() => void) | null = null;
let unsubscribeSettings: (() => void) | null = null;

export function initBodyUI(): void {
    debug('Initializing body UI components');
    createSettingsUI();
    createDiceButtons();
    setupRollSideEffects();
    startSettingsWatcher();
}

function setupRollSideEffects(): void {
    onRollResult((result, origin) => {
        const settings = getSettings();

        debug(result.formatted);

        if (finishedInAnotherChat(origin.chatId)) {
            // Never put a result into a chat it was not rolled in.
            info(
                `${formatResultForDisplay(result, 'full')}. The roll finished after you switched chats, so it was not sent here; it is added to the history of the chat it was rolled in.`,
                'Roll from another chat',
            );
            return;
        }

        if (settings.injectResult) {
            injectResult(result);
        }
        if (settings.sendAsChatMessage) {
            sendAsChatMessage(result);
        }
    });
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
        }

        if (diceButtonsContainer) {
            diceButtonsContainer.style.display = currentSettings.showDiceButton ? '' : 'none';
        } else if (currentSettings.showDiceButton) {
            createDiceButtons();
        }
    });
}

export function destroyBodyUI(): void {
    debug('Destroying body UI components');
    chatChangeUnsubscribe?.();
    chatChangeUnsubscribe = null;
    unsubscribeSettings?.();
    unsubscribeSettings = null;
    diceButtonsRoot?.unmount();
    diceButtonsRoot = null;
    diceButtonsContainer?.remove();
    diceButtonsContainer = null;
    settingsRoot?.unmount();
    settingsRoot = null;
    settingsContainer?.remove();
    settingsContainer = null;
}

function createSettingsUI(): void {
    try {
        const rootContainer = document.getElementById('extensions_settings');
        if (!rootContainer) {
            consoleWarn('Extensions settings container not found', 'Settings UI');
            return;
        }
        if (document.getElementById(SETTINGS_ROOT_ID)) return;
        settingsContainer = document.createElement('div');
        settingsContainer.id = SETTINGS_ROOT_ID;
        rootContainer.appendChild(settingsContainer);
        isolateTyping(settingsContainer);

        settingsRoot = ReactDOM.createRoot(settingsContainer);
        settingsRoot.render(<SettingsPanel />);
    } catch (err) {
        error('Failed to create settings UI', 'Settings UI', [err]);
    }
}

function createDiceButtons(): void {
    const settings = getSettings();
    if (!settings.showDiceButton) {
        return;
    }

    const topSettingsHolder = document.querySelector('#top-settings-holder');
    if (!topSettingsHolder) {
        consoleWarn('.top-settings-holder not found, cannot inject dice button', 'UI');
        return;
    }

    if (document.getElementById(DICE_CONTAINER_ID)) return;
    diceButtonsContainer = document.createElement('div');
    diceButtonsContainer.id = DICE_CONTAINER_ID;
    diceButtonsContainer.className = 'drawer';
    isolateTyping(diceButtonsContainer);

    topSettingsHolder.insertBefore(diceButtonsContainer, topSettingsHolder.firstChild);

    diceButtonsRoot = ReactDOM.createRoot(diceButtonsContainer);
    diceButtonsRoot.render(<DicePanel />);
    debug('Dice buttons created in .top-settings-holder');
}

function injectResult(result: import('../dice-logic').RollResult): void {
    const userInput = document.querySelector<HTMLTextAreaElement>('#send_textarea');
    if (!userInput) return;
    const currentValue = userInput.value;
    userInput.value = currentValue
        ? `${currentValue}\n${formatResultForDisplay(result, 'full')}`
        : formatResultForDisplay(result, 'full');
    userInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function sendAsChatMessage(result: import('../dice-logic').RollResult): void {
    const context = getContext();
    if (!context) {
        return;
    }
    context.sendSystemMessage('generic', formatResultForDisplay(result, 'compact'));
}
