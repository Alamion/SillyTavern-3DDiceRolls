import type { RollResult } from '../dice-logic';

export interface HistoryEntry {
    id: string;
    timestamp: number;
    result: RollResult;
}

export interface FavoriteNotation {
    id: string;
    notation: string;
    label: string;
    lastUsed: number;
}

export type HistoryTabType = 'chat' | 'favorites' | 'recent' | '';
