import { getLiveContext } from './settings';
import { MODULE_NAME } from './constants';
import type { FavoriteNotation, HistoryEntry } from './types-ext';

export const MAX_HISTORY = 50;
const SAVE_METADATA_DELAY_MS = 500;

let saveMetadataTimeout: ReturnType<typeof setTimeout> | null = null;

/* ─── Chat-level history ─── */

export function currentChatId(): string | undefined {
    try {
        return getLiveContext()?.getCurrentChatId?.() ?? undefined;
    } catch {
        return undefined;
    }
}

/** True when a roll started in `originChatId` finished after the user switched to another chat. */
export function finishedInAnotherChat(originChatId: string | undefined): boolean {
    return originChatId !== undefined && originChatId !== currentChatId();
}

/**
 * Entries for chats that are not open. Only the open chat's metadata is loaded, so an entry for
 * another chat waits here and is merged when that chat is opened again (this session only).
 */
const pendingHistory = new Map<string, HistoryEntry[]>();

export function queueHistoryForChat(chatId: string, entry: HistoryEntry): void {
    pendingHistory.set(chatId, [entry, ...(pendingHistory.get(chatId) ?? [])]);
}

/** History of the open chat with any entries queued for it merged in (newest first). */
export function loadChatHistoryWithPending(): { history: HistoryEntry[]; merged: boolean } {
    const loaded = loadChatHistory();
    const chatId = currentChatId();
    const pending = chatId === undefined ? undefined : pendingHistory.get(chatId);
    if (!pending?.length) return { history: loaded, merged: false };
    pendingHistory.delete(chatId!);
    const history = [...pending, ...loaded].sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_HISTORY);
    return { history, merged: true };
}

export function loadChatHistory(): HistoryEntry[] {
    try {
        const raw = getLiveContext()?.chatMetadata?.[MODULE_NAME];
        if (Array.isArray(raw)) return raw.slice(0, MAX_HISTORY) as HistoryEntry[];
    } catch {
        /* ignore */
    }
    return [];
}

/**
 * Writes history into the metadata of the chat that is open right now; only the disk save is
 * debounced. The app reassigns `chatMetadata` on every chat load and saves the old chat before
 * switching, so a synchronous write can never land in the wrong chat.
 */
export function writeChatHistory(history: HistoryEntry[]): void {
    try {
        const context = getLiveContext();
        // `chat_id_hash` is not a reliable marker: the app sets it lazily, only when certain
        // macros run. The chat id is what the app itself uses.
        if (!context?.chatMetadata || !currentChatId()) return;
        context.chatMetadata[MODULE_NAME] = history.slice(0, MAX_HISTORY);
    } catch {
        return;
    }
    if (saveMetadataTimeout) clearTimeout(saveMetadataTimeout);
    saveMetadataTimeout = setTimeout(() => {
        saveMetadataTimeout = null;
        getLiveContext()
            ?.saveMetadata()
            .catch(() => {});
    }, SAVE_METADATA_DELAY_MS);
}

export function onChatChanged(handler: () => void): () => void {
    const context = getLiveContext();
    if (!context?.eventSource) return () => {};
    const event = context.eventTypes.CHAT_CHANGED;
    context.eventSource.on(event, handler);
    return () => context.eventSource.removeListener(event, handler);
}

/* ─── Global extension data (favorites + recent notations) ─── */

export function loadExtensionData(): { favorites: FavoriteNotation[]; recentNotations: string[] } {
    try {
        const data = getLiveContext()?.extensionSettings?.[MODULE_NAME];
        if (!data) return { favorites: [], recentNotations: [] };
        return {
            favorites: Array.isArray(data.favorites) ? (data.favorites as FavoriteNotation[]) : [],
            recentNotations: Array.isArray(data.recentNotations) ? (data.recentNotations as string[]) : [],
        };
    } catch {
        return { favorites: [], recentNotations: [] };
    }
}

export function saveExtensionData(favorites: FavoriteNotation[], recentNotations: string[]): void {
    try {
        const context = getLiveContext();
        if (!context?.extensionSettings) return;
        context.extensionSettings[MODULE_NAME] = {
            ...context.extensionSettings[MODULE_NAME],
            favorites,
            recentNotations,
        };
        context.saveSettingsDebounced?.();
    } catch {
        /* ignore */
    }
}
