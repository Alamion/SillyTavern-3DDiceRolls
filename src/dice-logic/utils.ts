import type { DiceModifiers, DiceRoll } from './types';

export function formatModifiers(modifiers: DiceModifiers): string {
    const parts: string[] = [];
    if (modifiers.keepHighest) parts.push(`kh${modifiers.keepHighest}`);
    if (modifiers.keepLowest) parts.push(`kl${modifiers.keepLowest}`);
    if (modifiers.dropHighest) parts.push(`dh${modifiers.dropHighest}`);
    if (modifiers.dropLowest) parts.push(`dl${modifiers.dropLowest}`);
    if (modifiers.reroll) parts.push(`r${modifiers.reroll}`);
    if (modifiers.explode) parts.push(modifiers.explode === 1 ? '!' : `!${modifiers.explode}`);
    if (modifiers.sort) parts.push(modifiers.sort === 'asc' ? 'u' : 's');
    return parts.join('');
}

export function applyKeepDrop(rolls: DiceRoll[], modifiers: DiceModifiers): DiceRoll[] {
    if (modifiers.keepHighest) {
        const sorted = [...rolls].map((r, idx) => ({ roll: r, idx })).sort((a, b) => b.roll.value - a.roll.value);
        const keepIndices = new Set(sorted.slice(0, modifiers.keepHighest).map(s => s.idx));
        return rolls.map((r, idx) => ({ ...r, dropped: !keepIndices.has(idx) }));
    }

    if (modifiers.keepLowest) {
        const sorted = [...rolls].map((r, idx) => ({ roll: r, idx })).sort((a, b) => a.roll.value - b.roll.value);
        const keepIndices = new Set(sorted.slice(0, modifiers.keepLowest).map(s => s.idx));
        return rolls.map((r, idx) => ({ ...r, dropped: !keepIndices.has(idx) }));
    }

    if (modifiers.dropHighest) {
        const sorted = [...rolls].map((r, idx) => ({ roll: r, idx })).sort((a, b) => b.roll.value - a.roll.value);
        const dropIndices = new Set(sorted.slice(0, modifiers.dropHighest).map(s => s.idx));
        return rolls.map((r, idx) => ({ ...r, dropped: dropIndices.has(idx) }));
    }

    if (modifiers.dropLowest) {
        const sorted = [...rolls].map((r, idx) => ({ roll: r, idx })).sort((a, b) => a.roll.value - b.roll.value);
        const dropIndices = new Set(sorted.slice(0, modifiers.dropLowest).map(s => s.idx));
        return rolls.map((r, idx) => ({ ...r, dropped: dropIndices.has(idx) }));
    }

    return rolls;
}

export function formatRollValues(rolls: DiceRoll[]): string {
    return rolls.map(r => {
        let s = String(r.value);
        if (r.dropped) {
            s = `~~${s}~~`;
        } else if (r.exploded) {
            s = `${s}!`;
        }
        return s;
    }).join(' + ');
}
