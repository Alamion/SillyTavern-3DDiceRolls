import { DiceRollerSettings } from './settings';

export const MODULE_NAME = '3DDiceRolls';

export const MAX_EXPLOSIONS = 1000;
export const MAX_ROLL_SECONDS = 10;
export const VELOCITY_THRESHOLD = 5;
export const FRAME_RATE = 1 / 60;

export const DEFAULT_SETTINGS: DiceRollerSettings = {
    showDiceButton: true,
    enable3dDice: true,
    injectResult: false,
    sendAsChatMessage: false,
    functionTool: false,
    primaryDiceColor: '#7e7e7e',
    secondaryDiceColor: '#ffffff',
    enableSound: true,
    soundVolume: 80,
    timeToReact: false,
    timeToReactSeconds: 5,
};

export type SettingType = 'boolean' | 'string' | 'number' | 'color';

export interface RangeChildConfig {
    key: keyof DiceRollerSettings;
    min: number;
    max: number;
    step: number;
    label: string;
}

export interface SettingMetadata {
    type: SettingType;
    name: string;
    rangeChild?: RangeChildConfig;
}

export const SETTINGS_METADATA: Record<keyof DiceRollerSettings, SettingMetadata> = {
    showDiceButton: { type: 'boolean', name: 'Show dice button' },
    enable3dDice: { type: 'boolean', name: 'Enable 3D Dice Rolls' },
    injectResult: { type: 'boolean', name: 'Inject result in user prompt' },
    sendAsChatMessage: { type: 'boolean', name: 'Send result as chat message' },
    functionTool: { type: 'boolean', name: 'Enable AI function tool for dice rolls' },
    primaryDiceColor: { type: 'color', name: 'Primary dice color (faces)' },
    secondaryDiceColor: { type: 'color', name: 'Secondary dice color (text)' },
    enableSound: {
        type: 'boolean',
        name: 'Roll sound effects',
        rangeChild: {
            key: 'soundVolume',
            min: 0,
            max: 100,
            step: 1,
            label: 'Volume',
        },
    },
    soundVolume: { type: 'number', name: 'Sound volume' },
    timeToReact: {
        type: 'boolean',
        name: 'Time to react',
        rangeChild: {
            key: 'timeToReactSeconds',
            min: 1,
            max: 60,
            step: 1,
            label: 'React window (seconds)',
        },
    },
    timeToReactSeconds: { type: 'number', name: 'Time to react seconds' },
};
