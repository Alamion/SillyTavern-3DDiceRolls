import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { DiceRollerSettings } from '../utils/settings';
import { getSettings, subscribeSettings } from '../utils/settings';
import { rollFromPanel } from '../utils/events';
import { onRollResult } from '../dice-logic';
import {
    MAX_HISTORY,
    finishedInAnotherChat,
    loadChatHistory,
    loadChatHistoryWithPending,
    loadExtensionData,
    queueHistoryForChat,
    onChatChanged,
    saveExtensionData,
    writeChatHistory,
} from '../utils/persistence';
import type { FavoriteNotation, HistoryEntry, HistoryTabType } from '../utils/types-ext';

const MAX_RECENT_NOTATIONS = 10;

interface DiceRollerContextValue {
    settings: DiceRollerSettings;
    history: HistoryEntry[];
    favorites: FavoriteNotation[];
    recentNotations: string[];
    expandedIds: string[];
    notationInput: string;
    activeTab: HistoryTabType;
    wodDifficulty: number;

    setNotationInput: (val: string) => void;
    setActiveTab: (tab: HistoryTabType) => void;
    setWodDifficulty: (difficulty: number) => void;
    roll: (notation: string) => Promise<void>;
    clearHistory: () => void;
    toggleFavorite: (notation: string) => void;
    isFavorite: (notation: string) => boolean;
    toggleExpand: (id: string) => void;
}

const DiceRollerContext = createContext<DiceRollerContextValue | null>(null);

export function useDiceRoller(): DiceRollerContextValue {
    const ctx = useContext(DiceRollerContext);
    if (!ctx) throw new Error('useDiceRoller must be used within DiceRollerProvider');
    return ctx;
}

function newId(): string {
    try {
        return crypto.randomUUID();
    } catch {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    }
}

/* ─── Provider ─── */
interface DiceRollerProviderProps {
    children: ReactNode;
}

export function DiceRollerProvider({ children }: DiceRollerProviderProps) {
    const [settings, setSettings] = useState<DiceRollerSettings>(getSettings);
    const [history, setHistory] = useState<HistoryEntry[]>(loadChatHistory);
    const [favorites, setFavorites] = useState<FavoriteNotation[]>(() => loadExtensionData().favorites);
    const [recentNotations, setRecentNotations] = useState<string[]>(() => loadExtensionData().recentNotations);
    const [expandedIds, setExpandedIds] = useState<string[]>(() => history.slice(0, 1).map((e) => e.id));
    const [notationInput, setNotationInput] = useState('');
    const [activeTab, setActiveTab] = useState<HistoryTabType>('chat');
    /* Lives here, not in the WoD tab, so it survives tab switches (tab bodies unmount). */
    const [wodDifficulty, setWodDifficulty] = useState(6);

    const favoritesRef = useRef(favorites);
    favoritesRef.current = favorites;
    /* History as last read from the chat; writing it back would be a no-op save. */
    const loadedHistoryRef = useRef(history);

    /* Subscribe to settings changes */
    useEffect(() => subscribeSettings(setSettings), []);

    /* Reload history when the chat changes */
    useEffect(
        () =>
            onChatChanged(() => {
                const { history: loaded, merged } = loadChatHistoryWithPending();
                /* Entries queued while the chat was closed still have to be written to it. */
                loadedHistoryRef.current = merged ? [] : loaded;
                setHistory(loaded);
                setExpandedIds(loaded.slice(0, 1).map((e) => e.id));
            }),
        [],
    );

    /* Listen for roll results */
    useEffect(
        () =>
            onRollResult((result, origin) => {
                const entry: HistoryEntry = {
                    id: newId(),
                    timestamp: Date.now(),
                    result,
                };
                if (origin.chatId !== undefined && finishedInAnotherChat(origin.chatId)) {
                    queueHistoryForChat(origin.chatId, entry);
                } else {
                    setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
                    setExpandedIds([entry.id]);
                }

                /* Update recent notations (global) */
                setRecentNotations((prev) => {
                    return [result.notation, ...prev.filter((n) => n !== result.notation)].slice(
                        0,
                        MAX_RECENT_NOTATIONS,
                    );
                });
            }),
        [],
    );

    /* Persist history on change */
    useEffect(() => {
        if (history === loadedHistoryRef.current) return;
        writeChatHistory(history);
    }, [history]);

    /* Persist extension data on favorites/recent changes */
    useEffect(() => {
        saveExtensionData(favorites, recentNotations);
    }, [favorites, recentNotations]);

    /* ─── Actions ─── */

    const roll = useCallback(async (notation: string) => {
        await rollFromPanel(notation);
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        setExpandedIds([]);
    }, []);

    const toggleFavorite = useCallback((notation: string) => {
        setFavorites((prev) => {
            const existing = prev.find((f) => f.notation === notation);
            if (existing) return prev.filter((f) => f.id !== existing.id);
            return [
                {
                    id: newId(),
                    notation,
                    label: notation,
                    lastUsed: Date.now(),
                },
                ...prev,
            ];
        });
    }, []);

    const isFavorite = useCallback((notation: string): boolean => {
        return favoritesRef.current.some((f) => f.notation === notation);
    }, []);

    const toggleExpand = useCallback((id: string) => {
        setExpandedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    }, []);

    const value: DiceRollerContextValue = {
        settings,
        history,
        favorites,
        recentNotations,
        expandedIds,
        notationInput,
        activeTab,
        wodDifficulty,
        setNotationInput,
        setActiveTab,
        setWodDifficulty,
        roll,
        clearHistory,
        toggleFavorite,
        isFavorite,
        toggleExpand,
    };

    return <DiceRollerContext.Provider value={value}>{children}</DiceRollerContext.Provider>;
}
