import { parseToAST } from './dice-parser';
import { detectExplosion, detectRerolls, detectUnique, evaluateDiceAST } from './dice-evaluator';
import { prepareDiceGeometries, startPhysicsRoll } from './renderer';
import type { DiceGeometryData } from './renderer';
import type { ASTNode, DiceGroupNode, DiceRoll, RollResult } from './types';
import { buildGroupKey } from './utils';
import { consoleWarn, debug, warn } from '../utils/logging';
import { MixedRollConfig } from '../utils/settings';
import { MAX_EXPLOSIONS } from '../utils/constants';
import { RollCancelledError } from './errors';

/** One clear toast per page load when 3D fails; repeats go to the console only. */
let fallbackNoticeShown = false;

const SUPPORTED_3D_SIDES = new Set([2, 4, 6, 8, 10, 12, 20, 100]);
const FUDGE_LABEL_MAP: Record<number, string> = { [-1]: '-', [0]: ' ', [1]: '+' };

function hasForcedValues(ast: ASTNode): boolean {
    let found = false;
    function traverse(node: ASTNode): void {
        if (node.type === 'DiceGroup' && node.forcedValues && node.forcedValues.length > 0) {
            found = true;
        } else if (node.type === 'BinaryOp') {
            traverse(node.left);
            traverse(node.right);
        } else if (node.type === 'UnaryOp') {
            traverse(node.operand);
        } else if (node.type === 'Parenthesized') {
            traverse(node.expression);
        }
    }
    traverse(ast);
    return found;
}

function has3DSupportedDice(ast: ASTNode): boolean {
    let found = false;
    function traverse(node: ASTNode): void {
        if (node.type === 'DiceGroup') {
            if (SUPPORTED_3D_SIDES.has(node.sides)) {
                found = true;
            }
        } else if (node.type === 'BinaryOp') {
            traverse(node.left);
            traverse(node.right);
        } else if (node.type === 'UnaryOp') {
            traverse(node.operand);
        } else if (node.type === 'Parenthesized') {
            traverse(node.expression);
        }
    }
    traverse(ast);
    return found;
}

function extractDiceGroupNodes(ast: ASTNode): DiceGroupNode[] {
    const groups: DiceGroupNode[] = [];
    function traverse(node: ASTNode): void {
        if (node.type === 'DiceGroup') {
            groups.push(node);
        } else if (node.type === 'BinaryOp') {
            traverse(node.left);
            traverse(node.right);
        } else if (node.type === 'UnaryOp') {
            traverse(node.operand);
        } else if (node.type === 'Parenthesized') {
            traverse(node.expression);
        }
    }
    traverse(ast);
    return groups;
}

function convertFlatToGroupRolls(
    flatValues: number[],
    flatOffset: number,
    group: DiceGroupNode,
    multiplier: number,
    count: number,
): DiceRoll[] {
    const rolls: DiceRoll[] = [];
    const isD100 = group.sides === 100;
    for (let d = 0; d < count; d++) {
        if (isD100) {
            const tens = flatValues[flatOffset + d * multiplier] % 10;
            const ones = flatValues[flatOffset + d * multiplier + 1] % 10;
            rolls.push({
                sides: 100,
                value: tens * 10 + ones === 0 ? 100 : tens * 10 + ones,
                dropped: false,
            });
        } else {
            const val = flatValues[flatOffset + d];
            rolls.push({
                sides: group.sides,
                value: val,
                faceLabel: group.fudge ? (FUDGE_LABEL_MAP[val] ?? String(val)) : undefined,
                dropped: false,
            });
        }
    }
    return rolls;
}

export async function processRethrowLoop(
    group: DiceGroupNode,
    allGroupRolls: DiceRoll[],
    flatValues: number[],
    flatOffset: number,
    multiplier: number,
    handle: {
        renderer: { lockDice: (indices: number[]) => void };
        rethrow: (indices: number[]) => Promise<number[]>;
    },
    detectFn: (g: DiceGroupNode, rolls: DiceRoll[]) => number[],
    rerolledOnceSet?: Set<number>,
    onceFlag?: boolean,
): Promise<number[]> {
    const isD100 = group.sides === 100;
    let current = flatValues;
    // Same bound as the 2D evaluator, so 3D and 2D rerolls follow the same rule.
    for (let iter = 0; iter < MAX_EXPLOSIONS; iter++) {
        const localIndices = detectFn(group, allGroupRolls);
        if (localIndices.length === 0) break;

        if (rerolledOnceSet && group.modifiers.reroll?.once) {
            for (const ri of localIndices) rerolledOnceSet.add(ri);
        }

        const flatIndices: number[] = [];
        for (const idx of localIndices) {
            for (let p = 0; p < multiplier; p++) {
                flatIndices.push(flatOffset + idx * multiplier + p);
            }
        }

        const allLockIndices: number[] = [];
        for (let i = 0; i < current.length; i++) {
            if (!flatIndices.includes(i)) allLockIndices.push(i);
        }

        handle.renderer.lockDice(allLockIndices);
        current = await handle.rethrow(flatIndices);

        for (const ri of localIndices) {
            let newValue: number;
            if (isD100) {
                const tens = current[flatOffset + ri * multiplier] % 10;
                const ones = current[flatOffset + ri * multiplier + 1] % 10;
                newValue = tens * 10 + ones === 0 ? 100 : tens * 10 + ones;
            } else {
                newValue = current[flatOffset + ri];
            }
            allGroupRolls[ri] = {
                ...allGroupRolls[ri],
                value: newValue,
                rerolledOnce: rerolledOnceSet?.has(ri) || (onceFlag ? true : undefined) || undefined,
            };
        }

        if (onceFlag) break;
    }
    return current;
}

