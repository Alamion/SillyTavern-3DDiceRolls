import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeHost, type FakeHost } from '../support/fakeHost';

// The error class comes from the same module graph as the code under test (modules are reset per test).
vi.mock('../../src/dice-logic/roll-orchestrator', async () => ({
    executeUnifiedRoll: async () => {
        const errors = await import('../../src/dice-logic/errors');
        throw new errors.RollCancelledError();
    },
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

describe('rolling from the panel', () => {
    it('treats a cancelled roll as a normal outcome, not an unhandled error', async () => {
        const settings = await import('../../src/utils/settings');
        const events = await import('../../src/utils/events');
        settings.updateSettings({ enable3dDice: true });

        vi.mocked(globalThis.toastr.error).mockClear();
        await expect(events.rollFromPanel('1d20')).resolves.toBeNull();
        expect(globalThis.toastr.error).not.toHaveBeenCalled();
    });

    it('still reports cancellation to script callers', async () => {
        const settings = await import('../../src/utils/settings');
        const events = await import('../../src/utils/events');
        settings.updateSettings({ enable3dDice: true });

        const errors = await import('../../src/dice-logic/errors');
        await expect(events.handleRollEvent({ notation: '1d20' })).rejects.toBeInstanceOf(errors.RollCancelledError);
    });
});
