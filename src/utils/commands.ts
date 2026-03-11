import { getContext } from './settings';
import { debug, error, warn } from './logging';
import { handleRollEvent } from './events';

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
                const result = await handleRollEvent({ notation });
                if (!result) {
                    return `Failed to roll notation: ${notation}. Invalid notation.`;
                }
                return String(result.total);
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