export async function processExplosionLoop(
    group: DiceGroupNode,
    allGroupRolls: DiceRoll[],
    handle: { addDice: (extraDiceData: DiceGeometryData[]) => Promise<number[]> },
    config: { diceColor: string; textColor: string },
    prepareGeometries: typeof prepareDiceGeometries = prepareDiceGeometries,
): Promise<void> {
    const isD100 = group.sides === 100;
    const isCompounding = group.modifiers.explode?.compounding ?? false;
    const isPenetrating = group.modifiers.explode?.penetrating ?? false;
    let explosionCount = 0;
    // A compounded die keeps its accumulated value, so whether it explodes again is decided by
    // the raw value of the die just added, not by re-detecting on the total.
    let compoundPending: number[] | undefined;

    while (explosionCount < MAX_EXPLOSIONS) {
        const detected = isCompounding
            ? (compoundPending ?? detectExplosion(group, allGroupRolls))
            : detectExplosion(group, allGroupRolls);
        const explodeIndices = detected.slice(0, MAX_EXPLOSIONS - explosionCount);
        if (explodeIndices.length === 0) break;

        for (const idx of explodeIndices) {
            allGroupRolls[idx] = {
                ...allGroupRolls[idx],
                exploded: true,
                compounded: isCompounding || undefined,
                penetrating: isPenetrating || undefined,
            };
        }

        const extraData = prepareGeometries(
            [
                {
                    // A d100 comes back as its tens and ones dice.
                    sides: group.sides,
                    count: explodeIndices.length,
                    modifiers: {},
                    fudge: group.fudge,
                },
            ],
            { diceColor: config.diceColor, textColor: config.textColor, scaler: 1 },
        );

        const explosionValues = await handle.addDice(extraData.geometries);

        let evIdx = 0;
        const nextCompoundPending: number[] = [];
        for (const explodeIdx of explodeIndices) {
            let rawVal: number;
            if (isD100) {
                const tens = explosionValues[evIdx++] % 10;
                const ones = explosionValues[evIdx++] % 10;
                rawVal = tens * 10 + ones === 0 ? 100 : tens * 10 + ones;
            } else {
                rawVal = explosionValues[evIdx++];
            }

            const explosionVal = isPenetrating ? Math.max(0, rawVal - 1) : rawVal;

            if (isCompounding) {
                const existing = allGroupRolls[explodeIdx];
                allGroupRolls[explodeIdx] = {
                    ...existing,
                    value: existing.value + explosionVal,
                    compounded: true,
                };
                if (detectExplosion(group, [{ sides: group.sides, value: rawVal, dropped: false }]).length > 0) {
                    nextCompoundPending.push(explodeIdx);
                }
            } else {
                allGroupRolls.push({
                    sides: group.sides,
                    value: explosionVal,
                    dropped: false,
                    penetrating: isPenetrating || undefined,
                });
            }
        }

        explosionCount += explodeIndices.length;
        if (isCompounding) compoundPending = nextCompoundPending;
    }

    if (explosionCount >= MAX_EXPLOSIONS) {
        // Dice that would still explode past the limit are marked, as the 2D evaluator does.
        const unprocessed = isCompounding
            ? (compoundPending ?? detectExplosion(group, allGroupRolls))
            : detectExplosion(group, allGroupRolls);
        for (const index of unprocessed) {
            allGroupRolls[index] = {
                ...allGroupRolls[index],
                exploded: true,
                compounded: isCompounding || undefined,
                penetrating: isPenetrating || undefined,
            };
        }
    }
}

