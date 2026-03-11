import { DiceRollerSettings } from './settings';

export const MODULE_NAME = '3DDiceRolls';

export const DEFAULT_SETTINGS: DiceRollerSettings = {
    enable3dDice: true,
    injectResult: true,
    sendAsChatMessage: false,
    showDiceButtons: false,
    showRollHistory: false,
    functionTool: false,
    primaryDiceColor: '#7e7e7e',
    secondaryDiceColor: '#ffffff',
};

export type SettingType = 'boolean' | 'string' | 'number' | 'color';

export interface SettingMetadata {
    type: SettingType;
    name: string;
}

export const SETTINGS_METADATA: Record<keyof DiceRollerSettings, SettingMetadata> = {
    enable3dDice: { type: 'boolean', name: 'Enable 3D Dice Rolls' },
    injectResult: { type: 'boolean', name: 'Inject result in user prompt' },
    sendAsChatMessage: { type: 'boolean', name: 'Send result as chat message' },
    showDiceButtons: { type: 'boolean', name: 'Show dice buttons in UI' },
    showRollHistory: { type: 'boolean', name: 'Show roll history' },
    functionTool: { type: 'boolean', name: 'Enable AI function tool for dice rolls' },
    primaryDiceColor: { type: 'color', name: 'Primary dice color (faces)' },
    secondaryDiceColor: { type: 'color', name: 'Secondary dice color (text)' },
};
