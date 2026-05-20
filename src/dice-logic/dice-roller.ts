import { parseDiceNotation } from './dice-parser';
import type { DiceGroup, DiceRoll, DiceGroupResult, FullRollResult, RollResult } from './types';
import { formatModifiers, applyKeepDrop, formatRollValues } from './utils';

function rollSingleDie(sides: number): number {
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const rand = randomBuffer[0] / (0xffffffff + 1);
    return Math.floor(rand * sides) + 1;
}

function applyReroll(rolls: DiceRoll[], sides: number, rerollThreshold: number): DiceRoll[] {
    return rolls.map(roll => {
        if (roll.value <= rerollThreshold && !roll.exploded) {
            return { ...roll, value: rollSingleDie(sides) };
        }
        return roll;
    });
}

function applyExplode(
    rolls: DiceRoll[],
    sides: number,
    explodeCount: number,
): { rolls: DiceRoll[]; explosions: number } {
    const result = [...rolls];
    let explosions = 0;
    let i = 0;

    while (i < result.length && explosions < explodeCount) {
        if (result[i].value === sides && !result[i].exploded) {
            const newRoll: DiceRoll = {
                sides,
                value: rollSingleDie(sides),
                dropped: false,
                exploded: true,
            };
            result.push(newRoll);
            explosions++;
        }
        i++;
    }

    return { rolls: result, explosions };
}

function rollDiceGroup(dice: DiceGroup, operation: '+' | '-'): DiceGroupResult {
    let rolls: DiceRoll[] = [];

    for (let i = 0; i < dice.count; i++) {
        rolls.push({
            sides: dice.sides,
            value: rollSingleDie(dice.sides),
            dropped: false,
        });
    }

    if (dice.modifiers.reroll) {
        rolls = applyReroll(rolls, dice.sides, dice.modifiers.reroll);
    }

    if (dice.modifiers.explode) {
        let explosions = 0;
        const maxExplosions = dice.modifiers.explode * dice.count;
        let result = applyExplode(rolls, dice.sides, maxExplosions);
        rolls = result.rolls;
        explosions += result.explosions;

        while (explosions < maxExplosions) {
            result = applyExplode(rolls, dice.sides, maxExplosions - explosions);
            rolls = result.rolls;
            if (result.explosions === 0) break;
            explosions += result.explosions;
        }
    }

    rolls = applyKeepDrop(rolls, dice.modifiers);

    if (dice.modifiers.sort) {
        const dropped = rolls.filter(r => r.dropped);
        const kept = rolls.filter(r => !r.dropped);
        kept.sort((a, b) =>
            dice.modifiers.sort === 'asc' ? a.value - b.value : b.value - a.value,
        );
        rolls = [...kept, ...dropped];
    }

    const keptRolls = rolls.filter(r => !r.dropped);
    const droppedRolls = rolls.filter(r => r.dropped);
    const sum = keptRolls.reduce((acc, r) => acc + r.value, 0);

    return {
        notation: `${dice.count}d${dice.sides}${formatModifiers(dice.modifiers)}`,
        sides: dice.sides,
        rolls,
        keptRolls,
        droppedRolls,
        sum,
        operation,
    };
}

function formatDiceGroup(group: DiceGroupResult): string {
    if (group.rolls.length === 0) {
        return '(0)';
    }

    return `(${formatRollValues(group.rolls)})`;
}

function executeRollInternal(notation: string): FullRollResult {
    const parsed = parseDiceNotation(notation);
    const diceGroups: DiceGroupResult[] = [];

    for (const expr of parsed.expressions) {
        if (expr.type === 'dice') {
            const diceGroup = rollDiceGroup(expr.value, expr.operation);
            diceGroups.push(diceGroup);
        } else {
            const value = expr.operation === '-' ? -expr.value : expr.value;
            diceGroups.push({
                notation: String(value),
                sides: 0,
                rolls: [],
                keptRolls: [],
                droppedRolls: [],
                sum: value,
                operation: '+',
            });
        }
    }

    let total = 0;
    for (const group of diceGroups) {
        if (group.operation === '-') {
            total -= group.sum;
        } else {
            total += group.sum;
        }
    }

    const groupDetails: string[] = [];
    for (let i = 0; i < diceGroups.length; i++) {
        const group = diceGroups[i];
        const expr = parsed.expressions[i];

        if (i === 0) {
            groupDetails.push(formatDiceGroup(group));
        } else {
            const op = expr.operation === '-' ? ' - ' : ' + ';
            if (group.sides === 0) {
                groupDetails.push(`${op}${Math.abs(group.sum)}`);
            } else {
                groupDetails.push(`${op}${formatDiceGroup(group)}`);
            }
        }
    }

    const details = groupDetails.join('');
    const formatted = `${parsed.original}: ${details} = ${total}`;

    return {
        notation: parsed.original,
        diceGroups,
        total,
        details,
        formatted,
    };
}

export function rollDices(notation: string): FullRollResult {
    return executeRollInternal(notation);
}

const rollCallbacks: Array<(result: RollResult) => void> = [];

export function onRollResult(callback: (result: RollResult) => void): () => void {
    rollCallbacks.push(callback);
    return () => {
        const index = rollCallbacks.indexOf(callback);
        if (index > -1) {
            rollCallbacks.splice(index, 1);
        }
    };
}

export function notifyRollResult(result: RollResult): void {
    rollCallbacks.forEach(cb => cb(result));
}

export function formatResultForDisplay(result: RollResult, mode: 'full' | 'compact' | 'chat' = 'full'): string {
    switch (mode) {
        case 'compact':
            return `${result.notation}: ${result.details} = ${result.total}`;
        case 'chat':
            return `**${result.notation}**: ${result.details} = **${result.total}**`;
        case 'full':
        default:
            return result.formatted;
    }
}
