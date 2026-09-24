import { parseToAST, validateNotation as validateNotationAST } from './dice-parser';
import { evaluateDiceAST } from './dice-evaluator';
import type { RollResult, FullRollResult } from './types';

function executeRollInternal(notation: string, randomFn?: () => number): FullRollResult {
    const ast = parseToAST(notation);
    return evaluateDiceAST(ast, notation, undefined, randomFn);
}

export function rollDices(notation: string, randomFn?: () => number): FullRollResult {
    return executeRollInternal(notation, randomFn);
}

export function validateNotation(notation: string): boolean {
    return validateNotationAST(notation);
}

/** Where a roll was started; filled in by the host adapter, opaque to the dice engine. */
export interface RollOrigin {
    /** Chat that was open when the roll started. */
    chatId?: string;
}

type RollCallback = (result: RollResult, origin: RollOrigin) => void;

const rollCallbacks: RollCallback[] = [];

export function onRollResult(callback: RollCallback): () => void {
    rollCallbacks.push(callback);
    return () => {
        const index = rollCallbacks.indexOf(callback);
        if (index > -1) {
            rollCallbacks.splice(index, 1);
        }
    };
}

export function notifyRollResult(result: RollResult, origin: RollOrigin = {}): void {
    rollCallbacks.forEach((cb) => cb(result, origin));
}

export function formatResultForDisplay(result: RollResult, mode: 'full' | 'compact' | 'chat' = 'full'): string {
    switch (mode) {
        case 'full':
            return `${result.notation}: ${result.formatted} = ${result.total}`;
        case 'compact':
            return `${result.notation}: ${result.details} = ${result.total}`;
        case 'chat':
            return `**${result.notation}**: ${result.details} = **${result.total}**`;
        default:
            return `${result.notation}: ${result.formatted} = ${result.total}`;
    }
}
