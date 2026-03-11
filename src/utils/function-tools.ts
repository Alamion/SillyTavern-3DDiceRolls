import { debug, warn, error } from './logging';
import { getContext, getSettings } from './settings';
import {
    executeUnifiedRoll,
    execute2DRoll,
    type MixedRollConfig,
} from '../dice-logic';

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

export function registerFunctionTools(): void {
    try {
        const context = getContext();
        if (!context) {
            warn('No context available for function tools', 'Function Tools');
            return;
        }

        const { registerFunctionTool, unregisterFunctionTool, isToolCallingSupported } = context;

        if (!registerFunctionTool || !unregisterFunctionTool) {
            warn('Function tools are not supported in this SillyTavern version', 'Function Tools');
            return;
        }

        unregisterFunctionTool('RollTheDice');

        const settings = getSettings();
        if (!settings.functionTool) {
            debug('Function tool is disabled in settings');
            return;
        }

        if (isToolCallingSupported()) {
            debug('Function tool calling is supported');
        } else {
            warn('Function tool calling is not supported. Check your model and preset settings', 'Function Tools');
        }

        const rollDiceSchema = Object.freeze({
            $schema: 'http://json-schema.org/draft-04/schema#',
            type: 'object',
            properties: {
                who: {
                    type: 'string',
                    description: 'The name of the persona rolling the dice',
                },
                formula: {
                    type: 'string',
                    description: 'A dice notation formula to roll, e.g. 1d20+1d8+5 or 4d6kh3',
                },
            },
            required: ['formula'],
        });

        registerFunctionTool({
            name: 'RollTheDice',
            displayName: 'Dice Roll',
            description: 'Rolls the dice using the provided formula and returns the numeric result. Use when it is necessary to roll the dice to determine the outcome of an action or when the user requests it.',
            parameters: rollDiceSchema,
            action: async (args: Record<string, unknown>) => {
                debug('Executing function tool roll:', args);
                const formula = (args?.formula as string) || '1d6';
                const who = args?.who as string | undefined;
                const settings = getSettings();

                try {
                    let result;
                    if (settings.enable3dDice) {
                        result = await executeUnifiedRoll(formula, getRollConfig());
                    } else {
                        result = execute2DRoll(formula);
                    }

                    const allKeptRolls = result.diceGroups.flatMap(g => g.keptRolls);

                    let message = who
                        ? `${who} rolls a ${formula}. The result is: ${result.total}`
                        : `The result of a ${formula} roll is: ${result.total}`;

                    if (allKeptRolls.length > 0) {
                        const rollsStr = allKeptRolls.map((r: { value: number }) => r.value).join(', ');
                        message += `. Individual rolls: ${rollsStr}`;
                    }

                    debug('Function tool roll completed:', result.total);
                    return message;
                } catch (err) {
                    error('Function tool roll failed', 'Dice Roll', [err]);
                    return `Failed to roll dice: ${formula}`;
                }
            },
            formatMessage: () => '',
        });

        debug('AI dice rolling function tool registered');
    } catch (err) {
        error('Failed to register function tools', 'Function Tools', [err]);
    }
}

export function unregisterFunctionTools(): void {
    try {
        const context = getContext();
        if (!context) {
            return;
        }

        const { unregisterFunctionTool } = context;
        if (unregisterFunctionTool) {
            unregisterFunctionTool('RollTheDice');
            debug('Function tool unregistered');
        }
    } catch (err) {
        error('Failed to unregister function tools', 'Function Tools', [err]);
    }
}
