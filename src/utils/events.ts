import { getContext, getRollConfig, getSettings } from './settings';
import { debug, error, warn } from './logging';
import {
    executeUnifiedRoll,
    execute2DRoll,
} from '../dice-logic';
import type { RollResult } from '../dice-logic';
import { notifyRollResult } from '../dice-logic';

export const DICE_ROLL_EVENT_NAME = '3ddicerolls:roll';

export interface DiceRollEventPayload {
    notation: string;
    quiet?: boolean;
}

export async function handleRollEvent(payload: DiceRollEventPayload): Promise<RollResult | null> {
    const { notation, quiet } = payload;

    if (!notation) {
        warn('Roll event received without notation', 'Event Handler');
        return null;
    }

    debug('Processing roll event for notation:', notation);

    const settings = getSettings();

    try {
        const result = settings.enable3dDice
            ? await executeUnifiedRoll(notation, getRollConfig())
            : execute2DRoll(notation);

        if (!quiet) {
            notifyRollResult(result);
        }
        return result;
    } catch (err) {
        error('Roll event failed to execute', 'Event Handler', [err]);
        return null;
    }
}

export function registerDiceRollEvent(): void {
    const context = getContext();

    if (!context?.eventSource) {
        warn('Event source not available - external roll events disabled', 'Event Handler');
        return;
    }

    try {
        context.eventSource.on(DICE_ROLL_EVENT_NAME, async (payload: unknown) => {
            debug('Received roll event:', payload);

            if (typeof payload === 'string') {
                await handleRollEvent({ notation: payload });
            } else if (payload && typeof payload === 'object') {
                const rollPayload = payload as DiceRollEventPayload;
                if (rollPayload.notation) {
                    await handleRollEvent(rollPayload);
                } else {
                    warn('Roll event payload missing notation', 'Event Handler');
                }
            } else {
                warn('Invalid roll event payload', 'Event Handler');
            }
        });

        debug('Dice roll event listener registered:', DICE_ROLL_EVENT_NAME);
    } catch (err) {
        error('Failed to register dice roll event', 'Event Handler', [err]);
    }
}

export async function triggerRoll(notation: string): Promise<RollResult | null> {
    return handleRollEvent({ notation });
}
