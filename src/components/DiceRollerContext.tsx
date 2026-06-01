import {
    createContext, useContext, useState, useCallback, useEffect, useRef,
    type ReactNode,
} from 'react';
import type { DiceRollerSettings } from '../utils/settings';
import { getSettings, subscribeSettings, getContext } from '../utils/settings';
import { handleRollEvent } from '../utils/events';
import { onRollResult } from '../dice-logic';
import { MODULE_NAME } from '../utils/constants';
import type { HistoryEntry, FavoriteNotation, HistoryTabType } from '../utils/types-ext';

const MAX_HISTORY = 50;
const MAX_RECENT_NOTATIONS = 10;

interface DiceRollerContextValue {
    settings: DiceRollerSettings;
    history: HistoryEntry[];
    favorites: FavoriteNotation[];
    recentNotations: string[];
    expandedIds: string[];
    notationInput: string;
    activeTab: HistoryTabType;

    setNotationInput: (val: string) => void;
    setActiveTab: (tab: HistoryTabType) => void;
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

/* ─── Chat-level history persistence ─── */
function loadHistoryFromChat(): HistoryEntry[] {
    try {
        const context = getContext();
        const raw = context?.chatMetadata?.[MODULE_NAME];
        if (Array.isArray(raw)) return raw.slice(0, MAX_HISTORY) as HistoryEntry[];
    } catch { /* ignore */ }
    return [];
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function saveHistoryToChat(history: HistoryEntry[]): void {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            const context = getContext();
            if (!context?.chatMetadata?.chat_id_hash) return;
            context.chatMetadata[MODULE_NAME] = history.slice(0, MAX_HISTORY);
            context.saveMetadata().catch(() => {});
        } catch { /* ignore */ }
    }, 500);
}

/* ─── Global extension data (favorites + recent notations) ─── */
function loadExtensionData(): { favorites: FavoriteNotation[]; recentNotations: string[] } {
    try {
        const context = getContext();
        const data = context?.extensionSettings?.[MODULE_NAME] as Record<string, unknown> | undefined;
        if (!data) return { favorites: [], recentNotations: [] };
        return {
            favorites: Array.isArray(data.favorites) ? data.favorites as FavoriteNotation[] : [],
            recentNotations: Array.isArray(data.recentNotations) ? data.recentNotations as string[] : [],
        };
    } catch { return { favorites: [], recentNotations: [] }; }
}

function saveExtensionData(favorites: FavoriteNotation[], recentNotations: string[]): void {
    try {
        const context = getContext();
        if (!context?.extensionSettings) return;
        const data = context.extensionSettings[MODULE_NAME] as Record<string, unknown> ?? {};
        data.favorites = favorites;
        data.recentNotations = recentNotations;
        context.extensionSettings[MODULE_NAME] = data;
        if (context.saveSettingsDebounced) context.saveSettingsDebounced();
    } catch { /* ignore */ }
}

/* ─── Provider ─── */
interface DiceRollerProviderProps {
    children: ReactNode;
}

export function DiceRollerProvider({ children }: DiceRollerProviderProps) {
    const [settings, setSettings] = useState<DiceRollerSettings>(getSettings);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [favorites, setFavorites] = useState<FavoriteNotation[]>(() => loadExtensionData().favorites);
    const [recentNotations, setRecentNotations] = useState<string[]>(() => loadExtensionData().recentNotations);
    const [expandedIds, setExpandedIds] = useState<string[]>([]);
    const [notationInput, setNotationInput] = useState('');
    const [activeTab, setActiveTab] = useState<HistoryTabType>('chat');

    const historyRef = useRef(history);
    historyRef.current = history;
    const favoritesRef = useRef(favorites);
    favoritesRef.current = favorites;

    /* Subscribe to settings changes */
    useEffect(() => subscribeSettings(setSettings), []);

    /* Load history on mount */
    useEffect(() => {
        const loaded = loadHistoryFromChat();
        setHistory(loaded);
        if (loaded.length > 0) setExpandedIds([loaded[0].id]);
    }, []);

    /* Listen for chat changes */
    useEffect(() => {
        const context = getContext();
        if (!context?.eventSource) return;
        const handler = () => {
            const loaded = loadHistoryFromChat();
            setHistory(loaded);
            setExpandedIds(loaded.length > 0 ? [loaded[0].id] : []);
        };
        context.eventSource.on(context.eventTypes.CHAT_CHANGED, handler);
        return () => { context.eventSource.off(context.eventTypes.CHAT_CHANGED, handler); };
    }, []);

    /* Listen for roll results */
    useEffect(() => onRollResult((result) => {
        const entry: HistoryEntry = {
            id: newId(),
            timestamp: Date.now(),
            result,
        };
        setHistory(prev => [entry, ...prev].slice(0, MAX_HISTORY));
        setExpandedIds([entry.id]);

        /* Update recent notations (global) */
        setRecentNotations(prev => {
            const updated = [result.notation, ...prev.filter(n => n !== result.notation)].slice(0, MAX_RECENT_NOTATIONS);
            return updated;
        });
    }), []);

    /* Persist history on change */
    useEffect(() => { saveHistoryToChat(historyRef.current); }, [history]);

    /* Persist extension data on favorites/recent changes */
    useEffect(() => { saveExtensionData(favorites, recentNotations); }, [favorites, recentNotations]);

    /* ─── Actions ─── */

    const roll = useCallback(async (notation: string) => {
        await handleRollEvent({ notation });
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        setExpandedIds([]);
    }, []);

    const toggleFavorite = useCallback((notation: string) => {
        setFavorites(prev => {
            const existing = prev.find(f => f.notation === notation);
            if (existing) return prev.filter(f => f.id !== existing.id);
            return [{
                id: newId(),
                notation,
                label: notation,
                lastUsed: Date.now(),
            }, ...prev];
        });
    }, []);

    const isFavorite = useCallback((notation: string): boolean => {
        return favoritesRef.current.some(f => f.notation === notation);
    }, []);

    const toggleExpand = useCallback((id: string) => {
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
        );
    }, []);

    const value: DiceRollerContextValue = {
        settings,
        history,
        favorites,
        recentNotations,
        expandedIds,
        notationInput,
        activeTab,
        setNotationInput,
        setActiveTab,
        roll,
        clearHistory,
        toggleFavorite,
        isFavorite,
        toggleExpand,
    };

    return (
        <DiceRollerContext.Provider value={value}>
            {children}
        </DiceRollerContext.Provider>
    );
}
