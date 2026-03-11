import { debug, error, warn } from './logging';
import { DEFAULT_SETTINGS, MODULE_NAME } from './constants';
import { registerRollCommand } from './commands';
import { registerFunctionTools } from './function-tools';
import { registerDiceRollEvent } from './events';

export interface DiceRollerSettings {
    enable3dDice: boolean;
    injectResult: boolean;
    sendAsChatMessage: boolean;
    showDiceButtons: boolean;
    showRollHistory: boolean;
    functionTool: boolean;
    primaryDiceColor: string;
    secondaryDiceColor: string;
}

let currentSettings: DiceRollerSettings = { ...DEFAULT_SETTINGS };

export function getSettings(): DiceRollerSettings {
    return { ...currentSettings };
}

export function updateSettings(newSettings: Partial<DiceRollerSettings>): void {
    debug('Updating settings:', newSettings);
    currentSettings = { ...currentSettings, ...newSettings };
    saveSettings();
}

function saveSettings(): void {
    const context = getContext();
    if (!context) {
        warn('No context available - cannot save settings', 'Settings');
        return;
    }

    try {
        if (context.extensionSettings) {
            context.extensionSettings[MODULE_NAME] = { ...currentSettings };
        }

        if (context.saveSettingsDebounced) {
            context.saveSettingsDebounced();
        }
        debug('Settings saved successfully');
    } catch (err) {
        error('Failed to save settings', 'Settings', [err]);
    }
}

function filterSettings<T extends object>(
    source: Partial<Record<keyof T, unknown>>,
    defaults: T,
): Partial<T> {
    const validKeys = Object.keys(defaults) as (keyof T)[];
    return Object.fromEntries(
        validKeys
            .filter(key => key in source)
            .map(key => [key, source[key]]),
    ) as Partial<T>;
}

export function initSettings(): void {
    debug('Initializing settings');
    const context = getContext();
    if (!context) {
        error('No context available - extension cannot initialize', 'Initialization');
        return;
    }

    try {
        // Try to load from writeExtensionField first (from st-context.js)
        let loadedSettings: Partial<DiceRollerSettings> = {};

        if (context.extensionSettings && context.extensionSettings[MODULE_NAME]) {
            loadedSettings = filterSettings(context.extensionSettings[MODULE_NAME], DEFAULT_SETTINGS);
            debug('Loaded settings from storage:', Object.keys(loadedSettings).length, 'settings');
        }

        currentSettings = { ...DEFAULT_SETTINGS, ...loadedSettings };

        registerRollCommand();
        registerFunctionTools();
        registerDiceRollEvent();

        debug('3D Dice Roller initialized successfully');
    } catch (err) {
        error('Failed to initialize extension', 'Initialization', [err]);
    }
}

export function getContext() {
    return globalThis.SillyTavern.getContext();
}

export interface MixedRollConfig {
    diceColor: string;
    textColor: string;
    enable3dDice: boolean;
}

export function getRollConfig(): MixedRollConfig {
    const settings = getSettings();

    return {
        diceColor: settings.primaryDiceColor,
        textColor: settings.secondaryDiceColor,
        enable3dDice: settings.enable3dDice,
    };
}
