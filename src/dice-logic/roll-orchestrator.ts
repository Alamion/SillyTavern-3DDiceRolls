import { parseDiceNotation } from './dice-parser';
import { notifyRollResult as notifyBaseRollResult, onRollResult as onBaseRollResult, rollDices } from './dice-roller';
import { DiceFactory } from './renderer';
import type { DiceGroup, DiceGroupResult, DiceRoll, RollResult } from './types';
import { debug, warn } from '../utils/logging';
import { MixedRollConfig } from '../utils/settings';

const SUPPORTED_3D_SIDES = new Set([4, 6, 8, 10, 12, 20, 100]);

function shouldUse3D(diceGroup: DiceGroup): boolean {
    return SUPPORTED_3D_SIDES.has(diceGroup.sides);
}

function formatModifiers(modifiers: DiceGroup['modifiers']): string {
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

async function execute3DPart(
    diceGroups: DiceGroup[],
    config: MixedRollConfig,
): Promise<Map<number, number[]>> {
    const groupsFor3D = diceGroups.filter(shouldUse3D);

    if (groupsFor3D.length === 0 || !config.enable3dDice) {
        return new Map();
    }

    return new Promise((resolve) => {
        const factory = new DiceFactory(
            window.innerWidth,
            window.innerHeight,
            {
                diceColor: config.diceColor,
                textColor: config.textColor,
                scaler: 1,
            },
        );

        factory.rollDice(groupsFor3D, (results) => {
            const resultMap = new Map<number, number[]>();

            for (const result of results) {
                resultMap.set(result.diceGroup.sides, result.values);
            }

            resolve(resultMap);
        });
    });
}

function applyModifiersToRolls(values: number[], sides: number, modifiers: DiceGroup['modifiers']): DiceRoll[] {
    let rolls: DiceRoll[] = values.map(v => ({
        sides,
        value: v,
        dropped: false,
    }));

    if (modifiers.keepHighest) {
        const sorted = [...rolls].map((r, idx) => ({ roll: r, idx })).sort((a, b) => b.roll.value - a.roll.value);
        const keepIndices = new Set(sorted.slice(0, modifiers.keepHighest).map(s => s.idx));
        rolls = rolls.map((r, idx) => ({ ...r, dropped: !keepIndices.has(idx) }));
    } else if (modifiers.keepLowest) {
        const sorted = [...rolls].map((r, idx) => ({ roll: r, idx })).sort((a, b) => a.roll.value - b.roll.value);
        const keepIndices = new Set(sorted.slice(0, modifiers.keepLowest).map(s => s.idx));
        rolls = rolls.map((r, idx) => ({ ...r, dropped: !keepIndices.has(idx) }));
    } else if (modifiers.dropHighest) {
        const sorted = [...rolls].map((r, idx) => ({ roll: r, idx })).sort((a, b) => b.roll.value - a.roll.value);
        const dropIndices = new Set(sorted.slice(0, modifiers.dropHighest).map(s => s.idx));
        rolls = rolls.map((r, idx) => ({ ...r, dropped: dropIndices.has(idx) }));
    } else if (modifiers.dropLowest) {
        const sorted = [...rolls].map((r, idx) => ({ roll: r, idx })).sort((a, b) => a.roll.value - b.roll.value);
        const dropIndices = new Set(sorted.slice(0, modifiers.dropLowest).map(s => s.idx));
        rolls = rolls.map((r, idx) => ({ ...r, dropped: dropIndices.has(idx) }));
    }

    if (modifiers.sort) {
        const dropped = rolls.filter(r => r.dropped);
        const kept = rolls.filter(r => !r.dropped);
        kept.sort((a, b) =>
            modifiers.sort === 'asc' ? a.value - b.value : b.value - a.value,
        );
        rolls = [...kept, ...dropped];
    }

    return rolls;
}

async function executeMixedRoll(
    notation: string,
    config: MixedRollConfig,
): Promise<RollResult> {
    const parsed = parseDiceNotation(notation);
    const diceGroups: DiceGroup[] = [];

    for (const expr of parsed.expressions) {
        if (expr.type === 'dice') {
            diceGroups.push(expr.value as DiceGroup);
        }
    }

    const hasAnyDice = diceGroups.length > 0;
    const has3dDice = diceGroups.some(shouldUse3D);

    if (!hasAnyDice) {
        return rollDices(notation);
    }

    if (!config.enable3dDice || !has3dDice) {
        return rollDices(notation);
    }

    const results3D = await execute3DPart(diceGroups, config);

    const ordinaryResult = rollDices(notation);

    const mergedDiceGroups: DiceGroupResult[] = [];
    let groupIndex = 0;

    for (const expr of parsed.expressions) {
        if (expr.type === 'dice') {
            const diceGroup = expr.value as DiceGroup;
            const baseGroup = ordinaryResult.diceGroups[groupIndex];

            if (shouldUse3D(diceGroup) && results3D.has(diceGroup.sides)) {
                const values3D = results3D.get(diceGroup.sides)!;
                const rolls = applyModifiersToRolls(values3D, diceGroup.sides, diceGroup.modifiers);

                mergedDiceGroups.push({
                    notation: `${diceGroup.count}d${diceGroup.sides}${formatModifiers(diceGroup.modifiers)}`,
                    sides: diceGroup.sides,
                    rolls,
                    keptRolls: rolls.filter(r => !r.dropped),
                    droppedRolls: rolls.filter(r => r.dropped),
                    sum: rolls.filter(r => !r.dropped).reduce((s, r) => s + r.value, 0),
                    operation: expr.operation,
                });
            } else {
                mergedDiceGroups.push(baseGroup);
            }

            groupIndex++;
        }
    }

    let total = 0;
    for (let i = 0; i < mergedDiceGroups.length; i++) {
        const group = mergedDiceGroups[i];
        const expr = parsed.expressions.filter(e => e.type === 'dice')[i];
        if (expr) {
            if (expr.operation === '-') {
                total -= group.sum;
            } else {
                total += group.sum;
            }
        }
    }

    const nonDiceExpressions = parsed.expressions.filter(e => e.type === 'number');
    for (const expr of nonDiceExpressions) {
        const value = expr.value as number;
        if (expr.operation === '-') {
            total -= value;
        } else {
            total += value;
        }
    }

    const detailsParts: string[] = [];
    let diceGroupIdx = 0;
    let isFirst = true;

    for (const expr of parsed.expressions) {
        if (expr.type === 'dice') {
            const group = mergedDiceGroups[diceGroupIdx];
            const formattedRolls = group.rolls.map(r => {
                let s = String(r.value);
                if (r.dropped) {
                    s = `~~${s}~~`;
                } else if (r.exploded) {
                    s = `${s}!`;
                }
                return s;
            });

            if (isFirst) {
                detailsParts.push(`(${formattedRolls.join(' + ')})`);
                isFirst = false;
            } else {
                const op = expr.operation === '-' ? ' - ' : ' + ';
                detailsParts.push(`${op}(${formattedRolls.join(' + ')})`);
            }
            diceGroupIdx++;
        } else {
            const value = expr.value as number;
            const op = isFirst ? '' : (expr.operation === '-' ? ' - ' : ' + ');
            detailsParts.push(`${op}${value}`);
            isFirst = false;
        }
    }

    const details = detailsParts.join('');
    const formatted = `${parsed.original}: ${details} = ${total}`;

    return {
        notation: parsed.original,
        diceGroups: mergedDiceGroups,
        total,
        details,
        formatted,
    };
}

export async function executeUnifiedRoll(
    notation: string,
    config?: Partial<MixedRollConfig>,
): Promise<RollResult> {
    debug('Executing unified roll:', notation);

    const defaultConfig: MixedRollConfig = {
        diceColor: '#4a90e2',
        textColor: '#ffffff',
        enable3dDice: false,
        ...config,
    };

    try {
        const result = await executeMixedRoll(notation, defaultConfig);
        notifyBaseRollResult(result);
        return result;
    } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        warn('Mixed roll failed, falling back to 2D:', errMsg);
        const result = rollDices(notation);
        notifyBaseRollResult(result);
        return result;
    }
}

export function execute2DRoll(notation: string): RollResult {
    debug('Executing 2D roll:', notation);
    const result = rollDices(notation);
    notifyBaseRollResult(result);
    return result;
}

export { onBaseRollResult as onRollResult };
