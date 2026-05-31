import { getContext } from './settings';
import { debug, error, warn } from './logging';
import { handleRollEvent } from './events';

export function registerRollCommand(): void {
    debug('Registering roll command');
    const context = getContext();
    if (!context) {
        warn('Context not available - /roll command disabled', 'Dice Roller');
        return;
    }
    const { SlashCommandParser, SlashCommand, SlashCommandArgument, SlashCommandNamedArgument, ARGUMENT_TYPE } = context;
    if (!SlashCommandParser) {
        warn('Slash command parser not available - /roll command disabled', 'Dice Roller');
        return;
    }

    try {
        const slashCommand = SlashCommand?.fromProps({
            name: 'roll',
            aliases: ['r'],
            callback: async (_args: Record<string, string>, value: string): Promise<string> => {
                const quiet = String(_args?.quiet) === 'true';
                const notation = value || '1d20';
                const result = await handleRollEvent({ notation, quiet });
                if (!result) {
                    return `Failed to roll notation: ${notation}. Invalid notation.`;
                }
                return String(result.total);
            },
            helpString: 'Roll dice (e.g., /roll 2d6+2). Use quiet=true to suppress output.',
            returns: 'roll result',
            namedArgumentList: [
                SlashCommandNamedArgument?.fromProps({
                    name: 'quiet',
                    description: 'Suppress output',
                    isRequired: false,
                    typeList: [ARGUMENT_TYPE?.BOOLEAN],
                    defaultValue: String(false),
                }),
            ],
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