export async function executeUnifiedRoll(notation: string, config?: Partial<MixedRollConfig>): Promise<RollResult> {
    debug('Executing unified roll:', notation);

    const defaultConfig: MixedRollConfig = {
        diceColor: config?.diceColor ?? '#4a90e2',
        textColor: config?.textColor ?? '#ffffff',
        enable3dDice: config?.enable3dDice ?? false,
        enableSound: config?.enableSound ?? true,
        soundVolume: config?.soundVolume ?? 80,
        timeToReact: config?.timeToReact ?? false,
        timeToReactSeconds: config?.timeToReactSeconds ?? 5,
    };

    // Notation and evaluation errors surface exactly as in 2D; only the 3D work below falls back.
    const ast = parseToAST(notation);

    if (hasForcedValues(ast) && defaultConfig.enable3dDice && has3DSupportedDice(ast)) {
        warn(`Forced rolls (@) not supported in 3D mode — rolling ${notation} with random physics`, '3DDiceRolls');
    }

    if (!defaultConfig.enable3dDice || !has3DSupportedDice(ast)) {
        return evaluateDiceAST(ast, notation);
    }

    let activeHandle: { arrangeAndDismiss: () => void } | undefined;

    /** Throws and settles the 3D dice; returns their values per group, or undefined to roll in 2D. */
    const run3D = async (): Promise<Map<string, DiceRoll[]> | undefined> => {
        const diceGroupNodes = extractDiceGroupNodes(ast);
        const flatGroups = diceGroupNodes.map((g) => ({
            sides: g.sides,
            count: g.count,
            modifiers: g.modifiers,
            customFaces: g.customFaces,
            fudge: g.fudge,
        }));

        const { geometries, groupSizes } = prepareDiceGeometries(flatGroups, {
            diceColor: defaultConfig.diceColor,
            textColor: defaultConfig.textColor,
            scaler: 1,
        });

        if (geometries.length === 0) {
            warn('No 3D geometries could be created — falling back to 2D roll', '3DDiceRolls');
            return undefined;
        }

        const handle = startPhysicsRoll(
            {
                diceColor: defaultConfig.diceColor,
                textColor: defaultConfig.textColor,
                scaler: 1,
                enableSound: defaultConfig.enableSound,
                soundVolume: defaultConfig.soundVolume,
                timeToReact: defaultConfig.timeToReact,
                timeToReactSeconds: defaultConfig.timeToReactSeconds,
            },
            geometries,
            groupSizes,
        );
        activeHandle = handle;

        let flatValues = await handle.settle;

        if (flatValues.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
            warn('Physics returned an invalid die value — falling back to 2D', '3DDiceRolls');
            handle.arrangeAndDismiss();
            activeHandle = undefined;
            return undefined;
        }

        const preGeneratedValues = new Map<string, DiceRoll[]>();
        let flatOffset = 0;

        for (let g = 0; g < diceGroupNodes.length; g++) {
            const group = diceGroupNodes[g];
            const multiplier = group.sides === 100 ? 2 : 1;
            const key = buildGroupKey(group, g);
            const initialPhysCount = groupSizes[g];
            // A group without 3D dice (e.g. d7) has no physical values; the evaluator rolls it in 2D.
            if (!initialPhysCount) continue;

            const allGroupRolls = convertFlatToGroupRolls(flatValues, flatOffset, group, multiplier, group.count);

            const rerolledOnceIndices = new Set<number>();
            flatValues = await processRethrowLoop(
                group,
                allGroupRolls,
                flatValues,
                flatOffset,
                multiplier,
                handle,
                (g, rolls) =>
                    detectRerolls(
                        g,
                        rolls.map((r) => r.value),
                        rolls,
                    ),
                rerolledOnceIndices,
            );

            flatValues = await processRethrowLoop(
                group,
                allGroupRolls,
                flatValues,
                flatOffset,
                multiplier,
                handle,
                detectUnique,
                undefined,
                group.modifiers.unique?.once || undefined,
            );

            await processExplosionLoop(group, allGroupRolls, handle, defaultConfig);

            groupSizes[g] = allGroupRolls.length;
            preGeneratedValues.set(key, allGroupRolls);
            flatOffset += initialPhysCount;
        }

        handle.arrangeAndDismiss();
        activeHandle = undefined;
        return preGeneratedValues;
    };

    let preGeneratedValues: Map<string, DiceRoll[]> | undefined;
    try {
        preGeneratedValues = await run3D();
    } catch (err) {
        if (err instanceof RollCancelledError) {
            throw err;
        }
        // Clear dice already on screen before falling back to 2D.
        activeHandle?.arrangeAndDismiss();
        const errMsg = err instanceof Error ? err.message : String(err);
        if (fallbackNoticeShown) {
            consoleWarn(`${errMsg} — rolled ${notation} in 2D`, '3D dice failed');
        } else {
            fallbackNoticeShown = true;
            warn(
                `3D dice could not run (${errMsg}), so ${notation} was rolled in 2D. Further 3D failures are logged to the console.`,
                '3D dice unavailable',
            );
        }
    }

    return evaluateDiceAST(ast, notation, preGeneratedValues);
}

export function execute2DRoll(notation: string): RollResult {
    debug('Executing 2D roll:', notation);
    const ast = parseToAST(notation);
    return evaluateDiceAST(ast, notation);
}
