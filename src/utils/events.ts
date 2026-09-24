import { getContext, getRollConfig, getSettings } from './settings';
import { debug, error, consoleWarn } from './logging';
import { executeUnifiedRoll, execute2DRoll, RollCancelledError } from '../dice-logic';
import type { RollResult } from '../dice-logic';
import { notifyRollResult } from '../dice-logic';
import { currentChatId } from './persistence';

export const DICE_ROLL_EVENT_NAME = '3ddicerolls:roll';

export interface DiceRollEventPayload {
    notation: string;
    quiet?: boolean;
}

export async function handleRollEvent(payload: DiceRollEventPayload): Promise<RollResult | null> {
    const { notation, quiet } = payload;

    if (!notation) {
        consoleWarn('Roll event received without notation', 'Event Handler');
        return null;
    }

    debug('Processing roll event for notation:', notation);

    const settings = getSettings();
    // A 3D roll takes seconds; the result belongs to the chat it was started in.
    const origin = { chatId: currentChatId() };

    try {
        const result = settings.enable3dDice
            ? await executeUnifiedRoll(notation, getRollConfig())
            : execute2DRoll(notation);

        if (!quiet) {
            notifyRollResult(result, origin);
        }
        return result;
    } catch (err) {
        if (err instanceof RollCancelledError) {
            throw err;
        }
        error(err as string, 'Event Handler', [err]);
        return null;
    }
}

export function registerDiceRollEvent(): void {
    const context = getContext();

    if (!context?.eventSource) {
        consoleWarn('Event source not available - external roll events disabled', 'Event Handler');
        return;
    }

    try {
        context.eventSource.on(DICE_ROLL_EVENT_NAME, async (payload: unknown) => {
            debug('Received roll event:', payload);

            try {
                if (typeof payload === 'string') {
                    await handleRollEvent({ notation: payload });
                } else if (payload && typeof payload === 'object') {
                    const rollPayload = payload as DiceRollEventPayload;
                    if (rollPayload.notation) {
                        await handleRollEvent(rollPayload);
                    } else {
                        consoleWarn('Roll event payload missing notation', 'Event Handler');
                    }
                } else {
                    consoleWarn('Invalid roll event payload', 'Event Handler');
                }
            } catch (err) {
                if (err instanceof RollCancelledError) {
                    debug('Roll cancelled by user via external event');
                } else {
                    error(err as string, 'Event Handler', [err]);
                }
            }
        });

        debug('Dice roll event listener registered:', DICE_ROLL_EVENT_NAME);
    } catch (err) {
        error('Failed to register dice roll event', 'Event Handler', [err]);
    }
}

/**
 * Roll started from the dice panel. Cancelling a roll (✗ on the loading bar) is a normal user
 * action, so it resolves to null instead of surfacing as an unhandled rejection.
 */
export async function rollFromPanel(notation: string): Promise<RollResult | null> {
    try {
        return await handleRollEvent({ notation });
    } catch (err) {
        if (err instanceof RollCancelledError) {
            debug('Roll cancelled by user:', notation);
            return null;
        }
        throw err;
    }
}

export async function triggerRoll(notation: string): Promise<RollResult | null> {
    return handleRollEvent({ notation });
}
