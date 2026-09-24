import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installFakeHost, EVENT_TYPES, type FakeHost } from '../support/fakeHost';
import { MODULE_NAME } from '../../src/utils/constants';
import type { HistoryEntry } from '../../src/utils/types-ext';

let host: FakeHost;

async function loadModules() {
    vi.resetModules();
    const settings = await import('../../src/utils/settings');
    const persistence = await import('../../src/utils/persistence');
    return { settings, persistence };
}

function entry(id: string): HistoryEntry {
    return { id, timestamp: 0, result: { notation: '1d6', total: 3 } as HistoryEntry['result'] };
}

beforeEach(() => {
    vi.useFakeTimers();
    host = installFakeHost();
});

afterEach(() => {
    host.uninstall();
    vi.useRealTimers();
});

describe('extension settings persistence', () => {
    it('keeps favorites and recent notations when a setting changes (F-001)', async () => {
        const { settings, persistence } = await loadModules();
        const favorite = { id: 'f1', notation: '1d20+5', label: '1d20+5', lastUsed: 0 };
        persistence.saveExtensionData([favorite], ['2d6']);

        settings.updateSettings({ enableSound: false });

        const stored = host.extensionSettings[MODULE_NAME];
        expect(stored.enableSound).toBe(false);
        expect(stored.favorites).toEqual([favorite]);
        expect(stored.recentNotations).toEqual(['2d6']);
        expect(persistence.loadExtensionData().favorites).toEqual([favorite]);
    });

    it('keeps settings when favorites change', async () => {
        const { settings, persistence } = await loadModules();
        settings.updateSettings({ soundVolume: 42 });

        persistence.saveExtensionData([], ['1d4']);

        expect(host.extensionSettings[MODULE_NAME].soundVolume).toBe(42);
    });
});

describe('chat history persistence', () => {
    it('reads the history of the chat that is open now, not the first one seen (F-002)', async () => {
        const { settings, persistence } = await loadModules();
        await host.loadChat('chat-a', { [MODULE_NAME]: [entry('a1')] });
        settings.getContext(); // prime the cached context on chat A

        await host.loadChat('chat-b', { [MODULE_NAME]: [entry('b1')] });

        expect(persistence.loadChatHistory().map((e) => e.id)).toEqual(['b1']);
    });

    it('writes history into the open chat and saves it (F-002)', async () => {
        const { settings, persistence } = await loadModules();
        await host.loadChat('chat-a');
        settings.getContext();
        await host.loadChat('chat-b');

        persistence.writeChatHistory([entry('b1')]);
        await vi.runAllTimersAsync();

        expect(host.savedChats.get('chat-b')?.[MODULE_NAME]).toEqual([entry('b1')]);
        expect(host.savedChats.get('chat-a')?.[MODULE_NAME]).toBeUndefined();
    });

    it('does not carry a pending write over into the next chat (F-002)', async () => {
        const { persistence } = await loadModules();
        await host.loadChat('chat-a');

        persistence.writeChatHistory([entry('a1')]);
        await host.loadChat('chat-b');
        await vi.runAllTimersAsync();

        expect(host.savedChats.get('chat-a')?.[MODULE_NAME]).toEqual([entry('a1')]);
        expect(host.savedChats.get('chat-b')?.[MODULE_NAME]).toBeUndefined();
    });

    it('saves history in a chat whose metadata has no chat_id_hash (real app default)', async () => {
        const { persistence } = await loadModules();
        await host.loadChat('chat-a');
        expect(host.chatMetadata.chat_id_hash).toBeUndefined();

        persistence.writeChatHistory([entry('a1')]);
        await host.loadChat('chat-b');
        await host.loadChat('chat-a');

        expect(persistence.loadChatHistory().map((e) => e.id)).toEqual(['a1']);
    });

    it('ignores writes when no chat is open', async () => {
        const { persistence } = await loadModules();
        persistence.writeChatHistory([entry('x')]);
        await vi.runAllTimersAsync();
        expect(host.chatMetadata[MODULE_NAME]).toBeUndefined();
    });
});

describe('chat change subscription', () => {
    it('unsubscribes through removeListener; the app emitter has no off (F-005)', async () => {
        const { persistence } = await loadModules();
        const handler = vi.fn();

        const unsubscribe = persistence.onChatChanged(handler);
        expect(host.eventSource.listenerCount(EVENT_TYPES.CHAT_CHANGED)).toBe(1);
        expect(() => unsubscribe()).not.toThrow();

        expect(host.eventSource.listenerCount(EVENT_TYPES.CHAT_CHANGED)).toBe(0);
        await host.loadChat('chat-a');
        expect(handler).not.toHaveBeenCalled();
    });
});
