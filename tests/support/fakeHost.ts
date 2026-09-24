/**
 * Minimal fake of the SillyTavern host surface the plugin uses, modelled on
 * context/SillyTavern/public (st-context.js, lib/eventemitter.js, script.js).
 *
 * Like the real app, `getContext()` builds a new object on every call and captures
 * `chatMetadata` by value, and the emitter has no `off`.
 */

type Listener = (...args: unknown[]) => unknown;

export class FakeEventEmitter {
    private events = new Map<string, Listener[]>();

    on(event: string, listener: Listener): void {
        const list = this.events.get(event) ?? [];
        list.push(listener);
        this.events.set(event, list);
    }

    once(event: string, listener: Listener): void {
        const wrapper: Listener = (...args) => {
            this.removeListener(event, wrapper);
            return listener(...args);
        };
        this.on(event, wrapper);
    }

    removeListener(event: string, listener: Listener): void {
        const list = this.events.get(event);
        if (!list) return;
        const idx = list.indexOf(listener);
        if (idx >= 0) list.splice(idx, 1);
    }

    async emit(event: string, ...args: unknown[]): Promise<void> {
        for (const listener of [...(this.events.get(event) ?? [])]) {
            await listener(...args);
        }
    }

    listenerCount(event: string): number {
        return this.events.get(event)?.length ?? 0;
    }
}

export const EVENT_TYPES = {
    EXTENSION_SETTINGS_LOADED: 'extension_settings_loaded',
    CHAT_CHANGED: 'chat_id_changed',
} as const;

export interface FakeHost {
    eventSource: FakeEventEmitter;
    extensionSettings: Record<string, Record<string, unknown>>;
    /** Id of the open chat, or undefined before any chat is opened. */
    chatId: string | undefined;
    /** Metadata of the currently open chat; reassigned by `loadChat`, as the app does. Like the
     * app, it carries no `chat_id_hash` unless a test adds one (the app sets it only lazily). */
    chatMetadata: Record<string, unknown>;
    /** Metadata objects persisted per chat id (what `saveMetadata` wrote to "disk"). */
    savedChats: Map<string, Record<string, unknown>>;
    saveSettingsDebounced: () => void;
    saveMetadata: () => Promise<void>;
    /** Switches chats like the app: saves the current chat, reassigns metadata, emits CHAT_CHANGED. */
    loadChat: (chatId: string, metadata?: Record<string, unknown>) => Promise<void>;
    uninstall: () => void;
}

export function installFakeHost(): FakeHost {
    const host = {
        eventSource: new FakeEventEmitter(),
        extensionSettings: {},
        chatMetadata: {},
        savedChats: new Map(),
        saveSettingsDebounced: () => {},
    } as unknown as FakeHost;

    host.saveMetadata = async () => {
        if (host.chatId !== undefined) host.savedChats.set(host.chatId, structuredClone(host.chatMetadata));
    };

    host.loadChat = async (chatId, metadata) => {
        await host.saveMetadata();
        host.chatId = chatId;
        host.chatMetadata = metadata ?? structuredClone(host.savedChats.get(chatId) ?? {});
        await host.eventSource.emit(EVENT_TYPES.CHAT_CHANGED, chatId);
    };

    const previous = globalThis.SillyTavern;
    globalThis.SillyTavern = {
        getContext: () => ({
            eventSource: host.eventSource,
            eventTypes: EVENT_TYPES,
            extensionSettings: host.extensionSettings,
            chatMetadata: host.chatMetadata,
            getCurrentChatId: () => host.chatId,
            saveSettingsDebounced: () => host.saveSettingsDebounced(),
            saveMetadata: () => host.saveMetadata(),
        }),
    } as unknown as typeof globalThis.SillyTavern;

    host.uninstall = () => {
        globalThis.SillyTavern = previous;
    };
    return host;
}
