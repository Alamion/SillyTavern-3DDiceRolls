import { getContext } from './settings';
import { debug, error, warn } from './logging';
import { execute2DRoll, formatResultForDisplay } from '../dice-logic';

export function registerDiceMacros(): void {
    debug('Registering dice macros');
    const context = getContext();
    if (!context) {
        warn('Context not available - dice macros disabled', '3DDiceRolls');
        return;
    }

    const { macros } = context;
    if (!macros || typeof macros.register !== 'function') {
        warn('Macro system not available - dice macros disabled', '3DDiceRolls');
        return;
    }

    try {
        macros.register('ddroll', {
            description: 'Rolls dice using standard dice notation (e.g. 2d6+3, 4d20kh3).',
            category: macros.category?.RANDOM,
            returns: 'Dice roll notation + formatted result.',
            returnType: 'string',
            exampleUsage: [
                '{{ddroll::1d20}}',
                '{{ddroll::5*(2d6+3)}}',
                '{{ddroll::4d20kh3}}',
                '{{ddroll::3d10@10,1,10+1d4}}',
            ],
            unnamedArgs: [
                { name: 'notation', description: 'Dice notation string', sampleValue: '2d20kh1+d6!+4', type: 'string' },
            ],
            handler: ({ unnamedArgs }: { unnamedArgs: string[] }) => {
                const notation = (unnamedArgs?.[0] || '1d20').trim();
                try {
                    const result = execute2DRoll(notation);
                    return formatResultForDisplay(result, 'compact');
                } catch {
                    return `[Invalid notation: ${notation}]`;
                }
            },
        });

        debug('Dice macros registered successfully', '3DDiceRolls');
    } catch (err) {
        error('Failed to register dice macros', '3DDiceRolls', [err]);
    }
}
