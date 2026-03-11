import { getContext, getSettings } from './settings';
import { debug, warn, error } from './logging';
import {
    executeUnifiedRoll,
    execute2DRoll,
    type MixedRollConfig,
} from '../dice-logic';
import {
    notifyRollResult as notifyRollResultBase,
    formatResultForDisplay,
} from '../dice-logic/dice-roller';
import type { RollResult } from '../dice-logic';

export type { RollResult } from '../dice-logic/types';

export function notifyRollResult(result: RollResult): void {
    const settings = getSettings();

    debug(result.formatted);

    if (settings.injectResult) {
        injectResult(result);
    }
    if (settings.sendAsChatMessage) {
        sendAsChatMessage(result);
    }

    notifyRollResultBase(result);
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

export function registerRollCommand(): void {
    debug('Registering roll command');
    const { SlashCommandParser, SlashCommand, SlashCommandArgument, ARGUMENT_TYPE } = getContext();
    if (!SlashCommandParser) {
        warn('Slash command parser not available - /roll command disabled', 'Dice Roller');
        return;
    }

    try {
        const slashCommand = SlashCommand?.fromProps({
            name: 'roll',
            aliases: ['r'],
            callback: async (args: string, value: string): Promise<string> => {
                const notation = value || args || '1d20';
                const settings = getSettings();

                if (settings.enable3dDice) {
                    const result = await executeUnifiedRoll(notation, getRollConfig());
                    return String(result.total);
                } else {
                    const result = execute2DRoll(notation);
                    return String(result.total);
                }
            },
            helpString: 'Roll dice (e.g., /roll 2d6+2)',
            returns: 'roll result',
            unnamedArgumentList: [
                SlashCommandArgument?.fromProps({
                    description: 'dice formula, e.g. 2d6',
                    isRequired: true,
                    typeList: [ARGUMENT_TYPE?.STRING],
                }),
            ],
        });

        SlashCommandParser.addCommandObject(slashCommand);
        debug('Dice rolling command registered successfully', '/roll command');
    } catch (err) {
        error('Failed to register roll command', 'Dice Roller', [err]);
    }
}

export async function executeRoll(notation: string): Promise<RollResult> {
    debug('Executing roll with notation:', notation);
    const settings = getSettings();

    if (settings.enable3dDice) {
        const result = await executeUnifiedRoll(notation, getRollConfig());
        debug('Roll result:', result.total);
        return result;
    } else {
        const result = execute2DRoll(notation);
        debug('Roll result:', result.total);
        return result;
    }
}
