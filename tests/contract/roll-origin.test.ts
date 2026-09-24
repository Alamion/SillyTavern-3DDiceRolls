import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeHost, type FakeHost } from '../support/fakeHost';
import { MODULE_NAME } from '../../src/utils/constants';
import type { RollResult } from '../../src/dice-logic';

/** A 3D roll that settles only when the test says so, like dice still tumbling on screen. */
const pendingRoll = vi.hoisted(() => ({ settle: null as ((r: RollResult) => void) | null }));

vi.mock('../../src/dice-logic/roll-orchestrator', () => ({
    executeUnifiedRoll: (notation: string) =>
        new Promise<RollResult>((resolve) => {
            pendingRoll.settle = () =>
                resolve({ notation, total: 14, diceGroups: [], details: '14', formatted: '14' } as RollResult);
        }),
    execute2DRoll: () => {
        throw new Error('not used');
    },
}));

let host: FakeHost;

beforeEach(() => {
    vi.resetModules();
    host = installFakeHost();
});

afterEach(() => {
    host.uninstall();
});

async function startRollThenSwitch() {
    const settings = await import('../../src/utils/settings');
    const events = await import('../../src/utils/events');
    const diceLogic = await import('../../src/dice-logic');
    const persistence = await import('../../src/utils/persistence');
    settings.updateSettings({ enable3dDice: true });

    const received: { chatId?: string }[] = [];
    diceLogic.onRollResult((_result, origin) => received.push(origin));

    await host.loadChat('assistant');
    const rolling = events.handleRollEvent({ notation: '1d20' });
    await host.loadChat('seraphina');
    pendingRoll.settle!({} as RollResult);
    await rolling;
    return { received, persistence };
}

describe('roll origin (F-035)', () => {
    it('tags a result with the chat the roll was started in', async () => {
        const { received } = await startRollThenSwitch();
        expect(received).toEqual([{ chatId: 'assistant' }]);
    });

    it('knows a roll finished after switching chats', async () => {
        const { persistence } = await startRollThenSwitch();
        expect(persistence.finishedInAnotherChat('assistant')).toBe(true);
        expect(persistence.finishedInAnotherChat('seraphina')).toBe(false);
    });

    it('keeps a queued entry out of the open chat and merges it when its chat is reopened', async () => {
        const { persistence } = await startRollThenSwitch();
        const entry = { id: 'late', timestamp: 2, result: { notation: '1d20' } as RollResult };
        persistence.queueHistoryForChat('assistant', entry);

        expect(persistence.loadChatHistoryWithPending()).toEqual({ history: [], merged: false });

        await host.loadChat('assistant', {
            [MODULE_NAME]: [{ id: 'old', timestamp: 1, result: { notation: '1d4' } }],
        });
        const { history, merged } = persistence.loadChatHistoryWithPending();
        expect(merged).toBe(true);
        expect(history.map((e) => e.id)).toEqual(['late', 'old']);
        expect(persistence.loadChatHistoryWithPending().merged).toBe(false);
    });
});
