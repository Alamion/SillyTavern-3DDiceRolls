import ReactDOM from 'react-dom/client';
import { getContext, getSettings, subscribeSettings } from './settings';
import DicePanel from '../components/DicePanel';
import { debug, error, warn } from './logging';
import { formatResultForDisplay, onRollResult } from '../dice-logic';
import SettingsPanel from '../components/SettingsPanel';
import { clearTextureCache } from '../dice-logic/renderer';

let diceButtonsContainer: HTMLElement | null = null;
let diceButtonsRoot: ReactDOM.Root | null = null;
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
    if (!settings.showDiceButton) {
        return;
    }

    const topSettingsHolder = document.querySelector('#top-settings-holder');
    if (!topSettingsHolder) {
        warn('.top-settings-holder not found, cannot inject dice button', 'UI');
        return;
    }

    diceButtonsContainer = document.createElement('div');
    diceButtonsContainer.id = 'ddr-dices-container';
    diceButtonsContainer.className = 'drawer';

    topSettingsHolder.insertBefore(diceButtonsContainer, topSettingsHolder.firstChild);

    diceButtonsRoot = ReactDOM.createRoot(diceButtonsContainer);
    diceButtonsRoot.render(<DicePanel />);
    debug('Dice buttons created in .top-settings-holder');
}

function injectResult(result: import('../dice-logic').RollResult): void {
    const userInput = document.querySelector<HTMLTextAreaElement>('#send_textarea');
    if (!userInput) return;
    const currentValue = userInput.value;
    const newValue = currentValue ? `${currentValue}\n${result.formatted}` : result.formatted;
    userInput.value = newValue;
    userInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function sendAsChatMessage(result: import('../dice-logic').RollResult): void {
    const context = getContext();
    if (!context) {
        return;
    }
    context.sendSystemMessage('generic', formatResultForDisplay(result, 'compact'));
}
